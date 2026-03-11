// ============================================
// Translation-Focus: Orchestrator (Simplified)
// Removed: LLM-based task analysis, heterogeneous/mixed strategies
// Always homogeneous — all models translate the same text
// ============================================

const ASSIGNMENT_STRATEGY = {
  HOMOGENEOUS: 'homogeneous'
};

class TaskAnalysis {
  constructor(data = {}) {
    this.complexity = data.complexity || 'medium';
    this.suggestedStrategy = ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    this.suggestedSkills = data.suggestedSkills || ['translatorSingle'];
    this.subtasks = data.subtasks || [];
    this.rationale = data.rationale || '翻譯任務：所有模型執行相同翻譯';
  }
}

class AssignmentPlan {
  constructor(data = {}) {
    this.strategy = ASSIGNMENT_STRATEGY.HOMOGENEOUS;
    this.assignments = data.assignments || [];
    this.rationale = data.rationale || '';
    this.createdAt = Date.now();
    this.chairmanModel = data.chairmanModel || null;
  }

  validate() {
    const errors = [];
    const totalWeight = this.assignments.reduce((sum, a) => sum + (a.weight || 0), 0);
    if (this.assignments.length > 0 && Math.abs(totalWeight - 1.0) > 0.1) {
      errors.push(`任務權重總和應為 1.0，目前為 ${totalWeight.toFixed(2)}`);
    }
    return { valid: errors.length === 0, errors };
  }

  getTaskGroups() {
    const groups = new Map();
    for (const a of this.assignments) {
      if (!groups.has(a.task)) groups.set(a.task, []);
      groups.get(a.task).push(a);
    }
    return groups;
  }

  isHomogeneous() { return true; }
}

class Orchestrator {
  constructor(config = {}) {
    this.chairmanModel = config.chairmanModel || null;
    this.availableModels = config.availableModels || [];
    this.chairmanHistory = [];
    this.maxChairmanTerms = 3;
  }

  setChairman(model) { this.chairmanModel = model; }
  setAvailableModels(models) { this.availableModels = models; }
  setQueryFunction(_fn) { /* no-op */ }
  setSkillMetadata(_meta) { /* no-op */ }

  async analyzeTask(_query, _context = {}) {
    return new TaskAnalysis();
  }

  async createAssignmentPlan(analysis, models = null) {
    const availableModels = models || this.availableModels;
    if (availableModels.length === 0) throw new Error('No models available');

    const plan = new AssignmentPlan({ chairmanModel: this.chairmanModel });
    const task = '翻譯用戶文本';
    const weightPerModel = 1.0 / availableModels.length;

    for (const model of availableModels) {
      plan.assignments.push({
        model,
        skill: analysis.suggestedSkills[0] || 'translatorSingle',
        task,
        weight: weightPerModel
      });
    }
    plan.rationale = '同質翻譯：所有模型獨立翻譯同一文本';
    return plan;
  }

  promoteToChairman(winnerModel) {
    const consecutive = this._countConsecutiveTerms(winnerModel);
    if (consecutive >= this.maxChairmanTerms) {
      const alt = this.availableModels.find(m => m !== winnerModel) || winnerModel;
      this.chairmanHistory.push(alt);
      this.chairmanModel = alt;
      return alt;
    }
    this.chairmanHistory.push(winnerModel);
    this.chairmanModel = winnerModel;
    return winnerModel;
  }

  _countConsecutiveTerms(model) {
    let c = 0;
    for (let i = this.chairmanHistory.length - 1; i >= 0; i--) {
      if (this.chairmanHistory[i] === model) c++; else break;
    }
    return c;
  }

  getChairman() { return this.chairmanModel; }
  getChairmanHistory() { return [...this.chairmanHistory]; }
  resetHistory() { this.chairmanHistory = []; }
}

if (typeof window !== 'undefined') {
  window.MAVOrchestrator = {
    ASSIGNMENT_STRATEGY,
    TaskAnalysis,
    AssignmentPlan,
    Orchestrator
  };
}
