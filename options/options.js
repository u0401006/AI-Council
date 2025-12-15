// Model providers to fetch from OpenRouter
const MODEL_PROVIDERS = {
  'openai': { prefix: 'openai/', displayName: 'OpenAI' },
  'anthropic': { prefix: 'anthropic/', displayName: 'Anthropic' },
  'google': { prefix: 'google/', displayName: 'Google' },
  'x-ai': { prefix: 'x-ai/', displayName: 'xAI' },
  'meta-llama': { prefix: 'meta-llama/', displayName: 'Meta' }
};

// Cache duration: 24 hours
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// Fallback models when API fails or no API key (4 per provider)
const FALLBACK_MODELS = [
  // OpenAI
  { id: 'openai/gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', canVision: true, pricing: 2.0 },
  { id: 'openai/gpt-4.1-mini', name: 'GPT-4.1 Mini', provider: 'OpenAI', canVision: true, pricing: 0.4 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', canVision: true, pricing: 2.5 },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', canVision: true, pricing: 0.15 },
  // Anthropic
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', canVision: true, pricing: 3.0 },
  { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', canVision: true, pricing: 3.0 },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', canVision: true, pricing: 3.0 },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', canVision: true, pricing: 0.8 },
  // Google
  { id: 'google/gemini-2.5-pro-preview', name: 'Gemini 2.5 Pro', provider: 'Google', canVision: true, pricing: 1.25 },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', canVision: true, pricing: 0.15 },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', canVision: true, pricing: 0.1 },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', canVision: true, pricing: 1.25 },
  // xAI
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI', canVision: true, pricing: 3.0 },
  { id: 'x-ai/grok-3-mini', name: 'Grok 3 Mini', provider: 'xAI', canVision: true, pricing: 0.3 },
  { id: 'x-ai/grok-2', name: 'Grok 2', provider: 'xAI', canVision: true, pricing: 2.0 },
  { id: 'x-ai/grok-2-mini', name: 'Grok 2 Mini', provider: 'xAI', canVision: true, pricing: 0.2 },
  // Meta Llama
  { id: 'meta-llama/llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', canVision: true, pricing: 0.15 },
  { id: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', canVision: true, pricing: 0.2 },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', canVision: false, pricing: 0.3 },
  { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'Meta', canVision: false, pricing: 0.02 }
];

const DEFAULT_MODELS = [
  'openai/gpt-4.1',
  'anthropic/claude-sonnet-4',
  'google/gemini-2.5-pro-preview',
  'google/gemini-2.5-flash'
];

const DEFAULT_CHAIRMAN = 'anthropic/claude-sonnet-4';

// Default prompts
const DEFAULT_REVIEW_PROMPT = `You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文). Simplified Chinese is strictly prohibited.**

## User's Question
{query}

## Responses to Evaluate
{responses}

## Your Task
Rank these responses from best to worst. Output in this exact JSON format:
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由（繁體中文）"},
    {"response": "B", "rank": 2, "reason": "簡短理由（繁體中文）"}
  ]
}
\`\`\`

Be objective. Focus on factual accuracy and helpfulness. Write all reasons in Traditional Chinese.`;

const DEFAULT_CHAIRMAN_PROMPT = `You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文). Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

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

Provide your answer directly in Traditional Chinese (繁體中文), without meta-commentary.`;

// Default output style settings
const DEFAULT_OUTPUT_LENGTH = 'standard';
const DEFAULT_OUTPUT_FORMAT = 'mixed';

// Current available models (will be populated from API or cache)
let AVAILABLE_MODELS = [];

// DOM Elements
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
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const refreshModelsBtn = document.getElementById('refreshModelsBtn');
const modelsCacheStatus = document.getElementById('modelsCacheStatus');

// Output style radio groups
const outputLengthRadios = document.querySelectorAll('input[name="outputLength"]');
const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');

// ============================================
// OpenRouter Models API
// ============================================

async function fetchOpenRouterModels(apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  const json = await res.json();
  return json.data || [];
}

function filterAndSortModels(allModels) {
  const result = [];
  
  for (const [providerKey, providerInfo] of Object.entries(MODEL_PROVIDERS)) {
    // Filter models by provider prefix
    const providerModels = allModels.filter(m => m.id.startsWith(providerInfo.prefix));
    
    if (providerModels.length === 0) continue;
    
    // Parse model info
    const modelsWithInfo = providerModels.map(m => {
      const promptPrice = parseFloat(m.pricing?.prompt) || 0;
      const hasVision = m.architecture?.modality?.includes('image') || 
                        m.architecture?.input_modalities?.includes('image') ||
                        m.id.includes('vision') ||
                        ['gpt-4o', 'gpt-4.1', 'gpt-5', 'claude', 'gemini', 'grok'].some(v => m.id.includes(v));
      const hasImageGen = m.architecture?.output_modalities?.includes('image') || m.id.includes('image-preview');
      
      return {
        id: m.id,
        name: m.name || m.id.split('/').pop(),
        provider: providerInfo.displayName,
        canVision: hasVision,
        canImage: hasImageGen,
        pricing: promptPrice * 1000000, // Convert to per million
        contextLength: m.context_length || 0,
        created: m.created || 0 // Unix timestamp
      };
    });
    
    // Sort by created timestamp descending (newest first)
    modelsWithInfo.sort((a, b) => b.created - a.created);
    
    // Take top 4 newest models
    const topModels = modelsWithInfo.slice(0, 4);
    result.push(...topModels);
  }
  
  return result;
}

async function loadModelsFromCache() {
  const result = await chrome.storage.local.get(['cachedModels', 'modelsCacheTime']);
  
  if (result.cachedModels && result.modelsCacheTime) {
    const cacheAge = Date.now() - result.modelsCacheTime;
    if (cacheAge < CACHE_DURATION_MS) {
      return {
        models: result.cachedModels,
        cacheTime: result.modelsCacheTime,
        isValid: true
      };
    }
  }
  
  return { models: null, cacheTime: null, isValid: false };
}

async function saveModelsToCache(models) {
  await chrome.storage.local.set({
    cachedModels: models,
    modelsCacheTime: Date.now()
  });
}

async function getAvailableModels(forceRefresh = false) {
  const apiKey = apiKeyInput.value.trim();
  
  // Try cache first (unless force refresh)
  if (!forceRefresh) {
    const cache = await loadModelsFromCache();
    if (cache.isValid && cache.models && cache.models.length > 0) {
      updateCacheStatus(cache.cacheTime);
      return cache.models;
    }
  }
  
  // No API key - use fallback
  if (!apiKey) {
    updateCacheStatus(null, '無 API Key，使用預設列表');
    return FALLBACK_MODELS;
  }
  
  // Fetch from API
  try {
    setModelsLoading(true);
    const allModels = await fetchOpenRouterModels(apiKey);
    const filteredModels = filterAndSortModels(allModels);
    
    if (filteredModels.length > 0) {
      await saveModelsToCache(filteredModels);
      updateCacheStatus(Date.now());
      return filteredModels;
    } else {
      updateCacheStatus(null, 'API 回傳無相符模型');
      return FALLBACK_MODELS;
    }
  } catch (err) {
    console.error('Failed to fetch models:', err);
    
    // Try to use stale cache
    const cache = await loadModelsFromCache();
    if (cache.models && cache.models.length > 0) {
      updateCacheStatus(cache.cacheTime, '更新失敗，使用舊快取');
      return cache.models;
    }
    
    updateCacheStatus(null, `取得失敗: ${err.message}`);
    return FALLBACK_MODELS;
  } finally {
    setModelsLoading(false);
  }
}

function setModelsLoading(loading) {
  if (refreshModelsBtn) {
    refreshModelsBtn.disabled = loading;
    refreshModelsBtn.textContent = loading ? '載入中...' : '重新整理';
  }
  if (modelListEl) {
    modelListEl.style.opacity = loading ? '0.5' : '1';
  }
}

function updateCacheStatus(cacheTime, message = null) {
  if (!modelsCacheStatus) return;
  
  if (message) {
    modelsCacheStatus.textContent = message;
    modelsCacheStatus.classList.add('warning');
  } else if (cacheTime) {
    const date = new Date(cacheTime);
    const timeStr = date.toLocaleString('zh-TW', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    modelsCacheStatus.textContent = `上次更新：${timeStr}`;
    modelsCacheStatus.classList.remove('warning');
  } else {
    modelsCacheStatus.textContent = '';
  }
}

// ============================================
// UI Rendering
// ============================================

async function init() {
  // Load models first
  AVAILABLE_MODELS = await getAvailableModels();
  
  renderModelList();
  renderChairmanSelect();
  await loadSettings();
  
  saveBtn.addEventListener('click', saveSettings);
  resetPromptsBtn.addEventListener('click', resetPrompts);
  
  if (refreshModelsBtn) {
    refreshModelsBtn.addEventListener('click', handleRefreshModels);
  }
  
  // Re-fetch models when API key changes
  apiKeyInput.addEventListener('change', handleApiKeyChange);
}

async function handleRefreshModels() {
  AVAILABLE_MODELS = await getAvailableModels(true);
  renderModelList();
  renderChairmanSelect();
  await loadSettings(); // Restore selections
  showStatus('模型列表已更新', 'success');
}

async function handleApiKeyChange() {
  // When API key changes, try to refresh models
  const apiKey = apiKeyInput.value.trim();
  if (apiKey && apiKey.startsWith('sk-or-')) {
    AVAILABLE_MODELS = await getAvailableModels(true);
    renderModelList();
    renderChairmanSelect();
    await loadSettings();
  }
}

function renderModelList() {
  modelListEl.innerHTML = AVAILABLE_MODELS.map(model => {
    const badges = [];
    if (model.canVision) badges.push('<span class="vision-badge">VIS</span>');
    if (model.canImage) badges.push('<span class="image-badge">IMG</span>');
    const priceStr = model.pricing ? `$${model.pricing.toFixed(2)}/M` : '';
    return `
    <label class="model-item">
      <input type="checkbox" value="${model.id}" data-model>
      <span class="model-name">${model.name}${badges.join('')}</span>
      <span class="model-price">${priceStr}</span>
      <span class="model-provider">${model.provider}</span>
    </label>
  `;
  }).join('');
}

function renderChairmanSelect() {
  chairmanSelect.innerHTML = AVAILABLE_MODELS.map(model => 
    `<option value="${model.id}">${model.name} (${model.provider})</option>`
  ).join('');
}

async function loadSettings() {
  const result = await chrome.storage.sync.get({
    apiKey: '',
    braveApiKey: '',
    councilModels: DEFAULT_MODELS,
    chairmanModel: DEFAULT_CHAIRMAN,
    enableReview: true,
    maxSearchIterations: 5,
    maxCardDepth: 3,
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    chairmanPrompt: DEFAULT_CHAIRMAN_PROMPT,
    outputLength: DEFAULT_OUTPUT_LENGTH,
    outputFormat: DEFAULT_OUTPUT_FORMAT
  });

  apiKeyInput.value = result.apiKey;
  braveApiKeyInput.value = result.braveApiKey;
  enableReviewCheckbox.checked = result.enableReview;
  maxSearchIterationsSelect.value = result.maxSearchIterations;
  if (maxCardDepthSelect) maxCardDepthSelect.value = result.maxCardDepth;
  
  // Set chairman model (fallback to first available if saved one doesn't exist)
  const chairmanExists = AVAILABLE_MODELS.some(m => m.id === result.chairmanModel);
  chairmanSelect.value = chairmanExists ? result.chairmanModel : (AVAILABLE_MODELS[0]?.id || '');
  
  reviewPromptTextarea.value = result.reviewPrompt;
  chairmanPromptTextarea.value = result.chairmanPrompt;

  // Set model checkboxes - only check models that exist in current list
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
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const braveApiKey = braveApiKeyInput.value.trim();
  const enableReview = enableReviewCheckbox.checked;
  const maxSearchIterations = parseInt(maxSearchIterationsSelect.value, 10) || 5;
  const maxCardDepth = parseInt(maxCardDepthSelect?.value, 10) || 3;
  const chairmanModel = chairmanSelect.value;
  const reviewPrompt = reviewPromptTextarea.value.trim() || DEFAULT_REVIEW_PROMPT;
  const chairmanPrompt = chairmanPromptTextarea.value.trim() || DEFAULT_CHAIRMAN_PROMPT;
  
  // Get selected models
  const checkboxes = modelListEl.querySelectorAll('[data-model]:checked');
  const councilModels = Array.from(checkboxes).map(cb => cb.value);

  // Get output style settings
  const outputLength = document.querySelector('input[name="outputLength"]:checked')?.value || DEFAULT_OUTPUT_LENGTH;
  const outputFormat = document.querySelector('input[name="outputFormat"]:checked')?.value || DEFAULT_OUTPUT_FORMAT;

  if (councilModels.length < 2) {
    showStatus('請選擇至少 2 個模型', 'error');
    return;
  }

  await chrome.storage.sync.set({
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
    outputFormat
  });

  showStatus('設定已儲存', 'success');
}

function resetPrompts() {
  reviewPromptTextarea.value = DEFAULT_REVIEW_PROMPT;
  chairmanPromptTextarea.value = DEFAULT_CHAIRMAN_PROMPT;
  showStatus('提示詞已重設為預設', 'success');
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 2000);
}

init();
