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
    description: '並行查詢多個 LLM 模型獲取初步回答。適用於需要多元觀點的問題。支援異質任務分配。',
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
        },
        skillId: {
          type: 'string',
          description: '套用的 skill ID（用於異質任務分配）'
        },
        taskDescription: {
          type: 'string',
          description: '具體任務描述（用於異質任務分配）'
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
    description: '讓模型匿名互評其他模型的回答，產出排名與評語。支援加權整合評估。',
    parameters: {
      type: 'object',
      properties: {
        responses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              model: { type: 'string' },
              content: { type: 'string' },
              task: { type: 'string' },
              weight: { type: 'number' }
            }
          },
          description: '要評審的回答列表（含任務和權重資訊）'
        },
        query: {
          type: 'string',
          description: '原始問題'
        },
        modelWeights: {
          type: 'object',
          description: '模型權重映射 (model -> weight)'
        },
        evaluationMode: {
          type: 'string',
          enum: ['standard', 'weighted', 'contribution'],
          default: 'standard',
          description: '評估模式：standard=傳統互評, weighted=加權評估, contribution=貢獻度評估'
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
  },
  
  request_user_input: {
    name: 'request_user_input',
    description: '暫停執行並詢問使用者下一步行動。可用於：(1) 提供搜尋建議 (2) 請求澄清問題 (3) 提供多個探索方向 (4) 確認是否繼續深入',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: '顯示給使用者的訊息，說明目前狀態與選項'
        },
        inputType: {
          type: 'string',
          enum: ['choice', 'search', 'text', 'confirm'],
          default: 'choice',
          description: '互動類型：choice=選擇選項, search=搜尋建議, text=自由輸入, confirm=確認繼續'
        },
        options: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: '按鈕顯示文字' },
              action: { 
                type: 'string', 
                enum: ['search', 'proceed', 'deepen', 'rephrase', 'switch_focus', 'clarify'],
                description: 'search=搜尋, proceed=直接結論, deepen=深入分析, rephrase=重新提問, switch_focus=切換焦點, clarify=澄清'
              },
              value: { type: 'string', description: '附帶值（如搜尋關鍵字、新問題）' },
              icon: { type: 'string', description: '按鈕圖示（emoji）' }
            }
          },
          description: '提供給使用者的選項按鈕'
        },
        suggestedSearches: {
          type: 'array',
          items: { type: 'string' },
          description: '快速搜尋建議（2-4 個精簡詞組）'
        },
        placeholder: {
          type: 'string',
          description: '自由輸入框的 placeholder 文字'
        }
      },
      required: ['message']
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
 * Calculate contribution scores for heterogeneous task responses
 * Evaluates how much each response contributes to the final answer
 */
function calculateContributionScores(taskGroups, responses, reviews) {
  const contributions = new Map();
  
  // For each task group, evaluate contribution
  for (const [taskKey, taskResponses] of taskGroups) {
    const taskWeight = taskResponses[0]?.weight || 1.0 / taskGroups.size;
    
    // Within-task ranking
    const taskScores = new Map();
    for (const r of taskResponses) {
      // Find this model's ranking from reviews
      let rankScore = 0;
      for (const review of reviews) {
        if (review.rankings) {
          const idx = responses.findIndex(resp => resp.model === r.model);
          if (idx >= 0 && review.rankings[idx]) {
            rankScore += (responses.length - review.rankings[idx].rank);
          }
        }
      }
      taskScores.set(r.model, rankScore);
    }
    
    // Normalize within task
    const maxTaskScore = Math.max(...taskScores.values()) || 1;
    
    for (const [model, score] of taskScores) {
      const normalizedScore = score / maxTaskScore;
      const contribution = taskWeight * normalizedScore;
      
      const existing = contributions.get(model) || { total: 0, tasks: [] };
      existing.total += contribution;
      existing.tasks.push({
        task: taskKey,
        weight: taskWeight,
        score: normalizedScore,
        contribution
      });
      contributions.set(model, existing);
    }
  }
  
  // Sort by total contribution
  return Array.from(contributions.entries())
    .map(([model, data]) => ({
      model,
      totalContribution: data.total,
      taskBreakdown: data.tasks
    }))
    .sort((a, b) => b.totalContribution - a.totalContribution);
}

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
     * Peer Review - anonymous cross-evaluation with weighted scoring
     */
    peer_review: async (params, context) => {
      const { responses, query, modelWeights = {}, evaluationMode = 'standard' } = params;
      
      console.log('[PeerReview] Starting with mode:', evaluationMode, {
        responseCount: responses?.length,
        hasWeights: Object.keys(modelWeights).length > 0
      });
      
      if (!responses || responses.length < 2) {
        throw new Error('Need at least 2 responses for peer review');
      }
      
      // Group responses by task for heterogeneous evaluation
      const taskGroups = new Map();
      for (const r of responses) {
        const taskKey = r.task || 'default';
        if (!taskGroups.has(taskKey)) {
          taskGroups.set(taskKey, []);
        }
        taskGroups.get(taskKey).push(r);
      }
      
      console.log('[PeerReview] Task groups:', Array.from(taskGroups.keys()));
      
      // Run reviews in parallel
      const reviewResults = await Promise.allSettled(
        responses.map(r => runReview(r.model, query, responses))
      );
      
      // Aggregate rankings
      const reviews = reviewResults
        .filter(r => r.status === 'fulfilled' && r.value)
        .map(r => r.value);
      
      // Calculate aggregated ranking (standard)
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
      
      // Calculate weighted ranking if weights provided
      let weightedRanking = null;
      if (evaluationMode === 'weighted' || Object.keys(modelWeights).length > 0) {
        const weightedScores = new Map();
        
        for (const { model, score } of aggregatedRanking) {
          const response = responses.find(r => r.model === model);
          const taskWeight = response?.weight || modelWeights[model] || 1.0;
          
          // Normalized peer rank (0-1)
          const maxScore = aggregatedRanking[0]?.score || 1;
          const normalizedRank = score / maxScore;
          
          // Weighted score = taskWeight × peerRank
          const weightedScore = taskWeight * normalizedRank;
          weightedScores.set(model, weightedScore);
        }
        
        weightedRanking = Array.from(weightedScores.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([model, score]) => ({
            model,
            score,
            taskWeight: responses.find(r => r.model === model)?.weight || modelWeights[model] || 1.0,
            peerRank: scores.get(model) || 0
          }));
      }
      
      // Calculate contribution scores for heterogeneous tasks
      let contributionScores = null;
      if (evaluationMode === 'contribution' && taskGroups.size > 1) {
        contributionScores = calculateContributionScores(taskGroups, responses, reviews);
      }
      
      // Determine winner (for chairman rotation)
      const winner = weightedRanking?.[0]?.model || aggregatedRanking[0]?.model || null;
      
      console.log('[PeerReview] Complete:', {
        reviewCount: reviews.length,
        winner,
        evaluationMode,
        hasWeightedRanking: weightedRanking !== null,
        hasContributionScores: contributionScores !== null
      });
      
      if (weightedRanking) {
        console.log('[PeerReview] Weighted ranking:', weightedRanking.slice(0, 3));
      }
      
      return {
        reviews,
        aggregatedRanking,
        weightedRanking,
        contributionScores,
        reviewCount: reviews.length,
        winner,
        evaluationMode
      };
    },
    
    /**
     * Synthesize - chairman synthesis with weighted integration
     */
    synthesize: async (params, context) => {
      const { 
        query, 
        responses, 
        reviews, 
        searches, 
        includeSearchStrategy = false,
        useWeightedIntegration = false,
        chairmanOverride = null
      } = params;
      
      // Use weighted ranking if available
      const ranking = reviews?.weightedRanking || reviews?.aggregatedRanking || null;
      const searchResults = searches || null;
      
      // Allow chairman override for dynamic rotation
      const synthesisChairman = chairmanOverride || chairmanModel;
      
      // For heterogeneous tasks, prepare enhanced context
      let synthesisContext = null;
      if (useWeightedIntegration && reviews?.contributionScores) {
        synthesisContext = formatContributionContext(reviews.contributionScores, responses);
      }
      
      const result = await runChairman(
        query, 
        responses, 
        ranking, 
        includeSearchStrategy,
        null, // executingCardId
        searchResults,
        synthesisChairman // Chairman override for dynamic winner rotation
      );
      
      return {
        content: result,
        chairmanModel: synthesisChairman,
        usedWeightedIntegration: useWeightedIntegration,
        winner: reviews?.winner || null
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

/**
 * Format contribution scores as context for chairman synthesis
 */
function formatContributionContext(contributionScores, responses) {
  if (!contributionScores || contributionScores.length === 0) {
    return null;
  }
  
  let context = '\n\n## 模型貢獻度分析\n\n';
  context += '以下是各模型對不同任務的貢獻度評估：\n\n';
  
  for (const { model, totalContribution, taskBreakdown } of contributionScores) {
    context += `### ${model} (總貢獻: ${(totalContribution * 100).toFixed(1)}%)\n`;
    
    for (const task of taskBreakdown) {
      context += `- ${task.task}: 權重 ${(task.weight * 100).toFixed(0)}%, 表現 ${(task.score * 100).toFixed(0)}%, 貢獻 ${(task.contribution * 100).toFixed(1)}%\n`;
    }
    context += '\n';
  }
  
  context += '請基於上述貢獻度分析，整合各模型的優質內容，權重較高的任務應優先考慮。\n';
  
  return context;
}

// Export for use in other modules
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

