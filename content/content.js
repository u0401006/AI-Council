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

// Show toast notification
function showToast(message) {
  // Remove existing toast if any
  const existing = document.getElementById('mav-toast');
  if (existing) {
    existing.remove();
  }
  
  // Create toast container
  const toast = document.createElement('div');
  toast.id = 'mav-toast';
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
    <span>${message}</span>
  `;
  
  // Apply styles
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    opacity: 0;
    transform: translateY(20px) scale(0.95);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  `;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0) scale(1)';
  });
  
  // Remove after delay
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px) scale(0.95)';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
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
  
  if (message.type === 'SHOW_TOAST') {
    showToast(message.message);
    sendResponse({ success: true });
    return false;
  }
  
  return false;
});

