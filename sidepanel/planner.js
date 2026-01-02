// ============================================
// MAV Agent Framework - Planner Module
// ============================================

/**
 * System prompt for the Planner LLM
 * Defines the decision-making rules for selecting tools
 */
const PLANNER_SYSTEM_PROMPT = `你是 AI Council 的任務規劃者。你的職責是根據用戶問題和目前執行狀態，決定下一步行動。

## 可用工具

{{tools}}

## 決策原則

1. **簡單問題**（事實查詢、定義解釋）：
   - query_council → synthesize → final_answer
   - 不需要 peer_review 或 web_search

2. **需要最新資訊**（新聞、時事、價格）：
   - web_search → query_council → synthesize → final_answer

3. **複雜分析問題**（比較、評估、深度分析）：
   - query_council → peer_review → synthesize → final_answer

4. **事實查核問題**（真的嗎、是否正確）：
   - web_search → query_council → peer_review → synthesize

5. **圖像設計問題**（漫畫、插畫、設計）：
   - query_council → synthesize → final_answer
   - 不需要 peer_review，重點在整合設計方案

6. **資訊不足時**：
   - 追加 web_search 獲取更多資料

7. **回答品質已足夠**：
   - 直接 final_answer 結束

## 狀態評估

- has_responses: 是否已有模型回答
- has_reviews: 是否已完成互評
- has_searches: 是否已執行搜尋
- iteration: 目前迭代次數
- max_iterations: 最大迭代次數
- response_count: 已收到幾個模型的回答

## 輸出格式

必須輸出有效的 JSON：
\`\`\`json
{
  "reasoning": "你的思考過程（一句話）",
  "tool": "工具名稱",
  "parameters": {
    "query": "問題內容（僅 query_council 和 web_search 需要）"
  }
}
\`\`\`

## 重要限制

- **query_council 參數**：只需提供 query，不要指定 models（系統會自動使用用戶設定的模型）
- **避免重複執行相同工具**（除非參數不同）
- 若迭代次數接近上限，應儘快 synthesize 並 final_answer
- 不要過度搜尋，通常 1-2 次搜尋就夠
- peer_review 只在有 2+ 個回答時才有意義
- **has_responses 為 true 時，表示已有足夠回答，應進入 synthesize 而非再次 query_council**`;

/**
 * Format tools for planner prompt
 */
function formatToolsForPrompt(tools) {
  // Ensure tools is an array
  const toolsArray = Array.isArray(tools) ? tools : Object.values(tools || {});
  
  if (toolsArray.length === 0) {
    return '（無可用工具）';
  }
  
  return toolsArray.map(tool => {
    const params = Object.entries(tool.parameters?.properties || {})
      .map(([name, schema]) => `    - ${name}: ${schema.description || schema.type}`)
      .join('\n');
    
    return `### ${tool.name}
${tool.description}
參數：
${params || '    （無參數）'}`;
  }).join('\n\n');
}

/**
 * Build the planning prompt with current context
 */
function buildPlanningPrompt(context, skillHint = null) {
  const summary = context.getSummary();
  
  let prompt = `## 當前狀態

- 用戶問題: ${summary.query}
- 迭代次數: ${summary.iteration}/${summary.maxIterations}
- 已有回答: ${summary.hasResponses ? `是 (${summary.responseCount} 個)` : '否'}
- 已完成互評: ${summary.hasReviews ? '是' : '否'}
- 已執行搜尋: ${summary.hasSearches ? `是 (${summary.searchCount} 次)` : '否'}
- 最近行動: ${summary.lastActions.length > 0 ? summary.lastActions.join(' → ') : '無'}
- 已用時間: ${Math.round(summary.elapsedTime / 1000)}秒`;

  if (skillHint) {
    prompt += `\n\n## 技能提示\n${skillHint}`;
  }

  prompt += `\n\n請決定下一步行動。`;

  return prompt;
}

/**
 * Parse planner response to extract action
 */
function parsePlannerResponse(response) {
  // Try to extract JSON from response
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('Failed to parse planner JSON:', e);
    }
  }
  
  // Try direct JSON parse
  try {
    return JSON.parse(response);
  } catch (e) {
    // Try to find JSON object in response
    const objMatch = response.match(/\{[\s\S]*"tool"[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (e2) {
        console.warn('Failed to parse planner response:', e2);
      }
    }
  }
  
  return null;
}

/**
 * Planner class - makes decisions about next actions
 */
class Planner {
  constructor(config = {}) {
    this.model = config.model || 'openai/gpt-4o-mini';
    // Ensure tools is always an array
    const inputTools = config.tools || [];
    this.tools = Array.isArray(inputTools) ? inputTools : Object.values(inputTools);
    this.skillHint = null;
    this.preferredTools = null;
    this.queryModelFn = config.queryModelFn || null;
  }
  
  /**
   * Set the tool definitions
   */
  setTools(tools) {
    this.tools = tools;
  }
  
  /**
   * Set skill hint for context-aware planning
   */
  setSkillHint(hint) {
    this.skillHint = hint;
  }
  
  /**
   * Set preferred tools from skill (used in prompt building)
   */
  setPreferredTools(tools) {
    this.preferredTools = tools;
  }
  
  /**
   * Set the model query function
   */
  setQueryFunction(fn) {
    this.queryModelFn = fn;
  }
  
  /**
   * Plan the next action based on current context
   * @param {AgentContext} context - Current agent context
   * @returns {Promise<Object>} - Next action to execute
   */
  async plan(context) {
    // Check if model is set
    if (!this.model) {
      console.warn('Planner model not set, using default strategy');
      return this._defaultAction(context);
    }
    
    // Build the prompt
    const toolsText = formatToolsForPrompt(this.tools);
    const systemPrompt = PLANNER_SYSTEM_PROMPT.replace('{{tools}}', toolsText);
    const userPrompt = buildPlanningPrompt(context, this.skillHint);
    
    console.log('Planner querying model:', this.model);
    
    try {
      // Query the planner model
      const response = await this._queryPlanner(systemPrompt, userPrompt);
      
      // Debug logging
      console.log('Planner raw response:', response?.substring?.(0, 500) || response);
      
      // Parse the response
      const action = parsePlannerResponse(response);
      
      if (!action || !action.tool) {
        console.warn('Planner returned invalid action, using default strategy. Response:', response?.substring?.(0, 200));
        return this._defaultAction(context);
      }
      
      // Validate tool exists
      const validTools = ['query_council', 'web_search', 'peer_review', 'synthesize', 'final_answer'];
      if (!validTools.includes(action.tool)) {
        console.warn(`Unknown tool: ${action.tool}, using default strategy`);
        return this._defaultAction(context);
      }
      
      console.log('Planner decided:', action.tool, action.reasoning);
      return action;
    } catch (error) {
      console.warn('Planner error, using default strategy:', error.message);
      return this._defaultAction(context);
    }
  }
  
  /**
   * Query the planner LLM
   */
  async _queryPlanner(systemPrompt, userPrompt) {
    if (this.queryModelFn) {
      return await this.queryModelFn(this.model, systemPrompt, userPrompt);
    }
    
    // Fallback: use chrome.runtime.sendMessage
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        type: 'QUERY_MODEL',
        payload: {
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }
      }, response => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          // OpenRouter API returns: { choices: [{ message: { content: "..." } }] }
          const content = response?.choices?.[0]?.message?.content || '';
          console.log('Planner API response received, content length:', content.length);
          resolve(content);
        }
      });
    });
  }
  
  /**
   * Default action when planner fails
   * Now respects preferredTools from skill
   */
  _defaultAction(context) {
    const summary = context.getSummary();
    const preferred = this.preferredTools || ['query_council', 'peer_review', 'synthesize'];
    const hasPeerReview = preferred.includes('peer_review');
    const hasWebSearch = preferred.includes('web_search');
    const webSearchFirst = hasWebSearch && preferred.indexOf('web_search') === 0;
    
    // Debug logging
    console.log('_defaultAction state:', {
      lastActions: summary.lastActions,
      hasResponses: summary.hasResponses,
      hasReviews: summary.hasReviews,
      preferred,
      lastSynthesis: context.lastSynthesis?.substring?.(0, 100) || context.lastSynthesis,
      historyLength: context.history?.length
    });
    
    // Check for repeated actions (loop prevention)
    const lastActions = summary.lastActions || [];
    const lastAction = lastActions[lastActions.length - 1];
    const secondLastAction = lastActions[lastActions.length - 2];
    
    // If we have a synthesis result, return final_answer immediately
    // This is a safeguard in case lastActions doesn't correctly reflect the synthesize action
    if (context.lastSynthesis) {
      console.log('_defaultAction: lastSynthesis exists, returning final_answer');
      return {
        tool: 'final_answer',
        parameters: { content: context.lastSynthesis },
        reasoning: 'Synthesis already completed'
      };
    }
    
    // If we already synthesized, return final_answer
    if (lastAction === 'synthesize') {
      const synthesisResult = context.responses?.[0]?.content || '處理完成';
      console.log('_defaultAction: synthesize done, returning final_answer');
      return {
        tool: 'final_answer',
        parameters: { content: synthesisResult },
        reasoning: 'Already synthesized, returning final answer'
      };
    }
    
    // If last two actions are the same, force progression
    if (lastAction && lastAction === secondLastAction) {
      if (lastAction === 'query_council' || lastAction === 'web_search') {
        // Force synthesize
        return {
          tool: 'synthesize',
          parameters: {
            query: context.query,
            responses: context.responses,
            reviews: context.reviews,
            searches: context.searches
          },
          reasoning: 'Forcing synthesis after repeated action'
        };
      }
    }
    
    // Web search first if skill requires
    if (webSearchFirst && !summary.hasSearches) {
      return {
        tool: 'web_search',
        parameters: { query: context.query, count: 10 },
        reasoning: 'Default: web search first per skill'
      };
    }
    
    // Query council if no responses yet
    if (!summary.hasResponses) {
      return {
        tool: 'query_council',
        parameters: { query: context.query },
        reasoning: 'Default: start with council query'
      };
    }
    
    // Web search after council if in preferred tools but not first
    if (hasWebSearch && !webSearchFirst && !summary.hasSearches && summary.hasResponses) {
      return {
        tool: 'web_search',
        parameters: { query: context.query, count: 10 },
        reasoning: 'Default: gathering additional info via web search'
      };
    }
    
    // Peer review only if in preferred tools and not done yet
    if (hasPeerReview && summary.hasResponses && !summary.hasReviews && summary.responseCount >= 2) {
      return {
        tool: 'peer_review',
        parameters: { responses: context.responses, query: context.query },
        reasoning: 'Default: run peer review'
      };
    }
    
    // Synthesize when we have responses (and peer_review done or not needed)
    if (summary.hasResponses) {
      const needsPeerReview = hasPeerReview && !summary.hasReviews && summary.responseCount >= 2;
      if (!needsPeerReview) {
        return {
          tool: 'synthesize',
          parameters: {
            query: context.query,
            responses: context.responses,
            reviews: context.reviews,
            searches: context.searches
          },
          reasoning: 'Default: synthesize results'
        };
      }
    }
    
    return {
      tool: 'final_answer',
      parameters: { content: '無法處理此請求' },
      reasoning: 'Default: unable to proceed'
    };
  }
}

/**
 * Rule-based Planner - uses predefined rules instead of LLM
 * More predictable and doesn't consume tokens
 * Now respects skill.preferredTools to customize behavior
 */
class RuleBasedPlanner {
  constructor(config = {}) {
    this.skillHint = null;
    this.preferredTools = null;
    this.skill = null;
    this.customRules = config.rules || null;
  }
  
  setSkillHint(hint) {
    this.skillHint = hint;
  }
  
  setTools(tools) {
    // Not needed for rule-based planner
  }
  
  /**
   * Set preferred tools from skill
   */
  setPreferredTools(tools) {
    this.preferredTools = tools;
  }
  
  /**
   * Set the full skill object for advanced configuration
   */
  setSkill(skill) {
    this.skill = skill;
  }
  
  /**
   * Plan using rules
   */
  async plan(context) {
    const summary = context.getSummary();
    const rules = this.customRules || this._buildRulesFromSkill();
    
    for (const rule of rules) {
      if (rule.condition(summary, context, this)) {
        return rule.action(summary, context, this);
      }
    }
    
    // Fallback
    return {
      tool: 'final_answer',
      parameters: { content: '無法繼續處理' },
      reasoning: 'No matching rule'
    };
  }
  
  /**
   * Build rules dynamically based on skill.preferredTools
   */
  _buildRulesFromSkill() {
    const preferred = this.preferredTools || ['query_council', 'peer_review', 'synthesize'];
    const hasWebSearch = preferred.includes('web_search');
    const hasPeerReview = preferred.includes('peer_review');
    const webSearchFirst = hasWebSearch && preferred.indexOf('web_search') === 0;
    
    const rules = [];
    
    // Rule 0 (highest priority): If synthesis already done, return final_answer
    rules.push({
      condition: (s, ctx) => ctx.lastSynthesis !== null && ctx.lastSynthesis !== undefined,
      action: (s, ctx) => ({
        tool: 'final_answer',
        parameters: { content: ctx.lastSynthesis },
        reasoning: 'Synthesis completed, returning final answer'
      })
    });
    
    // Rule: If last action was synthesize, return final_answer
    rules.push({
      condition: (s, ctx) => {
        const last = s.lastActions?.[s.lastActions.length - 1];
        return last === 'synthesize';
      },
      action: (s, ctx) => ({
        tool: 'final_answer',
        parameters: { content: ctx.responses?.[0]?.content || '處理完成' },
        reasoning: 'Already synthesized, returning final answer'
      })
    });
    
    // Rule: Web search first if skill requires it
    if (webSearchFirst) {
      rules.push({
        condition: (s) => !s.hasSearches,
        action: (s, ctx) => ({
          tool: 'web_search',
          parameters: { query: ctx.query, count: 10 },
          reasoning: 'Skill requires web search first'
        })
      });
    }
    
    // Rule: Start with council query
    rules.push({
      condition: (s) => !s.hasResponses,
      action: (s, ctx) => ({
        tool: 'query_council',
        parameters: { query: ctx.query, includeSearchSuffix: hasWebSearch && !webSearchFirst },
        reasoning: 'Starting with council query'
      })
    });
    
    // Rule: Web search after council if needed but not first
    if (hasWebSearch && !webSearchFirst) {
      rules.push({
        condition: (s) => s.hasResponses && !s.hasSearches && s.iteration < 3,
        action: (s, ctx) => ({
          tool: 'web_search',
          parameters: { query: ctx.query, count: 10 },
          reasoning: 'Gathering additional information via web search'
        })
      });
    }
    
    // Rule: Peer review only if skill allows
    if (hasPeerReview) {
      rules.push({
        condition: (s, ctx) => s.hasResponses && !s.hasReviews && s.responseCount >= 2 && ctx.reviews === null,
        action: (s, ctx) => ({
          tool: 'peer_review',
          parameters: { responses: ctx.responses, query: ctx.query },
          reasoning: 'Running peer review'
        })
      });
    }
    
    // Rule: Synthesize when we have responses
    rules.push({
      condition: (s) => {
        if (!s.hasResponses) return false;
        // If peer_review is in preferred tools, wait for it
        if (hasPeerReview && !s.hasReviews && s.responseCount >= 2) return false;
        return true;
      },
      action: (s, ctx) => ({
        tool: 'synthesize',
        parameters: {
          query: ctx.query,
          responses: ctx.responses,
          reviews: ctx.reviews,
          searches: ctx.searches
        },
        reasoning: 'Synthesizing final answer'
      })
    });
    
    // Rule: Max iterations reached
    rules.push({
      condition: (s) => s.iteration >= s.maxIterations - 1,
      action: (s, ctx) => ({
        tool: 'final_answer',
        parameters: { content: ctx.responses?.[0]?.content || '達到最大迭代次數' },
        reasoning: 'Max iterations reached'
      })
    });
    
    return rules;
  }
}

/**
 * Create a planner instance based on configuration
 */
function createPlanner(config = {}) {
  if (config.useLLM !== false && config.model) {
    return new Planner(config);
  }
  return new RuleBasedPlanner(config);
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVPlanner = {
    PLANNER_SYSTEM_PROMPT,
    formatToolsForPrompt,
    buildPlanningPrompt,
    parsePlannerResponse,
    Planner,
    RuleBasedPlanner,
    createPlanner
  };
}

