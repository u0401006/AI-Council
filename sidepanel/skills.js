// ============================================
// Translation-Focus: Skill System (Simplified)
// Only translation skills retained
// ============================================

/**
 * Translation skill definitions
 * Stripped: researcher, factChecker, creative, technical, currentEvents,
 *           imageDesign, visionAnalysis, educator, quickAnswer
 */
const SKILLS = {
  /**
   * Single-Language Translation Skill
   */
  translatorSingle: {
    id: 'translatorSingle',
    name: '單語翻譯',
    description: '將文本翻譯為指定的單一目標語言',
    icon: '🌐',
    category: 'translation',
    sideEffects: null,

    trigger: (query, settings) => {
      const keywords = /翻譯|translate|翻成|譯成|翻為|轉成|幫我翻|請翻|中翻英|英翻中|日翻中|中翻日|韓翻中|中翻韓/i;
      return keywords.test(query);
    },

    plannerHint: '這是單語翻譯任務。使用 query_council 讓多個模型各自翻譯，peer_review 互評翻譯品質，synthesize 整合最佳翻譯結果。',

    instructions: `你是一位專業翻譯員。請遵循以下指引：

1. **忠實原文**：準確傳達原文含義，不增加或省略內容
2. **自然流暢**：譯文應符合目標語言的表達習慣
3. **術語一致**：專業術語保持一致的翻譯
4. **格式保留**：保留原文的段落結構、標點符號風格
5. **文化適配**：適當處理文化差異，如慣用語、計量單位等
6. **註解說明**：對於難以直譯的概念，可加註說明`,

    preferredTools: ['query_council', 'peer_review', 'synthesize'],
    maxIterations: 5,

    responseStyle: {
      length: 'standard',
      format: 'structured',
      citations: false
    }
  },

  /**
   * Multi-Language Translation Skill
   */
  translatorMulti: {
    id: 'translatorMulti',
    name: '多語翻譯',
    description: '同時翻譯為多種目標語言',
    icon: '🌍',
    category: 'translation',
    sideEffects: null,

    trigger: (query, settings) => {
      const keywords = /多語|多國|同時翻譯|翻成.*和|翻成.*與|翻譯成.*種|multi.?lang|multiple.?lang/i;
      return keywords.test(query);
    },

    plannerHint: '這是多語翻譯任務。使用 query_council 讓各模型翻譯多種語言版本，peer_review 互評各語言翻譯品質，synthesize 整合所有語言的最佳翻譯。',

    instructions: `你是一位多語專業翻譯員。請遵循以下指引：

1. **多語輸出**：依照用戶指定的目標語言分別翻譯
2. **語言標示**：每段翻譯前標示語言名稱
3. **忠實原文**：各語言版本都需準確傳達原文含義
4. **自然流暢**：各語言譯文應符合該語言的表達習慣
5. **術語一致**：同一概念在各語言中保持對應的專業術語
6. **格式統一**：各語言版本採用統一的排版格式`,

    preferredTools: ['query_council', 'peer_review', 'synthesize'],
    maxIterations: 6,

    responseStyle: {
      length: 'detailed',
      format: 'structured',
      citations: false
    }
  }
};

/**
 * Skill categories (translation only)
 */
const SKILL_CATEGORIES = {
  translation: {
    id: 'translation',
    name: '翻譯',
    icon: '🌐',
    description: '單語與多語翻譯'
  }
};

/**
 * Learner mode system prompts — removed (not applicable to translation)
 */
const LEARNER_SYSTEM_PROMPTS = {};

/**
 * Skill Selector - translation-only
 */
class SkillSelector {
  constructor(skills = SKILLS) {
    this.skills = skills;
    this.defaultSkill = skills.translatorSingle;
  }

  select(query, settings = {}) {
    if (this.skills.translatorMulti.trigger(query, settings)) {
      return this.skills.translatorMulti;
    }
    return this.skills.translatorSingle;
  }

  getAll() {
    return Object.values(this.skills);
  }

  getById(id) {
    return this.skills[id] || null;
  }

  matchAll(query, settings = {}) {
    return Object.values(this.skills).filter(skill =>
      skill.trigger(query, settings)
    );
  }
}

/**
 * Apply skill configuration to agent context
 */
function applySkillToAgent(agent, skill, query = '', settings = {}) {
  if (!skill) return;

  if (skill.maxIterations) {
    agent.maxIterations = skill.maxIterations;
  }

  if (agent.planner) {
    if (skill.plannerHint) {
      agent.planner.setSkillHint(skill.plannerHint);
    }
    if (skill.preferredTools && agent.planner.setPreferredTools) {
      agent.planner.setPreferredTools(skill.preferredTools);
    }
    if (skill.preferredTools) {
      agent.preferredTools = skill.preferredTools;
    }
  }
}

/**
 * Get response style instructions
 */
function getStyleInstructions(skill) {
  if (!skill?.responseStyle) return '';
  const style = skill.responseStyle;
  let instructions = '\n\n## 回答風格要求\n';
  if (style.length === 'detailed') {
    instructions += '- 請詳細列出各語言翻譯\n';
  } else {
    instructions += '- 請提供清晰的翻譯結果\n';
  }
  if (style.format === 'structured') {
    instructions += '- 使用結構化格式呈現翻譯\n';
  }
  return instructions;
}

// Stub for EnhancedSkillSelector (no longer dynamic skills)
class EnhancedSkillSelector extends SkillSelector {
  async initialize() {}
  async selectAsync(query, settings = {}) { return this.select(query, settings); }
  async getAllAsync() { return this.getAll(); }
  async getByIdAsync(id) { return this.getById(id); }
  getMetadataForPlanner() {
    return Object.values(this.skills).map(s => ({
      id: s.id, name: s.name, description: s.description
    }));
  }
}

const skillSelector = new SkillSelector();
const enhancedSkillSelector = new EnhancedSkillSelector();

if (typeof window !== 'undefined') {
  window.MAVSkills = {
    SKILLS,
    SKILL_CATEGORIES,
    LEARNER_SYSTEM_PROMPTS,
    SkillSelector,
    EnhancedSkillSelector,
    skillSelector,
    enhancedSkillSelector,
    applySkillToAgent,
    getStyleInstructions
  };
}
