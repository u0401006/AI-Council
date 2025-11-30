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
  'google/gemini-3-pro-image-preview': { name: 'Gemini 3 Pro Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5 },
  'google/gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', inputPrice: 0.15, outputPrice: 0.6 },
  'google/gemini-2.5-flash-image-preview': { name: 'Gemini 2.5 Flash Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5 },
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
  
  // Use custom prompt with placeholders replaced
  return customReviewPrompt
    .replace('{query}', query)
    .replace('{responses}', responsesText);
}

function generateChairmanPrompt(query, responses, aggregatedRanking = null) {
  const responsesText = responses.map((r, i) => `### Expert ${i + 1} (${getModelName(r.model)})\n${r.content}`).join('\n\n---\n\n');
  let rankingInfo = '';
  if (aggregatedRanking && aggregatedRanking.length > 0) {
    rankingInfo = `## Peer Review Ranking\nBased on peer evaluation: ${aggregatedRanking.map((r, i) => `${i + 1}. ${getModelName(r.model)}`).join(', ')}`;
  }
  
  // Use custom prompt with placeholders replaced
  return customChairmanPrompt
    .replace('{query}', query)
    .replace('{responses}', responsesText)
    .replace('{ranking}', rankingInfo);
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
const IMAGE_MODELS = ['google/gemini-3-pro-image-preview', 'google/gemini-2.5-flash-image-preview'];

// Default prompts (same as options.js)
const DEFAULT_REVIEW_PROMPT = `You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

## User's Question
{query}

## Responses to Evaluate
{responses}

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

const DEFAULT_CHAIRMAN_PROMPT = `You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

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

Provide your answer directly, without meta-commentary.`;

let councilModels = [];
let chairmanModel = '';
let enableReview = true;
let enableImage = false;
let customReviewPrompt = DEFAULT_REVIEW_PROMPT;
let customChairmanPrompt = DEFAULT_CHAIRMAN_PROMPT;
let responses = new Map();
let reviews = new Map();
let activeTab = null;
let currentQuery = '';
let currentConversation = null;
let historyVisible = false;
let contextItems = []; // Array of { id, type, title, content, timestamp }

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const historyBtn = document.getElementById('historyBtn');
const exportBtn = document.getElementById('exportBtn');
const imageToggle = document.getElementById('imageToggle');
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
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');

// Context elements
const contextHeader = document.getElementById('contextHeader');
const contextToggle = document.getElementById('contextToggle');
const contextContent = document.getElementById('contextContent');
const contextBadge = document.getElementById('contextBadge');
const contextItemsEl = document.getElementById('contextItems');
const capturePageBtn = document.getElementById('capturePageBtn');
const captureSelectionBtn = document.getElementById('captureSelectionBtn');
const webSearchBtn = document.getElementById('webSearchBtn');
const pasteContextBtn = document.getElementById('pasteContextBtn');
const clearContextBtn = document.getElementById('clearContextBtn');

// Canvas elements
const canvasSection = document.getElementById('canvasSection');
const canvasBtn = document.getElementById('canvasBtn');
const canvasDropdownBtn = document.getElementById('canvasDropdownBtn');
const canvasDropdown = document.getElementById('canvasDropdown');

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
  const result = await chrome.storage.sync.get({ 
    councilModels: [], 
    chairmanModel: 'anthropic/claude-sonnet-4.5', 
    enableReview: true,
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    chairmanPrompt: DEFAULT_CHAIRMAN_PROMPT
  });
  councilModels = result.councilModels;
  chairmanModel = result.chairmanModel;
  enableReview = result.enableReview;
  customReviewPrompt = result.reviewPrompt || DEFAULT_REVIEW_PROMPT;
  customChairmanPrompt = result.chairmanPrompt || DEFAULT_CHAIRMAN_PROMPT;
  updateModelCount();
}

function updateModelCount() {
  modelCountEl.textContent = `${councilModels.length} 個模型`;
}

function setupEventListeners() {
  sendBtn.addEventListener('click', handleSend);
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); });
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  dismissError.addEventListener('click', () => errorBanner.classList.add('hidden'));

  // Image toggle
  imageToggle.addEventListener('change', () => { enableImage = imageToggle.checked; });

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

  // Lightbox
  lightbox.addEventListener('click', () => lightbox.classList.add('hidden'));
  document.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.classList.add('hidden'));

  // Context section
  contextHeader.addEventListener('click', toggleContextPanel);
  capturePageBtn.addEventListener('click', capturePageContent);
  captureSelectionBtn.addEventListener('click', captureSelection);
  webSearchBtn.addEventListener('click', webSearch);
  pasteContextBtn.addEventListener('click', pasteContext);
  clearContextBtn.addEventListener('click', clearContext);

  // Canvas button & dropdown
  canvasBtn.addEventListener('click', () => openCanvas(false));
  canvasDropdownBtn.addEventListener('click', toggleCanvasDropdown);
  canvasDropdown.querySelectorAll('.canvas-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const asWindow = item.dataset.mode === 'window';
      openCanvas(asWindow);
      canvasDropdown.classList.add('hidden');
    });
  });
  document.addEventListener('click', (e) => {
    if (!canvasDropdownBtn.contains(e.target) && !canvasDropdown.contains(e.target)) {
      canvasDropdown.classList.add('hidden');
    }
  });

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
    if (changes.reviewPrompt) customReviewPrompt = changes.reviewPrompt.newValue || DEFAULT_REVIEW_PROMPT;
    if (changes.chairmanPrompt) customChairmanPrompt = changes.chairmanPrompt.newValue || DEFAULT_CHAIRMAN_PROMPT;
    updateModelCount();
  });
}

// ============================================
// Context Functions
// ============================================

function toggleContextPanel() {
  contextContent.classList.toggle('hidden');
  contextToggle.classList.toggle('expanded');
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function capturePageContent() {
  try {
    capturePageBtn.disabled = true;
    capturePageBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span>';
    
    const tabId = await getActiveTabId();
    if (!tabId) {
      showToast('找不到使用中的分頁', true);
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTENT', tabId });
    
    if (response.error) {
      showToast(response.error, true);
      return;
    }
    
    const { title, url, content } = response;
    if (!content || content.length < 10) {
      showToast('頁面沒有內容', true);
      return;
    }
    
    addContextItem({
      type: 'page',
      title: title || url,
      content: content,
      url: url
    });
    
    showToast('已擷取頁面內容');
  } catch (err) {
    showToast('Failed to capture page: ' + err.message, true);
  } finally {
    capturePageBtn.disabled = false;
    capturePageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>擷取頁面</span>`;
  }
}

async function captureSelection() {
  try {
    captureSelectionBtn.disabled = true;
    
    const tabId = await getActiveTabId();
    if (!tabId) {
      showToast('找不到使用中的分頁', true);
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ type: 'GET_SELECTION', tabId });
    
    if (response.error) {
      showToast(response.error, true);
      return;
    }
    
    const text = response;
    if (!text || text.length < 1) {
      showToast('頁面上沒有選取文字', true);
      return;
    }
    
    addContextItem({
      type: 'selection',
      title: '選取的文字',
      content: text
    });
    
    showToast('已擷取選取內容');
  } catch (err) {
    showToast('擷取選取內容失敗：' + err.message, true);
  } finally {
    captureSelectionBtn.disabled = false;
  }
}

async function pasteContext() {
  try {
    // Try clipboard API first
    let text = '';
    try {
      text = await navigator.clipboard.readText();
    } catch (clipboardErr) {
      // Fallback: prompt user to paste manually
      text = prompt('請在此貼上內容：');
    }
    
    if (!text || text.length < 1) {
      showToast('沒有內容可貼上', true);
      return;
    }
    
    addContextItem({
      type: 'paste',
      title: '貼上的內容',
      content: text
    });
    
    showToast('已貼上內容');
  } catch (err) {
    showToast('貼上失敗：' + err.message, true);
  }
}

async function webSearch() {
  try {
    // Use queryInput value or prompt for search query
    let searchQuery = queryInput.value.trim();
    if (!searchQuery) {
      searchQuery = prompt('輸入搜尋關鍵字：');
    }
    
    if (!searchQuery || searchQuery.length < 1) {
      showToast('請輸入搜尋關鍵字', true);
      return;
    }
    
    webSearchBtn.disabled = true;
    webSearchBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span>';
    
    const response = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: searchQuery });
    
    if (response.error) {
      showToast(response.error, true);
      return;
    }
    
    const { results, query } = response;
    
    if (!results || results.length === 0) {
      showToast('找不到相關結果', true);
      return;
    }
    
    // Format search results as context content
    const content = results.map((r, i) => 
      `[${i + 1}] ${r.title}\n${r.url}\n${r.description}`
    ).join('\n\n');
    
    addContextItem({
      type: 'search',
      title: `搜尋: ${query}`,
      content: content,
      results: results
    });
    
    showToast(`已加入 ${results.length} 筆搜尋結果`);
  } catch (err) {
    showToast('搜尋失敗：' + err.message, true);
  } finally {
    webSearchBtn.disabled = false;
    webSearchBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>網搜</span>`;
  }
}

function addContextItem(item) {
  const id = crypto.randomUUID();
  const contextItem = {
    id,
    type: item.type,
    title: item.title,
    content: item.content,
    url: item.url,
    timestamp: Date.now()
  };
  
  contextItems.push(contextItem);
  renderContextItems();
  updateContextBadge();
  
  // Auto-expand if collapsed
  if (contextContent.classList.contains('hidden')) {
    contextContent.classList.remove('hidden');
    contextToggle.classList.add('expanded');
  }
}

function removeContextItem(id) {
  contextItems = contextItems.filter(item => item.id !== id);
  renderContextItems();
  updateContextBadge();
}

function clearContext() {
  contextItems = [];
  renderContextItems();
  updateContextBadge();
  showToast('已清除參考資料');
}

function updateContextBadge() {
  if (contextItems.length > 0) {
    contextBadge.textContent = contextItems.length;
    contextBadge.classList.remove('hidden');
  } else {
    contextBadge.classList.add('hidden');
  }
}

function renderContextItems() {
  if (contextItems.length === 0) {
    contextItemsEl.innerHTML = '';
    return;
  }
  
  contextItemsEl.innerHTML = contextItems.map(item => {
    const preview = item.content.slice(0, 150).replace(/\n/g, ' ');
    const charCount = item.content.length;
    const iconClass = item.type === 'page' ? 'page' : item.type === 'selection' ? 'selection' : item.type === 'search' ? 'search' : 'paste';
    const iconSvg = item.type === 'page' 
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>'
      : item.type === 'selection'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>'
      : item.type === 'search'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    
    return `
      <div class="context-item" data-id="${item.id}">
        <div class="context-item-icon ${iconClass}">${iconSvg}</div>
        <div class="context-item-body">
          <div class="context-item-title">${escapeHtml(item.title)}</div>
          <div class="context-item-preview">${escapeHtml(preview)}${charCount > 150 ? '...' : ''}</div>
          <div class="context-item-meta">${formatCharCount(charCount)}</div>
        </div>
        <button class="context-item-remove" data-id="${item.id}" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;
  }).join('');
  
  // Add remove handlers
  contextItemsEl.querySelectorAll('.context-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeContextItem(btn.dataset.id);
    });
  });
}

function formatCharCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k 字元`;
  }
  return `${count} 字元`;
}

function buildPromptWithContext(query) {
  if (contextItems.length === 0) {
    return query;
  }
  
  const contextText = contextItems.map((item, i) => {
    const header = item.url 
      ? `[Context ${i + 1}: ${item.title}]\nSource: ${item.url}\n`
      : `[Context ${i + 1}: ${item.title}]\n`;
    return header + item.content;
  }).join('\n\n---\n\n');
  
  return `以下是參考資料：

${contextText}

---

問題：${query}`;
}

function toggleCanvasDropdown(e) {
  e.stopPropagation();
  canvasDropdown.classList.toggle('hidden');
}

function openCanvas(asWindow = false) {
  chrome.runtime.sendMessage({
    type: 'OPEN_CANVAS',
    payload: currentConversation ? {
      content: currentConversation.finalAnswer,
      title: 'Council 回應',
      query: currentConversation.query,
      openAsWindow: asWindow
    } : { openAsWindow: asWindow }
  });
}

// ============================================
// Image Functions
// ============================================
function isImageModel(model) {
  return IMAGE_MODELS.some(m => model.includes(m.split('/')[1]));
}

function renderImages(images, container) {
  if (!images || images.length === 0) return;
  
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';
  
  images.forEach((imgSrc, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'generated-image';
    
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = `Generated image ${idx + 1}`;
    img.addEventListener('click', () => openLightbox(imgSrc));
    
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', (e) => { e.stopPropagation(); downloadImage(imgSrc, idx); });
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copyImageToClipboard(imgSrc); });
    
    actions.appendChild(downloadBtn);
    actions.appendChild(copyBtn);
    wrapper.appendChild(img);
    wrapper.appendChild(actions);
    gallery.appendChild(wrapper);
  });
  
  container.appendChild(gallery);
}

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
}

async function downloadImage(src, idx) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mav-image-${Date.now()}-${idx}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已下載圖片');
  } catch (e) {
    // For data URLs, direct download
    const a = document.createElement('a');
    a.href = src;
    a.download = `mav-image-${Date.now()}-${idx}.png`;
    a.click();
    showToast('已下載圖片');
  }
}

async function copyImageToClipboard(src) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    showToast('已複製圖片');
  } catch (e) {
    showToast('複製圖片失敗', true);
  }
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
    historyList.innerHTML = '<div class="history-empty">尚無歷史紀錄</div>';
    return;
  }

  historyList.innerHTML = conversations.map(conv => `
    <div class="history-item" data-id="${conv.id}">
      <div class="history-query">${escapeHtml(conv.query)}</div>
      <div class="history-meta">
        <span>${formatDate(conv.timestamp)}</span>
        <span>${conv.models?.length || 0} 個模型</span>
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
  if (conv.finalAnswer) canvasSection.classList.remove('hidden');

  // Show stages
  stage1Section.classList.remove('hidden');
  stage2Section.classList.remove('hidden', 'stage-skipped');
  stage3Section.classList.remove('hidden');

  // Render Stage 1
  renderSavedResponses(conv.responses || []);
  stage1Status.textContent = '已載入';
  stage1Status.className = 'stage-status done';

  // Render Stage 2
  if (conv.ranking && conv.ranking.length > 0) {
    renderReviewResults(conv.ranking);
    stage2Status.textContent = '完成';
    stage2Status.className = 'stage-status done';
  } else {
    stage2Section.classList.add('stage-skipped');
    stage2Status.textContent = '已跳過';
    reviewResults.innerHTML = '<div class="skipped-message">無審查資料</div>';
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
    stage3Status.textContent = '完成';
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
  if (!confirm('確定要清除所有歷史紀錄？')) return;
  await chrome.storage.local.set({ conversations: [] });
  await renderHistory();
  showToast('已清除歷史紀錄');
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-TW');
}

// ============================================
// Export Functions
// ============================================
function exportAsMarkdown() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  downloadFile(`mav-${Date.now()}.md`, md, 'text/markdown');
  exportModal.classList.add('hidden');
  showToast('已匯出 Markdown');
}

function exportAsJson() {
  if (!currentConversation) return;
  const json = JSON.stringify(currentConversation, null, 2);
  downloadFile(`mav-${Date.now()}.json`, json, 'application/json');
  exportModal.classList.add('hidden');
  showToast('已匯出 JSON');
}

async function copyToClipboard() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  try {
    await navigator.clipboard.writeText(md);
    exportModal.classList.add('hidden');
    showToast('已複製到剪貼簿');
  } catch (e) {
    showToast('複製失敗', true);
  }
}

function generateMarkdown(conv) {
  let md = `# MAV Council 回應\n\n`;
  md += `**問題：** ${conv.query}\n\n`;
  md += `**日期：** ${new Date(conv.timestamp).toLocaleString('zh-TW')}\n\n`;
  md += `---\n\n`;

  md += `## 階段 1：模型回應\n\n`;
  (conv.responses || []).forEach(r => {
    md += `### ${getModelName(r.model)}\n\n${r.content}\n\n`;
  });

  if (conv.ranking && conv.ranking.length > 0) {
    md += `## 階段 2：互評排名\n\n`;
    conv.ranking.forEach((r, i) => {
      md += `${i + 1}. ${getModelName(r.model)}（平均：${r.avgRank.toFixed(2)}）\n`;
    });
    md += `\n`;
  }

  if (conv.finalAnswer) {
    md += `## 階段 3：最終答案\n\n`;
    md += `**主席：** ${getModelName(conv.chairmanModel || chairmanModel)}\n\n`;
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
    showError('尚未選擇模型，請至設定頁面進行設定。');
    return;
  }

  currentQuery = query;
  currentConversation = null;
  responses.clear();
  reviews.clear();
  activeTab = null;

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>Council 執行中...</span>';
  emptyState.classList.add('hidden');
  errorBanner.classList.add('hidden');
  exportBtn.style.display = 'none';
  canvasSection.classList.add('hidden');

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
    stage1Status.textContent = '查詢中...';
    stage1Status.classList.add('loading');
    
    renderTabs();
    renderResponsePanels();
    if (councilModels.length > 0) setActiveTab(councilModels[0]);

    // Build prompt with context if available
    const promptWithContext = buildPromptWithContext(query);
    await Promise.allSettled(councilModels.map(model => queryModel(model, promptWithContext)));
    
    const successfulResponses = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'done')
      .map(([model, r]) => ({ model, content: r.content, latency: r.latency }));

    savedResponses = successfulResponses;
    stage1Status.textContent = `${successfulResponses.length}/${councilModels.length} 完成`;
    stage1Status.classList.remove('loading');
    stage1Status.classList.add('done');

    document.getElementById('stage1Content').classList.remove('expanded');
    stage1Section.classList.add('collapsed');

    if (successfulResponses.length < 2) {
      showError('Council 需要至少 2 個模型成功回應。');
      resetButton();
      return;
    }

    // === STAGE 2 ===
    if (enableReview && successfulResponses.length >= 2) {
      stage2Status.textContent = '審查中...';
      stage2Status.classList.add('loading');
      document.getElementById('stage2Content').classList.add('expanded');

      reviewResults.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">模型正在互相審查...</span></div>`;

      await Promise.allSettled(councilModels.map(model => runReview(model, query, successfulResponses)));

      aggregatedRanking = aggregateRankings(successfulResponses);
      renderReviewResults(aggregatedRanking);

      stage2Status.textContent = '完成';
      stage2Status.classList.remove('loading');
      stage2Status.classList.add('done');
      
      document.getElementById('stage2Content').classList.remove('expanded');
      stage2Section.classList.add('collapsed');
    } else {
      stage2Section.classList.add('stage-skipped');
      stage2Status.textContent = '已跳過';
      reviewResults.innerHTML = '<div class="skipped-message">互評審查已停用</div>';
    }

    // === STAGE 3 ===
    stage3Status.textContent = '彙整中...';
    stage3Status.classList.add('loading');
    document.getElementById('stage3Content').classList.add('expanded');

    finalAnswer.innerHTML = `
      <div class="chairman-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        ${getModelName(chairmanModel)}
      </div>
      <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">主席正在彙整...</span></div>
    `;

    finalAnswerContent = await runChairman(query, successfulResponses, aggregatedRanking);

    stage3Status.textContent = '完成';
    stage3Status.classList.remove('loading');
    stage3Status.classList.add('done');

    // Show canvas section
    canvasSection.classList.remove('hidden');

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
  sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
}

function renderTabs() {
  modelTabs.innerHTML = councilModels.map(model => {
    const info = getModelInfo(model);
    const imgBadge = isImageModel(model) && enableImage ? '<span class="model-badge-image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>IMG</span>' : '';
    return `<button class="tab" data-model="${model}" title="${info.provider}">${info.name}${imgBadge}<span class="status-dot"></span></button>`;
  }).join('');
  modelTabs.querySelectorAll('.tab').forEach(tab => { tab.addEventListener('click', () => setActiveTab(tab.dataset.model)); });
}

function renderResponsePanels() {
  responseContainer.innerHTML = councilModels.map(model => `
    <div class="response-panel" data-model="${model}">
      <div class="response-content" id="content-${cssEscape(model)}">
        <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">等待中...</span></div>
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
  metaEl.innerHTML = `
    <span class="meta-item">${(latency / 1000).toFixed(2)}s</span>
    <span class="meta-item">~${estimateTokens(content)} tokens</span>
    <span class="meta-item">${formatCost(cost.total)}</span>
    <button class="copy-response-btn" data-content="${escapeAttr(content)}" title="複製回應">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>複製</span>
    </button>
  `;
  metaEl.classList.add('visible');
  
  // Add copy handler
  metaEl.querySelector('.copy-response-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const text = btn.dataset.content;
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      btn.querySelector('span').textContent = '已複製！';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = '複製';
      }, 1500);
    } catch (err) {
      showToast('複製失敗', true);
    }
  });
}

function escapeAttr(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function queryModel(model, query) {
  const startTime = Date.now();
  const parser = createStreamingParser();
  const shouldGenerateImage = enableImage && isImageModel(model);
  
  responses.set(model, { content: '', status: 'loading', latency: 0, images: [] });
  updateTabStatus(model, 'loading');
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  
  if (shouldGenerateImage) {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">使用 ${getModelName(model)} 生成圖片中...</span></div><div class="image-generating"><div class="spinner-large"></div><span>建立視覺內容中...</span></div>`;
  } else {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">連線至 ${getModelName(model)}...</span></div>`;
  }

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    await new Promise((resolve, reject) => {
      let content = '';
      let images = [];
      
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') { 
          content += msg.content; 
          updateResponseContent(model, parser.append(msg.content)); 
        }
        else if (msg.type === 'DONE') {
          const latency = Date.now() - startTime;
          images = msg.images || [];
          responses.set(model, { content, status: 'done', latency, images });
          updateTabStatus(model, 'done');
          
          const el = document.getElementById(`content-${cssEscape(model)}`);
          if (el) {
            el.innerHTML = parseMarkdown(content);
            if (images.length > 0) {
              renderImages(images, el);
            }
          }
          finalizeResponse(model, content, latency);
          port.disconnect();
          resolve();
        } else if (msg.type === 'ERROR') {
          responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
          updateTabStatus(model, 'error');
          if (contentEl) contentEl.innerHTML = `<div class="error-state"><p>${escapeHtml(msg.error)}</p></div>`;
          port.disconnect();
          reject(new Error(msg.error));
        }
      });
      
      port.postMessage({ 
        type: 'QUERY_MODEL_STREAM', 
        payload: { 
          model, 
          messages: [{ role: 'user', content: query }],
          enableImage: shouldGenerateImage
        } 
      });
    });
  } catch (err) {
    responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
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
  if (!ranking || ranking.length === 0) { reviewResults.innerHTML = '<div class="skipped-message">無審查資料</div>'; return; }
  const rankingHtml = ranking.map((r, i) => `<div class="ranking-item rank-${i + 1}"><span class="rank-badge">${i + 1}</span><span class="ranking-model">${getModelName(r.model)}</span><span class="ranking-score">平均：${r.avgRank.toFixed(2)}</span></div>`).join('');
  const reasons = [];
  reviews.forEach((rankings, reviewer) => { rankings.forEach(r => { if (r.reason) reasons.push({ reviewer: getModelName(reviewer), model: getModelName(r.model), reason: r.reason }); }); });
  const reasonsHtml = reasons.length > 0 ? `<div class="review-detail"><div class="review-detail-title">審查評語</div><div class="review-reasons">${reasons.slice(0, 6).map(r => `<div class="review-reason"><strong>${r.model}:</strong> ${escapeHtml(r.reason)}</div>`).join('')}</div></div>` : '';
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
