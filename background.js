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
  
  return false;
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
      messages: [{ role: 'user', content: prompt }],
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
