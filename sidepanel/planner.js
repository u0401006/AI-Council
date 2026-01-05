// ============================================
// MAV Agent Framework - Planner Module
// Multi-Agent Orchestration Support
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
   - query_council → peer_review → synthesize → **request_user_input** → final_answer
   - 在 synthesize 後，使用 request_user_input 詢問使用者是否要延伸搜尋

4. **事實查核問題**（真的嗎、是否正確）：
   - web_search → query_council → peer_review → synthesize

5. **圖像設計問題**（漫畫、插畫、設計）：
   - query_council → synthesize → final_answer
   - 不需要 peer_review，重點在整合設計方案

6. **資訊不足時**：
   - 追加 web_search 獲取更多資料

7. **回答品質已足夠但可延伸探索**：
   - 使用 request_user_input 提供搜尋建議，讓使用者決定是否深入

8. **使用者互動**：
   - synthesize 完成後，若問題有深入探索空間，使用 request_user_input
   - 提供 2-4 個精簡搜尋建議讓使用者選擇

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

## web_search 使用指引

- **每次搜尋只用 2-4 個精練關鍵字**
- 避免使用完整句子作為搜尋查詢
- 如需查多個主題，分開多次搜尋
- 使用空格分隔關鍵詞
- 範例：
  - ✓ 「美股券商 複委託 手續費」
  - ✓ 「克里米亞 兼併 國際法」
  - ✗ 「研究美股券商與台灣證券公司複委託的差異」（太長）

## request_user_input 使用指引

**互動類型 (inputType)**：
- \`choice\`: 提供多個選項按鈕讓使用者選擇
- \`search\`: 搜尋建議模式（顯示搜尋 pills）
- \`text\`: 需要使用者輸入文字（如澄清問題）
- \`confirm\`: 簡單確認（繼續/取消）

**可用 action 類型**：
- \`search\`: 執行搜尋，value 為搜尋關鍵字
- \`proceed\`: 直接產出結論，結束流程
- \`deepen\`: 深入分析當前主題，value 為聚焦方向
- \`rephrase\`: 重新提問，value 為建議的新問題
- \`switch_focus\`: 切換探索焦點，value 為新焦點
- \`clarify\`: 請求使用者澄清

**何時使用**：
- synthesize 完成後，問題有延伸探索價值
- 問題範圍太大，需要使用者選擇聚焦方向
- 回答涉及主觀判斷，需要了解使用者偏好
- 資訊可能過時，建議搜尋驗證

**何時不使用**：
- 簡單事實問題（直接 final_answer）
- 已經搜尋過 2 次以上
- 迭代次數接近上限

**參數範例**：

搜尋建議模式：
\`\`\`json
{
  "tool": "request_user_input",
  "parameters": {
    "message": "目前已整合分析結果。若想進一步驗證，可以搜尋：",
    "inputType": "search",
    "suggestedSearches": ["美股券商 手續費比較", "複委託 稅務優惠"]
  }
}
\`\`\`

多選項模式：
\`\`\`json
{
  "tool": "request_user_input",
  "parameters": {
    "message": "這個問題可以從多個角度探討，請選擇你最關心的方向：",
    "inputType": "choice",
    "options": [
      { "label": "成本分析", "action": "deepen", "value": "聚焦成本結構分析", "icon": "💰" },
      { "label": "風險評估", "action": "deepen", "value": "聚焦風險因素", "icon": "⚠️" },
      { "label": "直接給結論", "action": "proceed", "icon": "✅" }
    ]
  }
}
\`\`\`

澄清問題模式：
\`\`\`json
{
  "tool": "request_user_input",
  "parameters": {
    "message": "你的問題涉及多種情境，請說明你的具體需求：",
    "inputType": "text",
    "placeholder": "例如：我是新手投資者，主要關心..."
  }
}
\`\`\`

## 重要限制

- **query_council 參數**：只需提供 query，不要指定 models（系統會自動使用用戶設定的模型）
- **web_search query**：精簡為 2-4 個關鍵字，長度不超過 30 字
- **避免重複執行相同工具**（除非參數不同）
- 若迭代次數接近上限，應儘快 synthesize 並 final_answer
- 不要過度搜尋，通常 1-2 次搜尋就夠
- peer_review 只在有 2+ 個回答時才有意義
- **has_responses 為 true 時，表示已有足夠回答，應進入 synthesize 而非再次 query_council**
- **synthesize 後考慮使用 request_user_input**，除非問題很簡單或已搜尋多次`;

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
 * Extended for Multi-Agent Orchestration
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

  // Add orchestration info if available
  if (summary.hasAssignmentPlan) {
    prompt += `\n\n## 任務分配
- 分配策略: ${summary.assignmentStrategy}
- 當前 Chairman: ${summary.currentChairman || '未設定'}
- 任務組數: ${summary.taskCount || 1}`;
    
    if (summary.roundWinner) {
      prompt += `\n- 本輪互評勝者: ${summary.roundWinner}`;
    }
  }

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
      const validTools = ['query_council', 'web_search', 'peer_review', 'synthesize', 'final_answer', 'request_user_input'];
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
 * Now respects skill.preferredTools and orchestration to customize behavior
 */
class RuleBasedPlanner {
  constructor(config = {}) {
    this.skillHint = null;
    this.preferredTools = null;
    this.skill = null;
    this.customRules = config.rules || null;
    this.orchestrator = config.orchestrator || null;
    this.useWeightedEvaluation = config.useWeightedEvaluation !== false;
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
   * Set orchestrator for dynamic chairman management
   */
  setOrchestrator(orchestrator) {
    this.orchestrator = orchestrator;
  }
  
  /**
   * Plan using rules
   */
  async plan(context) {
    const summary = context.getSummary();
    const rules = this.customRules || this._buildRulesFromSkill(context);
    
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
   * Build rules dynamically based on skill.preferredTools and orchestration
   */
  _buildRulesFromSkill(context) {
    const preferred = this.preferredTools || ['query_council', 'peer_review', 'synthesize'];
    const hasWebSearch = preferred.includes('web_search');
    const hasPeerReview = preferred.includes('peer_review');
    const webSearchFirst = hasWebSearch && preferred.indexOf('web_search') === 0;
    
    // Check for orchestration mode
    const hasOrchestration = context?.assignmentPlan !== null;
    const useWeighted = this.useWeightedEvaluation && hasOrchestration;
    
    const rules = [];
    
    // Rule 0 (highest priority): If user already confirmed (after breakpoint), return final_answer
    rules.push({
      condition: (s, ctx) => {
        const lastAction = s.lastActions?.[s.lastActions.length - 1];
        return lastAction === 'request_user_input' && ctx.lastSynthesis;
      },
      action: (s, ctx) => ({
        tool: 'final_answer',
        parameters: { content: ctx.lastSynthesis },
        reasoning: 'User confirmed, returning final answer'
      })
    });
    
    // Rule: After synthesis, ask user if they want to extend search (for complex skills)
    const isComplexSkill = ['researcher', 'factChecker', 'technical'].includes(this.skill?.id);
    const searchCount = context?.searches?.length || 0;
    
    rules.push({
      condition: (s, ctx) => {
        const lastAction = s.lastActions?.[s.lastActions.length - 1];
        // Only offer breakpoint after synthesize, for complex skills, and not too many searches already
        return lastAction === 'synthesize' && 
               isComplexSkill && 
               searchCount < 2 &&
               ctx.lastSynthesis;
      },
      action: (s, ctx) => {
        // Extract search suggestions from responses if available
        const suggestedSearches = this._extractSearchSuggestions(ctx);
        
        return {
          tool: 'request_user_input',
          parameters: {
            message: '目前已完成初步分析。若想進一步驗證或深入探索，可以選擇以下搜尋：',
            suggestedSearches: suggestedSearches.slice(0, 4)
          },
          reasoning: 'Offering user option to extend search before final answer'
        };
      }
    });
    
    // Rule: If synthesis already done and breakpoint not needed, return final_answer
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
    
    // Rule: Peer review with weighted evaluation support
    if (hasPeerReview) {
      rules.push({
        condition: (s, ctx) => s.hasResponses && !s.hasReviews && s.responseCount >= 2 && ctx.reviews === null,
        action: (s, ctx, planner) => {
          // Build model weights from context if available
          const modelWeights = {};
          if (ctx.modelWeights) {
            for (const [model, weight] of ctx.modelWeights) {
              modelWeights[model] = weight;
            }
          }
          
          // Determine evaluation mode
          let evaluationMode = 'standard';
          if (useWeighted && ctx.assignmentPlan?.strategy !== 'homogeneous') {
            evaluationMode = ctx.taskResponses?.size > 1 ? 'contribution' : 'weighted';
          }
          
          return {
            tool: 'peer_review',
            parameters: {
              responses: ctx.responses,
              query: ctx.query,
              modelWeights,
              evaluationMode
            },
            reasoning: `Running peer review (mode: ${evaluationMode})`
          };
        }
      });
    }
    
    // Rule: Synthesize with weighted integration support
    rules.push({
      condition: (s) => {
        if (!s.hasResponses) return false;
        // If peer_review is in preferred tools, wait for it
        if (hasPeerReview && !s.hasReviews && s.responseCount >= 2) return false;
        return true;
      },
      action: (s, ctx, planner) => {
        // Determine if we should use weighted integration
        const shouldUseWeighted = useWeighted && 
          ctx.reviews?.weightedRanking !== null && 
          ctx.assignmentPlan?.strategy !== 'homogeneous';
        
        // Get dynamic chairman if available (winner from peer review)
        const chairmanOverride = ctx.roundWinner || null;
        
        return {
          tool: 'synthesize',
          parameters: {
            query: ctx.query,
            responses: ctx.responses,
            reviews: ctx.reviews,
            searches: ctx.searches,
            useWeightedIntegration: shouldUseWeighted,
            chairmanOverride
          },
          reasoning: shouldUseWeighted 
            ? 'Synthesizing with weighted integration' 
            : 'Synthesizing final answer'
        };
      }
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
  
  /**
   * Extract search suggestions from model responses
   */
  _extractSearchSuggestions(context) {
    const suggestions = [];
    
    // Try to extract from responses
    if (context.responses) {
      for (const response of context.responses) {
        const content = response.content || '';
        
        // Look for JSON search_queries block
        const jsonMatch = content.match(/```json\s*\{[^}]*"search_queries"\s*:\s*\[(.*?)\]/s);
        if (jsonMatch) {
          try {
            const queries = jsonMatch[1].match(/"([^"]+)"/g)?.map(q => q.replace(/"/g, ''));
            if (queries) suggestions.push(...queries);
          } catch (e) {}
        }
        
        // Look for inline suggestions
        const inlineMatch = content.match(/(?:建議搜尋|搜尋關鍵字|進一步搜尋)[：:]\s*(.+?)(?:\n|$)/);
        if (inlineMatch) {
          const parts = inlineMatch[1].split(/[,、；;]+/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 50);
          suggestions.push(...parts);
        }
      }
    }
    
    // Deduplicate and limit
    const unique = [...new Set(suggestions)];
    
    // If no suggestions found, generate some based on the query
    if (unique.length === 0 && context.query) {
      const query = context.query;
      // Extract potential keywords from the query
      const keywords = query.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g) || [];
      if (keywords.length >= 2) {
        unique.push(`${keywords[0]} ${keywords[1]} 最新`);
        if (keywords.length >= 3) {
          unique.push(`${keywords[2]} 比較`);
        }
      }
    }
    
    return unique.slice(0, 4);
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

/**
 * Orchestrated Planner - integrates with Orchestrator for dynamic chairman
 */
class OrchestratedPlanner extends RuleBasedPlanner {
  constructor(config = {}) {
    super(config);
    this.orchestrator = config.orchestrator || null;
  }
  
  /**
   * Override plan to support chairman rotation
   */
  async plan(context) {
    // Before planning, update chairman if we have a new winner
    if (this.orchestrator && context.roundWinner && context.reviews) {
      const newChairman = this.orchestrator.promoteToChairman(context.roundWinner);
      if (newChairman !== context.currentChairman) {
        console.log(`Chairman rotated: ${context.currentChairman} → ${newChairman}`);
        context.currentChairman = newChairman;
      }
    }
    
    return super.plan(context);
  }
}

/**
 * HybridPlanner - switches between LLM and Rule-based planning based on complexity
 * Automatically assesses query complexity to decide which planner to use
 */
class HybridPlanner {
  constructor(config = {}) {
    this.llmPlanner = new Planner(config);
    this.rulePlanner = new RuleBasedPlanner(config);
    this.complexityThreshold = config.complexityThreshold || 0.5;
    this.model = config.model || null;
  }
  
  setSkillHint(hint) {
    this.llmPlanner.setSkillHint(hint);
    this.rulePlanner.setSkillHint(hint);
  }
  
  setTools(tools) {
    this.llmPlanner.setTools(tools);
  }
  
  setPreferredTools(tools) {
    this.rulePlanner.setPreferredTools(tools);
  }
  
  setSkill(skill) {
    this.rulePlanner.setSkill(skill);
  }
  
  setOrchestrator(orchestrator) {
    this.rulePlanner.setOrchestrator(orchestrator);
  }
  
  /**
   * Plan using either LLM or rules based on complexity
   */
  async plan(context) {
    const complexity = this.assessComplexity(context);
    const useLLM = complexity > this.complexityThreshold && this.model;
    
    console.log('[HybridPlanner] Complexity:', complexity.toFixed(2), 
                useLLM ? '-> LLM' : '-> Rule');
    
    if (useLLM) {
      try {
        return await this.llmPlanner.plan(context);
      } catch (err) {
        console.warn('[HybridPlanner] LLM failed, falling back to rules:', err.message);
        return this.rulePlanner.plan(context);
      }
    }
    
    return this.rulePlanner.plan(context);
  }
  
  /**
   * Assess query complexity to determine which planner to use
   * Returns a score between 0 and 1
   */
  assessComplexity(context) {
    let score = 0;
    const query = context.query || '';
    const skill = context.skill || this.rulePlanner.skill;
    
    // Factor 1: Query length (0-0.3)
    // Longer queries tend to be more complex
    score += Math.min(query.length / 500, 0.3);
    
    // Factor 2: Skill complexity (0-0.4)
    // Some skills inherently require more sophisticated planning
    const complexSkills = ['researcher', 'factChecker', 'technical'];
    if (skill && complexSkills.includes(skill.id)) {
      score += 0.4;
    }
    
    // Factor 3: Multi-step keywords (0-0.3)
    // Keywords indicating the need for sophisticated reasoning
    const complexKeywords = [
      '比較', '分析', '評估', '研究', '差異', '優缺點',
      'compare', 'analyze', 'evaluate', 'research', 'difference',
      '為什麼', '如何', '怎麼', 'why', 'how'
    ];
    const keywordMatches = complexKeywords.filter(k => 
      query.toLowerCase().includes(k.toLowerCase())
    ).length;
    score += Math.min(keywordMatches * 0.1, 0.3);
    
    return Math.min(score, 1.0);
  }
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
    OrchestratedPlanner,
    HybridPlanner,
    createPlanner
  };
}

