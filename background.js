// MAV Extension - Background Service Worker

// Image generation capable models
const IMAGE_MODELS = [
  'google/gemini-3-pro-image-preview',
  'google/gemini-2.5-flash-image-preview'
];

// Open side panel on action click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Create context menus on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'add-to-context',
    title: '加入 MAV Context',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'open-canvas-tab',
    title: '在畫布中開啟（分頁）',
    contexts: ['selection']
  });
  chrome.contextMenus.create({
    id: 'open-canvas-window',
    title: '在畫布中開啟（獨立視窗）',
    contexts: ['selection']
  });
  
  // Initialize badge
  updateContextBadge();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-context') {
    await handleAddToContext(info.selectionText, tab);
  } else if (info.menuItemId === 'open-canvas-tab' || info.menuItemId === 'open-canvas-window') {
    const asWindow = info.menuItemId === 'open-canvas-window';
    handleOpenCanvas({
      content: info.selectionText,
      title: '選取內容',
      openAsWindow: asWindow
    });
  }
});

// Handle messages from side panel and options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUERY_MODEL') {
    handleModelQuery(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'QUERY_IMAGE') {
    handleImageQuery(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'GET_PAGE_CONTENT') {
    handleGetPageContent(message.tabId)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'GET_SELECTION') {
    handleGetSelection(message.tabId)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'OPEN_CANVAS') {
    handleOpenCanvas(message.payload);
    sendResponse({ success: true });
    return false;
  }
  
  if (message.type === 'WEB_SEARCH') {
    handleWebSearch(message.query)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  if (message.type === 'UPDATE_CONTEXT_BADGE') {
    updateContextBadge()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
  
  return false;
});

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.contextItems) {
    updateContextBadge();
  }
});

// Handle streaming via port connection
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'stream') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'QUERY_MODEL_STREAM') {
        await handleStreamingQuery(port, message.payload);
      }
    });
  }
});

async function getApiKey() {
  const result = await chrome.storage.sync.get('apiKey');
  return result.apiKey;
}

async function getBraveApiKey() {
  const result = await chrome.storage.sync.get('braveApiKey');
  return result.braveApiKey;
}

// Handle web search request
async function handleWebSearch(query) {
  const braveApiKey = await getBraveApiKey();
  
  if (!braveApiKey) {
    throw new Error('Brave Search API 金鑰尚未設定，請至設定頁面新增');
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveApiKey
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`搜尋失敗: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  // Extract relevant results
  const results = (data.web?.results || []).slice(0, 5).map(result => ({
    title: result.title,
    url: result.url,
    description: result.description || ''
  }));

  return { results, query };
}

// Handle get page content request
async function handleGetPageContent(tabId) {
  try {
    // Check if we can access this tab
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      throw new Error('Cannot access this page type (browser internal page)');
    }
    
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    
    // Get content
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' });
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to get page content');
    }
  } catch (err) {
    if (err.message.includes('Cannot access')) {
      throw err;
    }
    throw new Error(`Cannot access page: ${err.message}`);
  }
}

// Handle get selection request
async function handleGetSelection(tabId) {
  try {
    // Check if we can access this tab
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      throw new Error('Cannot access this page type (browser internal page)');
    }
    
    // Inject content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    
    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_SELECTION' });
    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error || 'Failed to get selection');
    }
  } catch (err) {
    if (err.message.includes('Cannot access')) {
      throw err;
    }
    throw new Error(`Cannot access page: ${err.message}`);
  }
}

// Handle open canvas
function handleOpenCanvas(payload) {
  const url = chrome.runtime.getURL('canvas/index.html');
  if (payload?.content) {
    // Store content in local storage for canvas to retrieve
    chrome.storage.local.set({ canvasImport: payload });
  }
  
  if (payload?.openAsWindow) {
    // Open as popup window
    chrome.windows.create({
      url: url,
      type: 'popup',
      width: 900,
      height: 750
    });
  } else {
    // Open as tab (default)
    chrome.tabs.create({ url });
  }
}

// Handle add to context from context menu
async function handleAddToContext(selectionText, tab) {
  if (!selectionText || selectionText.trim().length === 0) {
    return;
  }
  
  // Create context item
  const contextItem = {
    id: crypto.randomUUID(),
    type: 'selection',
    title: tab?.title ? `來自：${tab.title.slice(0, 50)}` : '選取的文字',
    content: selectionText.trim(),
    url: tab?.url || '',
    timestamp: Date.now()
  };
  
  // Get existing context items
  const result = await chrome.storage.local.get('contextItems');
  const contextItems = result.contextItems || [];
  
  // Add new item
  contextItems.push(contextItem);
  
  // Save back to storage
  await chrome.storage.local.set({ contextItems });
  
  // Update badge
  await updateContextBadge();
  
  // Show toast in the tab
  await showToastInTab(tab.id, '已加入 MAV Context');
}

// Update extension badge with context count
async function updateContextBadge() {
  const result = await chrome.storage.local.get('contextItems');
  const contextItems = result.contextItems || [];
  const count = contextItems.length;
  
  if (count > 0) {
    await chrome.action.setBadgeText({ text: String(count) });
    await chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}

// Show toast notification in a tab
async function showToastInTab(tabId, message) {
  try {
    // Check if we can access this tab
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
      return; // Can't inject into browser internal pages
    }
    
    // Inject content script if needed
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/content.js']
    });
    
    // Send toast message
    await chrome.tabs.sendMessage(tabId, { type: 'SHOW_TOAST', message });
  } catch (err) {
    console.error('Failed to show toast:', err);
  }
}

// System prompt to enforce Traditional Chinese output
const LANGUAGE_SYSTEM_PROMPT = {
  role: 'system',
  content: '你必須使用繁體中文（Traditional Chinese）回答。絕對禁止使用簡體中文。若需要使用中文，一律使用繁體中文。英文和日文可以保留原文。'
};

async function handleModelQuery(payload) {
  const { model, messages } = payload;
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key not configured. Please set it in Options.');
  }

  // Prepend language system prompt
  const messagesWithSystem = [LANGUAGE_SYSTEM_PROMPT, ...messages];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'chrome-extension://mav-extension',
      'X-Title': 'MAV Extension'
    },
    body: JSON.stringify({
      model,
      messages: messagesWithSystem,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  return response.json();
}

// Handle image generation request
async function handleImageQuery(payload) {
  const { model, prompt, size = '1024x1024' } = payload;
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key not configured. Please set it in Options.');
  }

  // Parse size
  const [width, height] = size.split('x').map(Number);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'chrome-extension://mav-extension',
      'X-Title': 'MAV Extension'
    },
    body: JSON.stringify({
      model,
      messages: [
        LANGUAGE_SYSTEM_PROMPT,
        { role: 'user', content: prompt }
      ],
      // Request image output
      modalities: ['text', 'image'],
      // Image configuration
      image_config: {
        width,
        height
      }
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract image from response
  const message = data.choices?.[0]?.message;
  const result = {
    text: message?.content || '',
    images: []
  };

  // Check for images in the response
  if (message?.images && Array.isArray(message.images)) {
    result.images = message.images.map(img => {
      // Handle different image formats
      if (typeof img === 'string') {
        return img; // Already a data URL or URL
      }
      if (img.image_url?.url) {
        return img.image_url.url;
      }
      if (img.url) {
        return img.url;
      }
      return null;
    }).filter(Boolean);
  }

  // Also check content array for inline images
  if (Array.isArray(message?.content)) {
    message.content.forEach(item => {
      if (item.type === 'image_url' && item.image_url?.url) {
        result.images.push(item.image_url.url);
      }
    });
  }

  return result;
}

async function handleStreamingQuery(port, payload) {
  const { model, messages, enableImage = false } = payload;
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    port.postMessage({ type: 'ERROR', error: 'API Key not configured' });
    return;
  }

  // Check if this is an image-capable model and image mode is enabled
  const isImageModel = IMAGE_MODELS.some(m => model.includes(m.split('/')[1]));
  
  // For image models with image enabled, use non-streaming
  if (isImageModel && enableImage) {
    try {
      const result = await handleImageQuery({ model, prompt: messages[0]?.content });
      port.postMessage({ type: 'START', model });
      if (result.text) {
        port.postMessage({ type: 'CHUNK', model, content: result.text });
      }
      port.postMessage({ type: 'DONE', model, images: result.images });
    } catch (err) {
      port.postMessage({ type: 'ERROR', error: err.message });
    }
    return;
  }

  // Prepend language system prompt
  const messagesWithSystem = [LANGUAGE_SYSTEM_PROMPT, ...messages];

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'chrome-extension://mav-extension',
        'X-Title': 'MAV Extension'
      },
      body: JSON.stringify({
        model,
        messages: messagesWithSystem,
        stream: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      port.postMessage({ type: 'ERROR', error: error.error?.message || 'API request failed' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    port.postMessage({ type: 'START', model });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            port.postMessage({ type: 'DONE', model });
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              port.postMessage({ type: 'CHUNK', model, content });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    port.postMessage({ type: 'DONE', model });
  } catch (err) {
    port.postMessage({ type: 'ERROR', error: err.message });
  }
}
