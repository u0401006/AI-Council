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

// Initialize
async function init() {
  // Initialize i18n first
  await i18n.init();
  
  await loadAvailableModels();
  renderModelList();
  renderChairmanSelect();
  await loadSettings();
  
  saveBtn.addEventListener('click', saveSettings);
  resetPromptsBtn.addEventListener('click', resetPrompts);
  updateModelsBtn.addEventListener('click', updateModelsFromOpenRouter);
  
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

async function loadSettings() {
  const currentLanguage = i18n.getLocale();
  
  const result = await chrome.storage.sync.get({
    language: 'zh-TW',
    apiKey: '',
    braveApiKey: '',
    councilModels: DEFAULT_MODELS,
    chairmanModel: DEFAULT_CHAIRMAN,
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

init();
