// Available models configuration
const AVAILABLE_MODELS = [
  // OpenAI
  { id: 'openai/gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  // Anthropic
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', provider: 'Anthropic' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  // Google
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', provider: 'Google' },
  { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', provider: 'Google', canImage: true },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google' },
  { id: 'google/gemini-2.5-flash-image-preview', name: 'Gemini 2.5 Flash Image', provider: 'Google', canImage: true },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  // Others
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral' }
];

const DEFAULT_MODELS = [
  'openai/gpt-5.1',
  'anthropic/claude-sonnet-4.5',
  'google/gemini-3-pro-preview',
  'google/gemini-2.5-flash'
];

const DEFAULT_CHAIRMAN = 'anthropic/claude-sonnet-4.5';

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

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const braveApiKeyInput = document.getElementById('braveApiKey');
const modelListEl = document.getElementById('modelList');
const chairmanSelect = document.getElementById('chairmanModel');
const enableReviewCheckbox = document.getElementById('enableReview');
const maxSearchIterationsSelect = document.getElementById('maxSearchIterations');
const reviewPromptTextarea = document.getElementById('reviewPrompt');
const chairmanPromptTextarea = document.getElementById('chairmanPrompt');
const resetPromptsBtn = document.getElementById('resetPromptsBtn');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// Output style radio groups
const outputLengthRadios = document.querySelectorAll('input[name="outputLength"]');
const outputFormatRadios = document.querySelectorAll('input[name="outputFormat"]');

// Initialize
async function init() {
  renderModelList();
  renderChairmanSelect();
  await loadSettings();
  
  saveBtn.addEventListener('click', saveSettings);
  resetPromptsBtn.addEventListener('click', resetPrompts);
}

function renderModelList() {
  modelListEl.innerHTML = AVAILABLE_MODELS.map(model => `
    <label class="model-item">
      <input type="checkbox" value="${model.id}" data-model>
      <span class="model-name">${model.name}${model.canImage ? '<span class="image-badge">IMG</span>' : ''}</span>
      <span class="model-provider">${model.provider}</span>
    </label>
  `).join('');
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
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    chairmanPrompt: DEFAULT_CHAIRMAN_PROMPT,
    outputLength: DEFAULT_OUTPUT_LENGTH,
    outputFormat: DEFAULT_OUTPUT_FORMAT
  });

  apiKeyInput.value = result.apiKey;
  braveApiKeyInput.value = result.braveApiKey;
  enableReviewCheckbox.checked = result.enableReview;
  maxSearchIterationsSelect.value = result.maxSearchIterations;
  chairmanSelect.value = result.chairmanModel;
  reviewPromptTextarea.value = result.reviewPrompt;
  chairmanPromptTextarea.value = result.chairmanPrompt;

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
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const braveApiKey = braveApiKeyInput.value.trim();
  const enableReview = enableReviewCheckbox.checked;
  const maxSearchIterations = parseInt(maxSearchIterationsSelect.value, 10) || 5;
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
