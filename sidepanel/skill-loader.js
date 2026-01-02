// ============================================
// MAV Agent Framework - Skill Loader
// Implements Anthropic Agent Skills standard
// ============================================

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
  }
  
  /**
   * Initialize loader - load all skill metadata
   * Called once at startup
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
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
            // Cache the full content for later
            _fullContent: skillContent
          });
        } catch (err) {
          console.warn(`Failed to parse skill ${skillId}:`, err);
        }
      }
      
      this.initialized = true;
      console.log(`SkillLoader initialized with ${this.metadataIndex.size} skills`);
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
    this.metadataIndex.delete(skillId);
    this.cache.delete(skillId);
    
    // Remove from chrome.storage
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

// Create global instance
const skillLoader = new SkillLoader();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVSkillLoader = {
    SkillLoader,
    skillLoader,
    parseSkillMd,
    parseSimpleYaml
  };
}

