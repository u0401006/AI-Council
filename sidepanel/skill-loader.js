// ============================================
// Translation-Focus: Skill Loader (Stub)
// Dynamic skill loading removed — only bundled translation skills
// ============================================

class SkillLoader {
  constructor() {
    this.initialized = false;
  }
  async initialize() { this.initialized = true; }
  getAllMetadata() { return []; }
  async loadInstructions(_id) { return null; }
  async loadReference() { throw new Error('Not available'); }
  matchSkills() { return []; }
  async selectSkill() { return null; }
  async addSkill() { return false; }
  async removeSkill() {}
  async searchSkillsMP() { return { skills: [] }; }
  async importFromSkillsMP() { return { success: false, error: 'Disabled' }; }
  async importFromGitHub() { return { success: false, error: 'Disabled' }; }
  async importFromContent() { return { success: false, error: 'Disabled' }; }
  getExternalSkills() { return []; }
  async getStorageStats() { return { used: 0, quota: 0, percentage: 0, externalSkillsCount: 0, totalSkillsCount: 0 }; }
}

function parseSkillMd(content) { return { metadata: {}, body: content }; }
function parseSimpleYaml(yaml) { return {}; }

const skillLoader = new SkillLoader();

if (typeof window !== 'undefined') {
  window.MAVSkillLoader = {
    SkillLoader,
    SkillsLRUCache: class { constructor() {} async initialize() {} },
    SkillsmpClient: class { constructor() {} },
    skillLoader,
    parseSkillMd,
    parseSimpleYaml
  };
}
