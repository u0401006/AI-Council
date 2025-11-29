// State
let councilModels = [];
let responses = new Map(); // model -> { content, status, latency }
let activeTab = null;

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const modelCountEl = document.getElementById('modelCount');
const resultsSection = document.getElementById('resultsSection');
const emptyState = document.getElementById('emptyState');
const modelTabs = document.getElementById('modelTabs');
const responseContainer = document.getElementById('responseContainer');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const dismissError = document.getElementById('dismissError');

// Model display names
const MODEL_NAMES = {
  'openai/gpt-4o': 'GPT-4o',
  'openai/gpt-4o-mini': 'GPT-4o Mini',
  'anthropic/claude-sonnet-4': 'Claude Sonnet 4',
  'anthropic/claude-3.5-sonnet': 'Claude 3.5 Sonnet',
  'google/gemini-2.0-flash-001': 'Gemini 2.0',
  'google/gemini-1.5-pro': 'Gemini 1.5 Pro',
  'x-ai/grok-3': 'Grok 3',
  'meta-llama/llama-3.1-405b-instruct': 'Llama 405B',
  'deepseek/deepseek-r1': 'DeepSeek R1',
  'mistralai/mistral-large-2411': 'Mistral Large'
};

function getModelName(modelId) {
  return MODEL_NAMES[modelId] || modelId.split('/').pop();
}

// Initialize
async function init() {
  await loadSettings();
  setupEventListeners();
}

async function loadSettings() {
  const result = await chrome.storage.sync.get({
    councilModels: [],
    chairmanModel: ''
  });
  
  councilModels = result.councilModels;
  updateModelCount();
}

function updateModelCount() {
  const count = councilModels.length;
  modelCountEl.textContent = `${count} model${count !== 1 ? 's' : ''}`;
}

function setupEventListeners() {
  sendBtn.addEventListener('click', handleSend);
  
  queryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  });

  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  dismissError.addEventListener('click', () => {
    errorBanner.classList.add('hidden');
  });

  // Listen for settings changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.councilModels) {
      councilModels = changes.councilModels.newValue || [];
      updateModelCount();
    }
  });
}

async function handleSend() {
  const query = queryInput.value.trim();
  if (!query) return;
  
  if (councilModels.length === 0) {
    showError('No models selected. Please configure in Settings.');
    return;
  }

  // Reset state
  responses.clear();
  activeTab = null;
  
  // Setup UI
  sendBtn.disabled = true;
  emptyState.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  
  // Create tabs and response panels
  renderTabs();
  renderResponsePanels();
  
  // Set first tab active
  if (councilModels.length > 0) {
    setActiveTab(councilModels[0]);
  }

  // Query all models in parallel
  const startTime = Date.now();
  
  await Promise.all(councilModels.map(model => queryModel(model, query)));
  
  sendBtn.disabled = false;
}

function renderTabs() {
  modelTabs.innerHTML = councilModels.map(model => `
    <button class="tab" data-model="${model}">
      ${getModelName(model)}
      <span class="status-dot"></span>
    </button>
  `).join('');

  // Add click handlers
  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveTab(tab.dataset.model);
    });
  });
}

function renderResponsePanels() {
  responseContainer.innerHTML = councilModels.map(model => `
    <div class="response-panel" data-model="${model}">
      <div class="response-content" id="content-${CSS.escape(model)}">
        <span class="cursor"></span>
      </div>
    </div>
  `).join('');
}

function setActiveTab(model) {
  activeTab = model;
  
  // Update tab styles
  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.model === model);
  });

  // Show corresponding panel
  responseContainer.querySelectorAll('.response-panel').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.model === model);
  });
}

function updateTabStatus(model, status) {
  const tab = modelTabs.querySelector(`[data-model="${model}"]`);
  if (tab) {
    const dot = tab.querySelector('.status-dot');
    dot.className = `status-dot ${status}`;
  }
}

function updateResponseContent(model, content, append = false) {
  const contentEl = document.getElementById(`content-${CSS.escape(model)}`);
  if (!contentEl) return;

  if (append) {
    // Remove cursor, append content, add cursor back
    const cursor = contentEl.querySelector('.cursor');
    if (cursor) cursor.remove();
    contentEl.innerHTML += escapeHtml(content);
    contentEl.innerHTML += '<span class="cursor"></span>';
  } else {
    contentEl.innerHTML = escapeHtml(content);
  }
}

function finalizeResponse(model, content, latency) {
  const contentEl = document.getElementById(`content-${CSS.escape(model)}`);
  if (!contentEl) return;

  // Remove cursor
  const cursor = contentEl.querySelector('.cursor');
  if (cursor) cursor.remove();

  // Add meta info
  const metaHtml = `
    <div class="response-meta">
      <span>Latency: ${(latency / 1000).toFixed(2)}s</span>
    </div>
  `;
  contentEl.insertAdjacentHTML('beforeend', metaHtml);
}

async function queryModel(model, query) {
  const startTime = Date.now();
  
  responses.set(model, { content: '', status: 'loading', latency: 0 });
  updateTabStatus(model, 'loading');
  updateResponseContent(model, '', false);

  try {
    // Use port for streaming
    const port = chrome.runtime.connect({ name: 'stream' });
    
    await new Promise((resolve, reject) => {
      let content = '';

      port.onMessage.addListener((message) => {
        if (message.type === 'START') {
          // Started streaming
        } else if (message.type === 'CHUNK') {
          content += message.content;
          updateResponseContent(model, message.content, true);
        } else if (message.type === 'DONE') {
          const latency = Date.now() - startTime;
          responses.set(model, { content, status: 'done', latency });
          updateTabStatus(model, 'done');
          finalizeResponse(model, content, latency);
          port.disconnect();
          resolve();
        } else if (message.type === 'ERROR') {
          responses.set(model, { content: '', status: 'error', latency: 0 });
          updateTabStatus(model, 'error');
          updateResponseContent(model, `Error: ${message.error}`, false);
          port.disconnect();
          reject(new Error(message.error));
        }
      });

      port.postMessage({
        type: 'QUERY_MODEL_STREAM',
        payload: {
          model,
          messages: [{ role: 'user', content: query }]
        }
      });
    });
  } catch (err) {
    console.error(`Error querying ${model}:`, err);
    responses.set(model, { content: '', status: 'error', latency: 0 });
    updateTabStatus(model, 'error');
  }
}

function showError(message) {
  errorText.textContent = message;
  errorBanner.classList.remove('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// CSS.escape polyfill for model IDs with special chars
if (!CSS.escape) {
  CSS.escape = function(value) {
    return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
  };
}

init();

