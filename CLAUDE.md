# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MAV (Multi-AI Voting) is a Chrome Extension implementing the "LLM Council" concept: parallel queries to multiple LLMs, anonymous peer review, and chairman synthesis for final answers. Built with Manifest V3.

**Key Features:**
- Parallel streaming queries to multiple LLMs via OpenRouter API
- Optional anonymous peer review stage where models rank each other
- Chairman synthesis stage that combines responses into final answer
- Web search integration via Brave Search API
- WYSIWYG markdown canvas for editing and AI-assisted content creation
- Context management system for collecting page content/selections

## Development Commands

Since this is a Chrome Extension, there are no build/compile steps. Development is done by loading the extension directly:

1. **Load Extension in Chrome:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `mav-extension` directory

2. **Reload Extension After Changes:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on the MAV extension card
   - Or use the keyboard shortcut: Cmd+R on the extensions page

3. **View Console Logs:**
   - **Background service worker:** `chrome://extensions/` → Click "service worker" link under MAV
   - **Side panel:** Right-click in side panel → Inspect
   - **Canvas page:** Right-click in canvas → Inspect
   - **Content script:** Open DevTools on any web page where context menu was used

## Architecture

### Three-Tier Communication Model

1. **UI Layer** (sidepanel, canvas, options)
   - Send messages to background via `chrome.runtime.sendMessage()`
   - Use port connections for streaming: `chrome.runtime.connect({ name: 'stream' })`

2. **Background Service Worker** (`background.js`)
   - Handles all API requests to OpenRouter and Brave Search
   - Manages streaming responses via port connections
   - Coordinates context menu actions and page content extraction
   - Updates extension badge with context item count

3. **Content Scripts** (`content/content.js`)
   - Injected dynamically when needed to extract page content
   - Extracts selected text from web pages
   - Shows toast notifications in page context

### Council Logic (Three Stages)

**Stage 1: Parallel Queries**
- Multiple models receive the same query simultaneously
- Responses stream in real-time via SSE from OpenRouter
- Each model's response displayed in separate tab

**Stage 2: Anonymous Peer Review** (optional)
- Each model evaluates OTHER models' responses (excluding its own)
- Responses anonymized as "Response A", "Response B", etc.
- Reviews return JSON with rankings and reasons
- Implemented in `lib/council.js::generateReviewPrompt()`

**Stage 3: Chairman Synthesis**
- Designated "chairman" model receives all responses + review summary
- Synthesizes a final answer incorporating best insights
- Implemented in `lib/council.js::generateChairmanPrompt()`

### Storage Architecture

**chrome.storage.sync** (cross-device):
- `apiKey`: OpenRouter API key
- `braveApiKey`: Brave Search API key
- `councilModels`: Array of model IDs to query in parallel
- `chairmanModel`: Model ID for synthesis stage
- `enableReview`: Boolean for peer review stage
- `reviewPrompt`: Custom prompt template for reviews
- `chairmanPrompt`: Custom prompt template for synthesis

**chrome.storage.local** (local only):
- `conversations`: Array of past council sessions (max 50)
- `canvasDocuments`: Saved canvas documents
- `contextItems`: Context items added via right-click menu
- `canvasImport`: Temporary storage for importing content to canvas

### Key Files

**Core Logic:**
- `lib/council.js`: Peer review and chairman prompt generation, JSON parsing
- `lib/models.js`: Model metadata, pricing info ($USD per 1M tokens), token estimation
- `lib/storage.js`: Chrome storage helpers with defaults
- `lib/api.js`: OpenRouter API wrapper (minimal, most logic in background.js)
- `lib/markdown.js`: Markdown parser for rendering responses

**UI Components:**
- `sidepanel/app.js`: Main council interface with tabs, streaming, and context management
- `canvas/canvas.js`: WYSIWYG markdown editor with AI assist features
- `options/options.js`: Settings page for API keys, model selection, prompt customization
- `content/content.js`: Page content extraction and toast notifications

**Entry Points:**
- `background.js`: Service worker handling all API calls and message routing
- `manifest.json`: Extension configuration with permissions

### Streaming Implementation

Uses Chrome runtime port connections to bypass service worker timeout (30s limit):

```javascript
// In UI (sidepanel/app.js)
const port = chrome.runtime.connect({ name: 'stream' });
port.postMessage({ type: 'QUERY_MODEL_STREAM', payload: { model, messages } });
port.onMessage.addListener(msg => {
  if (msg.type === 'CHUNK') {
    // Append streaming text
  }
});

// In background.js
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'stream') {
    // Handle streaming fetch, post chunks via port.postMessage()
  }
});
```

### Context System

Users can right-click selected text → "加入 MAV Context":
- Creates context item with UUID, title, content, URL, timestamp
- Stored in `chrome.storage.local.contextItems`
- Badge on extension icon shows count
- Sidepanel displays context items as chips
- Context items can be included in queries as additional context
- Canvas can import context items

### Image Generation

Models with `canImage: true` (e.g., `google/gemini-3-pro-image-preview`) can generate images:
- Non-streaming mode used for image-capable models when image mode enabled
- Response contains both text and image URLs
- Images displayed in response alongside text

## Important Patterns

### Model Configuration

Model IDs follow `provider/model-name` format (OpenRouter convention):
- `openai/gpt-5.1`
- `anthropic/claude-sonnet-4.5`
- `google/gemini-3-pro-preview`
- `x-ai/grok-3`

Pricing in `lib/models.js` is per 1M tokens in USD.

### Error Handling

All API calls should handle:
- Missing API key → Show clear error to set in Options
- Rate limiting → OpenRouter may throttle
- Invalid JSON in peer reviews → Fall back gracefully
- Service worker timeout → Use port connections for long operations

### Prompt Customization

Users can customize prompts in Options page:
- `{query}` placeholder for user's question
- `{responses}` placeholder for formatted model responses
- `{ranking}` placeholder for peer review summary
- Defaults in `options/options.js::DEFAULT_REVIEW_PROMPT` and `DEFAULT_CHAIRMAN_PROMPT`

## Chinese Localization

UI is primarily in Traditional Chinese (繁體中文):
- "開啟 MAV 面板" = "Open MAV Panel"
- "加入 MAV Context" = "Add to MAV Context"
- "在畫布中開啟" = "Open in Canvas"

Keep this in mind when adding new UI text.

## Common Gotchas

1. **Service Worker Restarts:** Background service worker can restart at any time. Don't store state there. Use chrome.storage.

2. **Content Script Injection:** Cannot inject into `chrome://` or `chrome-extension://` pages. Always check URL before `chrome.scripting.executeScript()`.

3. **CORS with OpenRouter:** Must include headers:
   ```javascript
   'HTTP-Referer': 'chrome-extension://mav-extension',
   'X-Title': 'MAV Extension'
   ```

4. **Streaming Parsing:** SSE data comes as `data: {...}\n\ndata: [DONE]`. Must handle partial chunks with buffer.

5. **Anonymous Review Mapping:** When generating review prompts, responses are labeled A, B, C. Must map back to actual model names using index math (`charCodeAt(0) - 65`).

6. **Context Limit:** Page content extraction limited to 50,000 characters to avoid hitting model context windows.
