        // MAV Extension - Background Service Worker

        // Image generation capable models
        const IMAGE_MODELS = [
        'google/gemini-3-pro-image-preview',
        'google/gemini-2.5-flash-image-preview'
        ];

        // Brave Search API 合法選項值
        const BRAVE_SEARCH_OPTIONS = {
        country: ['ar', 'au', 'at', 'be', 'br', 'ca', 'cl', 'dk', 'fi', 'fr', 'de', 'hk', 'in', 'id', 'it', 'jp', 'kr', 'my', 'mx', 'nl', 'nz', 'no', 'cn', 'pl', 'pt', 'ph', 'ru', 'sa', 'za', 'es', 'se', 'ch', 'tw', 'tr', 'gb', 'us'],
        search_lang: ['ar', 'eu', 'bn', 'bg', 'ca', 'zh-hans', 'zh-hant', 'hr', 'cs', 'da', 'nl', 'en', 'en-gb', 'et', 'fi', 'fr', 'de', 'gu', 'he', 'hi', 'hu', 'is', 'it', 'jp', 'kn', 'ko', 'lv', 'lt', 'ms', 'ml', 'mr', 'nb', 'pl', 'pt-br', 'pt-pt', 'pa', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sv', 'ta', 'te', 'th', 'tr', 'uk', 'vi'],
        freshness: ['pd', 'pw', 'pm', 'py'],
        safesearch: ['off', 'moderate', 'strict']
        };

        // 驗證並過濾非法的搜尋選項
        function validateSearchOptions(options) {
        const validated = {};
        for (const [key, value] of Object.entries(options)) {
            if (key === 'count') {
            const num = parseInt(value);
            if (num >= 1 && num <= 20) validated.count = num;
            } else if (BRAVE_SEARCH_OPTIONS[key]?.includes(value)) {
            validated[key] = value;
            } else if (key === 'freshness' && /^\d{4}-\d{2}-\d{2}to\d{4}-\d{2}-\d{2}$/.test(value)) {
            // 支援日期範圍格式 YYYY-MM-DDtoYYYY-MM-DD
            validated[key] = value;
            }
        }
        return validated;
        }

        // Open side panel on action click
        chrome.action.onClicked.addListener(async (tab) => {
        await chrome.sidePanel.open({ tabId: tab.id });
        });

        // Create context menus on install
        chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: 'add-to-context',
            title: '加入 AI Council Context',
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
        
        // Initialize badge (starts at 0, will be updated when sidepanel loads)
        updateContextBadge(0);
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
            handleWebSearch(message.query, message.options)
            .then(sendResponse)
            .catch(err => sendResponse({ error: err.message }));
            return true;
        }
        
        if (message.type === 'FETCH_PAGE_CONTENTS') {
            handleFetchPageContents(message.urls)
            .then(sendResponse)
            .catch(err => sendResponse({ error: err.message }));
            return true;
        }
        
        if (message.type === 'UPDATE_CONTEXT_BADGE') {
            // Legacy support - just respond success
            sendResponse({ success: true });
            return false;
        }
        
        if (message.type === 'UPDATE_CONTEXT_BADGE_COUNT') {
            // New approach: receive count directly from sidepanel
            updateContextBadge(message.count || 0)
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ error: err.message }));
            return true;
        }
        
        return false;
        });

        // Note: Storage listener for contextItems removed - badge is now updated via message

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
        async function handleWebSearch(query, options = {}) {
        const braveApiKey = await getBraveApiKey();
        
        if (!braveApiKey) {
            throw new Error('Brave Search API 金鑰尚未設定，請至設定頁面新增');
        }

        // 預設參數
        const defaultParams = {
            count: 20,
            country: 'tw',
            search_lang: 'zh-hant',
            freshness: 'pm',
            safesearch: 'strict'
        };

        // 驗證並合併 agent 傳入的參數（覆蓋預設）
        const validatedOptions = validateSearchOptions(options);
        const params = new URLSearchParams({
            q: query,
            ...defaultParams,
            ...validatedOptions
        });

        const response = await fetch(
            `https://api.search.brave.com/res/v1/web/search?${params}`,
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

        // Handle fetch page contents for multiple URLs
        async function handleFetchPageContents(urls) {
        if (!urls || urls.length === 0) {
            return { results: [] };
        }
        
        // Limit to max 5 URLs
        const urlsToFetch = urls.slice(0, 5);
        const results = [];
        
        // Process URLs with concurrency limit of 2
        const CONCURRENCY = 2;
        
        for (let i = 0; i < urlsToFetch.length; i += CONCURRENCY) {
            const batch = urlsToFetch.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
            batch.map(url => fetchSinglePageContent(url))
            );
            results.push(...batchResults);
        }
        
        return { results };
        }

        // Fetch content from a single URL
        async function fetchSinglePageContent(url) {
        let tabId = null;
        const TIMEOUT = 10000; // 10 seconds timeout
        
        try {
            // Skip non-http URLs
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return { url, content: null, error: 'Invalid URL scheme' };
            }
            
            // Create a background tab
            const tab = await chrome.tabs.create({ 
            url: url, 
            active: false 
            });
            tabId = tab.id;
            
            // Wait for page to load with timeout
            await waitForTabLoad(tabId, TIMEOUT);
            
            // Inject content script and get content
            await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content/content.js']
            });
            
            const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_PAGE_CONTENT' });
            
            // Close the tab
            try {
            await chrome.tabs.remove(tabId);
            } catch (e) {
            // Tab may already be closed
            }
            
            if (response.success) {
            return {
                url,
                title: response.data.title,
                content: response.data.content
            };
            } else {
            return { url, content: null, error: response.error };
            }
        } catch (err) {
            // Clean up tab if it exists
            if (tabId) {
            try {
                await chrome.tabs.remove(tabId);
            } catch (e) {
                // Tab may already be closed
            }
            }
            return { url, content: null, error: err.message };
        }
        }

        // Wait for a tab to complete loading with timeout
        function waitForTabLoad(tabId, timeout) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(); // Resolve anyway after timeout, content might be partially loaded
            }, timeout);
            
            const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                clearTimeout(timeoutId);
                chrome.tabs.onUpdated.removeListener(listener);
                // Small delay to let JS execute
                setTimeout(resolve, 500);
            }
            };
            
            chrome.tabs.onUpdated.addListener(listener);
            
            // Check if already loaded
            chrome.tabs.get(tabId).then(tab => {
            if (tab.status === 'complete') {
                clearTimeout(timeoutId);
                chrome.tabs.onUpdated.removeListener(listener);
                setTimeout(resolve, 500);
            }
            }).catch(reject);
        });
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
        async function handleOpenCanvas(payload) {
        // 加上時間戳確保每次都是新的載入
        const timestamp = Date.now();
        const url = `${chrome.runtime.getURL('canvas/index.html')}?t=${timestamp}`;
        
        if (payload?.content) {
            // Store content in local storage for canvas to retrieve
            await chrome.storage.local.set({ canvasImport: payload });
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
        
        // Create context item data
        const contextItem = {
            type: 'selection',
            title: tab?.title ? `來自：${tab.title.slice(0, 50)}` : '選取的文字',
            content: selectionText.trim(),
            url: tab?.url || ''
        };
        
        // Send to sidepanel instead of writing to global storage
        try {
            await chrome.runtime.sendMessage({
            type: 'ADD_CONTEXT_ITEM',
            item: contextItem
            });
        } catch (err) {
            // Sidepanel might not be open, show error
            console.log('[handleAddToContext] Sidepanel not open or message failed:', err.message);
            await showToastInTab(tab.id, '請先開啟 AI Council 側邊欄');
            return;
        }
        
        // Show toast in the tab
        await showToastInTab(tab.id, '已加入 AI Council Context');
        }

        // Update extension badge with context count (now receives count directly)
        async function updateContextBadge(count = 0) {
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
            'Authorization': `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': chrome.runtime.getURL('/'),
            'X-Title': 'AI Council Extension'
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
        const { model, prompt, size = '1024x1024', timeoutMs = 240000 } = payload;
        const apiKey = await getApiKey();
        
        if (!apiKey) {
            throw new Error('API Key not configured. Please set it in Options.');
        }

        // Parse size
        const [width, height] = size.split('x').map(Number);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Add explicit image generation instruction for Gemini models
        const imagePrompt = `請根據以下描述生成一張圖片：

${prompt}

請直接生成圖片，不要回覆文字描述。`;

        try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey.trim()}`,
            'HTTP-Referer': chrome.runtime.getURL('/'),
            'X-Title': 'AI-Council-Extension'
            },
            body: JSON.stringify({
            model,
            messages: [
                { role: 'user', content: imagePrompt }
            ],
            // Request image output - use response_modalities for Gemini
            response_modalities: ['IMAGE', 'TEXT'],
            // Also try modalities for compatibility
            modalities: ['text', 'image'],
            // Image configuration
            image_config: {
                width,
                height
            }
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Image generation failed: ${response.status}`);
        }

        const data = await response.json();
        
        // Log response for debugging
        console.log('[ImageGen] Response:', JSON.stringify(data, null, 2));
        
        // Extract image from response
        const message = data.choices?.[0]?.message;
        const result = {
            text: typeof message?.content === 'string' ? message.content : '',
            images: []
        };

  // Check for images in the response - multiple formats supported
  
  // Format 1: message.images array
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
      if (img.b64_json) {
        return `data:image/png;base64,${img.b64_json}`;
      }
      return null;
    }).filter(Boolean);
  }

  // Format 2: content array with image_url items
  if (Array.isArray(message?.content)) {
    message.content.forEach(item => {
      if (item.type === 'image_url' && item.image_url?.url) {
        result.images.push(item.image_url.url);
      }
      // Gemini format: inline_data
      if (item.type === 'image' && item.source?.data) {
        result.images.push(`data:${item.source.media_type || 'image/png'};base64,${item.source.data}`);
      }
      // Another Gemini format: inlineData
      if (item.inlineData?.data) {
        result.images.push(`data:${item.inlineData.mimeType || 'image/png'};base64,${item.inlineData.data}`);
      }
    });
  }
  
  // Format 3: Gemini parts array in content
  if (message?.parts && Array.isArray(message.parts)) {
    message.parts.forEach(part => {
      if (part.inlineData?.data) {
        result.images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
      }
      if (part.inline_data?.data) {
        result.images.push(`data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`);
      }
    });
  }
  
  // Format 4: Check data.images at top level (some providers)
  if (data.images && Array.isArray(data.images)) {
    data.images.forEach(img => {
      if (typeof img === 'string') {
        result.images.push(img);
      } else if (img.url) {
        result.images.push(img.url);
      } else if (img.b64_json) {
        result.images.push(`data:image/png;base64,${img.b64_json}`);
      }
    });
  }
  
  console.log('[ImageGen] Extracted images:', result.images.length);

  // If no images found but got text, include it for debugging
  if (result.images.length === 0 && result.text) {
    console.warn('[ImageGen] No images found. Model returned text:', result.text.substring(0, 200));
    result.debugText = result.text.substring(0, 300);
  }

  // Include usage data for cost tracking
  result.usage = data.usage || null;
  result.model = model;

  return result;
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            throw new Error('圖片生成逾時，請稍後再試');
          }
          throw err;
        }
}

async function handleStreamingQuery(port, payload) {
  const { model, messages, enableImage = false, visionMode = false } = payload;
  const apiKey = await getApiKey();
  
  // Track port connection state
  let isPortConnected = true;
  port.onDisconnect.addListener(() => {
    isPortConnected = false;
  });
  
  // Safe post message helper
  const safePostMessage = (msg) => {
    if (isPortConnected) {
      try {
        port.postMessage(msg);
      } catch (e) {
        isPortConnected = false;
        console.warn('Port message failed:', e.message);
      }
    }
  };
  
  if (!apiKey) {
    safePostMessage({ type: 'ERROR', error: 'API Key not configured' });
    return;
  }

  // Check if this is an image-capable model and image mode is enabled
  const isImageModel = IMAGE_MODELS.some(m => model.includes(m.split('/')[1]));
  
  // For image models with image enabled, use non-streaming
  if (isImageModel && enableImage) {
    try {
      const result = await handleImageQuery({ model, prompt: messages[0]?.content });
      safePostMessage({ type: 'START', model });
      if (result.text) {
        safePostMessage({ type: 'CHUNK', model, content: result.text });
      }
      safePostMessage({ type: 'DONE', model, images: result.images });
    } catch (err) {
      safePostMessage({ type: 'ERROR', error: err.message });
    }
    return;
  }

  // For vision mode, use non-streaming (some models don't support streaming with images)
  if (visionMode) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for vision
    
    try {
      safePostMessage({ type: 'START', model });
      safePostMessage({ type: 'PROGRESS', model, message: '正在連接至 Vision 模型...' });
      
      const messagesWithSystem = [LANGUAGE_SYSTEM_PROMPT, ...messages];
      
      safePostMessage({ type: 'PROGRESS', model, message: '正在分析圖片內容...' });
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': chrome.runtime.getURL('/'),
          'X-Title': 'AI-Council-Extension'
        },
        body: JSON.stringify({
          model,
          messages: messagesWithSystem,
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `Vision query failed: ${response.status}`);
      }

      safePostMessage({ type: 'PROGRESS', model, message: '正在處理回應...' });
      
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      if (content) {
        safePostMessage({ type: 'CHUNK', model, content });
      }
      safePostMessage({ type: 'DONE', model, usage: data.usage });
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        safePostMessage({ type: 'ERROR', error: 'Vision 分析超時（超過 2 分鐘），請稍後再試' });
      } else {
        safePostMessage({ type: 'ERROR', error: err.message });
      }
    }
    return;
  }

  // Prepend language system prompt
  const messagesWithSystem = [LANGUAGE_SYSTEM_PROMPT, ...messages];

  // Timeout configuration: 3 minutes for streaming requests
  const STREAM_TIMEOUT_MS = 180000;
  const controller = new AbortController();
  let timeoutId = null;
  let lastChunkTime = Date.now();
  let hasReceivedContent = false;
  
  // Timeout handler
  const setupTimeout = () => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      controller.abort();
    }, STREAM_TIMEOUT_MS);
  };
  
  // Reset timeout on each chunk (for idle detection)
  const IDLE_TIMEOUT_MS = 60000; // 60 seconds without any chunk
  const resetIdleTimeout = () => {
    lastChunkTime = Date.now();
  };
  
  // Idle check interval
  const idleCheckInterval = setInterval(() => {
    if (hasReceivedContent && Date.now() - lastChunkTime > IDLE_TIMEOUT_MS) {
      clearInterval(idleCheckInterval);
      controller.abort();
    }
  }, 5000);

  try {
    setupTimeout();
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
        'HTTP-Referer': chrome.runtime.getURL('/'),
        'X-Title': 'AI-Council-Extension'
      },
      body: JSON.stringify({
        model,
        messages: messagesWithSystem,
        stream: true
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      clearTimeout(timeoutId);
      clearInterval(idleCheckInterval);
      const error = await response.json();
      safePostMessage({ type: 'ERROR', error: error.error?.message || 'API request failed' });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    safePostMessage({ type: 'START', model });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // Stop processing if port disconnected
      if (!isPortConnected) {
        reader.cancel();
        break;
      }

      // Reset idle timer on receiving data
      resetIdleTimeout();

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            clearTimeout(timeoutId);
            clearInterval(idleCheckInterval);
            safePostMessage({ type: 'DONE', model });
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              hasReceivedContent = true;
              safePostMessage({ type: 'CHUNK', model, content });
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    clearTimeout(timeoutId);
    clearInterval(idleCheckInterval);
    safePostMessage({ type: 'DONE', model });
  } catch (err) {
    clearTimeout(timeoutId);
    clearInterval(idleCheckInterval);
    if (err.name === 'AbortError') {
      const elapsed = Date.now() - lastChunkTime;
      if (elapsed > IDLE_TIMEOUT_MS) {
        safePostMessage({ type: 'ERROR', error: `模型回應中斷：已超過 ${Math.round(IDLE_TIMEOUT_MS / 1000)} 秒未收到內容` });
      } else {
        safePostMessage({ type: 'ERROR', error: `請求超時：模型回應時間超過 ${Math.round(STREAM_TIMEOUT_MS / 60000)} 分鐘` });
      }
    } else {
      safePostMessage({ type: 'ERROR', error: err.message });
    }
  }
}
