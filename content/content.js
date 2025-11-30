// MAV Extension - Content Script
// Extracts page content and selected text

function getPageContent() {
  const title = document.title || '';
  const url = window.location.href;
  
  // Get main content - try common content selectors first
  const selectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    '#content',
    '#main'
  ];
  
  let mainContent = null;
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim().length > 100) {
      mainContent = el;
      break;
    }
  }
  
  // Fallback to body
  const contentElement = mainContent || document.body;
  
  // Clone and clean the content
  const clone = contentElement.cloneNode(true);
  
  // Remove unwanted elements
  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe', 'svg',
    'nav', 'header', 'footer', 'aside',
    '.sidebar', '.advertisement', '.ads', '.ad',
    '.comments', '.comment-section',
    '.social-share', '.share-buttons',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];
  
  removeSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });
  
  // Extract text content with basic structure
  const text = extractTextWithStructure(clone);
  
  return {
    title,
    url,
    content: text.trim().slice(0, 50000) // Limit to 50k chars
  };
}

function extractTextWithStructure(element) {
  const lines = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let currentText = '';
  
  while (walker.nextNode()) {
    const node = walker.currentNode;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        currentText += (currentText && !currentText.endsWith(' ') ? ' ' : '') + text;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      
      // Block elements - add line breaks
      if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'br', 'hr', 'blockquote', 'pre'].includes(tagName)) {
        if (currentText.trim()) {
          lines.push(currentText.trim());
          currentText = '';
        }
        
        // Add heading markers
        if (tagName.startsWith('h') && tagName.length === 2) {
          const level = parseInt(tagName[1]);
          const prefix = '#'.repeat(level) + ' ';
          currentText = prefix;
        }
      }
    }
  }
  
  if (currentText.trim()) {
    lines.push(currentText.trim());
  }
  
  // Clean up and dedupe
  return lines
    .filter(line => line.length > 0)
    .filter((line, i, arr) => line !== arr[i - 1]) // Remove consecutive duplicates
    .join('\n\n');
}

function getSelectedText() {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    try {
      const content = getPageContent();
      sendResponse({ success: true, data: content });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
  
  if (message.type === 'GET_SELECTION') {
    try {
      const text = getSelectedText();
      sendResponse({ success: true, data: text });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
  
  return false;
});

