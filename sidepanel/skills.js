// ============================================
// MAV Agent Framework - Skill System
// ============================================

/**
 * Skill definitions for different query types
 * Each skill customizes the agent's behavior for specific scenarios
 */
const SKILLS = {
  /**
   * Researcher Skill - for in-depth analysis and research
   */
  researcher: {
    id: 'researcher',
    name: '研究分析者',
    description: '適用於需要深度研究、多方資料比對的問題',
    icon: '🔬',
    
    // Trigger conditions
    trigger: (query, settings) => {
      const keywords = /研究|分析|比較|調查|評估|探討|深入|全面|詳細/;
      return keywords.test(query);
    },
    
    // Planner guidance
    plannerHint: '這是一個研究型問題。優先使用 web_search 收集多方資料，再 query_council 進行分析比較，確保使用 peer_review 驗證分析品質。',
    
    // Tool preferences
    preferredTools: ['web_search', 'query_council', 'peer_review', 'synthesize'],
    
    // Execution limits
    maxIterations: 8,
    maxSearches: 3,
    
    // Response style
    responseStyle: {
      length: 'detailed',
      format: 'structured',
      citations: true
    }
  },
  
  /**
   * Educator Skill - for learning-oriented responses
   */
  educator: {
    id: 'educator',
    name: '教育引導者',
    description: '使用蘇格拉底式教學法，引導學習者自主探索',
    icon: '📚',
    
    trigger: (query, settings) => {
      return settings?.learnerMode && settings.learnerMode !== 'standard';
    },
    
    plannerHint: '這是一個學習引導型問題。使用 query_council 獲取多元觀點，不需要 web_search 除非問題涉及最新資訊。重點在於產出探索式任務而非直接答案。',
    
    preferredTools: ['query_council', 'synthesize'],
    
    maxIterations: 5,
    
    // Override system prompts for learner mode
    getSystemPromptOverride: (settings) => {
      const learnerMode = settings?.learnerMode || 'standard';
      return LEARNER_SYSTEM_PROMPTS[learnerMode] || null;
    },
    
    responseStyle: {
      length: 'standard',
      format: 'exploratory',
      citations: false
    }
  },
  
  /**
   * Quick Answer Skill - for simple, direct questions
   */
  quickAnswer: {
    id: 'quickAnswer',
    name: '快速回答',
    description: '適用於簡單直接的問題，快速給出答案',
    icon: '⚡',
    
    trigger: (query, settings) => {
      // Short queries without complexity indicators
      const isShort = query.length < 50;
      const isSimple = !/為什麼|如何|分析|比較|評估|詳細|深入/.test(query);
      return isShort && isSimple;
    },
    
    plannerHint: '這是一個簡單問題。直接 query_council 獲取回答，跳過 peer_review，快速 synthesize 即可。',
    
    preferredTools: ['query_council', 'synthesize'],
    
    maxIterations: 3,
    
    responseStyle: {
      length: 'concise',
      format: 'text',
      citations: false
    }
  },
  
  /**
   * Fact Checker Skill - for verification questions
   */
  factChecker: {
    id: 'factChecker',
    name: '事實查核',
    description: '驗證資訊真偽，提供可靠來源',
    icon: '✅',
    
    trigger: (query, settings) => {
      const keywords = /真的嗎|是否|確認|查證|驗證|正確嗎|有沒有|是不是/;
      return keywords.test(query);
    },
    
    plannerHint: '這是一個事實查核問題。必須先 web_search 取得可靠來源，再 query_council 進行交叉驗證，使用 peer_review 確保結論可靠。',
    
    preferredTools: ['web_search', 'query_council', 'peer_review', 'synthesize'],
    
    maxIterations: 6,
    maxSearches: 2,
    
    responseStyle: {
      length: 'standard',
      format: 'structured',
      citations: true
    }
  },
  
  /**
   * Creative Skill - for creative and brainstorming tasks
   */
  creative: {
    id: 'creative',
    name: '創意發想',
    description: '適用於腦力激盪、創意發想、開放性問題',
    icon: '💡',
    
    trigger: (query, settings) => {
      const keywords = /想法|創意|點子|建議|可能|方法|策略|方案|怎麼辦/;
      return keywords.test(query);
    },
    
    plannerHint: '這是一個創意發想問題。使用 query_council 獲取多元觀點最重要，不需要 web_search。peer_review 可以幫助篩選最佳創意。',
    
    preferredTools: ['query_council', 'peer_review', 'synthesize'],
    
    maxIterations: 5,
    
    responseStyle: {
      length: 'standard',
      format: 'mixed',
      citations: false
    }
  },
  
  /**
   * Technical Skill - for coding and technical questions
   */
  technical: {
    id: 'technical',
    name: '技術專家',
    description: '適用於程式碼、技術問題、除錯',
    icon: '💻',
    
    trigger: (query, settings) => {
      const keywords = /程式|code|coding|bug|錯誤|API|函數|function|實作|implement/i;
      return keywords.test(query);
    },
    
    plannerHint: '這是一個技術問題。query_council 獲取多個模型的解決方案，peer_review 評估程式碼品質，如需查詢文件可使用 web_search。',
    
    preferredTools: ['query_council', 'peer_review', 'web_search', 'synthesize'],
    
    maxIterations: 6,
    
    responseStyle: {
      length: 'detailed',
      format: 'structured',
      citations: true
    }
  },
  
  /**
   * Current Events Skill - for news and recent information
   */
  currentEvents: {
    id: 'currentEvents',
    name: '時事追蹤',
    description: '適用於新聞、時事、即時資訊查詢',
    icon: '📰',
    
    trigger: (query, settings) => {
      const keywords = /最新|現在|今天|昨天|最近|新聞|時事|目前|當前/;
      return keywords.test(query);
    },
    
    plannerHint: '這是一個時事問題。必須先 web_search 獲取最新資訊，query_council 分析整理，不需要 peer_review（新聞重時效）。',
    
    preferredTools: ['web_search', 'query_council', 'synthesize'],
    
    maxIterations: 5,
    maxSearches: 2,
    
    responseStyle: {
      length: 'standard',
      format: 'mixed',
      citations: true
    }
  },
  
  /**
   * Image Design Skill - for visual design and image generation
   */
  imageDesign: {
    id: 'imageDesign',
    name: '圖像設計',
    description: '適用於漫畫、插畫、圖表、視覺設計與生成',
    icon: '🎨',
    
    trigger: (query, settings) => {
      const keywords = /漫畫|圖像|圖片|插畫|設計圖|畫一|繪製|生成圖|圖表|視覺|海報|封面|logo|icon|Q版|卡通|動漫|風格.*圖/i;
      return keywords.test(query);
    },
    
    // Dynamic planner hint based on context
    getPlannerHint: (query, settings) => {
      const hasStyleRef = /風格|像.*一樣|參考|仿照|類似|style/i.test(query);
      const hasUploadedImage = settings?.visionMode === true;
      
      if (hasUploadedImage) {
        return '用戶上傳了參考圖像。先用 query_council（視覺模型）解析圖像的風格特徵（色彩、構圖、筆觸），提取可用於生成的風格描述，再用 query_council 生成設計方案，最後 synthesize 整合並顯示風格選擇。';
      }
      
      if (hasStyleRef) {
        return '用戶提到特定風格參考。先用 web_search 搜尋該風格的特徵描述和視覺元素，再用 query_council 融合風格生成設計方案，最後 synthesize 整合。不需要 peer_review。';
      }
      
      return '這是純創意設計問題。使用 query_council 獲取多個設計方案，不需要 web_search 或 peer_review（創意無對錯）。synthesize 後顯示圖像風格選擇介面。';
    },
    
    // Static fallback hint
    plannerHint: '這是圖像設計問題。使用 query_council 獲取多個設計方案，不需要 web_search 或 peer_review。synthesize 後顯示風格選擇。',
    
    // Dynamic tool preferences
    getPreferredTools: (query, settings) => {
      const hasStyleRef = /風格|像.*一樣|參考|仿照|類似|style/i.test(query);
      const hasUploadedImage = settings?.visionMode === true;
      
      if (hasUploadedImage) {
        return ['query_council', 'synthesize'];
      }
      
      if (hasStyleRef) {
        return ['web_search', 'query_council', 'synthesize'];
      }
      
      return ['query_council', 'synthesize'];
    },
    
    preferredTools: ['query_council', 'synthesize'],
    
    maxIterations: 5,
    
    // Special flag: show image style selector after synthesis
    showImageStyleSelector: true,
    
    // Model requirements based on context
    getModelRequirements: (query, settings) => {
      if (settings?.visionMode) {
        return { requireVisionModels: true };
      }
      return {};
    },
    
    responseStyle: {
      length: 'standard',
      format: 'structured',
      citations: false
    }
  },
  
  /**
   * Vision Analysis Skill - for analyzing uploaded images
   */
  visionAnalysis: {
    id: 'visionAnalysis',
    name: '圖像解析',
    description: '分析上傳圖片的內容、風格、物件',
    icon: '👁️',
    
    trigger: (query, settings) => {
      // Trigger when in vision mode (image uploaded) AND not an image design request
      const isVisionMode = settings?.visionMode === true;
      const isImageDesign = /漫畫|插畫|設計圖|畫一|繪製|生成圖|海報|封面/i.test(query);
      return isVisionMode && !isImageDesign;
    },
    
    plannerHint: '用戶上傳了圖片需要分析。使用 query_council 讓視覺模型解析圖片內容，可搭配 web_search 查詢相關背景資訊，複雜分析可用 peer_review 交叉驗證。',
    
    preferredTools: ['query_council', 'web_search', 'peer_review', 'synthesize'],
    
    maxIterations: 6,
    maxSearches: 2,
    
    // Require vision-capable models
    requireVisionModels: true,
    
    responseStyle: {
      length: 'detailed',
      format: 'structured',
      citations: true
    }
  }
};

/**
 * Learner mode system prompts
 */
const LEARNER_SYSTEM_PROMPTS = {
  '9-10': `你是一位耐心的學習引導者。對方是 9-10 歲的學習者。
- 使用簡單詞彙和生活化例子
- 揭露約 70% 的概念，留下 30% 給探索
- 用「你覺得呢？」「你猜猜看」等引導語
- 產出 2-3 個簡單的探索任務`,

  '11-12': `你是一位啟發式教師。對方是 11-12 歲的學習者。
- 給出線索讓學習者自己推導
- 揭露約 50% 的概念
- 連結到學習者可能已知的知識
- 產出 3-4 個探索式任務，包含「發現」和「驗證」類型`,

  '13-15': `你是一位方法論導師。對方是 13-15 歲的學習者。
- 著重在方法框架而非直接答案
- 引導批判性思考和分析
- 產出 4-5 個任務，包含「分析」和「應用」類型`,

  '16-18': `你是一位學術研究夥伴。對方是 16-18 歲的學習者。
- 提供多元觀點和學術深度
- 鼓勵自主研究和文獻探索
- 產出 4-5 個進階任務，包含「研究」和「批判」類型`
};

/**
 * Skill Selector - chooses the best skill for a query
 */
class SkillSelector {
  constructor(skills = SKILLS) {
    this.skills = skills;
    this.defaultSkill = skills.quickAnswer;
  }
  
  /**
   * Select the most appropriate skill for a query
   * @param {string} query - User's question
   * @param {Object} settings - App settings
   * @returns {Object} - Selected skill
   */
  select(query, settings = {}) {
    console.log('[SkillSelector] Selecting skill for query:', query.substring(0, 40) + '...', { settings });
    
    // Check educator first (settings-based trigger)
    if (this.skills.educator.trigger(query, settings)) {
      console.log('[SkillSelector] Matched: educator (settings-based)');
      return this.skills.educator;
    }
    
    // Check other skills by priority
    const skillPriority = [
      'visionAnalysis',  // Highest: when image is uploaded (non-design)
      'imageDesign',     // Image design keywords
      'factChecker',     // Fact checking is important
      'currentEvents',   // Time-sensitive
      'technical',       // Technical questions
      'researcher',      // Research questions
      'creative',        // Creative questions
      'quickAnswer'      // Default fallback
    ];
    
    for (const skillId of skillPriority) {
      const skill = this.skills[skillId];
      if (skill && skill.trigger(query, settings)) {
        console.log('[SkillSelector] Matched:', skillId, skill.name);
        return skill;
      }
    }
    
    console.log('[SkillSelector] No match, using default:', this.defaultSkill?.id);
    return this.defaultSkill;
  }
  
  /**
   * Get all available skills
   */
  getAll() {
    return Object.values(this.skills);
  }
  
  /**
   * Get skill by ID
   */
  getById(id) {
    return this.skills[id] || null;
  }
  
  /**
   * Match multiple skills for a query (for UI display)
   */
  matchAll(query, settings = {}) {
    return Object.values(this.skills).filter(skill => 
      skill.trigger(query, settings)
    );
  }
}

/**
 * Apply skill configuration to agent context
 * @param {Object} agent - Agent instance
 * @param {Object} skill - Skill definition
 * @param {string} query - User's query (needed for dynamic getters)
 * @param {Object} settings - App settings
 */
function applySkillToAgent(agent, skill, query = '', settings = {}) {
  if (!skill) return;
  
  // Set max iterations
  if (skill.maxIterations) {
    agent.maxIterations = skill.maxIterations;
  }
  
  // Set planner hint (support dynamic getter)
  if (agent.planner) {
    let hint = null;
    if (skill.getPlannerHint) {
      hint = skill.getPlannerHint(query, settings);
    } else if (skill.plannerHint) {
      hint = skill.plannerHint;
    }
    if (hint) {
      agent.planner.setSkillHint(hint);
    }
  }
  
  // Set preferred tools (support dynamic getter)
  if (agent.planner) {
    let tools = null;
    if (skill.getPreferredTools) {
      tools = skill.getPreferredTools(query, settings);
    } else if (skill.preferredTools) {
      tools = skill.preferredTools;
    }
    if (tools && agent.planner.setPreferredTools) {
      agent.planner.setPreferredTools(tools);
    }
    // Also store on agent for RuleBasedPlanner access
    if (tools) {
      agent.preferredTools = tools;
    }
  }
  
  // Set model requirements (support dynamic getter)
  let modelReqs = {};
  if (skill.getModelRequirements) {
    modelReqs = skill.getModelRequirements(query, settings);
  } else if (skill.requireVisionModels) {
    modelReqs = { requireVisionModels: true };
  }
  if (modelReqs.requireVisionModels) {
    agent.useVisionModels = true;
  }
  
  // Store skill flags on agent
  if (skill.showImageStyleSelector) {
    agent.showImageStyleSelector = true;
  }
  
  // Get system prompt override if available
  if (skill.getSystemPromptOverride) {
    const override = skill.getSystemPromptOverride(settings);
    if (override) {
      agent.systemPromptOverride = override;
    }
  }
}

/**
 * Get response style instructions based on skill
 */
function getStyleInstructions(skill) {
  if (!skill?.responseStyle) return '';
  
  const style = skill.responseStyle;
  let instructions = '\n\n## 回答風格要求\n';
  
  if (style.length === 'concise') {
    instructions += '- 請簡潔扼要，避免冗長\n';
  } else if (style.length === 'detailed') {
    instructions += '- 請詳細說明，涵蓋各面向\n';
  }
  
  if (style.format === 'structured') {
    instructions += '- 使用結構化格式（標題、清單）\n';
  } else if (style.format === 'exploratory') {
    instructions += '- 使用引導式問題和探索任務\n';
  }
  
  if (style.citations) {
    instructions += '- 標註引用來源\n';
  }
  
  return instructions;
}

/**
 * Enhanced Skill Selector - integrates with SkillLoader for dynamic skills
 * Falls back to hardcoded SKILLS if SkillLoader is not available
 */
class EnhancedSkillSelector extends SkillSelector {
  constructor(skills = SKILLS) {
    super(skills);
    this.skillLoader = null;
    this.dynamicSkillsLoaded = false;
  }
  
  /**
   * Initialize with SkillLoader
   */
  async initialize() {
    // Try to use SkillLoader if available
    if (window.MAVSkillLoader?.skillLoader) {
      this.skillLoader = window.MAVSkillLoader.skillLoader;
      await this.skillLoader.initialize();
      this.dynamicSkillsLoaded = true;
      console.log('EnhancedSkillSelector: SkillLoader integrated');
    }
  }
  
  /**
   * Select skill - tries dynamic skills first, then falls back to hardcoded
   */
  async selectAsync(query, settings = {}) {
    // Try SkillLoader first
    if (this.skillLoader && this.dynamicSkillsLoaded) {
      try {
        const dynamicSkill = await this.skillLoader.selectSkill(query, settings);
        if (dynamicSkill) {
          console.log('Selected dynamic skill:', dynamicSkill.id);
          return dynamicSkill;
        }
      } catch (err) {
        console.warn('Dynamic skill selection failed:', err);
      }
    }
    
    // Fall back to hardcoded skills
    return this.select(query, settings);
  }
  
  /**
   * Get all skills (merged from hardcoded and dynamic)
   */
  async getAllAsync() {
    const hardcoded = this.getAll();
    
    if (this.skillLoader && this.dynamicSkillsLoaded) {
      const dynamicMeta = this.skillLoader.getAllMetadata();
      // Merge, preferring dynamic skills
      const merged = new Map();
      
      // Add hardcoded first
      for (const skill of hardcoded) {
        merged.set(skill.id, skill);
      }
      
      // Override with dynamic skills
      for (const meta of dynamicMeta) {
        if (!merged.has(meta.id)) {
          try {
            const fullSkill = await this.skillLoader.loadInstructions(meta.id);
            merged.set(meta.id, fullSkill);
          } catch (err) {
            console.warn(`Failed to load skill ${meta.id}:`, err);
          }
        }
      }
      
      return Array.from(merged.values());
    }
    
    return hardcoded;
  }
  
  /**
   * Get skill by ID (checks both sources)
   */
  async getByIdAsync(id) {
    // Try SkillLoader first
    if (this.skillLoader && this.dynamicSkillsLoaded) {
      try {
        const skill = await this.skillLoader.loadInstructions(id);
        if (skill) return skill;
      } catch (err) {
        // Not found in dynamic, fall through
      }
    }
    
    // Fall back to hardcoded
    return this.getById(id);
  }
  
  /**
   * Load a reference file for a skill (Layer 3)
   */
  async loadReference(skillId, refPath) {
    if (this.skillLoader) {
      return this.skillLoader.loadReference(skillId, refPath);
    }
    throw new Error('SkillLoader not available');
  }
  
  /**
   * Add a custom skill at runtime
   */
  async addCustomSkill(skillId, content) {
    if (this.skillLoader) {
      return this.skillLoader.addSkill(skillId, content);
    }
    throw new Error('SkillLoader not available');
  }
  
  /**
   * Get skill metadata for Planner (minimal token usage)
   */
  getMetadataForPlanner() {
    if (this.skillLoader && this.dynamicSkillsLoaded) {
      return this.skillLoader.getAllMetadata();
    }
    
    // Fall back to hardcoded
    return Object.values(this.skills).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description
    }));
  }
}

// Create global skill selector instance
const skillSelector = new SkillSelector();

// Create enhanced selector (will be initialized async)
const enhancedSkillSelector = new EnhancedSkillSelector();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVSkills = {
    SKILLS,
    LEARNER_SYSTEM_PROMPTS,
    SkillSelector,
    EnhancedSkillSelector,
    skillSelector,
    enhancedSkillSelector,
    applySkillToAgent,
    getStyleInstructions
  };
}

