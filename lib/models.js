// Model metadata and pricing info

export const MODELS = {
  // OpenAI
  'openai/gpt-5.1': {
    name: 'GPT-5.1',
    provider: 'OpenAI',
    inputPrice: 5,
    outputPrice: 15,
    contextWindow: 128000
  },
  'openai/gpt-4o': {
    name: 'GPT-4o',
    provider: 'OpenAI',
    inputPrice: 2.5,
    outputPrice: 10,
    contextWindow: 128000
  },
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    inputPrice: 0.15,
    outputPrice: 0.6,
    contextWindow: 128000
  },
  // Anthropic
  'anthropic/claude-sonnet-4.5': {
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 200000
  },
  'anthropic/claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 200000
  },
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 200000
  },
  // Google
  'google/gemini-3-pro-preview': {
    name: 'Gemini 3 Pro',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 5,
    contextWindow: 1000000
  },
  'google/gemini-3-pro-image-preview': {
    name: 'Gemini 3 Pro Image',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 5,
    contextWindow: 1000000
  },
  'google/gemini-2.5-flash': {
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    inputPrice: 0.15,
    outputPrice: 0.6,
    contextWindow: 1000000
  },
  'google/gemini-2.0-flash-001': {
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    inputPrice: 0.1,
    outputPrice: 0.4,
    contextWindow: 1000000
  },
  'google/gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 5,
    contextWindow: 2000000
  },
  // Others
  'x-ai/grok-3': {
    name: 'Grok 3',
    provider: 'xAI',
    inputPrice: 3,
    outputPrice: 15,
    contextWindow: 131072
  },
  'meta-llama/llama-3.1-405b-instruct': {
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    inputPrice: 2,
    outputPrice: 2,
    contextWindow: 131072
  },
  'deepseek/deepseek-r1': {
    name: 'DeepSeek R1',
    provider: 'DeepSeek',
    inputPrice: 0.55,
    outputPrice: 2.19,
    contextWindow: 64000
  },
  'mistralai/mistral-large-2411': {
    name: 'Mistral Large',
    provider: 'Mistral',
    inputPrice: 2,
    outputPrice: 6,
    contextWindow: 128000
  }
};

export function getModelInfo(modelId) {
  return MODELS[modelId] || {
    name: modelId.split('/').pop(),
    provider: modelId.split('/')[0],
    inputPrice: 0,
    outputPrice: 0,
    contextWindow: 0
  };
}

export function getModelName(modelId) {
  return getModelInfo(modelId).name;
}

export function estimateTokens(text) {
  // Rough estimation: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

export function calculateCost(modelId, inputTokens, outputTokens) {
  const info = getModelInfo(modelId);
  const inputCost = (inputTokens / 1_000_000) * info.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * info.outputPrice;
  return {
    input: inputCost,
    output: outputCost,
    total: inputCost + outputCost
  };
}

export function formatCost(cost) {
  if (cost < 0.0001) return '<$0.0001';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

