// MAV Extension - Background Service Worker

// Open side panel on action click
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// Handle messages from side panel and options
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUERY_MODEL') {
    handleModelQuery(message.payload)
      .then(sendResponse)
      .catch(err => sendResponse({ error: err.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'QUERY_MODEL_STREAM') {
    // For streaming, we use a port connection instead
    return false;
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

async function handleModelQuery(payload) {
  const { model, messages } = payload;
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    throw new Error('API Key not configured. Please set it in Options.');
  }

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
      messages,
      stream: false
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  return response.json();
}

async function handleStreamingQuery(port, payload) {
  const { model, messages } = payload;
  const apiKey = await getApiKey();
  
  if (!apiKey) {
    port.postMessage({ type: 'ERROR', error: 'API Key not configured' });
    return;
  }

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
        messages,
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

