// ============================================
// Inline: lib/markdown.js
// ============================================

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtmlMd(text);
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
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = '<p>' + html.replace(/\n\n+/g, '</p><p>') + '</p>';
  html = html.replace(/<p><\/p>/g, '').replace(/<p>(<h[234]>)/g, '$1').replace(/(<\/h[234]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1').replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1').replace(/<p>(<pre>)/g, '$1').replace(/(<\/pre>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)<\/p>/g, '$1');
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, `<pre><code class="language-${block.lang}">${block.code}</code></pre>`);
  });
  inlineCodes.forEach((code, i) => { html = html.replace(`__INLINE_CODE_${i}__`, `<code>${code}</code>`); });
  return html;
}
function escapeHtmlMd(text) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function createStreamingParser() {
  let buffer = '';
  return { append(chunk) { buffer += chunk; return parseMarkdown(buffer); }, getContent() { return buffer; }, reset() { buffer = ''; } };
}

// ============================================
// Inline: lib/models.js
// ============================================
const MODELS = {
  // OpenAI
  'openai/gpt-5.1': { name: 'GPT-5.1', provider: 'OpenAI', inputPrice: 5, outputPrice: 15 },
  'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', inputPrice: 2.5, outputPrice: 10 },
  'openai/gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', inputPrice: 0.15, outputPrice: 0.6 },
  // Anthropic
  'anthropic/claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', provider: 'Anthropic', inputPrice: 3, outputPrice: 15 },
  'anthropic/claude-sonnet-4': { name: 'Claude Sonnet 4', provider: 'Anthropic', inputPrice: 3, outputPrice: 15 },
  'anthropic/claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPrice: 3, outputPrice: 15 },
  // Google
  'google/gemini-3-pro-preview': { name: 'Gemini 3 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5 },
  'google/gemini-3-pro-image-preview': { name: 'Gemini 3 Pro Image', provider: 'Google', inputPrice: 1.25, outputPrice: 5 },
  'google/gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', inputPrice: 0.15, outputPrice: 0.6 },
  'google/gemini-2.0-flash-001': { name: 'Gemini 2.0 Flash', provider: 'Google', inputPrice: 0.1, outputPrice: 0.4 },
  'google/gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5 },
  // Others
  'x-ai/grok-3': { name: 'Grok 3', provider: 'xAI', inputPrice: 3, outputPrice: 15 },
  'meta-llama/llama-3.1-405b-instruct': { name: 'Llama 3.1 405B', provider: 'Meta', inputPrice: 2, outputPrice: 2 },
  'deepseek/deepseek-r1': { name: 'DeepSeek R1', provider: 'DeepSeek', inputPrice: 0.55, outputPrice: 2.19 },
  'mistralai/mistral-large-2411': { name: 'Mistral Large', provider: 'Mistral', inputPrice: 2, outputPrice: 6 }
};
function getModelInfo(modelId) { return MODELS[modelId] || { name: modelId.split('/').pop(), provider: modelId.split('/')[0], inputPrice: 0, outputPrice: 0 }; }
function getModelName(modelId) { return getModelInfo(modelId).name; }
function estimateTokens(text) { return Math.ceil(text.length / 4); }
function calculateCost(modelId, inputTokens, outputTokens) {
  const info = getModelInfo(modelId);
  return { input: (inputTokens / 1_000_000) * info.inputPrice, output: (outputTokens / 1_000_000) * info.outputPrice, total: ((inputTokens / 1_000_000) * info.inputPrice) + ((outputTokens / 1_000_000) * info.outputPrice) };
}
function formatCost(cost) { if (cost < 0.0001) return '<$0.0001'; if (cost < 0.01) return `$${cost.toFixed(4)}`; return `$${cost.toFixed(3)}`; }

// ============================================
// Inline: lib/council.js
// ============================================
function generateReviewPrompt(query, responses, currentModel) {
  const otherResponses = responses.filter(r => r.model !== currentModel).map((r, i) => ({ label: `Response ${String.fromCharCode(65 + i)}`, content: r.content }));
  if (otherResponses.length === 0) return null;
  const responsesText = otherResponses.map(r => `### ${r.label}\n${r.content}`).join('\n\n---\n\n');
  return `You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

## User's Question
${query}

## Responses to Evaluate
${responsesText}

## Your Task
Rank these responses from best to worst. Output in this exact JSON format:
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "Brief reason"},
    {"response": "B", "rank": 2, "reason": "Brief reason"}
  ]
}
\`\`\`

Be objective. Focus on factual accuracy and helpfulness.`;
}

function generateChairmanPrompt(query, responses, aggregatedRanking = null) {
  const responsesText = responses.map((r, i) => `### Expert ${i + 1} (${getModelName(r.model)})\n${r.content}`).join('\n\n---\n\n');
  let rankingInfo = '';
  if (aggregatedRanking && aggregatedRanking.length > 0) {
    rankingInfo = `\n## Peer Review Ranking\nBased on peer evaluation: ${aggregatedRanking.map((r, i) => `${i + 1}. ${getModelName(r.model)}`).join(', ')}\n`;
  }
  return `You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

## User's Question
${query}

## Expert Responses
${responsesText}
${rankingInfo}
## Your Task
Create a single authoritative answer that:
1. Incorporates the best insights from all experts
2. Resolves contradictions by favoring accurate information
3. Is well-organized and comprehensive

Provide your answer directly, without meta-commentary.`;
}

function parseReviewResponse(content) {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr.trim()).rankings || JSON.parse(jsonStr.trim());
  } catch (e) { console.error('Failed to parse review:', e); return null; }
}

// ============================================
// Main App State
// ============================================
let councilModels = [];
let chairmanModel = '';
let enableReview = true;
let responses = new Map();
let reviews = new Map();
let activeTab = null;
let currentQuery = '';
let currentConversation = null; // Store current conversation data
let historyVisible = false;

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const historyBtn = document.getElementById('historyBtn');
const exportBtn = document.getElementById('exportBtn');
const modelCountEl = document.getElementById('modelCount');
const emptyState = document.getElementById('emptyState');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const dismissError = document.getElementById('dismissError');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const exportModal = document.getElementById('exportModal');
const closeExportModal = document.getElementById('closeExportModal');
const exportMd = document.getElementById('exportMd');
const exportJson = document.getElementById('exportJson');
const copyClipboard = document.getElementById('copyClipboard');

// Stage elements
const stage1Section = document.getElementById('stage1Section');
const stage2Section = document.getElementById('stage2Section');
const stage3Section = document.getElementById('stage3Section');
const modelTabs = document.getElementById('modelTabs');
const responseContainer = document.getElementById('responseContainer');
const reviewResults = document.getElementById('reviewResults');
const finalAnswer = document.getElementById('finalAnswer');
const stage1Status = document.getElementById('stage1Status');
const stage2Status = document.getElementById('stage2Status');
const stage3Status = document.getElementById('stage3Status');

// ============================================
// Initialize
// ============================================
async function init() {
  await loadSettings();
  setupEventListeners();
}

async function loadSettings() {
  const result = await chrome.storage.sync.get({ councilModels: [], chairmanModel: 'anthropic/claude-sonnet-4', enableReview: true });
  councilModels = result.councilModels;
  chairmanModel = result.chairmanModel;
  enableReview = result.enableReview;
  updateModelCount();
}

function updateModelCount() {
  modelCountEl.textContent = `${councilModels.length} model${councilModels.length !== 1 ? 's' : ''}`;
}

function setupEventListeners() {
  sendBtn.addEventListener('click', handleSend);
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); });
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  dismissError.addEventListener('click', () => errorBanner.classList.add('hidden'));

  // History
  historyBtn.addEventListener('click', toggleHistory);
  clearHistoryBtn.addEventListener('click', clearHistory);

  // Export
  exportBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
  closeExportModal.addEventListener('click', () => exportModal.classList.add('hidden'));
  exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.classList.add('hidden'); });
  exportMd.addEventListener('click', () => exportAsMarkdown());
  exportJson.addEventListener('click', () => exportAsJson());
  copyClipboard.addEventListener('click', () => copyToClipboard());

  // Toggle stage sections
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = document.getElementById(btn.dataset.target);
      const section = btn.closest('.stage-section');
      content.classList.toggle('expanded');
      section.classList.toggle('collapsed');
    });
  });

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.councilModels) councilModels = changes.councilModels.newValue || [];
    if (changes.chairmanModel) chairmanModel = changes.chairmanModel.newValue;
    if (changes.enableReview) enableReview = changes.enableReview.newValue;
    updateModelCount();
  });
}

// ============================================
// History Functions
// ============================================
async function toggleHistory() {
  historyVisible = !historyVisible;
  if (historyVisible) {
    await renderHistory();
    historyPanel.classList.remove('hidden');
  } else {
    historyPanel.classList.add('hidden');
  }
}

async function renderHistory() {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  
  if (conversations.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No history yet</div>';
    return;
  }

  historyList.innerHTML = conversations.map(conv => `
    <div class="history-item" data-id="${conv.id}">
      <div class="history-query">${escapeHtml(conv.query)}</div>
      <div class="history-meta">
        <span>${formatDate(conv.timestamp)}</span>
        <span>${conv.models?.length || 0} models</span>
      </div>
    </div>
  `).join('');

  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => loadConversation(item.dataset.id));
  });
}

async function loadConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;

  currentConversation = conv;
  historyPanel.classList.add('hidden');
  historyVisible = false;

  // Display saved conversation
  queryInput.value = conv.query;
  emptyState.classList.add('hidden');
  exportBtn.style.display = 'flex';

  // Show stages
  stage1Section.classList.remove('hidden');
  stage2Section.classList.remove('hidden', 'stage-skipped');
  stage3Section.classList.remove('hidden');

  // Render Stage 1
  renderSavedResponses(conv.responses || []);
  stage1Status.textContent = 'Loaded';
  stage1Status.className = 'stage-status done';

  // Render Stage 2
  if (conv.ranking && conv.ranking.length > 0) {
    renderReviewResults(conv.ranking);
    stage2Status.textContent = 'Complete';
    stage2Status.className = 'stage-status done';
  } else {
    stage2Section.classList.add('stage-skipped');
    stage2Status.textContent = 'Skipped';
    reviewResults.innerHTML = '<div class="skipped-message">No review data</div>';
  }

  // Render Stage 3
  if (conv.finalAnswer) {
    finalAnswer.innerHTML = `
      <div class="chairman-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        ${getModelName(conv.chairmanModel || chairmanModel)}
      </div>
      <div class="response-content">${parseMarkdown(conv.finalAnswer)}</div>
    `;
    stage3Status.textContent = 'Complete';
    stage3Status.className = 'stage-status done';
  }

  // Expand all stages for viewing
  document.getElementById('stage1Content').classList.add('expanded');
  document.getElementById('stage2Content').classList.add('expanded');
  document.getElementById('stage3Content').classList.add('expanded');
}

function renderSavedResponses(savedResponses) {
  const models = savedResponses.map(r => r.model);
  
  modelTabs.innerHTML = models.map(model => {
    const info = getModelInfo(model);
    return `<button class="tab" data-model="${model}" title="${info.provider}">${info.name}<span class="status-dot done"></span></button>`;
  }).join('');

  responseContainer.innerHTML = models.map(model => {
    const resp = savedResponses.find(r => r.model === model);
    return `
      <div class="response-panel" data-model="${model}">
        <div class="response-content" id="content-${cssEscape(model)}">${parseMarkdown(resp?.content || '')}</div>
        <div class="response-meta visible">
          <span class="meta-item">${((resp?.latency || 0) / 1000).toFixed(2)}s</span>
        </div>
      </div>
    `;
  }).join('');

  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modelTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      responseContainer.querySelectorAll('.response-panel').forEach(p => p.classList.remove('active'));
      responseContainer.querySelector(`[data-model="${tab.dataset.model}"]`)?.classList.add('active');
    });
  });

  if (models.length > 0) {
    modelTabs.querySelector('.tab')?.classList.add('active');
    responseContainer.querySelector('.response-panel')?.classList.add('active');
  }
}

async function saveCurrentConversation(data) {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  
  const conv = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    ...data
  };
  
  conversations.unshift(conv);
  if (conversations.length > 50) conversations.length = 50;
  
  await chrome.storage.local.set({ conversations });
  currentConversation = conv;
}

async function clearHistory() {
  if (!confirm('Clear all history?')) return;
  await chrome.storage.local.set({ conversations: [] });
  await renderHistory();
  showToast('History cleared');
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return date.toLocaleDateString();
}

// ============================================
// Export Functions
// ============================================
function exportAsMarkdown() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  downloadFile(`mav-${Date.now()}.md`, md, 'text/markdown');
  exportModal.classList.add('hidden');
  showToast('Exported as Markdown');
}

function exportAsJson() {
  if (!currentConversation) return;
  const json = JSON.stringify(currentConversation, null, 2);
  downloadFile(`mav-${Date.now()}.json`, json, 'application/json');
  exportModal.classList.add('hidden');
  showToast('Exported as JSON');
}

async function copyToClipboard() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  try {
    await navigator.clipboard.writeText(md);
    exportModal.classList.add('hidden');
    showToast('Copied to clipboard');
  } catch (e) {
    showToast('Failed to copy', true);
  }
}

function generateMarkdown(conv) {
  let md = `# MAV Council Response\n\n`;
  md += `**Query:** ${conv.query}\n\n`;
  md += `**Date:** ${new Date(conv.timestamp).toLocaleString()}\n\n`;
  md += `---\n\n`;

  md += `## Stage 1: Model Responses\n\n`;
  (conv.responses || []).forEach(r => {
    md += `### ${getModelName(r.model)}\n\n${r.content}\n\n`;
  });

  if (conv.ranking && conv.ranking.length > 0) {
    md += `## Stage 2: Peer Review Ranking\n\n`;
    conv.ranking.forEach((r, i) => {
      md += `${i + 1}. ${getModelName(r.model)} (avg: ${r.avgRank.toFixed(2)})\n`;
    });
    md += `\n`;
  }

  if (conv.finalAnswer) {
    md += `## Stage 3: Final Answer\n\n`;
    md += `**Chairman:** ${getModelName(conv.chairmanModel || chairmanModel)}\n\n`;
    md += conv.finalAnswer;
  }

  return md;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ============================================
// Main Send Handler
// ============================================
async function handleSend() {
  const query = queryInput.value.trim();
  if (!query || councilModels.length === 0) {
    if (!query) return;
    showError('No models selected. Please configure in Settings.');
    return;
  }

  currentQuery = query;
  currentConversation = null;
  responses.clear();
  reviews.clear();
  activeTab = null;

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>Running Council...</span>';
  emptyState.classList.add('hidden');
  errorBanner.classList.add('hidden');
  exportBtn.style.display = 'none';

  stage1Section.classList.remove('hidden');
  stage2Section.classList.remove('hidden', 'stage-skipped');
  stage3Section.classList.remove('hidden');
  
  document.getElementById('stage1Content').classList.add('expanded');
  document.getElementById('stage2Content').classList.remove('expanded');
  document.getElementById('stage3Content').classList.remove('expanded');

  stage1Status.textContent = '';
  stage1Status.className = 'stage-status';
  stage2Status.textContent = '';
  stage2Status.className = 'stage-status';
  stage3Status.textContent = '';
  stage3Status.className = 'stage-status';

  let savedResponses = [];
  let aggregatedRanking = null;
  let finalAnswerContent = '';

  try {
    // === STAGE 1 ===
    stage1Status.textContent = 'Querying...';
    stage1Status.classList.add('loading');
    
    renderTabs();
    renderResponsePanels();
    if (councilModels.length > 0) setActiveTab(councilModels[0]);

    await Promise.allSettled(councilModels.map(model => queryModel(model, query)));
    
    const successfulResponses = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'done')
      .map(([model, r]) => ({ model, content: r.content, latency: r.latency }));

    savedResponses = successfulResponses;
    stage1Status.textContent = `${successfulResponses.length}/${councilModels.length} completed`;
    stage1Status.classList.remove('loading');
    stage1Status.classList.add('done');

    document.getElementById('stage1Content').classList.remove('expanded');
    stage1Section.classList.add('collapsed');

    if (successfulResponses.length < 2) {
      showError('Need at least 2 successful responses for council.');
      resetButton();
      return;
    }

    // === STAGE 2 ===
    if (enableReview && successfulResponses.length >= 2) {
      stage2Status.textContent = 'Reviewing...';
      stage2Status.classList.add('loading');
      document.getElementById('stage2Content').classList.add('expanded');

      reviewResults.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">Models are reviewing each other...</span></div>`;

      await Promise.allSettled(councilModels.map(model => runReview(model, query, successfulResponses)));

      aggregatedRanking = aggregateRankings(successfulResponses);
      renderReviewResults(aggregatedRanking);

      stage2Status.textContent = 'Complete';
      stage2Status.classList.remove('loading');
      stage2Status.classList.add('done');
      
      document.getElementById('stage2Content').classList.remove('expanded');
      stage2Section.classList.add('collapsed');
    } else {
      stage2Section.classList.add('stage-skipped');
      stage2Status.textContent = 'Skipped';
      reviewResults.innerHTML = '<div class="skipped-message">Peer review disabled</div>';
    }

    // === STAGE 3 ===
    stage3Status.textContent = 'Synthesizing...';
    stage3Status.classList.add('loading');
    document.getElementById('stage3Content').classList.add('expanded');

    finalAnswer.innerHTML = `
      <div class="chairman-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        ${getModelName(chairmanModel)}
      </div>
      <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">Chairman is synthesizing...</span></div>
    `;

    finalAnswerContent = await runChairman(query, successfulResponses, aggregatedRanking);

    stage3Status.textContent = 'Complete';
    stage3Status.classList.remove('loading');
    stage3Status.classList.add('done');

    // Save conversation
    await saveCurrentConversation({
      query,
      models: councilModels,
      chairmanModel,
      responses: savedResponses,
      ranking: aggregatedRanking,
      finalAnswer: finalAnswerContent
    });

    exportBtn.style.display = 'flex';

  } catch (err) {
    console.error('Council error:', err);
    showError(err.message);
  }

  resetButton();
}

function resetButton() {
  sendBtn.disabled = false;
  sendBtn.innerHTML = '<span>Send</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
}

function renderTabs() {
  modelTabs.innerHTML = councilModels.map(model => {
    const info = getModelInfo(model);
    return `<button class="tab" data-model="${model}" title="${info.provider}">${info.name}<span class="status-dot"></span></button>`;
  }).join('');
  modelTabs.querySelectorAll('.tab').forEach(tab => { tab.addEventListener('click', () => setActiveTab(tab.dataset.model)); });
}

function renderResponsePanels() {
  responseContainer.innerHTML = councilModels.map(model => `
    <div class="response-panel" data-model="${model}">
      <div class="response-content" id="content-${cssEscape(model)}">
        <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">Waiting...</span></div>
      </div>
      <div class="response-meta" id="meta-${cssEscape(model)}"></div>
    </div>
  `).join('');
}

function setActiveTab(model) {
  activeTab = model;
  modelTabs.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.model === model));
  responseContainer.querySelectorAll('.response-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.model === model));
}

function updateTabStatus(model, status) {
  const tab = modelTabs.querySelector(`[data-model="${model}"]`);
  if (tab) tab.querySelector('.status-dot').className = `status-dot ${status}`;
}

function updateResponseContent(model, html) {
  const el = document.getElementById(`content-${cssEscape(model)}`);
  if (el) el.innerHTML = html + '<span class="cursor"></span>';
}

function finalizeResponse(model, content, latency) {
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  const metaEl = document.getElementById(`meta-${cssEscape(model)}`);
  if (!contentEl || !metaEl) return;
  const cursor = contentEl.querySelector('.cursor');
  if (cursor) cursor.remove();
  const cost = calculateCost(model, estimateTokens(currentQuery), estimateTokens(content));
  metaEl.innerHTML = `<span class="meta-item">${(latency / 1000).toFixed(2)}s</span><span class="meta-item">~${estimateTokens(content)} tokens</span><span class="meta-item">${formatCost(cost.total)}</span>`;
  metaEl.classList.add('visible');
}

async function queryModel(model, query) {
  const startTime = Date.now();
  const parser = createStreamingParser();
  responses.set(model, { content: '', status: 'loading', latency: 0 });
  updateTabStatus(model, 'loading');
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">Connecting to ${getModelName(model)}...</span></div>`;

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    await new Promise((resolve, reject) => {
      let content = '';
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') { content += msg.content; updateResponseContent(model, parser.append(msg.content)); }
        else if (msg.type === 'DONE') {
          const latency = Date.now() - startTime;
          responses.set(model, { content, status: 'done', latency });
          updateTabStatus(model, 'done');
          document.getElementById(`content-${cssEscape(model)}`).innerHTML = parseMarkdown(content);
          finalizeResponse(model, content, latency);
          port.disconnect();
          resolve();
        } else if (msg.type === 'ERROR') {
          responses.set(model, { content: '', status: 'error', latency: 0 });
          updateTabStatus(model, 'error');
          if (contentEl) contentEl.innerHTML = `<div class="error-state"><p>${escapeHtml(msg.error)}</p></div>`;
          port.disconnect();
          reject(new Error(msg.error));
        }
      });
      port.postMessage({ type: 'QUERY_MODEL_STREAM', payload: { model, messages: [{ role: 'user', content: query }] } });
    });
  } catch (err) {
    responses.set(model, { content: '', status: 'error', latency: 0 });
    updateTabStatus(model, 'error');
  }
}

async function runReview(reviewerModel, query, allResponses) {
  const prompt = generateReviewPrompt(query, allResponses, reviewerModel);
  if (!prompt) return;
  try {
    const result = await queryModelNonStreaming(reviewerModel, prompt);
    const rankings = parseReviewResponse(result);
    if (rankings) {
      const otherModels = allResponses.filter(r => r.model !== reviewerModel).map(r => r.model);
      reviews.set(reviewerModel, rankings.map(r => ({ model: otherModels[r.response.charCodeAt(0) - 65], rank: r.rank, reason: r.reason })));
    }
  } catch (err) { console.error(`Review by ${reviewerModel} failed:`, err); }
}

function aggregateRankings(allResponses) {
  const scores = {};
  allResponses.forEach(r => { scores[r.model] = { totalRank: 0, count: 0 }; });
  reviews.forEach((rankings) => { rankings.forEach(r => { if (scores[r.model]) { scores[r.model].totalRank += r.rank; scores[r.model].count += 1; } }); });
  return Object.entries(scores).filter(([_, v]) => v.count > 0).map(([model, v]) => ({ model, avgRank: v.totalRank / v.count })).sort((a, b) => a.avgRank - b.avgRank);
}

function renderReviewResults(ranking) {
  if (!ranking || ranking.length === 0) { reviewResults.innerHTML = '<div class="skipped-message">No review data</div>'; return; }
  const rankingHtml = ranking.map((r, i) => `<div class="ranking-item rank-${i + 1}"><span class="rank-badge">${i + 1}</span><span class="ranking-model">${getModelName(r.model)}</span><span class="ranking-score">avg: ${r.avgRank.toFixed(2)}</span></div>`).join('');
  const reasons = [];
  reviews.forEach((rankings, reviewer) => { rankings.forEach(r => { if (r.reason) reasons.push({ reviewer: getModelName(reviewer), model: getModelName(r.model), reason: r.reason }); }); });
  const reasonsHtml = reasons.length > 0 ? `<div class="review-detail"><div class="review-detail-title">Review Comments</div><div class="review-reasons">${reasons.slice(0, 6).map(r => `<div class="review-reason"><strong>${r.model}:</strong> ${escapeHtml(r.reason)}</div>`).join('')}</div></div>` : '';
  reviewResults.innerHTML = `<div class="review-summary"><div class="ranking-list">${rankingHtml}</div></div>${reasonsHtml}`;
}

async function runChairman(query, allResponses, aggregatedRanking) {
  const prompt = generateChairmanPrompt(query, allResponses, aggregatedRanking);
  const parser = createStreamingParser();
  let finalContent = '';

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    await new Promise((resolve, reject) => {
      let content = '';
      let started = false;
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          if (!started) { started = true; finalAnswer.innerHTML = `<div class="chairman-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>${getModelName(chairmanModel)}</div><div class="response-content"></div>`; }
          content += msg.content;
          finalAnswer.querySelector('.response-content').innerHTML = parser.append(msg.content) + '<span class="cursor"></span>';
        } else if (msg.type === 'DONE') {
          finalContent = content;
          const el = finalAnswer.querySelector('.response-content');
          if (el) el.innerHTML = parseMarkdown(content);
          port.disconnect();
          resolve();
        } else if (msg.type === 'ERROR') {
          finalAnswer.innerHTML = `<div class="error-state"><p>Chairman failed: ${escapeHtml(msg.error)}</p></div>`;
          port.disconnect();
          reject(new Error(msg.error));
        }
      });
      port.postMessage({ type: 'QUERY_MODEL_STREAM', payload: { model: chairmanModel, messages: [{ role: 'user', content: prompt }] } });
    });
  } catch (err) { console.error('Chairman error:', err); }

  return finalContent;
}

async function queryModelNonStreaming(model, prompt) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'QUERY_MODEL', payload: { model, messages: [{ role: 'user', content: prompt }] } }, (response) => {
      if (response?.error) reject(new Error(response.error));
      else resolve(response?.choices?.[0]?.message?.content || '');
    });
  });
}

function showError(message) { errorText.textContent = message; errorBanner.classList.remove('hidden'); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function cssEscape(value) { if (CSS.escape) return CSS.escape(value); return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&'); }

init();
