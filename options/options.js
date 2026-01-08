// Default fallback models (if API fetch fails) - Top 3 per major provider
const DEFAULT_AVAILABLE_MODELS = [
  // OpenAI - Top 3
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', canVision: true },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', canVision: true },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', canVision: true },
  // Anthropic - Top 3
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic', canVision: true },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', canVision: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', canVision: true },
  // Google - Top 3
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google', canVision: true },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', canVision: true },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', canVision: true },
  // xAI - Top 3
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI', canVision: true },
  { id: 'x-ai/grok-2-vision-1212', name: 'Grok 2 Vision', provider: 'xAI', canVision: true },
  { id: 'x-ai/grok-2-1212', name: 'Grok 2', provider: 'xAI', canVision: true },
  // Meta - Top 3
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta' }
];

// Runtime available models (loaded from storage or API)
let AVAILABLE_MODELS = [];

const DEFAULT_MODELS = [
  'openai/gpt-5.1',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-flash'
];

const DEFAULT_CHAIRMAN = 'anthropic/claude-sonnet-4.5';

// Language-specific default prompts
function getDefaultReviewPrompt(language) {
  const langInstruction = i18n.t('ai.languageInstruction');
  const langName = i18n.t('ai.languageName');
  
  return `You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

${langInstruction}

## User's Question
{query}

## Responses to Evaluate
{responses}

## Your Task
Rank these responses from best to worst. Output in this exact JSON format:
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "Brief reason in ${langName}"},
    {"response": "B", "rank": 2, "reason": "Brief reason in ${langName}"}
  ]
}
\`\`\`

Be objective. Focus on factual accuracy and helpfulness. Write all reasons in ${langName}.`;
}

function getDefaultChairmanPrompt(language) {
  const langInstruction = i18n.t('ai.languageInstruction');
  const langName = i18n.t('ai.languageName');
  
  return `You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

${langInstruction}

## User's Question
{query}

## Expert Responses
{responses}

{ranking}

## Your Task
Create a single authoritative answer that:
1. Incorporates the best insights from all experts
2. Resolves contradictions by favoring accurate information
3. Is well-organized and comprehensive
4. When referencing context/search results, use citation markers like [1], [2] to indicate sources

Provide your answer directly in ${langName}, without meta-commentary.`;
}

// Default output style settings
const DEFAULT_OUTPUT_LENGTH = 'standard';
const DEFAULT_OUTPUT_FORMAT = 'mixed';

// DOM Elements
const languageSelect = document.getElementById('language');
const apiKeyInput = document.getElementById('apiKey');
const braveApiKeyInput = document.getElementById('braveApiKey');
const modelListEl = document.getElementById('modelList');
const chairmanSelect = document.getElementById('chairmanModel');
const plannerSelect = document.getElementById('plannerModel');
const enableReviewCheckbox = document.getElementById('enableReview');
const maxSearchIterationsSelect = document.getElementById('maxSearchIterations');
const maxCardDepthSelect = document.getElementById('maxCardDepth');
const reviewPromptTextarea = document.getElementById('reviewPrompt');
const chairmanPromptTextarea = document.getElementById('chairmanPrompt');
const resetPromptsBtn = document.getElementById('resetPromptsBtn');
const updateModelsBtn = document.getElementById('updateModelsBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// Output style radio groups
const outputLengthRadios = document.querySelectorAll('input[name="outputLength"]');
const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');

// Learner mode radio group
const learnerModeRadios = document.querySelectorAll('input[name="learnerMode"]');

// Prompt section element
const promptSection = document.getElementById('promptSection');

// Skills management elements
const browseSkillsBtn = document.getElementById('browseSkillsBtn');
const skillsStorageInfo = document.getElementById('skillsStorageInfo');
const installedSkillsList = document.getElementById('installedSkillsList');
const skillImportUrl = document.getElementById('skillImportUrl');
const importSkillBtn = document.getElementById('importSkillBtn');

// Initialize
async function init() {
  // Initialize i18n first
  await i18n.init();
  
  await loadAvailableModels();
  renderModelList();
  renderChairmanSelect();
  renderPlannerSelect();
  await loadSettings();
  
  saveBtn.addEventListener('click', saveSettings);
  resetPromptsBtn.addEventListener('click', resetPrompts);
  updateModelsBtn.addEventListener('click', updateModelsFromOpenRouter);
  
  // Skills management handlers
  if (browseSkillsBtn) browseSkillsBtn.addEventListener('click', () => window.open('https://skillsmp.com', '_blank'));
  if (importSkillBtn) importSkillBtn.addEventListener('click', importSkill);
  
  // Initialize skills management
  await initSkillsManagement();
  
  // Language change handler
  languageSelect.addEventListener('change', handleLanguageChange);
  
  // Learner mode change handler
  learnerModeRadios.forEach(radio => {
    radio.addEventListener('change', handleLearnerModeChange);
  });
}

// Handle language change
async function handleLanguageChange() {
  const newLanguage = languageSelect.value;
  await i18n.setLocale(newLanguage);
  
  // Re-render dynamic content
  renderChairmanSelect();
  renderPlannerSelect();
  handleLearnerModeChange();
  
  // Update document title
  document.title = t('options.pageTitle');
}

// Handle learner mode change - toggle prompt section visibility
function handleLearnerModeChange() {
  const selectedMode = document.querySelector('input[name="learnerMode"]:checked')?.value || 'standard';
  const isLearnerMode = selectedMode !== 'standard';
  
  if (promptSection) {
    promptSection.style.opacity = isLearnerMode ? '0.5' : '1';
    promptSection.style.pointerEvents = isLearnerMode ? 'none' : 'auto';
    
    // Add or remove a visual indicator
    const existingNote = promptSection.querySelector('.learner-mode-note');
    if (isLearnerMode && !existingNote) {
      const note = document.createElement('p');
      note.className = 'hint learner-mode-note';
      note.style.color = 'var(--warning, #f59e0b)';
      note.textContent = t('options.learnerModeNote', { mode: selectedMode });
      promptSection.querySelector('.section-header').after(note);
    } else if (!isLearnerMode && existingNote) {
      existingNote.remove();
    } else if (isLearnerMode && existingNote) {
      existingNote.textContent = t('options.learnerModeNote', { mode: selectedMode });
    }
  }
}

function renderModelList() {
  modelListEl.innerHTML = AVAILABLE_MODELS.map(model => {
    const badges = [];
    if (model.canVision) badges.push('<span class="vision-badge">VIS</span>');
    if (model.canImage) badges.push('<span class="image-badge">IMG</span>');
    
    // Format pricing info
    let pricingInfo = '';
    if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
      const input = model.inputPrice.toFixed(2);
      const output = model.outputPrice.toFixed(2);
      pricingInfo = `<span class="model-pricing">$${input}/$${output}</span>`;
    }
    
    return `
    <label class="model-item">
      <input type="checkbox" value="${model.id}" data-model>
      <span class="model-name">${model.name}${badges.join('')}</span>
      <span class="model-provider">${model.provider}${pricingInfo}</span>
    </label>
  `;
  }).join('');
}

function renderChairmanSelect() {
  const reviewWinnerText = t('options.reviewWinner');
  const reviewWinnerOption = `<option value="__review_winner__">${reviewWinnerText}</option>`;
  const modelOptions = AVAILABLE_MODELS.map(model => 
    `<option value="${model.id}">${model.name} (${model.provider})</option>`
  ).join('');
  chairmanSelect.innerHTML = reviewWinnerOption + modelOptions;
}

function renderPlannerSelect() {
  const disabledText = t('options.plannerDisabled') || '停用（使用規則式）';
  const disabledOption = `<option value="">${disabledText}</option>`;
  const modelOptions = AVAILABLE_MODELS.map(model => 
    `<option value="${model.id}">${model.name} (${model.provider})</option>`
  ).join('');
  plannerSelect.innerHTML = disabledOption + modelOptions;
}

async function loadSettings() {
  const currentLanguage = i18n.getLocale();
  
  const result = await chrome.storage.sync.get({
    language: 'zh-TW',
    apiKey: '',
    braveApiKey: '',
    councilModels: DEFAULT_MODELS,
    chairmanModel: DEFAULT_CHAIRMAN,
    plannerModel: '',  // Empty string means disabled (rule-based only)
    enableReview: true,
    maxSearchIterations: 5,
    maxCardDepth: 3,
    reviewPrompt: '',
    chairmanPrompt: '',
    outputLength: DEFAULT_OUTPUT_LENGTH,
    outputFormat: DEFAULT_OUTPUT_FORMAT,
    learnerMode: 'standard'
  });

  // Set language selector
  languageSelect.value = result.language;
  
  // If language from storage differs from initialized, update
  if (result.language !== currentLanguage) {
    await i18n.setLocale(result.language);
    renderChairmanSelect();
  }

  apiKeyInput.value = result.apiKey;
  braveApiKeyInput.value = result.braveApiKey;
  enableReviewCheckbox.checked = result.enableReview;
  maxSearchIterationsSelect.value = result.maxSearchIterations;
  if (maxCardDepthSelect) maxCardDepthSelect.value = result.maxCardDepth;
  chairmanSelect.value = result.chairmanModel;
  plannerSelect.value = result.plannerModel || '';
  
  // Use stored prompts or generate defaults based on current language
  reviewPromptTextarea.value = result.reviewPrompt || getDefaultReviewPrompt(result.language);
  chairmanPromptTextarea.value = result.chairmanPrompt || getDefaultChairmanPrompt(result.language);

  // Set model checkboxes
  const checkboxes = modelListEl.querySelectorAll('[data-model]');
  checkboxes.forEach(cb => {
    cb.checked = result.councilModels.includes(cb.value);
  });

  // Set output style radio buttons
  outputLengthRadios.forEach(radio => {
    radio.checked = radio.value === result.outputLength;
  });
  outputFormatRadios.forEach(radio => {
    radio.checked = radio.value === result.outputFormat;
  });
  
  // Set learner mode radio buttons
  learnerModeRadios.forEach(radio => {
    radio.checked = radio.value === result.learnerMode;
  });
  
  // Update prompt section visibility based on learner mode
  handleLearnerModeChange();
}

async function saveSettings() {
  const language = languageSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const braveApiKey = braveApiKeyInput.value.trim();
  const enableReview = enableReviewCheckbox.checked;
  const maxSearchIterations = parseInt(maxSearchIterationsSelect.value, 10) || 5;
  const maxCardDepth = parseInt(maxCardDepthSelect?.value, 10) || 3;
  const chairmanModel = chairmanSelect.value;
  const plannerModel = plannerSelect.value;  // Empty string means disabled
  const reviewPrompt = reviewPromptTextarea.value.trim() || getDefaultReviewPrompt(language);
  const chairmanPrompt = chairmanPromptTextarea.value.trim() || getDefaultChairmanPrompt(language);
  
  // Get selected models
  const checkboxes = modelListEl.querySelectorAll('[data-model]:checked');
  const councilModels = Array.from(checkboxes).map(cb => cb.value);

  // Get output style settings
  const outputLength = document.querySelector('input[name="outputLength"]:checked')?.value || DEFAULT_OUTPUT_LENGTH;
  const outputFormat = document.querySelector('input[name="outputFormat"]:checked')?.value || DEFAULT_OUTPUT_FORMAT;
  
  // Get learner mode setting
  const learnerMode = document.querySelector('input[name="learnerMode"]:checked')?.value || 'standard';

  if (councilModels.length < 2) {
    showStatus(t('options.statusMinModels'), 'error');
    return;
  }

  await chrome.storage.sync.set({
    language,
    apiKey,
    braveApiKey,
    councilModels,
    chairmanModel,
    plannerModel,
    enableReview,
    maxSearchIterations,
    maxCardDepth,
    reviewPrompt,
    chairmanPrompt,
    outputLength,
    outputFormat,
    learnerMode
  });

  showStatus(t('options.statusSaved'), 'success');
}

function resetPrompts() {
  const language = languageSelect.value;
  reviewPromptTextarea.value = getDefaultReviewPrompt(language);
  chairmanPromptTextarea.value = getDefaultChairmanPrompt(language);
  showStatus(t('options.statusPromptsReset'), 'success');
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 2000);
}

// Load available models from storage or use defaults
async function loadAvailableModels() {
  const result = await chrome.storage.local.get('availableModels');
  AVAILABLE_MODELS = result.availableModels || DEFAULT_AVAILABLE_MODELS;
}

// Fetch models from OpenRouter API
async function fetchModelsFromOpenRouter() {
  const apiKey = apiKeyInput.value.trim();
  
  if (!apiKey) {
    throw new Error(t('errors.authDetail'));
  }

  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': chrome.runtime.getURL('/'),
      'X-Title': 'AI Council Extension'
    }
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.data || [];
}

// Filter and sort models from OpenRouter API
function filterAndSortModels(rawModels) {
  const seenIds = new Set();
  const MIN_CONTEXT_LENGTH = 8000;
  const EXCLUDED_KEYWORDS = ['free', 'online', 'extended', 'nitro', ':free'];
  const VISION_KEYWORDS = ['vision', 'gemini', 'gpt-4', 'claude-3', 'claude-sonnet-4', 'claude-opus-4', 'grok'];
  const IMAGE_KEYWORDS = ['image', '-image-'];
  
  // Provider limits: top N newest models per provider
  const PROVIDER_LIMITS = {
    'openai': 4,
    'anthropic': 4,
    'google': 4,
    'meta-llama': 2
  };

  // Step 1: Filter by basic criteria and group by provider
  const byProvider = {};
  
  for (const model of rawModels) {
    const id = model.id;
    const name = model.name || id;
    const contextLength = model.context_length || 0;
    const created = model.created || 0;

    if (seenIds.has(id)) continue;

    const provider = id.split('/')[0] || '';
    const providerKey = provider.toLowerCase();
    
    // Only include providers with defined limits
    if (!PROVIDER_LIMITS[providerKey]) continue;

    if (contextLength < MIN_CONTEXT_LENGTH) continue;

    const lowerId = id.toLowerCase();
    if (EXCLUDED_KEYWORDS.some(kw => lowerId.includes(kw))) continue;

    // Format provider name
    let providerName;
    if (providerKey === 'meta-llama') providerName = 'Meta';
    else providerName = provider.charAt(0).toUpperCase() + provider.slice(1);

    const canVision = VISION_KEYWORDS.some(kw => lowerId.includes(kw));
    const canImage = IMAGE_KEYWORDS.some(kw => lowerId.includes(kw));

    // Extract pricing information (per 1M tokens in USD)
    const pricing = model.pricing || {};
    const inputPrice = pricing.prompt ? parseFloat(pricing.prompt) * 1_000_000 : 0;
    const outputPrice = pricing.completion ? parseFloat(pricing.completion) * 1_000_000 : 0;

    if (!byProvider[providerKey]) {
      byProvider[providerKey] = [];
    }

    byProvider[providerKey].push({
      id,
      name,
      provider: providerName,
      canVision,
      canImage,
      inputPrice,
      outputPrice,
      created
    });

    seenIds.add(id);
  }

  // Step 2: Sort each provider's models by created (newest first) and take top N
  const final = [];
  
  for (const [providerKey, models] of Object.entries(byProvider)) {
    const limit = PROVIDER_LIMITS[providerKey];
    const sorted = models.sort((a, b) => b.created - a.created);
    const topModels = sorted.slice(0, limit);
    final.push(...topModels);
  }

  // Step 3: Sort final list by provider, then by created (newest first)
  final.sort((a, b) => {
    if (a.provider !== b.provider) {
      return a.provider.localeCompare(b.provider);
    }
    return b.created - a.created;
  });

  // Remove internal fields (keep pricing)
  return final.map(({ created, ...model }) => model);
}

// Update models from OpenRouter
async function updateModelsFromOpenRouter() {
  updateModelsBtn.disabled = true;
  updateModelsBtn.textContent = t('options.updateModelsLoading');

  try {
    const rawModels = await fetchModelsFromOpenRouter();
    const newModels = filterAndSortModels(rawModels);

    if (newModels.length === 0) {
      throw new Error('No models found');
    }

    // Save to storage
    await chrome.storage.local.set({ availableModels: newModels });
    AVAILABLE_MODELS = newModels;

    // Re-render UI
    renderModelList();
    renderChairmanSelect();
    await loadSettings();

    showStatus(t('options.statusModelsUpdated', { count: newModels.length }), 'success');
  } catch (err) {
    showStatus(t('options.statusModelsUpdateFailed', { error: err.message }), 'error');
  } finally {
    updateModelsBtn.disabled = false;
    updateModelsBtn.textContent = t('options.updateModelsBtn');
  }
}

// ============================================
// Skills Management
// ============================================

// Simple LRU Cache for external skills (mirror of skill-loader.js)
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

  async set(key, value) {
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

const skillsCache = new SkillsLRUCache();

// Initialize skills management
async function initSkillsManagement() {
  await skillsCache.initialize();
  await renderSkillsStorageInfo();
  await renderInstalledSkills();
}

// Render storage info
async function renderSkillsStorageInfo() {
  if (!skillsStorageInfo) return;
  
  try {
    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB
    const percentage = Math.round((bytesInUse / quota) * 100);
    const usedMB = (bytesInUse / 1048576).toFixed(2);
    const quotaMB = (quota / 1048576).toFixed(0);
    
    const externalCount = skillsCache.size();
    
    skillsStorageInfo.innerHTML = `
      <div class="storage-bar">
        <div class="storage-bar-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="storage-text">
        <span>儲存空間：${usedMB} MB / ${quotaMB} MB (${percentage}%)</span>
        <span>外部技能：${externalCount} / 10</span>
      </div>
    `;
  } catch (err) {
    skillsStorageInfo.innerHTML = '<p class="hint">無法取得儲存空間資訊</p>';
  }
}

// Render installed skills list
async function renderInstalledSkills() {
  if (!installedSkillsList) return;
  
  // Get bundled skills
  const bundledSkills = [
    { id: 'researcher', name: 'Researcher', icon: '🔬', source: 'bundled' },
    { id: 'educator', name: 'Educator', icon: '📚', source: 'bundled' },
    { id: 'quick-answer', name: 'Quick Answer', icon: '⚡', source: 'bundled' },
    { id: 'fact-checker', name: 'Fact Checker', icon: '✅', source: 'bundled' },
    { id: 'creative', name: 'Creative', icon: '💡', source: 'bundled' },
    { id: 'technical', name: 'Technical', icon: '💻', source: 'bundled' },
    { id: 'current-events', name: 'Current Events', icon: '📰', source: 'bundled' },
    { id: 'image-design', name: 'Image Design', icon: '🎨', source: 'bundled' },
    { id: 'vision-analysis', name: 'Vision Analysis', icon: '👁', source: 'bundled' },
    { id: 'image-prompt-engineering', name: 'Image Prompt Engineering', icon: '🎨', source: 'skillsmp' },
    { id: 'deep-research', name: 'Deep Research', icon: '📚', source: 'skillsmp' }
  ];
  
  // Get external skills from cache
  const externalSkills = skillsCache.getAll().map(([id, data]) => ({
    id,
    name: data.name || id,
    icon: data.icon || '📦',
    source: 'external',
    sourceUrl: data.sourceUrl
  }));
  
  const allSkills = [...bundledSkills, ...externalSkills];
  
  installedSkillsList.innerHTML = allSkills.map(skill => {
    const sourceLabel = skill.source === 'bundled' ? '內建' : 
                       skill.source === 'skillsmp' ? 'SkillsMP' : '外部';
    const sourceClass = skill.source === 'bundled' ? 'source-bundled' : 
                       skill.source === 'skillsmp' ? 'source-skillsmp' : 'source-external';
    const canDelete = skill.source === 'external';
    
    return `
      <div class="skill-item">
        <span class="skill-icon">${skill.icon}</span>
        <span class="skill-name">${skill.name}</span>
        <span class="skill-source ${sourceClass}">${sourceLabel}</span>
        ${canDelete ? `<button class="skill-delete-btn" data-skill-id="${skill.id}" title="刪除">×</button>` : ''}
      </div>
    `;
  }).join('');
  
  // Add delete handlers
  installedSkillsList.querySelectorAll('.skill-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const skillId = btn.dataset.skillId;
      if (confirm(`確定要刪除技能 "${skillId}"？`)) {
        await skillsCache.delete(skillId);
        await renderInstalledSkills();
        await renderSkillsStorageInfo();
        showStatus('技能已刪除', 'success');
      }
    });
  });
}

// Parse simple YAML frontmatter
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split('\n');
  let currentKey = null;
  let nestedObj = null;
  
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    
    const indent = line.search(/\S/);
    const trimmedLine = line.trim();
    const kvMatch = trimmedLine.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (indent === 0) {
        if (value === '' || value === null) {
          currentKey = key;
          nestedObj = {};
          result[key] = nestedObj;
        } else {
          result[key] = value.replace(/^["']|["']$/g, '');
          currentKey = null;
          nestedObj = null;
        }
      } else if (nestedObj) {
        nestedObj[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  return result;
}

// Parse SKILL.md content
function parseSkillMd(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    throw new Error('Invalid SKILL.md format');
  }
  
  const metadata = parseSimpleYaml(match[1]);
  return { metadata, body: match[2].trim() };
}

// Import skill from URL
async function importSkill() {
  const url = skillImportUrl?.value?.trim();
  if (!url) {
    showStatus('請輸入技能路徑', 'error');
    return;
  }
  
  importSkillBtn.disabled = true;
  importSkillBtn.textContent = '匯入中...';
  
  try {
    let content;
    let sourceUrl;
    let skillId;
    
    // Determine import type
    if (url.includes('/') && !url.startsWith('http')) {
      // GitHub path: owner/repo/path/SKILL.md
      const match = url.match(/^([^\/]+)\/([^\/]+)\/(.+)$/);
      if (!match) {
        throw new Error('無效的 GitHub 路徑格式');
      }
      
      const [, owner, repo, path] = match;
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
      
      const response = await fetch(rawUrl);
      if (!response.ok) {
        // Try master branch
        const masterResponse = await fetch(rawUrl.replace('/main/', '/master/'));
        if (!masterResponse.ok) {
          throw new Error(`GitHub 取得失敗: ${response.status}`);
        }
        content = await masterResponse.text();
      } else {
        content = await response.text();
      }
      
      sourceUrl = `https://github.com/${owner}/${repo}`;
      skillId = path.split('/').slice(-2, -1)[0] || `github-${Date.now()}`;
    } else {
      // SkillsMP slug or direct URL
      if (url.startsWith('http')) {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`URL 取得失敗: ${response.status}`);
        }
        content = await response.text();
        sourceUrl = url;
        skillId = `url-${Date.now()}`;
      } else {
        // Assume SkillsMP slug - try API
        const response = await fetch(`https://skillsmp.com/api/skills/${url}`);
        if (!response.ok) {
          throw new Error(`SkillsMP 取得失敗: ${response.status}`);
        }
        const data = await response.json();
        content = data.content;
        sourceUrl = `https://skillsmp.com/skills/${url}`;
        skillId = data.name || url.split('-').pop();
      }
    }
    
    // Parse and validate
    const parsed = parseSkillMd(content);
    skillId = parsed.metadata.name || skillId;
    
    // Store in cache
    await skillsCache.set(skillId, {
      content,
      name: parsed.metadata.name || skillId,
      description: parsed.metadata.description || '',
      icon: parsed.metadata.metadata?.icon || '📦',
      sourceUrl,
      importedAt: Date.now()
    });
    
    // Refresh UI
    await renderInstalledSkills();
    await renderSkillsStorageInfo();
    
    skillImportUrl.value = '';
    showStatus(`技能 "${skillId}" 匯入成功`, 'success');
  } catch (err) {
    showStatus(`匯入失敗: ${err.message}`, 'error');
  } finally {
    importSkillBtn.disabled = false;
    importSkillBtn.textContent = t('options.importSkillBtn') || '匯入';
  }
}

init();
