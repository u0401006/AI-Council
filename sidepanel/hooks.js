// ============================================
// MAV Agent Framework - Lifecycle Hook System
// Inspired by Claude Code Hooks architecture
// ============================================

/**
 * Hook Events - defines all lifecycle points where hooks can be registered
 */
const HOOK_EVENTS = {
  // Skill 相關
  SKILL_EVALUATE: 'skill:evaluate',     // 評估 skill 時
  SKILL_ACTIVATE: 'skill:activate',     // skill 被選中
  
  // Tool 相關
  TOOL_BEFORE: 'tool:before',           // 工具執行前
  TOOL_AFTER: 'tool:after',             // 工具執行後
  
  // 流程相關
  QUERY_SUBMIT: 'query:submit',         // 用戶送出問題
  SYNTHESIZE_BEFORE: 'synthesize:before', // 綜合前
  SYNTHESIZE_AFTER: 'synthesize:after',   // 綜合後
  COMPLETE: 'complete'                  // 流程結束
};

/**
 * Hook Handler Result - returned by hook handlers
 * @typedef {Object} HookResult
 * @property {boolean} [block] - 是否阻止後續動作（僅 *_BEFORE 事件）
 * @property {string} [message] - 阻止原因或訊息
 * @property {Object} [params] - 修改後的參數（用於 TOOL_BEFORE）
 * @property {boolean} [suppressOutput] - 是否隱藏輸出
 * @property {*} [data] - 任意附加資料
 */

/**
 * HookManager - 管理 lifecycle hooks 的註冊和觸發
 */
class HookManager {
  constructor() {
    /** @type {Map<string, Array<{id: string, handler: Function, priority: number, once: boolean}>>} */
    this.hooks = new Map();
    this.handlerIdCounter = 0;
    
    // 初始化所有事件
    Object.values(HOOK_EVENTS).forEach(event => {
      this.hooks.set(event, []);
    });
  }
  
  /**
   * 產生唯一的 handler ID
   * @returns {string}
   */
  _generateId() {
    return `hook_${++this.handlerIdCounter}_${Date.now()}`;
  }
  
  /**
   * 註冊 hook handler
   * @param {string} event - 事件名稱（使用 HOOK_EVENTS 常數）
   * @param {Function} handler - 處理函數，接收 payload，可回傳 HookResult
   * @param {Object} options - 選項
   * @param {number} [options.priority=10] - 優先級（數字越小越先執行）
   * @param {boolean} [options.once=false] - 是否只執行一次
   * @param {string} [options.id] - 自訂 ID（用於後續移除）
   * @returns {string} handler ID
   */
  register(event, handler, options = {}) {
    const { priority = 10, once = false, id = this._generateId() } = options;
    
    if (!this.hooks.has(event)) {
      console.warn(`[HookManager] Unknown event: ${event}, creating new event`);
      this.hooks.set(event, []);
    }
    
    const handlers = this.hooks.get(event);
    
    // 檢查是否已存在相同 ID
    const existingIdx = handlers.findIndex(h => h.id === id);
    if (existingIdx !== -1) {
      console.warn(`[HookManager] Replacing existing handler: ${id}`);
      handlers.splice(existingIdx, 1);
    }
    
    handlers.push({ id, handler, priority, once });
    
    // 按優先級排序
    handlers.sort((a, b) => a.priority - b.priority);
    
    console.log(`[HookManager] Registered handler ${id} for event ${event} (priority: ${priority})`);
    
    return id;
  }
  
  /**
   * 移除 hook handler
   * @param {string} event - 事件名稱
   * @param {string} handlerId - handler ID
   * @returns {boolean} 是否成功移除
   */
  unregister(event, handlerId) {
    if (!this.hooks.has(event)) {
      return false;
    }
    
    const handlers = this.hooks.get(event);
    const idx = handlers.findIndex(h => h.id === handlerId);
    
    if (idx !== -1) {
      handlers.splice(idx, 1);
      console.log(`[HookManager] Unregistered handler ${handlerId} from event ${event}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * 移除指定事件的所有 handlers
   * @param {string} event - 事件名稱
   */
  clearEvent(event) {
    if (this.hooks.has(event)) {
      this.hooks.set(event, []);
      console.log(`[HookManager] Cleared all handlers for event ${event}`);
    }
  }
  
  /**
   * 移除所有 handlers
   */
  clearAll() {
    this.hooks.forEach((_, event) => {
      this.hooks.set(event, []);
    });
    console.log('[HookManager] Cleared all handlers');
  }
  
  /**
   * 觸發事件，執行所有註冊的 handlers
   * @param {string} event - 事件名稱
   * @param {Object} payload - 傳遞給 handlers 的資料
   * @returns {Promise<HookResult>} 合併後的結果
   */
  async trigger(event, payload = {}) {
    if (!this.hooks.has(event)) {
      return {};
    }
    
    const handlers = this.hooks.get(event);
    if (handlers.length === 0) {
      return {};
    }
    
    console.log(`[HookManager] Triggering event ${event} with ${handlers.length} handlers`);
    
    const toRemove = [];
    let mergedResult = {};
    let blocked = false;
    
    for (const { id, handler, once } of handlers) {
      if (blocked) break;
      
      try {
        const result = await handler(payload);
        
        if (result) {
          // 合併結果
          mergedResult = { ...mergedResult, ...result };
          
          // 檢查是否阻止
          if (result.block === true) {
            blocked = true;
            console.log(`[HookManager] Event ${event} blocked by handler ${id}: ${result.message || 'No reason'}`);
          }
          
          // 如果 handler 修改了 params，更新 payload
          if (result.params) {
            payload.params = result.params;
          }
        }
        
        // 標記 once handlers
        if (once) {
          toRemove.push(id);
        }
        
      } catch (err) {
        console.error(`[HookManager] Handler ${id} threw error:`, err);
      }
    }
    
    // 移除 once handlers
    toRemove.forEach(id => this.unregister(event, id));
    
    return mergedResult;
  }
  
  /**
   * 檢查事件是否有註冊的 handlers
   * @param {string} event - 事件名稱
   * @returns {boolean}
   */
  hasHandlers(event) {
    return this.hooks.has(event) && this.hooks.get(event).length > 0;
  }
  
  /**
   * 取得事件的 handler 數量
   * @param {string} event - 事件名稱
   * @returns {number}
   */
  getHandlerCount(event) {
    return this.hooks.has(event) ? this.hooks.get(event).length : 0;
  }
  
  /**
   * 取得所有事件的統計
   * @returns {Object}
   */
  getStats() {
    const stats = {};
    this.hooks.forEach((handlers, event) => {
      stats[event] = handlers.length;
    });
    return stats;
  }
}

/**
 * 預設 Hook 註冊函數 - 提供常用的 hook 實作
 */
const DefaultHooks = {
  /**
   * peer_review 後自動 promote winner 為 Chairman
   * @param {Object} orchestrator - Orchestrator 實例
   * @returns {Function} hook handler
   */
  autoPromoteChairman(orchestrator) {
    return async ({ toolName, result }) => {
      if (toolName !== 'peer_review' || !result) return;
      
      // 從 rankings 取得 winner
      const rankings = result.rankings || result.results;
      if (!rankings || rankings.length === 0) return;
      
      // 找出最高分的模型
      const winner = rankings.reduce((best, current) => {
        const currentScore = current.rank || current.score || 0;
        const bestScore = best.rank || best.score || 0;
        return currentScore < bestScore ? current : best; // rank 越小越好
      }, rankings[0]);
      
      if (winner?.model && orchestrator) {
        console.log(`[DefaultHooks] Auto-promoting winner to Chairman: ${winner.model}`);
        orchestrator.promoteToChairman(winner.model);
        return { data: { promotedChairman: winner.model } };
      }
    };
  },
  
  /**
   * web_search 前優化搜尋關鍵字
   * @returns {Function} hook handler
   */
  optimizeSearchQuery() {
    return async ({ toolName, params }) => {
      if (toolName !== 'web_search' || !params?.query) return;
      
      let query = params.query;
      
      // 移除過長的句子，保留關鍵詞
      if (query.length > 50) {
        // 簡單優化：取前 50 字元，在詞邊界截斷
        const truncated = query.substring(0, 50);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 20) {
          query = truncated.substring(0, lastSpace);
        }
      }
      
      // 移除常見的無意義詞
      const stopWords = ['請問', '幫我', '我想知道', '可以告訴我', '什麼是'];
      stopWords.forEach(word => {
        query = query.replace(new RegExp(word, 'g'), '');
      });
      
      query = query.trim();
      
      if (query !== params.query) {
        console.log(`[DefaultHooks] Optimized search query: "${params.query}" -> "${query}"`);
        return { params: { ...params, query } };
      }
    };
  },
  
  /**
   * 流程結束後記錄統計
   * @returns {Function} hook handler
   */
  logCompletionStats() {
    return async ({ query, finalAnswer, context }) => {
      const stats = {
        queryLength: query?.length || 0,
        answerLength: finalAnswer?.length || 0,
        iterations: context?.iteration || 0,
        toolsUsed: context?.toolHistory?.length || 0,
        timestamp: Date.now()
      };
      
      console.log('[DefaultHooks] Completion stats:', stats);
      return { data: { stats } };
    };
  },
  
  /**
   * Skill 啟用時記錄
   * @returns {Function} hook handler
   */
  logSkillActivation() {
    return async ({ skill, query, score }) => {
      console.log(`[DefaultHooks] Skill activated: ${skill?.id || skill?.name} (score: ${score || 'N/A'})`);
      console.log(`[DefaultHooks] Query: ${query?.substring(0, 50)}...`);
      return { data: { activatedSkill: skill?.id } };
    };
  }
};

// 建立全域 HookManager 實例
const hookManager = new HookManager();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVHooks = {
    HOOK_EVENTS,
    HookManager,
    DefaultHooks,
    hookManager
  };
}

