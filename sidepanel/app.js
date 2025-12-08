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
  'openai/gpt-5.1': { name: 'GPT-5.1', provider: 'OpenAI', inputPrice: 5, outputPrice: 15, canVision: true },
  'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', inputPrice: 2.5, outputPrice: 10, canVision: true },
  'openai/gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', inputPrice: 0.15, outputPrice: 0.6, canVision: true },
  // Anthropic
  'anthropic/claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  'anthropic/claude-sonnet-4': { name: 'Claude Sonnet 4', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  'anthropic/claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  // Google
  'google/gemini-3-pro-preview': { name: 'Gemini 3 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5, canVision: true },
  'google/gemini-3-pro-image-preview': { name: 'Gemini 3 Pro Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5, canVision: true },
  'google/gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', inputPrice: 0.15, outputPrice: 0.6, canVision: true },
  'google/gemini-2.5-flash-image-preview': { name: 'Gemini 2.5 Flash Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5, canVision: true },
  'google/gemini-2.0-flash-001': { name: 'Gemini 2.0 Flash', provider: 'Google', inputPrice: 0.1, outputPrice: 0.4, canVision: true },
  'google/gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5, canVision: true },
  // Others
  'x-ai/grok-3': { name: 'Grok 3', provider: 'xAI', inputPrice: 3, outputPrice: 15, canVision: true },
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
  const basePrompt = customChairmanPrompt
    .replace('{query}', query)
    .replace('{responses}', responsesText)
    .replace('{ranking}', rankingInfo);
  
  // Append output style instructions from settings
  return basePrompt + getOutputStyleInstructions();
}

function parseReviewResponse(content) {
  try {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const parsed = JSON.parse(jsonStr.trim());
    const rankings = parsed.rankings || parsed;
    if (!Array.isArray(rankings)) {
      return { error: '回應格式錯誤：rankings 不是陣列', raw: content };
    }
    return { success: true, rankings };
  } catch (e) {
    console.error('Failed to parse review:', e);
    return { error: `JSON 解析失敗: ${e.message}`, raw: content };
  }
}

// Track review failures for retry functionality
let reviewFailures = new Map(); // model -> { error, raw, query, allResponses }

// ============================================
// Main App State
// ============================================
const IMAGE_MODELS = ['google/gemini-3-pro-image-preview', 'google/gemini-2.5-flash-image-preview'];
const DEFAULT_IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

// Default prompts (same as options.js)
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

let councilModels = [];
let chairmanModel = '';
let enableReview = true;
let enableImage = false;
let enableSearchMode = false;
let maxSearchIterations = 5;
let searchIteration = 0;
let currentSearchQueries = [];
let customReviewPrompt = DEFAULT_REVIEW_PROMPT;
let customChairmanPrompt = DEFAULT_CHAIRMAN_PROMPT;
let responses = new Map();
let reviews = new Map();
let activeTab = null;
let currentQuery = '';
let currentConversation = null;
let historyVisible = false;
let contextItems = []; // Array of { id, type, title, content, timestamp }

// Vision Council state
let visionMode = false;
let uploadedImage = null; // { dataUrl, file, width, height, name, size }
let sessionCost = { input: 0, output: 0, total: 0, imageTokens: 0 };
let visionReviewDepth = 'standard'; // 'simple', 'standard', 'deep'

// Search iteration state
let pendingSearchKeyword = null; // Selected keyword waiting for prompt edit
let isSearchIterationMode = false; // Whether we're in "edit prompt for next iteration" mode
let originalQueryBeforeIteration = ''; // Store original query for AI suggestion context

// Search strategy prompt suffix (appended when search mode is enabled)
const SEARCH_STRATEGY_SUFFIX = `

## 搜尋策略
請在回答最後**必須**提供 2-3 個搜尋關鍵詞建議，以便進一步深入探索此議題。使用以下 JSON 格式：
\`\`\`json
{"search_queries": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]}
\`\`\`
搜尋關鍵詞應該是：
- 具體、有針對性的
- 能夠補充目前回答中未涵蓋的面向
- 探索相關但尚未深入的延伸議題
即使你認為目前資訊已相當完整，仍請提供可延伸探索的方向。`;

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const newChatBtn = document.getElementById('newChatBtn');
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
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
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

// Search mode elements
const searchModeToggle = document.getElementById('searchModeToggle');
const searchStrategySection = document.getElementById('searchStrategySection');
const searchStrategies = document.getElementById('searchStrategies');
const searchIterationCounter = document.getElementById('searchIterationCounter');
const customSearchInput = document.getElementById('customSearchInput');
const customSearchBtn = document.getElementById('customSearchBtn');

// Search iteration hint elements
const searchIterationHint = document.getElementById('searchIterationHint');
const searchIterationKeyword = document.getElementById('searchIterationKeyword');
const cancelSearchIteration = document.getElementById('cancelSearchIteration');

// Canvas elements
const canvasSection = document.getElementById('canvasSection');
const canvasBtn = document.getElementById('canvasBtn');
const canvasDropdownBtn = document.getElementById('canvasDropdownBtn');
const canvasDropdown = document.getElementById('canvasDropdown');

// Branch actions elements
const branchActionsSection = document.getElementById('branchActionsSection');
const branchSearchBtn = document.getElementById('branchSearchBtn');
const branchImageBtn = document.getElementById('branchImageBtn');
const branchCanvasBtn = document.getElementById('branchCanvasBtn');

// Vision Council elements
const visionToggle = document.getElementById('visionToggle');
const visionUploadSection = document.getElementById('visionUploadSection');
const visionUploadArea = document.getElementById('visionUploadArea');
const visionFileInput = document.getElementById('visionFileInput');
const visionPreviewArea = document.getElementById('visionPreviewArea');
const visionPreviewImg = document.getElementById('visionPreviewImg');
const visionImageName = document.getElementById('visionImageName');
const visionImageSize = document.getElementById('visionImageSize');
const removeVisionImage = document.getElementById('removeVisionImage');
const costTracker = document.getElementById('costTracker');
const costTrackerDetails = document.getElementById('costTrackerDetails');
const sessionCostTotal = document.getElementById('sessionCostTotal');
const sessionCostInput = document.getElementById('sessionCostInput');
const sessionCostOutput = document.getElementById('sessionCostOutput');
const sessionImageTokens = document.getElementById('sessionImageTokens');

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

// Stepper element
const stepper = document.getElementById('stepper');

// ============================================
// Stepper Functions
// ============================================

function showStepper() {
  stepper.classList.remove('hidden');
  // Reset all steps to pending
  stepper.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active', 'done', 'skipped', 'pending');
    step.classList.add('pending');
  });
}

function hideStepper() {
  stepper.classList.add('hidden');
}

function updateStepperState(stepNumber, state) {
  const step = stepper.querySelector(`[data-step="${stepNumber}"]`);
  if (!step) return;
  
  step.classList.remove('pending', 'active', 'done', 'skipped');
  step.classList.add(state);
  
  // Update connectors
  if (state === 'done' && stepNumber < 3) {
    const connector = step.nextElementSibling;
    if (connector && connector.classList.contains('step-connector')) {
      connector.classList.add('filled');
    }
  }
}

function setStepActive(stepNumber) {
  // Set all previous steps to done
  for (let i = 1; i < stepNumber; i++) {
    updateStepperState(i, 'done');
  }
  // Set current step to active
  updateStepperState(stepNumber, 'active');
  // Set remaining steps to pending
  for (let i = stepNumber + 1; i <= 3; i++) {
    updateStepperState(i, 'pending');
  }
}

function setStepDone(stepNumber) {
  updateStepperState(stepNumber, 'done');
}

function setStepSkipped(stepNumber) {
  updateStepperState(stepNumber, 'skipped');
}

function setAllStepsDone() {
  for (let i = 1; i <= 3; i++) {
    updateStepperState(i, 'done');
  }
}

// ============================================
// Stage Summary Functions
// ============================================

const stage1Summary = document.getElementById('stage1Summary');
const stage2Summary = document.getElementById('stage2Summary');
const stage3Summary = document.getElementById('stage3Summary');

function updateStage1Summary(responsesData) {
  if (!stage1Summary) return;
  
  const completed = responsesData.filter(r => r.status === 'done').length;
  const total = responsesData.length;
  
  if (completed === 0) {
    stage1Summary.innerHTML = '';
    return;
  }
  
  // Find fastest model
  const doneResponses = responsesData.filter(r => r.status === 'done' && r.latency);
  let fastestInfo = '';
  if (doneResponses.length > 0) {
    const fastest = doneResponses.reduce((a, b) => a.latency < b.latency ? a : b);
    fastestInfo = ` · <span class="highlight">${getModelName(fastest.model)}</span> ${(fastest.latency / 1000).toFixed(1)}s`;
  }
  
  stage1Summary.innerHTML = `${completed}/${total} 完成${fastestInfo}`;
}

function updateStage2Summary(ranking) {
  if (!stage2Summary) return;
  
  if (!ranking || ranking.length === 0) {
    stage2Summary.innerHTML = '';
    return;
  }
  
  const winner = ranking[0];
  stage2Summary.innerHTML = `#1 <span class="highlight">${getModelName(winner.model)}</span>`;
}

function updateStage3Summary(chairModel) {
  if (!stage3Summary) return;
  
  if (!chairModel) {
    stage3Summary.innerHTML = '';
    return;
  }
  
  stage3Summary.innerHTML = `主席：<span class="highlight">${getModelName(chairModel)}</span>`;
}

function clearAllSummaries() {
  if (stage1Summary) stage1Summary.innerHTML = '';
  if (stage2Summary) stage2Summary.innerHTML = '';
  if (stage3Summary) stage3Summary.innerHTML = '';
}

// ============================================
// Auto-grow Textarea
// ============================================

function autoGrowTextarea() {
  // Reset height to auto to get the correct scrollHeight
  queryInput.style.height = 'auto';
  // Set height to scrollHeight, clamped by CSS min/max
  const newHeight = Math.min(Math.max(queryInput.scrollHeight, 56), 180);
  queryInput.style.height = newHeight + 'px';
}

// ============================================
// Storage Quota Utilities
// ============================================
async function checkStorageQuota() {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
    const usagePercent = (usage / quota) * 100;
    
    if (usagePercent > 80) {
      showStorageWarning(usagePercent, usage, quota);
    }
    return { usage, quota, usagePercent };
  } catch (err) {
    console.error('Failed to check storage quota:', err);
    return null;
  }
}

function showStorageWarning(percent, usage, quota) {
  const usageMB = (usage / 1024 / 1024).toFixed(2);
  const quotaMB = (quota / 1024 / 1024).toFixed(2);
  showToast(`儲存空間已使用 ${percent.toFixed(0)}% (${usageMB}/${quotaMB} MB)，建議清理歷史紀錄`, true);
}

// Wrapper for safe storage.local.set with quota error handling
async function safeStorageSet(data) {
  try {
    await chrome.storage.local.set(data);
    return { success: true };
  } catch (err) {
    if (err.message?.includes('QUOTA_BYTES') || err.message?.includes('quota')) {
      showToast('儲存空間不足，請清理歷史紀錄', true);
      return { success: false, quotaError: true, error: err };
    }
    throw err;
  }
}

// ============================================
// API Key Validation
// ============================================
let hasBraveApiKey = false;

async function checkApiKeys() {
  const result = await chrome.storage.sync.get(['apiKey', 'braveApiKey']);
  const hasOpenRouter = !!result.apiKey;
  hasBraveApiKey = !!result.braveApiKey;
  
  // Update search UI state based on Brave API key
  updateSearchUIState(hasBraveApiKey);
  
  return { hasOpenRouter, hasBrave: hasBraveApiKey };
}

function updateSearchUIState(hasBrave) {
  // Disable/enable searchModeToggle
  searchModeToggle.disabled = !hasBrave;
  if (!hasBrave && searchModeToggle.checked) {
    searchModeToggle.checked = false;
    enableSearchMode = false;
  }
  
  // Update toggle appearance
  const searchToggleLabel = searchModeToggle.closest('.search-toggle');
  if (searchToggleLabel) {
    searchToggleLabel.title = hasBrave 
      ? '啟用 AI 網搜迭代模式' 
      : '需要設定 Brave Search API 金鑰才能使用網搜功能';
    searchToggleLabel.style.opacity = hasBrave ? '1' : '0.5';
  }
  
  // Disable branchSearchBtn
  if (branchSearchBtn) {
    branchSearchBtn.disabled = !hasBrave;
    branchSearchBtn.title = hasBrave ? '延伸搜尋' : '需要設定 Brave Search API 金鑰';
  }
  
  // Disable customSearchBtn
  if (customSearchBtn) {
    customSearchBtn.disabled = !hasBrave;
  }
  
  // Disable customSearchInput
  if (customSearchInput) {
    customSearchInput.disabled = !hasBrave;
    customSearchInput.placeholder = hasBrave ? '輸入自訂關鍵字...' : '需要設定 Brave API 金鑰';
  }
  
  // Disable webSearchBtn in context section
  if (webSearchBtn) {
    webSearchBtn.disabled = !hasBrave;
    webSearchBtn.title = hasBrave ? '網路搜尋' : '需要設定 Brave Search API 金鑰';
    webSearchBtn.style.opacity = hasBrave ? '1' : '0.5';
  }
}

// ============================================
// Initialize
// ============================================
async function init() {
  await loadSettings();
  await checkApiKeys();
  await loadContextItems();
  setupEventListeners();
  setupStorageListener();
  
  // Check storage quota on startup
  await checkStorageQuota();
}

// Load context items from storage
async function loadContextItems() {
  const result = await chrome.storage.local.get('contextItems');
  contextItems = result.contextItems || [];
  renderContextItems();
  updateContextBadge();
}

// Listen for storage changes (from context menu additions and settings)
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // Local storage changes (context items)
    if (areaName === 'local' && changes.contextItems) {
      contextItems = changes.contextItems.newValue || [];
      renderContextItems();
      updateContextBadge();
      
      // Auto-expand if items were added
      if (contextItems.length > 0 && contextContent.classList.contains('hidden')) {
        contextContent.classList.remove('hidden');
        contextToggle.classList.add('expanded');
      }
    }
    
    // Sync storage changes (API keys and settings)
    if (areaName === 'sync') {
      // Update Brave API key state
      if (changes.braveApiKey) {
        hasBraveApiKey = !!changes.braveApiKey.newValue;
        updateSearchUIState(hasBraveApiKey);
      }
    }
  });
}

// Output style settings
let outputLength = 'standard';
let outputFormat = 'mixed';

async function loadSettings() {
  const result = await chrome.storage.sync.get({ 
    councilModels: [], 
    chairmanModel: 'anthropic/claude-sonnet-4.5', 
    enableReview: true,
    maxSearchIterations: 5,
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    chairmanPrompt: DEFAULT_CHAIRMAN_PROMPT,
    outputLength: 'standard',
    outputFormat: 'mixed'
  });
  councilModels = result.councilModels;
  chairmanModel = result.chairmanModel;
  enableReview = result.enableReview;
  maxSearchIterations = result.maxSearchIterations || 5;
  customReviewPrompt = result.reviewPrompt || DEFAULT_REVIEW_PROMPT;
  customChairmanPrompt = result.chairmanPrompt || DEFAULT_CHAIRMAN_PROMPT;
  outputLength = result.outputLength || 'standard';
  outputFormat = result.outputFormat || 'mixed';
  updateModelCount();
}

// Generate output style instructions based on settings
function getOutputStyleInstructions() {
  const lengthInstructions = {
    concise: '回答請控制在 500 字以內，聚焦核心重點，每個要點用 1-2 句話說明。',
    standard: '回答請控制在 800 字左右，適度展開說明重要概念。',
    detailed: '回答可詳細展開至 1200 字左右，完整涵蓋各面向。'
  };

  const formatInstructions = {
    bullet: '優先使用條列式格式，每個項目簡短扼要。',
    mixed: '依內容性質靈活選擇條列式或段落式。',
    paragraph: '使用完整段落進行說明，保持邏輯連貫。'
  };

  return `\n\n**輸出風格指引**：
- ${lengthInstructions[outputLength] || lengthInstructions.standard}
- ${formatInstructions[outputFormat] || formatInstructions.mixed}
- 避免冗長的開場白和重複說明，直接切入主題。`;
}

function updateModelCount() {
  modelCountEl.textContent = `${councilModels.length} 個模型`;
}

function setupEventListeners() {
  // 全域鍵盤事件：明確允許系統快捷鍵通過，避免擴展干擾複製/貼上等功能
  document.addEventListener('keydown', (e) => {
    // 允許 Ctrl/Cmd + C, V, X, A, Z 等系統快捷鍵通過
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'z'].includes(e.key.toLowerCase())) {
      // 不攔截，讓瀏覽器處理
      return;
    }
  }, true); // 使用捕獲階段，確保優先處理
  
  sendBtn.addEventListener('click', handleSend);
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); });
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  newChatBtn.addEventListener('click', startNewChat);
  dismissError.addEventListener('click', () => errorBanner.classList.add('hidden'));
  
  // Auto-grow textarea
  queryInput.addEventListener('input', autoGrowTextarea);
  autoGrowTextarea(); // Initial sizing

  // Image toggle
  imageToggle.addEventListener('change', () => { enableImage = imageToggle.checked; });

  // Vision toggle
  if (visionToggle) {
    visionToggle.addEventListener('change', () => { 
      visionMode = visionToggle.checked;
      if (visionMode) {
        visionUploadSection.classList.remove('hidden');
        costTracker.classList.remove('hidden');
        // Disable image generation mode when vision is enabled
        if (imageToggle.checked) {
          imageToggle.checked = false;
          enableImage = false;
        }
      } else {
        visionUploadSection.classList.add('hidden');
        if (sessionCost.total === 0) {
          costTracker.classList.add('hidden');
        }
        clearUploadedImage();
      }
    });
  }

  // Vision image upload
  if (visionUploadArea) {
    visionUploadArea.addEventListener('click', () => visionFileInput?.click());
    visionUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      visionUploadArea.classList.add('dragover');
    });
    visionUploadArea.addEventListener('dragleave', () => {
      visionUploadArea.classList.remove('dragover');
    });
    visionUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      visionUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleVisionImageUpload(file);
      }
    });
  }

  if (visionFileInput) {
    visionFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleVisionImageUpload(file);
      }
    });
  }

  if (removeVisionImage) {
    removeVisionImage.addEventListener('click', clearUploadedImage);
  }

  // Cost tracker toggle details
  if (costTracker) {
    costTracker.querySelector('.cost-tracker-header')?.addEventListener('click', () => {
      costTrackerDetails?.classList.toggle('hidden');
    });
  }

  // History
  historyBtn.addEventListener('click', toggleHistory);
  clearHistoryBtn.addEventListener('click', clearHistory);
  closeHistoryBtn.addEventListener('click', closeHistory);

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
  pasteContextBtn.addEventListener('click', pasteContext);
  clearContextBtn.addEventListener('click', clearContext);
  
  // Web search button in context section
  if (webSearchBtn) {
    webSearchBtn.addEventListener('click', handleWebSearchFromContext);
  }

  // Search mode toggle
  searchModeToggle.addEventListener('change', () => { 
    // Check Brave API key before enabling search mode
    if (searchModeToggle.checked && !hasBraveApiKey) {
      searchModeToggle.checked = false;
      showToast('需要設定 Brave Search API 金鑰才能使用網搜功能', true);
      return;
    }
    enableSearchMode = searchModeToggle.checked;
    if (!enableSearchMode) {
      searchStrategySection.classList.add('hidden');
    }
  });

  // Custom search button (用按鈕啟動，不用 enter)
  customSearchBtn.addEventListener('click', () => {
    // Check Brave API key
    if (!hasBraveApiKey) {
      showToast('需要設定 Brave Search API 金鑰才能使用網搜功能', true);
      return;
    }
    const query = customSearchInput.value.trim();
    if (query) {
      prepareSearchIteration(query);
      customSearchInput.value = '';
    }
  });

  // Cancel search iteration
  cancelSearchIteration.addEventListener('click', cancelSearchIterationMode);

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

  // Branch action buttons
  branchSearchBtn.addEventListener('click', handleBranchSearch);
  branchImageBtn.addEventListener('click', handleBranchImage);
  branchCanvasBtn.addEventListener('click', () => openCanvas(false));

  // Toggle stage sections (accordion mode - only one expanded at a time)
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = document.getElementById(btn.dataset.target);
      const section = btn.closest('.stage-section');
      const isCurrentlyExpanded = content.classList.contains('expanded');
      
      // Collapse all other stage sections first (accordion behavior)
      document.querySelectorAll('.stage-section').forEach(otherSection => {
        if (otherSection !== section) {
          const otherContent = otherSection.querySelector('.stage-content');
          if (otherContent) {
            otherContent.classList.remove('expanded');
            otherSection.classList.add('collapsed');
          }
        }
      });
      
      // Toggle current section
      if (isCurrentlyExpanded) {
        content.classList.remove('expanded');
        section.classList.add('collapsed');
      } else {
        content.classList.add('expanded');
        section.classList.remove('collapsed');
      }
    });
  });
  
  // Also allow clicking on stage header to toggle
  document.querySelectorAll('.stage-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't trigger if clicking on toggle button (it has its own handler)
      if (e.target.closest('.toggle-btn')) return;
      const toggleBtn = header.querySelector('.toggle-btn');
      if (toggleBtn) toggleBtn.click();
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (changes.councilModels) councilModels = changes.councilModels.newValue || [];
    if (changes.chairmanModel) chairmanModel = changes.chairmanModel.newValue;
    if (changes.enableReview) enableReview = changes.enableReview.newValue;
    if (changes.maxSearchIterations) maxSearchIterations = changes.maxSearchIterations.newValue || 5;
    if (changes.reviewPrompt) customReviewPrompt = changes.reviewPrompt.newValue || DEFAULT_REVIEW_PROMPT;
    if (changes.chairmanPrompt) customChairmanPrompt = changes.chairmanPrompt.newValue || DEFAULT_CHAIRMAN_PROMPT;
    if (changes.outputLength) outputLength = changes.outputLength.newValue || 'standard';
    if (changes.outputFormat) outputFormat = changes.outputFormat.newValue || 'mixed';
    if (changes.braveApiKey) {
      hasBraveApiKey = !!changes.braveApiKey.newValue;
      updateSearchUIState(hasBraveApiKey);
    }
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

async function handleWebSearchFromContext() {
  // Check Brave API key
  if (!hasBraveApiKey) {
    showToast('需要設定 Brave Search API 金鑰才能使用網搜功能', true);
    return;
  }
  
  // Prompt user for search query
  const query = prompt('請輸入搜尋關鍵字：');
  if (!query || query.trim().length === 0) {
    return;
  }
  
  webSearchBtn.disabled = true;
  webSearchBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span>';
  
  try {
    showToast(`正在搜尋「${query}」...`);
    
    // Execute Brave Search
    const searchResponse = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: query.trim() });
    
    if (searchResponse.error) {
      showToast(searchResponse.error, true);
      return;
    }
    
    const { results } = searchResponse;
    
    if (!results || results.length === 0) {
      showToast('找不到相關結果', true);
      return;
    }
    
    // Format search results as context
    let content = '';
    results.slice(0, 5).forEach((r, i) => {
      content += `[${i + 1}] ${r.title}\n`;
      content += `URL: ${r.url}\n`;
      content += `摘要: ${r.description}\n\n`;
    });
    
    // Add to context
    await addContextItem({
      type: 'search',
      title: `搜尋: ${query}`,
      content: content.trim(),
      results: results
    });
    
    showToast('已加入搜尋結果');
  } catch (err) {
    showToast('搜尋失敗：' + err.message, true);
  } finally {
    webSearchBtn.disabled = !hasBraveApiKey;
    webSearchBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><span>網搜</span>`;
  }
}

// ============================================
// Search Strategy Functions
// ============================================

function parseSearchQueries(content) {
  try {
    // Look for JSON block with search_queries
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?"search_queries"[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1]);
      return parsed.search_queries || [];
    }
    return [];
  } catch (e) {
    console.error('Failed to parse search queries:', e);
    return [];
  }
}

function extractFinalAnswer(content) {
  // Remove the search_queries JSON block from the content
  return content.replace(/```(?:json)?\s*\{[\s\S]*?"search_queries"[\s\S]*?\}\s*```/g, '').trim();
}

function updateSearchIterationCounter() {
  if (searchIterationCounter) {
    searchIterationCounter.textContent = `${searchIteration}/${maxSearchIterations} 次`;
  }
}

function renderSearchStrategies(queries) {
  currentSearchQueries = queries || [];
  
  // 只有達到搜尋次數上限時才隱藏，否則即使無建議也顯示模組（讓用戶可輸入自定義關鍵字）
  if (searchIteration >= maxSearchIterations) {
    searchStrategySection.classList.add('hidden');
    return;
  }
  
  searchStrategySection.classList.remove('hidden');
  updateSearchIterationCounter();
  
  // 如果有 AI 建議的關鍵字，顯示它們
  if (currentSearchQueries.length > 0) {
    searchStrategies.innerHTML = currentSearchQueries.map((query, i) => `
      <button class="search-query-btn" data-query="${escapeAttr(query)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>${escapeHtml(query)}</span>
      </button>
    `).join('');
    
    // Add click handlers - now calls prepareSearchIteration instead of executeSearchAndIterate
    searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
      btn.addEventListener('click', () => prepareSearchIteration(btn.dataset.query));
    });
  } else {
    // 無建議時顯示提示文字
    searchStrategies.innerHTML = '<span class="no-suggestions">AI 未提供建議，請輸入自訂關鍵字</span>';
  }
}

// ============================================
// Search Iteration Preparation Flow
// ============================================

// Step 1: User clicks a keyword -> prepare for next iteration
async function prepareSearchIteration(keyword) {
  if (searchIteration >= maxSearchIterations) {
    showToast('已達搜尋次數上限', true);
    return;
  }
  
  // Disable all search query buttons to prevent double-click
  searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
    btn.disabled = true;
  });
  customSearchBtn.disabled = true;
  customSearchInput.disabled = true;
  
  // Store the selected keyword
  pendingSearchKeyword = keyword;
  isSearchIterationMode = true;
  originalQueryBeforeIteration = currentQuery;
  
  // === 將本輪討論內容加入參考資料 ===
  const currentResponses = Array.from(responses.entries())
    .filter(([_, r]) => r.status === 'done')
    .map(([model, r]) => ({ model, content: r.content }));
  
  if (currentResponses.length > 0) {
    // 整理多模型回應 + 主席彙整
    let discussionSummary = `## 第 ${searchIteration + 1} 輪討論摘要\n\n`;
    discussionSummary += `### 問題\n${currentQuery}\n\n`;
    discussionSummary += `### 模型回應\n`;
    currentResponses.forEach((r, i) => {
      discussionSummary += `#### ${getModelName(r.model)}\n${r.content}\n\n`;
    });
    
    // 加入主席彙整（如果有）
    if (currentConversation?.finalAnswer) {
      const cleanFinalAnswer = extractFinalAnswer(currentConversation.finalAnswer);
      discussionSummary += `### 主席彙整\n${cleanFinalAnswer}\n`;
    }
    
    await addContextItem({
      type: 'discussion',
      title: `第 ${searchIteration + 1} 輪 Council 討論`,
      content: discussionSummary
    });
  }
  
  // Hide search strategy section
  searchStrategySection.classList.add('hidden');
  
  // Show the search iteration hint
  searchIterationHint.classList.remove('hidden');
  searchIterationKeyword.textContent = keyword;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // === UI Feedback: Show loading state ===
  showToast('AI 正在生成建議的延伸問題...');
  
  // Disable input and button during generation
  queryInput.disabled = true;
  queryInput.placeholder = '正在生成建議問題...';
  queryInput.classList.add('generating');
  
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>生成中...</span>';
  sendBtn.classList.add('next-iteration');
  
  try {
    const suggestedPrompt = await generateSuggestedPrompt(
      originalQueryBeforeIteration,
      keyword,
      currentResponses.map(r => r.content).join('\n\n')
    );
    
    queryInput.value = suggestedPrompt;
    autoGrowTextarea();
    showToast('已生成建議問題，可自行修改後送出');
  } catch (err) {
    console.error('Failed to generate suggested prompt:', err);
    // Fallback: use a simple template
    queryInput.value = `針對「${keyword}」進行延伸討論：${originalQueryBeforeIteration}`;
    autoGrowTextarea();
    showToast('建議生成失敗，已使用預設模板', true);
  } finally {
    // Restore input state
    queryInput.disabled = false;
    queryInput.placeholder = '輸入您的問題...';
    queryInput.classList.remove('generating');
    queryInput.focus();
    
    // Update send button to "next iteration" style (enabled)
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span>開始下一輪</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>';
  }
}

// Cancel search iteration mode
function cancelSearchIterationMode() {
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  
  // Hide the hint
  searchIterationHint.classList.add('hidden');
  
  // Restore send button
  sendBtn.disabled = false;
  sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
  sendBtn.classList.remove('next-iteration');
  
  // Restore original query
  queryInput.value = originalQueryBeforeIteration;
  queryInput.disabled = false;
  queryInput.classList.remove('generating');
  autoGrowTextarea();
  
  // Re-enable search buttons
  searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
    btn.disabled = false;
  });
  customSearchBtn.disabled = false;
  customSearchInput.disabled = false;
  
  // Show search strategy section again
  if (enableSearchMode && searchIteration < maxSearchIterations) {
    searchStrategySection.classList.remove('hidden');
  }
  
  showToast('已取消延伸搜尋');
}

// Step 2: User confirms prompt -> execute search and council
async function executeSearchIteration() {
  const newQuery = queryInput.value.trim();
  if (!newQuery) {
    showToast('請輸入問題', true);
    return;
  }
  
  const keyword = pendingSearchKeyword;
  
  // Reset iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  searchIterationHint.classList.add('hidden');
  
  // Update current query to the new one
  currentQuery = newQuery;
  
  // Reset send button
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>搜尋中...</span>';
  sendBtn.classList.remove('next-iteration');
  
  try {
    showToast(`正在搜尋「${keyword}」...`);
    
    // Execute Brave Search
    const searchResponse = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: keyword });
    
    if (searchResponse.error) {
      showToast(searchResponse.error, true);
      resetButton();
      return;
    }
    
    const { results, query } = searchResponse;
    
    if (!results || results.length === 0) {
      showToast('找不到相關結果', true);
      resetButton();
      return;
    }
    
    // Fetch full page contents for top results
    showToast('正在擷取搜尋結果內頁內容...');
    const urls = results.slice(0, 5).map(r => r.url);
    
    let pageContents = [];
    try {
      const fetchResponse = await chrome.runtime.sendMessage({ 
        type: 'FETCH_PAGE_CONTENTS', 
        urls: urls 
      });
      
      if (fetchResponse.results) {
        pageContents = fetchResponse.results;
      }
    } catch (fetchErr) {
      console.error('Page content fetch failed:', fetchErr);
      // Continue without page contents - just use snippets
    }
    
    // Format search results with page contents as context
    let content = '';
    const urlsWithStatus = [];
    
    results.slice(0, 5).forEach((r, i) => {
      content += `[${i + 1}] ${r.title}\n`;
      content += `URL: ${r.url}\n`;
      content += `摘要: ${r.description}\n`;
      
      // Add full page content if available
      const pageContent = pageContents.find(p => p.url === r.url);
      const fetchSuccess = pageContent && pageContent.content && !pageContent.error;
      
      urlsWithStatus.push({
        index: i + 1,
        title: r.title,
        url: r.url,
        fetched: fetchSuccess,
        error: pageContent?.error || null
      });
      
      if (fetchSuccess) {
        // Limit page content to avoid context explosion
        const truncatedContent = pageContent.content.slice(0, 3000);
        content += `\n內頁內容:\n${truncatedContent}${pageContent.content.length > 3000 ? '\n...(內容已截斷)' : ''}\n`;
      }
      content += '\n---\n\n';
    });
    
    // Add to context with URL status info
    await addContextItem({
      type: 'search',
      title: `搜尋: ${keyword}`,
      content: content.trim(),
      results: results,
      urlsWithStatus: urlsWithStatus
    });
    
    // Increment search iteration
    searchIteration++;
    updateSearchIterationCounter();
    
    showToast(`已加入搜尋結果，正在執行 Council...`);
    
    // Run Council with the new query
    await runCouncilIteration();
    
  } catch (err) {
    showToast('搜尋失敗：' + err.message, true);
    console.error('Search iteration error:', err);
  } finally {
    resetButton();
  }
}

// AI-based prompt suggestion for search iteration
const PROMPT_SUGGESTION_SYSTEM = `你是一位研究助理，專門幫助用戶深入探索議題。

任務：根據用戶的原始問題、選擇的延伸關鍵字，以及先前的討論內容，生成一個更聚焦、更深入的新問題。

要求：
1. 新問題應該聚焦於用戶選擇的關鍵字方向
2. 應該探索先前討論中未充分涵蓋的面向
3. 保持與原始問題的關聯性
4. 問題應該具體、可回答
5. 使用繁體中文
6. 直接輸出新問題，不要加任何解釋或前綴`;

async function generateSuggestedPrompt(originalQuery, selectedKeyword, discussionContext) {
  const userPrompt = `## 原始問題
${originalQuery}

## 用戶選擇的延伸關鍵字
${selectedKeyword}

## 先前討論摘要
${discussionContext.slice(0, 2000)}${discussionContext.length > 2000 ? '...(已截斷)' : ''}

---
請生成一個針對「${selectedKeyword}」方向的深入問題：`;

  try {
    const result = await queryModelNonStreaming(chairmanModel, PROMPT_SUGGESTION_SYSTEM + '\n\n' + userPrompt);
    return result.trim();
  } catch (err) {
    console.error('Prompt suggestion failed:', err);
    throw err;
  }
}

async function runCouncilIteration() {
  // Clear previous responses but keep context
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  
  // Reset stages UI
  stage1Section.classList.remove('collapsed');
  stage2Section.classList.remove('collapsed', 'stage-skipped');
  stage3Section.classList.remove('collapsed');
  
  document.getElementById('stage1Content').classList.add('expanded');
  document.getElementById('stage2Content').classList.remove('expanded');
  document.getElementById('stage3Content').classList.remove('expanded');
  
  stage1Status.textContent = '';
  stage1Status.className = 'stage-status';
  stage2Status.textContent = '';
  stage2Status.className = 'stage-status';
  stage3Status.textContent = '';
  stage3Status.className = 'stage-status';
  
  // Reset stepper
  showStepper();
  setStepActive(1);
  
  let savedResponses = [];
  let aggregatedRanking = null;
  let finalAnswerContent = '';
  
  try {
    // === STAGE 1 ===
    stage1Status.textContent = `迭代 ${searchIteration}: 查詢中...`;
    stage1Status.classList.add('loading');
    
    renderTabs();
    renderResponsePanels();
    if (councilModels.length > 0) setActiveTab(councilModels[0]);
    
    // Build prompt with updated context
    const promptWithContext = buildPromptWithContext(currentQuery);
    await Promise.allSettled(councilModels.map(model => queryModel(model, promptWithContext)));
    
    const successfulResponses = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'done')
      .map(([model, r]) => ({ model, content: r.content, latency: r.latency }));
    
    savedResponses = successfulResponses;
    stage1Status.textContent = `${successfulResponses.length}/${councilModels.length} 完成`;
    stage1Status.classList.remove('loading');
    stage1Status.classList.add('done');
    
    setStepDone(1);
    updateStage1Summary(successfulResponses.map(r => ({ ...r, status: 'done' })));
    
    document.getElementById('stage1Content').classList.remove('expanded');
    stage1Section.classList.add('collapsed');
    
    if (successfulResponses.length < 2) {
      showToast('Council 需要至少 2 個模型成功回應', true);
      return;
    }
    
    // === STAGE 2 ===
    if (enableReview && successfulResponses.length >= 2) {
      setStepActive(2);
      stage2Status.textContent = '審查中...';
      stage2Status.classList.add('loading');
      document.getElementById('stage2Content').classList.add('expanded');
      
      reviewResults.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">模型正在互相審查...</span></div>`;
      
      await Promise.allSettled(councilModels.map(model => runReview(model, currentQuery, successfulResponses)));
      
      aggregatedRanking = aggregateRankings(successfulResponses);
      renderReviewResults(aggregatedRanking);
      
      stage2Status.textContent = '完成';
      stage2Status.classList.remove('loading');
      stage2Status.classList.add('done');
      
      setStepDone(2);
      updateStage2Summary(aggregatedRanking);
      
      document.getElementById('stage2Content').classList.remove('expanded');
      stage2Section.classList.add('collapsed');
    } else {
      stage2Section.classList.add('stage-skipped');
      stage2Status.textContent = '已跳過';
      reviewResults.innerHTML = '<div class="skipped-message">互評審查已停用</div>';
      setStepSkipped(2);
    }
    
    // === STAGE 3 ===
    setStepActive(3);
    updateStage3Summary(chairmanModel);
    
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
    
    try {
      finalAnswerContent = await runChairman(currentQuery, successfulResponses, aggregatedRanking, enableSearchMode);
      
      stage3Status.textContent = '完成';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('done');
      
      setAllStepsDone();
      
      // Show branch actions after iteration completes
      showBranchActions();
    } catch (err) {
      stage3Status.textContent = '失敗';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('error');
      showToast(`主席彙整失敗: ${err.message}`, true);
      resetButton();
      return;
    }
    
    // Update conversation
    if (currentConversation) {
      currentConversation.responses = savedResponses;
      currentConversation.ranking = aggregatedRanking;
      currentConversation.finalAnswer = finalAnswerContent;
      currentConversation.searchIteration = searchIteration;
      currentConversation.contextItemsSnapshot = JSON.parse(JSON.stringify(contextItems)); // 更新參考資料快照
      
      // 保存更新後的 conversation 到 storage
      const result = await chrome.storage.local.get('conversations');
      const conversations = result.conversations || [];
      const idx = conversations.findIndex(c => c.id === currentConversation.id);
      if (idx >= 0) {
        conversations[idx] = currentConversation;
        await safeStorageSet({ conversations });
      }
    }
    
  } catch (err) {
    console.error('Council iteration error:', err);
    showToast('執行失敗：' + err.message, true);
  }
}

async function addContextItem(item) {
  const id = crypto.randomUUID();
  const contextItem = {
    id,
    type: item.type,
    title: item.title,
    content: item.content,
    url: item.url,
    timestamp: Date.now(),
    // Store URL status for search results
    urlsWithStatus: item.urlsWithStatus || null
  };
  
  contextItems.push(contextItem);
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Auto-expand if collapsed
  if (contextContent.classList.contains('hidden')) {
    contextContent.classList.remove('hidden');
    contextToggle.classList.add('expanded');
  }
}

async function removeContextItem(id) {
  contextItems = contextItems.filter(item => item.id !== id);
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
}

async function clearContext() {
  contextItems = [];
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  showToast('已清除參考資料');
}

// Save context items to storage
async function saveContextItems() {
  const result = await safeStorageSet({ contextItems });
  if (!result.success) {
    console.error('Failed to save context items');
  }
  // Notify background to update badge
  chrome.runtime.sendMessage({ type: 'UPDATE_CONTEXT_BADGE' });
}

const contextCharCount = document.getElementById('contextCharCount');

function updateContextBadge() {
  if (contextItems.length > 0) {
    contextBadge.textContent = contextItems.length;
    contextBadge.classList.remove('hidden');
    
    // Calculate total characters
    const totalChars = contextItems.reduce((sum, item) => sum + item.content.length, 0);
    if (contextCharCount) {
      contextCharCount.textContent = formatCharCount(totalChars);
      contextCharCount.classList.remove('hidden');
    }
  } else {
    contextBadge.classList.add('hidden');
    if (contextCharCount) {
      contextCharCount.classList.add('hidden');
    }
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
    const iconClass = item.type === 'page' ? 'page' : item.type === 'selection' ? 'selection' : item.type === 'search' ? 'search' : item.type === 'discussion' ? 'discussion' : 'paste';
    const iconSvg = item.type === 'page' 
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>'
      : item.type === 'selection'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>'
      : item.type === 'search'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      : item.type === 'discussion'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    
    // Build URL list for search items
    let urlListHtml = '';
    if (item.type === 'search' && item.urlsWithStatus && item.urlsWithStatus.length > 0) {
      urlListHtml = `
        <div class="context-item-urls">
          ${item.urlsWithStatus.map(u => `
            <div class="context-url-item ${u.fetched ? 'fetched' : 'failed'}">
              <span class="context-url-index">[${u.index}]</span>
              <span class="context-url-status" title="${u.fetched ? '內容已擷取' : (u.error || '擷取失敗')}">
                ${u.fetched 
                  ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
                  : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'}
              </span>
              <a href="${escapeAttr(u.url)}" target="_blank" class="context-url-link" title="${escapeAttr(u.title)}">${escapeHtml(truncateUrl(u.url))}</a>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <div class="context-item ${item.type === 'search' ? 'context-item-search' : ''}" data-id="${item.id}">
        <div class="context-item-icon ${iconClass}">${iconSvg}</div>
        <div class="context-item-body">
          <div class="context-item-title">${escapeHtml(item.title)}</div>
          ${urlListHtml}
          <div class="context-item-preview">${escapeHtml(preview)}${charCount > 150 ? '...' : ''}</div>
          <div class="context-item-meta">${formatCharCount(charCount)}</div>
        </div>
        <button class="context-item-remove" data-id="${item.id}" title="移除此參考資料">
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

function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname.length > 20 ? urlObj.pathname.slice(0, 20) + '...' : urlObj.pathname;
    return domain + path;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}

function formatCharCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k 字元`;
  }
  return `${count} 字元`;
}

function buildPromptWithContext(query) {
  // Get output style instructions
  const styleInstructions = getOutputStyleInstructions();
  
  if (contextItems.length === 0) {
    return query + styleInstructions;
  }
  
  const contextText = contextItems.map((item, i) => {
    const sourceNum = i + 1;
    const header = item.url 
      ? `[${sourceNum}] ${item.title}\n來源: ${item.url}\n`
      : `[${sourceNum}] ${item.title}\n`;
    return header + item.content;
  }).join('\n\n---\n\n');
  
  const citationInstruction = contextItems.length > 0 
    ? `\n\n**重要**: 回答時請使用 [1]、[2] 等編號標註引用來源。`
    : '';
  
  return `以下是參考資料：

${contextText}

---

問題：${query}${citationInstruction}${styleInstructions}`;
}

function toggleCanvasDropdown(e) {
  e.stopPropagation();
  canvasDropdown.classList.toggle('hidden');
}

// Branch action handlers
function handleBranchSearch() {
  // Check Brave API key
  if (!hasBraveApiKey) {
    showToast('需要設定 Brave Search API 金鑰才能使用網搜功能', true);
    return;
  }
  
  // Enable search mode and show search strategy section
  enableSearchMode = true;
  searchModeToggle.checked = true;
  
  // Show search strategy section if we have context
  if (searchIteration < maxSearchIterations) {
    searchStrategySection.classList.remove('hidden');
    
    // If we have AI suggested queries, show them; otherwise prompt custom input
    if (currentSearchQueries.length > 0) {
      searchStrategies.innerHTML = currentSearchQueries.map((query, i) => `
        <button class="search-query-btn" data-query="${escapeAttr(query)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>${escapeHtml(query)}</span>
        </button>
      `).join('');
      
      searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
        btn.addEventListener('click', () => prepareSearchIteration(btn.dataset.query));
      });
    } else {
      searchStrategies.innerHTML = '<span class="no-suggestions">請輸入自訂關鍵字進行延伸搜尋</span>';
    }
    
    updateSearchIterationCounter();
    showToast('請選擇或輸入延伸搜尋關鍵字');
    
    // Scroll to search section
    searchStrategySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    showToast('已達搜尋迭代上限', true);
  }
}

async function handleBranchImage() {
  if (!currentConversation || !currentConversation.finalAnswer) {
    showToast('尚無內容可供製圖', true);
    return;
  }
  
  branchImageBtn.disabled = true;
  branchImageBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span><span>準備中...</span>';
  
  try {
    const finalAnswerContent = currentConversation.finalAnswer;
    const query = currentConversation.query;
    const savedResponses = currentConversation.responses || [];
    
    // Show loading while AI generates prompts
    const promptLoadingEl = document.createElement('div');
    promptLoadingEl.className = 'image-prompt-loading';
    promptLoadingEl.innerHTML = `
      <div class="loading-indicator">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <span class="loading-text">AI 正在分析內容並設計圖像 prompt...</span>
      </div>
    `;
    finalAnswer.appendChild(promptLoadingEl);
    
    // Generate prompts with AI
    const aiResult = await generateImagePromptWithAI(query, finalAnswerContent, savedResponses);
    promptLoadingEl.remove();
    
    if (!aiResult.success) {
      showToast('AI Prompt 生成失敗，使用預設模式', true);
    } else if (aiResult.imageCount > 1) {
      showToast(`AI 識別到 ${aiResult.imageCount} 張圖片規劃`);
    }
    
    // Show multi-image editor
    showMultiImageEditor(
      aiResult,
      async (generatedImages) => {
        // Update saved conversation with image metadata
        if (currentConversation && generatedImages.length > 0) {
          currentConversation.imagePrompts = generatedImages.map(g => ({
            title: g.title,
            prompt: g.prompt
          }));
          
          const result = await chrome.storage.local.get('conversations');
          const conversations = result.conversations || [];
          const idx = conversations.findIndex(c => c.id === currentConversation.id);
          if (idx >= 0) {
            conversations[idx] = currentConversation;
            await safeStorageSet({ conversations });
          }
        }
      },
      () => {
        showToast('已關閉圖像編輯器');
      }
    );
  } catch (err) {
    console.error('Branch image error:', err);
    showToast('製圖失敗：' + err.message, true);
  } finally {
    branchImageBtn.disabled = false;
    branchImageBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <span>生成圖片</span>
    `;
  }
}

function showBranchActions() {
  branchActionsSection.classList.remove('hidden');
}

function hideBranchActions() {
  branchActionsSection.classList.add('hidden');
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
// ============================================
// Vision Council Functions
// ============================================

function handleVisionImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('請上傳有效的圖片檔案', true);
    return;
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    showToast('圖片大小超過 20MB 限制', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    
    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      uploadedImage = {
        dataUrl,
        file,
        width: img.width,
        height: img.height,
        name: file.name,
        size: file.size
      };

      // Show preview
      visionPreviewImg.src = dataUrl;
      visionImageName.textContent = file.name;
      visionImageSize.textContent = `${img.width}×${img.height} · ${formatFileSize(file.size)}`;
      
      visionUploadArea.classList.add('hidden');
      visionPreviewArea.classList.remove('hidden');

      // Update cost estimation
      updateVisionCostEstimate();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function clearUploadedImage() {
  uploadedImage = null;
  visionFileInput.value = '';
  visionPreviewImg.src = '';
  visionImageName.textContent = '';
  visionImageSize.textContent = '';
  
  visionPreviewArea.classList.add('hidden');
  visionUploadArea.classList.remove('hidden');
  
  // Reset image tokens in cost tracker
  sessionCost.imageTokens = 0;
  updateCostTrackerDisplay();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Estimate image tokens based on OpenAI's approach
// Low detail: ~85 tokens
// High detail: ~170 base + 85 per 512x512 tile
function estimateImageTokens(width, height, detail = 'high') {
  if (detail === 'low') {
    return 85;
  }
  
  // High detail calculation
  // First, scale to fit within 2048x2048
  let scaledWidth = width;
  let scaledHeight = height;
  const maxDim = 2048;
  
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    scaledWidth = Math.floor(width * scale);
    scaledHeight = Math.floor(height * scale);
  }
  
  // Then scale shortest side to 768
  const minDim = 768;
  const shortestSide = Math.min(scaledWidth, scaledHeight);
  if (shortestSide > minDim) {
    const scale = minDim / shortestSide;
    scaledWidth = Math.floor(scaledWidth * scale);
    scaledHeight = Math.floor(scaledHeight * scale);
  }
  
  // Calculate number of 512x512 tiles
  const tilesX = Math.ceil(scaledWidth / 512);
  const tilesY = Math.ceil(scaledHeight / 512);
  const totalTiles = tilesX * tilesY;
  
  // Base tokens + tokens per tile
  return 170 + (85 * totalTiles);
}

function updateVisionCostEstimate() {
  if (!uploadedImage) return;
  
  const imageTokens = estimateImageTokens(uploadedImage.width, uploadedImage.height);
  sessionCost.imageTokens = imageTokens;
  updateCostTrackerDisplay();
}

function updateCostTrackerDisplay() {
  if (sessionCostTotal) sessionCostTotal.textContent = formatCost(sessionCost.total);
  if (sessionCostInput) sessionCostInput.textContent = formatCost(sessionCost.input);
  if (sessionCostOutput) sessionCostOutput.textContent = formatCost(sessionCost.output);
  if (sessionImageTokens) sessionImageTokens.textContent = sessionCost.imageTokens.toLocaleString();
}

function addToSessionCost(modelId, inputTokens, outputTokens) {
  const cost = calculateCost(modelId, inputTokens, outputTokens);
  sessionCost.input += cost.input;
  sessionCost.output += cost.output;
  sessionCost.total += cost.total;
  updateCostTrackerDisplay();
}

function resetSessionCost() {
  sessionCost = { input: 0, output: 0, total: 0, imageTokens: 0 };
  updateCostTrackerDisplay();
}

// Check if a model supports vision
function isVisionModel(modelId) {
  const info = MODELS[modelId];
  return info?.canVision === true;
}

// Build vision message with image
function buildVisionMessage(query, imageDataUrl) {
  return {
    role: 'user',
    content: [
      { type: 'text', text: query },
      { 
        type: 'image_url', 
        image_url: { 
          url: imageDataUrl,
          detail: 'high'
        } 
      }
    ]
  };
}

// Generate Vision Review Prompt (evaluating image analyses)
function generateVisionReviewPrompt(query, responses, currentModel, includeImage = false) {
  const otherResponses = responses.filter(r => r.model !== currentModel).map((r, i) => ({ 
    label: `分析 ${String.fromCharCode(65 + i)}`, 
    content: r.content 
  }));
  if (otherResponses.length === 0) return null;
  
  const responsesText = otherResponses.map(r => `### ${r.label}\n${r.content}`).join('\n\n---\n\n');
  
  const prompt = `你是一位公正的圖像分析評審。請評估以下各個 AI 對圖片的分析結果。

**重要：你必須使用繁體中文回答。禁止使用簡體中文。**

## 原始問題
${query}

## 各方分析
${responsesText}

## 評審任務
根據以下標準評估各分析：
1. **準確性**：對圖像內容的描述是否準確
2. **完整性**：是否涵蓋了圖像的重要細節
3. **洞察力**：是否提供了有價值的解讀或見解
4. **相關性**：分析是否回應了用戶的問題

請以 JSON 格式輸出排名：
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由"},
    {"response": "B", "rank": 2, "reason": "簡短理由"}
  ]
}
\`\`\``;

  return prompt;
}

// Generate Vision Chairman Prompt
function generateVisionChairmanPrompt(query, responses, aggregatedRanking = null) {
  const responsesText = responses.map((r, i) => 
    `### 分析專家 ${i + 1} (${getModelName(r.model)})\n${r.content}`
  ).join('\n\n---\n\n');
  
  let rankingInfo = '';
  if (aggregatedRanking && aggregatedRanking.length > 0) {
    rankingInfo = `## 互評排名\n根據各專家互評結果：${aggregatedRanking.map((r, i) => `${i + 1}. ${getModelName(r.model)}`).join('、')}`;
  }
  
  const prompt = `你是 AI Council 的主席。請綜合各位專家對圖像的分析，提供一個完整且權威的最終分析報告。

**重要：你必須使用繁體中文回答。禁止使用簡體中文。英文和日文專有名詞可保留原文。**

## 原始問題
${query}

## 專家分析
${responsesText}

${rankingInfo}

## 主席任務
請創建一個綜合性的最終分析報告：
1. 整合各專家的最佳觀察和見解
2. 如有矛盾之處，以準確的資訊為準
3. 組織良好、結構清晰
4. 直接提供分析結果，不要有元評論

請以繁體中文直接回答。`;

  // Append output style instructions
  return prompt + getOutputStyleInstructions();
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
// Start New Chat - Reset all state and clear context
async function startNewChat() {
  // Reset conversation state
  currentConversation = null;
  currentQuery = '';
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  activeTab = null;
  
  // Reset search mode state
  searchIteration = 0;
  currentSearchQueries = [];
  searchStrategySection.classList.add('hidden');
  
  // Reset search iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  originalQueryBeforeIteration = '';
  searchIterationHint.classList.add('hidden');
  sendBtn.classList.remove('next-iteration');
  
  // Clear context items
  contextItems = [];
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Reset UI
  queryInput.value = '';
  autoGrowTextarea();
  emptyState.classList.remove('hidden');
  stage1Section.classList.add('hidden');
  stage2Section.classList.add('hidden');
  stage3Section.classList.add('hidden');
  canvasSection.classList.add('hidden');
  hideBranchActions();
  exportBtn.style.display = 'none';
  errorBanner.classList.add('hidden');
  hideStepper();
  clearAllSummaries();
  
  // Close history panel if open
  if (historyVisible) {
    historyPanel.classList.add('hidden');
    historyVisible = false;
  }
  
  // Focus input
  queryInput.focus();
  showToast('已開始新對話');
}

async function toggleHistory() {
  historyVisible = !historyVisible;
  if (historyVisible) {
    await renderHistory();
    historyPanel.classList.remove('hidden');
  } else {
    historyPanel.classList.add('hidden');
  }
}

function closeHistory() {
  historyVisible = false;
  historyPanel.classList.add('hidden');
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
      <div class="history-item-content">
        <div class="history-query">${escapeHtml(conv.query)}</div>
        <div class="history-meta">
          <span>${formatDate(conv.timestamp)}</span>
          <span>${conv.models?.length || 0} 個模型</span>
        </div>
      </div>
      <button class="history-delete-btn" data-id="${conv.id}" title="刪除此紀錄">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  // 綁定載入對話事件
  historyList.querySelectorAll('.history-item-content').forEach(content => {
    content.addEventListener('click', () => {
      const id = content.parentElement.dataset.id;
      loadConversation(id);
    });
  });

  // 綁定刪除事件
  historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(btn.dataset.id);
    });
  });
}

async function deleteConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  let conversations = result.conversations || [];
  conversations = conversations.filter(c => c.id !== id);
  
  try {
    await chrome.storage.local.set({ conversations });
    await renderHistory();
    showToast('已刪除紀錄');
  } catch (err) {
    if (err.message?.includes('QUOTA_BYTES')) {
      showToast('儲存失敗：空間不足', true);
    } else {
      showToast('刪除失敗：' + err.message, true);
    }
  }
}

async function loadConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;

  currentConversation = conv;
  historyPanel.classList.add('hidden');
  historyVisible = false;
  
  // Reset search iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  originalQueryBeforeIteration = '';
  searchIterationHint.classList.add('hidden');
  sendBtn.classList.remove('next-iteration');
  searchStrategySection.classList.add('hidden');

  // 載入並替換參考資料快照
  contextItems = conv.contextItemsSnapshot ? JSON.parse(JSON.stringify(conv.contextItemsSnapshot)) : [];
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // 通知使用者參考資料已替換
  if (contextItems.length > 0) {
    showToast(`已載入此對話的 ${contextItems.length} 個參考資料`);
  } else {
    showToast('此對話無參考資料');
  }

  // Display saved conversation
  queryInput.value = conv.query;
  emptyState.classList.add('hidden');
  exportBtn.style.display = 'flex';
  if (conv.finalAnswer) {
    showBranchActions();
    canvasSection.classList.add('hidden'); // Use branch actions instead
  }

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
    
    // Render saved images if any
    if (conv.generatedImages && conv.generatedImages.length > 0) {
      const imageSection = document.createElement('div');
      imageSection.className = 'final-image-section';
      imageSection.innerHTML = `<div class="image-section-title">生成的圖像</div>`;
      renderImages(conv.generatedImages, imageSection);
      finalAnswer.appendChild(imageSection);
    }
    
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
  let conversations = result.conversations || [];
  
  const conv = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contextItemsSnapshot: JSON.parse(JSON.stringify(contextItems)), // 深拷貝快照
    ...data
  };
  
  conversations.unshift(conv);
  if (conversations.length > 50) conversations.length = 50;
  
  const saveResult = await safeStorageSet({ conversations });
  if (!saveResult.success && saveResult.quotaError) {
    // Quota exceeded - try removing older conversations and retry
    while (conversations.length > 10) {
      conversations.pop();
      const retryResult = await safeStorageSet({ conversations });
      if (retryResult.success) {
        showToast('儲存空間不足，已自動清理舊紀錄', true);
        break;
      }
    }
  }
  currentConversation = conv;
}

async function clearHistory() {
  if (!confirm('確定要清除所有歷史紀錄？')) return;
  try {
    await chrome.storage.local.set({ conversations: [] });
    await renderHistory();
    showToast('已清除歷史紀錄');
  } catch (err) {
    showToast('清除失敗：' + err.message, true);
  }
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

  // Check OpenRouter API Key
  const keyResult = await chrome.storage.sync.get('apiKey');
  if (!keyResult.apiKey) {
    showError('請先設定 OpenRouter API 金鑰。點擊右上角設定按鈕進行設定。');
    return;
  }

  // Vision mode validation
  if (visionMode) {
    if (!uploadedImage) {
      showError('請先上傳要分析的圖片');
      return;
    }
    
    // Check if at least some models support vision
    const visionModels = councilModels.filter(isVisionModel);
    if (visionModels.length === 0) {
      showError('所選模型都不支援圖片分析功能，請在設定中選擇支援 Vision 的模型');
      return;
    }
    
    // Check if chairman supports vision (optional warning)
    if (!isVisionModel(chairmanModel)) {
      console.warn('Chairman model does not support vision, will use text-only synthesis');
    }
  }

  // If we're in search iteration mode, execute the iteration flow
  if (isSearchIterationMode && pendingSearchKeyword) {
    await executeSearchIteration();
    return;
  }

  currentQuery = query;
  currentConversation = null;
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  activeTab = null;
  
  // Reset session cost for new conversation (but keep if in vision mode to track total)
  if (!visionMode) {
    resetSessionCost();
  }
  
  // Reset search iteration for new query
  searchIteration = 0;
  currentSearchQueries = [];
  searchStrategySection.classList.add('hidden');
  updateSearchIterationCounter();

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>Council 執行中...</span>';
  emptyState.classList.add('hidden');
  errorBanner.classList.add('hidden');
  exportBtn.style.display = 'none';
  canvasSection.classList.add('hidden');
  hideBranchActions();

  // Clear summaries
  clearAllSummaries();

  // Show stepper and set initial state
  showStepper();
  setStepActive(1);

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
    
    // Update stepper: Stage 1 done
    setStepDone(1);
    
    // Update Stage 1 summary
    updateStage1Summary(successfulResponses.map(r => ({ ...r, status: 'done' })));

    document.getElementById('stage1Content').classList.remove('expanded');
    stage1Section.classList.add('collapsed');

    if (successfulResponses.length < 2) {
      showError('Council 需要至少 2 個模型成功回應。');
      resetButton();
      return;
    }

    // === STAGE 2 ===
    if (enableReview && successfulResponses.length >= 2) {
      // Update stepper: Stage 2 active
      setStepActive(2);
      
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
      
      // Update stepper: Stage 2 done
      setStepDone(2);
      
      // Update Stage 2 summary
      updateStage2Summary(aggregatedRanking);
      
      document.getElementById('stage2Content').classList.remove('expanded');
      stage2Section.classList.add('collapsed');
    } else {
      stage2Section.classList.add('stage-skipped');
      stage2Status.textContent = '已跳過';
      reviewResults.innerHTML = '<div class="skipped-message">互評審查已停用</div>';
      
      // Update stepper: Stage 2 skipped
      setStepSkipped(2);
    }

    // === STAGE 3 ===
    // Update stepper: Stage 3 active
    setStepActive(3);
    
    // Update Stage 3 summary
    updateStage3Summary(chairmanModel);
    
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

    try {
      finalAnswerContent = await runChairman(query, successfulResponses, aggregatedRanking, enableSearchMode);

      stage3Status.textContent = '完成';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('done');
      
      // Update stepper: All done
      setAllStepsDone();

      // Show branch actions (replaces old canvas section)
      showBranchActions();

      // Save conversation first (without images)
      await saveCurrentConversation({
        query,
        models: councilModels,
        chairmanModel,
        responses: savedResponses,
        ranking: aggregatedRanking,
        finalAnswer: finalAnswerContent,
        generatedImages: []
      });

      exportBtn.style.display = 'flex';
    } catch (err) {
      stage3Status.textContent = '失敗';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('error');
      showToast(`主席彙整失敗: ${err.message}`, true);
      resetButton();
      return;
    }

    // === IMAGE GENERATION (if enabled) ===
    if (enableImage && finalAnswerContent) {
      // Show loading while AI generates prompts
      const promptLoadingEl = document.createElement('div');
      promptLoadingEl.className = 'image-prompt-loading';
      promptLoadingEl.innerHTML = `
        <div class="loading-indicator">
          <div class="loading-dots"><span></span><span></span><span></span></div>
          <span class="loading-text">AI 正在分析內容並設計圖像 prompt...</span>
        </div>
      `;
      finalAnswer.appendChild(promptLoadingEl);
      
      // Generate prompts with AI (now supports multiple images)
      const aiResult = await generateImagePromptWithAI(query, finalAnswerContent, savedResponses);
      promptLoadingEl.remove();
      
      if (!aiResult.success) {
        showToast('AI Prompt 生成失敗，使用預設模式', true);
      } else if (aiResult.imageCount > 1) {
        showToast(`AI 識別到 ${aiResult.imageCount} 張圖片規劃`);
      }
      
      // Show multi-image editor
      showMultiImageEditor(
        aiResult,
        // onImageGenerated callback - called each time an image is generated
        async (generatedImages) => {
          // Update saved conversation with image metadata (not base64 data to avoid quota)
          if (currentConversation && generatedImages.length > 0) {
            // Only store prompts and titles, not the actual image data
            currentConversation.imagePrompts = generatedImages.map(g => ({
              title: g.title,
              prompt: g.prompt
              // image data not stored to avoid storage quota exceeded
            }));
            
            const result = await chrome.storage.local.get('conversations');
            const conversations = result.conversations || [];
            const idx = conversations.findIndex(c => c.id === currentConversation.id);
            if (idx >= 0) {
              conversations[idx] = currentConversation;
              await safeStorageSet({ conversations });
            }
          }
        },
        // onCancel
        () => {
          showToast('已關閉圖像編輯器');
        }
      );
    }

  } catch (err) {
    console.error('Council error:', err);
    showError(err.message);
  }

  resetButton();
}

function resetButton() {
  sendBtn.disabled = false;
  sendBtn.classList.remove('next-iteration');
  sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
}

function renderTabs() {
  // Always use scrollable tabs
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
  
  // Scroll active tab into view
  const activeTabEl = modelTabs.querySelector('.tab.active');
  if (activeTabEl) {
    activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function updateTabStatus(model, status) {
  const tab = modelTabs.querySelector(`.tab[data-model="${model}"]`);
  if (tab) {
    const dot = tab.querySelector('.status-dot');
    if (dot) dot.className = `status-dot ${status}`;
  }
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
  const isVisionQuery = visionMode && uploadedImage && isVisionModel(model);
  
  responses.set(model, { content: '', status: 'loading', latency: 0, images: [] });
  updateTabStatus(model, 'loading');
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  
  if (shouldGenerateImage) {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">使用 ${getModelName(model)} 生成圖片中...</span></div><div class="image-generating"><div class="spinner-large"></div><span>建立視覺內容中...</span></div>`;
  } else if (isVisionQuery) {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">使用 ${getModelName(model)} 分析圖片...</span></div><div class="vision-stage-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Vision 分析中</div>`;
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
          
          // Track cost from usage data if available
          if (msg.usage) {
            addToSessionCost(model, msg.usage.prompt_tokens || 0, msg.usage.completion_tokens || 0);
          }
          
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
      
      // Build messages based on mode
      let messages;
      if (isVisionQuery) {
        messages = [buildVisionMessage(query, uploadedImage.dataUrl)];
      } else {
        messages = [{ role: 'user', content: query }];
      }
      
      port.postMessage({ 
        type: 'QUERY_MODEL_STREAM', 
        payload: { 
          model, 
          messages,
          enableImage: shouldGenerateImage,
          visionMode: isVisionQuery
        } 
      });
    });
  } catch (err) {
    responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
    updateTabStatus(model, 'error');
  }
}

async function runReview(reviewerModel, query, allResponses) {
  // Use vision-specific review prompt if in vision mode
  const prompt = visionMode && uploadedImage
    ? generateVisionReviewPrompt(query, allResponses, reviewerModel, visionReviewDepth !== 'simple')
    : generateReviewPrompt(query, allResponses, reviewerModel);
  if (!prompt) return;
  try {
    const result = await queryModelNonStreaming(reviewerModel, prompt);
    const parseResult = parseReviewResponse(result);
    
    if (parseResult.error) {
      // Track failure for potential retry
      reviewFailures.set(reviewerModel, { 
        error: parseResult.error, 
        raw: parseResult.raw,
        query,
        allResponses
      });
      console.error(`Review parsing failed for ${reviewerModel}:`, parseResult.error);
      showToast(`${getModelName(reviewerModel)} 審查解析失敗`, true);
      return;
    }
    
    // Success - clear any previous failure
    reviewFailures.delete(reviewerModel);
    const otherModels = allResponses.filter(r => r.model !== reviewerModel).map(r => r.model);
    reviews.set(reviewerModel, parseResult.rankings.map(r => ({ 
      model: otherModels[r.response.charCodeAt(0) - 65], 
      rank: r.rank, 
      reason: r.reason 
    })));
  } catch (err) { 
    console.error(`Review by ${reviewerModel} failed:`, err);
    reviewFailures.set(reviewerModel, {
      error: `API 呼叫失敗: ${err.message}`,
      raw: '',
      query,
      allResponses
    });
    showToast(`${getModelName(reviewerModel)} 審查失敗: ${err.message}`, true);
  }
}

function aggregateRankings(allResponses) {
  const scores = {};
  allResponses.forEach(r => { scores[r.model] = { totalRank: 0, count: 0 }; });
  reviews.forEach((rankings) => { rankings.forEach(r => { if (scores[r.model]) { scores[r.model].totalRank += r.rank; scores[r.model].count += 1; } }); });
  return Object.entries(scores).filter(([_, v]) => v.count > 0).map(([model, v]) => ({ model, avgRank: v.totalRank / v.count })).sort((a, b) => a.avgRank - b.avgRank);
}

function renderReviewResults(ranking) {
  if (!ranking || ranking.length === 0) { reviewResults.innerHTML = '<div class="skipped-message">無審查資料</div>'; return; }
  const rankingHtml = ranking.map((r, i) => `<div class="ranking-item rank-${i + 1}"><span class="rank-badge">${i + 1}</span><span class="ranking-model">${getModelName(r.model)}</span><span class="ranking-score">${r.avgRank.toFixed(1)}</span></div>`).join('');
  const reasons = [];
  reviews.forEach((rankings, reviewer) => { rankings.forEach(r => { if (r.reason) reasons.push({ reviewer: getModelName(reviewer), model: getModelName(r.model), reason: r.reason }); }); });
  const reasonsHtml = reasons.length > 0 ? `<div class="review-detail collapsed"><div class="review-detail-header"><div class="review-detail-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>審查評語 (${reasons.length})</div><div class="review-detail-toggle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div><div class="review-reasons">${reasons.slice(0, 6).map(r => `<div class="review-reason"><strong>${r.model}:</strong> ${escapeHtml(r.reason)}</div>`).join('')}</div></div>` : '';
  
  // Hint explaining average score
  const hintHtml = `<div class="review-hint"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>分數 = 各模型互評排名的平均值，越低越優（作為主席彙整的參考）</div>`;
  
  // Show failures if any
  let failuresHtml = '';
  if (reviewFailures.size > 0) {
    const failureItems = Array.from(reviewFailures.entries()).map(([model, info]) => `
      <div class="review-failure-item">
        <div class="failure-header">
          <span class="failure-model">${getModelName(model)}</span>
          <span class="failure-error">${escapeHtml(info.error)}</span>
        </div>
        <button class="retry-review-btn" data-model="${model}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重試
        </button>
      </div>
    `).join('');
    failuresHtml = `<div class="review-failures"><div class="review-failures-title">審查失敗 (${reviewFailures.size})</div>${failureItems}</div>`;
  }
  
  reviewResults.innerHTML = `<div class="review-summary"><div class="ranking-list">${rankingHtml}</div>${hintHtml}</div>${reasonsHtml}${failuresHtml}`;
  
  // Add toggle handler for review detail
  const reviewDetail = reviewResults.querySelector('.review-detail');
  if (reviewDetail) {
    const detailHeader = reviewDetail.querySelector('.review-detail-header');
    detailHeader?.addEventListener('click', () => {
      reviewDetail.classList.toggle('collapsed');
    });
  }
  
  // Add retry handlers
  reviewResults.querySelectorAll('.retry-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const model = btn.dataset.model;
      const failureInfo = reviewFailures.get(model);
      if (!failureInfo) return;
      
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span> 重試中...';
      
      await runReview(model, failureInfo.query, failureInfo.allResponses);
      
      // Re-aggregate and re-render
      const successfulResponses = failureInfo.allResponses;
      const newRanking = aggregateRankings(successfulResponses);
      renderReviewResults(newRanking);
      updateStage2Summary(newRanking);
    });
  });
}

async function runChairman(query, allResponses, aggregatedRanking, withSearchMode = false) {
  // Use vision-specific chairman prompt if in vision mode
  let prompt = visionMode && uploadedImage
    ? generateVisionChairmanPrompt(query, allResponses, aggregatedRanking)
    : generateChairmanPrompt(query, allResponses, aggregatedRanking);
  
  // Append search strategy suffix if search mode is enabled and not at max iterations
  if (withSearchMode && searchIteration < maxSearchIterations) {
    prompt += SEARCH_STRATEGY_SUFFIX;
  }
  
  const parser = createStreamingParser();
  let finalContent = '';
  const isVisionChairman = visionMode && uploadedImage && isVisionModel(chairmanModel);

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    await new Promise((resolve, reject) => {
      let content = '';
      let started = false;
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          if (!started) { 
            started = true; 
            const visionBadge = isVisionChairman ? '<span class="vision-stage-badge" style="margin-left: 0.5rem; font-size: 0.625rem;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Vision</span>' : '';
            finalAnswer.innerHTML = `<div class="chairman-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>${getModelName(chairmanModel)}${visionBadge}</div><div class="response-content"></div>`; 
          }
          content += msg.content;
          finalAnswer.querySelector('.response-content').innerHTML = parser.append(msg.content) + '<span class="cursor"></span>';
        } else if (msg.type === 'DONE') {
          finalContent = content;
          const el = finalAnswer.querySelector('.response-content');
          
          // Track cost from usage data if available
          if (msg.usage) {
            addToSessionCost(chairmanModel, msg.usage.prompt_tokens || 0, msg.usage.completion_tokens || 0);
          }
          
          // If search mode is enabled, extract and display search strategies
          if (withSearchMode) {
            const searchQueries = parseSearchQueries(content);
            const cleanContent = extractFinalAnswer(content);
            if (el) el.innerHTML = parseMarkdown(cleanContent);
            
            // 只要搜尋模式啟用且未達上限，就顯示搜尋模組（即使無建議也讓用戶可輸入自定義關鍵字）
            if (searchIteration < maxSearchIterations) {
              renderSearchStrategies(searchQueries);
            }
          } else {
            if (el) el.innerHTML = parseMarkdown(content);
          }
          
          port.disconnect();
          resolve();
        } else if (msg.type === 'ERROR') {
          finalAnswer.innerHTML = `<div class="error-state"><p>Chairman failed: ${escapeHtml(msg.error)}</p></div>`;
          port.disconnect();
          reject(new Error(msg.error));
        }
      });
      
      // Build messages - include image for vision chairman
      let messages;
      if (isVisionChairman) {
        messages = [buildVisionMessage(prompt, uploadedImage.dataUrl)];
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      
      port.postMessage({ 
        type: 'QUERY_MODEL_STREAM', 
        payload: { 
          model: chairmanModel, 
          messages,
          visionMode: isVisionChairman
        } 
      });
    });
  } catch (err) {
    console.error('Chairman error:', err);
    finalAnswer.innerHTML = `<div class="error-state"><p>主席彙整失敗: ${escapeHtml(err.message)}</p></div>`;
    throw err;
  }

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

// AI-based multi-image prompt generation
const IMAGE_PROMPT_SYSTEM = `你是視覺設計專家和圖像生成 Prompt 工程師。根據提供的內容，分析主題並生成適合的圖像描述。

## 核心原則（必讀）
1. **完整自然語句**：用完整句子描述，像對人類設計師溝通，不要只丟關鍵字
2. **用途優先**：每張圖的 prompt 開頭先說明用途情境（如：用於財報簡報的資訊圖表、YouTube 縮圖、教學海報）
3. **具體勝過抽象**：描述主體、場景、光影、材質，勝過「美麗的」「專業的」等形容詞

## 分析規則
1. 仔細分析內容是否規劃了多張圖片/圖卡/資訊圖表
2. 如果內容明確規劃了多張圖，為每張圖生成獨立的 prompt
3. 如果沒有明確規劃，根據內容複雜度決定是否需要多張圖（1-5張）
4. 每張圖的選項應與該圖主題高度相關，而非通用選項
5. 抽象概念應設計象徵性的視覺表達

## Prompt 撰寫技巧（根據主題類型）

### 資訊圖表/數據視覺化 (theme_type: data)
- 明確指定版面風格：「科技感雜誌排版」「工程技術藍圖」「手繪白板風」「現代化資訊圖表」
- 清楚列出必須出現的文字項目和數據標籤
- 指定文字排版方向（橫式/直式）與層級

### 人物/角色場景 (theme_type: narrative)
- 指定表情、姿勢、畫面位置（如「人在左側，驚訝表情，手指向右邊主題」）
- 如需多張圖，註明「保持人物臉部特徵與服裝在所有圖片中一致」
- 結合構圖元素：高飽和背景、粗體大標、箭頭/圈選（病毒式縮圖構圖）

### 產品/物件 (theme_type: concrete)
- 具體描述材質紋理（如「漢堡麵包焦脆裂紋、起司融化反光」）
- 可用「4K 解析度」「high fidelity render」提升品質
- 可加「解構視圖＋文字標註每一層的名稱與特性」

### 抽象概念 (theme_type: abstract)
- 設計象徵性視覺表達，用具體物件隱喻抽象概念
- 指定光影風格（如「強烈邊光」「柔和自然光」）
- 可用白板/流程圖呈現思考推理過程

## 結構控制指令（可選）
- 構圖位置：「主體置中」「三分法構圖」「對角線構圖」
- 視角控制：「俯視45度」「正面平視」「廣角透視」
- 比例指定：「16:9 橫幅」「1:1 方形」「9:16 直式」
- 維度轉換：「2D 平面圖轉 3D 室內設計」「3D 轉像素風」

你必須輸出 JSON 格式：
\`\`\`json
{
  "image_count": 3,
  "theme_type": "abstract|concrete|narrative|data",
  "use_case": "用途說明（如：社群貼文、簡報配圖、教學素材）",
  "images": [
    {
      "title": "圖卡標題",
      "use_case": "此圖的具體用途",
      "description": "這張圖的目的和內容說明",
      "scene_description": "詳細的場景描述，包含主體、環境、光線、氛圍",
      "composition": "構圖與視角指令",
      "text_elements": ["需要出現在圖中的文字項目（如有）"],
      "material_detail": "材質與紋理描述",
      "option_groups": [
        {
          "name": "選項組名稱",
          "options": ["選項1", "選項2", "選項3"]
        }
      ],
      "style_options": ["風格1", "風格2", "風格3"],
      "color_palette": ["色調1", "色調2", "色調3"],
      "resolution_hint": "4K|高清|標準",
      "final_prompt": "直接可用的完整圖像生成 prompt（150-250字，用完整自然語句，開頭先寫用途）"
    }
  ]
}
\`\`\``;

async function generateImagePromptWithAI(query, finalContent, allResponses) {
  // Compile all content for analysis
  const responseSummary = allResponses
    .map(r => `【${getModelName(r.model)}】\n${r.content.slice(0, 500)}...`)
    .join('\n\n');
  
  const analysisPrompt = `請分析以下 Council 討論內容，識別是否規劃了多張圖片，並為每張圖生成獨立的 Prompt。

## 原始問題
${query}

## 各模型回應摘要
${responseSummary}

## 最終彙整答案
${finalContent.slice(0, 2500)}

---
請根據以上內容：
1. 識別內容是否規劃了多張圖卡/資訊圖表（注意看是否有「圖卡一」「圖卡二」等標記）
2. 如果有多張圖的規劃，為每張圖生成獨立的 prompt 和選項
3. 如果沒有明確規劃，根據內容決定需要幾張圖來完整呈現
4. 每張圖的選項應與該圖主題相關，不要使用通用的「性別/服裝」等選項`;

  try {
    // Use chairman model for consistency
    const result = await queryModelNonStreaming(chairmanModel, IMAGE_PROMPT_SYSTEM + '\n\n' + analysisPrompt);
    
    // Parse JSON from response with error tolerance
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : result;
    
    // Try to extract JSON object if there's extra text
    const jsonObjMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) jsonStr = jsonObjMatch[0];
    
    // Clean up common JSON issues
    jsonStr = jsonStr
      .trim()
      .replace(/,\s*([}\]])/g, '$1')  // Remove trailing commas
      .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)\1\s*:/g, '"$2":')  // Ensure property names are double-quoted
      .replace(/:\s*'([^']*)'/g, ':"$1"');  // Convert single-quoted values to double-quoted
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      // If still fails, try to fix truncated JSON by closing brackets
      console.warn('JSON parse failed, attempting repair:', parseErr.message);
      let repaired = jsonStr;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
      repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
      parsed = JSON.parse(repaired);
    }
    
    // Normalize to multi-image structure
    const imageCount = parsed.image_count || 1;
    const images = parsed.images || [];
    
    // If old single-image format, convert to array
    if (images.length === 0 && parsed.final_prompt) {
      images.push({
        title: '圖像',
        use_case: parsed.use_case || '',
        description: parsed.scene_description || '',
        scene_description: parsed.scene_description || '',
        composition: parsed.composition || '',
        text_elements: parsed.text_elements || [],
        material_detail: parsed.material_detail || '',
        option_groups: parsed.option_groups || [],
        style_options: parsed.style_options || [],
        color_palette: parsed.color_palette || [],
        resolution_hint: parsed.resolution_hint || '高清',
        final_prompt: parsed.final_prompt
      });
    }
    
    return {
      success: true,
      imageCount: images.length || imageCount,
      themeType: parsed.theme_type || 'concrete',
      useCase: parsed.use_case || '',
      images: images.map((img, idx) => ({
        id: `img-${idx}`,
        title: img.title || `圖像 ${idx + 1}`,
        useCase: img.use_case || '',
        description: img.description || '',
        sceneDescription: img.scene_description || '',
        composition: img.composition || '',
        textElements: img.text_elements || [],
        materialDetail: img.material_detail || '',
        optionGroups: img.option_groups || [],
        styleOptions: img.style_options || [],
        colorPalette: img.color_palette || [],
        resolutionHint: img.resolution_hint || '高清',
        finalPrompt: img.final_prompt || '',
        status: 'pending', // pending | generating | done | error
        generatedImage: null,
        error: null
      }))
    };
  } catch (err) {
    console.error('AI prompt generation failed:', err);
    return {
      success: false,
      error: err.message,
      imageCount: 1,
      useCase: '',
      images: [{
        id: 'img-0',
        title: '圖像',
        useCase: '',
        description: '',
        sceneDescription: '',
        composition: '',
        textElements: [],
        materialDetail: '',
        optionGroups: [],
        styleOptions: ['寫實攝影風格', '油畫風', '水彩', '動畫風', '電影感'],
        colorPalette: ['暖色調', '冷色調', '高對比', '柔和'],
        resolutionHint: '高清',
        finalPrompt: '',
        status: 'pending',
        generatedImage: null,
        error: null
      }]
    };
  }
}

// Multi-image editor state
let multiImageState = null;

function showMultiImageEditor(aiResult, onAllComplete, onCancel) {
  const hasAIResult = aiResult && aiResult.success;
  const images = aiResult?.images || [];
  const imageCount = images.length;
  
  // Collect all unique style and color options from all images
  const allStyleOptions = new Set(['寫實攝影風格', '油畫風', '水彩', '動畫風', '電影感', '賽博龐克', '極簡風格', '插畫風']);
  const allColorOptions = new Set(['暖色調', '冷色調', '高對比', '柔和', '復古色調', '霓虹色', '單色調']);
  images.forEach(img => {
    (img.styleOptions || []).forEach(s => allStyleOptions.add(s));
    (img.colorPalette || []).forEach(c => allColorOptions.add(c));
  });
  
  // Initialize state for tracking each image + global style
  multiImageState = {
    images: images.map(img => ({ ...img })),
    completedCount: 0,
    generatedImages: [],
    globalStyle: null,  // Will be set when user selects
    globalColor: null   // Will be set when user selects
  };
  
  // Theme type badge
  const themeTypeBadge = hasAIResult && aiResult.themeType 
    ? `<span class="theme-type-badge ${aiResult.themeType}">${
        aiResult.themeType === 'abstract' ? '抽象概念' :
        aiResult.themeType === 'narrative' ? '敘事場景' :
        aiResult.themeType === 'data' ? '數據視覺化' : '具體場景'
      }</span>` 
    : '';
  
  // Global style section HTML
  const globalStyleHtml = `
    <div class="global-style-section">
      <div class="global-style-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>統一風格設定</span>
        <span class="global-style-hint">套用至所有圖卡（各圖卡可覆寫）</span>
      </div>
      <div class="global-style-options">
        <div class="quick-option-group">
          <label class="quick-option-label">畫風</label>
          <div class="quick-option-chips global-chips" data-global-category="style">
            ${[...allStyleOptions].map(s => `<button class="option-chip global-chip" data-value="${escapeAttr(s)}">${escapeHtml(s)}</button>`).join('')}
          </div>
        </div>
        <div class="quick-option-group">
          <label class="quick-option-label">色調</label>
          <div class="quick-option-chips global-chips" data-global-category="color">
            ${[...allColorOptions].map(c => `<button class="option-chip global-chip" data-value="${escapeAttr(c)}">${escapeHtml(c)}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Build image cards HTML (without style/color options - they use global)
  const imageCardsHtml = images.map((img, idx) => {
    const optionGroupsHtml = (img.optionGroups || []).map(group => `
      <div class="quick-option-group">
        <label class="quick-option-label">${escapeHtml(group.name)}</label>
        <div class="quick-option-chips" data-category="${escapeAttr(group.name)}" data-image-idx="${idx}">
          ${group.options.map(opt => `<button class="option-chip" data-value="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`).join('')}
        </div>
      </div>
    `).join('');
    
    return `
      <div class="image-card" data-image-idx="${idx}" data-status="pending">
        <div class="image-card-header">
          <div class="image-card-number">${idx + 1}</div>
          <div class="image-card-title-area">
            <h4 class="image-card-title">${escapeHtml(img.title)}</h4>
            ${img.description ? `<p class="image-card-desc">${escapeHtml(img.description)}</p>` : ''}
          </div>
          <div class="image-card-status">
            <span class="status-badge pending">待編輯</span>
          </div>
        </div>
        
        <div class="image-card-content">
          ${optionGroupsHtml ? `<div class="prompt-quick-options compact">${optionGroupsHtml}</div>` : ''}
          
          <div class="prompt-editor-textarea-wrapper">
            <textarea class="prompt-editor-textarea image-prompt-textarea" data-image-idx="${idx}" rows="5">${escapeHtml(img.finalPrompt || '')}</textarea>
            <div class="textarea-hint">統一風格會自動套用，此處僅需編輯內容描述</div>
          </div>
          
          <div class="image-card-actions">
            <button class="generate-single-btn" data-image-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              生成此圖
            </button>
          </div>
        </div>
        
        <div class="image-card-result hidden">
          <!-- Generated image will appear here -->
        </div>
      </div>
    `;
  }).join('');
  
  const editorHtml = `
    <div class="multi-image-editor">
      <div class="multi-image-header">
        <div class="multi-image-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          圖像生成編輯器
          ${themeTypeBadge}
          <span class="image-count-badge">${imageCount} 張圖</span>
        </div>
        <div class="multi-image-progress">
          <span class="progress-text"><span id="completedCount">0</span> / ${imageCount} 完成</span>
        </div>
      </div>
      
      ${globalStyleHtml}
      
      <div class="image-cards-container">
        ${imageCardsHtml}
      </div>
      
      <div class="multi-image-footer">
        <button class="prompt-editor-btn secondary" id="cancelAllImageGen">關閉</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.className = 'multi-image-editor-section';
  container.innerHTML = editorHtml;
  finalAnswer.appendChild(container);

  // Setup global style chip handlers
  container.querySelectorAll('.global-chips').forEach(chipsContainer => {
    const category = chipsContainer.dataset.globalCategory;
    chipsContainer.querySelectorAll('.global-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.value;
        const currentValue = category === 'style' ? multiImageState.globalStyle : multiImageState.globalColor;
        
        // Toggle selection
        if (currentValue === value) {
          // Deselect
          if (category === 'style') multiImageState.globalStyle = null;
          else multiImageState.globalColor = null;
          chip.classList.remove('selected');
        } else {
          // Select new value
          if (category === 'style') multiImageState.globalStyle = value;
          else multiImageState.globalColor = value;
          chipsContainer.querySelectorAll('.global-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        }
        
        // Update display showing current global style
        updateGlobalStyleDisplay();
      });
    });
  });
  
  // Function to update global style display
  function updateGlobalStyleDisplay() {
    const styleText = [];
    if (multiImageState.globalStyle) styleText.push(multiImageState.globalStyle);
    if (multiImageState.globalColor) styleText.push(multiImageState.globalColor);
    
    const hint = container.querySelector('.global-style-hint');
    if (hint) {
      hint.textContent = styleText.length > 0 
        ? `已選：${styleText.join(' + ')}` 
        : '套用至所有圖卡（各圖卡可覆寫）';
      hint.classList.toggle('has-selection', styleText.length > 0);
    }
  }

  // Setup event handlers for each image card
  container.querySelectorAll('.image-card').forEach(card => {
    const idx = parseInt(card.dataset.imageIdx);
    const textarea = card.querySelector('.image-prompt-textarea');
    const selectedOptions = new Map();
    
    // Option chip click handler
    card.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.value;
        const category = chip.closest('.quick-option-chips').dataset.category;
        const currentText = textarea.value;
        const prevValue = selectedOptions.get(category);
        
        if (prevValue === value) {
          selectedOptions.delete(category);
          chip.classList.remove('selected');
          const removePattern = new RegExp(`，?${escapeRegex(value)}|${escapeRegex(value)}，?`, 'g');
          textarea.value = currentText.replace(removePattern, '').trim();
          return;
        }
        
        if (prevValue) {
          textarea.value = currentText.replace(prevValue, value);
        } else {
          const separator = currentText.endsWith('。') || currentText.endsWith('\n') || currentText === '' ? '' : '，';
          textarea.value = currentText + separator + value;
        }
        
        selectedOptions.set(category, value);
        chip.closest('.quick-option-chips').querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
      });
    });
    
    // Generate button handler
    card.querySelector('.generate-single-btn').addEventListener('click', async function() {
      const btn = this;
      let prompt = textarea.value.trim();
      
      if (!prompt) {
        showToast('請先輸入或編輯 Prompt', true);
        return;
      }
      
      // Prepend global style if set
      const stylePrefix = [];
      if (multiImageState.globalStyle) stylePrefix.push(`畫風：${multiImageState.globalStyle}`);
      if (multiImageState.globalColor) stylePrefix.push(`色調：${multiImageState.globalColor}`);
      
      if (stylePrefix.length > 0) {
        prompt = stylePrefix.join('，') + '。\n\n' + prompt;
      }
      
      // Update UI to generating state
      card.dataset.status = 'generating';
      card.querySelector('.status-badge').className = 'status-badge generating';
      card.querySelector('.status-badge').textContent = '生成中...';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span> 生成中...';
      
      try {
        const generatedImages = await runImageGeneration(prompt);
        
        if (generatedImages.length > 0) {
          // Check if this is a re-generation
          const isRegeneration = multiImageState.images[idx].status === 'done' || card.dataset.status === 'editing';
          
          // Update state
          multiImageState.images[idx].status = 'done';
          multiImageState.images[idx].generatedImage = generatedImages[0];
          multiImageState.images[idx].finalPrompt = prompt;
          
          if (isRegeneration) {
            // Replace existing entry in generatedImages
            const existingIdx = multiImageState.generatedImages.findIndex(g => g.index === idx);
            if (existingIdx >= 0) {
              multiImageState.generatedImages[existingIdx] = {
                index: idx,
                title: multiImageState.images[idx].title,
                prompt: prompt,
                image: generatedImages[0]
              };
            }
          } else {
            // First generation - increment count and add to array
            multiImageState.completedCount++;
            multiImageState.generatedImages.push({
              index: idx,
              title: multiImageState.images[idx].title,
              prompt: prompt,
              image: generatedImages[0]
            });
          }
          
          // Update UI
          card.dataset.status = 'done';
          card.querySelector('.status-badge').className = 'status-badge done';
          card.querySelector('.status-badge').textContent = '完成';
          btn.innerHTML = '✓ 已生成';
          btn.classList.add('completed');
          
          // Show generated image
          const resultArea = card.querySelector('.image-card-result');
          resultArea.classList.remove('hidden');
          resultArea.innerHTML = `
            <div class="generated-image-preview">
              <img src="${generatedImages[0]}" alt="${escapeAttr(multiImageState.images[idx].title)}" />
              <div class="image-preview-actions">
                <button class="preview-action-btn reedit-btn" data-idx="${idx}" title="跳至編輯區修改 Prompt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  修改 Prompt
                </button>
                <button class="preview-action-btn download-btn" data-src="${generatedImages[0]}" data-idx="${idx}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  下載
                </button>
              </div>
            </div>
            <p class="regenerate-hint">不滿意？修改上方 Prompt 後點「重新生成」</p>
          `;
          
          // Add download handler
          resultArea.querySelector('.download-btn').addEventListener('click', function() {
            downloadImage(this.dataset.src, this.dataset.idx);
          });
          
          // Add re-edit handler (for re-expanding if user collapses manually)
          resultArea.querySelector('.reedit-btn').addEventListener('click', function() {
            // Expand the options area if collapsed
            card.querySelector('.image-card-content').classList.remove('collapsed');
            // Focus on textarea for immediate editing
            textarea.focus();
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          
          // Keep editing area visible for easy re-generation
          // Just reset button to "regenerate" state
          btn.disabled = false;
          btn.classList.remove('completed');
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            重新生成
          `;
          card.dataset.status = 'editing';
          
          // Update progress counter
          document.getElementById('completedCount').textContent = multiImageState.completedCount;
          
          showToast(`圖像 ${idx + 1} 生成成功`);
          
          // Call onAllComplete callback with current results
          if (onAllComplete) {
            onAllComplete(multiImageState.generatedImages);
          }
        }
      } catch (err) {
        console.error('Image generation failed:', err);
        showToast(`圖像 ${idx + 1} 生成失敗: ${err.message}`, true);
        
        card.dataset.status = 'error';
        card.querySelector('.status-badge').className = 'status-badge error';
        card.querySelector('.status-badge').textContent = '失敗';
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重試
        `;
        
        multiImageState.images[idx].status = 'error';
        multiImageState.images[idx].error = err.message;
      }
    });
  });
  
  // Toggle card content on header click
  container.querySelectorAll('.image-card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.generate-single-btn')) return;
      const card = header.closest('.image-card');
      const content = card.querySelector('.image-card-content');
      content.classList.toggle('collapsed');
    });
  });

  // Scroll to editor
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Cancel button
  document.getElementById('cancelAllImageGen').addEventListener('click', () => {
    container.remove();
    multiImageState = null;
    if (onCancel) onCancel();
  });
}

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runImageGeneration(prompt, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('圖片生成逾時（超過 4 分鐘），請稍後再試'));
    }, timeoutMs);
    
    chrome.runtime.sendMessage({ 
      type: 'QUERY_IMAGE', 
      payload: { 
        model: DEFAULT_IMAGE_MODEL, 
        prompt: prompt 
      } 
    }, (response) => {
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '連線中斷'));
        return;
      }
      if (response?.error) reject(new Error(response.error));
      else if (!response?.images?.length) reject(new Error('未收到圖片，請重試'));
      else resolve(response.images);
    });
  });
}

function showError(message) { errorText.textContent = message; errorBanner.classList.remove('hidden'); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function cssEscape(value) { if (CSS.escape) return CSS.escape(value); return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&'); }

init();
