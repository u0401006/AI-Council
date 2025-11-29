// Storage helper for chrome.storage API

const DEFAULTS = {
  apiKey: '',
  councilModels: [
    'openai/gpt-5.1',
    'anthropic/claude-sonnet-4.5',
    'google/gemini-3-pro-preview',
    'google/gemini-2.5-flash'
  ],
  chairmanModel: 'anthropic/claude-sonnet-4.5',
  enableReview: true,
  conversations: []
};

export async function getSettings() {
  const result = await chrome.storage.sync.get(DEFAULTS);
  return result;
}

export async function saveSettings(settings) {
  await chrome.storage.sync.set(settings);
}

export async function getApiKey() {
  const result = await chrome.storage.sync.get('apiKey');
  return result.apiKey || '';
}

export async function getConversations() {
  const result = await chrome.storage.local.get('conversations');
  return result.conversations || [];
}

export async function saveConversation(conversation) {
  const conversations = await getConversations();
  conversations.unshift({
    ...conversation,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  });
  
  // Keep only last 50 conversations
  if (conversations.length > 50) {
    conversations.length = 50;
  }
  
  await chrome.storage.local.set({ conversations });
}

export async function clearConversations() {
  await chrome.storage.local.set({ conversations: [] });
}

