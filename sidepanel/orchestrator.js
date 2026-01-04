// ============================================
// MAV Agent Framework - Orchestrator Module
// Multi-Agent Task Orchestration
// ============================================

/**
 * Assignment Strategy Types
 */
const ASSIGNMENT_STRATEGY = {
  HOMOGENEOUS: 'homogeneous',   // All models same skill, same task
  HETEROGENEOUS: 'heterogeneous', // Different models different skills/tasks
  MIXED: 'mixed'                // Some same, some different
};

/**
 * Task Analysis Result
 */
class TaskAnalysis {
  constructor(data = {}) {
    this.complexity = data.complexity || 'medium'; // low, medium, high
    this.requiresFactCheck = data.requiresFactCheck || false;
    this.requiresCreativity = data.requiresCreativity || false;
    this.requiresResearch = data.requiresResearch || false;
    this.requiresCurrentInfo = data.requiresCurrentInfo || false;
    this.requiresVision = data.requiresVision || false;
    this.suggestedStrategy = data.suggestedStrategy || ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    this.suggestedSkills = data.suggestedSkills || ['quick-answer'];
    this.subtasks = data.subtasks || [];
    this.rationale = data.rationale || '';
  }
}

/**
 * Assignment Plan - defines how tasks are distributed to models
 */
class AssignmentPlan {
  constructor(data = {}) {
    this.strategy = data.strategy || ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    this.assignments = data.assignments || [];
    this.rationale = data.rationale || '';
    this.createdAt = Date.now();
    this.chairmanModel = data.chairmanModel || null;
  }
  
  /**
   * Validate plan against rules
   */
  validate() {
    const errors = [];
    
    // Rule 1: At least 2 models must have same task (for cross-validation)
    const taskGroups = new Map();
    for (const a of this.assignments) {
      const key = a.task;
      if (!taskGroups.has(key)) taskGroups.set(key, []);
      taskGroups.get(key).push(a.model);
    }
    
    const hasValidationPair = Array.from(taskGroups.values()).some(models => models.length >= 2);
    if (!hasValidationPair && this.assignments.length > 1) {
      errors.push('至少需要 2 個模型執行相同任務以確保互相驗證');
    }
    
    // Rule 2: Maximum 3 different skills
    const uniqueSkills = new Set(this.assignments.map(a => a.skill));
    if (uniqueSkills.size > 3) {
      errors.push('最多只能使用 3 種不同的 skill，避免過度分散');
    }
    
    // Rule 3: Total weight should be ~1.0
    const totalWeight = this.assignments.reduce((sum, a) => sum + (a.weight || 0), 0);
    if (Math.abs(totalWeight - 1.0) > 0.1) {
      errors.push(`任務權重總和應為 1.0，目前為 ${totalWeight.toFixed(2)}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get assignments grouped by task
   */
  getTaskGroups() {
    const groups = new Map();
    for (const a of this.assignments) {
      if (!groups.has(a.task)) {
        groups.set(a.task, []);
      }
      groups.get(a.task).push(a);
    }
    return groups;
  }
  
  /**
   * Check if this is a homogeneous plan (all same task)
   */
  isHomogeneous() {
    if (this.assignments.length <= 1) return true;
    const firstTask = this.assignments[0].task;
    return this.assignments.every(a => a.task === firstTask);
  }
}

/**
 * System prompt for Chairman task analysis
 */
const TASK_ANALYSIS_SYSTEM = `你是 AI Council 的 Chairman，負責分析用戶問題並決定最佳的任務分配策略。

## 你的職責
1. 分析問題的複雜度和需求
2. 決定是否需要分工（異質任務）或統一執行（同質任務）
3. 為每個子任務分配適合的 skill

## 可用的 Skills
- researcher: 深度研究、多方資料比對
- fact-checker: 驗證資訊真偽、查核事實
- creative: 腦力激盪、創意發想
- technical: 程式碼、技術問題
- current-events: 新聞、時事、即時資訊
- quick-answer: 簡單直接的問題

## 分配策略
- homogeneous: 所有模型執行相同任務（適合需要多角度驗證的問題）
- heterogeneous: 不同模型執行不同任務（適合複雜多面向問題）
- mixed: 部分相同、部分不同（適合需要深度驗證+補充觀點的問題）

## 核心原則
- 至少 2 個模型執行相同任務（確保互相驗證）
- 最多 3 種不同 skill（避免過度分散）
- 異質任務必須互補（禁止完全無關的任務組合）

## 輸出格式
必須輸出有效的 JSON：
\`\`\`json
{
  "complexity": "low|medium|high",
  "requiresFactCheck": boolean,
  "requiresCreativity": boolean,
  "requiresResearch": boolean,
  "requiresCurrentInfo": boolean,
  "suggestedStrategy": "homogeneous|heterogeneous|mixed",
  "suggestedSkills": ["skill1", "skill2"],
  "subtasks": [
    { "description": "子任務描述", "skill": "適用skill", "weight": 0.4 }
  ],
  "rationale": "分析理由（一句話）"
}
\`\`\``;

/**
 * Orchestrator Class
 * Manages Chairman's task analysis and assignment logic
 */
class Orchestrator {
  constructor(config = {}) {
    this.chairmanModel = config.chairmanModel || null;
    this.availableModels = config.availableModels || [];
    this.queryModelFn = config.queryModelFn || null;
    this.skillMetadata = config.skillMetadata || [];
    
    // Chairman history for rotation
    this.chairmanHistory = [];
    this.maxChairmanTerms = 3; // Maximum consecutive terms
  }
  
  /**
   * Set the Chairman model
   */
  setChairman(model) {
    this.chairmanModel = model;
  }
  
  /**
   * Set available council models
   */
  setAvailableModels(models) {
    this.availableModels = models;
  }
  
  /**
   * Set the query function for LLM calls
   */
  setQueryFunction(fn) {
    this.queryModelFn = fn;
  }
  
  /**
   * Set skill metadata for informed decisions
   */
  setSkillMetadata(metadata) {
    this.skillMetadata = metadata;
  }
  
  /**
   * Analyze task complexity and requirements
   * @param {string} query - User's question
   * @param {Object} context - Additional context (visionMode, etc.)
   */
  async analyzeTask(query, context = {}) {
    console.log('[Orchestrator] Analyzing task:', query.substring(0, 50) + '...', { context });
    
    // If no Chairman model or query function, use rule-based analysis
    if (!this.chairmanModel || !this.queryModelFn) {
      console.log('[Orchestrator] No Chairman model, using rule-based analysis');
      const analysis = this._ruleBasedAnalysis(query, context);
      console.log('[Orchestrator] Rule-based analysis result:', analysis);
      return analysis;
    }
    
    try {
      console.log('[Orchestrator] Using LLM analysis with Chairman:', this.chairmanModel);
      const userPrompt = `分析以下用戶問題，決定最佳的任務分配策略：

## 用戶問題
${query}

## 上下文
- Vision 模式: ${context.visionMode ? '是（已上傳圖片）' : '否'}
- 可用模型數量: ${this.availableModels.length}

請分析並輸出 JSON 格式的任務分配建議。`;

      const response = await this.queryModelFn(
        this.chairmanModel,
        TASK_ANALYSIS_SYSTEM,
        userPrompt
      );
      
      // Parse response
      const analysis = this._parseAnalysisResponse(response);
      console.log('[Orchestrator] LLM analysis result:', analysis);
      
      // Apply rule constraints
      return this._applyRuleConstraints(analysis, context);
      
    } catch (err) {
      console.warn('[Orchestrator] Chairman analysis failed, using rule-based:', err);
      return this._ruleBasedAnalysis(query, context);
    }
  }
  
  /**
   * Parse Chairman's analysis response
   */
  _parseAnalysisResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/```json\s*([\s\S]*?)```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : response;
      
      // Try to find JSON object
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) {
        jsonStr = objMatch[0];
      }
      
      const data = JSON.parse(jsonStr);
      return new TaskAnalysis(data);
      
    } catch (err) {
      console.warn('Failed to parse analysis response:', err);
      return new TaskAnalysis();
    }
  }
  
  /**
   * Rule-based task analysis (fallback)
   */
  _ruleBasedAnalysis(query, context = {}) {
    const analysis = new TaskAnalysis();
    
    // Detect complexity based on query length and keywords
    if (query.length < 50) {
      analysis.complexity = 'low';
    } else if (query.length > 200 || /分析|比較|研究|詳細|深入/.test(query)) {
      analysis.complexity = 'high';
    } else {
      analysis.complexity = 'medium';
    }
    
    // Detect requirements
    analysis.requiresFactCheck = /真的嗎|是否|確認|查證|驗證|正確/.test(query);
    analysis.requiresCreativity = /想法|創意|點子|建議|方案|怎麼辦/.test(query);
    analysis.requiresResearch = /研究|分析|比較|調查|評估|探討/.test(query);
    analysis.requiresCurrentInfo = /最新|現在|今天|最近|新聞|時事/.test(query);
    analysis.requiresVision = context.visionMode === true;
    
    // Determine strategy
    const needsMultipleSkills = [
      analysis.requiresFactCheck,
      analysis.requiresCreativity,
      analysis.requiresResearch,
      analysis.requiresCurrentInfo
    ].filter(Boolean).length >= 2;
    
    if (analysis.complexity === 'high' && needsMultipleSkills) {
      analysis.suggestedStrategy = ASSIGNMENT_STRATEGY.MIXED;
    } else if (analysis.complexity === 'low') {
      analysis.suggestedStrategy = ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    } else {
      analysis.suggestedStrategy = ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    }
    
    // Suggest skills
    if (analysis.requiresVision) {
      analysis.suggestedSkills = ['vision-analysis'];
    } else if (analysis.requiresFactCheck) {
      analysis.suggestedSkills = ['fact-checker', 'researcher'];
    } else if (analysis.requiresCurrentInfo) {
      analysis.suggestedSkills = ['current-events'];
    } else if (analysis.requiresResearch) {
      analysis.suggestedSkills = ['researcher'];
    } else if (analysis.requiresCreativity) {
      analysis.suggestedSkills = ['creative'];
    } else if (analysis.complexity === 'low') {
      analysis.suggestedSkills = ['quick-answer'];
    } else {
      analysis.suggestedSkills = ['researcher'];
    }
    
    analysis.rationale = `基於規則分析：複雜度 ${analysis.complexity}`;
    
    return analysis;
  }
  
  /**
   * Apply rule constraints to analysis
   */
  _applyRuleConstraints(analysis, context) {
    // Ensure at least one skill is suggested
    if (!analysis.suggestedSkills || analysis.suggestedSkills.length === 0) {
      analysis.suggestedSkills = ['quick-answer'];
    }
    
    // Limit to 3 skills max
    if (analysis.suggestedSkills.length > 3) {
      analysis.suggestedSkills = analysis.suggestedSkills.slice(0, 3);
    }
    
    // Vision mode override
    if (context.visionMode && !analysis.suggestedSkills.includes('vision-analysis')) {
      analysis.suggestedSkills.unshift('vision-analysis');
      if (analysis.suggestedSkills.length > 3) {
        analysis.suggestedSkills = analysis.suggestedSkills.slice(0, 3);
      }
    }
    
    return analysis;
  }
  
  /**
   * Create assignment plan based on analysis
   * @param {TaskAnalysis} analysis - Task analysis result
   * @param {Array} models - Available models to assign
   */
  async createAssignmentPlan(analysis, models = null) {
    const availableModels = models || this.availableModels;
    
    console.log('[Orchestrator] Creating assignment plan:', {
      strategy: analysis.suggestedStrategy,
      skills: analysis.suggestedSkills,
      modelsCount: availableModels.length
    });
    
    if (availableModels.length === 0) {
      throw new Error('No models available for assignment');
    }
    
    const plan = new AssignmentPlan({
      strategy: analysis.suggestedStrategy,
      chairmanModel: this.chairmanModel
    });
    
    switch (analysis.suggestedStrategy) {
      case ASSIGNMENT_STRATEGY.HOMOGENEOUS:
        this._createHomogeneousPlan(plan, analysis, availableModels);
        break;
        
      case ASSIGNMENT_STRATEGY.HETEROGENEOUS:
        this._createHeterogeneousPlan(plan, analysis, availableModels);
        break;
        
      case ASSIGNMENT_STRATEGY.MIXED:
        this._createMixedPlan(plan, analysis, availableModels);
        break;
        
      default:
        this._createHomogeneousPlan(plan, analysis, availableModels);
    }
    
    // Validate and fix if needed
    const validation = plan.validate();
    if (!validation.valid) {
      console.warn('[Orchestrator] Plan validation issues:', validation.errors);
      this._fixPlanIssues(plan, validation.errors, availableModels);
    }
    
    plan.rationale = analysis.rationale || `使用 ${plan.strategy} 策略`;
    
    console.log('[Orchestrator] Assignment plan created:', {
      strategy: plan.strategy,
      assignments: plan.assignments.map(a => ({
        model: a.model,
        skill: a.skill,
        task: a.task.substring(0, 30) + '...',
        weight: a.weight
      })),
      rationale: plan.rationale
    });
    
    return plan;
  }
  
  /**
   * Create homogeneous plan - all models same task
   */
  _createHomogeneousPlan(plan, analysis, models) {
    const skill = analysis.suggestedSkills[0] || 'quick-answer';
    const task = analysis.subtasks[0]?.description || '回答用戶問題';
    const weightPerModel = 1.0 / models.length;
    
    for (const model of models) {
      plan.assignments.push({
        model,
        skill,
        task,
        weight: weightPerModel
      });
    }
  }
  
  /**
   * Create heterogeneous plan - different tasks for different models
   */
  _createHeterogeneousPlan(plan, analysis, models) {
    const skills = analysis.suggestedSkills;
    const subtasks = analysis.subtasks.length > 0 
      ? analysis.subtasks 
      : skills.map((s, i) => ({
          description: `使用 ${s} 技能處理問題`,
          skill: s,
          weight: 1.0 / skills.length
        }));
    
    // Ensure at least 2 models get same task (for validation)
    if (models.length >= 2 && subtasks.length > 1) {
      // First two models get the primary task
      const primaryTask = subtasks[0];
      plan.assignments.push({
        model: models[0],
        skill: primaryTask.skill,
        task: primaryTask.description,
        weight: primaryTask.weight * 0.5
      });
      plan.assignments.push({
        model: models[1],
        skill: primaryTask.skill,
        task: primaryTask.description,
        weight: primaryTask.weight * 0.5
      });
      
      // Remaining models get other tasks
      for (let i = 2; i < models.length; i++) {
        const taskIdx = Math.min(i - 1, subtasks.length - 1);
        const task = subtasks[taskIdx];
        plan.assignments.push({
          model: models[i],
          skill: task.skill,
          task: task.description,
          weight: task.weight
        });
      }
    } else {
      // Not enough models, fall back to homogeneous
      this._createHomogeneousPlan(plan, analysis, models);
    }
  }
  
  /**
   * Create mixed plan - some same, some different
   */
  _createMixedPlan(plan, analysis, models) {
    if (models.length < 3) {
      // Not enough for mixed, use homogeneous
      this._createHomogeneousPlan(plan, analysis, models);
      return;
    }
    
    const primarySkill = analysis.suggestedSkills[0] || 'researcher';
    const secondarySkill = analysis.suggestedSkills[1] || primarySkill;
    
    // 2/3 of models get primary task, 1/3 get secondary
    const primaryCount = Math.max(2, Math.ceil(models.length * 0.67));
    const primaryWeight = 0.7 / primaryCount;
    const secondaryWeight = 0.3 / (models.length - primaryCount);
    
    for (let i = 0; i < models.length; i++) {
      if (i < primaryCount) {
        plan.assignments.push({
          model: models[i],
          skill: primarySkill,
          task: analysis.subtasks[0]?.description || '主要任務',
          weight: primaryWeight
        });
      } else {
        plan.assignments.push({
          model: models[i],
          skill: secondarySkill,
          task: analysis.subtasks[1]?.description || '補充任務',
          weight: secondaryWeight
        });
      }
    }
  }
  
  /**
   * Fix plan issues to meet constraints
   */
  _fixPlanIssues(plan, errors, models) {
    // Fix weight issues
    const totalWeight = plan.assignments.reduce((sum, a) => sum + a.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.1) {
      const factor = 1.0 / totalWeight;
      for (const a of plan.assignments) {
        a.weight *= factor;
      }
    }
    
    // Ensure at least 2 models have same task
    const taskGroups = plan.getTaskGroups();
    const hasValidPair = Array.from(taskGroups.values()).some(group => group.length >= 2);
    
    if (!hasValidPair && plan.assignments.length >= 2) {
      // Make first two assignments have the same task
      plan.assignments[1].task = plan.assignments[0].task;
      plan.assignments[1].skill = plan.assignments[0].skill;
    }
  }
  
  /**
   * Promote round winner to Chairman
   * @param {string} winnerModel - The model that won peer review
   */
  promoteToChairman(winnerModel) {
    console.log('[Orchestrator] Promoting winner to Chairman:', winnerModel);
    
    // Check if winner has served too many consecutive terms
    const consecutiveTerms = this._countConsecutiveTerms(winnerModel);
    if (consecutiveTerms >= this.maxChairmanTerms) {
      console.log(`[Orchestrator] ${winnerModel} has served ${consecutiveTerms} terms, selecting alternative`);
      const alternative = this._selectAlternativeChairman(winnerModel);
      console.log('[Orchestrator] Alternative Chairman selected:', alternative);
      return alternative;
    }
    
    this.chairmanHistory.push(winnerModel);
    this.chairmanModel = winnerModel;
    console.log('[Orchestrator] New Chairman:', winnerModel, 'History:', this.chairmanHistory);
    return winnerModel;
  }
  
  /**
   * Count consecutive terms for a model
   */
  _countConsecutiveTerms(model) {
    let count = 0;
    for (let i = this.chairmanHistory.length - 1; i >= 0; i--) {
      if (this.chairmanHistory[i] === model) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }
  
  /**
   * Select alternative Chairman when winner has maxed out terms
   */
  _selectAlternativeChairman(excludeModel) {
    // Pick from available models, excluding the one that maxed out
    const candidates = this.availableModels.filter(m => m !== excludeModel);
    if (candidates.length === 0) {
      // No choice, use the excluded one anyway
      return excludeModel;
    }
    
    // Prefer models that haven't been Chairman recently
    const recentChairmen = new Set(this.chairmanHistory.slice(-5));
    const freshCandidates = candidates.filter(m => !recentChairmen.has(m));
    
    if (freshCandidates.length > 0) {
      return freshCandidates[0];
    }
    
    return candidates[0];
  }
  
  /**
   * Get current Chairman
   */
  getChairman() {
    return this.chairmanModel;
  }
  
  /**
   * Get Chairman history
   */
  getChairmanHistory() {
    return [...this.chairmanHistory];
  }
  
  /**
   * Reset Chairman history (for new session)
   */
  resetHistory() {
    this.chairmanHistory = [];
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVOrchestrator = {
    ASSIGNMENT_STRATEGY,
    TaskAnalysis,
    AssignmentPlan,
    Orchestrator
  };
}

