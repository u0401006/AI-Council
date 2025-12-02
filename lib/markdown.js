// Lightweight Markdown parser (no external dependencies)

const RULES = [
  // Code blocks (must be first)
  { pattern: /```(\w*)\n([\s\S]*?)```/g, replace: '<pre><code class="language-$1">$2</code></pre>' },
  // Inline code
  { pattern: /`([^`]+)`/g, replace: '<code>$1</code>' },
  // Bold
  { pattern: /\*\*([^*]+)\*\*/g, replace: '<strong>$1</strong>' },
  // Italic
  { pattern: /\*([^*]+)\*/g, replace: '<em>$1</em>' },
  // Headers
  { pattern: /^### (.+)$/gm, replace: '<h4>$1</h4>' },
  { pattern: /^## (.+)$/gm, replace: '<h3>$1</h3>' },
  { pattern: /^# (.+)$/gm, replace: '<h2>$1</h2>' },
  // Links
  { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replace: '<a href="$2" target="_blank" rel="noopener">$1</a>' },
  // Unordered lists
  { pattern: /^[\-\*] (.+)$/gm, replace: '<li>$1</li>' },
  // Ordered lists
  { pattern: /^\d+\. (.+)$/gm, replace: '<li>$1</li>' },
  // Blockquote
  { pattern: /^> (.+)$/gm, replace: '<blockquote>$1</blockquote>' },
  // Horizontal rule
  { pattern: /^---$/gm, replace: '<hr>' },
  // Line breaks (double newline = paragraph)
  { pattern: /\n\n/g, replace: '</p><p>' },
];

export function parseMarkdown(text) {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Temporarily protect code blocks
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

  // Apply formatting rules
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

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  
  // Paragraphs
  html = '<p>' + html.replace(/\n\n+/g, '</p><p>') + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[234]>)/g, '$1');
  html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre>)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(
      `__CODE_BLOCK_${i}__`,
      `<pre><code class="language-${block.lang}">${block.code}</code></pre>`
    );
  });
  
  inlineCodes.forEach((code, i) => {
    html = html.replace(`__INLINE_CODE_${i}__`, `<code>${code}</code>`);
  });

  return html;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Streaming-friendly: parse incrementally
export function createStreamingParser() {
  let buffer = '';
  
  return {
    append(chunk) {
      buffer += chunk;
      return parseMarkdown(buffer);
    },
    getContent() {
      return buffer;
    },
    reset() {
      buffer = '';
    }
  };
}





