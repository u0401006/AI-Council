// Available models configuration
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'google/gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google' },
  { id: 'x-ai/grok-3', name: 'Grok 3', provider: 'xAI' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'mistralai/mistral-large-2411', name: 'Mistral Large', provider: 'Mistral' }
];

const DEFAULT_MODELS = [
  'openai/gpt-4o',
  'anthropic/claude-sonnet-4',
  'google/gemini-2.0-flash-001',
  'x-ai/grok-3'
];

const DEFAULT_CHAIRMAN = 'anthropic/claude-sonnet-4';

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const modelListEl = document.getElementById('modelList');
const chairmanSelect = document.getElementById('chairmanModel');
const enableReviewCheckbox = document.getElementById('enableReview');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

// Initialize
async function init() {
  renderModelList();
  renderChairmanSelect();
  await loadSettings();
  
  saveBtn.addEventListener('click', saveSettings);
}

function renderModelList() {
  modelListEl.innerHTML = AVAILABLE_MODELS.map(model => `
    <label class="model-item">
      <input type="checkbox" value="${model.id}" data-model>
      <span class="model-name">${model.name}</span>
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
    councilModels: DEFAULT_MODELS,
    chairmanModel: DEFAULT_CHAIRMAN,
    enableReview: true
  });

  apiKeyInput.value = result.apiKey;
  enableReviewCheckbox.checked = result.enableReview;
  chairmanSelect.value = result.chairmanModel;

  // Set model checkboxes
  const checkboxes = modelListEl.querySelectorAll('[data-model]');
  checkboxes.forEach(cb => {
    cb.checked = result.councilModels.includes(cb.value);
  });
}

async function saveSettings() {
  const apiKey = apiKeyInput.value.trim();
  const enableReview = enableReviewCheckbox.checked;
  const chairmanModel = chairmanSelect.value;
  
  // Get selected models
  const checkboxes = modelListEl.querySelectorAll('[data-model]:checked');
  const councilModels = Array.from(checkboxes).map(cb => cb.value);

  if (councilModels.length < 2) {
    showStatus('Select at least 2 models', 'error');
    return;
  }

  await chrome.storage.sync.set({
    apiKey,
    councilModels,
    chairmanModel,
    enableReview
  });

  showStatus('Settings saved', 'success');
}

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`;
  setTimeout(() => {
    statusEl.className = 'status';
  }, 2000);
}

init();

