// ============================================
// MAV Agent Framework - Tool System
// ============================================

/**
 * Tool definition schema for Agent Framework
 * Each tool follows a consistent interface:
 * - name: unique identifier
 * - description: what the tool does (used by Planner)
 * - parameters: input schema
 * - execute: async function that performs the action
 */

const TOOL_DEFINITIONS = {
  query_council: {
    name: 'query_council',
    description: '並行查詢多個 LLM 模型獲取初步回答。適用於需要多元觀點的問題。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '要查詢的問題'
        },
        models: {
          type: 'array',
          items: { type: 'string' },
          description: '要查詢的模型列表，若不指定則使用預設的 council 模型'
        },
        includeSearchSuffix: {
          type: 'boolean',
          default: true,
          description: '是否在 prompt 中要求模型提供搜尋建議'
        }
      },
      required: ['query']
    }
  },
  
  web_search: {
    name: 'web_search',
    description: '使用 Brave Search API 搜尋網路最新資訊。適用於需要驗證事實或獲取即時資訊的情況。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜尋關鍵字'
        },
        count: {
          type: 'number',
          default: 10,
          description: '搜尋結果數量 (1-20)'
        },
        freshness: {
          type: 'string',
          enum: ['pd', 'pw', 'pm', 'py'],
          default: 'pm',
          description: '時效性過濾：pd=過去一天, pw=過去一週, pm=過去一月, py=過去一年'
        }
      },
      required: ['query']
    }
  },
  
  peer_review: {
    name: 'peer_review',
    description: '讓模型匿名互評其他模型的回答，產出排名與評語。適用於需要品質篩選的複雜問題。',
    parameters: {
      type: 'object',
      properties: {
        responses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              model: { type: 'string' },
              content: { type: 'string' }
            }
          },
          description: '要評審的回答列表'
        },
        query: {
          type: 'string',
          description: '原始問題'
        }
      },
      required: ['responses', 'query']
    }
  },
  
  synthesize: {
    name: 'synthesize',
    description: '綜合所有資訊（回答、評審結果、搜尋結果）產出統一答案。通常在收集足夠資訊後調用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '原始問題'
        },
        responses: {
          type: 'array',
          description: '模型回答列表'
        },
        reviews: {
          type: 'object',
          description: '評審結果與排名'
        },
        searches: {
          type: 'array',
          description: '網路搜尋結果'
        },
        includeSearchStrategy: {
          type: 'boolean',
          default: false,
          description: '是否要求主席提供延伸搜尋建議'
        }
      },
      required: ['query', 'responses']
    }
  },
  
  final_answer: {
    name: 'final_answer',
    description: '輸出最終答案給用戶，結束 Agent Loop。當認為資訊已足夠完整時調用。',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: '最終答案內容'
        },
        summary: {
          type: 'string',
          description: '簡短摘要（用於歷史紀錄）'
        }
      },
      required: ['content']
    }
  }
};

/**
 * Tool Registry - manages tool instances and execution
 */
class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.executionHistory = [];
  }
  
  /**
   * Register a tool with its implementation
   * @param {string} name - Tool name
   * @param {Function} executor - Async function (params, context) => result
   */
  register(name, executor) {
    if (!TOOL_DEFINITIONS[name]) {
      throw new Error(`Unknown tool: ${name}`);
    }
    this.tools.set(name, {
      ...TOOL_DEFINITIONS[name],
      execute: executor
    });
  }
  
  /**
   * Get tool definition (for Planner)
   */
  getDefinition(name) {
    return TOOL_DEFINITIONS[name];
  }
  
  /**
   * Get all tool definitions formatted for Planner prompt
   */
  getToolsForPlanner() {
    return Object.values(TOOL_DEFINITIONS).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }
  
  /**
   * Execute a tool with given parameters
   * @param {string} name - Tool name
   * @param {Object} params - Tool parameters
   * @param {Object} context - Execution context
   * @returns {Promise<Object>} - Execution result
   */
  async execute(name, params, context) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not registered: ${name}`);
    }
    
    const startTime = Date.now();
    try {
      const result = await tool.execute(params, context);
      const execution = {
        tool: name,
        params,
        result,
        duration: Date.now() - startTime,
        success: true,
        timestamp: new Date().toISOString()
      };
      this.executionHistory.push(execution);
      return { success: true, data: result };
    } catch (error) {
      const execution = {
        tool: name,
        params,
        error: error.message,
        duration: Date.now() - startTime,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.executionHistory.push(execution);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Check if a tool is registered
   */
  has(name) {
    return this.tools.has(name);
  }
  
  /**
   * Get execution history
   */
  getHistory() {
    return [...this.executionHistory];
  }
  
  /**
   * Clear execution history
   */
  clearHistory() {
    this.executionHistory = [];
  }
}

// Create global tool registry instance
const toolRegistry = new ToolRegistry();

/**
 * Create tool executors that wrap existing MAV functions
 * These will be called from the main app.js to register implementations
 */
function createToolExecutors(appContext) {
  const { 
    queryModel, 
    runReview, 
    runChairman,
    councilModels,
    chairmanModel,
    customReviewPrompt,
    customChairmanPrompt,
    generateReviewPrompt,
    generateChairmanPrompt,
    buildPromptWithContext,
    COUNCIL_SEARCH_SUFFIX
  } = appContext;
  
  return {
    /**
     * Query Council - parallel query to multiple models
     */
    query_council: async (params, context) => {
      const { query, models, includeSearchSuffix = true } = params;
      const targetModels = models || councilModels;
      
      if (!targetModels || targetModels.length === 0) {
        throw new Error('No models configured for council');
      }
      
      // Build prompt with context
      let promptWithContext = buildPromptWithContext ? buildPromptWithContext(query) : query;
      
      // Add search suffix if requested
      if (includeSearchSuffix && COUNCIL_SEARCH_SUFFIX) {
        promptWithContext += COUNCIL_SEARCH_SUFFIX;
      }
      
      // Query all models in parallel
      const results = await Promise.allSettled(
        targetModels.map(async model => {
          const response = await queryModel(model, promptWithContext);
          return { model, ...response };
        })
      );
      
      // Process results
      const responses = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      
      const failures = results
        .filter(r => r.status === 'rejected')
        .map((r, i) => ({ model: targetModels[i], error: r.reason?.message || 'Unknown error' }));
      
      return {
        responses,
        failures,
        successCount: responses.length,
        totalCount: targetModels.length
      };
    },
    
    /**
     * Web Search - search via Brave API
     */
    web_search: async (params, context) => {
      const { query, count = 10, freshness = 'pm' } = params;
      
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'WEB_SEARCH', query, options: { count, freshness } },
          response => {
            if (response?.error) {
              reject(new Error(response.error));
            } else {
              resolve({
                query,
                results: response?.results || [],
                resultCount: response?.results?.length || 0
              });
            }
          }
        );
      });
    },
    
    /**
     * Peer Review - anonymous cross-evaluation
     */
    peer_review: async (params, context) => {
      const { responses, query } = params;
      
      if (!responses || responses.length < 2) {
        throw new Error('Need at least 2 responses for peer review');
      }
      
      // Run reviews in parallel
      const reviewResults = await Promise.allSettled(
        responses.map(r => runReview(r.model, query, responses))
      );
      
      // Aggregate rankings
      const reviews = reviewResults
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      
      // Calculate aggregated ranking
      const scores = new Map();
      for (const review of reviews) {
        if (review.rankings) {
          review.rankings.forEach((rank, idx) => {
            const model = responses[idx]?.model;
            if (model) {
              const current = scores.get(model) || 0;
              scores.set(model, current + (responses.length - rank.rank));
            }
          });
        }
      }
      
      const aggregatedRanking = Array.from(scores.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([model, score]) => ({ model, score }));
      
      return {
        reviews,
        aggregatedRanking,
        reviewCount: reviews.length
      };
    },
    
    /**
     * Synthesize - chairman synthesis
     */
    synthesize: async (params, context) => {
      const { query, responses, reviews, searches, includeSearchStrategy = false } = params;
      
      const aggregatedRanking = reviews?.aggregatedRanking || null;
      const searchResults = searches || null;
      
      const result = await runChairman(
        query, 
        responses, 
        aggregatedRanking, 
        includeSearchStrategy,
        null, // executingCardId
        searchResults
      );
      
      return {
        content: result,
        chairmanModel: chairmanModel
      };
    },
    
    /**
     * Final Answer - output result (mainly a marker for agent loop)
     */
    final_answer: async (params, context) => {
      const { content, summary } = params;
      return {
        content,
        summary: summary || content.slice(0, 100) + '...',
        completed: true
      };
    }
  };
}

/**
 * Register all tool executors with the registry
 * Called from app.js after initialization
 */
function registerToolExecutors(appContext) {
  const executors = createToolExecutors(appContext);
  
  for (const [name, executor] of Object.entries(executors)) {
    toolRegistry.register(name, executor);
  }
  
  return toolRegistry;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVTools = {
    TOOL_DEFINITIONS,
    ToolRegistry,
    toolRegistry,
    createToolExecutors,
    registerToolExecutors
  };
}

