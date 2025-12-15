// MAV Canvas - WYSIWYG Markdown Editor with AI Assist

// ============================================
// State
// ============================================
let currentDocId = null;
let autoSaveTimeout = null;
let selectedText = '';
let selectedRange = null;

// DOM Elements
const editor = document.getElementById('editor');
const docTitle = document.getElementById('docTitle');
const saveStatus = document.getElementById('saveStatus');
const aiToolbar = document.getElementById('aiToolbar');
const aiOverlay = document.getElementById('aiOverlay');
const aiLoadingText = document.getElementById('aiLoadingText');
const importModal = document.getElementById('importModal');
const exportModal = document.getElementById('exportModal');
const translateModal = document.getElementById('translateModal');
const importList = document.getElementById('importList');
const importEmpty = document.getElementById('importEmpty');
const toastContainer = document.getElementById('toastContainer');

// ============================================
// Initialize
// ============================================
async function init() {
  setupEventListeners();
  const imported = await checkForImport();
  if (!imported) {
  await loadSavedDoc();
  }
}

function setupEventListeners() {
  // Toolbar buttons
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => handleToolbarAction(btn.dataset.action));
  });

  // Header buttons
  document.getElementById('importBtn').addEventListener('click', showImportModal);
  document.getElementById('exportBtn').addEventListener('click', showExportModal);
  document.getElementById('newDocBtn').addEventListener('click', newDocument);

  // Editor events
  editor.addEventListener('input', handleEditorInput);
  editor.addEventListener('keydown', handleEditorKeydown);
  editor.addEventListener('mouseup', handleTextSelection);
  editor.addEventListener('keyup', handleTextSelection);

  // AI toolbar buttons
  document.querySelectorAll('.ai-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAiAction(btn.dataset.action));
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.close).classList.add('hidden');
    });
  });

  // Export buttons
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', () => handleExport(btn.dataset.format));
  });

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => handleTranslate(btn.dataset.lang));
  });

  // Close modals on backdrop click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  });

  // Hide AI toolbar on click outside
  document.addEventListener('mousedown', (e) => {
    if (!aiToolbar.contains(e.target) && !editor.contains(e.target)) {
      aiToolbar.classList.add('hidden');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', handleGlobalKeydown);
}

// ============================================
// Import from Council
// ============================================
async function checkForImport() {
  const result = await chrome.storage.local.get('canvasImport');
  if (result.canvasImport) {
    const { content, title, query } = result.canvasImport;
    if (content) {
      editor.innerHTML = markdownToHtml(content);
      docTitle.textContent = title || query?.slice(0, 30) || '已匯入';
      currentDocId = crypto.randomUUID(); // 建立新文件 ID
      await chrome.storage.local.remove('canvasImport');
      showToast('已匯入內容');
      scheduleSave(); // 自動儲存匯入的內容
      return true; // 有匯入
    }
  }
  return false; // 沒有匯入
}

async function showImportModal() {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  
  if (conversations.length === 0) {
    importList.classList.add('hidden');
    importEmpty.classList.remove('hidden');
  } else {
    importEmpty.classList.add('hidden');
    importList.classList.remove('hidden');
    
    importList.innerHTML = conversations.slice(0, 10).map(conv => `
      <div class="import-item" data-id="${conv.id}">
        <div class="import-item-title">${escapeHtml(conv.query?.slice(0, 50) || 'Untitled')}${conv.query?.length > 50 ? '...' : ''}</div>
        <div class="import-item-preview">${escapeHtml(conv.finalAnswer?.slice(0, 100) || '')}...</div>
        <div class="import-item-meta">${formatDate(conv.timestamp)} · ${conv.models?.length || 0} 個模型</div>
      </div>
    `).join('');
    
    importList.querySelectorAll('.import-item').forEach(item => {
      item.addEventListener('click', () => importConversation(item.dataset.id));
    });
  }
  
  importModal.classList.remove('hidden');
}

async function importConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  const conv = conversations.find(c => c.id === id);
  
  if (conv?.finalAnswer) {
    editor.innerHTML = markdownToHtml(conv.finalAnswer);
    docTitle.textContent = conv.query?.slice(0, 30) || '已匯入';
    importModal.classList.add('hidden');
    showToast('已匯入內容');
    scheduleSave();
  }
}

// ============================================
// Editor Actions
// ============================================
function handleToolbarAction(action) {
  editor.focus();
  
  switch (action) {
    case 'bold':
      document.execCommand('bold');
      break;
    case 'italic':
      document.execCommand('italic');
      break;
    case 'code':
      wrapSelection('code');
      break;
    case 'h1':
      document.execCommand('formatBlock', false, 'h1');
      break;
    case 'h2':
      document.execCommand('formatBlock', false, 'h2');
      break;
    case 'h3':
      document.execCommand('formatBlock', false, 'h3');
      break;
    case 'ul':
      document.execCommand('insertUnorderedList');
      break;
    case 'ol':
      document.execCommand('insertOrderedList');
      break;
    case 'quote':
      document.execCommand('formatBlock', false, 'blockquote');
      break;
    case 'link':
      const url = prompt('請輸入網址：');
      if (url) document.execCommand('createLink', false, url);
      break;
    case 'hr':
      document.execCommand('insertHorizontalRule');
      break;
  }
  
  scheduleSave();
}

function wrapSelection(tag) {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const selectedText = range.toString();
  
  if (selectedText) {
    const element = document.createElement(tag);
    element.textContent = selectedText;
    range.deleteContents();
    range.insertNode(element);
  }
}

function handleEditorInput() {
  scheduleSave();
}

function handleEditorKeydown(e) {
  // Tab handling
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
  
  // Enter in code block
  if (e.key === 'Enter' && !e.shiftKey) {
    const selection = window.getSelection();
    if (selection.anchorNode?.parentElement?.tagName === 'CODE') {
      e.preventDefault();
      document.execCommand('insertText', false, '\n');
    }
  }
}

function handleGlobalKeydown(e) {
  // 明確允許系統快捷鍵通過，不攔截
  if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'z'].includes(e.key.toLowerCase())) {
    return; // 讓瀏覽器處理複製、貼上、剪下、全選、復原
  }
  
  // Ctrl/Cmd + B = Bold
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    handleToolbarAction('bold');
  }
  // Ctrl/Cmd + I = Italic
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault();
    handleToolbarAction('italic');
  }
  // Ctrl/Cmd + S = Save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveDocument();
  }
  // Escape = Close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
    aiToolbar.classList.add('hidden');
  }
}

// ============================================
// Text Selection & AI Toolbar
// ============================================
function handleTextSelection() {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  
  if (text.length > 0) {
    selectedText = text;
    selectedRange = selection.getRangeAt(0).cloneRange();
    showAiToolbar(selection);
  } else {
    aiToolbar.classList.add('hidden');
    selectedText = '';
    selectedRange = null;
  }
}

function showAiToolbar(selection) {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  aiToolbar.classList.remove('hidden');
  
  // Position above selection
  const toolbarRect = aiToolbar.getBoundingClientRect();
  let left = rect.left + (rect.width / 2) - (toolbarRect.width / 2);
  let top = rect.top - toolbarRect.height - 8;
  
  // Keep in viewport
  if (left < 10) left = 10;
  if (left + toolbarRect.width > window.innerWidth - 10) {
    left = window.innerWidth - toolbarRect.width - 10;
  }
  if (top < 10) {
    top = rect.bottom + 8; // Position below if no space above
  }
  
  aiToolbar.style.left = `${left}px`;
  aiToolbar.style.top = `${top}px`;
}

// ============================================
// AI Actions
// ============================================
async function handleAiAction(action) {
  if (!selectedText || !selectedRange) {
    showToast('請先選取文字', true);
    return;
  }
  
  aiToolbar.classList.add('hidden');
  
  if (action === 'translate') {
    translateModal.classList.remove('hidden');
    return;
  }
  
  const prompts = {
    rewrite: `Rewrite the following text to be clearer and more concise. Keep the same meaning and tone. Return only the rewritten text, no explanations.\n\nText:\n${selectedText}`,
    summarize: `Summarize the following text in 1-2 sentences. Return only the summary, no explanations.\n\nText:\n${selectedText}`,
    expand: `Expand on the following text with more detail and examples. Keep the same style. Return only the expanded text, no explanations.\n\nText:\n${selectedText}`
  };
  
  await executeAiEdit(prompts[action], action);
}

async function handleTranslate(lang) {
  translateModal.classList.add('hidden');
  
  if (!selectedText || !selectedRange) {
    showToast('請先選取文字', true);
    return;
  }
  
  const langNames = {
    'zh-TW': 'Traditional Chinese',
    'zh-CN': 'Simplified Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'ko': 'Korean'
  };
  
  const prompt = `Translate the following text to ${langNames[lang]}. Return only the translation, no explanations.\n\nText:\n${selectedText}`;
  await executeAiEdit(prompt, 'translate');
}

async function executeAiEdit(prompt, actionName) {
  const actionNames = {
    rewrite: '改寫',
    summarize: '摘要',
    expand: '擴充',
    translate: '翻譯'
  };
  showAiLoading(`AI ${actionNames[actionName] || actionName}中...`);
  
  try {
    const result = await chrome.runtime.sendMessage({
      type: 'QUERY_MODEL',
      payload: {
        model: 'anthropic/claude-sonnet-4',
        messages: [{ role: 'user', content: prompt }]
      }
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    const newText = result.choices?.[0]?.message?.content?.trim();
    if (!newText) {
      throw new Error('AI 沒有回應');
    }
    
    // Replace selected text
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(selectedRange);
    
    document.execCommand('insertText', false, newText);
    
    hideAiLoading();
    const actionDoneNames = {
      rewrite: '已改寫',
      summarize: '已摘要',
      expand: '已擴充',
      translate: '已翻譯'
    };
    showToast(actionDoneNames[actionName] || '完成');
    scheduleSave();
    
  } catch (err) {
    hideAiLoading();
    showToast(`失敗：${err.message}`, true);
  }
}

function showAiLoading(text) {
  aiLoadingText.textContent = text;
  aiOverlay.classList.remove('hidden');
}

function hideAiLoading() {
  aiOverlay.classList.add('hidden');
}

// ============================================
// Save/Load
// ============================================
function scheduleSave() {
  saveStatus.textContent = '儲存中...';
  saveStatus.className = 'save-status saving';
  
  clearTimeout(autoSaveTimeout);
  autoSaveTimeout = setTimeout(saveDocument, 1000);
}

async function saveDocument() {
  const content = editor.innerHTML;
  const markdown = htmlToMarkdown(content);
  
  if (!currentDocId) {
    currentDocId = crypto.randomUUID();
  }
  
  const doc = {
    id: currentDocId,
    title: docTitle.textContent,
    content: markdown,
    html: content,
    timestamp: Date.now()
  };
  
  await chrome.storage.local.set({ canvasDoc: doc });
  
  saveStatus.textContent = '已儲存';
  saveStatus.className = 'save-status saved';
}

async function loadSavedDoc() {
  const result = await chrome.storage.local.get('canvasDoc');
  if (result.canvasDoc) {
    const doc = result.canvasDoc;
    currentDocId = doc.id;
    docTitle.textContent = doc.title || '未命名';
    editor.innerHTML = doc.html || markdownToHtml(doc.content || '');
  }
}

function newDocument() {
  if (editor.innerHTML.trim() && !confirm('確定要建立新文件？未儲存的變更將會遺失。')) {
    return;
  }
  
  currentDocId = null;
  docTitle.textContent = '未命名';
  editor.innerHTML = '';
  chrome.storage.local.remove('canvasDoc');
  showToast('已建立新文件');
}

// ============================================
// Export
// ============================================
function showExportModal() {
  exportModal.classList.remove('hidden');
}

function handleExport(format) {
  const content = editor.innerHTML;
  const markdown = htmlToMarkdown(content);
  const plainText = editor.innerText;
  
  switch (format) {
    case 'md':
      downloadFile(`${docTitle.textContent}.md`, markdown, 'text/markdown');
      break;
    case 'txt':
      downloadFile(`${docTitle.textContent}.txt`, plainText, 'text/plain');
      break;
    case 'copy':
      navigator.clipboard.writeText(markdown)
        .then(() => showToast('已複製到剪貼簿'))
        .catch(() => showToast('複製失敗', true));
      break;
  }
  
  exportModal.classList.add('hidden');
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('已下載檔案');
}

// ============================================
// Markdown Conversion
// ============================================
function markdownToHtml(md) {
  if (!md) return '';
  
  let html = escapeHtml(md);
  
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => 
    `<pre><code class="language-${lang}">${code}</code></pre>`
  );
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Paragraphs
  html = '<p>' + html.replace(/\n\n+/g, '</p><p>') + '</p>';
  
  // Clean up
  html = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3]>)/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<pre>)/g, '$1')
    .replace(/(<\/pre>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)<\/p>/g, '$1');
  
  return html;
}

function htmlToMarkdown(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  let md = '';
  
  function processNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    
    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(processNode).join('');
    
    switch (tag) {
      case 'h1': return `# ${children}\n\n`;
      case 'h2': return `## ${children}\n\n`;
      case 'h3': return `### ${children}\n\n`;
      case 'p': return `${children}\n\n`;
      case 'strong': case 'b': return `**${children}**`;
      case 'em': case 'i': return `*${children}*`;
      case 'code': 
        if (node.parentElement?.tagName === 'PRE') return children;
        return `\`${children}\``;
      case 'pre': return `\`\`\`\n${children}\`\`\`\n\n`;
      case 'a': return `[${children}](${node.href})`;
      case 'ul': return children;
      case 'ol': return children;
      case 'li': return `- ${children}\n`;
      case 'blockquote': return `> ${children}\n\n`;
      case 'hr': return '---\n\n';
      case 'br': return '\n';
      case 'div': return `${children}\n`;
      default: return children;
    }
  }
  
  md = Array.from(div.childNodes).map(processNode).join('');
  
  // Clean up extra newlines
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================
// Utilities
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  return date.toLocaleDateString('zh-TW');
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ============================================
// Tree View Functionality
// ============================================

const treeViewSidebar = document.getElementById('treeViewSidebar');
const treeViewToggle = document.getElementById('treeViewToggle');
const treeViewContent = document.getElementById('treeViewContent');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const refreshTreeBtn = document.getElementById('refreshTreeBtn');

let treeViewVisible = false;
let loadedSessions = [];

// Toggle tree view sidebar
function toggleTreeView() {
  treeViewVisible = !treeViewVisible;
  if (treeViewVisible) {
    treeViewSidebar.classList.remove('hidden');
    treeViewToggle.classList.add('active');
    loadTreeData();
  } else {
    treeViewSidebar.classList.add('hidden');
    treeViewToggle.classList.remove('active');
  }
}

// Load sessions data from storage
async function loadTreeData() {
  try {
    const result = await chrome.storage.local.get('taskSessions');
    loadedSessions = result.taskSessions || [];
    renderTree();
  } catch (err) {
    console.error('Failed to load tree data:', err);
    showToast('載入任務樹失敗', true);
  }
}

// Render tree view
function renderTree() {
  if (!treeViewContent) return;
  
  if (loadedSessions.length === 0) {
    treeViewContent.innerHTML = `
      <div class="tree-empty">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="9" y1="3" x2="9" y2="21"></line>
        </svg>
        <p>尚無任務卡片</p>
        <span>從 Council 建立任務後，卡片階層將顯示於此</span>
      </div>
    `;
    return;
  }
  
  // Render sessions as root nodes
  const treesHtml = loadedSessions.map(session => renderSessionTree(session)).join('');
  treeViewContent.innerHTML = treesHtml;
  
  // Add event listeners
  setupTreeEventListeners();
}

// Render a single session as a tree
function renderSessionTree(session) {
  if (!session.cards || session.cards.length === 0) return '';
  
  const rootCard = session.cards.find(c => c.id === session.rootCardId);
  if (!rootCard) return '';
  
  // Build card lookup map
  const cardMap = new Map();
  session.cards.forEach(c => cardMap.set(c.id, c));
  
  // Render tree recursively
  return renderTreeNode(rootCard, cardMap, session.id, 0);
}

// Render a single tree node
function renderTreeNode(card, cardMap, sessionId, depth) {
  const hasChildren = card.childCardIds && card.childCardIds.length > 0;
  const taskCount = card.tasks?.filter(t => t.status !== 'completed').length || 0;
  const label = card.query.slice(0, 25) + (card.query.length > 25 ? '...' : '');
  
  const childrenHtml = hasChildren
    ? `<div class="tree-node-children" data-parent="${card.id}">
         ${card.childCardIds.map(childId => {
           const child = cardMap.get(childId);
           return child ? renderTreeNode(child, cardMap, sessionId, depth + 1) : '';
         }).join('')}
       </div>`
    : '';
  
  return `
    <div class="tree-node" data-card-id="${card.id}" data-session-id="${sessionId}">
      <div class="tree-node-content ${depth === 0 ? 'root' : ''}">
        <span class="tree-node-toggle ${hasChildren ? 'expanded' : 'empty'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </span>
        <span class="tree-node-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${depth === 0 
              ? '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line>'
              : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline>'}
          </svg>
        </span>
        <span class="tree-node-label" title="${escapeHtml(card.query)}">${escapeHtml(label)}</span>
        ${taskCount > 0 ? `<span class="tree-node-badge">${taskCount}</span>` : ''}
      </div>
      ${childrenHtml}
    </div>
  `;
}

// Setup tree event listeners
function setupTreeEventListeners() {
  // Toggle children visibility
  treeViewContent.querySelectorAll('.tree-node-toggle:not(.empty)').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const node = toggle.closest('.tree-node');
      const children = node.querySelector('.tree-node-children');
      if (children) {
        toggle.classList.toggle('expanded');
        children.classList.toggle('collapsed');
      }
    });
  });
  
  // Click on node content to load card
  treeViewContent.querySelectorAll('.tree-node-content').forEach(content => {
    content.addEventListener('click', () => {
      const node = content.closest('.tree-node');
      const sessionId = node.dataset.sessionId;
      const cardId = node.dataset.cardId;
      
      // Highlight selected node
      treeViewContent.querySelectorAll('.tree-node-content.active').forEach(n => n.classList.remove('active'));
      content.classList.add('active');
      
      // Load card content into editor
      loadCardContent(sessionId, cardId);
    });
  });
}

// Load card content into the editor
function loadCardContent(sessionId, cardId) {
  const session = loadedSessions.find(s => s.id === sessionId);
  if (!session) return;
  
  const card = session.cards.find(c => c.id === cardId);
  if (!card || !card.finalAnswer) {
    showToast('此卡片尚無內容');
    return;
  }
  
  // Update editor content
  editor.innerHTML = markdownToHtml(card.finalAnswer);
  docTitle.textContent = card.query.slice(0, 30) || '任務卡片';
  currentDocId = `session-${sessionId}-card-${cardId}`;
  
  showToast('已載入卡片內容');
}

// Initialize tree view event listeners
async function initTreeView() {
  if (treeViewToggle) {
    treeViewToggle.addEventListener('click', toggleTreeView);
  }
  
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', () => {
      treeViewSidebar.classList.add('hidden');
      treeViewToggle.classList.remove('active');
      treeViewVisible = false;
    });
  }
  
  if (refreshTreeBtn) {
    refreshTreeBtn.addEventListener('click', loadTreeData);
  }
  
  // 檢查是否需要自動開啟樹狀圖
  const result = await chrome.storage.local.get('canvasOpenTreeView');
  if (result.canvasOpenTreeView) {
    // 清除標記
    await chrome.storage.local.remove('canvasOpenTreeView');
    // 自動開啟樹狀圖
    toggleTreeView();
  }
}

// Initialize everything
async function initAll() {
  await init();
  initTreeView();
}

// Initialize
initAll();

