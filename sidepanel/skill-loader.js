// ============================================
// MAV Agent Framework - Skill Loader
// Implements Anthropic Agent Skills standard
// ============================================

/**
 * LRU Cache for external skills
 * Manages storage quota with automatic eviction
 */
class SkillsLRUCache {
  constructor(maxSize = 10, storageKey = 'externalSkillsCache') {
    this.maxSize = maxSize;
    this.storageKey = storageKey;
    this.cache = new Map();
    this.accessOrder = [];
  }

  async initialize() {
    try {
      const stored = await chrome.storage.local.get(this.storageKey);
      if (stored[this.storageKey]) {
        const { entries, order } = stored[this.storageKey];
        for (const [key, value] of entries) {
          this.cache.set(key, value);
        }
        this.accessOrder = order || [];
      }
    } catch (err) {
      console.warn('Failed to load skills cache:', err);
    }
  }

  async get(key) {
    if (this.cache.has(key)) {
      // Update access order
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      this.accessOrder.push(key);
      await this._persist();
      return this.cache.get(key);
    }
    return null;
  }

  async set(key, value) {
    // Evict LRU if at capacity
    while (this.cache.size >= this.maxSize && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.shift();
      this.cache.delete(lruKey);
    }

    this.cache.set(key, value);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    await this._persist();
  }

  async delete(key) {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    await this._persist();
  }

  async _persist() {
    try {
      await chrome.storage.local.set({
        [this.storageKey]: {
          entries: Array.from(this.cache.entries()),
          order: this.accessOrder
        }
      });
    } catch (err) {
      console.warn('Failed to persist skills cache:', err);
    }
  }

  getAll() {
    return Array.from(this.cache.entries());
  }

  size() {
    return this.cache.size;
  }
}

/**
 * SkillsMP API Client
 * Fetches skills from skillsmp.com
 */
class SkillsmpClient {
  constructor() {
    this.baseUrl = 'https://skillsmp.com';
    this.apiBaseUrl = 'https://skillsmp.com/api';
  }

  /**
   * Search skills by query
   */
  async search(query, options = {}) {
    const { limit = 10, category = null } = options;
    try {
      const params = new URLSearchParams({ q: query, limit: limit.toString() });
      if (category) params.append('category', category);
      
      const response = await fetch(`${this.apiBaseUrl}/skills/search?${params}`);
      if (!response.ok) {
        throw new Error(`SkillsMP search failed: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('SkillsMP search failed:', err);
      return { skills: [], error: err.message };
    }
  }

  /**
   * Get skill content by slug
   */
  async getSkill(slug) {
    try {
      const response = await fetch(`${this.apiBaseUrl}/skills/${slug}`);
      if (!response.ok) {
        throw new Error(`SkillsMP fetch failed: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn('SkillsMP fetch failed:', err);
      return null;
    }
  }

  /**
   * Get raw SKILL.md content from GitHub
   */
  async fetchFromGitHub(repoPath) {
    // Parse repo path like "owner/repo/path/to/SKILL.md"
    const match = repoPath.match(/^([^\/]+)\/([^\/]+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid GitHub path format');
    }
    
    const [, owner, repo, path] = match;
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    
    try {
      const response = await fetch(rawUrl);
      if (!response.ok) {
        // Try master branch
        const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
        const masterResponse = await fetch(masterUrl);
        if (!masterResponse.ok) {
          throw new Error(`GitHub fetch failed: ${response.status}`);
        }
        return await masterResponse.text();
      }
      return await response.text();
    } catch (err) {
      console.warn('GitHub fetch failed:', err);
      throw err;
    }
  }
}

/**
 * YAML Frontmatter Parser
 * Parses SKILL.md files with YAML frontmatter
 */
function parseSkillMd(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter');
  }
  
  const yamlContent = match[1];
  const bodyContent = match[2];
  
  // Simple YAML parser for frontmatter
  const metadata = parseSimpleYaml(yamlContent);
  
  return {
    metadata,
    body: bodyContent.trim()
  };
}

/**
 * Simple YAML parser (handles basic key-value and nested objects)
 * Does not require external dependencies
 */
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let currentIndent = 0;
  let nestedObj = null;
  
  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) continue;
    
    // Detect indentation
    const indent = line.search(/\S/);
    const trimmedLine = line.trim();
    
    // Check for key-value pair
    const kvMatch = trimmedLine.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      
      if (indent === 0) {
        // Top-level key
        if (value === '' || value === null) {
          // Start of nested object
          currentKey = key;
          currentIndent = indent;
          nestedObj = {};
          result[key] = nestedObj;
        } else {
          // Simple value
          result[key] = parseYamlValue(value);
          currentKey = null;
          nestedObj = null;
        }
      } else if (nestedObj && indent > currentIndent) {
        // Nested key-value
        nestedObj[key] = parseYamlValue(value);
      }
    }
  }
  
  return result;
}

/**
 * Parse YAML value (handles strings, numbers, booleans, arrays)
 */
function parseYamlValue(value) {
  if (value === undefined || value === null || value === '') return null;
  
  // Remove quotes if present
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  
  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  
  // Number
  if (!isNaN(value) && value !== '') {
    return Number(value);
  }
  
  // Space-delimited list (for mav-tools, allowed-tools)
  if (value.includes(' ') && !value.includes(',')) {
    return value.split(/\s+/).filter(Boolean);
  }
  
  return value;
}

/**
 * Extract trigger keywords from skill body
 */
function extractTriggerKeywords(body) {
  const keywords = [];
  
  // Look for "When to Use" or similar sections
  const whenToUseMatch = body.match(/##\s*When to Use[\s\S]*?(?=##|$)/i);
  if (whenToUseMatch) {
    // Extract keywords from bullet points
    const bulletMatches = whenToUseMatch[0].matchAll(/[-*]\s*(.+)/g);
    for (const match of bulletMatches) {
      // Extract key terms
      const terms = match[1].match(/[\u4e00-\u9fa5a-zA-Z]+/g);
      if (terms) keywords.push(...terms);
    }
  }
  
  // Look for explicit trigger keywords section
  const triggerMatch = body.match(/##\s*Trigger Keywords[\s\S]*?(?=##|$)/i);
  if (triggerMatch) {
    const terms = triggerMatch[0].match(/`([^`]+)`/g);
    if (terms) {
      keywords.push(...terms.map(t => t.replace(/`/g, '')));
    }
  }
  
  return [...new Set(keywords)]; // Dedupe
}

/**
 * Build trigger function from keywords
 */
function buildTriggerFunction(keywords) {
  if (!keywords || keywords.length === 0) {
    return () => false;
  }
  
  // Create regex pattern from keywords
  const pattern = new RegExp(keywords.join('|'), 'i');
  return (query) => pattern.test(query);
}

/**
 * SkillLoader Class
 * Manages loading and caching of Agent Skills
 */
class SkillLoader {
  constructor(options = {}) {
    this.skillsPath = options.skillsPath || 'skills';
    this.cache = new Map(); // Cache loaded skills
    this.metadataIndex = new Map(); // name + description for all skills
    this.initialized = false;
    
    // External skills support
    this.externalCache = new SkillsLRUCache(options.maxExternalSkills || 10);
    this.skillsmpClient = new SkillsmpClient();
  }
  
  /**
   * Initialize loader - load all skill metadata
   * Called once at startup
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Initialize external skills cache
      await this.externalCache.initialize();
      
      // In Chrome Extension, we bundle skills as JSON
      // This will be populated during build or from chrome.storage
      const skillsData = await this._loadSkillsBundle();
      
      for (const [skillId, skillContent] of Object.entries(skillsData)) {
        try {
          const parsed = parseSkillMd(skillContent);
          
          // Store only metadata (Layer 1)
          this.metadataIndex.set(skillId, {
            id: skillId,
            name: parsed.metadata.name || skillId,
            description: parsed.metadata.description || '',
            metadata: parsed.metadata,
            source: parsed.metadata.metadata?.source || 'bundled',
            // Cache the full content for later
            _fullContent: skillContent
          });
        } catch (err) {
          console.warn(`Failed to parse skill ${skillId}:`, err);
        }
      }
      
      // Load external skills from cache
      const externalSkills = this.externalCache.getAll();
      for (const [skillId, skillData] of externalSkills) {
        try {
          const parsed = parseSkillMd(skillData.content);
          this.metadataIndex.set(skillId, {
            id: skillId,
            name: parsed.metadata.name || skillId,
            description: parsed.metadata.description || '',
            metadata: parsed.metadata,
            source: 'external',
            sourceUrl: skillData.sourceUrl,
            _fullContent: skillData.content
          });
        } catch (err) {
          console.warn(`Failed to parse external skill ${skillId}:`, err);
        }
      }
      
      this.initialized = true;
      console.log(`SkillLoader initialized with ${this.metadataIndex.size} skills (${externalSkills.length} external)`);
    } catch (err) {
      console.error('Failed to initialize SkillLoader:', err);
      this.initialized = true; // Mark as initialized even on error to prevent loops
    }
  }
  
  /**
   * Load skills bundle from chrome.storage or bundled JSON
   */
  async _loadSkillsBundle() {
    // Try chrome.storage first (for user-added skills)
    try {
      const stored = await chrome.storage.local.get('skillsBundle');
      if (stored.skillsBundle) {
        return stored.skillsBundle;
      }
    } catch (err) {
      // Not in extension context, fall through
    }
    
    // Return bundled skills (populated at build time or runtime)
    return window.BUNDLED_SKILLS || {};
  }
  
  /**
   * Get all skill metadata (for Planner routing)
   * Returns only name + description to minimize token usage
   */
  getAllMetadata() {
    const result = [];
    for (const [id, meta] of this.metadataIndex) {
      result.push({
        id,
        name: meta.name,
        description: meta.description
      });
    }
    return result;
  }
  
  /**
   * Load full skill instructions (Layer 2)
   * Called when a skill is selected
   */
  async loadInstructions(skillId) {
    // Check cache first
    if (this.cache.has(skillId)) {
      return this.cache.get(skillId);
    }
    
    const meta = this.metadataIndex.get(skillId);
    if (!meta) {
      throw new Error(`Skill not found: ${skillId}`);
    }
    
    // Parse full content
    const parsed = parseSkillMd(meta._fullContent);
    
    // Build skill object compatible with existing system
    const skill = this._buildSkillObject(skillId, parsed);
    
    // Cache it
    this.cache.set(skillId, skill);
    
    return skill;
  }
  
  /**
   * Build skill object compatible with existing SKILLS format
   */
  _buildSkillObject(skillId, parsed) {
    const { metadata, body } = parsed;
    
    // Extract trigger keywords from body
    const triggerKeywords = extractTriggerKeywords(body);
    
    // Build trigger function
    const triggerFn = buildTriggerFunction(triggerKeywords);
    
    // Extract preferred tools from metadata
    const mavTools = metadata.metadata?.['mav-tools'] || metadata['mav-tools'];
    const preferredTools = Array.isArray(mavTools) 
      ? mavTools 
      : (mavTools ? mavTools.split(/\s+/) : ['query_council', 'synthesize']);
    
    // Extract UI flags
    const mavUi = metadata.metadata?.['mav-ui'] || metadata['mav-ui'];
    
    // Build response style from metadata
    const responseStyle = {
      length: metadata.metadata?.['response-length'] || 'standard',
      format: metadata.metadata?.['response-format'] || 'mixed',
      citations: metadata.metadata?.citations === true || metadata.metadata?.citations === 'true'
    };
    
    return {
      id: skillId,
      name: metadata.name || skillId,
      description: metadata.description || '',
      icon: metadata.metadata?.icon || '📄',
      
      // Trigger function
      trigger: triggerFn,
      triggerKeywords, // Store for debugging
      
      // Planner guidance - use body as plannerHint
      plannerHint: this._extractPlannerHint(body),
      
      // Tool preferences
      preferredTools,
      
      // Execution limits
      maxIterations: metadata.metadata?.['max-iterations'] || 6,
      maxSearches: metadata.metadata?.['max-searches'] || 2,
      
      // Response style
      responseStyle,
      
      // UI flags
      showImageStyleSelector: mavUi === 'showImageStyleSelector',
      requireVisionModels: metadata.metadata?.['require-vision'] === true,
      
      // Store full instructions for potential injection
      instructions: body,
      
      // References paths (for Layer 3 loading)
      references: this._extractReferences(body),
      
      // Source flag
      _source: 'skill.md'
    };
  }
  
  /**
   * Extract planner hint from instructions body
   */
  _extractPlannerHint(body) {
    // Look for Instructions section
    const instructionsMatch = body.match(/##\s*Instructions[\s\S]*?(?=##|$)/i);
    if (instructionsMatch) {
      // Get the content, clean it up
      return instructionsMatch[0]
        .replace(/##\s*Instructions\s*/i, '')
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .join(' ');
    }
    
    // Fallback: use first 500 chars of body
    return body.slice(0, 500);
  }
  
  /**
   * Extract reference file paths from body
   */
  _extractReferences(body) {
    const refs = [];
    const refMatches = body.matchAll(/\[([^\]]+)\]\(references\/([^)]+)\)/g);
    for (const match of refMatches) {
      refs.push({
        name: match[1],
        path: `references/${match[2]}`
      });
    }
    return refs;
  }
  
  /**
   * Load a reference file (Layer 3)
   * Called on-demand when skill needs additional context
   */
  async loadReference(skillId, refPath) {
    const fullPath = `${this.skillsPath}/${skillId}/${refPath}`;
    
    // Try to load from bundle
    const bundleKey = `${skillId}/${refPath}`;
    const bundle = window.BUNDLED_SKILL_REFS || {};
    
    if (bundle[bundleKey]) {
      return bundle[bundleKey];
    }
    
    // Try chrome.storage
    try {
      const stored = await chrome.storage.local.get(`skillRef:${bundleKey}`);
      if (stored[`skillRef:${bundleKey}`]) {
        return stored[`skillRef:${bundleKey}`];
      }
    } catch (err) {
      // Not in extension context
    }
    
    throw new Error(`Reference not found: ${fullPath}`);
  }
  
  /**
   * Match skills for a query (for UI display)
   */
  matchSkills(query, settings = {}) {
    const matches = [];
    
    for (const [id, meta] of this.metadataIndex) {
      // Load full skill to access trigger
      const skill = this.cache.get(id);
      if (skill && skill.trigger(query, settings)) {
        matches.push(skill);
      }
    }
    
    return matches;
  }
  
  /**
   * Select best skill for a query
   */
  async selectSkill(query, settings = {}) {
    // Ensure all skills are loaded into cache
    for (const [id] of this.metadataIndex) {
      if (!this.cache.has(id)) {
        await this.loadInstructions(id);
      }
    }
    
    // Priority order for matching
    const priorityOrder = [
      'vision-analysis',
      'image-design',
      'fact-checker',
      'current-events',
      'technical',
      'researcher',
      'creative',
      'educator',
      'quick-answer'
    ];
    
    // Check educator first (settings-based)
    const educator = this.cache.get('educator');
    if (educator && settings.learnerMode && settings.learnerMode !== 'standard') {
      return educator;
    }
    
    // Check by priority
    for (const skillId of priorityOrder) {
      const skill = this.cache.get(skillId);
      if (skill && skill.trigger(query, settings)) {
        return skill;
      }
    }
    
    // Default to quick-answer
    return this.cache.get('quick-answer') || null;
  }
  
  /**
   * Add a skill at runtime (for user-defined skills)
   */
  async addSkill(skillId, content) {
    try {
      const parsed = parseSkillMd(content);
      
      // Store metadata
      this.metadataIndex.set(skillId, {
        id: skillId,
        name: parsed.metadata.name || skillId,
        description: parsed.metadata.description || '',
        metadata: parsed.metadata,
        _fullContent: content
      });
      
      // Clear cache to force reload
      this.cache.delete(skillId);
      
      // Persist to chrome.storage
      try {
        const stored = await chrome.storage.local.get('skillsBundle');
        const bundle = stored.skillsBundle || {};
        bundle[skillId] = content;
        await chrome.storage.local.set({ skillsBundle: bundle });
      } catch (err) {
        console.warn('Failed to persist skill:', err);
      }
      
      return true;
    } catch (err) {
      console.error('Failed to add skill:', err);
      return false;
    }
  }
  
  /**
   * Remove a skill
   */
  async removeSkill(skillId) {
    const meta = this.metadataIndex.get(skillId);
    this.metadataIndex.delete(skillId);
    this.cache.delete(skillId);
    
    // Remove from appropriate storage
    if (meta?.source === 'external') {
      await this.externalCache.delete(skillId);
    } else {
      try {
        const stored = await chrome.storage.local.get('skillsBundle');
        const bundle = stored.skillsBundle || {};
        delete bundle[skillId];
        await chrome.storage.local.set({ skillsBundle: bundle });
      } catch (err) {
        console.warn('Failed to remove skill from storage:', err);
      }
    }
  }

  // ============================================
  // External Skills Support
  // ============================================

  /**
   * Search skills from SkillsMP
   */
  async searchSkillsMP(query, options = {}) {
    return await this.skillsmpClient.search(query, options);
  }

  /**
   * Import skill from SkillsMP by slug
   */
  async importFromSkillsMP(slug) {
    try {
      const skillData = await this.skillsmpClient.getSkill(slug);
      if (!skillData || !skillData.content) {
        throw new Error('Skill not found or invalid');
      }
      
      const skillId = skillData.name || slug.split('-').pop();
      const parsed = parseSkillMd(skillData.content);
      
      // Store in external cache
      await this.externalCache.set(skillId, {
        content: skillData.content,
        sourceUrl: `https://skillsmp.com/skills/${slug}`,
        importedAt: Date.now()
      });
      
      // Add to metadata index
      this.metadataIndex.set(skillId, {
        id: skillId,
        name: parsed.metadata.name || skillId,
        description: parsed.metadata.description || '',
        metadata: parsed.metadata,
        source: 'external',
        sourceUrl: `https://skillsmp.com/skills/${slug}`,
        _fullContent: skillData.content
      });
      
      // Clear cache to force reload
      this.cache.delete(skillId);
      
      return { success: true, skillId, name: parsed.metadata.name };
    } catch (err) {
      console.error('Failed to import from SkillsMP:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Import skill from GitHub repository
   * @param {string} repoPath - Format: "owner/repo/path/to/SKILL.md"
   */
  async importFromGitHub(repoPath) {
    try {
      const content = await this.skillsmpClient.fetchFromGitHub(repoPath);
      const parsed = parseSkillMd(content);
      
      // Generate skill ID from path
      const skillId = repoPath.split('/').slice(-2, -1)[0] || 
                      parsed.metadata.name || 
                      `github-${Date.now()}`;
      
      // Store in external cache
      await this.externalCache.set(skillId, {
        content,
        sourceUrl: `https://github.com/${repoPath.split('/').slice(0, 2).join('/')}`,
        repoPath,
        importedAt: Date.now()
      });
      
      // Add to metadata index
      this.metadataIndex.set(skillId, {
        id: skillId,
        name: parsed.metadata.name || skillId,
        description: parsed.metadata.description || '',
        metadata: parsed.metadata,
        source: 'external',
        sourceUrl: `https://github.com/${repoPath.split('/').slice(0, 2).join('/')}`,
        _fullContent: content
      });
      
      // Clear cache to force reload
      this.cache.delete(skillId);
      
      return { success: true, skillId, name: parsed.metadata.name };
    } catch (err) {
      console.error('Failed to import from GitHub:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Import skill from raw SKILL.md content
   */
  async importFromContent(content, options = {}) {
    try {
      const parsed = parseSkillMd(content);
      const skillId = options.skillId || parsed.metadata.name || `custom-${Date.now()}`;
      
      // Store in external cache
      await this.externalCache.set(skillId, {
        content,
        sourceUrl: options.sourceUrl || 'custom',
        importedAt: Date.now()
      });
      
      // Add to metadata index
      this.metadataIndex.set(skillId, {
        id: skillId,
        name: parsed.metadata.name || skillId,
        description: parsed.metadata.description || '',
        metadata: parsed.metadata,
        source: 'external',
        sourceUrl: options.sourceUrl || 'custom',
        _fullContent: content
      });
      
      // Clear cache to force reload
      this.cache.delete(skillId);
      
      return { success: true, skillId, name: parsed.metadata.name };
    } catch (err) {
      console.error('Failed to import skill:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get all external skills
   */
  getExternalSkills() {
    const external = [];
    for (const [id, meta] of this.metadataIndex) {
      if (meta.source === 'external' || meta.metadata?.source === 'skillsmp') {
        external.push({
          id,
          name: meta.name,
          description: meta.description,
          sourceUrl: meta.sourceUrl || meta.metadata?.source_url
        });
      }
    }
    return external;
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      
      return {
        used: bytesInUse,
        quota,
        percentage: Math.round((bytesInUse / quota) * 100),
        externalSkillsCount: this.externalCache.size(),
        totalSkillsCount: this.metadataIndex.size
      };
    } catch (err) {
      return {
        used: 0,
        quota: 10485760,
        percentage: 0,
        externalSkillsCount: this.externalCache.size(),
        totalSkillsCount: this.metadataIndex.size,
        error: err.message
      };
    }
  }
}

// Create global instance
const skillLoader = new SkillLoader();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVSkillLoader = {
    SkillLoader,
    SkillsLRUCache,
    SkillsmpClient,
    skillLoader,
    parseSkillMd,
    parseSimpleYaml
  };
}


