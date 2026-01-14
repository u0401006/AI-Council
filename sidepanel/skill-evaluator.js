// ============================================
// MAV Agent Framework - Skill Evaluator
// Score-based skill selection system
// Inspired by Claude Code Showcase skill-eval.js
// ============================================

/**
 * 預設評分配置
 */
const DEFAULT_SCORING = {
  keyword: 2,           // 關鍵字完全匹配
  keywordPattern: 3,    // 正則匹配
  intentPattern: 4,     // 意圖偵測
  contextMatch: 5,      // Context 來源匹配
  settingsMatch: 6,     // 設定觸發（如 learnerMode）
  visionMode: 8         // Vision 模式啟用
};

/**
 * 預設配置
 */
const DEFAULT_CONFIG = {
  minScore: 3,          // 最低分數門檻
  maxSkills: 3,         // 最多回傳幾個匹配的 skill
  showMatchReasons: true // 是否記錄匹配原因
};

/**
 * @typedef {Object} SkillMatch
 * @property {Object} skill - 匹配的 skill 物件
 * @property {number} score - 分數
 * @property {string[]} reasons - 匹配原因
 * @property {number} priority - 優先級
 */

/**
 * @typedef {Object} EvaluationContext
 * @property {Array} [items] - Context items（網頁、檔案等）
 * @property {boolean} [visionMode] - 是否為 Vision 模式
 * @property {string} [learnerMode] - 學習者模式設定
 */

/**
 * SkillEvaluator - 評分式 Skill 選擇器
 */
class SkillEvaluator {
  /**
   * @param {Object} config - 配置
   * @param {number} [config.minScore] - 最低分數門檻
   * @param {number} [config.maxSkills] - 最多回傳幾個 skill
   * @param {Object} [config.scoring] - 評分權重
   * @param {Object} [config.contextMappings] - Context URL 到 skill 的映射
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.scoring = { ...DEFAULT_SCORING, ...config.scoring };
    this.contextMappings = config.contextMappings || {};
    this.skills = null; // 將在 setSkills 時設定
    this.rulesLoaded = false;
  }
  
  /**
   * 設定 skills 來源
   * @param {Object} skills - SKILLS 物件
   */
  setSkills(skills) {
    this.skills = skills;
  }
  
  /**
   * 載入外部 skill-rules.json 配置
   * @param {Object} rules - 規則配置
   */
  loadRules(rules) {
    if (rules.config) {
      this.config = { ...this.config, ...rules.config };
    }
    if (rules.scoring) {
      this.scoring = { ...this.scoring, ...rules.scoring };
    }
    if (rules.contextMappings) {
      this.contextMappings = { ...this.contextMappings, ...rules.contextMappings };
    }
    this.rulesLoaded = true;
    console.log('[SkillEvaluator] Rules loaded:', { config: this.config, scoring: this.scoring });
  }
  
  /**
   * 評估單一 skill 的分數
   * @param {Object} skill - skill 定義
   * @param {string} query - 用戶問題
   * @param {EvaluationContext} context - 評估上下文
   * @param {Object} settings - 用戶設定
   * @returns {SkillMatch|null}
   */
  evaluateSkill(skill, query, context = {}, settings = {}) {
    let score = 0;
    const reasons = [];
    const queryLower = query.toLowerCase();
    
    // 1. 檢查是否有自定義 evaluateScore 方法
    if (typeof skill.evaluateScore === 'function') {
      const customScore = skill.evaluateScore(query, context, settings);
      if (customScore > 0) {
        score += customScore;
        reasons.push('custom evaluateScore');
      }
    }
    
    // 2. 檢查 scoring 配置（如果有）
    if (skill.scoring) {
      const skillScoring = skill.scoring;
      
      // 關鍵字匹配
      if (skillScoring.keywords) {
        for (const kw of skillScoring.keywords) {
          if (queryLower.includes(kw.toLowerCase())) {
            score += this.scoring.keyword;
            if (this.config.showMatchReasons) {
              reasons.push(`keyword "${kw}"`);
            }
          }
        }
      }
      
      // 正則匹配
      if (skillScoring.keywordPatterns) {
        for (const pattern of skillScoring.keywordPatterns) {
          const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
          if (regex.test(query)) {
            score += this.scoring.keywordPattern;
            if (this.config.showMatchReasons) {
              reasons.push(`pattern /${pattern.source || pattern}/`);
            }
          }
        }
      }
      
      // 意圖匹配
      if (skillScoring.intentPatterns) {
        for (const pattern of skillScoring.intentPatterns) {
          const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
          if (regex.test(query)) {
            score += this.scoring.intentPattern;
            if (this.config.showMatchReasons) {
              reasons.push('intent detected');
            }
            break; // 意圖只計一次
          }
        }
      }
      
      // Context 來源匹配
      if (skillScoring.contextPatterns && context?.items?.length > 0) {
        const { urlContains = [], titleContains = [] } = skillScoring.contextPatterns;
        
        for (const item of context.items) {
          // URL 匹配
          if (item.source || item.url) {
            const url = item.source || item.url;
            for (const urlPattern of urlContains) {
              if (url.includes(urlPattern)) {
                score += this.scoring.contextMatch;
                if (this.config.showMatchReasons) {
                  reasons.push(`context URL "${urlPattern}"`);
                }
                break;
              }
            }
          }
          
          // 標題匹配
          if (item.title) {
            for (const titlePattern of titleContains) {
              if (item.title.includes(titlePattern)) {
                score += this.scoring.contextMatch;
                if (this.config.showMatchReasons) {
                  reasons.push(`context title "${titlePattern}"`);
                }
                break;
              }
            }
          }
        }
      }
    }
    
    // 3. Context URL 映射（全域配置）
    if (Object.keys(this.contextMappings).length > 0 && context?.items?.length > 0) {
      for (const item of context.items) {
        const url = item.source || item.url || '';
        for (const [urlPattern, skillId] of Object.entries(this.contextMappings)) {
          if (url.includes(urlPattern) && skill.id === skillId) {
            score += this.scoring.contextMatch;
            if (this.config.showMatchReasons) {
              reasons.push(`contextMapping "${urlPattern}"`);
            }
          }
        }
      }
    }
    
    // 4. Settings 匹配
    // Vision 模式
    if (context?.visionMode === true) {
      if (skill.id === 'visionAnalysis' || skill.requireVisionModels) {
        score += this.scoring.visionMode;
        if (this.config.showMatchReasons) {
          reasons.push('visionMode active');
        }
      }
    }
    
    // Learner 模式
    if (settings?.learnerMode && settings.learnerMode !== 'standard') {
      if (skill.id === 'educator') {
        score += this.scoring.settingsMatch;
        if (this.config.showMatchReasons) {
          reasons.push(`learnerMode "${settings.learnerMode}"`);
        }
      }
    }
    
    // 5. 檢查排除條件
    if (skill.scoring?.excludePatterns) {
      for (const pattern of skill.scoring.excludePatterns) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
        if (regex.test(query)) {
          // 排除，返回 null
          return null;
        }
      }
    }
    
    // 6. Fallback: 使用原有的 trigger 函數
    if (score === 0 && typeof skill.trigger === 'function') {
      if (skill.trigger(query, settings)) {
        score += this.scoring.keyword; // 給予基本分數
        if (this.config.showMatchReasons) {
          reasons.push('legacy trigger');
        }
      }
    }
    
    if (score >= this.config.minScore) {
      return {
        skill,
        score,
        reasons,
        priority: skill.priority || 5
      };
    }
    
    return null;
  }
  
  /**
   * 評估所有 skills，回傳排序後的匹配結果
   * @param {string} query - 用戶問題
   * @param {EvaluationContext} context - 評估上下文
   * @param {Object} settings - 用戶設定
   * @returns {SkillMatch[]}
   */
  evaluate(query, context = {}, settings = {}) {
    if (!this.skills) {
      console.warn('[SkillEvaluator] No skills set, returning empty');
      return [];
    }
    
    const results = [];
    
    for (const skill of Object.values(this.skills)) {
      const match = this.evaluateSkill(skill, query, context, settings);
      if (match) {
        results.push(match);
      }
    }
    
    // 排序：先按分數降序，再按優先級降序
    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.priority - a.priority;
    });
    
    console.log('[SkillEvaluator] Evaluation results:', results.map(r => ({
      id: r.skill.id,
      score: r.score,
      reasons: r.reasons.slice(0, 3)
    })));
    
    return results.slice(0, this.config.maxSkills);
  }
  
  /**
   * 選擇最佳 skill
   * @param {string} query - 用戶問題
   * @param {EvaluationContext} context - 評估上下文
   * @param {Object} settings - 用戶設定
   * @param {Object} [defaultSkill] - 預設 skill（當無匹配時）
   * @returns {Object} 最佳 skill
   */
  selectBest(query, context = {}, settings = {}, defaultSkill = null) {
    const results = this.evaluate(query, context, settings);
    
    if (results.length > 0) {
      console.log(`[SkillEvaluator] Selected best skill: ${results[0].skill.id} (score: ${results[0].score})`);
      return results[0].skill;
    }
    
    // 無匹配時回傳預設 skill
    if (defaultSkill) {
      console.log(`[SkillEvaluator] No match, using default: ${defaultSkill.id}`);
      return defaultSkill;
    }
    
    // 嘗試從 skills 取得 quickAnswer
    if (this.skills?.quickAnswer) {
      console.log('[SkillEvaluator] No match, falling back to quickAnswer');
      return this.skills.quickAnswer;
    }
    
    return null;
  }
  
  /**
   * 取得所有匹配的 skill IDs（用於 UI 顯示）
   * @param {string} query - 用戶問題
   * @param {EvaluationContext} context - 評估上下文
   * @param {Object} settings - 用戶設定
   * @returns {Array<{id: string, name: string, score: number, reasons: string[]}>}
   */
  getMatchedSkillsForUI(query, context = {}, settings = {}) {
    const results = this.evaluate(query, context, settings);
    
    return results.map(r => ({
      id: r.skill.id,
      name: r.skill.name,
      icon: r.skill.icon,
      score: r.score,
      reasons: r.reasons
    }));
  }
  
  /**
   * 格式化評估結果為可讀字串（用於 debug 或日誌）
   * @param {string} query - 用戶問題
   * @param {EvaluationContext} context - 評估上下文
   * @param {Object} settings - 用戶設定
   * @returns {string}
   */
  formatEvaluationReport(query, context = {}, settings = {}) {
    const results = this.evaluate(query, context, settings);
    
    if (results.length === 0) {
      return 'No skills matched the query.';
    }
    
    let report = 'SKILL EVALUATION REPORT\n';
    report += '========================\n\n';
    report += `Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"\n\n`;
    
    report += 'Matched skills (ranked by score):\n';
    
    results.forEach((r, idx) => {
      const confidence = r.score >= this.config.minScore * 3 ? 'HIGH' :
                         r.score >= this.config.minScore * 2 ? 'MEDIUM' : 'LOW';
      
      report += `${idx + 1}. ${r.skill.name || r.skill.id} (${confidence} - score: ${r.score})\n`;
      if (r.reasons.length > 0) {
        report += `   Matched: ${r.reasons.join(', ')}\n`;
      }
    });
    
    return report;
  }
}

/**
 * 為現有 SKILLS 物件添加 scoring 配置的輔助函數
 * @param {Object} skills - SKILLS 物件
 * @returns {Object} 添加了 scoring 的 SKILLS
 */
function addScoringToSkills(skills) {
  const scoringConfigs = {
    researcher: {
      keywords: ['研究', '分析', '比較', '調查', '評估', '探討', '深入', '全面', '詳細'],
      keywordPatterns: [/深入.*研究/, /詳細.*分析/, /全面.*比較/],
      intentPatterns: [/(?:需要|請|幫我).*(?:研究|分析|調查)/],
      contextPatterns: {
        urlContains: ['arxiv.org', 'scholar.google', 'researchgate.net'],
        titleContains: ['論文', '期刊', '研究報告']
      }
    },
    factChecker: {
      keywords: ['真的嗎', '是否', '確認', '查證', '驗證', '正確嗎', '有沒有', '是不是'],
      keywordPatterns: [/是否.*正確/, /真的.*嗎/],
      intentPatterns: [/(?:查核|驗證|確認).*(?:真偽|正確|事實)/]
    },
    currentEvents: {
      keywords: ['最新', '現在', '今天', '昨天', '最近', '新聞', '時事', '目前', '當前'],
      keywordPatterns: [/最新.*消息/, /近期.*發展/],
      intentPatterns: [/(?:最近|目前).*(?:情況|狀況|進展)/],
      contextPatterns: {
        urlContains: ['news.google', 'cna.com.tw', 'bbc.com', 'reuters.com'],
        titleContains: ['新聞', '報導', '快訊']
      }
    },
    technical: {
      keywords: ['程式', 'code', 'coding', 'bug', '錯誤', 'API', '函數', 'function', '實作', 'implement'],
      keywordPatterns: [/程式碼.*錯誤/, /如何.*實作/, /API.*使用/],
      intentPatterns: [/(?:寫|修|debug).*(?:程式|code|function)/],
      contextPatterns: {
        urlContains: ['github.com', 'stackoverflow.com', 'developer.mozilla'],
        titleContains: ['Documentation', '文件', 'API Reference']
      }
    },
    creative: {
      keywords: ['想法', '創意', '點子', '建議', '可能', '方法', '策略', '方案', '怎麼辦'],
      keywordPatterns: [/有什麼.*想法/, /給我.*建議/],
      intentPatterns: [/(?:想|要).*(?:創意|點子|方案)/]
    },
    imageDesign: {
      keywords: ['漫畫', '圖像', '圖片', '插畫', '設計圖', '畫一', '繪製', '生成圖', '圖表', '視覺', '海報', '封面'],
      keywordPatterns: [/畫.*圖/, /設計.*視覺/, /生成.*圖片/],
      intentPatterns: [/(?:幫我|請).*(?:畫|設計|生成).*(?:圖|插畫)/]
    },
    visionAnalysis: {
      keywords: ['圖片', '照片', '影像', '看看', '分析圖'],
      keywordPatterns: [/這張.*圖/, /圖片.*是什麼/],
      intentPatterns: [/(?:分析|看|辨識).*(?:圖片|照片|影像)/]
    },
    priceCompare: {
      keywords: ['比價', '便宜', '最低價', '哪家', '價格', '買', '購買', '價錢', '划算', '優惠', 'momo', 'pchome', '蝦皮', '電商'],
      keywordPatterns: [/比.*價/, /哪.*便宜/, /最.*便宜/, /哪裡買/, /去哪買/],
      intentPatterns: [/(?:想|要|幫我).*(?:買|找).*(?:便宜|比價)/, /(?:哪家|哪裡).*(?:便宜|划算)/],
      contextPatterns: {
        urlContains: ['momoshop.com.tw', 'pchome.com.tw', 'shopee.tw', 'buy.yahoo.com'],
        titleContains: ['購物', '商城', '比價']
      }
    },
    quickAnswer: {
      keywords: [],
      keywordPatterns: [],
      intentPatterns: [],
      excludePatterns: [/深入/, /詳細/, /研究/, /分析/]
    }
  };
  
  // 為每個 skill 添加 scoring
  for (const [skillId, scoring] of Object.entries(scoringConfigs)) {
    if (skills[skillId]) {
      skills[skillId].scoring = scoring;
    }
  }
  
  return skills;
}

// 建立全域 SkillEvaluator 實例
const skillEvaluator = new SkillEvaluator();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVSkillEvaluator = {
    SkillEvaluator,
    skillEvaluator,
    addScoringToSkills,
    DEFAULT_SCORING,
    DEFAULT_CONFIG
  };
}

