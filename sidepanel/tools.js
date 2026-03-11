// ============================================
// Translation-Focus: Tool System (Simplified)
// Removed: web_search tool, request_user_input tool,
//          contribution scoring, weighted evaluation
// Retained: query_council, peer_review, synthesize, final_answer
// ============================================

const TOOL_DEFINITIONS = {
  query_council: {
    name: 'query_council',
    description: '並行查詢多個 LLM 模型進行翻譯。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '要翻譯的文本' },
        models: { type: 'array', items: { type: 'string' }, description: '模型列表' },
        includeSearchSuffix: { type: 'boolean', default: false }
      },
      required: ['query']
    }
  },

  peer_review: {
    name: 'peer_review',
    description: '讓模型匿名互評其他模型的翻譯結果，產出排名與評語。',
    parameters: {
      type: 'object',
      properties: {
        responses: { type: 'array', description: '翻譯回答列表' },
        query: { type: 'string', description: '原始翻譯請求' }
      },
      required: ['responses', 'query']
    }
  },

  synthesize: {
    name: 'synthesize',
    description: '綜合所有翻譯結果與評審意見，產出最終翻譯。',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '原始翻譯請求' },
        responses: { type: 'array', description: '模型翻譯列表' },
        reviews: { type: 'object', description: '互評結果' },
        searches: { type: 'array', description: '（保留但不使用）' }
      },
      required: ['query', 'responses']
    }
  },

  final_answer: {
    name: 'final_answer',
    description: '輸出最終翻譯給用戶。',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '最終翻譯內容' },
        summary: { type: 'string', description: '摘要' }
      },
      required: ['content']
    }
  }
};

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.executionHistory = [];
  }

  register(name, executor) {
    if (!TOOL_DEFINITIONS[name]) throw new Error(`Unknown tool: ${name}`);
    this.tools.set(name, { ...TOOL_DEFINITIONS[name], execute: executor });
  }

  getDefinition(name) { return TOOL_DEFINITIONS[name]; }

  getToolsForPlanner() {
    return Object.values(TOOL_DEFINITIONS).map(t => ({
      name: t.name, description: t.description, parameters: t.parameters
    }));
  }

  async execute(name, params, context) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not registered: ${name}`);
    const startTime = Date.now();
    try {
      const result = await tool.execute(params, context);
      this.executionHistory.push({ tool: name, params, result, duration: Date.now() - startTime, success: true, timestamp: new Date().toISOString() });
      return { success: true, data: result };
    } catch (error) {
      this.executionHistory.push({ tool: name, params, error: error.message, duration: Date.now() - startTime, success: false, timestamp: new Date().toISOString() });
      return { success: false, error: error.message };
    }
  }

  has(name) { return this.tools.has(name); }
  getHistory() { return [...this.executionHistory]; }
  clearHistory() { this.executionHistory = []; }
}

const toolRegistry = new ToolRegistry();

/**
 * Create tool executors — translation-focused
 * web_search removed; peer_review simplified (no weighted/contribution modes)
 */
function createToolExecutors(appContext) {
  const {
    queryModel,
    runReview,
    runChairman,
    councilModels,
    chairmanModel,
    buildPromptWithContext
  } = appContext;

  return {
    query_council: async (params, _context) => {
      const { query, models } = params;
      const targetModels = models || councilModels;
      if (!targetModels || targetModels.length === 0) throw new Error('No models configured');

      const promptWithContext = buildPromptWithContext ? buildPromptWithContext(query) : query;

      const results = await Promise.allSettled(
        targetModels.map(async model => {
          const response = await queryModel(model, promptWithContext);
          return { model, ...response };
        })
      );

      const responses = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failures = results.filter(r => r.status === 'rejected').map((r, i) => ({ model: targetModels[i], error: r.reason?.message || 'Unknown error' }));

      return { responses, failures, successCount: responses.length, totalCount: targetModels.length };
    },

    peer_review: async (params, _context) => {
      const { responses, query } = params;
      if (!responses || responses.length < 2) throw new Error('Need at least 2 responses');

      const reviewResults = await Promise.allSettled(
        responses.map(r => runReview(r.model, query, responses))
      );

      const reviews = reviewResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);

      const scores = new Map();
      for (const review of reviews) {
        if (review.rankings) {
          review.rankings.forEach((rank, idx) => {
            const model = responses[idx]?.model;
            if (model) scores.set(model, (scores.get(model) || 0) + (responses.length - rank.rank));
          });
        }
      }

      const aggregatedRanking = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([model, score]) => ({ model, score }));

      const winner = aggregatedRanking[0]?.model || null;

      return { reviews, aggregatedRanking, weightedRanking: null, contributionScores: null, reviewCount: reviews.length, winner, evaluationMode: 'standard' };
    },

    synthesize: async (params, _context) => {
      const { query, responses, reviews, searches } = params;
      const ranking = reviews?.aggregatedRanking || null;
      const result = await runChairman(query, responses, ranking, false, null, searches || null);
      return { content: result, chairmanModel, usedWeightedIntegration: false, winner: reviews?.winner || null };
    },

    final_answer: async (params, _context) => {
      const { content, summary } = params;
      return { content, summary: summary || content.slice(0, 100) + '...', completed: true };
    }
  };
}

function registerToolExecutors(appContext) {
  const executors = createToolExecutors(appContext);
  for (const [name, executor] of Object.entries(executors)) {
    toolRegistry.register(name, executor);
  }
  return toolRegistry;
}

function calculateContributionScores() { return []; }
function formatContributionContext() { return null; }

if (typeof window !== 'undefined') {
  window.MAVTools = {
    TOOL_DEFINITIONS,
    ToolRegistry,
    toolRegistry,
    createToolExecutors,
    registerToolExecutors,
    calculateContributionScores,
    formatContributionContext
  };
}
