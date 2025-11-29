// ============================================
// Inline: lib/markdown.js
// ============================================

function parseMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtmlMd(text);
  
  // Temporarily protect code blocks
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    codeBlocks.push({ lang, code });
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodes.push(code);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });

  // Apply formatting rules
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Paragraphs
  html = '<p>' + html.replace(/\n\n+/g, '</p><p>') + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[234]>)/g, '$1');
  html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(
      `__CODE_BLOCK_${i}__`,
      `<pre><code class="language-${block.lang}">${block.code}</code></pre>`
    );
  });
  
  inlineCodes.forEach((code, i) => {
    html = html.replace(`__INLINE_CODE_${i}__`, `<code>${code}</code>`);
  });

  return html;
}

function escapeHtmlMd(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createStreamingParser() {
  let buffer = '';
  return {
    append(chunk) {
      buffer += chunk;
      return parseMarkdown(buffer);
    },
    getContent() {
      return buffer;
    },
    reset() {
      buffer = '';
    }
  };
}

// ============================================
// Inline: lib/models.js
// ============================================

const MODELS = {
  'openai/gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    inputPrice: 2.5,
    outputPrice: 10,
  },
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    inputPrice: 0.15,
    outputPrice: 0.6,
  },
  'anthropic/claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
  },
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
  },
  'google/gemini-2.0-flash-001': {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    inputPrice: 0.1,
    outputPrice: 0.4,
  },
  'google/gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 5,
  },
  'x-ai/grok-3': {
    name: 'Grok 3',
    provider: 'xAI',
    inputPrice: 3,
    outputPrice: 15,
  },
  'meta-llama/llama-3.1-405b-instruct': {
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    inputPrice: 2,
    outputPrice: 2,
  },
  'deepseek/deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    inputPrice: 0.55,
    outputPrice: 2.19,
  },
  'mistralai/mistral-large-2411': {
    name: 'Mistral Large',
    provider: 'Mistral',
    inputPrice: 2,
    outputPrice: 6,
  }
};

function getModelInfo(modelId) {
  return MODELS[modelId] || {
    name: modelId.split('/').pop(),
    provider: modelId.split('/')[0],
    inputPrice: 0,
    outputPrice: 0,
  };
}

function getModelName(modelId) {
  return getModelInfo(modelId).name;
}

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function calculateCost(modelId, inputTokens, outputTokens) {
  const info = getModelInfo(modelId);
  const inputCost = (inputTokens / 1_000_000) * info.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * info.outputPrice;
  return { input: inputCost, output: outputCost, total: inputCost + outputCost };
}

function formatCost(cost) {
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

// ============================================
// Main App
// ============================================

// State
let councilModels = [];
let responses = new Map();
let activeTab = null;
let currentQuery = '';

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

  currentQuery = query;
  responses.clear();
  activeTab = null;
  
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>Querying...</span>';
  emptyState.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  errorBanner.classList.add('hidden');
  
  renderTabs();
  renderResponsePanels();
  
  if (councilModels.length > 0) {
    setActiveTab(councilModels[0]);
  }

  const results = await Promise.allSettled(
    councilModels.map(model => queryModel(model, query))
  );
  
  const errors = results.filter(r => r.status === 'rejected');
  if (errors.length === councilModels.length) {
    showError('All queries failed. Check your API key and try again.');
  }
  
  sendBtn.disabled = false;
  sendBtn.innerHTML = '<span>Send</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
}

function renderTabs() {
  modelTabs.innerHTML = councilModels.map(model => {
    const info = getModelInfo(model);
    return `
      <button class="tab" data-model="${model}" title="${info.provider}">
        ${info.name}
        <span class="status-dot"></span>
      </button>
    `;
  }).join('');

  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => setActiveTab(tab.dataset.model));
  });
}

function renderResponsePanels() {
  responseContainer.innerHTML = councilModels.map(model => `
    <div class="response-panel" data-model="${model}">
      <div class="response-content" id="content-${cssEscape(model)}">
        <div class="loading-indicator">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <span class="loading-text">Waiting for response...</span>
        </div>
      </div>
      <div class="response-meta" id="meta-${cssEscape(model)}"></div>
    </div>
  `).join('');
}

function setActiveTab(model) {
  activeTab = model;
  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.model === model);
  });
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

function updateResponseContent(model, html) {
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  if (!contentEl) return;
  contentEl.innerHTML = html + '<span class="cursor"></span>';
  
  const panel = contentEl.closest('.response-panel');
  if (panel && panel.scrollHeight - panel.scrollTop - panel.clientHeight < 100) {
    panel.scrollTop = panel.scrollHeight;
  }
}

function finalizeResponse(model, content, latency, usage = null) {
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  const metaEl = document.getElementById(`meta-${cssEscape(model)}`);
  if (!contentEl || !metaEl) return;

  const cursor = contentEl.querySelector('.cursor');
  if (cursor) cursor.remove();

  const inputTokens = estimateTokens(currentQuery);
  const outputTokens = usage?.completion_tokens || estimateTokens(content);
  const cost = calculateCost(model, inputTokens, outputTokens);
  
  metaEl.innerHTML = `
    <span class="meta-item" title="Response time">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      ${(latency / 1000).toFixed(2)}s
    </span>
    <span class="meta-item" title="Output tokens">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      ~${outputTokens} tokens
    </span>
    <span class="meta-item" title="Estimated cost">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
      ${formatCost(cost.total)}
    </span>
  `;
  metaEl.classList.add('visible');
}

function showErrorInPanel(model, errorMessage) {
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  if (!contentEl) return;
  
  contentEl.innerHTML = `
    <div class="error-state">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>${escapeHtml(errorMessage)}</p>
      <button class="retry-btn" data-model="${model}">Retry</button>
    </div>
  `;
  
  contentEl.querySelector('.retry-btn')?.addEventListener('click', () => {
    queryModel(model, currentQuery);
  });
}

async function queryModel(model, query) {
  const startTime = Date.now();
  const parser = createStreamingParser();
  
  responses.set(model, { content: '', status: 'loading', latency: 0, parser });
  updateTabStatus(model, 'loading');
  
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  if (contentEl) {
    contentEl.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <span class="loading-text">Connecting to ${getModelName(model)}...</span>
      </div>
    `;
  }

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    
    await new Promise((resolve, reject) => {
      let content = '';
      let firstChunk = true;

      port.onMessage.addListener((message) => {
        if (message.type === 'START') {
          if (contentEl) {
            const loadingText = contentEl.querySelector('.loading-text');
            if (loadingText) loadingText.textContent = 'Receiving response...';
          }
        } else if (message.type === 'CHUNK') {
          if (firstChunk) firstChunk = false;
          content += message.content;
          const html = parser.append(message.content);
          updateResponseContent(model, html);
        } else if (message.type === 'DONE') {
          const latency = Date.now() - startTime;
          responses.set(model, { content, status: 'done', latency, parser });
          updateTabStatus(model, 'done');
          
          const finalHtml = parseMarkdown(content);
          const el = document.getElementById(`content-${cssEscape(model)}`);
          if (el) el.innerHTML = finalHtml;
          
          finalizeResponse(model, content, latency, message.usage);
          port.disconnect();
          resolve();
        } else if (message.type === 'ERROR') {
          responses.set(model, { content: '', status: 'error', latency: 0, parser });
          updateTabStatus(model, 'error');
          showErrorInPanel(model, message.error);
          port.disconnect();
          reject(new Error(message.error));
        }
      });

      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
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
    showErrorInPanel(model, err.message || 'Connection failed');
    throw err;
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

function cssEscape(value) {
  if (CSS.escape) return CSS.escape(value);
  return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}

init();
