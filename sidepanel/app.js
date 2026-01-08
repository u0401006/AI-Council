// ============================================
// Inline: lib/markdown.js
// ============================================

function parseMarkdown(text) {
  if (!text) return '';
  let html = escapeHtmlMd(text);
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
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = '<p>' + html.replace(/\n\n+/g, '</p><p>') + '</p>';
  html = html.replace(/<p><\/p>/g, '').replace(/<p>(<h[234]>)/g, '$1').replace(/(<\/h[234]>)<\/p>/g, '$1')
    .replace(/<p>(<ul>)/g, '$1').replace(/(<\/ul>)<\/p>/g, '$1').replace(/<p>(<blockquote>)/g, '$1')
    .replace(/(<\/blockquote>)<\/p>/g, '$1').replace(/<p>(<pre>)/g, '$1').replace(/(<\/pre>)<\/p>/g, '$1')
    .replace(/<p>(<hr>)<\/p>/g, '$1');
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, `<pre><code class="language-${block.lang}">${block.code}</code></pre>`);
  });
  inlineCodes.forEach((code, i) => { html = html.replace(`__INLINE_CODE_${i}__`, `<code>${code}</code>`); });
  return html;
}
function escapeHtmlMd(text) { return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function createStreamingParser() {
  let buffer = '';
  return { append(chunk) { buffer += chunk; return parseMarkdown(buffer); }, getContent() { return buffer; }, reset() { buffer = ''; } };
}

// ============================================
// Inline: lib/models.js
// ============================================
// Default model metadata (fallback if dynamic pricing not available)
const DEFAULT_MODELS = {
  // OpenAI
  'openai/gpt-5.1': { name: 'GPT-5.1', provider: 'OpenAI', inputPrice: 5, outputPrice: 15, canVision: true },
  'openai/gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', inputPrice: 2.5, outputPrice: 10, canVision: true },
  'openai/gpt-4o-mini': { name: 'GPT-4o Mini', provider: 'OpenAI', inputPrice: 0.15, outputPrice: 0.6, canVision: true },
  // Anthropic
  'anthropic/claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  'anthropic/claude-sonnet-4': { name: 'Claude Sonnet 4', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  'anthropic/claude-3.5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPrice: 3, outputPrice: 15, canVision: true },
  // Google
  'google/gemini-3-pro-preview': { name: 'Gemini 3 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5, canVision: true },
  'google/gemini-3-pro-image-preview': { name: 'Gemini 3 Pro Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5, canVision: true },
  'google/gemini-2.5-flash': { name: 'Gemini 2.5 Flash', provider: 'Google', inputPrice: 0.15, outputPrice: 0.6, canVision: true },
  'google/gemini-2.5-flash-image-preview': { name: 'Gemini 2.5 Flash Image', provider: 'Google', inputPrice: 0.3, outputPrice: 2.5, canVision: true },
  'google/gemini-2.0-flash-001': { name: 'Gemini 2.0 Flash', provider: 'Google', inputPrice: 0.1, outputPrice: 0.4, canVision: true },
  'google/gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'Google', inputPrice: 1.25, outputPrice: 5, canVision: true },
  // Others
  'x-ai/grok-3': { name: 'Grok 3', provider: 'xAI', inputPrice: 3, outputPrice: 15, canVision: true },
  'meta-llama/llama-3.1-405b-instruct': { name: 'Llama 3.1 405B', provider: 'Meta', inputPrice: 2, outputPrice: 2 },
  'deepseek/deepseek-r1': { name: 'DeepSeek R1', provider: 'DeepSeek', inputPrice: 0.55, outputPrice: 2.19 },
  'mistralai/mistral-large-2411': { name: 'Mistral Large', provider: 'Mistral', inputPrice: 2, outputPrice: 6 }
};

// Runtime model registry (merged from defaults + dynamic pricing)
let MODELS = { ...DEFAULT_MODELS };

// Load dynamic pricing from storage and merge with defaults
async function loadDynamicPricing() {
  try {
    const result = await chrome.storage.local.get('availableModels');
    const dynamicModels = result.availableModels || [];
    
    // Merge dynamic pricing into MODELS
    for (const model of dynamicModels) {
      if (model.inputPrice !== undefined && model.outputPrice !== undefined) {
        // Update or add model with dynamic pricing
        MODELS[model.id] = {
          name: model.name,
          provider: model.provider,
          inputPrice: model.inputPrice,
          outputPrice: model.outputPrice,
          canVision: model.canVision || false,
          canImage: model.canImage || false
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load dynamic pricing:', err);
  }
}

function getModelInfo(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    return { name: 'Unknown', provider: 'Unknown', inputPrice: 0, outputPrice: 0 };
  }
  return MODELS[modelId] || { name: modelId.split('/').pop(), provider: modelId.split('/')[0], inputPrice: 0, outputPrice: 0 };
}
function getModelName(modelId) { return getModelInfo(modelId).name; }
function estimateTokens(text) { return Math.ceil(text.length / 4); }
function calculateCost(modelId, inputTokens, outputTokens) {
  const info = getModelInfo(modelId);
  return { input: (inputTokens / 1_000_000) * info.inputPrice, output: (outputTokens / 1_000_000) * info.outputPrice, total: ((inputTokens / 1_000_000) * info.inputPrice) + ((outputTokens / 1_000_000) * info.outputPrice) };
}
function formatCost(cost) { if (cost < 0.0001) return '<$0.0001'; if (cost < 0.01) return `$${cost.toFixed(4)}`; return `$${cost.toFixed(3)}`; }

// Format API errors to user-friendly messages
function formatApiError(error, modelName) {
  const msg = error?.message || String(error);
  
  if (msg.includes('Failed to fetch')) {
    return {
      short: t('errors.connectionFailed', { model: modelName }),
      detail: t('errors.connectionDetail'),
      actions: ['retry', 'switch-model']
    };
  }
  if (msg.includes('timeout') || msg.includes('超時') || msg.includes('逾時')) {
    return {
      short: t('errors.timeout', { model: modelName }),
      detail: t('errors.timeoutDetail'),
      actions: ['retry']
    };
  }
  if (msg.includes('API Key') || msg.includes('Unauthorized') || msg.includes('401')) {
    return {
      short: t('errors.authFailed', { model: modelName }),
      detail: t('errors.authDetail'),
      actions: ['check-settings']
    };
  }
  if (msg.includes('rate limit') || msg.includes('429')) {
    return {
      short: t('errors.rateLimited', { model: modelName }),
      detail: t('errors.rateLimitDetail'),
      actions: ['retry']
    };
  }
  // Other errors
  return {
    short: t('errors.genericError', { model: modelName }),
    detail: msg.slice(0, 80),
    actions: ['retry']
  };
}

// ============================================
// Inline: lib/council.js
// ============================================
function generateReviewPrompt(query, responses, currentModel) {
  const otherResponses = responses.filter(r => r.model !== currentModel).map((r, i) => ({ label: `Response ${String.fromCharCode(65 + i)}`, content: r.content }));
  if (otherResponses.length === 0) return null;
  const responsesText = otherResponses.map(r => `### ${r.label}\n${r.content}`).join('\n\n---\n\n');
  
  // Use custom prompt with placeholders replaced
  let prompt = customReviewPrompt
    .replace('{query}', query)
    .replace('{responses}', responsesText);
  
  // Inject current language instruction (replaces any hardcoded language instruction)
  const langInstruction = i18n.getAILanguageInstruction();
  prompt = injectLanguageInstruction(prompt, langInstruction);
  
  return prompt;
}

// Helper to inject language instruction into prompts
function injectLanguageInstruction(prompt, langInstruction) {
  // Remove existing language instruction patterns
  const patterns = [
    /\*\*IMPORTANT:.*(?:Traditional Chinese|English|Japanese|繁體中文|日本語).*\*\*/gi,
    /\*\*重要：.*(?:繁體中文|Traditional Chinese|日本語).*\*\*/gi
  ];
  
  let cleaned = prompt;
  for (const pattern of patterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Insert language instruction after first paragraph or at the beginning
  const firstParagraphEnd = cleaned.indexOf('\n\n');
  if (firstParagraphEnd > 0 && firstParagraphEnd < 200) {
    return cleaned.slice(0, firstParagraphEnd) + '\n\n' + langInstruction + cleaned.slice(firstParagraphEnd);
  }
  return langInstruction + '\n\n' + cleaned;
}

function generateChairmanPrompt(query, responses, aggregatedRanking = null) {
  const responsesText = responses.map((r, i) => `### Expert ${i + 1} (${getModelName(r.model)})\n${r.content}`).join('\n\n---\n\n');
  let rankingInfo = '';
  if (aggregatedRanking && aggregatedRanking.length > 0) {
    rankingInfo = `## Peer Review Ranking\nBased on peer evaluation: ${aggregatedRanking.map((r, i) => `${i + 1}. ${getModelName(r.model)}`).join(', ')}`;
  }
  
  // Select prompt based on learner mode
  let promptTemplate = customChairmanPrompt;
  if (learnerMode !== 'standard' && LEARNER_CHAIRMAN_PROMPTS[learnerMode]) {
    promptTemplate = LEARNER_CHAIRMAN_PROMPTS[learnerMode];
  }
  
  // Use custom prompt with placeholders replaced
  let basePrompt = promptTemplate
    .replace('{query}', query)
    .replace('{responses}', responsesText)
    .replace('{ranking}', rankingInfo);
  
  // Inject current language instruction
  const langInstruction = i18n.getAILanguageInstruction();
  basePrompt = injectLanguageInstruction(basePrompt, langInstruction);
  
  // Append output style instructions from settings (skip for learner mode - they have their own format)
  let finalPrompt = learnerMode === 'standard' 
    ? basePrompt + getOutputStyleInstructions()
    : basePrompt;
  
  // Append task decomposition suffix if task planner is enabled
  if (enableTaskPlanner) {
    // Use learner-specific task suffix if in learner mode
    if (learnerMode !== 'standard' && LEARNER_TASK_SUFFIXES[learnerMode]) {
      finalPrompt += LEARNER_TASK_SUFFIXES[learnerMode];
    } else {
      finalPrompt += TASK_DECOMPOSITION_SUFFIX;
    }
  }
  
  return finalPrompt;
}

function parseReviewResponse(content) {
  try {
    // Extract JSON from code blocks or use raw content
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    let jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    // Try to extract JSON object/array if there's extra text
    const jsonObjMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonObjMatch) jsonStr = jsonObjMatch[0];
    
    jsonStr = jsonStr.trim();
    
    // Attempt to repair truncated JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (firstErr) {
      // Try to repair common truncation issues
      let repaired = jsonStr;
      
      // Remove trailing incomplete strings (e.g., "reason": "incomplete...)
      repaired = repaired.replace(/,?\s*"[^"]*":\s*"[^"]*$/g, '');
      
      // Remove trailing incomplete object entries
      repaired = repaired.replace(/,?\s*\{[^}]*$/g, '');
      
      // Count and balance brackets
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;
      
      // Close unclosed arrays first, then objects
      repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
      repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
      
      // Remove any trailing commas before closing brackets
      repaired = repaired.replace(/,\s*([}\]])/g, '$1');
      
      try {
        parsed = JSON.parse(repaired);
        console.warn('JSON repaired from truncated response');
      } catch (repairErr) {
        throw firstErr; // Throw original error if repair fails
      }
    }
    
    const rankings = parsed.rankings || parsed;
    if (!Array.isArray(rankings)) {
      return { error: '回應格式錯誤：rankings 不是陣列', raw: content };
    }
    
    // Validate each ranking item has required fields
    const validRankings = rankings.filter(r => 
      r && typeof r.response !== 'undefined' && typeof r.rank !== 'undefined'
    );
    
    if (validRankings.length === 0) {
      return { error: '無有效排名資料', raw: content };
    }
    
    return { success: true, rankings: validRankings };
  } catch (e) {
    console.error('Failed to parse review:', e);
    return { error: `JSON 解析失敗: ${e.message}`, raw: content };
  }
}

// Track review failures for retry functionality
let reviewFailures = new Map(); // model -> { error, raw, query, allResponses }

// ============================================
// Main App State
// ============================================
const IMAGE_MODELS = ['google/gemini-3-pro-image-preview', 'google/gemini-2.5-flash-image-preview'];
const DEFAULT_IMAGE_MODEL = 'google/gemini-3-pro-image-preview';

// Default prompts (same as options.js)
const DEFAULT_REVIEW_PROMPT = `You are an impartial evaluator. Rank the following responses to a user's question based on accuracy, completeness, and insight.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited.**

## User's Question
{query}

## Responses to Evaluate
{responses}

## Your Task
Rank these responses from best to worst. Output in this exact JSON format:
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由（繁體中文）"},
    {"response": "B", "rank": 2, "reason": "簡短理由（繁體中文）"}
  ]
}
\`\`\`

Be objective. Focus on factual accuracy and helpfulness. Write all reasons in Traditional Chinese.`;

const DEFAULT_CHAIRMAN_PROMPT = `You are the Chairman of an AI Council. Synthesize the expert responses into a single, comprehensive final answer.

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## User's Question
{query}

## Expert Responses
{responses}

{ranking}

## Your Task
Create a single authoritative answer that:
1. Incorporates the best insights from all experts
2. Resolves contradictions by favoring accurate information
3. Is well-organized and comprehensive
4. When referencing context/search results, use citation markers like [1], [2] to indicate sources

Provide your answer directly in Traditional Chinese (繁體中文), without meta-commentary.`;

// ============================================
// Learner Mode Prompts (Age-based)
// ============================================
const LEARNER_CHAIRMAN_PROMPTS = {
  '9-10': `你是一位會說故事的學習夥伴，正在和一位 9-10 歲的學生探索問題。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 學生的問題
{query}

## 專家們的回答
{responses}

{ranking}

## 回答原則（非常重要）
1. **不要給完整答案**：解釋約 70%，留 30% 讓探索任務來揭曉
2. 用簡單的詞彙，像在說故事一樣
3. 句子要短，容易理解
4. 用生活中的例子來解釋抽象概念
5. 語氣親切但不幼稚，像一個大哥哥/大姐姐
6. 結尾說：「還有一些有趣的發現等著你！看看下面的探索任務吧～」
7. **不要在回答中直接問問題**（問題會放到探索任務裡）

## 格式
- 分成清楚的小段落
- 重點用 **粗體** 標出
- 可以用有趣的小標題`,

  '11-12': `你是一位引導式的學習教練，正在和一位 11-12 歲的學生探索問題。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 學生的問題
{query}

## 專家們的回答
{responses}

{ranking}

## 回答原則（非常重要）
1. **不要給完整答案**：解釋約 50%，給線索讓學生推導其餘部分
2. 用清楚的句子，適度引入新詞彙並簡要解釋
3. 可以用比喻來解釋複雜概念
4. 培養邏輯推理：展示「因為...所以...」的思考方式
5. 結尾說：「這裡面還有一些值得探索的地方！看看下面的任務，試著自己找出答案吧！」
6. **不要在回答中直接問問題**（問題會放到探索任務裡）

## 格式
- 分成「已知線索」和「待探索」兩個方向
- 重點用 **粗體**
- 可以用「提示框」標出關鍵概念`,

  '13-15': `你是一位注重方法論的學習顧問，正在和一位 13-15 歲的學生討論問題。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 學生的問題
{query}

## 專家們的回答
{responses}

{ranking}

## 回答原則（非常重要）
1. **給框架，不給結論**：展示如何拆解問題，但讓學生自己推導結論
2. 使用標準語言，引入專業術語並簡要解釋
3. 介紹相關的分析方法或思考框架
4. 提出不同觀點：「有人認為...但也有人認為...」
5. 結尾說：「理解了這些框架後，你可以試著自己分析看看。下面的任務會引導你驗證自己的想法。」
6. **不要在回答中直接問問題**（問題會放到探索任務裡）

## 格式
- 包含「問題拆解」「思考框架」「已知資訊」三個區塊
- 可以用表格比較不同觀點
- 專業術語用括號加註解釋`,

  '16-18': `你是一位學術研究導向的學習夥伴，正在和一位 16-18 歲的學生討論問題。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 學生的問題
{query}

## 專家們的回答
{responses}

{ranking}

## 回答原則（非常重要）
1. **給多元觀點，不下定論**：呈現該領域的主要論點和爭議，讓學生形成自己的判斷
2. 使用學術語言，專業術語可直接使用
3. 介紹主要學派或理論框架
4. 指出爭議點和未解問題
5. 示範如何評估資料來源的可信度
6. 結尾說：「這個議題還有許多值得深入研究的面向。下方的任務會引導你進一步批判分析。」
7. **不要在回答中直接問問題**（問題會放到探索任務裡）

## 格式
- 包含「背景脈絡」「主要論點」「不同觀點」「待驗證假設」
- 標註資訊來源的類型（理論、實證研究、專家意見等）
- 區分「已有共識」vs「仍有爭議」的部分`
};

// Learner Mode Task Suffixes (Age-based)
const LEARNER_TASK_SUFFIXES = {
  '9-10': `

## 探索任務
請為這位 9-10 歲的學習者設計 2-3 個探索任務，幫助他們自己發現你剛才保留的那 30% 內容：
\`\`\`json
{"tasks": [
  {"content": "任務描述（用疑問句）", "type": "explore", "hint": "小提示，給一個線索"},
  {"content": "任務描述", "type": "apply", "hint": "小提示"}
]}
\`\`\`

任務類型（必須標註 type）：
- "explore": 繼續探索（「為什麼會這樣呢？」「如果...會怎樣？」）
- "verify": 驗證想法（「這個說法對嗎？來查查看！」）
- "apply": 動手試試（「用這個方法來...」）
- "connect": 連結知識（「這跟...有什麼關係？」）

任務要求：
- 用疑問句或邀請句，激發好奇心
- 難度適合 9-10 歲，用簡單詞彙
- hint 給一個小線索，不要直接說答案
- 至少有一個任務要揭露你保留的內容`,

  '11-12': `

## 探索任務
請為這位 11-12 歲的學習者設計 2-3 個探索任務，引導他們推導出你保留的那 50% 內容：
\`\`\`json
{"tasks": [
  {"content": "任務描述（用疑問句）", "type": "explore", "hint": "思考線索"},
  {"content": "任務描述", "type": "verify", "hint": "驗證方向"}
]}
\`\`\`

任務類型（必須標註 type）：
- "explore": 深入探索（「為什麼...？」「...的原理是什麼？」）
- "verify": 驗證推理（「如果這個假設正確，那麼...？」）
- "apply": 實際應用（「試著用這個概念解釋...」）
- "connect": 連結延伸（「這跟你學過的...有什麼關聯？」）

任務要求：
- 任務要有推理性，讓學生連結已知和未知
- hint 給思考方向，不給答案
- 至少有一個任務引導學生推導出關鍵結論
- 可以有一個較有挑戰性的延伸任務`,

  '13-15': `

## 探索任務
請為這位 13-15 歲的學習者設計 2-3 個探索任務，引導他們運用框架自行得出結論：
\`\`\`json
{"tasks": [
  {"content": "任務描述", "type": "verify", "hint": "方法提示"},
  {"content": "任務描述", "type": "explore", "hint": "分析角度"}
]}
\`\`\`

任務類型（必須標註 type）：
- "explore": 方法探究（「用...方法分析這個問題」）
- "verify": 假設驗證（「如何驗證這個論點？」）
- "apply": 框架應用（「套用...框架來分析」）
- "connect": 跨領域連結（「從...角度來看這個問題」）

任務要求：
- 強調「如何思考」而非「記住什麼」
- hint 提供方法論提示
- 至少有一個任務要求學生提出自己的論點
- 可以有一個需要查找資料來驗證的任務`,

  '16-18': `

## 探索任務
請為這位 16-18 歲的學習者設計 2-3 個探索任務，引導他們進行批判分析和獨立研究：
\`\`\`json
{"tasks": [
  {"content": "任務描述", "type": "verify", "hint": "研究方向"},
  {"content": "任務描述", "type": "connect", "hint": "比較框架"}
]}
\`\`\`

任務類型（必須標註 type）：
- "explore": 深度研究（「探討...的深層原因」）
- "verify": 批判驗證（「評估這個論點的證據強度」）
- "apply": 實證應用（「設計一個方法來測試...」）
- "connect": 理論整合（「比較不同學派對此的看法」）

任務要求：
- 強調批判思考和證據評估
- hint 提供研究方法或學術資源方向
- 至少有一個任務鼓勵質疑現有觀點
- 可以有一個需要綜合多個來源的任務`
};

let councilModels = [];
let chairmanModel = '';
let plannerModel = '';  // Empty means disabled (use rule-based planner)
const REVIEW_WINNER_VALUE = '__review_winner__'; // 互評勝者選項的特殊值
let enableReview = true;
let enableImage = false;
let enableSearchMode = false;
let maxSearchIterations = 5;
let maxCardDepth = 3; // 任務深度上限 (L0-L3)
let searchIteration = 0;
let currentSearchQueries = [];
let customReviewPrompt = DEFAULT_REVIEW_PROMPT;
let customChairmanPrompt = DEFAULT_CHAIRMAN_PROMPT;
let learnerMode = 'standard'; // 'standard', '9-10', '11-12', '13-15', '16-18'
let responses = new Map();
let reviews = new Map();
let activeTab = null;
let currentQuery = '';
let currentConversation = null;
let historyVisible = false;
let contextItems = []; // Array of { id, type, title, content, timestamp, scope }
let sessionContextItems = []; // Session-level context items (shared across all cards)

// ============================================
// Storage Abstraction Layer (for future IndexedDB expansion)
// ============================================
// Current implementation uses chrome.storage.local for sessions
// This interface can be swapped to IndexedDB for larger storage needs
const contextStorage = {
  // Save session context data
  async saveSession(sessionId, sessionData) {
    // Currently saves via saveSession() to chrome.storage.local
    // Future: IndexedDB implementation
    return true;
  },
  
  // Load session context data
  async loadSession(sessionId) {
    // Currently loads via loadSession() from chrome.storage.local
    // Future: IndexedDB implementation
    return null;
  },
  
  // Clear session context data
  async clearSession(sessionId) {
    // Future: IndexedDB implementation
    return true;
  },
  
  // Get storage stats (for monitoring)
  async getStats() {
    try {
      const usage = await navigator.storage?.estimate?.() || {};
      return {
        quota: usage.quota || 0,
        usage: usage.usage || 0,
        available: (usage.quota || 0) - (usage.usage || 0)
      };
    } catch {
      return { quota: 0, usage: 0, available: 0 };
    }
  }
};

// Vision Council state
let visionMode = false;
let uploadedImage = null; // { dataUrl, file, width, height, name, size }
let visionReviewDepth = 'standard'; // 'simple', 'standard', 'deep'

// Cost tracking state - tracks costs per stage
let sessionCost = {
  stage1: { input: 0, output: 0, total: 0, calls: 0 },
  stage2: { input: 0, output: 0, total: 0, calls: 0 },
  stage3: { input: 0, output: 0, total: 0, calls: 0 },
  imageGen: { input: 0, output: 0, total: 0, calls: 0 },
  imageTokens: 0,
  total: 0
};
let currentStage = null; // 'stage1', 'stage2', 'stage3', 'imageGen'

// Search iteration state
let pendingSearchKeyword = null; // Selected keyword waiting for prompt edit
let isSearchIterationMode = false; // Whether we're in "edit prompt for next iteration" mode
let originalQueryBeforeIteration = ''; // Store original query for AI suggestion context

// Search suggestion suffix for COUNCIL models (Stage 1)
const COUNCIL_SEARCH_SUFFIX = `

## 搜尋建議
若此問題需要更新資訊或深入探索，請在回答最後提供 1-2 個搜尋關鍵詞建議：
\`\`\`json
{"search_queries": ["具體搜尋關鍵詞"]}
\`\`\`
搜尋建議應該針對你回答中不確定或需要驗證的部分。若你認為不需要搜尋，可省略此區塊。`;

// Search strategy prompt suffix for CHAIRMAN (Stage 3) - kept for backwards compatibility
const SEARCH_STRATEGY_SUFFIX = `

## 搜尋策略
請在回答最後**必須**提供 2-3 個搜尋關鍵詞建議，以便進一步深入探索此議題。使用以下 JSON 格式：
\`\`\`json
{"search_queries": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]}
\`\`\`
搜尋關鍵詞應該是：
- 具體、有針對性的
- 能夠補充目前回答中未涵蓋的面向
- 探索相關但尚未深入的延伸議題
即使你認為目前資訊已相當完整，仍請提供可延伸探索的方向。`;

// Search consolidation prompt for Chairman (Stage 2.5)
const SEARCH_CONSOLIDATION_PROMPT = `你是 AI Council 的主席。以下是各模型對用戶問題的回答及其搜尋建議。

## 用戶問題
{query}

## 模型回答摘要與搜尋建議
{modelSuggestions}

## 你的任務
分析各模型的搜尋建議，整合為 3-5 個最有價值的搜尋關鍵詞。只輸出以下 JSON 格式，不要其他文字：
\`\`\`json
{"consolidated_queries": ["關鍵詞1", "關鍵詞2", "關鍵詞3"]}
\`\`\``;

// Task decomposition suffix (appended to chairman prompt)
const TASK_DECOMPOSITION_SUFFIX = `

## 任務分解
若此問題可拆解為多個可執行的子任務或延伸探索方向，請在回答最後提供：
\`\`\`json
{"tasks": [
  {"content": "具體任務描述", "priority": "high", "suggestedFeatures": ["search"]},
  {"content": "另一個任務", "priority": "medium", "suggestedFeatures": ["image"]}
]}
\`\`\`
任務應該是：
- 具體、可執行的行動項目
- 能夠延伸或深化目前討論的主題
- 標註優先級：high（核心必要）、medium（重要補充）、low（可選延伸）
- suggestedFeatures 陣列（可選）：根據任務性質建議啟用的功能
  - "search": 任務需要網路搜尋獲取最新資訊
  - "image": 任務需要生成圖片/圖表
  - "vision": 任務需要分析圖片內容
若問題較簡單無需拆解，可省略此區塊。`;

// Context summary prompt (for generating inheritable context)
const CONTEXT_SUMMARY_PROMPT = `請將以下討論內容精簡為脈絡摘要（200字內），保留：
1. 核心問題與目標
2. 關鍵決策與結論
3. 重要限制條件

原始問題：{query}

結論：{answer}

請只輸出摘要內容，不要加任何前綴或標題。`;

// Generate context summary for card inheritance
async function generateContextSummary(query, finalAnswer) {
  try {
    const prompt = CONTEXT_SUMMARY_PROMPT
      .replace('{query}', query)
      .replace('{answer}', finalAnswer.slice(0, 2000)); // 限制長度避免 token 過多
    
    const summary = await queryModelNonStreaming(getAvailableHelperModel(), prompt, false);
    return summary.trim().slice(0, 500); // 限制摘要長度
  } catch (err) {
    console.error('Failed to generate context summary:', err);
    return '';
  }
}

// ============================================
// Session & Card State (Task Planner)
// ============================================
let sessionState = {
  id: null,
  name: null,             // Session 名稱（AI 生成）
  rootCardId: null,
  cards: new Map(),       // cardId -> Card object
  currentCardId: null,
  breadcrumb: [],         // [cardId, ...]
};

// Enable task planner mode
let enableTaskPlanner = true;

// Generate session name using AI
async function generateSessionName(rootQuery) {
  try {
    const prompt = `請為以下討論主題生成一個簡短的專案名稱（最多6個中文字，不要標點符號）：\n\n${rootQuery}\n\n只輸出名稱，不要其他文字。`;
    const name = await queryModelNonStreaming(getAvailableHelperModel(), prompt, false);
    return name.trim().slice(0, 6);
  } catch (err) {
    console.error('Failed to generate session name:', err);
    const formatted = formatApiError(err, '主席模型');
    showToast(`專案名稱生成失敗（${formatted.detail}），使用預設名稱`, true);
    return null;
  }
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Create a new card
function createCard(parentId, query) {
  const parentCard = parentId ? sessionState.cards.get(parentId) : null;
  const depth = parentCard ? parentCard.depth + 1 : 0;
  
  // 繼承父卡片的 settings，或使用當前全域設定
  const settings = parentCard?.settings 
    ? { ...parentCard.settings }
    : {
        enableImage: enableImage,
        enableSearchMode: enableSearchMode,
        visionMode: visionMode
      };
  
  // 繼承父卡片的 context items（深拷貝以避免引用問題）
  const inheritedContextItems = parentCard?.cardContextItems 
    ? JSON.parse(JSON.stringify(parentCard.cardContextItems))
    : [];
  
  const card = {
    id: generateId(),
    parentId: parentId,
    query: query,
    responses: [],
    reviews: [],
    finalAnswer: '',
    tasks: [],           // [{ id, content, status, priority, cardId, suggestedFeatures }]
    childCardIds: [],
    depth: depth,
    timestamp: Date.now(),
    searchIteration: 0,
    contextItemsSnapshot: [],
    cardContextItems: inheritedContextItems,  // 繼承父卡片的 context items
    settings: settings,              // 卡片獨立的功能設定
    inheritedContext: parentCard?.contextSummary || '',  // 繼承的上層脈絡摘要
    contextSummary: ''               // 此卡片完成後的脈絡摘要
  };
  
  if (inheritedContextItems.length > 0) {
    console.log('[createCard] Inherited', inheritedContextItems.length, 'context items from parent card');
  }
  
  sessionState.cards.set(card.id, card);
  
  // Update parent's childCardIds
  if (parentCard) {
    parentCard.childCardIds.push(card.id);
  }
  
  // 立即保存 session（確保卡片創建後即持久化）
  saveSession();
  
  return card;
}

// Initialize a new session
function initSession() {
  sessionState = {
    id: generateId(),
    name: null,
    rootCardId: null,
    cards: new Map(),
    currentCardId: null,
    breadcrumb: [],
  };
  // Clear session-level context items
  sessionContextItems = [];
}

// Get current card
function getCurrentCard() {
  if (!sessionState.currentCardId) return null;
  return sessionState.cards.get(sessionState.currentCardId);
}

// Parse tasks from AI response
function parseTasksFromResponse(content) {
  try {
    // 更精確的匹配：找到包含 tasks 但不包含 search_queries 的 JSON 區塊
    const blocks = content.match(/```(?:json)?\s*(\{[^`]*?\})\s*```/g) || [];
    for (const block of blocks) {
      if (block.includes('"tasks"') && !block.includes('search_queries')) {
        const jsonStr = block.replace(/```(?:json)?\s*|\s*```/g, '');
        const parsed = JSON.parse(jsonStr);
        
        if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
          continue;
        }
        
        // Normalize tasks with suggestedFeatures and learner mode fields
        const validFeatures = ['search', 'image', 'vision'];
        const validTypes = ['explore', 'verify', 'apply', 'connect'];
        const tasks = parsed.tasks.map(t => ({
          id: generateId(),
          content: t.content || '',
          priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
          status: 'pending',  // pending | in_progress | completed
          cardId: null,       // Will be set when task becomes a card
          suggestedFeatures: Array.isArray(t.suggestedFeatures) 
            ? t.suggestedFeatures.filter(f => validFeatures.includes(f))
            : [],
          // Learner mode fields
          type: validTypes.includes(t.type) ? t.type : null,  // explore | verify | apply | connect
          hint: t.hint || null  // Hint for learner mode tasks
        })).filter(t => t.content.trim());
        
        return { success: true, tasks };
      }
    }
    return { success: false, tasks: [] };
  } catch (e) {
    console.error('Failed to parse tasks:', e);
    return { success: false, tasks: [], error: e.message };
  }
}

// Extract final answer content (remove JSON blocks for display)
function extractFinalAnswerDisplay(content) {
  // Remove tasks JSON block for cleaner display (both standard and learner mode)
  return content
    .replace(/```(?:json)?\s*\{[\s\S]*?"tasks"[\s\S]*?\}\s*```/g, '')
    .replace(/## 任務分解[\s\S]*$/g, '')
    .replace(/## 探索任務[\s\S]*$/g, '')  // Learner mode task section
    .trim();
}

// ============================================
// Task Planner UI Functions
// ============================================

// Current tasks being displayed (for editing without card system)
let displayedTasks = [];

// Render the TODO section with tasks
function renderTodoSection(tasks) {
  if (!todoSection || !todoList) return;
  
  displayedTasks = tasks || [];
  
  // Update count
  const pendingCount = displayedTasks.filter(t => t.status !== 'completed').length;
  if (todoCount) {
    todoCount.textContent = pendingCount;
  }
  
  // Show section
  todoSection.classList.remove('hidden');
  
  // Render tasks
  if (displayedTasks.length === 0) {
    todoList.innerHTML = `<div class="todo-empty">${t('sidepanel.todoEmpty')}</div>`;
    return;
  }
  
  todoList.innerHTML = displayedTasks.map(task => {
    // 狀態標籤：已展開 or 待處理
    const statusLabel = task.cardId 
      ? '<span class="todo-status expanded">已展開</span>' 
      : '<span class="todo-status pending">待處理</span>';
    
    // 功能推薦 badges
    const featureBadges = (task.suggestedFeatures || []).map(f => {
      const featureMap = {
        search: { icon: '🔍', label: '搜尋' },
        image: { icon: '🎨', label: '製圖' },
        vision: { icon: '👁', label: '視覺' }
      };
      const feature = featureMap[f];
      return feature ? `<span class="todo-feature-badge" data-feature="${f}" title="${feature.label}">${feature.icon}</span>` : '';
    }).join('');
    
    // Learner mode type icon (if in learner mode)
    const typeIconMap = {
      explore: { icon: '🔍', label: '探索' },
      verify: { icon: '✓', label: '驗證' },
      apply: { icon: '🛠', label: '試試看' },
      connect: { icon: '🔗', label: '連結' }
    };
    const typeInfo = task.type ? typeIconMap[task.type] : null;
    const typeIcon = typeInfo 
      ? `<span class="todo-type-icon" data-type="${task.type}" title="${typeInfo.label}">${typeInfo.icon}</span>` 
      : '';
    
    // Hint display for learner mode
    const hintHtml = task.hint 
      ? `<div class="todo-hint">${escapeHtml(task.hint)}</div>` 
      : '';
    
    // Use type icon instead of priority for learner mode tasks
    const priorityOrType = task.type 
      ? typeIcon 
      : `<span class="todo-priority ${task.priority}">${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</span>`;
    
    return `
    <div class="todo-item ${task.cardId ? 'has-card' : ''} ${task.type ? 'learner-task' : ''}" data-task-id="${task.id}">
      <div class="todo-branch-icon">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="18" r="3"></circle>
          <circle cx="6" cy="6" r="3"></circle>
          <path d="M6 21V9a6 6 0 0 0 6 6h3"></path>
        </svg>
      </div>
      <div class="todo-body">
        <div class="todo-content" data-task-id="${task.id}">${escapeHtml(task.content)}</div>
        ${hintHtml}
        <div class="todo-meta">
          ${priorityOrType}
          ${featureBadges}
          ${statusLabel}
        </div>
      </div>
      <div class="todo-actions">
        <button class="todo-action-btn edit-btn" data-task-id="${task.id}" title="編輯">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="todo-action-btn delete-btn" data-task-id="${task.id}" title="刪除">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `;
  }).join('');
  
  // Add event listeners
  setupTodoEventListeners();
}

// Setup event listeners for todo items
function setupTodoEventListeners() {
  // 點擊整個任務列展開討論（排除按鈕區域）
  todoList.querySelectorAll('.todo-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // 如果點擊的是按鈕區域，不觸發展開
      if (e.target.closest('.todo-actions') || e.target.closest('.edit-btn') || e.target.closest('.delete-btn')) {
        return;
      }
      const taskId = item.dataset.taskId;
      expandTaskToCard(taskId);
    });
  });
  
  // Edit task
  todoList.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      editTask(taskId);
    });
  });
  
  // Delete task
  todoList.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const taskId = btn.dataset.taskId;
      deleteTask(taskId);
    });
  });
}

// Toggle task completion status
function toggleTaskStatus(taskId) {
  const task = displayedTasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.status = task.status === 'completed' ? 'pending' : 'completed';
  
  // Update current card if exists
  const currentCard = getCurrentCard();
  if (currentCard) {
    const cardTask = currentCard.tasks.find(t => t.id === taskId);
    if (cardTask) cardTask.status = task.status;
  }
  
  renderTodoSection(displayedTasks);
}

// Edit task content
function editTask(taskId) {
  const task = displayedTasks.find(t => t.id === taskId);
  if (!task) return;
  
  const todoItem = todoList.querySelector(`[data-task-id="${taskId}"].todo-item`);
  const contentEl = todoItem?.querySelector('.todo-content');
  if (!contentEl) return;
  
  // Replace content with textarea
  const currentContent = task.content;
  contentEl.innerHTML = `<textarea class="todo-content-edit" data-task-id="${taskId}">${escapeHtml(currentContent)}</textarea>`;
  
  const textarea = contentEl.querySelector('textarea');
  textarea.focus();
  textarea.select();
  
  // Save on blur or Enter
  const saveEdit = () => {
    const newContent = textarea.value.trim();
    if (newContent && newContent !== currentContent) {
      task.content = newContent;
      // Update current card if exists
      const currentCard = getCurrentCard();
      if (currentCard) {
        const cardTask = currentCard.tasks.find(t => t.id === taskId);
        if (cardTask) cardTask.content = newContent;
      }
    }
    renderTodoSection(displayedTasks);
  };
  
  textarea.addEventListener('blur', saveEdit);
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === 'Escape') {
      renderTodoSection(displayedTasks);
    }
  });
}

// Delete task
function deleteTask(taskId) {
  displayedTasks = displayedTasks.filter(t => t.id !== taskId);
  
  // Update current card if exists
  const currentCard = getCurrentCard();
  if (currentCard) {
    currentCard.tasks = currentCard.tasks.filter(t => t.id !== taskId);
  }
  
  renderTodoSection(displayedTasks);
}

// Add new task manually
// Track last added task to prevent duplicates
let lastAddedTaskContent = '';
let lastAddedTaskTime = 0;

function addTaskManually(content, priority = 'medium') {
  const trimmedContent = content.trim();
  
  // Debounce: prevent duplicate submissions within 500ms
  const now = Date.now();
  if (trimmedContent === lastAddedTaskContent && (now - lastAddedTaskTime) < 500) {
    console.log('Duplicate task prevented (debounce)');
    return;
  }
  
  // Check if a pending task with the same content already exists
  const existingTask = displayedTasks.find(
    t => t.content.toLowerCase() === trimmedContent.toLowerCase() && t.status === 'pending'
  );
  if (existingTask) {
    showToast(t('messages.taskExists'));
    return;
  }
  
  // Update debounce tracker
  lastAddedTaskContent = trimmedContent;
  lastAddedTaskTime = now;
  
  const newTask = {
    id: generateId(),
    content: trimmedContent,
    priority: priority,
    status: 'pending',
    cardId: null
  };
  
  // Update current card's tasks (source of truth)
  const currentCard = getCurrentCard();
  if (currentCard) {
    currentCard.tasks.push(newTask);
    // Re-render from card.tasks to ensure consistency
    renderTodoSection(currentCard.tasks);
  } else {
    // No card context - just update displayedTasks directly
    displayedTasks.push(newTask);
    renderTodoSection(displayedTasks);
  }
}

// Expand task to a new card
function expandTaskToCard(taskId) {
  const task = displayedTasks.find(t => t.id === taskId);
  if (!task) return;
  
  // 如果 task 已有關聯卡片，直接切換過去
  if (task.cardId && sessionState.cards.has(task.cardId)) {
    switchToCard(task.cardId, 'right');
    showToast(t('messages.switchedToCard'));
    return;
  }
  
  const currentCard = getCurrentCard();
  
  if (currentCard && enableTaskPlanner) {
    // Create child card
    const newCard = createChildCard(currentCard.id, taskId, task.content);
    if (newCard) {
      // 套用任務建議的功能設定
      if (task.suggestedFeatures && task.suggestedFeatures.length > 0) {
        const features = task.suggestedFeatures;
        newCard.settings = {
          enableSearchMode: features.includes('search'),
          enableImage: features.includes('image'),
          visionMode: features.includes('vision')
        };
        console.log('[expandTaskToCard] Applied suggested features:', features);
      }
      
      // For learner mode tasks with hints, add hint as context
      if (task.hint && learnerMode !== 'standard') {
        // Add hint as a temporary context item for this card
        const hintContext = {
          id: generateId(),
          type: 'hint',
          title: '探索提示',
          content: task.hint,
          timestamp: Date.now(),
          scope: 'card'  // Card-level context
        };
        newCard.contextItems = newCard.contextItems || [];
        newCard.contextItems.push(hintContext);
        console.log('[expandTaskToCard] Added learner hint as context:', task.hint);
      }
      
      // Switch to new card (this will sync settings to UI)
      switchToCard(newCard.id, 'right');
      
      // Focus input for the new card
      queryInput.value = task.content;
      queryInput.focus();
      
      // 顯示已套用的功能提示
      const featureNames = (task.suggestedFeatures || []).map(f => {
        const map = { search: '網搜', image: '製圖', vision: '視覺' };
        return map[f];
      }).filter(Boolean);
      
      if (featureNames.length > 0) {
        showToast(`已建立子卡片，已啟用：${featureNames.join('、')}`);
      } else if (task.hint && learnerMode !== 'standard') {
        showToast(t('messages.exploreCardCreated'));
      } else {
        showToast(t('messages.childCardCreated'));
      }
    }
  } else {
    // Fallback: just put content in input
    queryInput.value = task.content;
    queryInput.focus();
    task.status = 'in_progress';
    renderTodoSection(displayedTasks);
    showToast(t('messages.taskToInput'));
  }
}

// Hide todo section
function hideTodoSection() {
  if (todoSection) {
    todoSection.classList.add('hidden');
  }
  displayedTasks = [];
}

// ============================================
// Card System & Carousel Functions
// ============================================

// Current carousel state
let carouselCurrentIndex = 0;
let siblingCards = []; // All cards for carousel display

// 追蹤每張卡片的執行狀態 (並行 Council 支援)
// 結構: cardId -> { 
//   isRunning: boolean,
//   responses: [], // 中間 responses
//   timelineHTML: string, // timeline 快照
//   context: { searches: [], reviews: null } // 其他中間狀態
// }
const cardExecutionState = new Map();

/**
 * 保存執行中卡片的 timeline 快照
 * @param {string} cardId - 卡片 ID
 */
function saveCardExecutionSnapshot(cardId) {
  const state = cardExecutionState.get(cardId);
  if (!state?.isRunning) return;
  
  // 保存 timeline HTML 快照
  if (plannerTimeline) {
    state.timelineHTML = plannerTimeline.innerHTML;
  }
  
  console.log('[CardState] Saved snapshot for card:', cardId, 'hasTimeline:', !!state.timelineHTML);
}

/**
 * 更新執行中卡片的中間狀態
 * @param {string} cardId - 卡片 ID
 * @param {Object} updates - 要更新的狀態 { responses?, context? }
 */
function updateCardExecutionState(cardId, updates) {
  const state = cardExecutionState.get(cardId);
  if (!state) return;
  
  // 僅當 cardId 是當前顯示的卡片時才更新 timeline
  const isCurrentCard = sessionState.currentCardId === cardId;
  
  if (updates.responses !== undefined) {
    state.responses = updates.responses;
  }
  if (updates.context) {
    state.context = { ...state.context, ...updates.context };
  }
  
  // 同步更新 timeline 快照（僅針對當前卡片）
  if (isCurrentCard && plannerTimeline) {
    state.timelineHTML = plannerTimeline.innerHTML;
  }
}

// Switch to a specific card
function switchToCard(cardId, direction = 'right') {
  console.log('[switchToCard] Switching to card:', cardId);
  const card = sessionState.cards.get(cardId);
  if (!card) {
    console.log('[switchToCard] Card not found!');
    return;
  }
  
  // 切換前：保存當前執行中卡片的 timeline 狀態
  const previousCardId = sessionState.currentCardId;
  if (previousCardId && previousCardId !== cardId) {
    saveCardExecutionSnapshot(previousCardId);
    // 切換時保存 session（確保資料持久化）
    saveSession();
  }
  
  // Update session state
  sessionState.currentCardId = cardId;
  
  // Update breadcrumb
  updateBreadcrumb(cardId);
  
  // Load card data into UI
  loadCardIntoUI(card);
  
  // Update context items for the new card (session + card level)
  updateVisibleContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Update carousel
  updateSiblingCards();
  renderCarousel();
  
  // 更新按鈕狀態（並行執行支援）
  console.log('[switchToCard] Calling updateSendButtonForCurrentCard');
  updateSendButtonForCurrentCard();
  console.log('[switchToCard] Button state after update:', sendBtn.disabled, sendBtn.innerHTML);
}

// Update breadcrumb based on current card
function updateBreadcrumb(cardId) {
  const card = sessionState.cards.get(cardId);
  if (!card) return;
  
  // Build path from root to current
  const path = [];
  let current = card;
  while (current) {
    path.unshift(current.id);
    current = current.parentId ? sessionState.cards.get(current.parentId) : null;
  }
  
  sessionState.breadcrumb = path;
  renderBreadcrumb();
}

// Render breadcrumb navigation
function renderBreadcrumb() {
  if (!breadcrumbNav || !breadcrumbPath) return;
  
  // Show/hide breadcrumb based on card count
  const cardCount = sessionState.cards.size;
  if (cardCount <= 1) {
    breadcrumbNav.classList.add('hidden');
    return;
  }
  
  breadcrumbNav.classList.remove('hidden');
  
  // Render path
  const items = sessionState.breadcrumb.map((cardId, index) => {
    const card = sessionState.cards.get(cardId);
    if (!card) return '';
    
    const isLast = index === sessionState.breadcrumb.length - 1;
    const isRoot = index === 0;
    
    // 根節點顯示 session 名稱（如果有），否則顯示截斷的 query
    let title;
    if (isRoot && sessionState.name) {
      title = sessionState.name;
    } else {
      title = card.query.slice(0, 20) + (card.query.length > 20 ? '...' : '');
    }
    
    return `
      <div class="breadcrumb-item">
        ${index > 0 ? '<span class="breadcrumb-separator">/</span>' : ''}
        <button class="breadcrumb-link ${isLast ? 'current' : ''} ${isRoot ? 'root' : ''}" 
                data-card-id="${cardId}" 
                title="${escapeHtml(card.query)}">
          ${escapeHtml(title)}
        </button>
      </div>
    `;
  }).join('');
  
  breadcrumbPath.innerHTML = items;
  
  // Update indicators
  const currentCard = getCurrentCard();
  if (cardDepthIndicator) {
    cardDepthIndicator.textContent = t('sidepanel.depthLabel', { depth: currentCard?.depth || 0 });
  }
  if (cardCountIndicator) {
    const cardCountText = cardCountIndicator.querySelector('#cardCountText');
    if (cardCountText) {
      cardCountText.textContent = t('sidepanel.cardCount', { count: cardCount });
    }
  }
  
  // Add click handlers
  breadcrumbPath.querySelectorAll('.breadcrumb-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetCardId = btn.dataset.cardId;
      if (targetCardId !== sessionState.currentCardId) {
        switchToCard(targetCardId, 'left');
      }
    });
  });
}

// Update sibling cards for carousel - now shows ALL cards with hierarchy
function updateSiblingCards() {
  const currentCard = getCurrentCard();
  if (!currentCard) {
    siblingCards = [];
    return;
  }
  
  // 取得所有卡片，按深度排序，同深度按時間排序
  siblingCards = Array.from(sessionState.cards.values())
    .sort((a, b) => a.depth - b.depth || a.timestamp - b.timestamp);
  
  // Find current index
  carouselCurrentIndex = siblingCards.findIndex(c => c.id === currentCard.id);
  if (carouselCurrentIndex === -1) carouselCurrentIndex = 0;
}

// Render carousel
function renderCarousel() {
  if (!cardCarousel || !carouselTrack) return;
  
  // Show/hide carousel
  if (siblingCards.length <= 1) {
    cardCarousel.classList.add('hidden');
    return;
  }
  
  cardCarousel.classList.remove('hidden');
  
  // 計算最大深度用於漸層底色
  const maxDepth = Math.max(...siblingCards.map(c => c.depth), 0);
  
  // Render slides
  carouselTrack.innerHTML = siblingCards.map((card, index) => {
    const taskCount = card.tasks?.length || 0;
    const isActive = index === carouselCurrentIndex;
    const isRunning = cardExecutionState.get(card.id)?.isRunning;
    
    // 深度越淺底色越深：depth 0 = 0.15, 逐層變淺
    const bgOpacity = maxDepth > 0 
      ? 0.15 - (card.depth / (maxDepth + 1)) * 0.10 
      : 0.15;
    
    return `
      <div class="carousel-slide ${isActive ? 'active' : ''}" data-index="${index}">
        <div class="carousel-card ${isActive ? 'active' : ''} ${isRunning ? 'running' : ''}" 
             data-card-id="${card.id}"
             data-depth="${card.depth}"
             style="--depth-bg-opacity: ${bgOpacity}">
          <div class="carousel-card-header">
            <span class="carousel-card-title">${escapeHtml(card.query.slice(0, 30))}${card.query.length > 30 ? '...' : ''}</span>
            <span class="carousel-card-depth">L${card.depth}</span>
          </div>
          ${card.finalAnswer ? `<div class="carousel-card-query">${escapeHtml(card.finalAnswer.slice(0, 50))}...</div>` : ''}
          <div class="carousel-card-meta">
            ${taskCount > 0 ? `<span class="carousel-card-tasks"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/></svg>${taskCount}</span>` : ''}
            <span>${formatRelativeTime(card.timestamp)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Update track position
  carouselTrack.style.transform = `translateX(-${carouselCurrentIndex * 100}%)`;
  
  // Update navigation buttons
  if (carouselPrev) carouselPrev.disabled = carouselCurrentIndex === 0;
  if (carouselNext) carouselNext.disabled = carouselCurrentIndex >= siblingCards.length - 1;
  
  // Render indicators
  if (carouselIndicators) {
    carouselIndicators.innerHTML = siblingCards.map((_, index) => `
      <button class="carousel-dot ${index === carouselCurrentIndex ? 'active' : ''}" 
              data-index="${index}"></button>
    `).join('');
    
    // Add indicator click handlers
    carouselIndicators.querySelectorAll('.carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index);
        navigateCarousel(index);
      });
    });
  }
  
  // Add card click handlers
  carouselTrack.querySelectorAll('.carousel-card').forEach(card => {
    card.addEventListener('click', () => {
      const cardId = card.dataset.cardId;
      if (cardId !== sessionState.currentCardId) {
        switchToCard(cardId);
      }
    });
  });
}

// Navigate carousel
function navigateCarousel(targetIndex) {
  if (targetIndex < 0 || targetIndex >= siblingCards.length) return;
  
  const direction = targetIndex > carouselCurrentIndex ? 'right' : 'left';
  carouselCurrentIndex = targetIndex;
  
  const targetCard = siblingCards[targetIndex];
  if (targetCard) {
    switchToCard(targetCard.id, direction);
  }
}

// Load card data into UI
function loadCardIntoUI(card) {
  if (!card) return;
  
  console.log('[loadCardIntoUI] Loading card:', card.id, 'hasAnswer:', !!card.finalAnswer);
  
  // Set query input
  queryInput.value = card.query || '';
  
  // 同步卡片的功能設定到 UI toggles
  if (card.settings) {
    syncCardSettingsToUI(card.settings);
  }
  
  // Render tasks
  if (card.tasks && card.tasks.length > 0) {
    renderTodoSection(card.tasks);
  } else {
    hideTodoSection();
  }
  
  // 檢查卡片是否正在執行
  const execState = cardExecutionState.get(card.id);
  const isRunning = execState?.isRunning;
  
  if (isRunning) {
    // 卡片正在執行中，還原保存的 timeline 狀態
    console.log('[loadCardIntoUI] Card is running, restoring timeline state');
    emptyState.classList.add('hidden');
    
    // 還原已保存的 timeline HTML（如果有）
    if (execState.timelineHTML && plannerTimeline) {
      plannerTimeline.innerHTML = execState.timelineHTML;
      console.log('[loadCardIntoUI] Restored timeline HTML for running card');
    }
    
    showPlannerTimeline();
    return;
  }
  
  // 根據卡片狀態更新 UI (使用 Timeline 系統)
  if (card.finalAnswer) {
    // === 已完成的卡片 ===
    emptyState.classList.add('hidden');
    
    // 清空並重建 timeline 以顯示歷史
    clearPlannerTimeline();
    showPlannerTimeline();
    
    // 如果有保存的 responses，在 timeline 中渲染它們
    if (card.responses && card.responses.length > 0) {
      // 創建 query_council 段落
      appendTimelineParagraph({
        tool: 'query_council',
        reasoning: '已完成的模型回應'
      }, 'done');
      renderToolResultInParagraph('query_council', {
        responses: card.responses
      });
    }
    
    // 創建 synthesize 段落顯示最終答案
    const displayContent = enableTaskPlanner ? extractFinalAnswerDisplay(card.finalAnswer) : card.finalAnswer;
    const cardChairman = card.chairmanModel || chairmanModel;
    appendTimelineParagraph({
      tool: 'synthesize',
      reasoning: '已完成的彙整結論'
    }, 'done');
    renderToolResultInParagraph('synthesize', {
      content: displayContent,
      chairman: cardChairman
    });
    
    // 顯示匯出按鈕
    exportBtn.style.display = 'flex';
    
    // 顯示下一步選項
    showNextStepsSection();
    showBranchActions();
    
  } else {
    // === 未完成的卡片（空白或新建） ===
    emptyState.classList.remove('hidden');
    
    // 隱藏 timeline
    hidePlannerTimeline();
    hideNextStepsSection();
    
    // 隱藏匯出按鈕
    exportBtn.style.display = 'none';
    
    // 隱藏下一步選項
    hideBranchActions();
  }
}

// 渲染已保存的 responses（用於切換卡片時）
function renderSavedResponses(savedResponses) {
  if (!savedResponses || savedResponses.length === 0) return;
  
  // 重建 responses Map
  responses.clear();
  savedResponses.forEach(r => {
    responses.set(r.model, { 
      content: r.content, 
      status: 'done', 
      latency: r.latency || 0,
      images: r.images || []
    });
  });
  
  // 渲染 tabs 和 panels
  renderTabs();
  renderResponsePanels();
  
  // 設定第一個 tab 為 active
  if (savedResponses.length > 0) {
    setActiveTab(savedResponses[0].model);
  }
}

// Format relative time
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小時前`;
  return new Date(timestamp).toLocaleDateString('zh-TW');
}

// Create child card from task
function createChildCard(parentId, taskId, query) {
  const parentCard = sessionState.cards.get(parentId);
  if (!parentCard) return null;
  
  // 檢查深度限制
  if (parentCard.depth >= maxCardDepth) {
    showToast(`已達最大深度 L${maxCardDepth}，無法再展開子任務`);
    return null;
  }
  
  // Find and update task
  const task = parentCard.tasks.find(t => t.id === taskId);
  if (task) {
    task.status = 'in_progress';
  }
  
  // Create new card
  const newCard = createCard(parentId, query);
  
  // Link task to card
  if (task) {
    task.cardId = newCard.id;
  }
  
  // 如果這是第一個子卡片且 session 尚未命名，觸發 AI 命名
  if (!sessionState.name && parentCard.id === sessionState.rootCardId) {
    generateSessionName(parentCard.query).then(name => {
      if (name) {
        sessionState.name = name;
        renderBreadcrumb(); // 更新顯示
        saveSession(); // 儲存 session 名稱
      }
    });
  }
  
  // Update displays
  renderTodoSection(parentCard.tasks);
  renderBreadcrumb();
  renderCarousel();
  
  return newCard;
}

// Initialize card system event listeners
function setupCardSystemListeners() {
  // Breadcrumb home button
  if (breadcrumbHome) {
    breadcrumbHome.addEventListener('click', () => {
      if (sessionState.rootCardId) {
        switchToCard(sessionState.rootCardId, 'left');
      }
    });
  }
  
  // Carousel navigation
  if (carouselPrev) {
    carouselPrev.addEventListener('click', () => {
      navigateCarousel(carouselCurrentIndex - 1);
    });
  }
  
  if (carouselNext) {
    carouselNext.addEventListener('click', () => {
      navigateCarousel(carouselCurrentIndex + 1);
    });
  }
  
  // Card count indicator - click to open Canvas with tree view
  if (cardCountIndicator) {
    cardCountIndicator.addEventListener('click', () => {
      openCanvasWithTreeView();
    });
  }
}

// Open Canvas with tree view auto-expanded
function openCanvasWithTreeView() {
  // 先儲存 session，確保 Canvas 能讀取最新資料
  if (sessionState.id) {
    saveSession();
  }
  
  // 設定標記讓 Canvas 自動開啟樹狀圖
  chrome.storage.local.set({ canvasOpenTreeView: true }, () => {
    openCanvas(false);
  });
}

// DOM Elements
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const newChatBtn = document.getElementById('newChatBtn');
const historyBtn = document.getElementById('historyBtn');
const exportBtn = document.getElementById('exportBtn');
const imageToggle = document.getElementById('imageToggle');
const modelCountEl = document.getElementById('modelCount');
const emptyState = document.getElementById('emptyState');
const errorBanner = document.getElementById('errorBanner');
const errorText = document.getElementById('errorText');
const dismissError = document.getElementById('dismissError');
const historyPanel = document.getElementById('historyPanel');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const closeHistoryBtn = document.getElementById('closeHistoryBtn');
const exportModal = document.getElementById('exportModal');
const closeExportModal = document.getElementById('closeExportModal');
const exportMd = document.getElementById('exportMd');
const exportJson = document.getElementById('exportJson');
const copyClipboard = document.getElementById('copyClipboard');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');

// Context elements
const contextHeader = document.getElementById('contextHeader');
const contextToggle = document.getElementById('contextToggle');
const contextContent = document.getElementById('contextContent');
const contextBadge = document.getElementById('contextBadge');
const contextItemsEl = document.getElementById('contextItems');
const capturePageBtn = document.getElementById('capturePageBtn');
const captureSelectionBtn = document.getElementById('captureSelectionBtn');
const webSearchBtn = document.getElementById('webSearchBtn');
const pasteContextBtn = document.getElementById('pasteContextBtn');
const clearContextBtn = document.getElementById('clearContextBtn');

// Paste modal elements
const pasteModal = document.getElementById('pasteModal');
const pasteModalTextarea = document.getElementById('pasteModalTextarea');
const pasteCharCount = document.getElementById('pasteCharCount');
const closePasteModal = document.getElementById('closePasteModal');
const cancelPaste = document.getElementById('cancelPaste');
const confirmPaste = document.getElementById('confirmPaste');

// Web search modal elements
const webSearchModal = document.getElementById('webSearchModal');
const webSearchModalInput = document.getElementById('webSearchModalInput');
const closeWebSearchModal = document.getElementById('closeWebSearchModal');
const cancelWebSearch = document.getElementById('cancelWebSearch');
const confirmWebSearch = document.getElementById('confirmWebSearch');
const webSearchStatus = document.getElementById('webSearchStatus');
const webSearchStatusLabel = document.getElementById('webSearchStatusLabel');
const webSearchStatusDetail = document.getElementById('webSearchStatusDetail');

// Search mode elements
const searchModeToggle = document.getElementById('searchModeToggle');
const searchStrategySection = document.getElementById('searchStrategySection');
const searchStrategies = document.getElementById('searchStrategies');
const searchIterationCounter = document.getElementById('searchIterationCounter');
const customSearchInput = document.getElementById('customSearchInput');
const customSearchBtn = document.getElementById('customSearchBtn');

// Search iteration hint elements
const searchIterationHint = document.getElementById('searchIterationHint');
const searchIterationKeyword = document.getElementById('searchIterationKeyword');
const cancelSearchIteration = document.getElementById('cancelSearchIteration');

// Canvas elements
const canvasSection = document.getElementById('canvasSection');
const canvasBtn = document.getElementById('canvasBtn');
const canvasDropdownBtn = document.getElementById('canvasDropdownBtn');
const canvasDropdown = document.getElementById('canvasDropdown');

// Branch actions elements
const branchActionsSection = document.getElementById('branchActionsSection');
const branchSearchBtn = document.getElementById('branchSearchBtn');
const branchImageBtn = document.getElementById('branchImageBtn');
const branchVisionBtn = document.getElementById('branchVisionBtn');
const branchCanvasBtn = document.getElementById('branchCanvasBtn');

// Skill Selector elements (unified dropdown)
const skillSelectorEl = document.getElementById('skillSelector');
const skillSelectorBtn = document.getElementById('skillSelectorBtn');
const skillSelectorIcon = document.getElementById('skillSelectorIcon');
const skillSelectorName = document.getElementById('skillSelectorName');
const skillSelectorSource = document.getElementById('skillSelectorSource');
const skillDropdown = document.getElementById('skillDropdown');
const skillSearchInput = document.getElementById('skillSearchInput');
const skillDropdownContent = document.getElementById('skillDropdownContent');
const skillRecommendedSection = document.getElementById('skillRecommendedSection');
const skillRecommendedList = document.getElementById('skillRecommendedList');
const skillCategorySections = document.getElementById('skillCategorySections');
const clearSkillSelection = document.getElementById('clearSkillSelection');

// Legacy skill badge elements (kept for backward compatibility)
const skillBadge = document.getElementById('skillBadge');
const skillBadgeIcon = document.getElementById('skillBadgeIcon');
const skillBadgeName = document.getElementById('skillBadgeName');
const skillBadgeStrategy = document.getElementById('skillBadgeStrategy');

// Agent Progress Section elements (已移除，改用 Timeline 系統)
// const agentProgressSection = document.getElementById('agentProgressSection');
const agentProgressSummary = null; // 已移除
// const progressStep = document.getElementById('progressStep');
// const progressContent = document.getElementById('progressContent');

// Suggested Actions Panel elements
const suggestedActionsPanel = document.getElementById('suggestedActionsPanel');
const suggestedActionsContent = document.getElementById('suggestedActionsContent');
const suggestedQuickInput = document.getElementById('suggestedQuickInput');
const suggestedQuickSubmit = document.getElementById('suggestedQuickSubmit');

// Task Planner / TODO elements
const todoSection = document.getElementById('todoSection');
const todoCount = document.getElementById('todoCount');
const todoList = document.getElementById('todoList');
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskForm = document.getElementById('addTaskForm');
const newTaskInput = document.getElementById('newTaskInput');
const newTaskPriority = document.getElementById('newTaskPriority');
const confirmAddTask = document.getElementById('confirmAddTask');
const cancelAddTask = document.getElementById('cancelAddTask');

// Breadcrumb & Carousel elements
const breadcrumbNav = document.getElementById('breadcrumbNav');
const breadcrumbHome = document.getElementById('breadcrumbHome');
const breadcrumbPath = document.getElementById('breadcrumbPath');
const cardDepthIndicator = document.getElementById('cardDepthIndicator');
const cardCountIndicator = document.getElementById('cardCountIndicator');
const cardCarousel = document.getElementById('cardCarousel');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const carouselTrack = document.getElementById('carouselTrack');
const carouselIndicators = document.getElementById('carouselIndicators');

// Vision Council elements
const visionToggle = document.getElementById('visionToggle');
const visionUploadSection = document.getElementById('visionUploadSection');
const visionUploadArea = document.getElementById('visionUploadArea');
const visionFileInput = document.getElementById('visionFileInput');
const visionPreviewArea = document.getElementById('visionPreviewArea');
const visionPreviewImg = document.getElementById('visionPreviewImg');
const visionImageName = document.getElementById('visionImageName');
const visionImageSize = document.getElementById('visionImageSize');
const removeVisionImage = document.getElementById('removeVisionImage');
const costTracker = document.getElementById('costTracker');
const costTrackerDetails = document.getElementById('costTrackerDetails');
const sessionCostTotal = document.getElementById('sessionCostTotal');
const sessionCostInput = document.getElementById('sessionCostInput');
const sessionCostOutput = document.getElementById('sessionCostOutput');
const sessionImageTokens = document.getElementById('sessionImageTokens');

// Conversation cost summary elements
const conversationCost = document.getElementById('conversationCost');
const conversationCostTotal = document.getElementById('conversationCostTotal');
const costStage1 = document.getElementById('costStage1');
const costStage2 = document.getElementById('costStage2');
const costStage3 = document.getElementById('costStage3');
const costImageRow = document.getElementById('costImageRow');
const costImageGen = document.getElementById('costImageGen');

// Planner Timeline elements (新版動態段落 UI)
const plannerTimeline = document.getElementById('plannerTimeline');
const nextStepsSection = document.getElementById('nextStepsSection');

// Legacy stage elements (保留以供向下相容，逐步移除)
const stage1Section = null; // 已移除
const stage2Section = null; // 已移除
const stage25Section = null; // 已移除
const stage3Section = null; // 已移除
const modelTabs = null; // 由 timeline 內部動態建立
const responseContainer = null; // 由 timeline 內部動態建立
const reviewResults = null; // 由 timeline 內部動態建立

// Stage 2.5 elements (移至 timeline 內動態渲染)
const stage25Status = null;
const stage25Summary = null;
const searchSuggestionList = null;
const customSuggestionInput = null;
const addCustomSuggestionBtn = null;
const executeSearchBtn = null;
const skipSearchBtn = null;
const finalAnswer = null; // 由 timeline 內部動態建立

/**
 * 取得圖像生成 UI 的容器元素
 * 優先使用 timeline 內的 synthesis 區域，或 plannerTimeline，或建立臨時容器
 */
function getImageContainer() {
  return document.querySelector('.tool-result[data-tool="synthesize"]') 
    || plannerTimeline 
    || document.getElementById('mainContent');
}
const stage1Status = null;
const stage2Status = null;
const stage3Status = null;

// Stepper element (已移除)
const stepper = null;

// ============================================
// Planner Timeline Functions (動態段落 UI)
// ============================================

// Track current paragraph for updates
let currentTimelineParagraph = null;
let timelineIteration = 0;

/**
 * Show the planner timeline
 */
function showPlannerTimeline() {
  if (plannerTimeline) {
    plannerTimeline.classList.remove('hidden');
  }
}

/**
 * Hide the planner timeline
 */
function hidePlannerTimeline() {
  if (plannerTimeline) {
    plannerTimeline.classList.add('hidden');
  }
}

/**
 * Clear all paragraphs from timeline
 */
function clearPlannerTimeline() {
  if (plannerTimeline) {
    plannerTimeline.innerHTML = '';
  }
  currentTimelineParagraph = null;
  timelineIteration = 0;
}

/**
 * Append a new paragraph to the timeline
 * @param {Object} action - Planner decision {tool, reasoning, parameters}
 * @param {string} status - 'loading' | 'done' | 'error'
 * @returns {HTMLElement} - The created paragraph element
 */
function appendTimelineParagraph(action, status = 'loading') {
  if (!plannerTimeline) return null;
  
  showPlannerTimeline();
  timelineIteration++;
  
  const paragraph = document.createElement('div');
  paragraph.className = 'timeline-paragraph';
  paragraph.setAttribute('data-iteration', timelineIteration);
  paragraph.setAttribute('data-tool', action.tool);
  
  // Create decision block
  const decisionBlock = document.createElement('div');
  decisionBlock.className = `planner-decision ${status}`;
  decisionBlock.innerHTML = `
    <div class="decision-header">
      <strong>規劃決策</strong>
      <span class="decision-tool" data-tool="${action.tool}">${action.tool}</span>
    </div>
    <div class="decision-reasoning">${action.reasoning || '處理中...'}</div>
  `;
  
  // Create tool result container (will be populated later)
  const toolResult = document.createElement('div');
  toolResult.className = 'tool-result';
  toolResult.setAttribute('data-tool', action.tool);
  
  // Add loading skeleton
  if (status === 'loading') {
    toolResult.innerHTML = `
      <div class="tool-result-skeleton">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    `;
  }
  
  paragraph.appendChild(decisionBlock);
  paragraph.appendChild(toolResult);
  plannerTimeline.appendChild(paragraph);
  
  // Scroll to new paragraph
  paragraph.scrollIntoView({ behavior: 'smooth', block: 'end' });
  
  currentTimelineParagraph = paragraph;
  return paragraph;
}

/**
 * Update the current paragraph's decision status
 * @param {string} status - 'loading' | 'done' | 'error'
 */
function updateCurrentParagraphStatus(status) {
  if (!currentTimelineParagraph) return;
  
  const decision = currentTimelineParagraph.querySelector('.planner-decision');
  if (decision) {
    decision.classList.remove('loading', 'done', 'error');
    decision.classList.add(status);
  }
  
  // 同時清除 skeleton 動畫（如果存在且狀態為 done 或 error）
  if (status === 'done' || status === 'error') {
    const skeleton = currentTimelineParagraph.querySelector('.tool-result-skeleton');
    if (skeleton) {
      skeleton.remove();
    }
  }
}

/**
 * Render tool result into the current paragraph
 * @param {string} tool - Tool name
 * @param {Object} result - Tool execution result
 */
function renderToolResultInParagraph(tool, result) {
  if (!currentTimelineParagraph) return;
  
  const toolResultContainer = currentTimelineParagraph.querySelector('.tool-result');
  if (!toolResultContainer) return;
  
  // Clear skeleton
  toolResultContainer.innerHTML = '';
  
  switch (tool) {
    case 'web_search':
      renderSearchResultInTimeline(toolResultContainer, result);
      break;
    case 'query_council':
      renderCouncilResultInTimeline(toolResultContainer, result);
      break;
    case 'peer_review':
      renderPeerReviewInTimeline(toolResultContainer, result);
      break;
    case 'synthesize':
      renderSynthesisInTimeline(toolResultContainer, result);
      break;
    case 'request_user_input':
      renderUserInputInTimeline(toolResultContainer, result);
      break;
    default:
      toolResultContainer.innerHTML = `<div class="tool-result-generic">${JSON.stringify(result, null, 2)}</div>`;
  }
  
  updateCurrentParagraphStatus('done');
}

/**
 * Render web_search result
 */
function renderSearchResultInTimeline(container, result) {
  const { searches = [], resultCount = 0 } = result;
  
  container.setAttribute('data-tool', 'web_search');
  
  let html = `<div class="search-result-summary">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    找到 ${resultCount} 筆搜尋結果
  </div>`;
  
  if (searches.length > 0) {
    html += '<div class="search-result-list">';
    // Show first 3 results as preview
    const previewSearches = searches.slice(0, 3);
    for (const item of previewSearches) {
      html += `
        <div class="search-result-item">
          <div class="result-title">${escapeHtml(item.title || '')}</div>
          <div class="result-snippet">${escapeHtml((item.snippet || '').substring(0, 150))}...</div>
          <div class="result-url">${escapeHtml(item.url || '')}</div>
        </div>
      `;
    }
    if (searches.length > 3) {
      html += `<div class="search-result-more">還有 ${searches.length - 3} 筆結果...</div>`;
    }
    html += '</div>';
  }
  
  container.innerHTML = html;
}

/**
 * Render query_council result with tabs
 */
function renderCouncilResultInTimeline(container, result) {
  const { responses = [] } = result;
  
  container.setAttribute('data-tool', 'query_council');
  
  // Create tabs
  let tabsHtml = '<div class="council-tabs">';
  responses.forEach((resp, idx) => {
    const modelName = getModelName(resp.model);
    const statusClass = resp.error ? 'error' : (resp.content ? 'done' : 'loading');
    tabsHtml += `
      <button class="council-tab ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        ${modelName}
        <span class="status-indicator ${statusClass}"></span>
      </button>
    `;
  });
  tabsHtml += '</div>';
  
  // Create response panels
  let panelsHtml = '<div class="council-response-container">';
  responses.forEach((resp, idx) => {
    const content = resp.error 
      ? `<div class="error-state"><p>${resp.error}</p></div>`
      : parseMarkdown(resp.content || '回應中...');
    panelsHtml += `
      <div class="council-response-panel ${idx === 0 ? 'active' : ''}" data-index="${idx}">
        <div class="response-content">${content}</div>
      </div>
    `;
  });
  panelsHtml += '</div>';
  
  container.innerHTML = tabsHtml + panelsHtml;
  
  // Add tab click handlers
  container.querySelectorAll('.council-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const index = tab.getAttribute('data-index');
      // Update active tab
      container.querySelectorAll('.council-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Update active panel
      container.querySelectorAll('.council-response-panel').forEach(p => p.classList.remove('active'));
      container.querySelector(`.council-response-panel[data-index="${index}"]`)?.classList.add('active');
    });
  });
}

/**
 * Render peer_review result
 */
function renderPeerReviewInTimeline(container, result) {
  const { ranking = [], winner, reviews = [] } = result;
  
  container.setAttribute('data-tool', 'peer_review');
  
  // 排名列表
  let html = '<div class="review-ranking-list">';
  ranking.forEach((item, idx) => {
    const rankClass = idx === 0 ? 'rank-1' : (idx === 1 ? 'rank-2' : 'rank-3');
    html += `
      <div class="review-ranking-item ${rankClass}">
        <span class="review-rank-badge">${idx + 1}</span>
        <span class="review-model-name">${getModelName(item.model)}</span>
        <span class="review-score">${item.avgRank?.toFixed(1) || item.score?.toFixed(1) || '-'}</span>
      </div>
    `;
  });
  html += '</div>';
  
  // 勝出提示
  if (winner) {
    html += `
      <div class="review-winner-hint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
        ${getModelName(winner)} 獲選為本輪最佳回答
      </div>
    `;
  }
  
  // 評語列表（如果有）
  if (reviews.length > 0) {
    html += '<div class="review-reasons-timeline">';
    html += '<div class="review-reasons-title">審查評語</div>';
    reviews.slice(0, 6).forEach(r => {
      if (r.reason) {
        const reviewer = r.reviewerName || getModelName(r.reviewer);
        const target = r.modelName || getModelName(r.model);
        html += `
          <div class="review-reason-item">
            <div class="reason-header">${reviewer} → ${target}</div>
            <div class="reason-text">${escapeHtml(r.reason)}</div>
          </div>
        `;
      }
    });
    html += '</div>';
  }
  
  container.innerHTML = html;
}

/**
 * Render synthesize result
 */
function renderSynthesisInTimeline(container, result) {
  const { content = '', chairman } = result;
  
  container.setAttribute('data-tool', 'synthesize');
  
  // 過濾 task JSON 以便乾淨顯示
  const displayContent = enableTaskPlanner ? extractFinalAnswerDisplay(content) : content;
  
  // 解析並渲染 tasks 到 TODO section
  if (enableTaskPlanner && content) {
    const parsedTasks = parseTasksFromResponse(content);
    if (parsedTasks.success && parsedTasks.tasks.length > 0) {
      renderTodoSection(parsedTasks.tasks);
    }
  }
  
  let html = '';
  
  // Chairman badge header
  if (chairman) {
    html += `
      <div class="synthesis-header">
        <div class="synthesis-chairman-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          ${getModelName(chairman)}
        </div>
      </div>
    `;
  }
  
  // Synthesis content (已過濾 task JSON)
  html += `
    <div class="synthesis-content">
      <div class="response-content">${parseMarkdown(displayContent)}</div>
    </div>
  `;
  
  container.innerHTML = html;
}

/**
 * Render request_user_input result (顯示用戶選擇的動作)
 */
function renderUserInputInTimeline(container, result) {
  container.setAttribute('data-tool', 'request_user_input');
  
  const { action, value, query, label } = result || {};
  
  // 根據用戶的動作顯示不同內容
  let actionText = '';
  let actionIcon = '';
  
  switch (action) {
    case 'search':
      actionIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
      actionText = `延伸搜尋: ${query || value || ''}`;
      break;
    case 'deepen':
      actionIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';
      actionText = `深入探討: ${label || value || ''}`;
      break;
    case 'proceed':
      actionIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
      actionText = '繼續執行';
      break;
    case 'skip':
      actionIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h4l7 8-7 8H5l7-8z"/><line x1="19" y1="4" x2="19" y2="20"/></svg>';
      actionText = '跳過此步驟';
      break;
    default:
      actionIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      actionText = value || label || '已回應';
  }
  
  container.innerHTML = `
    <div class="user-input-completed">
      ${actionIcon}
      <span>${escapeHtml(actionText)}</span>
    </div>
  `;
}

/**
 * Show next steps section
 */
function showNextStepsSection() {
  if (nextStepsSection) {
    nextStepsSection.classList.remove('hidden');
  }
}

/**
 * Hide next steps section
 */
function hideNextStepsSection() {
  if (nextStepsSection) {
    nextStepsSection.classList.add('hidden');
  }
}

// Legacy stepper functions (保留空函數以避免報錯，逐步移除)
function showStepper() { showPlannerTimeline(); }
function hideStepper() { /* no-op */ }
function updateStepperState(stepNumber, state) { /* no-op */ }
function setStepActive(stepNumber) { /* no-op */ }
function setStepDone(stepNumber) { /* no-op */ }
function setStepSkipped(stepNumber) { /* no-op */ }
function setAllStepsDone() { /* no-op */ }

// ============================================
// Stage Summary Functions
// ============================================

const stage1Summary = document.getElementById('stage1Summary');
const stage2Summary = document.getElementById('stage2Summary');
const stage3Summary = document.getElementById('stage3Summary');

function updateStage1Summary(responsesData) {
  if (!stage1Summary) return;
  
  const completed = responsesData.filter(r => r.status === 'done').length;
  const total = responsesData.length;
  
  if (completed === 0) {
    stage1Summary.innerHTML = '';
    return;
  }
  
  // Find fastest model
  const doneResponses = responsesData.filter(r => r.status === 'done' && r.latency);
  let fastestInfo = '';
  if (doneResponses.length > 0) {
    const fastest = doneResponses.reduce((a, b) => a.latency < b.latency ? a : b);
    fastestInfo = ` · <span class="highlight">${getModelName(fastest.model)}</span> ${(fastest.latency / 1000).toFixed(1)}s`;
  }
  
  stage1Summary.innerHTML = `${completed}/${total} 完成${fastestInfo}`;
}

function updateStage2Summary(ranking) {
  if (!stage2Summary) return;
  
  if (!ranking || ranking.length === 0) {
    stage2Summary.innerHTML = '';
    return;
  }
  
  const winner = ranking[0];
  stage2Summary.innerHTML = `#1 <span class="highlight">${getModelName(winner.model)}</span>`;
}

function updateStage3Summary(chairModel) {
  if (!stage3Summary) return;
  
  if (!chairModel) {
    stage3Summary.innerHTML = '';
    return;
  }
  
  stage3Summary.innerHTML = `主席：<span class="highlight">${getModelName(chairModel)}</span>`;
}

/**
 * 決定實際使用的主席模型
 * @param {Array} ranking - aggregatedRanking 結果
 * @param {Array} successfulResponses - 成功的回應列表
 * @returns {string} 實際使用的主席模型 ID
 */
function resolveChairmanModel(ranking, successfulResponses) {
  // 如果不是「互評勝者」模式，直接使用設定的主席模型
  if (chairmanModel !== REVIEW_WINNER_VALUE) {
    return chairmanModel;
  }
  
  // 互評勝者模式：從排名取得第一名
  if (ranking && ranking.length > 0) {
    return ranking[0].model;
  }
  
  // Fallback：沒有互評結果時，使用第一個成功回應的模型
  if (successfulResponses && successfulResponses.length > 0) {
    return successfulResponses[0].model;
  }
  
  // 最終 fallback：使用第一個議會模型
  return councilModels[0] || '';
}

/**
 * 獲取可用的輔助模型（用於圖片生成等輔助功能）
 * 如果主席設定為互評勝者，則 fallback 到第一個議會模型
 * @returns {string} 可用的模型 ID
 */
function getAvailableHelperModel() {
  if (chairmanModel !== REVIEW_WINNER_VALUE) {
    return chairmanModel;
  }
  return councilModels[0] || '';
}

function clearAllSummaries() {
  if (stage1Summary) stage1Summary.innerHTML = '';
  if (stage2Summary) stage2Summary.innerHTML = '';
  if (stage3Summary) stage3Summary.innerHTML = '';
}

// ============================================
// Auto-grow Textarea
// ============================================

function autoGrowTextarea() {
  // Reset height to auto to get the correct scrollHeight
  queryInput.style.height = 'auto';
  // Set height to scrollHeight, clamped by CSS min/max
  const newHeight = Math.min(Math.max(queryInput.scrollHeight, 56), 180);
  queryInput.style.height = newHeight + 'px';
}

// ============================================
// Unified Skill Selector UI
// ============================================

/**
 * State for skill selection
 */
let userSelectedSkill = null;  // User manually selected skill (highest priority)
let detectedSkill = null;      // Auto-detected skill from query
let skillSelectorUI = null;    // SkillSelectorUI instance

/**
 * SkillSelectorUI - Manages the unified skill dropdown
 */
class SkillSelectorUI {
  constructor() {
    this.isOpen = false;
    this.skills = [];
    this.categories = {};
    this.searchFilter = '';
    this.initialized = false;
  }
  
  /**
   * Initialize the skill selector UI
   */
  async init() {
    if (this.initialized) return;
    
    // Get skills and categories from MAVSkills
    const MAVSkills = window.MAVSkills;
    if (!MAVSkills) {
      console.warn('[SkillSelectorUI] MAVSkills not available');
      return;
    }
    
    this.skills = MAVSkills.skillSelector?.getAll() || Object.values(MAVSkills.SKILLS || {});
    this.categories = MAVSkills.SKILL_CATEGORIES || {};
    
    // Render category sections
    this.renderCategories();
    
    // Setup event listeners
    this.setupEventListeners();
    
    this.initialized = true;
    console.log('[SkillSelectorUI] Initialized with', this.skills.length, 'skills');
  }
  
  /**
   * Render skill categories in dropdown
   */
  renderCategories() {
    if (!skillCategorySections) return;
    
    // Group skills by category
    const grouped = {};
    for (const skill of this.skills) {
      const cat = skill.category || 'quick';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(skill);
    }
    
    // Category order
    const categoryOrder = ['creative', 'visual', 'analysis', 'quick'];
    
    let html = '';
    for (const catId of categoryOrder) {
      const catInfo = this.categories[catId];
      const skills = grouped[catId] || [];
      
      if (skills.length === 0) continue;
      
      html += `
        <div class="skill-dropdown-section" data-category="${catId}">
          <div class="skill-category-header">
            <span class="skill-section-icon">${catInfo?.icon || '📁'}</span>
            <span class="skill-section-title">${catInfo?.name || catId}</span>
          </div>
          <div class="skill-option-list">
            ${skills.map(skill => this.renderSkillOption(skill)).join('')}
          </div>
        </div>
      `;
    }
    
    skillCategorySections.innerHTML = html;
  }
  
  /**
   * Render a single skill option
   */
  renderSkillOption(skill, showBadge = false) {
    return `
      <button class="skill-option" data-skill-id="${skill.id}">
        <span class="skill-option-icon">${skill.icon || '📄'}</span>
        <span class="skill-option-info">
          <span class="skill-option-name">${skill.name}</span>
          <span class="skill-option-desc">${skill.description || ''}</span>
        </span>
        ${showBadge ? '<span class="skill-option-badge">推薦</span>' : ''}
      </button>
    `;
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Toggle dropdown
    if (skillSelectorBtn) {
      skillSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
    }
    
    // Search input
    if (skillSearchInput) {
      skillSearchInput.addEventListener('input', (e) => {
        this.searchFilter = e.target.value.trim().toLowerCase();
        this.filterSkills();
      });
      
      skillSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.close();
        }
      });
    }
    
    // Skill option clicks (delegated)
    if (skillDropdownContent) {
      skillDropdownContent.addEventListener('click', (e) => {
        const option = e.target.closest('.skill-option');
        if (option) {
          const skillId = option.dataset.skillId;
          this.selectSkill(skillId);
        }
      });
    }
    
    // Clear selection button
    if (clearSkillSelection) {
      clearSkillSelection.addEventListener('click', () => {
        this.clearSelection();
      });
    }
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && skillSelectorEl && !skillSelectorEl.contains(e.target)) {
        this.close();
      }
    });
    
    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }
  
  /**
   * Toggle dropdown open/close
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  /**
   * Open dropdown
   */
  open() {
    if (!skillDropdown || !skillSelectorEl) return;
    
    skillDropdown.classList.remove('hidden');
    skillSelectorEl.classList.add('open');
    this.isOpen = true;
    
    // Focus search input
    if (skillSearchInput) {
      skillSearchInput.value = '';
      this.searchFilter = '';
      this.filterSkills();
      skillSearchInput.focus();
    }
    
    // Update recommended section
    this.updateRecommended();
  }
  
  /**
   * Close dropdown
   */
  close() {
    if (!skillDropdown || !skillSelectorEl) return;
    
    skillDropdown.classList.add('hidden');
    skillSelectorEl.classList.remove('open');
    this.isOpen = false;
  }
  
  /**
   * Filter skills based on search input
   */
  filterSkills() {
    if (!skillCategorySections) return;
    
    const sections = skillCategorySections.querySelectorAll('.skill-dropdown-section');
    let anyVisible = false;
    
    sections.forEach(section => {
      const options = section.querySelectorAll('.skill-option');
      let sectionVisible = false;
      
      options.forEach(option => {
        const skillId = option.dataset.skillId;
        const skill = this.skills.find(s => s.id === skillId);
        
        if (!skill) {
          option.style.display = 'none';
          return;
        }
        
        const matchesFilter = !this.searchFilter ||
          skill.name.toLowerCase().includes(this.searchFilter) ||
          (skill.description || '').toLowerCase().includes(this.searchFilter) ||
          skill.id.toLowerCase().includes(this.searchFilter);
        
        option.style.display = matchesFilter ? '' : 'none';
        if (matchesFilter) sectionVisible = true;
      });
      
      section.style.display = sectionVisible ? '' : 'none';
      if (sectionVisible) anyVisible = true;
    });
    
    // Show/hide no results message
    let noResults = skillDropdownContent?.querySelector('.skill-no-results');
    if (!anyVisible && this.searchFilter) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'skill-no-results';
        noResults.textContent = '找不到符合的技能';
        skillDropdownContent?.appendChild(noResults);
      }
      noResults.style.display = '';
    } else if (noResults) {
      noResults.style.display = 'none';
    }
  }
  
  /**
   * Update recommended section based on current query
   */
  updateRecommended() {
    if (!skillRecommendedSection || !skillRecommendedList) return;
    
    if (detectedSkill) {
      skillRecommendedSection.classList.remove('hidden');
      skillRecommendedList.innerHTML = this.renderSkillOption(detectedSkill, true);
      
      // Add click handler
      const option = skillRecommendedList.querySelector('.skill-option');
      if (option) {
        option.addEventListener('click', () => {
          this.selectSkill(detectedSkill.id);
        });
      }
    } else {
      skillRecommendedSection.classList.add('hidden');
    }
  }
  
  /**
   * Select a skill
   */
  selectSkill(skillId) {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill) return;
    
    userSelectedSkill = skill;
    this.updateDisplay(skill, 'user');
    
    // When user explicitly selects a skill, force apply its settings
    // This includes clearing vision state if the skill doesn't require it
    applySkillSideEffects(skill, { userSelected: true });
    this.close();
    
    console.log('[SkillSelectorUI] User selected skill:', skill.id, skill.name);
  }
  
  /**
   * Clear user selection (back to auto-detect)
   */
  clearSelection() {
    userSelectedSkill = null;
    
    // Use detected skill or show default
    if (detectedSkill) {
      this.updateDisplay(detectedSkill, 'auto');
      applySkillSideEffects(detectedSkill);
    } else {
      this.updateDisplay(null, null);
      applySkillSideEffects(null);
    }
    
    this.close();
    console.log('[SkillSelectorUI] Selection cleared, using auto-detect');
  }
  
  /**
   * Update the selector button display
   */
  updateDisplay(skill, source) {
    if (!skillSelectorIcon || !skillSelectorName || !skillSelectorEl) return;
    
    if (skill) {
      skillSelectorIcon.textContent = skill.icon || '✨';
      skillSelectorName.textContent = skill.name;
      
      // Update source badge
      if (skillSelectorSource) {
        if (source === 'auto') {
          skillSelectorSource.textContent = '自動';
          skillSelectorSource.setAttribute('data-source', 'auto');
          skillSelectorSource.classList.remove('hidden');
        } else if (source === 'user') {
          skillSelectorSource.textContent = '已選';
          skillSelectorSource.setAttribute('data-source', 'user');
          skillSelectorSource.classList.remove('hidden');
        } else {
          skillSelectorSource.classList.add('hidden');
        }
      }
      
      // Update category styling
      if (skill.category) {
        skillSelectorEl.setAttribute('data-category', skill.category);
      } else {
        skillSelectorEl.removeAttribute('data-category');
      }
      
      // Update selected state in dropdown
      this.updateSelectedState(skill.id);
    } else {
      skillSelectorIcon.textContent = '⚡';
      skillSelectorName.textContent = i18n?.t?.('sidepanel.autoDetect') || '自動偵測';
      skillSelectorSource?.classList.add('hidden');
      skillSelectorEl.removeAttribute('data-category');
      this.updateSelectedState(null);
    }
  }
  
  /**
   * Update selected state in dropdown options
   */
  updateSelectedState(selectedId) {
    if (!skillDropdownContent) return;
    
    const options = skillDropdownContent.querySelectorAll('.skill-option');
    options.forEach(option => {
      if (option.dataset.skillId === selectedId) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
  
  /**
   * Called when query changes - detect skill and update UI
   */
  onQueryChange(query) {
    if (!query || query.length < 3) {
      detectedSkill = null;
      if (!userSelectedSkill) {
        this.updateDisplay(null, null);
      }
      return;
    }
    
    // Detect skill
    const selector = window.MAVSkills?.skillSelector;
    if (selector) {
      const settings = {
        visionMode: visionMode,
        learnerMode: learnerMode
      };
      detectedSkill = selector.select(query, settings);
      
      // Only update display if user hasn't manually selected
      if (!userSelectedSkill && detectedSkill) {
        this.updateDisplay(detectedSkill, 'auto');
        // Apply side effects for auto-detected skill too
        applySkillSideEffects(detectedSkill);
      }
    }
  }
  
  /**
   * Get the currently active skill (user selected > detected)
   */
  getActiveSkill() {
    return userSelectedSkill || detectedSkill || null;
  }
  
  /**
   * Reset state (e.g., on new conversation)
   */
  reset() {
    userSelectedSkill = null;
    detectedSkill = null;
    this.updateDisplay(null, null);
    
    // Explicitly reset vision mode since applySkillSideEffects won't do it if image exists
    visionMode = false;
    if (visionUploadSection) {
      visionUploadSection.classList.add('hidden');
    }
    if (visionToggle) visionToggle.checked = false;
    
    applySkillSideEffects(null);
  }
}

/**
 * Apply skill side effects (enable/disable features)
 * @param {Object} skill - The skill to apply
 * @param {Object} options - Options
 * @param {boolean} options.userSelected - True if user explicitly selected this skill
 */
function applySkillSideEffects(skill, options = {}) {
  const { userSelected = false } = options;
  
  // Reset all modes first
  enableImage = false;
  enableSearchMode = false;
  
  // Determine if we should enable/disable vision mode
  const skillRequiresVision = skill?.sideEffects?.enableVision === true;
  const hasUploadedImage = uploadedImage !== null;
  
  // Vision mode logic:
  // - If skill requires vision: enable it and show upload UI
  // - If user explicitly selected a non-vision skill: force disable vision and clear image
  // - If skill auto-detected and doesn't require vision but image exists: keep vision
  // - If no image uploaded: disable vision
  if (skillRequiresVision) {
    visionMode = true;
    if (visionUploadSection) {
      visionUploadSection.classList.remove('hidden');
    }
  } else if (userSelected) {
    // User explicitly selected a skill that doesn't require vision
    // Force disable vision mode and clear uploaded image
    visionMode = false;
    clearUploadedImage();
    if (visionUploadSection) {
      visionUploadSection.classList.add('hidden');
    }
    console.log('[SkillSideEffects] User selected non-vision skill - cleared vision state');
  } else if (!hasUploadedImage) {
    // Auto-detected skill, no image uploaded
    visionMode = false;
    if (visionUploadSection) {
      visionUploadSection.classList.add('hidden');
    }
  }
  // If auto-detected, image exists, and skill doesn't require vision: keep current state
  
  if (!skill?.sideEffects) {
    // Update hidden toggles for backward compatibility
    if (imageToggle) imageToggle.checked = enableImage;
    if (searchModeToggle) searchModeToggle.checked = enableSearchMode;
    if (visionToggle) visionToggle.checked = visionMode;
    return;
  }
  
  const effects = skill.sideEffects;
  
  if (effects.enableImage) {
    enableImage = true;
  }
  if (effects.enableSearch) {
    enableSearchMode = true;
  }
  
  // Update hidden toggles for backward compatibility
  if (imageToggle) imageToggle.checked = enableImage;
  if (searchModeToggle) searchModeToggle.checked = enableSearchMode;
  if (visionToggle) visionToggle.checked = visionMode;
  
  // Update current card settings if in task planner mode
  updateCurrentCardSettings();
  
  console.log('[SkillSideEffects] Applied:', {
    skill: skill?.id || null,
    enableImage,
    enableSearchMode,
    visionMode,
    userSelected,
    hasUploadedImage: uploadedImage !== null
  });
}

/**
 * Resolve the active skill to use for query execution
 * Priority: user selection > planner recommendation > auto-detect
 */
function resolveActiveSkill(plannerRecommendation = null) {
  // 1. User manual selection (highest priority)
  if (userSelectedSkill) {
    return { skill: userSelectedSkill, source: 'user' };
  }
  
  // 2. Planner recommendation (during execution)
  if (plannerRecommendation) {
    return { skill: plannerRecommendation, source: 'planner' };
  }
  
  // 3. Auto-detected skill
  if (detectedSkill) {
    return { skill: detectedSkill, source: 'auto' };
  }
  
  // 4. Default to quickAnswer
  const defaultSkill = window.MAVSkills?.SKILLS?.quickAnswer || null;
  return { skill: defaultSkill, source: 'default' };
}

// ============================================
// Legacy Skill Badge Display (backward compatibility)
// ============================================

/**
 * Update skill badge display (legacy - now updates unified selector)
 * @param {Object|null} skill - The skill object (null to hide)
 * @param {string|null} strategy - Assignment strategy ('homogeneous', 'heterogeneous', 'mixed')
 */
function updateSkillBadge(skill, strategy = null) {
  // Update the unified skill selector instead
  if (skillSelectorUI) {
    if (skill) {
      // If this is from external source (not user selection), treat as auto-detected
      if (!userSelectedSkill) {
        detectedSkill = skill;
        skillSelectorUI.updateDisplay(skill, 'auto');
      }
    } else {
      if (!userSelectedSkill) {
        detectedSkill = null;
        skillSelectorUI.updateDisplay(null, null);
      }
    }
  }
  
  // Legacy badge update (if element exists)
  if (skillBadge) {
    if (!skill) {
      skillBadge.classList.add('hidden');
      return;
    }
    
    skillBadge.classList.remove('hidden');
    if (skillBadgeIcon) skillBadgeIcon.textContent = skill.icon || '✨';
    if (skillBadgeName) skillBadgeName.textContent = skill.name || skill.id || 'Unknown';
    
    if (skillBadgeStrategy) {
      if (strategy && strategy !== 'homogeneous') {
        skillBadgeStrategy.textContent = strategy === 'heterogeneous' ? '異質分工' : '混合模式';
        skillBadgeStrategy.classList.remove('hidden');
        skillBadge.setAttribute('data-strategy', strategy);
      } else {
        skillBadgeStrategy.classList.add('hidden');
        skillBadge.removeAttribute('data-strategy');
      }
    }
  }
}

/**
 * Detect and show skill badge based on current query (legacy - now uses unified selector)
 */
function detectAndShowSkillBadge() {
  const query = queryInput.value.trim();
  
  // Use the new SkillSelectorUI if available
  if (skillSelectorUI) {
    skillSelectorUI.onQueryChange(query);
    return;
  }
  
  // Legacy fallback
  if (!query || query.length < 3) {
    updateSkillBadge(null);
    return;
  }
  
  const selector = window.MAVSkills?.skillSelector;
  if (selector) {
    const settings = {
      visionMode: visionMode,
      learnerMode: learnerMode
    };
    const selectedSkill = selector.select(query, settings);
    updateSkillBadge(selectedSkill);
  }
}

// ============================================
// Agent Progress Panel Functions (已改用 Timeline 系統)
// ============================================

// 保留舊的 DOM 參考以供向下相容
const agentProgressSection = null; // 已移除
const progressContent = null; // 已移除
const progressStep = null; // 已移除

/**
 * Show the agent progress panel (改為顯示 timeline)
 */
function showAgentProgress() {
  showPlannerTimeline();
}

/**
 * Hide the agent progress panel
 */
function hideAgentProgress() {
  // Timeline 不需要隱藏，保持可見以顯示歷史
}

/**
 * Collapse agent progress panel (no-op for timeline)
 */
function collapseAgentProgress() {
  // no-op
}

/**
 * Expand agent progress panel (no-op for timeline)
 */
function expandAgentProgress() {
  // no-op
}

/**
 * Toggle agent progress panel collapsed state (no-op for timeline)
 */
function toggleAgentProgress() {
  // no-op
}

/**
 * Clear agent progress panel content
 * Called at start of new query
 */
function clearAgentProgress() {
  clearPlannerTimeline();
  hideNextStepsSection();
}

/**
 * Update the agent progress panel with current tool status
 * 現在改為使用 timeline 段落系統
 * @param {string} tool - Current tool being executed
 * @param {string} status - 'loading', 'done', or 'error'
 * @param {Object} details - Additional details to display
 */
function updateAgentProgress(tool, status, details = {}) {
  // 'planning' 類型會創建新段落
  if (tool === 'planning' && status === 'done' && details.nextTool) {
    // Create new paragraph for the upcoming tool
    appendTimelineParagraph({
      tool: details.nextTool,
      reasoning: details.reasoning || ''
    }, 'loading');
    return;
  }
  
  // 其他 tool 類型更新當前段落的結果
  if (status === 'done' && currentTimelineParagraph) {
    // Result will be rendered via renderToolResultInParagraph
  }
  
  if (status === 'error') {
    updateCurrentParagraphStatus('error');
  }
}

// ============================================
// Agent Breakpoint Functions
// ============================================

// Breakpoint panel DOM elements
const agentBreakpointPanel = document.getElementById('agentBreakpointPanel');
const breakpointMessage = document.getElementById('breakpointMessage');
const breakpointOptions = document.getElementById('breakpointOptions');
const breakpointSearches = document.getElementById('breakpointSearches');
const breakpointDefaultActions = document.getElementById('breakpointDefaultActions');
const breakpointProceed = document.getElementById('breakpointProceed');
const breakpointCustom = document.getElementById('breakpointCustom');
const breakpointCustomInput = document.getElementById('breakpointCustomInput');
const breakpointTextInput = document.getElementById('breakpointTextInput');
const breakpointTextSubmit = document.getElementById('breakpointTextSubmit');

// Store current breakpoint resolve function and config
let breakpointResolve = null;
let currentBreakpointConfig = null;

/**
 * Show breakpoint panel and wait for user response
 * Now supports dynamic options from planner
 * @param {string} message - Message to display
 * @param {string[]} suggestedSearches - Suggested search queries (legacy)
 * @param {Object} config - Full configuration from planner
 * @returns {Promise<{action: string, value?: string, query?: string}>}
 */
function showBreakpointAndWait(message, suggestedSearches = [], config = {}) {
  return new Promise((resolve) => {
    if (!agentBreakpointPanel) {
      console.warn('[Breakpoint] Panel not found, skipping');
      resolve({ action: 'proceed' });
      return;
    }
    
    breakpointResolve = resolve;
    currentBreakpointConfig = config;
    
    const { inputType = 'choice', options = [], placeholder = '' } = config;
    
    console.log('[Breakpoint] Showing panel, inputType:', inputType, 'options:', options.length);
    
    // Update message
    if (breakpointMessage) {
      breakpointMessage.textContent = message || '請選擇下一步行動：';
    }
    
    // Clear previous content
    if (breakpointOptions) breakpointOptions.innerHTML = '';
    if (breakpointSearches) breakpointSearches.innerHTML = '';
    
    // Render based on inputType
    if (inputType === 'choice' && options.length > 0) {
      // Dynamic options mode
      renderBreakpointOptions(options);
      breakpointSearches?.classList.add('hidden');
      breakpointDefaultActions?.classList.add('hidden');
    } else if (inputType === 'search' || suggestedSearches.length > 0) {
      // Search suggestions mode
      const searches = suggestedSearches.length > 0 ? suggestedSearches : (config.suggestedSearches || []);
      renderBreakpointSearches(searches);
      breakpointSearches?.classList.remove('hidden');
      breakpointDefaultActions?.classList.remove('hidden');
    } else if (inputType === 'text') {
      // Free text input mode
      breakpointSearches?.classList.add('hidden');
      breakpointDefaultActions?.classList.add('hidden');
      breakpointCustomInput?.classList.remove('hidden');
      if (breakpointTextInput) {
        breakpointTextInput.placeholder = placeholder || '請輸入...';
        breakpointTextInput.value = '';
        breakpointTextInput.focus();
      }
    } else if (inputType === 'confirm') {
      // Simple confirm mode
      renderBreakpointOptions([
        { label: '繼續', action: 'proceed', icon: '✅' },
        { label: '取消', action: 'cancel', icon: '❌' }
      ]);
      breakpointSearches?.classList.add('hidden');
      breakpointDefaultActions?.classList.add('hidden');
    } else {
      // Default fallback
      breakpointSearches?.classList.add('hidden');
      breakpointDefaultActions?.classList.remove('hidden');
    }
    
    // Reset custom input for non-text modes
    if (inputType !== 'text') {
      breakpointCustomInput?.classList.add('hidden');
      if (breakpointTextInput) breakpointTextInput.value = '';
    }
    
    // Show panel
    agentBreakpointPanel.classList.remove('hidden');
    
    // Update progress panel to show waiting state
    updateAgentProgress('request_user_input', 'loading', {
      inputType,
      optionCount: options.length
    });
  });
}

/**
 * Render dynamic option buttons
 */
function renderBreakpointOptions(options) {
  if (!breakpointOptions) return;
  
  breakpointOptions.innerHTML = '';
  
  console.log('[Breakpoint] renderBreakpointOptions called with', options.length, 'options');
  
  options.forEach((opt, index) => {
    const btn = document.createElement('button');
    btn.className = 'breakpoint-option-btn';
    
    // Add special class for proceed action
    if (opt.action === 'proceed') {
      btn.classList.add('proceed');
    }
    
    // Build button content
    let content = '';
    if (opt.icon) {
      content += `<span class="option-icon">${opt.icon}</span>`;
    }
    content += `<span class="option-label">${opt.label}</span>`;
    btn.innerHTML = content;
    
    // Click handler with explicit closure
    const optionCopy = { ...opt }; // Ensure we capture the option correctly
    btn.addEventListener('click', (e) => {
      console.log('[Breakpoint] Button clicked, index:', index);
      e.preventDefault();
      e.stopPropagation();
      handleBreakpointOption(optionCopy);
    });
    
    breakpointOptions.appendChild(btn);
    console.log('[Breakpoint] Button added:', opt.action, opt.label?.slice(0, 30));
  });
}

/**
 * Render search suggestion buttons
 */
function renderBreakpointSearches(searches) {
  if (!breakpointSearches) return;
  
  breakpointSearches.innerHTML = '';
  
  searches.forEach(query => {
    const btn = document.createElement('button');
    btn.className = 'breakpoint-search-btn';
    btn.textContent = query;
    btn.addEventListener('click', () => handleBreakpointSearch(query));
    breakpointSearches.appendChild(btn);
  });
}

/**
 * Handle user clicking a dynamic option button
 */
function handleBreakpointOption(option) {
  console.log('[Breakpoint] handleBreakpointOption called with:', option);
  
  try {
    hideBreakpoint();
    
    const response = {
      action: option.action,
      value: option.value || null,
      label: option.label
    };
    
    // For search action, set query
    if (option.action === 'search' && option.value) {
      response.query = option.value;
    }
    
    console.log('[Breakpoint] Option selected:', response);
    console.log('[Breakpoint] breakpointResolve exists:', !!breakpointResolve);
    
    if (breakpointResolve) {
      breakpointResolve(response);
      breakpointResolve = null;
    } else {
      console.error('[Breakpoint] No resolver found! Promise may have timed out or been cancelled.');
    }
  } catch (err) {
    console.error('[Breakpoint] Error in handleBreakpointOption:', err);
  }
}

/**
 * Handle user clicking a suggested search button
 */
function handleBreakpointSearch(query) {
  hideBreakpoint();
  if (breakpointResolve) {
    breakpointResolve({ action: 'search', query });
    breakpointResolve = null;
  }
}

/**
 * Handle user clicking "proceed" button
 */
function handleBreakpointProceed() {
  hideBreakpoint();
  if (breakpointResolve) {
    breakpointResolve({ action: 'proceed' });
    breakpointResolve = null;
  }
}

/**
 * Handle user clicking "custom input" button
 */
function handleBreakpointCustom() {
  if (breakpointCustomInput) {
    breakpointCustomInput.classList.toggle('hidden');
    if (!breakpointCustomInput.classList.contains('hidden') && breakpointTextInput) {
      breakpointTextInput.focus();
    }
  }
}

/**
 * Handle text input submit
 */
function handleBreakpointTextSubmit() {
  if (!breakpointTextInput) return;
  const value = breakpointTextInput.value.trim();
  if (!value) return;
  
  hideBreakpoint();
  
  // Determine action based on current config
  const inputType = currentBreakpointConfig?.inputType || 'text';
  let action = 'custom';
  
  // If it looks like a search query, treat as search
  if (value.length < 50 && !value.includes('\n')) {
    action = 'search';
  }
  
  console.log('[Breakpoint] Text submitted:', { action, value });
  
  if (breakpointResolve) {
    breakpointResolve({ action, value, query: action === 'search' ? value : null });
    breakpointResolve = null;
  }
}

/**
 * Hide the breakpoint panel
 */
function hideBreakpoint() {
  if (agentBreakpointPanel) {
    agentBreakpointPanel.classList.add('hidden');
  }
  currentBreakpointConfig = null;
}

// Attach breakpoint event listeners
if (breakpointProceed) {
  breakpointProceed.addEventListener('click', handleBreakpointProceed);
}
if (breakpointCustom) {
  breakpointCustom.addEventListener('click', handleBreakpointCustom);
}
if (breakpointTextSubmit) {
  breakpointTextSubmit.addEventListener('click', handleBreakpointTextSubmit);
}
if (breakpointTextInput) {
  breakpointTextInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleBreakpointTextSubmit();
    }
  });
}

// ============================================
// AI Suggested Actions Functions
// ============================================

/**
 * Show suggested actions panel with context-aware suggestions
 * @param {Object} result - The agent result
 * @param {Object} skill - The skill that was used
 */
function showSuggestedActions(result, skill) {
  if (!suggestedActionsPanel || !suggestedActionsContent) return;
  
  const suggestions = [];
  const resultContent = result?.content || '';
  
  // Check for conditions to show specific actions
  const hasImages = checkForImages(resultContent);
  const hasSearchQueries = currentSearchQueries.length > 0;
  const isResearchSkill = skill?.id === 'researcher' || skill?.id === 'factChecker';
  const isImageSkill = skill?.id === 'imageDesign';
  
  // Vision analysis - if there are generated images or uploaded images
  if (hasImages || (multiImageState && multiImageState.generatedImages?.length > 0)) {
    suggestions.push({
      icon: '👁️',
      label: '分析圖片',
      action: 'vision',
      handler: () => handleBranchVision()
    });
  }
  
  // Extended search - always show if Brave API is available
  if (hasBraveApiKey && searchIteration < maxSearchIterations) {
    suggestions.push({
      icon: '🔍',
      label: '延伸搜尋',
      action: 'search',
      handler: () => handleBranchSearch()
    });
  }
  
  // Canvas/Notes - always show
  suggestions.push({
    icon: '📝',
    label: '做筆記',
    action: 'canvas',
    handler: () => openCanvas(false)
  });
  
  // Image generation - show if not already in image skill
  if (!isImageSkill) {
    suggestions.push({
      icon: '🎨',
      label: '生成圖像',
      action: 'genImage',
      handler: () => handleBranchImage()
    });
  }
  
  // If no suggestions, hide panel
  if (suggestions.length === 0) {
    hideSuggestedActions();
    return;
  }
  
  // Render suggestions
  renderSuggestedActions(suggestions);
  suggestedActionsPanel.classList.remove('hidden');
  
  // Show parent todoSection if it exists and is hidden
  if (todoSection && todoSection.classList.contains('hidden')) {
    todoSection.classList.remove('hidden');
  }
  
  // Set default quick input value based on search queries
  if (suggestedQuickInput) {
    if (currentSearchQueries.length > 0) {
      // Pre-fill with first search suggestion
      suggestedQuickInput.value = currentSearchQueries[0];
      suggestedQuickInput.placeholder = '進一步提問...';
    } else {
      // Generate a follow-up prompt based on skill
      const followUpPrompts = {
        'researcher': '深入分析這個主題的具體細節',
        'factChecker': '查證其他相關說法',
        'currentEvents': '查詢最新進展',
        'imageDesign': '調整設計風格或構圖',
        'default': '針對這個回答提出更多問題'
      };
      suggestedQuickInput.value = '';
      suggestedQuickInput.placeholder = followUpPrompts[skill?.id] || followUpPrompts.default;
    }
  }
}

/**
 * Hide suggested actions panel
 */
function hideSuggestedActions() {
  if (suggestedActionsPanel) {
    suggestedActionsPanel.classList.add('hidden');
  }
  if (suggestedActionsContent) {
    suggestedActionsContent.innerHTML = '';
  }
}

/**
 * Render suggested action buttons
 * @param {Array} suggestions - Array of suggestion objects
 */
function renderSuggestedActions(suggestions) {
  if (!suggestedActionsContent) return;
  
  suggestedActionsContent.innerHTML = suggestions.map(s => `
    <button class="suggested-action-btn" data-action="${s.action}">
      <span class="action-icon">${s.icon}</span>
      <span class="action-label">${s.label}</span>
    </button>
  `).join('');
  
  // Attach event listeners
  suggestedActionsContent.querySelectorAll('.suggested-action-btn').forEach((btn, index) => {
    btn.addEventListener('click', () => {
      suggestions[index].handler();
      hideSuggestedActions();
    });
  });
}

/**
 * Check if content contains images
 * @param {string} content - The result content
 * @returns {boolean}
 */
function checkForImages(content) {
  // Check for markdown image syntax or base64 images
  return /!\[.*?\]\(.*?\)/.test(content) || 
         /data:image\//.test(content) ||
         /<img\s+src=/.test(content);
}

// ============================================
// Storage Quota Utilities
// ============================================
async function checkStorageQuota() {
  try {
    const usage = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
    const usagePercent = (usage / quota) * 100;
    
    if (usagePercent > 80) {
      showStorageWarning(usagePercent, usage, quota);
    }
    return { usage, quota, usagePercent };
  } catch (err) {
    console.error('Failed to check storage quota:', err);
    return null;
  }
}

function showStorageWarning(percent, usage, quota) {
  const usageMB = (usage / 1024 / 1024).toFixed(2);
  const quotaMB = (quota / 1024 / 1024).toFixed(2);
  showToast(`儲存空間已使用 ${percent.toFixed(0)}% (${usageMB}/${quotaMB} MB)，建議清理歷史紀錄`, true);
}

// Wrapper for safe storage.local.set with quota error handling
async function safeStorageSet(data) {
  try {
    await chrome.storage.local.set(data);
    return { success: true };
  } catch (err) {
    if (err.message?.includes('QUOTA_BYTES') || err.message?.includes('quota')) {
      showToast(t('messages.storageError'), true);
      return { success: false, quotaError: true, error: err };
    }
    throw err;
  }
}

// ============================================
// API Key Validation
// ============================================
let hasBraveApiKey = false;

async function checkApiKeys() {
  const result = await chrome.storage.sync.get(['apiKey', 'braveApiKey']);
  const hasOpenRouter = !!result.apiKey;
  hasBraveApiKey = !!result.braveApiKey;
  
  // Update search UI state based on Brave API key
  updateSearchUIState(hasBraveApiKey);
  
  return { hasOpenRouter, hasBrave: hasBraveApiKey };
}

function updateSearchUIState(hasBrave) {
  // Disable/enable searchModeToggle
  searchModeToggle.disabled = !hasBrave;
  if (!hasBrave && searchModeToggle.checked) {
    searchModeToggle.checked = false;
    enableSearchMode = false;
  }
  
  // Update toggle appearance
  const searchToggleLabel = searchModeToggle.closest('.search-toggle');
  if (searchToggleLabel) {
    searchToggleLabel.title = hasBrave 
      ? '啟用 AI 網搜迭代模式' 
      : '需要設定 Brave Search API 金鑰才能使用網搜功能';
    searchToggleLabel.style.opacity = hasBrave ? '1' : '0.5';
  }
  
  // Disable branchSearchBtn
  if (branchSearchBtn) {
    branchSearchBtn.disabled = !hasBrave;
    branchSearchBtn.title = hasBrave ? '延伸搜尋' : '需要設定 Brave Search API 金鑰';
  }
  
  // Disable customSearchBtn
  if (customSearchBtn) {
    customSearchBtn.disabled = !hasBrave;
  }
  
  // Disable customSearchInput
  if (customSearchInput) {
    customSearchInput.disabled = !hasBrave;
    customSearchInput.placeholder = hasBrave ? '輸入自訂關鍵字...' : '需要設定 Brave API 金鑰';
  }
  
  // Disable webSearchBtn in context section
  if (webSearchBtn) {
    webSearchBtn.disabled = !hasBrave;
    webSearchBtn.title = hasBrave ? '網路搜尋' : '需要設定 Brave Search API 金鑰';
    webSearchBtn.style.opacity = hasBrave ? '1' : '0.5';
  }
}

// ============================================
// Initialize
// ============================================
async function init() {
  // Initialize i18n first
  await i18n.init();
  
  await loadDynamicPricing();
  await loadSettings();
  await checkApiKeys();
  await loadContextItems();
  setupEventListeners();
  setupStorageListener();
  
  // Initialize Unified Skill Selector UI
  skillSelectorUI = new SkillSelectorUI();
  await skillSelectorUI.init();
  
  // Check storage quota on startup
  await checkStorageQuota();
}

// Load context items - now session-based only, not from global storage
async function loadContextItems() {
  // Clear any legacy global storage (one-time migration)
  const result = await chrome.storage.local.get('contextItems');
  if (result.contextItems && result.contextItems.length > 0) {
    console.log('[loadContextItems] Clearing legacy global contextItems:', result.contextItems.length);
    await chrome.storage.local.remove('contextItems');
  }
  
  // Context items are now loaded from session data, not global storage
  // Session loading happens in loadSession(), here we just initialize empty
  sessionContextItems = [];
  
  updateVisibleContextItems();
  renderContextItems();
  updateContextBadge();
  notifyBadgeUpdate();
}

// Listen for storage changes (settings only) and messages from background
function setupStorageListener() {
  // Storage listener for settings only (not context items)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    // Sync storage changes (API keys and settings)
    if (areaName === 'sync') {
      // Update Brave API key state
      if (changes.braveApiKey) {
        hasBraveApiKey = !!changes.braveApiKey.newValue;
        updateSearchUIState(hasBraveApiKey);
      }
    }
  });
  
  // Listen for messages from background script (context menu additions)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'ADD_CONTEXT_ITEM') {
      handleAddContextFromBackground(message.item);
      sendResponse({ success: true });
    }
    return false;
  });
}

// Handle context item added from background script (right-click menu)
async function handleAddContextFromBackground(item) {
  await addContextItem({
    type: item.type || 'selection',
    title: item.title,
    content: item.content,
    url: item.url
  }); // Uses 'auto' scope: root card → session, subtask → card
  
  showToast(t('messages.contextAdded'));
}

// Output style settings
let outputLength = 'standard';
let outputFormat = 'mixed';

async function loadSettings() {
  const result = await chrome.storage.sync.get({ 
    councilModels: [], 
    chairmanModel: 'anthropic/claude-sonnet-4.5',
    plannerModel: '',  // Empty means disabled (rule-based only)
    enableReview: true,
    maxSearchIterations: 5,
    maxCardDepth: 3,
    reviewPrompt: DEFAULT_REVIEW_PROMPT,
    chairmanPrompt: DEFAULT_CHAIRMAN_PROMPT,
    outputLength: 'standard',
    outputFormat: 'mixed',
    learnerMode: 'standard'
  });
  councilModels = result.councilModels;
  chairmanModel = result.chairmanModel;
  plannerModel = result.plannerModel || '';  // Store globally for HybridPlanner
  enableReview = result.enableReview;
  maxSearchIterations = result.maxSearchIterations || 5;
  maxCardDepth = result.maxCardDepth || 3;
  customReviewPrompt = result.reviewPrompt || DEFAULT_REVIEW_PROMPT;
  customChairmanPrompt = result.chairmanPrompt || DEFAULT_CHAIRMAN_PROMPT;
  outputLength = result.outputLength || 'standard';
  outputFormat = result.outputFormat || 'mixed';
  learnerMode = result.learnerMode || 'standard';
  updateModelCount();
}

// Generate output style instructions based on settings and language
function getOutputStyleInstructions() {
  const locale = i18n.getLocale();
  
  // Localized length instructions
  const lengthInstructions = {
    'zh-TW': {
      concise: '回答請控制在 500 字以內，聚焦核心重點，每個要點用 1-2 句話說明。',
      standard: '回答請控制在 800 字左右，適度展開說明重要概念。',
      detailed: '回答可詳細展開至 1200 字左右，完整涵蓋各面向。'
    },
    'en-US': {
      concise: 'Keep responses under 500 words, focusing on key points with 1-2 sentences per point.',
      standard: 'Keep responses around 800 words with moderate elaboration on important concepts.',
      detailed: 'Responses can be expanded to around 1200 words for comprehensive coverage.'
    },
    'ja-JP': {
      concise: '回答は500字以内に抑え、核心的なポイントに焦点を当て、各ポイントは1-2文で説明してください。',
      standard: '回答は約800字程度で、重要な概念を適度に展開してください。',
      detailed: '回答は約1200字まで詳しく展開し、各側面を完全にカバーしてください。'
    }
  };
  
  // Localized format instructions
  const formatInstructions = {
    'zh-TW': {
      bullet: '優先使用條列式格式，每個項目簡短扼要。',
      mixed: '依內容性質靈活選擇條列式或段落式。',
      paragraph: '使用完整段落進行說明，保持邏輯連貫。'
    },
    'en-US': {
      bullet: 'Prefer bullet point format with brief items.',
      mixed: 'Flexibly choose between bullet points and paragraphs based on content.',
      paragraph: 'Use complete paragraphs for explanation, maintaining logical coherence.'
    },
    'ja-JP': {
      bullet: '箇条書き形式を優先し、各項目は簡潔に。',
      mixed: '内容の性質に応じて箇条書きと段落を柔軟に選択。',
      paragraph: '完全な段落で説明し、論理的な一貫性を保つ。'
    }
  };
  
  // Localized header
  const headers = {
    'zh-TW': '**輸出風格指引**：',
    'en-US': '**Output Style Guidelines**:',
    'ja-JP': '**出力スタイルガイドライン**：'
  };
  
  // Localized closing
  const closings = {
    'zh-TW': '避免冗長的開場白和重複說明，直接切入主題。',
    'en-US': 'Avoid lengthy introductions and repetition, get straight to the point.',
    'ja-JP': '冗長な前置きや繰り返しを避け、本題に直接入ってください。'
  };

  const lang = lengthInstructions[locale] ? locale : 'zh-TW';
  const length = lengthInstructions[lang][outputLength] || lengthInstructions[lang].standard;
  const format = formatInstructions[lang][outputFormat] || formatInstructions[lang].mixed;
  const header = headers[lang];
  const closing = closings[lang];

  return `\n\n${header}
- ${length}
- ${format}
- ${closing}`;
}

function updateModelCount() {
  modelCountEl.textContent = t('sidepanel.modelCount', { count: councilModels.length });
}

function setupEventListeners() {
  // 全域鍵盤事件：明確允許系統快捷鍵通過，避免擴展干擾複製/貼上等功能
  document.addEventListener('keydown', (e) => {
    // 允許 Ctrl/Cmd + C, V, X, A, Z 等系統快捷鍵通過
    if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'a', 'z'].includes(e.key.toLowerCase())) {
      // 不攔截，讓瀏覽器處理
      return;
    }
  }, true); // 使用捕獲階段，確保優先處理
  
  sendBtn.addEventListener('click', handleSend);
  queryInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); });
  settingsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  newChatBtn.addEventListener('click', startNewChat);
  dismissError.addEventListener('click', () => errorBanner.classList.add('hidden'));
  
  // Quick input submit (from suggested actions panel)
  if (suggestedQuickSubmit) {
    suggestedQuickSubmit.addEventListener('click', handleQuickSubmit);
  }
  if (suggestedQuickInput) {
    suggestedQuickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuickSubmit();
    });
  }
  
  // Agent progress panel toggle (accordion)
  const progressHeader = document.getElementById('progressHeader');
  if (progressHeader) {
    progressHeader.addEventListener('click', toggleAgentProgress);
  }
  
  // Auto-grow textarea and detect skill
  queryInput.addEventListener('input', () => {
    autoGrowTextarea();
    // Debounce skill detection
    clearTimeout(window._skillDetectTimeout);
    window._skillDetectTimeout = setTimeout(detectAndShowSkillBadge, 300);
  });
  autoGrowTextarea(); // Initial sizing

  // Image toggle
  imageToggle.addEventListener('change', () => { 
    enableImage = imageToggle.checked;
    updateCurrentCardSettings();
  });

  // Vision toggle
  if (visionToggle) {
    visionToggle.addEventListener('change', () => { 
      visionMode = visionToggle.checked;
      if (visionMode) {
        visionUploadSection.classList.remove('hidden');
        costTracker.classList.remove('hidden');
        // Disable image generation mode when vision is enabled
        if (imageToggle.checked) {
          imageToggle.checked = false;
          enableImage = false;
        }
      } else {
        visionUploadSection.classList.add('hidden');
        if (sessionCost.total === 0) {
          costTracker.classList.add('hidden');
        }
        clearUploadedImage();
      }
      updateCurrentCardSettings();
    });
  }

  // Vision image upload
  if (visionUploadArea) {
    visionUploadArea.addEventListener('click', () => visionFileInput?.click());
    visionUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      visionUploadArea.classList.add('dragover');
    });
    visionUploadArea.addEventListener('dragleave', () => {
      visionUploadArea.classList.remove('dragover');
    });
    visionUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      visionUploadArea.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleVisionImageUpload(file);
      }
    });
  }

  if (visionFileInput) {
    visionFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleVisionImageUpload(file);
      }
    });
  }

  if (removeVisionImage) {
    removeVisionImage.addEventListener('click', clearUploadedImage);
  }

  // Cost tracker toggle details
  if (costTracker) {
    costTracker.querySelector('.cost-tracker-header')?.addEventListener('click', () => {
      costTrackerDetails?.classList.toggle('hidden');
    });
  }

  // History
  historyBtn.addEventListener('click', toggleHistory);
  clearHistoryBtn.addEventListener('click', clearHistory);
  closeHistoryBtn.addEventListener('click', closeHistory);

  // Export
  exportBtn.addEventListener('click', () => exportModal.classList.remove('hidden'));
  closeExportModal.addEventListener('click', () => exportModal.classList.add('hidden'));
  exportModal.addEventListener('click', (e) => { if (e.target === exportModal) exportModal.classList.add('hidden'); });
  exportMd.addEventListener('click', () => exportAsMarkdown());
  exportJson.addEventListener('click', () => exportAsJson());
  copyClipboard.addEventListener('click', () => copyToClipboard());

  // Lightbox
  lightbox.addEventListener('click', () => lightbox.classList.add('hidden'));
  document.querySelector('.lightbox-close')?.addEventListener('click', () => lightbox.classList.add('hidden'));

  // Context section
  contextHeader.addEventListener('click', toggleContextPanel);
  capturePageBtn.addEventListener('click', capturePageContent);
  captureSelectionBtn.addEventListener('click', captureSelection);
  pasteContextBtn.addEventListener('click', pasteContext);
  clearContextBtn.addEventListener('click', clearContext);
  
  // Web search button in context section
  if (webSearchBtn) {
    webSearchBtn.addEventListener('click', handleWebSearchFromContext);
  }

  // Search mode toggle
  searchModeToggle.addEventListener('change', () => { 
    // Check Brave API key before enabling search mode
    if (searchModeToggle.checked && !hasBraveApiKey) {
      searchModeToggle.checked = false;
      showToast(t('messages.braveKeyRequired'), true);
      return;
    }
    enableSearchMode = searchModeToggle.checked;
    if (!enableSearchMode) {
      searchStrategySection.classList.add('hidden');
    }
    updateCurrentCardSettings();
  });

  // Custom search button (用按鈕啟動，不用 enter)
  customSearchBtn.addEventListener('click', () => {
    // Check Brave API key
    if (!hasBraveApiKey) {
      showToast(t('messages.braveKeyRequired'), true);
      return;
    }
    const query = customSearchInput.value.trim();
    if (query) {
      prepareSearchIteration(query);
      customSearchInput.value = '';
    }
  });

  // Cancel search iteration
  cancelSearchIteration.addEventListener('click', cancelSearchIterationMode);

  // Canvas button & dropdown
  canvasBtn.addEventListener('click', () => openCanvas(false));
  canvasDropdownBtn.addEventListener('click', toggleCanvasDropdown);
  canvasDropdown.querySelectorAll('.canvas-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const asWindow = item.dataset.mode === 'window';
      openCanvas(asWindow);
      canvasDropdown.classList.add('hidden');
    });
  });
  document.addEventListener('click', (e) => {
    if (!canvasDropdownBtn.contains(e.target) && !canvasDropdown.contains(e.target)) {
      canvasDropdown.classList.add('hidden');
    }
  });

  // Branch action buttons
  branchSearchBtn.addEventListener('click', handleBranchSearch);
  branchImageBtn.addEventListener('click', handleBranchImage);
  if (branchVisionBtn) {
    branchVisionBtn.addEventListener('click', handleBranchVision);
  }
  branchCanvasBtn.addEventListener('click', () => openCanvas(false));

  // Task Planner buttons
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      addTaskForm.classList.remove('hidden');
      newTaskInput.value = '';
      newTaskInput.focus();
    });
  }
  
  if (confirmAddTask) {
    confirmAddTask.addEventListener('click', () => {
      // Prevent double-click
      if (confirmAddTask.disabled) return;
      
      const content = newTaskInput.value.trim();
      if (content) {
        // Temporarily disable button
        confirmAddTask.disabled = true;
        
        const priority = newTaskPriority.value || 'medium';
        addTaskManually(content, priority);
        addTaskForm.classList.add('hidden');
        newTaskInput.value = '';
        
        // Re-enable after short delay
        setTimeout(() => {
          confirmAddTask.disabled = false;
        }, 300);
      }
    });
  }
  
  if (cancelAddTask) {
    cancelAddTask.addEventListener('click', () => {
      addTaskForm.classList.add('hidden');
      newTaskInput.value = '';
    });
  }
  
  if (newTaskInput) {
    newTaskInput.addEventListener('keydown', (e) => {
      // Require Ctrl/Cmd+Enter to confirm (avoid accidental Enter)
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        confirmAddTask?.click();
      }
      if (e.key === 'Escape') {
        cancelAddTask?.click();
      }
    });
  }

  // Card system listeners
  setupCardSystemListeners();
  
  // New conversation modal listeners
  setupNewConvModalListeners();
  
  // Paste modal listeners
  setupPasteModalListeners();
  
  // Web search modal listeners
  setupWebSearchModalListeners();
  
  // Stage 2.5 search suggestion listeners
  setupStage25Listeners();

  // Toggle stage sections (accordion mode - only one expanded at a time)
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const content = document.getElementById(btn.dataset.target);
      const section = btn.closest('.stage-section');
      const isCurrentlyExpanded = content.classList.contains('expanded');
      
      // Collapse all other stage sections first (accordion behavior)
      document.querySelectorAll('.stage-section').forEach(otherSection => {
        if (otherSection !== section) {
          const otherContent = otherSection.querySelector('.stage-content');
          if (otherContent) {
            otherContent.classList.remove('expanded');
            otherSection.classList.add('collapsed');
          }
        }
      });
      
      // Toggle current section
      if (isCurrentlyExpanded) {
        content.classList.remove('expanded');
        section.classList.add('collapsed');
      } else {
        content.classList.add('expanded');
        section.classList.remove('collapsed');
      }
    });
  });
  
  // Also allow clicking on stage header to toggle
  document.querySelectorAll('.stage-header').forEach(header => {
    header.addEventListener('click', (e) => {
      // Don't trigger if clicking on toggle button (it has its own handler)
      if (e.target.closest('.toggle-btn')) return;
      const toggleBtn = header.querySelector('.toggle-btn');
      if (toggleBtn) toggleBtn.click();
    });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (changes.councilModels) councilModels = changes.councilModels.newValue || [];
    if (changes.chairmanModel) chairmanModel = changes.chairmanModel.newValue;
    if (changes.enableReview) enableReview = changes.enableReview.newValue;
    if (changes.maxSearchIterations) maxSearchIterations = changes.maxSearchIterations.newValue || 5;
    if (changes.reviewPrompt) customReviewPrompt = changes.reviewPrompt.newValue || DEFAULT_REVIEW_PROMPT;
    if (changes.chairmanPrompt) customChairmanPrompt = changes.chairmanPrompt.newValue || DEFAULT_CHAIRMAN_PROMPT;
    if (changes.outputLength) outputLength = changes.outputLength.newValue || 'standard';
    if (changes.outputFormat) outputFormat = changes.outputFormat.newValue || 'mixed';
    if (changes.learnerMode) learnerMode = changes.learnerMode.newValue || 'standard';
    if (changes.braveApiKey) {
      hasBraveApiKey = !!changes.braveApiKey.newValue;
      updateSearchUIState(hasBraveApiKey);
    }
    updateModelCount();
  });
}

// ============================================
// Context Functions
// ============================================

function toggleContextPanel() {
  contextContent.classList.toggle('hidden');
  contextToggle.classList.toggle('expanded');
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function capturePageContent() {
  try {
    capturePageBtn.disabled = true;
    capturePageBtn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span>';
    
    const tabId = await getActiveTabId();
    if (!tabId) {
      showToast(t('messages.noActiveTab'), true);
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ type: 'GET_PAGE_CONTENT', tabId });
    
    if (response.error) {
      showToast(response.error, true);
      return;
    }
    
    const { title, url, content } = response;
    if (!content || content.length < 10) {
      showToast(t('messages.noContent'), true);
      return;
    }
    
    addContextItem({
      type: 'page',
      title: title || url,
      content: content,
      url: url
    });
    
    showToast(t('messages.pageCaptured'));
  } catch (err) {
    showToast('Failed to capture page: ' + err.message, true);
  } finally {
    capturePageBtn.disabled = false;
    capturePageBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg><span>擷取頁面</span>`;
  }
}

async function captureSelection() {
  try {
    captureSelectionBtn.disabled = true;
    
    const tabId = await getActiveTabId();
    if (!tabId) {
      showToast(t('messages.noActiveTab'), true);
      return;
    }
    
    const response = await chrome.runtime.sendMessage({ type: 'GET_SELECTION', tabId });
    
    if (response.error) {
      showToast(response.error, true);
      return;
    }
    
    const text = response;
    if (!text || text.length < 1) {
      showToast(t('messages.noSelection'), true);
      return;
    }
    
    addContextItem({
      type: 'selection',
      title: '選取的文字',
      content: text
    });
    
    showToast(t('messages.selectionCaptured'));
  } catch (err) {
    showToast('擷取選取內容失敗：' + err.message, true);
  } finally {
    captureSelectionBtn.disabled = false;
  }
}

async function pasteContext() {
  try {
    // Try clipboard API first
    let text = '';
    try {
      text = await navigator.clipboard.readText();
      
      // If clipboard has content, add directly
      if (text && text.length > 0) {
        addContextItem({
          type: 'paste',
          title: '貼上的內容',
          content: text
        });
        showToast(t('messages.pasted'));
        return;
      }
    } catch (clipboardErr) {
      // Clipboard API failed, show modal for manual paste
      console.log('Clipboard API failed, showing paste modal');
    }
    
    // Show paste modal for manual input
    showPasteModal();
  } catch (err) {
    showToast('貼上失敗：' + err.message, true);
  }
}

// Show paste modal
function showPasteModal() {
  if (!pasteModal) return;
  
  // Reset textarea
  if (pasteModalTextarea) {
    pasteModalTextarea.value = '';
    updatePasteCharCount();
  }
  
  pasteModal.classList.remove('hidden');
  
  // Focus textarea
  setTimeout(() => {
    pasteModalTextarea?.focus();
  }, 100);
}

// Hide paste modal
function hidePasteModal() {
  if (!pasteModal) return;
  pasteModal.classList.add('hidden');
  if (pasteModalTextarea) {
    pasteModalTextarea.value = '';
  }
}

// Update character count in paste modal
function updatePasteCharCount() {
  if (!pasteCharCount || !pasteModalTextarea) return;
  const count = pasteModalTextarea.value.length;
  pasteCharCount.textContent = `${count.toLocaleString()} 字元`;
}

// Handle paste modal confirm
function handlePasteConfirm() {
  if (!pasteModalTextarea) return;
  
  const text = pasteModalTextarea.value.trim();
  
  if (!text || text.length < 1) {
    showToast(t('messages.noInput'), true);
    return;
  }
  
  addContextItem({
    type: 'paste',
    title: '貼上的內容',
    content: text
  });
  
  hidePasteModal();
  showToast(t('messages.pasted'));
}

// Setup paste modal listeners
function setupPasteModalListeners() {
  if (closePasteModal) {
    closePasteModal.addEventListener('click', hidePasteModal);
  }
  if (cancelPaste) {
    cancelPaste.addEventListener('click', hidePasteModal);
  }
  if (confirmPaste) {
    confirmPaste.addEventListener('click', handlePasteConfirm);
  }
  if (pasteModalTextarea) {
    pasteModalTextarea.addEventListener('input', updatePasteCharCount);
    // Allow Ctrl+Enter to confirm
    pasteModalTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePasteConfirm();
      }
    });
  }
  // Close modal when clicking outside
  if (pasteModal) {
    pasteModal.addEventListener('click', (e) => {
      if (e.target === pasteModal) {
        hidePasteModal();
      }
    });
  }
}

async function handleWebSearchFromContext() {
  // Check Brave API key
  if (!hasBraveApiKey) {
    showToast(t('messages.braveKeyRequired'), true);
    return;
  }
  
  // Show web search modal instead of prompt
  showWebSearchModal();
}

// Show web search modal
function showWebSearchModal() {
  if (!webSearchModal) return;
  
  // Reset input
  if (webSearchModalInput) {
    webSearchModalInput.value = '';
  }
  
  webSearchModal.classList.remove('hidden');
  
  // Focus input
  setTimeout(() => {
    webSearchModalInput?.focus();
  }, 100);
}

// Hide web search modal
function hideWebSearchModal() {
  if (!webSearchModal) return;
  webSearchModal.classList.add('hidden');
  resetWebSearchModal();
}

// Execute the actual web search
async function executeWebSearchFromModal() {
  if (!webSearchModalInput) return;
  
  const query = webSearchModalInput.value.trim();
  
  if (!query || query.length === 0) {
    showToast(t('messages.noKeyword'), true);
    return;
  }
  
  // Disable input and button during search
  webSearchModalInput.disabled = true;
  confirmWebSearch.disabled = true;
  cancelWebSearch.disabled = true;
  
  // Show status: preparing
  updateWebSearchStatus('loading', '準備搜尋中...', `關鍵字：${query}`);
  
  try {
    // Status: searching
    await sleep(300); // Brief delay for UX
    updateWebSearchStatus('loading', '正在搜尋網路資料...', '連接 Brave Search API');
    
    // Execute Brave Search
    const searchResponse = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: query });
    
    if (searchResponse.error) {
      updateWebSearchStatus('error', '搜尋失敗', searchResponse.error);
      await sleep(1500);
      resetWebSearchModal();
      return;
    }
    
    const { results } = searchResponse;
    
    if (!results || results.length === 0) {
      updateWebSearchStatus('error', '找不到結果', '請嘗試其他關鍵字');
      await sleep(1500);
      resetWebSearchModal();
      return;
    }
    
    // Status: processing results
    updateWebSearchStatus('loading', '處理搜尋結果...', `找到 ${results.length} 筆資料`);
    await sleep(300);
    
    // Format search results as context
    let content = '';
    results.slice(0, 5).forEach((r, i) => {
      content += `[${i + 1}] ${r.title}\n`;
      content += `URL: ${r.url}\n`;
      content += `摘要: ${r.description}\n\n`;
    });
    
    // Add to context
    await addContextItem({
      type: 'search',
      title: `搜尋: ${query}`,
      content: content.trim(),
      results: results
    });
    
    // Status: complete
    updateWebSearchStatus('success', '搜尋完成！', `已加入 ${Math.min(results.length, 5)} 筆結果至參考資料`);
    
    // Auto close after success
    await sleep(1000);
    hideWebSearchModal();
    
  } catch (err) {
    updateWebSearchStatus('error', '搜尋失敗', err.message);
    await sleep(1500);
    resetWebSearchModal();
  }
}

// Update web search status display
function updateWebSearchStatus(state, label, detail) {
  if (!webSearchStatus || !webSearchStatusLabel) return;
  
  // Show status
  webSearchStatus.classList.remove('hidden', 'success', 'error');
  const iconEl = webSearchStatus.querySelector('.search-status-icon');
  
  if (state === 'loading') {
    iconEl?.classList.remove('success', 'error');
  } else if (state === 'success') {
    webSearchStatus.classList.add('success');
    iconEl?.classList.add('success');
  } else if (state === 'error') {
    webSearchStatus.classList.add('error');
    iconEl?.classList.add('error');
  }
  
  webSearchStatusLabel.textContent = label;
  if (webSearchStatusDetail) {
    webSearchStatusDetail.textContent = detail || '';
  }
}

// Reset web search modal to initial state
function resetWebSearchModal() {
  if (webSearchModalInput) {
    webSearchModalInput.disabled = false;
    webSearchModalInput.value = '';
  }
  if (confirmWebSearch) confirmWebSearch.disabled = false;
  if (cancelWebSearch) cancelWebSearch.disabled = false;
  if (webSearchStatus) {
    webSearchStatus.classList.add('hidden');
    webSearchStatus.classList.remove('success', 'error');
    const iconEl = webSearchStatus.querySelector('.search-status-icon');
    iconEl?.classList.remove('success', 'error');
  }
}

// Helper sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Setup web search modal listeners
function setupWebSearchModalListeners() {
  if (closeWebSearchModal) {
    closeWebSearchModal.addEventListener('click', hideWebSearchModal);
  }
  if (cancelWebSearch) {
    cancelWebSearch.addEventListener('click', hideWebSearchModal);
  }
  if (confirmWebSearch) {
    confirmWebSearch.addEventListener('click', executeWebSearchFromModal);
  }
  if (webSearchModalInput) {
    // Enter to search
    webSearchModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeWebSearchFromModal();
      }
      if (e.key === 'Escape') {
        hideWebSearchModal();
      }
    });
  }
  // Close modal when clicking outside
  if (webSearchModal) {
    webSearchModal.addEventListener('click', (e) => {
      if (e.target === webSearchModal) {
        hideWebSearchModal();
      }
    });
  }
}

// ============================================
// Search Strategy Functions
// ============================================

// Execute multiple searches and return results
async function executeMultipleSearches(queries) {
  const results = [];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    
    // 更新搜尋進度
    if (stage25Status) {
      stage25Status.textContent = `搜尋中 (${i + 1}/${queries.length})...`;
    }
    
    // 非首次請求，等待 1.1 秒避免 Brave API rate limit (1 req/sec)
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
    
    try {
      const searchResponse = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: query.trim() });
      
      if (searchResponse.error) {
        console.warn(`Search failed for "${query}":`, searchResponse.error);
        continue;
      }
      
      if (searchResponse.results && searchResponse.results.length > 0) {
        results.push({
          query: query,
          results: searchResponse.results.slice(0, 3).map(r => ({
            title: r.title,
            url: r.url,
            snippet: r.description || r.snippet || ''
          }))
        });
      }
    } catch (err) {
      console.error(`Search error for "${query}":`, err);
    }
  }
  
  return results;
}

function parseSearchQueries(content) {
  try {
    // 更精確的匹配：找到包含 search_queries 但不包含 tasks 的 JSON 區塊
    const blocks = content.match(/```(?:json)?\s*(\{[^`]*?\})\s*```/g) || [];
    for (const block of blocks) {
      if (block.includes('search_queries') && !block.includes('"tasks"')) {
        const jsonStr = block.replace(/```(?:json)?\s*|\s*```/g, '');
        const parsed = JSON.parse(jsonStr);
        return parsed.search_queries || [];
      }
    }
    return [];
  } catch (e) {
    console.error('Failed to parse search queries:', e);
    return [];
  }
}

function extractFinalAnswer(content) {
  // Remove the search_queries JSON block from the content
  return content.replace(/```(?:json)?\s*\{[\s\S]*?"search_queries"[\s\S]*?\}\s*```/g, '').trim();
}

// ============================================
// Stage 2.5: Search Suggestions Flow
// ============================================

// State for Stage 2.5
let stage25SearchQueries = []; // Consolidated search queries
let stage25Resolver = null;   // Promise resolver for user action

// Extract search queries from all model responses
function extractAllSearchSuggestions(responsesMap) {
  const suggestions = [];
  responsesMap.forEach((response, model) => {
    const queries = parseSearchQueries(response.content || '');
    if (queries.length > 0) {
      suggestions.push({
        model: model,
        modelName: getModelName(model),
        queries: queries
      });
    }
  });
  return suggestions;
}

// Render Stage 2.5 search suggestions UI
function renderStage25Suggestions(allSuggestions) {
  if (!searchSuggestionList) return;
  
  // Flatten and deduplicate queries
  const queryMap = new Map();
  allSuggestions.forEach(s => {
    s.queries.forEach(q => {
      if (!queryMap.has(q.toLowerCase())) {
        queryMap.set(q.toLowerCase(), { query: q, sources: [s.modelName] });
      } else {
        queryMap.get(q.toLowerCase()).sources.push(s.modelName);
      }
    });
  });
  
  const uniqueQueries = Array.from(queryMap.values());
  stage25SearchQueries = uniqueQueries.map(q => q.query);
  
  if (uniqueQueries.length === 0) {
    searchSuggestionList.innerHTML = `<div class="no-suggestions">${t('sidepanel.noSuggestions')}</div>`;
    return;
  }
  
  searchSuggestionList.innerHTML = uniqueQueries.map((item, i) => `
    <div class="search-suggestion-item">
      <input type="checkbox" id="searchSug${i}" value="${escapeAttr(item.query)}">
      <label for="searchSug${i}">${escapeHtml(item.query)}</label>
      <span class="search-suggestion-source">${item.sources.slice(0, 2).join(', ')}</span>
    </div>
  `).join('');
}

// Get selected search queries from Stage 2.5 UI
function getSelectedSearchQueries() {
  if (!searchSuggestionList) return [];
  const checkboxes = searchSuggestionList.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// Show Stage 2.5 and wait for user action (已棄用，改用 breakpoint panel)
async function showStage25AndWaitForAction(allSuggestions) {
  // 此函數已棄用，Agent Framework 使用 request_user_input tool 代替
  console.warn('[showStage25AndWaitForAction] Deprecated, use breakpoint panel instead');
  return { action: 'skip', queries: [] };
}

// Handle Stage 3 execute search button
function handleStage25ExecuteSearch() {
  if (!stage25Resolver) return;
  
  const selectedQueries = getSelectedSearchQueries();
  
  // 驗證選擇數量
  if (selectedQueries.length === 0) {
    showToast(t('messages.selectAtLeastOne'));
    return;
  }
  if (selectedQueries.length > 3) {
    showToast(t('messages.maxThreeKeywords'));
    return;
  }
  
  stage25Status.textContent = '搜尋中...';
  stage25Status.className = 'stage-status loading';
  
  stage25Resolver({ action: 'search', queries: selectedQueries });
  stage25Resolver = null;
}

// Handle Stage 2.5 skip button (已棄用)
function handleStage25Skip() {
  if (!stage25Resolver) return;
  stage25Resolver({ action: 'skip', queries: [] });
  stage25Resolver = null;
}

// Setup Stage 2.5 event listeners
function setupStage25Listeners() {
  if (executeSearchBtn) {
    executeSearchBtn.addEventListener('click', handleStage25ExecuteSearch);
  }
  if (skipSearchBtn) {
    skipSearchBtn.addEventListener('click', handleStage25Skip);
  }
  
  // Custom suggestion input listeners
  if (addCustomSuggestionBtn && customSuggestionInput) {
    addCustomSuggestionBtn.addEventListener('click', addCustomSearchSuggestion);
    customSuggestionInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomSearchSuggestion();
      }
    });
  }
}

// Add custom search suggestion to the list
function addCustomSearchSuggestion() {
  if (!customSuggestionInput || !searchSuggestionList) return;
  
  const keyword = customSuggestionInput.value.trim();
  if (!keyword) {
    showToast(t('messages.noKeyword'), true);
    return;
  }
  
  // Check if already exists
  const existingCheckboxes = searchSuggestionList.querySelectorAll('input[type="checkbox"]');
  for (const cb of existingCheckboxes) {
    if (cb.value.toLowerCase() === keyword.toLowerCase()) {
      cb.checked = true;
      showToast(t('messages.keywordExists'));
      customSuggestionInput.value = '';
      return;
    }
  }
  
  // Generate unique ID
  const newId = `searchSugCustom${Date.now()}`;
  
  // Create new suggestion item HTML
  const newItem = document.createElement('div');
  newItem.className = 'search-suggestion-item custom-added';
  newItem.innerHTML = `
    <input type="checkbox" id="${newId}" value="${escapeAttr(keyword)}" checked>
    <label for="${newId}">${escapeHtml(keyword)}</label>
    <span class="search-suggestion-source">自訂</span>
  `;
  
  // Add to list
  searchSuggestionList.appendChild(newItem);
  
  // Clear input
  customSuggestionInput.value = '';
  
  showToast(t('messages.keywordAdded'));
}

function updateSearchIterationCounter() {
  if (searchIterationCounter) {
    searchIterationCounter.textContent = t('sidepanel.searchIterationCount', { current: searchIteration, max: maxSearchIterations });
  }
}

function renderSearchStrategies(queries) {
  currentSearchQueries = queries || [];
  
  // 只有達到搜尋次數上限時才隱藏，否則即使無建議也顯示模組（讓用戶可輸入自定義關鍵字）
  if (searchIteration >= maxSearchIterations) {
    searchStrategySection.classList.add('hidden');
    return;
  }
  
  searchStrategySection.classList.remove('hidden');
  updateSearchIterationCounter();
  
  // 如果有 AI 建議的關鍵字，顯示它們
  if (currentSearchQueries.length > 0) {
    searchStrategies.innerHTML = currentSearchQueries.map((query, i) => `
      <button class="search-query-btn" data-query="${escapeAttr(query)}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span>${escapeHtml(query)}</span>
      </button>
    `).join('');
    
    // Add click handlers - now calls prepareSearchIteration instead of executeSearchAndIterate
    searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
      btn.addEventListener('click', () => prepareSearchIteration(btn.dataset.query));
    });
  } else {
    // 無建議時顯示提示文字
    searchStrategies.innerHTML = `<span class="no-suggestions">${t('sidepanel.noSuggestions')}</span>`;
  }
}

// ============================================
// Search Iteration Preparation Flow
// ============================================

// Step 1: User clicks a keyword -> prepare for next iteration
async function prepareSearchIteration(keyword) {
  if (searchIteration >= maxSearchIterations) {
    showToast(t('messages.maxIterationsReached'), true);
    return;
  }
  
  // Disable all search query buttons to prevent double-click
  searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
    btn.disabled = true;
  });
  customSearchBtn.disabled = true;
  customSearchInput.disabled = true;
  
  // Store the selected keyword
  pendingSearchKeyword = keyword;
  isSearchIterationMode = true;
  originalQueryBeforeIteration = currentQuery;
  
  // === 將本輪討論內容加入參考資料 ===
  const currentResponses = Array.from(responses.entries())
    .filter(([_, r]) => r.status === 'done')
    .map(([model, r]) => ({ model, content: r.content }));
  
  if (currentResponses.length > 0) {
    // 整理多模型回應 + 主席彙整
    let discussionSummary = `## 第 ${searchIteration + 1} 輪討論摘要\n\n`;
    discussionSummary += `### 問題\n${currentQuery}\n\n`;
    discussionSummary += `### 模型回應\n`;
    currentResponses.forEach((r, i) => {
      discussionSummary += `#### ${getModelName(r.model)}\n${r.content}\n\n`;
    });
    
    // 加入主席彙整（如果有）
    if (currentConversation?.finalAnswer) {
      const cleanFinalAnswer = extractFinalAnswer(currentConversation.finalAnswer);
      discussionSummary += `### 主席彙整\n${cleanFinalAnswer}\n`;
    }
    
    await addContextItem({
      type: 'discussion',
      title: `第 ${searchIteration + 1} 輪 Council 討論`,
      content: discussionSummary
    });
  }
  
  // Hide search strategy section
  searchStrategySection.classList.add('hidden');
  
  // Show the search iteration hint
  searchIterationHint.classList.remove('hidden');
  searchIterationKeyword.textContent = keyword;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // === UI Feedback: Show loading state ===
  showToast(t('messages.generatingSuggestions'));
  
  // Disable input and button during generation
  queryInput.disabled = true;
  queryInput.placeholder = '正在生成建議問題...';
  queryInput.classList.add('generating');
  
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>生成中...</span>';
  sendBtn.classList.add('next-iteration');
  
  try {
    const suggestedPrompt = await generateSuggestedPrompt(
      originalQueryBeforeIteration,
      keyword,
      currentResponses.map(r => r.content).join('\n\n')
    );
    
    queryInput.value = suggestedPrompt;
    autoGrowTextarea();
    showToast(t('messages.suggestionsGenerated'));
  } catch (err) {
    console.error('Failed to generate suggested prompt:', err);
    // Fallback: use a simple template
    queryInput.value = `針對「${keyword}」進行延伸討論：${originalQueryBeforeIteration}`;
    autoGrowTextarea();
    showToast(t('messages.suggestionsFailed'), true);
  } finally {
    // Restore input state
    queryInput.disabled = false;
    queryInput.placeholder = '輸入您的問題...';
    queryInput.classList.remove('generating');
    queryInput.focus();
    
    // Update send button to "next iteration" style (enabled)
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span>開始下一輪</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"></path></svg>';
  }
}

// Cancel search iteration mode
function cancelSearchIterationMode() {
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  
  // Hide the hint
  searchIterationHint.classList.add('hidden');
  
  // Restore send button
  sendBtn.disabled = false;
  sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
  sendBtn.classList.remove('next-iteration');
  
  // Restore original query
  queryInput.value = originalQueryBeforeIteration;
  queryInput.disabled = false;
  queryInput.classList.remove('generating');
  autoGrowTextarea();
  
  // Re-enable search buttons
  searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
    btn.disabled = false;
  });
  customSearchBtn.disabled = false;
  customSearchInput.disabled = false;
  
  // Show search strategy section again
  if (enableSearchMode && searchIteration < maxSearchIterations) {
    searchStrategySection.classList.remove('hidden');
  }
  
  showToast(t('messages.searchCancelled'));
}

// Step 2: User confirms prompt -> execute search and council
async function executeSearchIteration() {
  const newQuery = queryInput.value.trim();
  if (!newQuery) {
    showToast(t('messages.noQuestion'), true);
    return;
  }
  
  const keyword = pendingSearchKeyword;
  
  // Reset iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  searchIterationHint.classList.add('hidden');
  
  // Update current query to the new one
  currentQuery = newQuery;
  
  // Reset send button
  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>搜尋中...</span>';
  sendBtn.classList.remove('next-iteration');
  
  try {
    showToast(`正在搜尋「${keyword}」...`);
    
    // Execute Brave Search
    const searchResponse = await chrome.runtime.sendMessage({ type: 'WEB_SEARCH', query: keyword });
    
    if (searchResponse.error) {
      showToast(searchResponse.error, true);
      resetButton();
      return;
    }
    
    const { results, query } = searchResponse;
    
    if (!results || results.length === 0) {
      showToast(t('messages.noResults'), true);
      resetButton();
      return;
    }
    
    // Fetch full page contents for top results
    showToast(t('messages.fetchingResults'));
    const urls = results.slice(0, 5).map(r => r.url);
    
    let pageContents = [];
    try {
      const fetchResponse = await chrome.runtime.sendMessage({ 
        type: 'FETCH_PAGE_CONTENTS', 
        urls: urls 
      });
      
      if (fetchResponse.results) {
        pageContents = fetchResponse.results;
      }
    } catch (fetchErr) {
      console.error('Page content fetch failed:', fetchErr);
      // Continue without page contents - just use snippets
    }
    
    // Format search results with page contents as context
    let content = '';
    const urlsWithStatus = [];
    
    results.slice(0, 5).forEach((r, i) => {
      content += `[${i + 1}] ${r.title}\n`;
      content += `URL: ${r.url}\n`;
      content += `摘要: ${r.description}\n`;
      
      // Add full page content if available
      const pageContent = pageContents.find(p => p.url === r.url);
      const fetchSuccess = pageContent && pageContent.content && !pageContent.error;
      
      urlsWithStatus.push({
        index: i + 1,
        title: r.title,
        url: r.url,
        fetched: fetchSuccess,
        error: pageContent?.error || null
      });
      
      if (fetchSuccess) {
        // Limit page content to avoid context explosion
        const truncatedContent = pageContent.content.slice(0, 3000);
        content += `\n內頁內容:\n${truncatedContent}${pageContent.content.length > 3000 ? '\n...(內容已截斷)' : ''}\n`;
      }
      content += '\n---\n\n';
    });
    
    // Add to context with URL status info
    await addContextItem({
      type: 'search',
      title: `搜尋: ${keyword}`,
      content: content.trim(),
      results: results,
      urlsWithStatus: urlsWithStatus
    });
    
    // Increment search iteration
    searchIteration++;
    updateSearchIterationCounter();
    
    showToast(`已加入搜尋結果，正在執行 Council...`);
    
    // Run Council with the new query
    await runCouncilIteration();
    
  } catch (err) {
    showToast('搜尋失敗：' + err.message, true);
    console.error('Search iteration error:', err);
  } finally {
    resetButton();
  }
}

// AI-based prompt suggestion for search iteration
const PROMPT_SUGGESTION_SYSTEM = `你是一位研究助理，專門幫助用戶深入探索議題。

任務：根據用戶的原始問題、選擇的延伸關鍵字，以及先前的討論內容，生成一個更聚焦、更深入的新問題。

要求：
1. 新問題應該聚焦於用戶選擇的關鍵字方向
2. 應該探索先前討論中未充分涵蓋的面向
3. 保持與原始問題的關聯性
4. 問題應該具體、可回答
5. 使用繁體中文
6. 直接輸出新問題，不要加任何解釋或前綴`;

async function generateSuggestedPrompt(originalQuery, selectedKeyword, discussionContext) {
  const userPrompt = `## 原始問題
${originalQuery}

## 用戶選擇的延伸關鍵字
${selectedKeyword}

## 先前討論摘要
${discussionContext.slice(0, 2000)}${discussionContext.length > 2000 ? '...(已截斷)' : ''}

---
請生成一個針對「${selectedKeyword}」方向的深入問題：`;

  try {
    const result = await queryModelNonStreaming(getAvailableHelperModel(), PROMPT_SUGGESTION_SYSTEM + '\n\n' + userPrompt);
    return result.trim();
  } catch (err) {
    console.error('Prompt suggestion failed:', err);
    throw err;
  }
}

async function runCouncilIteration() {
  // [已棄用] 此函數使用舊的 stage UI，現在應使用 Agent Framework
  // 重導向到 Agent Framework 流程
  if (useAgentFramework && window.MAVAgent && window.MAVTools) {
    console.log('[runCouncilIteration] Redirecting to Agent Framework');
    return await runWithAgentLoop(currentQuery);
  }
  
  // 以下為舊的流程，保留但不再維護
  console.warn('[runCouncilIteration] Using legacy flow, consider migrating to Agent Framework');
  
  // 記錄執行開始時的卡片 ID
  const iterationCardId = sessionState.currentCardId;
  
  // Clear previous responses but keep context
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  
  // 使用新的 timeline 系統
  clearPlannerTimeline();
  showPlannerTimeline();
  
  let savedResponses = [];
  let aggregatedRanking = null;
  let finalAnswerContent = '';
  
  try {
    // === STAGE 1 ===
    currentStage = 'stage1';
    stage1Status.textContent = `迭代 ${searchIteration}: 查詢中...`;
    stage1Status.classList.add('loading');
    
    renderTabs();
    renderResponsePanels();
    if (councilModels.length > 0) setActiveTab(councilModels[0]);
    
    // Build prompt with updated context
    const promptWithContext = buildPromptWithContext(currentQuery);
    await Promise.allSettled(councilModels.map(model => queryModel(model, promptWithContext)));
    
    const successfulResponses = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'done')
      .map(([model, r]) => ({ model, content: r.content, latency: r.latency }));
    
    savedResponses = successfulResponses;
    stage1Status.textContent = `${successfulResponses.length}/${councilModels.length} 完成`;
    stage1Status.classList.remove('loading');
    stage1Status.classList.add('done');
    
    setStepDone(1);
    updateStage1Summary(successfulResponses.map(r => ({ ...r, status: 'done' })));
    
    document.getElementById('stage1Content').classList.remove('expanded');
    stage1Section.classList.add('collapsed');
    
    if (successfulResponses.length < 2) {
      showToast('Council 需要至少 2 個模型成功回應', true);
      return;
    }
    
    // === STAGE 2 ===
    if (enableReview && successfulResponses.length >= 2) {
      currentStage = 'stage2';
      setStepActive(2);
      stage2Status.textContent = '審查中...';
      stage2Status.classList.add('loading');
      document.getElementById('stage2Content').classList.add('expanded');
      
      reviewResults.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">模型正在互相審查...</span></div>`;
      
      await Promise.allSettled(councilModels.map(model => runReview(model, currentQuery, successfulResponses)));
      
      aggregatedRanking = aggregateRankings(successfulResponses);
      renderReviewResults(aggregatedRanking);
      
      stage2Status.textContent = t('sidepanel.stageComplete');
      stage2Status.classList.remove('loading');
      stage2Status.classList.add('done');
      
      setStepDone(2);
      updateStage2Summary(aggregatedRanking);
      
      document.getElementById('stage2Content').classList.remove('expanded');
      stage2Section.classList.add('collapsed');
    } else {
      stage2Section.classList.add('stage-skipped');
      stage2Status.textContent = t('sidepanel.stageSkipped');
      reviewResults.innerHTML = '<div class="skipped-message">互評審查已停用</div>';
      setStepSkipped(2);
    }
    
    // === STAGE 3 ===
    currentStage = 'stage3';
    setStepActive(3);
    
    // 決定實際使用的主席模型
    const actualChairman = resolveChairmanModel(aggregatedRanking, successfulResponses);
    updateStage3Summary(actualChairman);
    
    stage3Status.textContent = '彙整中...';
    stage3Status.classList.add('loading');
    document.getElementById('stage3Content').classList.add('expanded');
    
    finalAnswer.innerHTML = `
      <div class="chairman-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        ${getModelName(actualChairman)}
      </div>
      <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">主席正在彙整...</span></div>
    `;
    
    try {
      // runCouncilIteration doesn't use Stage 2.5 search, so pass null
      finalAnswerContent = await runChairman(currentQuery, successfulResponses, aggregatedRanking, enableSearchMode, iterationCardId, null);
      
      stage3Status.textContent = t('sidepanel.stageComplete');
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('done');
      
      setAllStepsDone();
      
      // Show branch actions after iteration completes
      showBranchActions();
      
      // Show conversation cost summary
      renderConversationCost();
    } catch (err) {
      stage3Status.textContent = '失敗';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('error');
      showToast(`主席彙整失敗: ${err.message}`, true);
      resetButton();
      return;
    }
    
    // Update conversation
    if (currentConversation) {
      currentConversation.responses = savedResponses;
      currentConversation.ranking = aggregatedRanking;
      currentConversation.finalAnswer = finalAnswerContent;
      currentConversation.searchIteration = searchIteration;
      currentConversation.chairmanModel = actualChairman; // 更新實際使用的主席模型
      currentConversation.contextItemsSnapshot = JSON.parse(JSON.stringify(contextItems)); // 更新參考資料快照
      
      // 保存更新後的 conversation 到 storage
      const result = await chrome.storage.local.get('conversations');
      const conversations = result.conversations || [];
      const idx = conversations.findIndex(c => c.id === currentConversation.id);
      if (idx >= 0) {
        conversations[idx] = currentConversation;
        await safeStorageSet({ conversations });
      }
    }
    
  } catch (err) {
    console.error('Council iteration error:', err);
    showToast('執行失敗：' + err.message, true);
  }
}

async function addContextItem(item, scope = 'auto') {
  const id = crypto.randomUUID();
  const currentCard = getCurrentCard();
  
  // Determine effective scope:
  // - 'auto': root card (depth 0) or no card → session; subtask → card
  // - 'session': always session
  // - 'card': always card (if possible)
  let effectiveScope;
  if (scope === 'session') {
    effectiveScope = 'session';
  } else if (scope === 'card' && currentCard) {
    effectiveScope = 'card';
  } else if (scope === 'auto') {
    // At root card (depth 0) or no card → session level
    // At subtask card (depth > 0) → card level
    const isRootOrNoCard = !currentCard || currentCard.depth === 0;
    effectiveScope = isRootOrNoCard ? 'session' : 'card';
  } else {
    // Fallback: no card exists
    effectiveScope = 'session';
  }
  
  const contextItem = {
    id,
    type: item.type,
    title: item.title,
    content: item.content,
    url: item.url,
    timestamp: Date.now(),
    scope: effectiveScope,
    // Store URL status for search results
    urlsWithStatus: item.urlsWithStatus || null
  };
  
  if (effectiveScope === 'session') {
    sessionContextItems.push(contextItem);
  } else {
    // Add to current card's context items
    currentCard.cardContextItems.push(contextItem);
  }
  
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Auto-expand if collapsed
  if (contextContent.classList.contains('hidden')) {
    contextContent.classList.remove('hidden');
    contextToggle.classList.add('expanded');
  }
}

// Get combined visible context items (session + current card)
function getVisibleContextItems() {
  const currentCard = getCurrentCard();
  const cardItems = currentCard?.cardContextItems || [];
  // Session items first, then card items
  return [...sessionContextItems, ...cardItems];
}

// Update the contextItems array from visible items
function updateVisibleContextItems() {
  contextItems = getVisibleContextItems();
}

// Promote a card-level context item to session level
async function promoteToSession(id) {
  const currentCard = getCurrentCard();
  if (!currentCard) return;
  
  const itemIndex = currentCard.cardContextItems.findIndex(item => item.id === id);
  if (itemIndex === -1) return;
  
  // Remove from card and add to session
  const [item] = currentCard.cardContextItems.splice(itemIndex, 1);
  item.scope = 'session';
  sessionContextItems.push(item);
  
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  showToast('已升級為 Session 級參考資料');
}

async function removeContextItem(id) {
  // Try to remove from session items first
  const sessionIndex = sessionContextItems.findIndex(item => item.id === id);
  if (sessionIndex !== -1) {
    sessionContextItems.splice(sessionIndex, 1);
  } else {
    // Try to remove from current card's items
    const currentCard = getCurrentCard();
    if (currentCard) {
      const cardIndex = currentCard.cardContextItems.findIndex(item => item.id === id);
      if (cardIndex !== -1) {
        currentCard.cardContextItems.splice(cardIndex, 1);
      }
    }
  }
  
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
}

async function clearContext() {
  const currentCard = getCurrentCard();
  const isRootCard = currentCard && currentCard.depth === 0;
  
  if (isRootCard || !currentCard) {
    // At root level or no card: can clear all, but ask for confirmation
    const sessionCount = sessionContextItems.length;
    const cardCount = currentCard?.cardContextItems?.length || 0;
    const totalCount = sessionCount + cardCount;
    
    if (totalCount === 0) {
      showToast('沒有參考資料可清除');
      return;
    }
    
    if (sessionCount > 0) {
      const confirmed = confirm(`將清除所有參考資料（${sessionCount} 個 Session 級 + ${cardCount} 個 Card 級），確定？`);
      if (!confirmed) return;
    }
    
    sessionContextItems = [];
    if (currentCard) {
      currentCard.cardContextItems = [];
    }
    showToast('已清除所有參考資料');
  } else {
    // At subtask level: only clear card-level items
    const cardCount = currentCard.cardContextItems?.length || 0;
    
    if (cardCount === 0) {
      showToast('此卡片沒有 Card 級資料可清除（Session 級資料需在根卡片清除）');
      return;
    }
    
    currentCard.cardContextItems = [];
    showToast(`已清除 ${cardCount} 個 Card 級參考資料`);
  }
  
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
}

// Save context items - now session-based only
async function saveContextItems() {
  // Context items are saved within session data, not global storage
  // Save session if it exists
  if (sessionState.id) {
    await saveSession();
  }
  
  // Notify background to update badge with current count
  notifyBadgeUpdate();
}

// Notify background script to update extension badge
function notifyBadgeUpdate() {
  const count = contextItems.length;
  chrome.runtime.sendMessage({ 
    type: 'UPDATE_CONTEXT_BADGE_COUNT', 
    count: count 
  }).catch(() => {
    // Ignore errors if background script not ready
  });
}

const contextCharCount = document.getElementById('contextCharCount');

function updateContextBadge() {
  if (contextItems.length > 0) {
    contextBadge.textContent = contextItems.length;
    contextBadge.classList.remove('hidden');
    
    // Calculate total characters
    const totalChars = contextItems.reduce((sum, item) => sum + item.content.length, 0);
    if (contextCharCount) {
      contextCharCount.textContent = formatCharCount(totalChars);
      contextCharCount.classList.remove('hidden');
    }
  } else {
    contextBadge.classList.add('hidden');
    if (contextCharCount) {
      contextCharCount.classList.add('hidden');
    }
  }
  
  // Also update extension badge
  notifyBadgeUpdate();
}

function renderContextItems() {
  if (contextItems.length === 0) {
    contextItemsEl.innerHTML = '';
    return;
  }
  
  contextItemsEl.innerHTML = contextItems.map(item => {
    const preview = item.content.slice(0, 150).replace(/\n/g, ' ');
    const charCount = item.content.length;
    const iconClass = item.type === 'page' ? 'page' : item.type === 'selection' ? 'selection' : item.type === 'search' ? 'search' : item.type === 'discussion' ? 'discussion' : 'paste';
    const iconSvg = item.type === 'page' 
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>'
      : item.type === 'selection'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>'
      : item.type === 'search'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>'
      : item.type === 'discussion'
      ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>'
      : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    
    // Scope indicator
    const isSessionScope = item.scope === 'session';
    const scopeClass = isSessionScope ? 'scope-session' : 'scope-card';
    const scopeIcon = isSessionScope 
      ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2C9.243 2 7 4.243 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3v3H9V7c0-1.654 1.346-3 3-3z"/></svg>' // lock icon for session
      : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>'; // card icon
    const scopeTitle = isSessionScope ? 'Session 級（所有卡片共用）' : 'Card 級（僅此卡片）';
    
    // Promote button (only for card-level items) - pushpin icon
    const promoteBtn = !isSessionScope 
      ? `<button class="context-item-promote" data-id="${item.id}" title="釘選為 Session 級（所有卡片共用）">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 17v5"></path>
            <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4.76z"></path>
          </svg>
        </button>`
      : '';
    
    // Build URL list for search items
    let urlListHtml = '';
    if (item.type === 'search' && item.urlsWithStatus && item.urlsWithStatus.length > 0) {
      urlListHtml = `
        <div class="context-item-urls">
          ${item.urlsWithStatus.map(u => `
            <div class="context-url-item ${u.fetched ? 'fetched' : 'failed'}">
              <span class="context-url-index">[${u.index}]</span>
              <span class="context-url-status" title="${u.fetched ? '內容已擷取' : (u.error || '擷取失敗')}">
                ${u.fetched 
                  ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' 
                  : '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'}
              </span>
              <a href="${escapeAttr(u.url)}" target="_blank" class="context-url-link" title="${escapeAttr(u.title)}">${escapeHtml(truncateUrl(u.url))}</a>
            </div>
          `).join('')}
        </div>
      `;
    }
    
    return `
      <div class="context-item ${item.type === 'search' ? 'context-item-search' : ''} ${scopeClass}" data-id="${item.id}">
        <div class="context-item-scope" title="${scopeTitle}">${scopeIcon}</div>
        <div class="context-item-icon ${iconClass}">${iconSvg}</div>
        <div class="context-item-body">
          <div class="context-item-title">${escapeHtml(item.title)}</div>
          ${urlListHtml}
          <div class="context-item-preview">${escapeHtml(preview)}${charCount > 150 ? '...' : ''}</div>
          <div class="context-item-meta">${formatCharCount(charCount)}</div>
        </div>
        <div class="context-item-actions">
          ${promoteBtn}
          <button class="context-item-remove" data-id="${item.id}" title="移除此參考資料">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Add remove handlers
  contextItemsEl.querySelectorAll('.context-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeContextItem(btn.dataset.id);
    });
  });
  
  // Add promote handlers
  contextItemsEl.querySelectorAll('.context-item-promote').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      promoteToSession(btn.dataset.id);
    });
  });
}

function truncateUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname.length > 20 ? urlObj.pathname.slice(0, 20) + '...' : urlObj.pathname;
    return domain + path;
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '...' : url;
  }
}

function formatCharCount(count) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k 字元`;
  }
  return `${count} 字元`;
}

/**
 * Split a long search query into shorter keyword-based queries
 * @param {string} query - Long query to split
 * @returns {string[]} - Array of shorter queries (max 30 chars each)
 */
function splitSearchQuery(query) {
  if (!query || query.length <= 30) return [query];
  
  // Common stop words to filter out
  const stopWords = new Set([
    '的', '是', '在', '和', '與', '以及', '或者', '等', '等等',
    '這個', '那個', '一個', '什麼', '如何', '怎麼', '為什麼',
    '可以', '能夠', '應該', '需要', '想要', '哪些', '有哪些',
    '分析', '研究', '比較', '評估', '請', '幫', '給我',
    'the', 'a', 'an', 'is', 'are', 'and', 'or', 'of', 'in', 'on',
    'what', 'how', 'why', 'which', 'please', 'help', 'me'
  ]);
  
  // Extract meaningful keywords
  // Split by common delimiters and filter
  const words = query
    .replace(/[，。？！、；：""''（）【】《》\[\]\(\)\{\}]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w.toLowerCase()));
  
  if (words.length <= 4) {
    // If few keywords, join them
    return [words.join(' ')];
  }
  
  // Group into chunks of 2-4 keywords
  const queries = [];
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(' ');
    if (chunk.length > 0) {
      queries.push(chunk);
    }
  }
  
  // Return max 3 queries
  return queries.slice(0, 3);
}

/**
 * Execute a single web search via background script
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Search results
 */
function executeWebSearch(query, options = {}) {
  const { count = 10, freshness = 'pm' } = options;
  
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'WEB_SEARCH', query, options: { count, freshness } },
      (response) => {
        if (response?.error) {
          reject(new Error(response.error));
        } else {
          resolve(response?.results || []);
        }
      }
    );
  });
}

/**
 * Format search results for injection into prompt
 * Used by Agent Framework's query_council tool
 */
function formatSearchResultsForPrompt(results) {
  if (!results || results.length === 0) return '';
  
  const formattedResults = results.slice(0, 5).map((r, i) => {
    const title = r.title || '無標題';
    const url = r.url || '';
    const description = r.description || r.snippet || '無摘要';
    return `[${i + 1}] ${title}\nURL: ${url}\n摘要: ${description}`;
  }).join('\n\n');
  
  return `## 網路搜尋結果\n\n以下是相關搜尋結果，請參考這些資訊回答問題：\n\n${formattedResults}\n\n---\n\n`;
}

function buildPromptWithContext(query) {
  // Get output style instructions
  const styleInstructions = getOutputStyleInstructions();
  
  // 取得當前卡片的繼承脈絡
  const currentCard = getCurrentCard();
  const inheritedContext = currentCard?.inheritedContext || '';
  
  // 構建脈絡前綴
  let contextPrefix = '';
  if (inheritedContext) {
    contextPrefix = `[上層脈絡]\n${inheritedContext}\n\n---\n\n`;
  }
  
  if (contextItems.length === 0) {
    if (inheritedContext) {
      return `${contextPrefix}問題：${query}${styleInstructions}`;
    }
    return query + styleInstructions;
  }
  
  const contextText = contextItems.map((item, i) => {
    const sourceNum = i + 1;
    const header = item.url 
      ? `[${sourceNum}] ${item.title}\n來源: ${item.url}\n`
      : `[${sourceNum}] ${item.title}\n`;
    return header + item.content;
  }).join('\n\n---\n\n');
  
  const citationInstruction = contextItems.length > 0 
    ? `\n\n**重要**: 回答時請使用 [1]、[2] 等編號標註引用來源。`
    : '';
  
  return `${contextPrefix}以下是參考資料：

${contextText}

---

問題：${query}${citationInstruction}${styleInstructions}`;
}

function toggleCanvasDropdown(e) {
  e.stopPropagation();
  canvasDropdown.classList.toggle('hidden');
}

/**
 * Handle quick submit from suggested actions panel
 */
function handleQuickSubmit() {
  if (!suggestedQuickInput) return;
  
  const query = suggestedQuickInput.value.trim();
  if (!query) {
    showToast('請輸入問題', true);
    return;
  }
  
  // Set the query input and trigger send
  queryInput.value = query;
  suggestedQuickInput.value = '';
  hideSuggestedActions();
  
  // Trigger send
  handleSend();
}

// Branch action handlers
function handleBranchSearch() {
  // Check Brave API key
  if (!hasBraveApiKey) {
    showToast(t('messages.braveKeyRequired'), true);
    return;
  }
  
  // Enable search mode and show search strategy section
  enableSearchMode = true;
  searchModeToggle.checked = true;
  
  // Show search strategy section if we have context
  if (searchIteration < maxSearchIterations) {
    searchStrategySection.classList.remove('hidden');
    
    // If we have AI suggested queries, show them; otherwise prompt custom input
    if (currentSearchQueries.length > 0) {
      searchStrategies.innerHTML = currentSearchQueries.map((query, i) => `
        <button class="search-query-btn" data-query="${escapeAttr(query)}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>${escapeHtml(query)}</span>
        </button>
      `).join('');
      
      searchStrategies.querySelectorAll('.search-query-btn').forEach(btn => {
        btn.addEventListener('click', () => prepareSearchIteration(btn.dataset.query));
      });
    } else {
      searchStrategies.innerHTML = '<span class="no-suggestions">請輸入自訂關鍵字進行延伸搜尋</span>';
    }
    
    updateSearchIterationCounter();
    showToast('請選擇或輸入延伸搜尋關鍵字');
    
    // Scroll to search section
    searchStrategySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else {
    showToast('已達搜尋迭代上限', true);
  }
}

function handleBranchVision() {
  // Try to get images from multiImageState (current session) first
  if (multiImageState && multiImageState.generatedImages && multiImageState.generatedImages.length > 0) {
    const firstImage = multiImageState.generatedImages[0];
    const imageDataUrl = firstImage.image;
    const title = firstImage.title || '生成的圖片';
    
    if (imageDataUrl) {
      startVisionFromGeneratedImage(imageDataUrl, title);
      return;
    }
  }
  
  // Fallback: try to find image from the UI (image-gallery)
  const galleryImage = document.querySelector('.image-gallery .generated-image img');
  if (galleryImage && galleryImage.src) {
    startVisionFromGeneratedImage(galleryImage.src, '生成的圖片');
    return;
  }
  
  showToast('尚無生成的圖片可供分析', true);
}

async function handleBranchImage() {
  if (!currentConversation || !currentConversation.finalAnswer) {
    showToast('尚無內容可供製圖', true);
    return;
  }
  
  branchImageBtn.disabled = true;
  branchImageBtn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span><span>準備中...</span>';
  
  // Hide branch actions section during loading to avoid confusion
  branchActionsSection?.classList.add('hidden');
  
  const resetButton = () => {
    branchImageBtn.disabled = false;
    branchImageBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <span>生成圖片</span>
    `;
  };
  
  const restoreBranchActions = () => {
    branchActionsSection?.classList.remove('hidden');
  };
  
  try {
    const finalAnswerContent = currentConversation.finalAnswer;
    const query = currentConversation.query;
    const savedResponses = currentConversation.responses || [];
    
    // Show loading while AI generates prompts
    const promptLoadingEl = document.createElement('div');
    promptLoadingEl.className = 'image-prompt-loading';
    promptLoadingEl.innerHTML = `
      <div class="loading-header">
        <div class="loading-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
        <div class="loading-info">
          <div class="loading-title">AI 正在分析內容，規劃圖像構圖</div>
          <div class="loading-subtitle">分析文字內容並設計視覺呈現方式</div>
        </div>
      </div>
      <div class="skeleton-preview"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
      <div class="loading-hint">
        <span class="spinner-small"></span>
        <span>約需 10-30 秒</span>
      </div>
    `;
    getImageContainer()?.appendChild(promptLoadingEl);
    
    // Phase 1: Generate prompts with AI
    const aiResult = await generateImagePromptWithAI(query, finalAnswerContent, savedResponses);
    promptLoadingEl.remove();
    
    if (!aiResult.success) {
      showToast('AI Prompt 生成失敗，使用預設模式', true);
    } else if (aiResult.imageCount > 1) {
      showToast(`AI 識別到 ${aiResult.imageCount} 張圖片規劃`);
    }
    
    resetButton();
    restoreBranchActions();
    
    // Phase 2: Show style selection UI
    const startStyleSelection = (result) => {
      showStyleSelectionUI(
        result,
        async (selectedStyle, editedGlobalContext, paradigmSelections) => {
          // Update result with edited global context and paradigm selections
          const updatedResult = {
            ...result,
            globalContext: editedGlobalContext,
            paradigmSelections: paradigmSelections || {}
          };
          
          // Show loading for style integration
          const integratingEl = document.createElement('div');
          integratingEl.className = 'image-prompt-loading';
          integratingEl.innerHTML = `
            <div class="loading-header">
              <div class="loading-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
              </div>
              <div class="loading-info">
                <div class="loading-title">正在將風格融入圖像</div>
                <div class="loading-subtitle">結合選定風格，優化 prompt 細節</div>
              </div>
            </div>
            <div class="skeleton-preview"></div>
            <div class="skeleton-lines">
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
            </div>
            <div class="loading-hint">
              <span class="spinner-small"></span>
              <span>約需 5-15 秒</span>
            </div>
          `;
          getImageContainer()?.appendChild(integratingEl);
          
          // Phase 3: Integrate style into prompts
          const integratedResult = await integrateStyleIntoPrompts(updatedResult, selectedStyle, editedGlobalContext);
          integratingEl.remove();
          
          // Phase 4: Show preview textarea
          showPromptPreview(
            integratedResult,
            (finalResult) => {
              // Phase 5: Proceed to multi-image editor
              showMultiImageEditor(
                finalResult,
                async (generatedImages) => {
                  // Update saved conversation with image metadata
                  if (currentConversation && generatedImages.length > 0) {
                    currentConversation.imagePrompts = generatedImages.map(g => ({
                      title: g.title,
                      prompt: g.prompt
                    }));
                    
                    const storageResult = await chrome.storage.local.get('conversations');
                    const conversations = storageResult.conversations || [];
                    const idx = conversations.findIndex(c => c.id === currentConversation.id);
                    if (idx >= 0) {
                      conversations[idx] = currentConversation;
                      await safeStorageSet({ conversations });
                    }
                  }
                  
                  // 更新卡片的圖片資料並保存 session
                  const currentCard = getCurrentCard();
                  if (currentCard && generatedImages.length > 0) {
                    currentCard.generatedImages = generatedImages.map(g => ({
                      title: g.title,
                      prompt: g.prompt,
                      timestamp: Date.now()
                    }));
                    console.log('[ImageGen] Updated card with', generatedImages.length, 'images');
                    saveSession();
                  }
                  
                  // Show Vision button now that images are generated
                  if (branchVisionBtn && generatedImages.length > 0) {
                    branchVisionBtn.classList.remove('hidden');
                  }
                },
                () => {
                  showToast('已關閉圖像編輯器');
                },
                () => {
                  // Back to style selection from multi-image editor
                  startStyleSelection(result);
                }
              );
            },
            () => {
              // Back to style selection from preview
              startStyleSelection(result);
            },
            () => {
              showToast('已取消圖像生成');
            }
          );
        },
        () => {
          showToast('已取消圖像生成');
        }
      );
    };
    
    startStyleSelection(aiResult);
    
  } catch (err) {
    console.error('Branch image error:', err);
    showToast('製圖失敗：' + err.message, true);
    resetButton();
    restoreBranchActions();
  }
}

function showBranchActions() {
  branchActionsSection.classList.remove('hidden');
  
  // Show Vision button only if there are generated images
  if (branchVisionBtn) {
    // Check multiImageState (current session) or gallery images in UI
    const hasMultiStateImages = multiImageState?.generatedImages?.length > 0;
    const hasGalleryImages = !!document.querySelector('.image-gallery .generated-image img');
    
    if (hasMultiStateImages || hasGalleryImages) {
      branchVisionBtn.classList.remove('hidden');
    } else {
      branchVisionBtn.classList.add('hidden');
    }
  }
}

function hideBranchActions() {
  branchActionsSection.classList.add('hidden');
  if (branchVisionBtn) {
    branchVisionBtn.classList.add('hidden');
  }
}

function openCanvas(asWindow = false) {
  chrome.runtime.sendMessage({
    type: 'OPEN_CANVAS',
    payload: currentConversation ? {
      content: currentConversation.finalAnswer,
      title: 'Council 回應',
      query: currentConversation.query,
      openAsWindow: asWindow
    } : { openAsWindow: asWindow }
  });
}

// ============================================
// ============================================
// Vision Council Functions
// ============================================

function handleVisionImageUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('請上傳有效的圖片檔案', true);
    return;
  }

  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    showToast('圖片大小超過 20MB 限制', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    
    // Get image dimensions
    const img = new Image();
    img.onload = () => {
      uploadedImage = {
        dataUrl,
        file,
        width: img.width,
        height: img.height,
        name: file.name,
        size: file.size
      };

      // Show preview
      visionPreviewImg.src = dataUrl;
      visionImageName.textContent = file.name;
      visionImageSize.textContent = `${img.width}×${img.height} · ${formatFileSize(file.size)}`;
      
      visionUploadArea.classList.add('hidden');
      visionPreviewArea.classList.remove('hidden');

      // Update cost estimation
      updateVisionCostEstimate();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

function clearUploadedImage() {
  uploadedImage = null;
  visionFileInput.value = '';
  visionPreviewImg.src = '';
  visionImageName.textContent = '';
  visionImageSize.textContent = '';
  
  visionPreviewArea.classList.add('hidden');
  visionUploadArea.classList.remove('hidden');
  
  // Reset image tokens in cost tracker
  sessionCost.imageTokens = 0;
  updateCostTrackerDisplay();
}

// Start Vision Council analysis from a generated/existing image
function startVisionFromGeneratedImage(imageDataUrl, imageName = '生成的圖片') {
  if (!imageDataUrl) {
    showToast('無法取得圖片資料', true);
    return;
  }
  
  // Create an image to get dimensions
  const img = new Image();
  img.onload = () => {
    // Set up the uploaded image state
    uploadedImage = {
      dataUrl: imageDataUrl,
      file: null,
      width: img.width,
      height: img.height,
      name: imageName,
      size: 0 // Size unknown for data URLs
    };
    
    // Enable vision mode
    visionMode = true;
    if (visionToggle) {
      visionToggle.checked = true;
    }
    
    // Disable image generation mode if enabled
    if (imageToggle && imageToggle.checked) {
      imageToggle.checked = false;
      enableImage = false;
    }
    
    // Show vision upload section with preview
    if (visionUploadSection) {
      visionUploadSection.classList.remove('hidden');
    }
    if (costTracker) {
      costTracker.classList.remove('hidden');
    }
    
    // Show preview
    if (visionPreviewImg) {
      visionPreviewImg.src = imageDataUrl;
    }
    if (visionImageName) {
      visionImageName.textContent = imageName;
    }
    if (visionImageSize) {
      visionImageSize.textContent = `${img.width}×${img.height}`;
    }
    
    if (visionUploadArea) {
      visionUploadArea.classList.add('hidden');
    }
    if (visionPreviewArea) {
      visionPreviewArea.classList.remove('hidden');
    }
    
    // Update cost estimation
    updateVisionCostEstimate();
    
    // Set a default prompt for analysis
    queryInput.value = '請分析這張圖片的內容、構圖和視覺元素。';
    autoGrowTextarea();
    
    // Focus on query input
    queryInput.focus();
    queryInput.select();
    
    showToast('已載入圖片，請輸入分析問題後送出');
  };
  
  img.onerror = () => {
    showToast('圖片載入失敗', true);
  };
  
  img.src = imageDataUrl;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Estimate image tokens based on OpenAI's approach
// Low detail: ~85 tokens
// High detail: ~170 base + 85 per 512x512 tile
function estimateImageTokens(width, height, detail = 'high') {
  if (detail === 'low') {
    return 85;
  }
  
  // High detail calculation
  // First, scale to fit within 2048x2048
  let scaledWidth = width;
  let scaledHeight = height;
  const maxDim = 2048;
  
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    scaledWidth = Math.floor(width * scale);
    scaledHeight = Math.floor(height * scale);
  }
  
  // Then scale shortest side to 768
  const minDim = 768;
  const shortestSide = Math.min(scaledWidth, scaledHeight);
  if (shortestSide > minDim) {
    const scale = minDim / shortestSide;
    scaledWidth = Math.floor(scaledWidth * scale);
    scaledHeight = Math.floor(scaledHeight * scale);
  }
  
  // Calculate number of 512x512 tiles
  const tilesX = Math.ceil(scaledWidth / 512);
  const tilesY = Math.ceil(scaledHeight / 512);
  const totalTiles = tilesX * tilesY;
  
  // Base tokens + tokens per tile
  return 170 + (85 * totalTiles);
}

function updateVisionCostEstimate() {
  if (!uploadedImage) return;
  
  const imageTokens = estimateImageTokens(uploadedImage.width, uploadedImage.height);
  sessionCost.imageTokens = imageTokens;
  updateCostTrackerDisplay();
}

function updateCostTrackerDisplay() {
  // Calculate totals from all stages
  const totalInput = sessionCost.stage1.input + sessionCost.stage2.input + sessionCost.stage3.input + sessionCost.imageGen.input;
  const totalOutput = sessionCost.stage1.output + sessionCost.stage2.output + sessionCost.stage3.output + sessionCost.imageGen.output;
  
  if (sessionCostTotal) sessionCostTotal.textContent = formatCost(sessionCost.total);
  if (sessionCostInput) sessionCostInput.textContent = formatCost(totalInput);
  if (sessionCostOutput) sessionCostOutput.textContent = formatCost(totalOutput);
  if (sessionImageTokens) sessionImageTokens.textContent = sessionCost.imageTokens.toLocaleString();
}

function addToSessionCost(modelId, inputTokens, outputTokens, stage = null) {
  const cost = calculateCost(modelId, inputTokens, outputTokens);
  const targetStage = stage || currentStage || 'stage1';
  
  if (sessionCost[targetStage]) {
    sessionCost[targetStage].input += cost.input;
    sessionCost[targetStage].output += cost.output;
    sessionCost[targetStage].total += cost.total;
    sessionCost[targetStage].calls++;
  }
  
  sessionCost.total += cost.total;
  updateCostTrackerDisplay();
}

function resetSessionCost() {
  sessionCost = {
    stage1: { input: 0, output: 0, total: 0, calls: 0 },
    stage2: { input: 0, output: 0, total: 0, calls: 0 },
    stage3: { input: 0, output: 0, total: 0, calls: 0 },
    imageGen: { input: 0, output: 0, total: 0, calls: 0 },
    imageTokens: 0,
    total: 0
  };
  currentStage = null;
  updateCostTrackerDisplay();
  hideConversationCost();
}

function renderConversationCost() {
  if (!conversationCost) return;
  
  // Only show if there's actual cost data
  if (sessionCost.total === 0) {
    hideConversationCost();
    return;
  }
  
  // Update total
  if (conversationCostTotal) {
    conversationCostTotal.textContent = formatCost(sessionCost.total);
  }
  
  // Update stage costs
  if (costStage1) {
    costStage1.textContent = formatCost(sessionCost.stage1.total);
  }
  if (costStage2) {
    costStage2.textContent = formatCost(sessionCost.stage2.total);
  }
  if (costStage3) {
    costStage3.textContent = formatCost(sessionCost.stage3.total);
  }
  
  // Show image generation cost row if applicable
  if (costImageRow && costImageGen) {
    if (sessionCost.imageGen.total > 0) {
      costImageRow.classList.remove('hidden');
      costImageGen.textContent = formatCost(sessionCost.imageGen.total);
    } else {
      costImageRow.classList.add('hidden');
    }
  }
  
  // Show the cost summary section
  conversationCost.classList.remove('hidden');
}

function hideConversationCost() {
  if (conversationCost) {
    conversationCost.classList.add('hidden');
  }
}

// Check if a model supports vision
function isVisionModel(modelId) {
  const info = MODELS[modelId];
  return info?.canVision === true;
}

// Build vision message with image
function buildVisionMessage(query, imageDataUrl) {
  return {
    role: 'user',
    content: [
      { type: 'text', text: query },
      { 
        type: 'image_url', 
        image_url: { 
          url: imageDataUrl,
          detail: 'high'
        } 
      }
    ]
  };
}

// Generate Vision Review Prompt (evaluating image analyses)
function generateVisionReviewPrompt(query, responses, currentModel, includeImage = false) {
  const otherResponses = responses.filter(r => r.model !== currentModel).map((r, i) => ({ 
    label: `分析 ${String.fromCharCode(65 + i)}`, 
    content: r.content 
  }));
  if (otherResponses.length === 0) return null;
  
  const responsesText = otherResponses.map(r => `### ${r.label}\n${r.content}`).join('\n\n---\n\n');
  
  const prompt = `你是一位公正的圖像分析評審。請評估以下各個 AI 對圖片的分析結果。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 原始問題
${query}

## 各方分析
${responsesText}

## 評審任務
根據以下標準評估各分析：
1. **準確性**：對圖像內容的描述是否準確
2. **完整性**：是否涵蓋了圖像的重要細節
3. **洞察力**：是否提供了有價值的解讀或見解
4. **相關性**：分析是否回應了用戶的問題

請以 JSON 格式輸出排名：
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "簡短理由"},
    {"response": "B", "rank": 2, "reason": "簡短理由"}
  ]
}
\`\`\``;

  return prompt;
}

// Generate Vision Chairman Prompt
function generateVisionChairmanPrompt(query, responses, aggregatedRanking = null) {
  const responsesText = responses.map((r, i) => 
    `### 分析專家 ${i + 1} (${getModelName(r.model)})\n${r.content}`
  ).join('\n\n---\n\n');
  
  let rankingInfo = '';
  if (aggregatedRanking && aggregatedRanking.length > 0) {
    rankingInfo = `## 互評排名\n根據各專家互評結果：${aggregatedRanking.map((r, i) => `${i + 1}. ${getModelName(r.model)}`).join('、')}`;
  }
  
  const prompt = `你是 AI Council 的主席。請綜合各位專家對圖像的分析，提供一個完整且權威的最終分析報告。

**IMPORTANT: You MUST respond in Traditional Chinese (繁體中文) using Taiwan-standard expressions. Simplified Chinese is strictly prohibited. English and Japanese terms may be kept as-is.**

## 原始問題
${query}

## 專家分析
${responsesText}

${rankingInfo}

## 主席任務
請創建一個綜合性的最終分析報告：
1. 整合各專家的最佳觀察和見解
2. 如有矛盾之處，以準確的資訊為準
3. 組織良好、結構清晰
4. 直接提供分析結果，不要有元評論

請以繁體中文直接回答。`;

  // Append output style instructions
  return prompt + getOutputStyleInstructions();
}

// ============================================
// Image Functions
// ============================================
function isImageModel(model) {
  return IMAGE_MODELS.some(m => model.includes(m.split('/')[1]));
}

function renderImages(images, container) {
  if (!images || images.length === 0) return;
  
  const gallery = document.createElement('div');
  gallery.className = 'image-gallery';
  
  images.forEach((imgSrc, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'generated-image';
    
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = `Generated image ${idx + 1}`;
    img.addEventListener('click', () => openLightbox(imgSrc));
    
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    
    // Analyze button (Vision Council)
    const analyzeBtn = document.createElement('button');
    analyzeBtn.className = 'analyze-image-btn';
    analyzeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>分析`;
    analyzeBtn.addEventListener('click', (e) => { 
      e.stopPropagation(); 
      startVisionFromGeneratedImage(imgSrc, `生成圖片 ${idx + 1}`); 
    });
    
    const downloadBtn = document.createElement('button');
    downloadBtn.textContent = 'Download';
    downloadBtn.addEventListener('click', (e) => { e.stopPropagation(); downloadImage(imgSrc, idx); });
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', (e) => { e.stopPropagation(); copyImageToClipboard(imgSrc); });
    
    actions.appendChild(analyzeBtn);
    actions.appendChild(downloadBtn);
    actions.appendChild(copyBtn);
    wrapper.appendChild(img);
    wrapper.appendChild(actions);
    gallery.appendChild(wrapper);
  });
  
  container.appendChild(gallery);
}

function openLightbox(src) {
  lightboxImg.src = src;
  lightbox.classList.remove('hidden');
}

async function downloadImage(src, idx) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mav-image-${Date.now()}-${idx}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已下載圖片');
  } catch (e) {
    // For data URLs, direct download
    const a = document.createElement('a');
    a.href = src;
    a.download = `mav-image-${Date.now()}-${idx}.png`;
    a.click();
    showToast('已下載圖片');
  }
}

async function copyImageToClipboard(src) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    showToast('已複製圖片');
  } catch (e) {
    showToast('複製圖片失敗', true);
  }
}

// ============================================
// History Functions
// ============================================

// New Conversation Modal elements
const newConvModal = document.getElementById('newConvModal');
const closeNewConvModal = document.getElementById('closeNewConvModal');
const cancelNewConv = document.getElementById('cancelNewConv');
const confirmNewConv = document.getElementById('confirmNewConv');

// Show new conversation modal
function showNewConvModal() {
  // 如果沒有正在進行的 session，直接開始新對話
  if (!enableTaskPlanner || !sessionState.id || sessionState.cards.size === 0) {
    executeNewChat('newSession');
    return;
  }
  
  newConvModal.classList.remove('hidden');
}

// Hide new conversation modal
function hideNewConvModal() {
  newConvModal.classList.add('hidden');
}

// Start New Chat - Show modal or execute directly
function startNewChat() {
  showNewConvModal();
}

// Execute new chat based on user choice
async function executeNewChat(type) {
  hideNewConvModal();
  
  if (type === 'newSession') {
    await executeNewSession();
  } else if (type === 'newRoot') {
    executeNewRootCard();
  }
}

// Create entirely new session
async function executeNewSession() {
  // Reset conversation state
  currentConversation = null;
  currentQuery = '';
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  activeTab = null;
  
  // Reset search mode state
  searchIteration = 0;
  currentSearchQueries = [];
  searchStrategySection.classList.add('hidden');
  
  // Reset search iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  originalQueryBeforeIteration = '';
  searchIterationHint.classList.add('hidden');
  sendBtn.classList.remove('next-iteration');
  
  // Clear context items (both session and card level)
  sessionContextItems = [];
  contextItems = [];
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Reset session cost
  resetSessionCost();
  
  // Reset vision state completely
  clearUploadedImage();
  visionMode = false;
  if (visionUploadSection) {
    visionUploadSection.classList.add('hidden');
  }
  if (visionToggle) visionToggle.checked = false;
  
  // Reset task planner state (this also clears sessionContextItems)
  initSession();
  hideTodoSection();
  
  // Reset breadcrumb and carousel
  if (breadcrumbNav) breadcrumbNav.classList.add('hidden');
  if (cardCarousel) cardCarousel.classList.add('hidden');
  
  // Reset UI
  queryInput.value = '';
  autoGrowTextarea();
  
  // Reset skill selector state
  if (skillSelectorUI) {
    skillSelectorUI.reset();
  } else {
    updateSkillBadge(null); // Legacy: Hide skill badge
  }
  
  emptyState.classList.remove('hidden');
  
  // 使用新的 timeline 系統
  clearPlannerTimeline();
  hidePlannerTimeline();
  hideNextStepsSection();
  
  canvasSection.classList.add('hidden');
  hideBranchActions();
  exportBtn.style.display = 'none';
  errorBanner.classList.add('hidden');
  clearAllSummaries();
  
  // Close history panel if open
  if (historyVisible) {
    historyPanel.classList.add('hidden');
    historyVisible = false;
  }
  
  // Focus input
  queryInput.focus();
  showToast('已開始新對話');
}

// Create new root card in current session
function executeNewRootCard() {
  // Reset UI for new card but keep session
  currentConversation = null;
  currentQuery = '';
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  activeTab = null;
  
  // Reset search mode state
  searchIteration = 0;
  currentSearchQueries = [];
  searchStrategySection.classList.add('hidden');
  
  // Reset search iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  originalQueryBeforeIteration = '';
  searchIterationHint.classList.add('hidden');
  sendBtn.classList.remove('next-iteration');
  
  // Reset session cost
  resetSessionCost();
  
  // Reset vision state for new card
  clearUploadedImage();
  visionMode = false;
  if (visionUploadSection) {
    visionUploadSection.classList.add('hidden');
  }
  if (visionToggle) visionToggle.checked = false;
  
  // Reset skill selector state for new card
  if (skillSelectorUI) {
    skillSelectorUI.reset();
  }
  
  // Hide todo section
  hideTodoSection();
  
  // Clear current card reference (will create new root on send)
  sessionState.currentCardId = null;
  
  // Reset UI
  queryInput.value = '';
  autoGrowTextarea();
  emptyState.classList.remove('hidden');
  
  // 使用新的 timeline 系統
  clearPlannerTimeline();
  hidePlannerTimeline();
  hideNextStepsSection();
  
  canvasSection.classList.add('hidden');
  hideBranchActions();
  exportBtn.style.display = 'none';
  errorBanner.classList.add('hidden');
  clearAllSummaries();
  
  // Update breadcrumb to show session name only
  renderBreadcrumb();
  updateSiblingCards();
  renderCarousel();
  
  // Close history panel if open
  if (historyVisible) {
    historyPanel.classList.add('hidden');
    historyVisible = false;
  }
  
  // Focus input
  queryInput.focus();
  showToast('已準備新增 Root 卡片');
}

// Setup new conversation modal event listeners
function setupNewConvModalListeners() {
  if (closeNewConvModal) {
    closeNewConvModal.addEventListener('click', hideNewConvModal);
  }
  if (cancelNewConv) {
    cancelNewConv.addEventListener('click', hideNewConvModal);
  }
  if (confirmNewConv) {
    confirmNewConv.addEventListener('click', () => {
      const selectedType = document.querySelector('input[name="newConvType"]:checked')?.value || 'newSession';
      executeNewChat(selectedType);
    });
  }
  // Close modal when clicking backdrop
  if (newConvModal) {
    newConvModal.addEventListener('click', (e) => {
      if (e.target === newConvModal) {
        hideNewConvModal();
      }
    });
  }
}

async function toggleHistory() {
  historyVisible = !historyVisible;
  if (historyVisible) {
    await renderHistory();
    historyPanel.classList.remove('hidden');
  } else {
    historyPanel.classList.add('hidden');
  }
}

function closeHistory() {
  historyVisible = false;
  historyPanel.classList.add('hidden');
}

async function renderHistory() {
  const [convResult, sessResult] = await Promise.all([
    chrome.storage.local.get('conversations'),
    chrome.storage.local.get('taskSessions')
  ]);
  const conversations = convResult.conversations || [];
  const sessions = sessResult.taskSessions || [];
  
  if (conversations.length === 0 && sessions.length === 0) {
    historyList.innerHTML = '<div class="history-empty">尚無歷史紀錄</div>';
    return;
  }

  // Render sessions first (if any have multiple cards)
  const sessionsHtml = sessions
    .filter(s => s.cards && s.cards.length > 1)
    .map(session => {
      const rootCard = session.cards.find(c => c.id === session.rootCardId);
      const query = rootCard?.query || 'Untitled Session';
      return `
        <div class="history-item session-item" data-session-id="${session.id}">
          <div class="history-item-content">
            <div class="history-query">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px;vertical-align:-1px;">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
              </svg>
              ${escapeHtml(query)}
            </div>
            <div class="history-meta">
              <span>${formatDate(session.timestamp)}</span>
              <span>${session.cards.length} 張卡片</span>
            </div>
          </div>
          <button class="history-delete-btn" data-session-id="${session.id}" title="刪除此專案">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
    }).join('');

  // Render regular conversations
  const convsHtml = conversations.map(conv => `
    <div class="history-item" data-id="${conv.id}">
      <div class="history-item-content">
        <div class="history-query">${escapeHtml(conv.query)}</div>
        <div class="history-meta">
          <span>${formatDate(conv.timestamp)}</span>
          <span>${conv.models?.length || 0} 個模型</span>
        </div>
      </div>
      <button class="history-delete-btn" data-id="${conv.id}" title="刪除此紀錄">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  `).join('');

  historyList.innerHTML = sessionsHtml + convsHtml;

  // 綁定載入對話事件
  historyList.querySelectorAll('.history-item-content').forEach(content => {
    const item = content.parentElement;
    content.addEventListener('click', () => {
      if (item.dataset.sessionId) {
        loadSessionFromHistory(item.dataset.sessionId);
      } else {
        loadConversation(item.dataset.id);
      }
    });
  });

  // 綁定刪除事件
  historyList.querySelectorAll('.history-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (btn.dataset.sessionId) {
        await deleteSession(btn.dataset.sessionId);
        await renderHistory();
      } else {
        deleteConversation(btn.dataset.id);
      }
    });
  });
}

async function deleteConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  let conversations = result.conversations || [];
  conversations = conversations.filter(c => c.id !== id);
  
  try {
    await chrome.storage.local.set({ conversations });
    await renderHistory();
    showToast('已刪除紀錄');
  } catch (err) {
    if (err.message?.includes('QUOTA_BYTES')) {
      showToast('儲存失敗：空間不足', true);
    } else {
      showToast('刪除失敗：' + err.message, true);
    }
  }
}

async function loadConversation(id) {
  const result = await chrome.storage.local.get('conversations');
  const conversations = result.conversations || [];
  const conv = conversations.find(c => c.id === id);
  if (!conv) return;

  currentConversation = conv;
  historyPanel.classList.add('hidden');
  historyVisible = false;
  
  // Reset search iteration mode state
  pendingSearchKeyword = null;
  isSearchIterationMode = false;
  originalQueryBeforeIteration = '';
  searchIterationHint.classList.add('hidden');
  sendBtn.classList.remove('next-iteration');
  searchStrategySection.classList.add('hidden');

  // 載入並替換參考資料快照
  const snapshotItems = conv.contextItemsSnapshot ? JSON.parse(JSON.stringify(conv.contextItemsSnapshot)) : [];
  
  // Migrate old format items to have scope
  snapshotItems.forEach(item => {
    if (!item.scope) {
      item.scope = 'session'; // Old conversation items become session-level
    }
  });
  
  // For old conversations, treat all as session-level
  sessionContextItems = snapshotItems.filter(item => item.scope === 'session');
  
  // Clear any card context (since this is a legacy conversation load)
  const currentCard = getCurrentCard();
  if (currentCard) {
    currentCard.cardContextItems = snapshotItems.filter(item => item.scope === 'card');
  }
  
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // 通知使用者參考資料已替換
  if (contextItems.length > 0) {
    showToast(`已載入此對話的 ${contextItems.length} 個參考資料`);
  } else {
    showToast('此對話無參考資料');
  }

  // Display saved conversation
  queryInput.value = conv.query;
  emptyState.classList.add('hidden');
  exportBtn.style.display = 'flex';
  if (conv.finalAnswer) {
    showBranchActions();
    canvasSection.classList.add('hidden');
  }

  // 使用 Timeline 系統顯示已保存的對話
  clearPlannerTimeline();
  showPlannerTimeline();
  
  // Render responses in timeline
  if (conv.responses && conv.responses.length > 0) {
    appendTimelineParagraph({
      tool: 'query_council',
      reasoning: '已保存的模型回應'
    }, 'done');
    renderToolResultInParagraph('query_council', {
      responses: conv.responses
    });
  }
  
  // Render ranking if available
  if (conv.ranking && conv.ranking.length > 0) {
    appendTimelineParagraph({
      tool: 'peer_review',
      reasoning: '已保存的互評結果'
    }, 'done');
    renderToolResultInParagraph('peer_review', {
      ranking: conv.ranking,
      winner: conv.ranking[0]?.model
    });
  }

  // Render final answer
  if (conv.finalAnswer) {
    appendTimelineParagraph({
      tool: 'synthesize',
      reasoning: '已保存的彙整結論'
    }, 'done');
    renderToolResultInParagraph('synthesize', {
      content: conv.finalAnswer,
      chairman: conv.chairmanModel || chairmanModel
    });
    
    // 顯示 Next Steps Section
    showNextStepsSection();
    
    // 解析並渲染 tasks
    if (enableTaskPlanner) {
      const parsedTasks = parseTasksFromResponse(conv.finalAnswer);
      if (parsedTasks.success && parsedTasks.tasks.length > 0) {
        renderTodoSection(parsedTasks.tasks);
      } else {
        hideTodoSection();
      }
    } else {
      hideTodoSection();
    }
  } else {
    hideTodoSection();
  }
}

function renderSavedResponses(savedResponses) {
  // 已由 Timeline 系統處理，此函數保留以供向下相容
  // 實際渲染邏輯已移至 renderCouncilResultInTimeline
  if (!savedResponses || savedResponses.length === 0) return;
  
  // 重建 responses Map（供其他函數使用）
  responses.clear();
  savedResponses.forEach(r => {
    responses.set(r.model, { 
      content: r.content, 
      status: 'done', 
      latency: r.latency || 0,
      images: r.images || []
    });
  });

  modelTabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      modelTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      responseContainer.querySelectorAll('.response-panel').forEach(p => p.classList.remove('active'));
      responseContainer.querySelector(`[data-model="${tab.dataset.model}"]`)?.classList.add('active');
    });
  });

  if (models.length > 0) {
    modelTabs.querySelector('.tab')?.classList.add('active');
    responseContainer.querySelector('.response-panel')?.classList.add('active');
  }
}

async function saveCurrentConversation(data) {
  const result = await chrome.storage.local.get('conversations');
  let conversations = result.conversations || [];
  
  const conv = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    contextItemsSnapshot: JSON.parse(JSON.stringify(contextItems)), // 深拷貝快照
    ...data
  };
  
  conversations.unshift(conv);
  if (conversations.length > 50) conversations.length = 50;
  
  const saveResult = await safeStorageSet({ conversations });
  if (!saveResult.success && saveResult.quotaError) {
    // Quota exceeded - try removing older conversations and retry
    while (conversations.length > 10) {
      conversations.pop();
      const retryResult = await safeStorageSet({ conversations });
      if (retryResult.success) {
        showToast('儲存空間不足，已自動清理舊紀錄', true);
        break;
      }
    }
  }
  currentConversation = conv;
  
  // Also save session if task planner is enabled
  if (enableTaskPlanner && sessionState.id) {
    await saveSession();
  }
}

// ============================================
// Session Storage Functions
// ============================================

// Save current session to storage
async function saveSession() {
  if (!sessionState.id) return;
  
  // Convert Map to serializable object
  const cardsArray = Array.from(sessionState.cards.entries()).map(([id, card]) => ({
    ...card,
    // Ensure all data is serializable
  }));
  
  const sessionData = {
    id: sessionState.id,
    name: sessionState.name,  // 儲存 session 名稱
    rootCardId: sessionState.rootCardId,
    currentCardId: sessionState.currentCardId,
    breadcrumb: sessionState.breadcrumb,
    cards: cardsArray,
    sessionContextItems: JSON.parse(JSON.stringify(sessionContextItems)), // Session-level items
    contextItemsSnapshot: JSON.parse(JSON.stringify(contextItems)), // For backwards compatibility
    timestamp: Date.now()
  };
  
  // Save to sessions storage
  const result = await chrome.storage.local.get('taskSessions');
  let sessions = result.taskSessions || [];
  
  // Update existing or add new
  const existingIndex = sessions.findIndex(s => s.id === sessionState.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = sessionData;
  } else {
    sessions.unshift(sessionData);
  }
  
  // Keep only recent sessions (max 20)
  if (sessions.length > 20) sessions.length = 20;
  
  await safeStorageSet({ taskSessions: sessions });
}

// Load session from storage
async function loadSession(sessionId) {
  const result = await chrome.storage.local.get('taskSessions');
  const sessions = result.taskSessions || [];
  const sessionData = sessions.find(s => s.id === sessionId);
  
  if (!sessionData) {
    console.error('Session not found:', sessionId);
    return false;
  }
  
  // Restore session state
  sessionState.id = sessionData.id;
  sessionState.name = sessionData.name || null;  // 還原 session 名稱
  sessionState.rootCardId = sessionData.rootCardId;
  sessionState.currentCardId = sessionData.currentCardId;
  sessionState.breadcrumb = sessionData.breadcrumb || [];
  
  // Restore cards Map
  sessionState.cards.clear();
  (sessionData.cards || []).forEach(card => {
    // Ensure cardContextItems exists for each card (migration)
    if (!card.cardContextItems) {
      card.cardContextItems = [];
    }
    sessionState.cards.set(card.id, card);
  });
  
  // Restore session-level context items
  if (sessionData.sessionContextItems) {
    sessionContextItems = sessionData.sessionContextItems;
  } else if (sessionData.contextItemsSnapshot) {
    // Migration: old format - treat all as session-level
    sessionContextItems = sessionData.contextItemsSnapshot.map(item => ({
      ...item,
      scope: 'session'
    }));
  } else {
    sessionContextItems = [];
  }
  
  // Update visible context items and UI
  updateVisibleContextItems();
  await saveContextItems();
  renderContextItems();
  updateContextBadge();
  
  // Switch to current card
  if (sessionState.currentCardId) {
    switchToCard(sessionState.currentCardId);
  }
  
  return true;
}

// Get list of saved sessions for display
async function getSavedSessions() {
  const result = await chrome.storage.local.get('taskSessions');
  return (result.taskSessions || []).map(s => ({
    id: s.id,
    rootQuery: s.cards?.find(c => c.id === s.rootCardId)?.query || 'Untitled',
    cardCount: s.cards?.length || 0,
    timestamp: s.timestamp
  }));
}

// Delete a session
async function deleteSession(sessionId) {
  const result = await chrome.storage.local.get('taskSessions');
  let sessions = result.taskSessions || [];
  sessions = sessions.filter(s => s.id !== sessionId);
  await safeStorageSet({ taskSessions: sessions });
}

// Load session from history panel
async function loadSessionFromHistory(sessionId) {
  // Close history panel
  closeHistory();
  
  // Reset UI first
  emptyState.classList.add('hidden');
  showPlannerTimeline();
  
  // Load session
  const loaded = await loadSession(sessionId);
  if (loaded) {
    showToast('已載入專案');
  } else {
    showToast('載入專案失敗', true);
  }
}

async function clearHistory() {
  if (!confirm('確定要清除所有歷史紀錄？')) return;
  try {
    await chrome.storage.local.set({ conversations: [] });
    await renderHistory();
    showToast('已清除歷史紀錄');
  } catch (err) {
    showToast('清除失敗：' + err.message, true);
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return '剛剛';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return date.toLocaleDateString('zh-TW');
}

// ============================================
// Export Functions
// ============================================
function exportAsMarkdown() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  downloadFile(`mav-${Date.now()}.md`, md, 'text/markdown');
  exportModal.classList.add('hidden');
  showToast('已匯出 Markdown');
}

function exportAsJson() {
  if (!currentConversation) return;
  const json = JSON.stringify(currentConversation, null, 2);
  downloadFile(`mav-${Date.now()}.json`, json, 'application/json');
  exportModal.classList.add('hidden');
  showToast('已匯出 JSON');
}

async function copyToClipboard() {
  if (!currentConversation) return;
  const md = generateMarkdown(currentConversation);
  try {
    await navigator.clipboard.writeText(md);
    exportModal.classList.add('hidden');
    showToast('已複製到剪貼簿');
  } catch (e) {
    showToast('複製失敗', true);
  }
}

function generateMarkdown(conv) {
  let md = `# MAV Council 回應\n\n`;
  md += `**問題：** ${conv.query}\n\n`;
  md += `**日期：** ${new Date(conv.timestamp).toLocaleString('zh-TW')}\n\n`;
  md += `---\n\n`;

  md += `## 模型回應\n\n`;
  (conv.responses || []).forEach(r => {
    md += `### ${getModelName(r.model)}\n\n${r.content}\n\n`;
  });

  if (conv.ranking && conv.ranking.length > 0) {
    md += `## 互評排名\n\n`;
    conv.ranking.forEach((r, i) => {
      md += `${i + 1}. ${getModelName(r.model)}（平均：${r.avgRank.toFixed(2)}）\n`;
    });
    md += `\n`;
  }

  if (conv.finalAnswer) {
    md += `## 主席彙整\n\n`;
    md += `**主席：** ${getModelName(conv.chairmanModel || chairmanModel)}\n\n`;
    md += conv.finalAnswer;
  }

  return md;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.className = `toast${isError ? ' error' : ''}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

// ============================================
// Agent Framework Integration
// ============================================

// Flag to enable Agent Framework (set to true to use new flow)
let useAgentFramework = true;

// Current skill (detected from query)
let currentSkill = null;

// Orchestrator instance
let orchestratorInstance = null;

/**
 * Initialize Agent Framework components
 */
function initAgentFramework() {
  console.log('[AgentFramework] Initializing...');
  
  // Initialize Orchestrator
  if (window.MAVOrchestrator) {
    orchestratorInstance = new window.MAVOrchestrator.Orchestrator({
      chairmanModel: chairmanModel,
      availableModels: councilModels
    });
    console.log('[AgentFramework] Orchestrator initialized');
  }
  
  // Register tool executors if not already done
  if (window.MAVTools && !window.MAVTools.toolRegistry.has('query_council')) {
    registerAgentTools();
  }
}

/**
 * Register tool executors connecting to existing app functions
 */
function registerAgentTools() {
  console.log('[AgentFramework] Registering tools...');
  
  const toolRegistry = window.MAVTools.toolRegistry;
  
  // query_council - parallel query to models
  toolRegistry.register('query_council', async (params, context) => {
    const { query, models, includeSearchSuffix = true, skillId, taskDescription } = params;
    const targetModels = models || councilModels;
    
    console.log('[Tool:query_council] Querying', targetModels.length, 'models');
    console.log('[Tool:query_council] Current skill:', currentSkill?.id, currentSkill?.name);
    console.log('[Tool:query_council] Context received:', context ? 'yes' : 'no');
    console.log('[Tool:query_council] Context.searches:', context?.searches?.length || 0, 'searches');
    
    // Build base prompt with context
    let promptWithContext = buildPromptWithContext(query);
    
    // === Inject search results from context.searches ===
    if (context?.searches?.length > 0) {
      const allSearchResults = context.searches.flatMap(s => s.results || []);
      console.log('[Tool:query_council] Total search results to inject:', allSearchResults.length);
      if (allSearchResults.length > 0) {
        const searchContext = formatSearchResultsForPrompt(allSearchResults);
        promptWithContext = searchContext + promptWithContext;
        console.log('[Tool:query_council] Search context injected into prompt');
      }
    } else {
      console.log('[Tool:query_council] No searches in context - query will not include search results');
    }
    
    // === NEW: Inject skill-specific instructions (user message style) ===
    if (currentSkill?.instructions) {
      const skillInstruction = `## 技能指引：${currentSkill.name}\n\n${currentSkill.instructions}\n\n---\n\n`;
      promptWithContext = skillInstruction + promptWithContext;
      console.log('[Tool:query_council] Skill instructions applied:', currentSkill.id);
    } else if (currentSkill) {
      console.log('[Tool:query_council] Skill has no instructions:', currentSkill.id);
    }
    
    // Add search suffix if requested
    if (includeSearchSuffix) {
      promptWithContext += COUNCIL_SEARCH_SUFFIX;
    }
    
    // Clear previous responses
    responses.clear();
    
    // Query all models in parallel
    await Promise.allSettled(
      targetModels.map(model => queryModel(model, promptWithContext))
    );
    
    // Collect results
    const successfulResponses = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'done')
      .map(([model, r]) => ({ 
        model, 
        content: r.content, 
        latency: r.latency,
        task: taskDescription || query,
        skill: skillId || currentSkill?.id
      }));
    
    const failures = Array.from(responses.entries())
      .filter(([_, r]) => r.status === 'error')
      .map(([model, r]) => ({ model, error: r.error }));
    
    console.log('[Tool:query_council] Complete:', successfulResponses.length, 'success,', failures.length, 'failed');
    
    return {
      responses: successfulResponses,
      failures,
      successCount: successfulResponses.length,
      totalCount: targetModels.length
    };
  });
  
  // web_search - Brave Search API
  toolRegistry.register('web_search', async (params, context) => {
    const { query, queries, count = 10, freshness = 'pm' } = params;
    
    // Build list of queries to execute
    let queryList = queries || [query];
    
    // Split long queries into shorter keywords (max 30 chars, 2-4 keywords)
    queryList = queryList.flatMap(q => {
      if (!q) return [];
      if (q.length <= 30) return [q];
      
      // Extract keywords from long query
      const extracted = splitSearchQuery(q);
      console.log('[Tool:web_search] Split query:', q.slice(0, 30) + '...', '->', extracted);
      return extracted;
    });
    
    // Limit to max 3 queries
    queryList = queryList.slice(0, 3);
    console.log('[Tool:web_search] Executing', queryList.length, 'queries:', queryList);
    
    // Execute searches
    const allResults = [];
    const executedQueries = [];
    
    for (const q of queryList) {
      try {
        const results = await executeWebSearch(q, { count: Math.ceil(count / queryList.length), freshness });
        allResults.push(...results);
        executedQueries.push(q);
      } catch (error) {
        console.error('[Tool:web_search] Error for query:', q, error);
      }
    }
    
    console.log('[Tool:web_search] Total results:', allResults.length, 'from', executedQueries.length, 'queries');
    
    // Add search results to UI contextItems
    if (allResults.length > 0) {
      const searchContent = allResults.slice(0, 5).map((r, i) => 
        `[${i+1}] ${r.title}\n來源: ${r.url}\n${r.description || r.snippet || ''}`
      ).join('\n\n');
      
      await addContextItem({
        title: `搜尋: ${executedQueries.join(', ').slice(0, 30)}${executedQueries.join(', ').length > 30 ? '...' : ''}`,
        content: searchContent,
        url: '',
        type: 'search',
        urlsWithStatus: allResults.slice(0, 5).map((r, i) => ({ index: i + 1, url: r.url, title: r.title, fetched: false, status: 'pending' }))
      });
      console.log('[Tool:web_search] Added to contextItems:', allResults.length, 'results');
    }
    
    return {
      query: executedQueries.join('; '),
      queries: executedQueries,
      results: allResults,
      resultCount: allResults.length
    };
  });
  
  // peer_review - anonymous cross-evaluation
  toolRegistry.register('peer_review', async (params, context) => {
    // Get responses from context if not provided in params (planner may not pass them)
    const inputResponses = params.responses || context?.responses;
    const query = params.query || context?.query;
    const { modelWeights = {}, evaluationMode = 'standard' } = params;
    
    console.log('[Tool:peer_review] Starting review of', inputResponses?.length || 0, 'responses, mode:', evaluationMode);
    console.log('[Tool:peer_review] Responses source:', params.responses ? 'params' : 'context');
    
    if (!inputResponses || inputResponses.length < 2) {
      console.error('[Tool:peer_review] Not enough responses:', inputResponses?.length || 0);
      throw new Error('Need at least 2 responses for peer review');
    }
    
    // Clear previous reviews
    reviews.clear();
    
    // Run reviews in parallel
    await Promise.allSettled(
      councilModels.map(model => runReview(model, query, inputResponses))
    );
    
    // Aggregate rankings
    const aggregatedRanking = aggregateRankings(inputResponses);
    
    // Calculate weighted ranking if weights provided
    let weightedRanking = null;
    if (evaluationMode === 'weighted' && Object.keys(modelWeights).length > 0) {
      weightedRanking = aggregatedRanking.map(item => {
        const weight = modelWeights[item.model] || 1.0;
        return {
          ...item,
          weightedScore: item.score * weight,
          taskWeight: weight
        };
      }).sort((a, b) => b.weightedScore - a.weightedScore);
    }
    
    const winner = weightedRanking?.[0]?.model || aggregatedRanking[0]?.model || null;
    
    console.log('[Tool:peer_review] Complete. Winner:', winner);
    
    // 將 reviews Map 轉換為包含 reviewer 資訊的陣列
    const allReviews = [];
    reviews.forEach((rankings, reviewer) => {
      rankings.forEach(r => {
        allReviews.push({
          reviewer,
          reviewerName: getModelName(reviewer),
          model: r.model,
          modelName: getModelName(r.model),
          rank: r.rank,
          reason: r.reason
        });
      });
    });
    
    return {
      reviews: allReviews,
      aggregatedRanking,
      weightedRanking,
      reviewCount: reviews.size,
      winner,
      evaluationMode
    };
  });
  
  // synthesize - chairman synthesis
  toolRegistry.register('synthesize', async (params, context) => {
    // Get data from context if not provided in params (planner may not pass them)
    const query = params.query || context?.query;
    const inputResponses = params.responses || context?.responses;
    const inputReviews = params.reviews || context?.reviews;
    const searches = params.searches || context?.searches;
    const { useWeightedIntegration = false, chairmanOverride = null } = params;
    
    console.log('[Tool:synthesize] Responses source:', params.responses ? 'params' : 'context');
    console.log('[Tool:synthesize] Responses count:', inputResponses?.length || 0);
    
    const ranking = inputReviews?.weightedRanking || inputReviews?.aggregatedRanking || null;
    const searchResults = searches || null;
    
    // Resolve actual chairman
    const actualChairman = chairmanOverride || resolveChairmanModel(ranking, inputResponses);
    
    console.log('[Tool:synthesize] Chairman:', actualChairman);
    
    const content = await runChairman(
      query, 
      inputResponses, 
      ranking, 
      enableSearchMode,
      null, // targetCardId
      searchResults
    );
    
    return {
      content,
      chairmanModel: actualChairman,
      winner: inputReviews?.winner || null
    };
  });
  
  // final_answer - output result
  toolRegistry.register('final_answer', async (params, context) => {
    const { content, summary } = params;
    console.log('[Tool:final_answer] Returning final answer');
    return {
      content,
      summary: summary || content?.slice(0, 100) + '...',
      completed: true
    };
  });
  
  // request_user_input - breakpoint for user interaction
  toolRegistry.register('request_user_input', async (params, context) => {
    const { 
      message, 
      inputType = 'choice',
      options = [], 
      suggestedSearches = [],
      placeholder = ''
    } = params;
    
    // 獲取當前卡片（用於創建子卡片）
    const currentCard = getCurrentCard();
    
    console.log('[Tool:request_user_input] Showing breakpoint panel');
    console.log('[Tool:request_user_input] inputType:', inputType);
    console.log('[Tool:request_user_input] Options:', options.length);
    console.log('[Tool:request_user_input] Message:', message);
    
    // Show breakpoint panel and wait for user response
    const userResponse = await showBreakpointAndWait(message, suggestedSearches, {
      inputType,
      options,
      suggestedSearches,
      placeholder
    });
    
    console.log('[Tool:request_user_input] User response:', userResponse);
    
    // Handle different action types
    switch (userResponse.action) {
      case 'search': {
        // Execute search and create child card for project mode
        const query = userResponse.query || userResponse.value;
        if (!query) {
          return { action: 'proceed', continueLoop: false };
        }
        
        console.log('[Tool:request_user_input] Executing search:', query);
        const searchResults = await executeWebSearch(query, { count: 10 });
        
        // Add to context items
        if (searchResults.length > 0) {
          const searchContent = searchResults.slice(0, 5).map((r, i) => 
            `[${i+1}] ${r.title}\n來源: ${r.url}\n${r.description || r.snippet || ''}`
          ).join('\n\n');
          
          await addContextItem({
            title: `搜尋: ${query.slice(0, 30)}${query.length > 30 ? '...' : ''}`,
            content: searchContent,
            url: '',
            type: 'search',
            urlsWithStatus: searchResults.slice(0, 5).map((r, i) => ({ index: i + 1, url: r.url, title: r.title, fetched: false, status: 'pending' }))
          });
        }
        
        // 創建子卡片以進入專案模式
        if (currentCard && searchResults.length > 0) {
          const parentQuery = context?.query || '';
          const childQuery = `【延伸搜尋】${query}\n\n基於搜尋結果深入分析以下主題：${parentQuery.slice(0, 150)}${parentQuery.length > 150 ? '...' : ''}`;
          
          // 添加為任務
          const taskId = generateId();
          const task = {
            id: taskId,
            content: `延伸搜尋: ${query.slice(0, 50)}`,
            priority: 'high',
            status: 'pending',
            createdAt: new Date().toISOString(),
            suggestedFeatures: ['search']
          };
          currentCard.tasks.push(task);
          
          // 創建子卡片
          const childCard = createChildCard(currentCard, childQuery);
          if (childCard) {
            childCard.taskId = taskId;
            task.cardId = childCard.id;
            task.status = 'in_progress';
            
            console.log('[Tool:request_user_input] Created search child card:', childCard.id);
            
            return {
              action: 'spawn_child',
              childCardId: childCard.id,
              childQuery: childQuery,
              query,
              results: searchResults,
              resultCount: searchResults.length,
              continueLoop: false,
              spawnChild: true
            };
          }
        }
        
        // 如果無法創建子卡片，繼續在當前循環
        return {
          action: 'search',
          query,
          results: searchResults,
          resultCount: searchResults.length,
          continueLoop: true
        };
      }
      
      case 'deepen':
      case 'rephrase':
      case 'switch_focus':
      case 'clarify':
      case 'custom': {
        // All these actions create a child card as a sub-task
        const value = userResponse.value || userResponse.label;
        console.log(`[Tool:request_user_input] Action: ${userResponse.action}, value: ${value?.slice(0, 50)}`);
        console.log(`[Tool:request_user_input] currentCard exists:`, !!currentCard, currentCard?.id);
        
        // Build query for child card based on action type
        let childQuery;
        const parentQuery = context?.query || '';
        
        switch (userResponse.action) {
          case 'deepen':
            childQuery = `【聚焦方向】${value}\n\n基於上層討論：${parentQuery.slice(0, 200)}${parentQuery.length > 200 ? '...' : ''}`;
            break;
          case 'rephrase':
            childQuery = value; // Pure new question
            break;
          case 'switch_focus':
            childQuery = `【轉換焦點】${value}`;
            break;
          case 'clarify':
          case 'custom':
          default:
            childQuery = `${value}\n\n參考上層脈絡：${parentQuery.slice(0, 150)}${parentQuery.length > 150 ? '...' : ''}`;
        }
        
        console.log(`[Tool:request_user_input] childQuery: ${childQuery.slice(0, 80)}...`);
        
        // Create child card
        if (currentCard) {
          // Add as task first
          const taskId = generateId();
          const task = {
            id: taskId,
            content: value.slice(0, 100),
            priority: 'high',
            status: 'pending',
            createdAt: new Date().toISOString(),
            suggestedFeatures: []
          };
          currentCard.tasks.push(task);
          console.log(`[Tool:request_user_input] Task created: ${taskId}`);
          
          // Create child card from task
          const childCard = createChildCard(currentCard.id, taskId, childQuery);
          console.log(`[Tool:request_user_input] Child card created:`, !!childCard, childCard?.id);
          
          if (childCard) {
            // Return signal to hand off to child card
            return {
              action: 'spawn_child',
              childCardId: childCard.id,
              childQuery: childQuery,
              continueLoop: false, // Stop current loop
              spawnChild: true     // Signal to agent.js to spawn new loop
            };
          } else {
            console.error('[Tool:request_user_input] Failed to create child card');
          }
        } else {
          console.warn('[Tool:request_user_input] No currentCard available');
        }
        
        // Fallback: continue in current loop if child creation fails
        console.log('[Tool:request_user_input] Fallback: continuing in current loop');
        return {
          action: userResponse.action,
          value: value,
          modifiedQuery: childQuery,
          continueLoop: true
        };
      }
      
      case 'cancel':
      case 'proceed':
      default:
        // User chose to proceed or cancel
        return {
          action: 'proceed',
          continueLoop: false
        };
    }
  });
  
  console.log('[AgentFramework] Tools registered');
}

/**
 * Get current skill based on query
 * Now uses the unified skill selector with priority: user selection > detected
 */
function getCurrentSkillForQuery(query) {
  // Use the unified resolveActiveSkill function
  const { skill, source } = resolveActiveSkill();
  
  if (skill) {
    console.log('[AgentFramework] Selected skill:', skill.id, skill.name, '(source:', source + ')');
    return skill;
  }
  
  // Fallback to direct detection if resolveActiveSkill didn't find anything
  const selector = window.MAVSkills?.skillSelector;
  if (!selector) {
    console.warn('[AgentFramework] SkillSelector not available');
    return null;
  }
  
  const settings = {
    visionMode: visionMode,
    learnerMode: learnerMode
  };
  
  const detected = selector.select(query, settings);
  console.log('[AgentFramework] Fallback detected skill:', detected?.id, detected?.name);
  return detected;
}

/**
 * Run Council using Agent Framework
 */
async function runWithAgentLoop(query, options = {}) {
  const { targetCardId, savedResponsesRef } = options;
  
  console.log('[AgentFramework] Starting AgentLoop for query:', query.substring(0, 50) + '...');
  
  // Clear previous progress and suggestions for new query
  clearAgentProgress();
  hideSuggestedActions();
  
  // Get skill using unified selector
  currentSkill = getCurrentSkillForQuery(query);
  if (currentSkill) {
    // Update skill selector display
    const source = userSelectedSkill ? 'user' : 'auto';
    if (skillSelectorUI) {
      skillSelectorUI.updateDisplay(currentSkill, source);
    }
    
    // Apply skill side effects (enableImage, enableSearchMode, etc.)
    // This is the canonical place where skill effects are applied
    applySkillSideEffects(currentSkill);
    updateCurrentCardSettings();
    
    console.log('[AgentFramework] Skill applied:', currentSkill.id, {
      enableImage,
      enableSearchMode,
      visionMode,
      showImageStyleSelector: currentSkill.showImageStyleSelector
    });
  }
  
  // Create planner (HybridPlanner auto-switches between LLM and rule-based)
  let preferredTools = currentSkill?.preferredTools || ['query_council', 'peer_review', 'synthesize'];
  
  // 根據用戶設定調整 preferredTools
  // 如果用戶啟用了 enableReview 但 skill 沒有包含 peer_review，則加入
  if (enableReview && !preferredTools.includes('peer_review')) {
    // 在 query_council 後、synthesize 前插入 peer_review
    const synthesizeIdx = preferredTools.indexOf('synthesize');
    if (synthesizeIdx > 0) {
      preferredTools = [...preferredTools.slice(0, synthesizeIdx), 'peer_review', ...preferredTools.slice(synthesizeIdx)];
    } else {
      preferredTools = [...preferredTools, 'peer_review'];
    }
    console.log('[AgentFramework] Added peer_review based on enableReview setting');
  }
  // 如果用戶關閉了 enableReview，則移除 peer_review
  if (!enableReview && preferredTools.includes('peer_review')) {
    preferredTools = preferredTools.filter(t => t !== 'peer_review');
    console.log('[AgentFramework] Removed peer_review based on enableReview setting');
  }
  
  const planner = new window.MAVPlanner.HybridPlanner({
    model: plannerModel || null,  // Empty string means use rule-based only
    complexityThreshold: 0.5,
    useWeightedEvaluation: false
  });
  planner.setPreferredTools(preferredTools);
  planner.setSkill(currentSkill);
  if (currentSkill?.plannerHint) {
    planner.setSkillHint(currentSkill.plannerHint);
  }
  
  console.log('[AgentFramework] Preferred tools:', preferredTools);
  console.log('[AgentFramework] enableReview:', enableReview);
  console.log('[AgentFramework] Planner model:', plannerModel || '(rule-based)');
  
  // Create agent loop
  const agentLoop = new window.MAVAgent.AgentLoop({
    toolRegistry: window.MAVTools.toolRegistry,
    planner: planner,
    maxIterations: currentSkill?.maxIterations || 10,
    
    // UI Callbacks
    onIterationStart: (context) => {
      console.log('[AgentLoop] Iteration', context.iteration, 'start');
      // Show planning in progress
      updateAgentProgress('planning', 'loading', {
        iteration: context.iteration,
        maxIterations: context.maxIterations
      });
    },
    
    onPlanDecision: (action, context) => {
      console.log('[AgentLoop] Plan decision:', action?.tool, 'reasoning:', action?.reasoning);
      // Update planning with decision and reasoning
      if (action) {
        updateAgentProgress('planning', 'done', {
          iteration: context.iteration,
          nextTool: action.tool,
          reasoning: action.reasoning
        });
      }
    },
    
    onToolStart: (action, context) => {
      console.log('[AgentLoop] Tool start:', action.tool);
      
      // Timeline 系統已在 onPlanDecision 中創建段落
      // 這裡只需要更新狀態
      currentStage = action.tool;
    },
    
    onToolEnd: (action, result, context) => {
      console.log('[AgentLoop] Tool end:', action.tool, 'success:', result.success);
      
      if (result.success) {
        // 使用新的 timeline 系統渲染結果
        switch (action.tool) {
          case 'web_search':
            renderToolResultInParagraph('web_search', {
              searches: result.data.searches || [],
              resultCount: result.data.resultCount || 0
            });
            break;
            
          case 'query_council':
            // Update saved responses for later use
            if (savedResponsesRef) {
              savedResponsesRef.value = result.data.responses;
            }
            renderToolResultInParagraph('query_council', {
              responses: result.data.responses || []
            });
            break;
            
          case 'peer_review':
            renderToolResultInParagraph('peer_review', {
              ranking: result.data.aggregatedRanking || [],
              winner: result.data.winner,
              reviews: result.data.reviews || []
            });
            break;
            
          case 'synthesize':
            const chairman = resolveChairmanModel(null, context.responses);
            renderToolResultInParagraph('synthesize', {
              content: result.data.content || '',
              chairman: chairman
            });
            break;
            
          case 'request_user_input':
            renderToolResultInParagraph('request_user_input', result.data);
            break;
            
          case 'final_answer':
            // final_answer 不需要特別渲染，只需更新狀態
            updateCurrentParagraphStatus('done');
            break;
            
          default:
            // 其他未處理的工具，至少要更新狀態以停止 skeleton 動畫
            updateCurrentParagraphStatus('done');
            break;
        }
        
        // 更新卡片執行中間狀態（支援切換時還原）
        if (targetCardId) {
          updateCardExecutionState(targetCardId, {
            responses: savedResponsesRef?.value || context.responses,
            context: {
              searches: context.searches,
              reviews: context.reviews
            }
          });
        }
      } else {
        // Error case
        updateCurrentParagraphStatus('error');
      }
    },
    
    onComplete: async (result) => {
      console.log('[AgentLoop] Complete:', result.success);
      
      // 確保當前段落的 skeleton 動畫被停止（處理 final_answer 不觸發 onToolEnd 的情況）
      if (currentTimelineParagraph) {
        updateCurrentParagraphStatus(result.success ? 'done' : 'error');
      }
      
      // Check if we need to spawn a child card
      if (result.spawnChild && result.childCardId) {
        console.log('[AgentLoop] Spawning child card loop:', result.childCardId);
        
        // Switch to child card
        const childCard = sessionState.cards.get(result.childCardId);
        if (childCard) {
          // Update current card reference
          currentCard = childCard;
          
          // Update UI
          renderBreadcrumb();
          renderCarousel();
          renderTodoSection(currentCard.tasks);
          
          // Clear and prepare for new query
          clearAgentProgress();
          
          // Small delay then start agent loop on child card
          setTimeout(async () => {
            const childCardId = result.childCardId;
            try {
              console.log('[AgentLoop] Starting child card agent loop:', result.childQuery);
              // 設定子卡片執行狀態
              cardExecutionState.set(childCardId, {
                isRunning: true,
                responses: [],
                timelineHTML: '',
                context: { searches: [], reviews: null }
              });
              const childSavedResponsesRef = { value: [] };
              const childResult = await runWithAgentLoop(result.childQuery, {
                targetCardId: childCardId,
                savedResponsesRef: childSavedResponsesRef
              });
              
              // 子卡片完成後更新卡片資料
              const childCard = sessionState.cards.get(childCardId);
              if (childCard && childResult.success) {
                childCard.responses = childSavedResponsesRef.value;
                childCard.finalAnswer = childResult.content;
                childCard.timestamp = Date.now();
                saveSession();
              }
            } catch (err) {
              console.error('[AgentLoop] Child card error:', err);
            } finally {
              // 清除子卡片執行狀態
              cardExecutionState.delete(childCardId);
              updateSiblingCards();
              renderCarousel();
            }
          }, 300);
          
          return; // Don't show suggested actions - new loop is starting
        }
      }
      
      // Show next steps section after completion
      setTimeout(() => {
        if (result.success) {
          showNextStepsSection();
          showSuggestedActions(result, currentSkill);
          
          // Image skill: 自動進入圖像生成流程
          if (currentSkill?.id === 'imageDesign' && currentConversation?.finalAnswer) {
            console.log('[AgentLoop] Image skill detected - auto-triggering image generation');
            setTimeout(() => handleBranchImage(), 300);
          }
        }
      }, 500);
    },
    
    onError: (error, context) => {
      console.error('[AgentLoop] Error:', error);
      // Update progress panel to show error - don't auto-hide to preserve error info
      updateAgentProgress('error', 'error', { 
        error: error.message,
        tool: context?.lastAction?.tool || 'unknown',
        iteration: context?.iteration || 0
      });
      // Do NOT auto-hide - let user see the error
      // The panel will be cleared on next query via clearAgentProgress()
    },
    
    onSkillSelected: (skill) => {
      console.log('[AgentLoop] Skill applied:', skill.id);
    }
  });
  
  // Apply skill
  if (currentSkill) {
    agentLoop.applySkill(currentSkill);
  }
  
  // Run the agent loop
  const result = await agentLoop.run(query, {
    skill: currentSkill,
    chairmanModel: chairmanModel
  });
  
  return result;
}

// ============================================
// Main Send Handler
// ============================================
async function handleSend() {
  const query = queryInput.value.trim();
  if (!query || councilModels.length === 0) {
    if (!query) return;
    showError('尚未選擇模型，請至設定頁面進行設定。');
    return;
  }

  // Check OpenRouter API Key
  const keyResult = await chrome.storage.sync.get('apiKey');
  if (!keyResult.apiKey) {
    showError('請先設定 OpenRouter API 金鑰。點擊右上角設定按鈕進行設定。');
    return;
  }

  // Vision mode validation
  if (visionMode) {
    if (!uploadedImage) {
      showError('請先上傳要分析的圖片');
      return;
    }
    
    // Check if at least some models support vision
    const visionModels = councilModels.filter(isVisionModel);
    if (visionModels.length === 0) {
      showError('所選模型都不支援圖片分析功能，請在設定中選擇支援 Vision 的模型');
      return;
    }
    
    // Check if chairman supports vision (optional warning)
    // 如果設定為互評勝者模式，主席將動態決定
    if (chairmanModel !== REVIEW_WINNER_VALUE && !isVisionModel(chairmanModel)) {
      console.warn('Chairman model does not support vision, will use text-only synthesis');
    }
  }

  // If we're in search iteration mode, execute the iteration flow
  if (isSearchIterationMode && pendingSearchKeyword) {
    await executeSearchIteration();
    return;
  }

  currentQuery = query;
  currentConversation = null;
  responses.clear();
  reviews.clear();
  reviewFailures.clear();
  activeTab = null;
  
  // Reset session cost for new conversation
  resetSessionCost();
  
  // Card system: Create or update card
  let activeCard = getCurrentCard();
  if (enableTaskPlanner) {
    if (!sessionState.id) {
      // Initialize new session
      initSession();
    }
    
    if (!activeCard || activeCard.finalAnswer) {
      // Create new card (either first card or new query on completed card)
      const parentId = activeCard?.id || null;
      activeCard = createCard(parentId, query);
      sessionState.currentCardId = activeCard.id;
      
      // If this is root card, set it
      if (!parentId) {
        sessionState.rootCardId = activeCard.id;
      }
    } else {
      // Update existing card's query
      activeCard.query = query;
    }
    
    // 防止同一張卡片重複執行
    if (cardExecutionState.get(activeCard.id)?.isRunning) {
      showToast('此卡片正在執行中，請等待完成或切換至其他卡片');
      return;
    }
    
    // 設定執行狀態（含完整結構以支援切換還原）
    console.log('[handleSend] Setting execution state for card:', activeCard.id);
    cardExecutionState.set(activeCard.id, { 
      isRunning: true,
      responses: [],
      timelineHTML: '',
      context: { searches: [], reviews: null }
    });
    console.log('[handleSend] cardExecutionState:', Array.from(cardExecutionState.entries()));
    updateSiblingCards();
    renderCarousel(); // 更新 carousel 顯示執行中狀態
  }
  
  // 記錄執行中的卡片 ID（用於 UI 更新檢查）
  const targetCardId = activeCard?.id || null;
  
  // Hide todo section while processing
  hideTodoSection();
  
  // Reset search iteration for new query
  searchIteration = 0;
  currentSearchQueries = [];
  searchStrategySection.classList.add('hidden');
  updateSearchIterationCounter();

  sendBtn.disabled = true;
  sendBtn.innerHTML = '<span class="spinner"></span><span>Council 執行中...</span>';
  emptyState.classList.add('hidden');
  errorBanner.classList.add('hidden');
  exportBtn.style.display = 'none';
  canvasSection.classList.add('hidden');
  hideBranchActions();

  // Clear summaries and prepare timeline
  clearAllSummaries();
  clearPlannerTimeline();
  hideNextStepsSection();
  showPlannerTimeline();

  let savedResponses = [];
  let aggregatedRanking = null;
  let finalAnswerContent = '';
  
  // Reference for passing to callbacks
  const savedResponsesRef = { value: [] };

  try {
    // Initialize Agent Framework if needed
    initAgentFramework();
    
    // =========================================
    // Agent Framework Flow (new)
    // =========================================
    if (useAgentFramework && window.MAVAgent && window.MAVTools) {
      console.log('[handleSend] Using Agent Framework');
      
      const result = await runWithAgentLoop(query, {
        targetCardId,
        savedResponsesRef
      });
      
      if (result.success) {
        finalAnswerContent = result.content;
        savedResponses = savedResponsesRef.value;
        
        // Agent Framework handles search via web_search tool
        // Use suggested actions panel for non-blocking extended search option
        
        // Store search queries for suggested actions if available
        const allSuggestions = extractAllSearchSuggestions(savedResponses);
        if (allSuggestions.some(s => s.queries.length > 0)) {
          currentSearchQueries = allSuggestions.flatMap(s => s.queries).slice(0, 5);
          console.log('[AgentFramework] Search queries for suggested actions:', currentSearchQueries);
        }
        
        // Update card with results (Agent Framework 完成後更新卡片)
        if (enableTaskPlanner && activeCard) {
          activeCard.responses = savedResponses;
          activeCard.finalAnswer = finalAnswerContent;
          activeCard.timestamp = Date.now();
          activeCard.chairmanModel = chairmanModel;
          
          console.log('[AgentFramework] Updated card:', activeCard.id, 'hasAnswer:', !!activeCard.finalAnswer);
          
          // 立即保存 session（確保切換卡片時資料已持久化）
          saveSession();
          
          // 生成脈絡摘要供子卡片繼承（非阻塞）
          generateContextSummary(query, finalAnswerContent).then(summary => {
            if (summary && activeCard) {
              activeCard.contextSummary = summary;
              console.log('[AgentFramework] Generated context summary for card:', activeCard.id);
              saveSession();
            }
          });
          
          // Update breadcrumb and carousel
          updateBreadcrumb(activeCard.id);
          updateSiblingCards();
          renderCarousel();
        }
        
        // Show branch actions and export button
        showBranchActions();
        exportBtn.style.display = 'flex';
        
      } else {
        throw new Error(result.error || 'Agent Framework execution failed');
      }
    } 
    // =========================================
    // Legacy Flow (已棄用 - 改用 Agent Framework)
    // =========================================
    else {
      console.error('[handleSend] Legacy flow is deprecated. Stage elements have been removed.');
      console.error('[handleSend] Please ensure useAgentFramework is true and Agent Framework is loaded.');
      showError('舊版流程已棄用，請確認 Agent Framework 已正確載入。');
      resetButton();
      return;

      // Build prompt with context if available
      let promptWithContext = buildPromptWithContext(query);
      
      // 總是要求模型提供搜尋建議
      promptWithContext += COUNCIL_SEARCH_SUFFIX;
      
      await Promise.allSettled(councilModels.map(model => queryModel(model, promptWithContext)));
      
      const successfulResponses = Array.from(responses.entries())
        .filter(([_, r]) => r.status === 'done')
        .map(([model, r]) => ({ model, content: r.content, latency: r.latency }));

      savedResponses = successfulResponses;
      stage1Status.textContent = `${successfulResponses.length}/${councilModels.length} 完成`;
      stage1Status.classList.remove('loading');
      stage1Status.classList.add('done');
      
      // Update stepper: Stage 1 done
      setStepDone(1);
      
      // Update Stage 1 summary
      updateStage1Summary(successfulResponses.map(r => ({ ...r, status: 'done' })));

      document.getElementById('stage1Content').classList.remove('expanded');
      stage1Section.classList.add('collapsed');

      if (successfulResponses.length < 2) {
        showError('Council 需要至少 2 個模型成功回應。');
        resetButton();
        return;
      }

      // === STAGE 2 ===
      if (enableReview && successfulResponses.length >= 2) {
        currentStage = 'stage2';
        // Update stepper: Stage 2 active
        setStepActive(2);
        
        stage2Status.textContent = '審查中...';
        stage2Status.classList.add('loading');
        document.getElementById('stage2Content').classList.add('expanded');

        reviewResults.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">模型正在互相審查...</span></div>`;

        await Promise.allSettled(councilModels.map(model => runReview(model, query, successfulResponses)));

        aggregatedRanking = aggregateRankings(successfulResponses);
        renderReviewResults(aggregatedRanking);

        stage2Status.textContent = t('sidepanel.stageComplete');
        stage2Status.classList.remove('loading');
        stage2Status.classList.add('done');
        
        // Update stepper: Stage 2 done
        setStepDone(2);
        
        // Update Stage 2 summary
        updateStage2Summary(aggregatedRanking);
        
        document.getElementById('stage2Content').classList.remove('expanded');
        stage2Section.classList.add('collapsed');
      } else {
        stage2Section.classList.add('stage-skipped');
        stage2Status.textContent = t('sidepanel.stageSkipped');
        reviewResults.innerHTML = '<div class="skipped-message">互評審查已停用</div>';
        
        // Update stepper: Stage 2 skipped
        setStepSkipped(2);
      }

      // === STAGE 3: Search Suggestions (僅當有建議時顯示) ===
      let searchResults = null;
      // 提取所有模型的搜尋建議
      const allSuggestions = extractAllSearchSuggestions(responses);
      
      if (allSuggestions.some(s => s.queries.length > 0)) {
        // 有搜尋建議，顯示 Stage 3 讓用戶選擇
        const userAction = await showStage25AndWaitForAction(allSuggestions);
        
        if (userAction.action === 'search' && userAction.queries.length > 0) {
          // Execute search
          stage25Status.textContent = '搜尋中...';
          stage25Status.className = 'stage-status loading';
          
          try {
            searchResults = await executeMultipleSearches(userAction.queries.slice(0, 3));
            searchIteration++;
            updateSearchIterationCounter();
            
            stage25Status.textContent = t('sidepanel.stageComplete');
            stage25Status.className = 'stage-status done';
            stage25Section.classList.add('collapsed');
            
            // Add search results to context (auto scope: root → session, subtask → card)
            if (searchResults && searchResults.length > 0) {
              for (const r of searchResults) {
                if (contextItems.length < 20) {
                  await addContextItem({
                    title: `搜尋: ${r.query}`,
                    content: r.results.map(item => `${item.title}\n${item.snippet}`).join('\n\n'),
                    url: '',
                    type: 'search'
                  }); // Uses 'auto' scope
                }
              }
            }
          } catch (searchErr) {
            console.error('Search failed:', searchErr);
            stage25Status.textContent = '搜尋失敗';
            stage25Status.className = 'stage-status error';
            showToast('搜尋失敗，將繼續生成結論', true);
          }
        } else {
          // User skipped search
          stage25Section.classList.add('collapsed');
        }
      } else {
        // No suggestions from models, hide stage 3
        stage25Section.classList.add('hidden');
      }

      // === STAGE 3 ===
      currentStage = 'stage3';
      // Update stepper: Stage 3 active
      setStepActive(3);
      
      // 決定實際使用的主席模型
      const actualChairman = resolveChairmanModel(aggregatedRanking, successfulResponses);
      
      // Update Stage 3 summary
      updateStage3Summary(actualChairman);
      
      stage3Status.textContent = '彙整中...';
      stage3Status.classList.add('loading');
      document.getElementById('stage3Content').classList.add('expanded');

      finalAnswer.innerHTML = `
        <div class="chairman-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          ${getModelName(actualChairman)}
        </div>
        <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">主席正在彙整...</span></div>
      `;

      try {
        finalAnswerContent = await runChairman(query, successfulResponses, aggregatedRanking, enableSearchMode, targetCardId, searchResults);

      stage3Status.textContent = t('sidepanel.stageComplete');
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('done');
      
      // Update stepper: All done
      setAllStepsDone();

      // Show branch actions (replaces old canvas section)
      showBranchActions();
      
      // Show conversation cost summary
      renderConversationCost();

      // Save conversation first (without images)
      await saveCurrentConversation({
        query,
        models: councilModels,
        chairmanModel: actualChairman,
        responses: savedResponses,
        ranking: aggregatedRanking,
        finalAnswer: finalAnswerContent,
        generatedImages: []
      });
      
      // Update card with results
      if (enableTaskPlanner && activeCard) {
        activeCard.responses = savedResponses;
        activeCard.finalAnswer = finalAnswerContent;
        activeCard.timestamp = Date.now();
        
        // 生成脈絡摘要供子卡片繼承（非阻塞）
        generateContextSummary(query, finalAnswerContent).then(summary => {
          if (summary && activeCard) {
            activeCard.contextSummary = summary;
            console.log('[handleSend] Generated context summary for card:', activeCard.id);
            // 儲存 session
            saveSession();
          }
        });
        
        // Update breadcrumb and carousel
        updateBreadcrumb(activeCard.id);
        updateSiblingCards();
        renderCarousel();
      }

      exportBtn.style.display = 'flex';
    } catch (err) {
      stage3Status.textContent = '失敗';
      stage3Status.classList.remove('loading');
      stage3Status.classList.add('error');
      showToast(`主席彙整失敗: ${err.message}`, true);
      resetButton();
      return;
    }
    } // End of legacy flow else block

    // === IMAGE GENERATION (if enabled) ===
    if (enableImage && finalAnswerContent) {
      currentStage = 'imageGen';
      // Show loading while AI generates prompts
      const promptLoadingEl = document.createElement('div');
      promptLoadingEl.className = 'image-prompt-loading';
      promptLoadingEl.innerHTML = `
        <div class="loading-header">
          <div class="loading-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </div>
          <div class="loading-info">
            <div class="loading-title">AI 正在分析內容，規劃圖像構圖</div>
            <div class="loading-subtitle">分析文字內容並設計視覺呈現方式</div>
          </div>
        </div>
        <div class="skeleton-preview"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
        </div>
        <div class="loading-hint">
          <span class="spinner-small"></span>
          <span>約需 10-30 秒</span>
        </div>
      `;
      getImageContainer()?.appendChild(promptLoadingEl);
      
      // Phase 1: Generate prompts with AI (now supports multiple images)
      const aiResult = await generateImagePromptWithAI(query, finalAnswerContent, savedResponses);
      promptLoadingEl.remove();
      
      if (!aiResult.success) {
        showToast('AI Prompt 生成失敗，使用預設模式', true);
      } else if (aiResult.imageCount > 1) {
        showToast(`AI 識別到 ${aiResult.imageCount} 張圖片規劃`);
      }
      
      // Helper function to handle image generation callbacks
      const onImageGenComplete = async (generatedImages) => {
        // Update saved conversation with image metadata (not base64 data to avoid quota)
        if (currentConversation && generatedImages.length > 0) {
          // Only store prompts and titles, not the actual image data
          currentConversation.imagePrompts = generatedImages.map(g => ({
            title: g.title,
            prompt: g.prompt
          }));
          
          const result = await chrome.storage.local.get('conversations');
          const conversations = result.conversations || [];
          const idx = conversations.findIndex(c => c.id === currentConversation.id);
          if (idx >= 0) {
            conversations[idx] = currentConversation;
            await safeStorageSet({ conversations });
          }
        }
        
        // 更新卡片的圖片資料並保存 session
        if (activeCard && generatedImages.length > 0) {
          activeCard.generatedImages = generatedImages.map(g => ({
            title: g.title,
            prompt: g.prompt,
            timestamp: Date.now()
          }));
          console.log('[handleSend:ImageGen] Updated card with', generatedImages.length, 'images');
          saveSession();
        }
        
        // Show Vision button now that images are generated
        if (branchVisionBtn && generatedImages.length > 0) {
          branchVisionBtn.classList.remove('hidden');
        }
      };
      
      // Phase 2: Show style selection UI
      const startImageStyleSelection = (result) => {
        showStyleSelectionUI(
          result,
          async (selectedStyle, editedGlobalContext, paradigmSelections) => {
            // Update result with edited global context and paradigm selections
            const updatedResult = {
              ...result,
              globalContext: editedGlobalContext,
              paradigmSelections: paradigmSelections || {}
            };
            
            // Show loading for style integration
            const integratingEl = document.createElement('div');
            integratingEl.className = 'image-prompt-loading';
            integratingEl.innerHTML = `
              <div class="loading-header">
                <div class="loading-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                  </svg>
                </div>
                <div class="loading-info">
                  <div class="loading-title">正在將風格融入圖像</div>
                  <div class="loading-subtitle">結合選定風格，優化 prompt 細節</div>
                </div>
              </div>
              <div class="skeleton-preview"></div>
              <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line"></div>
              </div>
              <div class="loading-hint">
                <span class="spinner-small"></span>
                <span>約需 5-15 秒</span>
              </div>
            `;
            getImageContainer()?.appendChild(integratingEl);
            
            // Phase 3: Integrate style into prompts
            const integratedResult = await integrateStyleIntoPrompts(updatedResult, selectedStyle, editedGlobalContext);
            integratingEl.remove();
            
            // Phase 4: Show preview textarea
            showPromptPreview(
              integratedResult,
              (finalResult) => {
                // Phase 5: Proceed to multi-image editor
                showMultiImageEditor(
                  finalResult, 
                  onImageGenComplete, 
                  () => {
                    showToast('已關閉圖像編輯器');
                  },
                  () => {
                    // Back to style selection from multi-image editor
                    startImageStyleSelection(result);
                  }
                );
              },
              () => {
                // Back to style selection from preview
                startImageStyleSelection(result);
              },
              () => {
                showToast('已取消圖像生成');
              }
            );
          },
          () => {
            showToast('已取消圖像生成');
          }
        );
      };
      
      startImageStyleSelection(aiResult);
    }

  } catch (err) {
    console.error('Council error:', err);
    showError(err.message);
  }

  // 清除執行狀態
  if (targetCardId) {
    cardExecutionState.delete(targetCardId);
    updateSiblingCards();
    renderCarousel();
  }

  resetButton();
}

function resetButton() {
  sendBtn.disabled = false;
  sendBtn.classList.remove('next-iteration');
  sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
}

// 同步卡片設定到 UI toggles
function syncCardSettingsToUI(settings) {
  if (!settings) return;
  
  // When switching cards, clear the uploaded image from previous card
  // Each card should start fresh unless it has its own image data
  // Note: In future, we could store uploadedImage per-card if needed
  if (uploadedImage !== null) {
    clearUploadedImage();
    console.log('[syncCardSettingsToUI] Cleared previous card uploaded image');
  }
  
  // 更新全域變數
  enableImage = settings.enableImage || false;
  enableSearchMode = settings.enableSearchMode || false;
  
  // Vision mode: only enable if explicitly set and user wants to upload new image
  // Don't auto-enable vision mode when switching cards
  visionMode = false;
  
  // 更新 UI toggles
  if (imageToggle) {
    imageToggle.checked = enableImage;
  }
  if (searchModeToggle) {
    searchModeToggle.checked = enableSearchMode;
  }
  if (visionToggle) {
    visionToggle.checked = visionMode;
  }
  
  // Vision upload section: always hide when switching cards (user can enable via skill selector)
  if (visionUploadSection) {
    visionUploadSection.classList.add('hidden');
  }
  
  // Reset skill selector state when switching cards
  userSelectedSkill = null;
  detectedSkill = null;
  
  // Update skill selector display based on settings
  if (skillSelectorUI) {
    // Determine which skill matches these settings
    let matchingSkill = null;
    if (enableImage) {
      matchingSkill = window.MAVSkills?.SKILLS?.imageDesign;
    } else if (enableSearchMode) {
      matchingSkill = window.MAVSkills?.SKILLS?.researcher;
    }
    
    if (matchingSkill) {
      skillSelectorUI.updateDisplay(matchingSkill, 'auto');
    } else {
      skillSelectorUI.updateDisplay(null, null);
    }
  }
  
  console.log('[syncCardSettingsToUI] Settings synced:', {
    enableImage,
    enableSearchMode,
    visionMode
  });
}

// 從 UI toggles 獲取當前設定
function getCurrentSettingsFromUI() {
  return {
    enableImage: enableImage,
    enableSearchMode: enableSearchMode,
    visionMode: visionMode
  };
}

// 更新當前卡片的設定
function updateCurrentCardSettings() {
  if (!enableTaskPlanner) return;
  
  const currentCard = getCurrentCard();
  if (currentCard) {
    currentCard.settings = getCurrentSettingsFromUI();
    console.log('[updateCurrentCardSettings] Updated card settings:', currentCard.id, currentCard.settings);
  }
}

// 根據當前卡片的執行狀態更新按鈕
function updateSendButtonForCurrentCard() {
  // 檢查是否在 task planner 模式
  if (!enableTaskPlanner) {
    // 非 task planner 模式不處理
    return;
  }
  
  const currentCard = getCurrentCard();
  if (!currentCard) {
    resetButton();
    return;
  }
  
  const isRunning = cardExecutionState.get(currentCard.id)?.isRunning;
  console.log('[CardSwitch] Card:', currentCard.id, 'isRunning:', isRunning);
  
  if (isRunning) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<span class="spinner"></span><span>此卡片執行中...</span>';
  } else {
    // 此卡片未執行，啟用按鈕
    sendBtn.disabled = false;
    sendBtn.innerHTML = '<span>送出</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>';
  }
}

function renderTabs() {
  if (!modelTabs) return; // Timeline 系統不使用 tabs
  // Always use scrollable tabs
  modelTabs.innerHTML = councilModels.map(model => {
    const info = getModelInfo(model);
    const imgBadge = isImageModel(model) && enableImage ? '<span class="model-badge-image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>IMG</span>' : '';
    return `<button class="tab" data-model="${model}" title="${info.provider}">${info.name}${imgBadge}<span class="status-dot"></span></button>`;
  }).join('');
  modelTabs.querySelectorAll('.tab').forEach(tab => { tab.addEventListener('click', () => setActiveTab(tab.dataset.model)); });
}

function renderResponsePanels() {
  if (!responseContainer) return; // Timeline 系統不使用 response container
  responseContainer.innerHTML = councilModels.map(model => `
    <div class="response-panel" data-model="${model}">
      <div class="response-content" id="content-${cssEscape(model)}">
        <div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">等待中...</span></div>
      </div>
      <div class="response-meta" id="meta-${cssEscape(model)}"></div>
    </div>
  `).join('');
}

function setActiveTab(model) {
  activeTab = model;
  if (!modelTabs || !responseContainer) return; // Timeline 系統不使用 tabs
  modelTabs.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('active', tab.dataset.model === model));
  responseContainer.querySelectorAll('.response-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.model === model));
  
  // Scroll active tab into view
  const activeTabEl = modelTabs.querySelector('.tab.active');
  if (activeTabEl) {
    activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
}

function updateTabStatus(model, status) {
  if (!modelTabs) return; // Timeline 系統不使用 tabs
  const tab = modelTabs.querySelector(`.tab[data-model="${model}"]`);
  if (tab) {
    const dot = tab.querySelector('.status-dot');
    if (dot) dot.className = `status-dot ${status}`;
  }
}

// Retry a failed query for a specific model
async function retryQuery(model) {
  if (!currentQuery) {
    showToast('無法重試：找不到原始查詢', true);
    return;
  }
  
  showToast(`正在重試 ${getModelName(model)}...`);
  
  try {
    const promptWithContext = buildPromptWithContext(currentQuery);
    await queryModel(model, promptWithContext);
    showToast(`${getModelName(model)} 重試成功`);
  } catch (err) {
    showToast(`${getModelName(model)} 重試失敗: ${err.message}`, true);
  }
}

// Make retryQuery available globally for onclick handlers
window.retryQuery = retryQuery;

function updateResponseContent(model, html) {
  const el = document.getElementById(`content-${cssEscape(model)}`);
  if (el) el.innerHTML = html + '<span class="cursor"></span>';
}

function finalizeResponse(model, content, latency) {
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  const metaEl = document.getElementById(`meta-${cssEscape(model)}`);
  if (!contentEl || !metaEl) return;
  const cursor = contentEl.querySelector('.cursor');
  if (cursor) cursor.remove();
  const cost = calculateCost(model, estimateTokens(currentQuery), estimateTokens(content));
  metaEl.innerHTML = `
    <span class="meta-item">${(latency / 1000).toFixed(2)}s</span>
    <span class="meta-item">~${estimateTokens(content)} tokens</span>
    <span class="meta-item">${formatCost(cost.total)}</span>
    <button class="copy-response-btn" data-content="${escapeAttr(content)}" title="複製回應">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>複製</span>
    </button>
  `;
  metaEl.classList.add('visible');
  
  // Add copy handler
  metaEl.querySelector('.copy-response-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const text = btn.dataset.content;
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');
      btn.querySelector('span').textContent = '已複製！';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('span').textContent = '複製';
      }, 1500);
    } catch (err) {
      showToast('複製失敗', true);
    }
  });
}

function escapeAttr(text) {
  return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function queryModel(model, query) {
  const startTime = Date.now();
  const parser = createStreamingParser();
  const shouldGenerateImage = enableImage && isImageModel(model);
  const isVisionQuery = visionMode && uploadedImage && isVisionModel(model);
  
  responses.set(model, { content: '', status: 'loading', latency: 0, images: [] });
  updateTabStatus(model, 'loading');
  const contentEl = document.getElementById(`content-${cssEscape(model)}`);
  
  if (shouldGenerateImage) {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">使用 ${getModelName(model)} 生成圖片中...</span></div><div class="image-generating"><div class="spinner-large"></div><span>建立視覺內容中...</span></div>`;
  } else if (isVisionQuery) {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">使用 ${getModelName(model)} 分析圖片...</span></div><div class="vision-stage-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Vision 分析中</div>`;
  } else {
    if (contentEl) contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">連線至 ${getModelName(model)}...</span></div>`;
  }

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    const timeoutMs = isVisionQuery ? 150000 : 60000; // 2.5 min for vision, 1 min for text
    
    await new Promise((resolve, reject) => {
      let content = '';
      let images = [];
      let timeoutId = null;
      let resolved = false;
      
      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        resolved = true;
      };
      
      // Timeout handler
      timeoutId = setTimeout(() => {
        if (!resolved) {
          cleanup();
          responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
          updateTabStatus(model, 'error');
          if (contentEl) {
            contentEl.innerHTML = `
              <div class="error-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>請求超時，請稍後再試</p>
                <button class="retry-btn" onclick="retryQuery('${escapeHtml(model)}')">重試</button>
              </div>`;
          }
          try { port.disconnect(); } catch (e) {}
          reject(new Error('Request timeout'));
        }
      }, timeoutMs);
      
      // Handle unexpected port disconnect
      port.onDisconnect.addListener(() => {
        if (!resolved) {
          cleanup();
          const error = chrome.runtime.lastError?.message || '連線中斷';
          responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
          updateTabStatus(model, 'error');
          if (contentEl) {
            contentEl.innerHTML = `
              <div class="error-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>連線中斷：${escapeHtml(error)}</p>
                <button class="retry-btn" onclick="retryQuery('${escapeHtml(model)}')">重試</button>
              </div>`;
          }
          reject(new Error(error));
        }
      });
      
      port.onMessage.addListener((msg) => {
        // Reset timeout on any message
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (!resolved) {
              cleanup();
              responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
              updateTabStatus(model, 'error');
              if (contentEl) {
                contentEl.innerHTML = `
                  <div class="error-state">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>請求超時，請稍後再試</p>
                    <button class="retry-btn" onclick="retryQuery('${escapeHtml(model)}')">重試</button>
                  </div>`;
              }
              try { port.disconnect(); } catch (e) {}
              reject(new Error('Request timeout'));
            }
          }, timeoutMs);
        }
        
        if (msg.type === 'PROGRESS') {
          // Update loading indicator with progress message
          if (contentEl) {
            contentEl.innerHTML = `<div class="loading-indicator"><div class="loading-dots"><span></span><span></span><span></span></div><span class="loading-text">${escapeHtml(msg.message)}</span></div>`;
          }
        } else if (msg.type === 'CHUNK') { 
          content += msg.content; 
          updateResponseContent(model, parser.append(msg.content)); 
        }
        else if (msg.type === 'DONE') {
          cleanup();
          const latency = Date.now() - startTime;
          images = msg.images || [];
          responses.set(model, { content, status: 'done', latency, images });
          updateTabStatus(model, 'done');
          
          const el = document.getElementById(`content-${cssEscape(model)}`);
          if (el) {
            el.innerHTML = parseMarkdown(content);
            if (images.length > 0) {
              renderImages(images, el);
            }
          }
          finalizeResponse(model, content, latency);
          
          // Track cost from usage data if available
          if (msg.usage) {
            addToSessionCost(model, msg.usage.prompt_tokens || 0, msg.usage.completion_tokens || 0);
          }
          
          try { port.disconnect(); } catch (e) {}
          resolve();
        } else if (msg.type === 'ERROR') {
          cleanup();
          responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
          updateTabStatus(model, 'error');
          if (contentEl) {
            contentEl.innerHTML = `
              <div class="error-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>${escapeHtml(msg.error)}</p>
                <button class="retry-btn" onclick="retryQuery('${escapeHtml(model)}')">重試</button>
              </div>`;
          }
          try { port.disconnect(); } catch (e) {}
          reject(new Error(msg.error));
        }
      });
      
      // Build messages based on mode
      let messages;
      if (isVisionQuery) {
        messages = [buildVisionMessage(query, uploadedImage.dataUrl)];
      } else {
        messages = [{ role: 'user', content: query }];
      }
      
      port.postMessage({ 
        type: 'QUERY_MODEL_STREAM', 
        payload: { 
          model, 
          messages,
          enableImage: shouldGenerateImage,
          visionMode: isVisionQuery
        } 
      });
    });
  } catch (err) {
    responses.set(model, { content: '', status: 'error', latency: 0, images: [] });
    updateTabStatus(model, 'error');
  }
}

async function runReview(reviewerModel, query, allResponses) {
  // Use vision-specific review prompt if in vision mode
  const prompt = visionMode && uploadedImage
    ? generateVisionReviewPrompt(query, allResponses, reviewerModel, visionReviewDepth !== 'simple')
    : generateReviewPrompt(query, allResponses, reviewerModel);
  if (!prompt) return;
  try {
    const result = await queryModelNonStreaming(reviewerModel, prompt);
    const parseResult = parseReviewResponse(result);
    
    if (parseResult.error) {
      // Track failure for potential retry
      reviewFailures.set(reviewerModel, { 
        error: parseResult.error, 
        raw: parseResult.raw,
        query,
        allResponses
      });
      console.error(`Review parsing failed for ${reviewerModel}:`, parseResult.error);
      showToast(`${getModelName(reviewerModel)} 審查解析失敗`, true);
      return;
    }
    
    // Success - clear any previous failure
    reviewFailures.delete(reviewerModel);
    const otherModels = allResponses.filter(r => r.model !== reviewerModel).map(r => r.model);
    reviews.set(reviewerModel, parseResult.rankings.map(r => ({ 
      model: otherModels[r.response.charCodeAt(0) - 65], 
      rank: r.rank, 
      reason: r.reason 
    })));
  } catch (err) { 
    console.error(`Review by ${reviewerModel} failed:`, err);
    reviewFailures.set(reviewerModel, {
      error: `API 呼叫失敗: ${err.message}`,
      raw: '',
      query,
      allResponses
    });
    showToast(`${getModelName(reviewerModel)} 審查失敗: ${err.message}`, true);
  }
}

function aggregateRankings(allResponses) {
  const scores = {};
  allResponses.forEach(r => { scores[r.model] = { totalRank: 0, count: 0 }; });
  reviews.forEach((rankings) => { rankings.forEach(r => { if (scores[r.model]) { scores[r.model].totalRank += r.rank; scores[r.model].count += 1; } }); });
  return Object.entries(scores).filter(([_, v]) => v.count > 0).map(([model, v]) => ({ model, avgRank: v.totalRank / v.count })).sort((a, b) => a.avgRank - b.avgRank);
}

function renderReviewResults(ranking) {
  if (!ranking || ranking.length === 0) { reviewResults.innerHTML = '<div class="skipped-message">無審查資料</div>'; return; }
  const rankingHtml = ranking.map((r, i) => `<div class="ranking-item rank-${i + 1}"><span class="rank-badge">${i + 1}</span><span class="ranking-model">${getModelName(r.model)}</span><span class="ranking-score">${r.avgRank.toFixed(1)}</span></div>`).join('');
  const reasons = [];
  reviews.forEach((rankings, reviewer) => { rankings.forEach(r => { if (r.reason) reasons.push({ reviewer: getModelName(reviewer), model: getModelName(r.model), reason: r.reason }); }); });
  const reasonsHtml = reasons.length > 0 ? `<div class="review-detail collapsed"><div class="review-detail-header"><div class="review-detail-title"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>審查評語 (${reasons.length})</div><div class="review-detail-toggle"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg></div></div><div class="review-reasons">${reasons.slice(0, 6).map(r => `<div class="review-reason"><strong>${r.model}:</strong> ${escapeHtml(r.reason)}</div>`).join('')}</div></div>` : '';
  
  // Hint explaining average score
  const hintHtml = `<div class="review-hint"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>分數 = 各模型互評排名的平均值，越低越優（作為主席彙整的參考）</div>`;
  
  // Show failures if any
  let failuresHtml = '';
  if (reviewFailures.size > 0) {
    const failureItems = Array.from(reviewFailures.entries()).map(([model, info]) => `
      <div class="review-failure-item">
        <div class="failure-header">
          <span class="failure-model">${getModelName(model)}</span>
          <span class="failure-error">${escapeHtml(info.error)}</span>
        </div>
        <button class="retry-review-btn" data-model="${model}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重試
        </button>
      </div>
    `).join('');
    failuresHtml = `<div class="review-failures"><div class="review-failures-title">審查失敗 (${reviewFailures.size})</div>${failureItems}</div>`;
  }
  
  reviewResults.innerHTML = `<div class="review-summary"><div class="ranking-list">${rankingHtml}</div>${hintHtml}</div>${reasonsHtml}${failuresHtml}`;
  
  // Add toggle handler for review detail
  const reviewDetail = reviewResults.querySelector('.review-detail');
  if (reviewDetail) {
    const detailHeader = reviewDetail.querySelector('.review-detail-header');
    detailHeader?.addEventListener('click', () => {
      reviewDetail.classList.toggle('collapsed');
    });
  }
  
  // Add retry handlers
  reviewResults.querySelectorAll('.retry-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const model = btn.dataset.model;
      const failureInfo = reviewFailures.get(model);
      if (!failureInfo) return;
      
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span> 重試中...';
      
      await runReview(model, failureInfo.query, failureInfo.allResponses);
      
      // Re-aggregate and re-render
      const successfulResponses = failureInfo.allResponses;
      const newRanking = aggregateRankings(successfulResponses);
      renderReviewResults(newRanking);
      updateStage2Summary(newRanking);
    });
  });
}

async function runChairman(query, allResponses, aggregatedRanking, withSearchMode = false, executingCardId = null, searchResultsFromStage25 = null, chairmanOverride = null) {
  // 決定實際使用的主席模型
  // chairmanOverride 優先於 resolveChairmanModel 的結果（用於互評勝者動態切換）
  const actualChairman = chairmanOverride || resolveChairmanModel(aggregatedRanking, allResponses);
  
  // Use vision-specific chairman prompt if in vision mode
  let prompt = visionMode && uploadedImage
    ? generateVisionChairmanPrompt(query, allResponses, aggregatedRanking)
    : generateChairmanPrompt(query, allResponses, aggregatedRanking);
  
  // Include search results from Stage 2.5 if available
  if (searchResultsFromStage25 && searchResultsFromStage25.length > 0) {
    const searchContext = searchResultsFromStage25.map(sr => 
      `### 搜尋「${sr.query}」結果\n${sr.results.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`).join('\n\n')}`
    ).join('\n\n---\n\n');
    
    prompt = prompt.replace('## Your Task', `## 網路搜尋結果\n以下是根據模型建議執行的網路搜尋結果，請參考這些最新資訊：\n\n${searchContext}\n\n## Your Task`);
  }
  
  // Append search strategy suffix if search mode is enabled and not at max iterations
  if (withSearchMode && searchIteration < maxSearchIterations) {
    prompt += SEARCH_STRATEGY_SUFFIX;
  }
  
  const parser = createStreamingParser();
  let finalContent = '';
  const isVisionChairman = visionMode && uploadedImage && isVisionModel(actualChairman);

  try {
    const port = chrome.runtime.connect({ name: 'stream' });
    await new Promise((resolve, reject) => {
      let content = '';
      let started = false;
      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          // 只有當前顯示的卡片才更新 UI
          const isCurrentCard = !executingCardId || executingCardId === sessionState.currentCardId;
          if (!started) { 
            started = true; 
            if (isCurrentCard && finalAnswer) {
              const visionBadge = isVisionChairman ? '<span class="vision-stage-badge" style="margin-left: 0.5rem; font-size: 0.625rem;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Vision</span>' : '';
              finalAnswer.innerHTML = `<div class="chairman-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>${getModelName(actualChairman)}${visionBadge}</div><div class="response-content"></div>`; 
            }
          }
          content += msg.content;
          if (isCurrentCard && finalAnswer) {
            const responseEl = finalAnswer.querySelector('.response-content');
            if (responseEl) responseEl.innerHTML = parser.append(msg.content) + '<span class="cursor"></span>';
          }
        } else if (msg.type === 'DONE') {
          finalContent = content;
          
          // Track cost from usage data if available
          if (msg.usage) {
            addToSessionCost(actualChairman, msg.usage.prompt_tokens || 0, msg.usage.completion_tokens || 0);
          }
          
          // Parse tasks from response if task planner is enabled
          let parsedTasks = { success: false, tasks: [] };
          if (enableTaskPlanner) {
            parsedTasks = parseTasksFromResponse(content);
          }
          
          // 儲存 tasks 到執行中的卡片（不論是否為當前顯示卡片）
          if (enableTaskPlanner && parsedTasks.success && parsedTasks.tasks.length > 0) {
            const executingCard = executingCardId ? sessionState.cards.get(executingCardId) : null;
            if (executingCard) {
              executingCard.tasks = parsedTasks.tasks;
            }
          }
          
          // 只有當前顯示的卡片才更新 UI
          const isCurrentCard = !executingCardId || executingCardId === sessionState.currentCardId;
          
          if (isCurrentCard && finalAnswer) {
            const el = finalAnswer.querySelector('.response-content');
            
            // If search mode is enabled, extract and display search strategies
            if (withSearchMode) {
              const searchQueries = parseSearchQueries(content);
              let cleanContent = extractFinalAnswer(content);
              // Also remove task JSON for display
              if (enableTaskPlanner) {
                cleanContent = extractFinalAnswerDisplay(cleanContent);
              }
              if (el) el.innerHTML = parseMarkdown(cleanContent);
              
              // 只要搜尋模式啟用且未達上限，就顯示搜尋模組
              if (searchIteration < maxSearchIterations) {
                renderSearchStrategies(searchQueries);
              }
            } else {
              // Remove task JSON for display
              let displayContent = enableTaskPlanner ? extractFinalAnswerDisplay(content) : content;
              if (el) el.innerHTML = parseMarkdown(displayContent);
            }
            
            // Render tasks section if tasks were parsed
            if (enableTaskPlanner && parsedTasks.success && parsedTasks.tasks.length > 0) {
              renderTodoSection(parsedTasks.tasks);
            }
          }
          
          port.disconnect();
          resolve();
        } else if (msg.type === 'ERROR') {
          // 只有當前顯示的卡片才更新 UI
          const isCurrentCard = !executingCardId || executingCardId === sessionState.currentCardId;
          if (isCurrentCard && finalAnswer) {
            finalAnswer.innerHTML = `<div class="error-state"><p>Chairman failed: ${escapeHtml(msg.error)}</p></div>`;
          }
          port.disconnect();
          reject(new Error(msg.error));
        }
      });
      
      // Build messages - include image for vision chairman
      let messages;
      if (isVisionChairman) {
        messages = [buildVisionMessage(prompt, uploadedImage.dataUrl)];
      } else {
        messages = [{ role: 'user', content: prompt }];
      }
      
      port.postMessage({ 
        type: 'QUERY_MODEL_STREAM', 
        payload: { 
          model: actualChairman, 
          messages,
          visionMode: isVisionChairman
        } 
      });
    });
  } catch (err) {
    console.error('Chairman error:', err);
    // 只有當前顯示的卡片才更新 UI
    const isCurrentCard = !executingCardId || executingCardId === sessionState.currentCardId;
    if (isCurrentCard && finalAnswer) {
      finalAnswer.innerHTML = `<div class="error-state"><p>主席彙整失敗: ${escapeHtml(err.message)}</p></div>`;
    }
    throw err;
  }

  return finalContent;
}

async function queryModelNonStreaming(model, prompt, trackCost = true) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'QUERY_MODEL', payload: { model, messages: [{ role: 'user', content: prompt }] } }, (response) => {
      if (response?.error) reject(new Error(response.error));
      else {
        // Track cost if usage data available
        if (trackCost && response?.usage) {
          addToSessionCost(
            model, 
            response.usage.prompt_tokens || 0, 
            response.usage.completion_tokens || 0,
            'imageGen'  // AI prompt generation is part of image generation flow
          );
        }
        resolve(response?.choices?.[0]?.message?.content || '');
      }
    });
  });
}

// AI-based multi-image prompt generation with Paradigmatic Axes (符號學兩軸論)
const IMAGE_PROMPT_SYSTEM = `你是視覺設計專家和圖像生成 Prompt 工程師。根據提供的內容，運用符號學兩軸論（索緒爾理論）分析主題並生成結構化的圖像描述。

## 符號學兩軸論核心概念

### 毗鄰軸（Syntagmatic Axis）
完整的 prompt 是由多個系譜軸選項組合而成的橫向語意結構：
角色描述 + 場景描述 + 物件描述 + 構圖指令 + 風格描述 = 完整 Prompt

### 系譜軸（Paradigmatic Axis）
每個敘事元素（主體）都有垂直的替代選項可供選擇：
- 主體：爸爸 → 屬性：{面貌: [方臉, 圓臉], 表情: [微笑, 沉思]}
- 主體：櫻花樹 → 屬性：{花況: [盛開, 半開], 高度: [高聳, 中等]}

## 動態分析原則（極重要）

你必須根據使用者 prompt 內容**動態識別**敘事主體，而非使用固定模板：
- 京都旅遊 → 識別：家庭成員、神社、庭園、和服
- 科幻故事 → 識別：太空人、機器人、星艦、星球
- 美食文章 → 識別：料理、食材、餐具、擺盤
- 企業簡報 → 識別：圖表、數據標籤、版面區塊

## 系譜軸分類（兩層結構）

### 全局系譜軸（Global Paradigms）- 所有圖片共用
跨圖片必須保持一致的元素：

1. **角色系譜軸（characters）**
   識別所有角色，為每個角色生成 2-4 個屬性類別，每個屬性 2-4 個選項
   
2. **風格系譜軸（style）**
   線條、質感、渲染方式等畫風屬性
   
3. **色彩氛圍系譜軸（color_atmosphere）**
   色溫、飽和度、光線方向等色彩屬性

### 單圖系譜軸（Image Paradigms）- 每張圖獨立
依敘事需求變化的元素：

1. **場景系譜軸（scene）**
   該圖的場景元素及其屬性選項
   
2. **物件系譜軸（object）**
   該圖的關鍵物件及其屬性選項
   
3. **構圖系譜軸（composition）**
   視角、景深、主體位置等構圖選項

## 風格推薦規則
根據內容主題推薦 3-5 個適合的視覺風格，必須：
1. **貼近主題**：寓言→童話風、科技→賽博龐克、旅遊→插畫風
2. **具體描述**：「柔和水彩筆觸，色彩暈染邊緣，童話繪本質感」
3. **多樣選擇**：提供寫實、插畫、抽象等不同取向

## 輸出 JSON 格式

\`\`\`json
{
  "image_count": 3,
  "theme_type": "abstract|concrete|narrative|data",
  "use_case": "用途說明",
  
  "recommended_styles": [
    {
      "id": "style_id_snake_case",
      "name": "風格名稱",
      "description": "詳細風格描述（30-50字）",
      "suitable_for": "適合場景"
    }
  ],
  
  "global_paradigms": {
    "characters": {
      "角色名稱": {
        "屬性類別1": ["選項1", "選項2", "選項3"],
        "屬性類別2": ["選項1", "選項2"]
      }
    },
    "style": {
      "線條": ["細膩手繪", "粗獷筆觸", "平滑向量"],
      "質感": ["紙本紋理", "平滑數位", "水彩暈染"]
    },
    "color_atmosphere": {
      "色溫": ["暖色調", "冷色調", "中性"],
      "飽和度": ["低飽和日系", "標準", "高飽和鮮明"],
      "光線": ["柔和自然光", "強烈側光", "逆光剪影"]
    }
  },
  
  "consistency_block": {
    "characters": "所有角色的精確外觀描述，使用 {角色名.屬性} placeholder",
    "style": "畫風描述，使用 {style.屬性} placeholder",
    "scene_coherence": "場景連貫性要求"
  },
  
  "global_context": "簡短全局說明",
  
  "images": [
    {
      "title": "圖卡標題",
      "use_case": "此圖用途",
      "description": "圖片說明",
      
      "image_paradigms": {
        "scene": {
          "場景元素名": {
            "屬性1": ["選項1", "選項2"],
            "屬性2": ["選項1", "選項2"]
          }
        },
        "object": {
          "物件名": {
            "屬性1": ["選項1", "選項2"]
          }
        },
        "composition": {
          "視角": ["平視", "俯視", "仰視"],
          "景深": ["遠景全身", "中景半身", "近景特寫"],
          "位置": ["主體置中", "三分法左", "三分法右"]
        }
      },
      
      "base_prompt": "包含 {placeholder} 的圖像描述（150-200字）"
    }
  ]
}
\`\`\`

## Placeholder 命名規則

### 全局 placeholder（用於 consistency_block）
- {角色名.屬性}：如 {爸爸.面貌}、{媽媽.表情}
- {style.屬性}：如 {style.線條}、{style.質感}
- {color.屬性}：如 {color.色溫}、{color.光線}

### 單圖 placeholder（用於 base_prompt）
- {scene.元素.屬性}：如 {scene.庭園.狀態}
- {object.物件.屬性}：如 {object.燈籠.數量}
- {comp.屬性}：如 {comp.視角}、{comp.景深}

## 範例：京都親子旅遊

\`\`\`json
{
  "global_paradigms": {
    "characters": {
      "爸爸": {
        "面貌": ["方臉", "圓臉"],
        "表情": ["微笑", "沉穩", "驚喜"]
      },
      "媽媽": {
        "面貌": ["鵝蛋臉", "瓜子臉"],
        "表情": ["溫柔微笑", "開心大笑"]
      },
      "女童": {
        "髮型": ["雙馬尾", "單馬尾", "短髮"],
        "表情": ["天真笑容", "好奇張望"]
      }
    },
    "color_atmosphere": {
      "色溫": ["冷灰藍冬季調", "溫暖米色調"],
      "飽和度": ["低飽和日系", "中等飽和"]
    }
  },
  "images": [{
    "title": "貴船神社",
    "image_paradigms": {
      "scene": {
        "神社階梯": {
          "狀態": ["積雪覆蓋", "乾淨整潔", "落葉點綴"],
          "長度": ["延伸至遠方", "短階數層"]
        },
        "燈籠": {
          "數量": ["成排綿延", "零星點綴"],
          "狀態": ["點亮", "未亮"]
        }
      },
      "composition": {
        "視角": ["仰視", "平視"],
        "景深": ["遠景", "中景"]
      }
    },
    "base_prompt": "一家四口站在{scene.神社階梯.狀態}的石階前，{scene.燈籠.數量}的朱紅燈籠沿階而上。{comp.視角}構圖下，{爸爸.表情}的爸爸..."
  }]
}
\`\`\``;

async function generateImagePromptWithAI(query, finalContent, allResponses) {
  // Compile all content for analysis
  const responseSummary = allResponses
    .map(r => `【${getModelName(r.model)}】\n${r.content.slice(0, 500)}...`)
    .join('\n\n');
  
  const analysisPrompt = `請分析以下 Council 討論內容，識別是否規劃了多張圖片，並為每張圖生成獨立的 Prompt。

## 原始問題
${query}

## 各模型回應摘要
${responseSummary}

## 最終彙整答案
${finalContent.slice(0, 2500)}

---
請根據以上內容：
1. 識別內容是否規劃了多張圖卡/資訊圖表（注意看是否有「圖卡一」「圖卡二」等標記）
2. 如果有多張圖的規劃，為每張圖生成獨立的 prompt 和選項
3. 如果沒有明確規劃，根據內容決定需要幾張圖來完整呈現
4. 每張圖的選項應與該圖主題相關，不要使用通用的「性別/服裝」等選項`;

  try {
    // Use helper model for consistency (fallback if chairman is dynamic)
    const result = await queryModelNonStreaming(getAvailableHelperModel(), IMAGE_PROMPT_SYSTEM + '\n\n' + analysisPrompt);
    
    // Parse JSON from response with error tolerance
    // Extract JSON from markdown code block - handle multiple code blocks
    let jsonStr = result;
    
    // Try to find JSON code block first (```json ... ```)
    const jsonCodeBlockMatch = result.match(/```json\s*([\s\S]*?)```/);
    if (jsonCodeBlockMatch) {
      jsonStr = jsonCodeBlockMatch[1];
    } else {
      // Try generic code block (``` ... ```)
      const genericCodeBlockMatch = result.match(/```\s*([\s\S]*?)```/);
      if (genericCodeBlockMatch) {
        jsonStr = genericCodeBlockMatch[1];
      }
    }
    
    // Find the root JSON object using bracket matching (handles nested {} in strings)
    jsonStr = jsonStr.trim();
    const startIdx = jsonStr.indexOf('{');
    if (startIdx !== -1) {
      let depth = 0;
      let inString = false;
      let escapeNext = false;
      let endIdx = -1;
      
      for (let i = startIdx; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') depth++;
          else if (char === '}') {
            depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
        }
      }
      
      if (endIdx !== -1) {
        jsonStr = jsonStr.slice(startIdx, endIdx + 1);
      }
    }
    
    // Clean up common JSON issues
    jsonStr = jsonStr
      .trim()
      .replace(/,\s*([}\]])/g, '$1');  // Remove trailing commas
    
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.warn('JSON parse failed, attempting repair:', parseErr.message);
      console.warn('JSON string preview (first 500 chars):', jsonStr.slice(0, 500));
      
      // Try to fix truncated JSON by closing brackets
      let repaired = jsonStr;
      
      // Count brackets outside of strings
      let openBrackets = 0, closeBrackets = 0, openBraces = 0, closeBraces = 0;
      let inStr = false, escape = false;
      for (const char of repaired) {
        if (escape) { escape = false; continue; }
        if (char === '\\') { escape = true; continue; }
        if (char === '"') { inStr = !inStr; continue; }
        if (!inStr) {
          if (char === '[') openBrackets++;
          else if (char === ']') closeBrackets++;
          else if (char === '{') openBraces++;
          else if (char === '}') closeBraces++;
        }
      }
      
      repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets));
      repaired += '}'.repeat(Math.max(0, openBraces - closeBraces));
      
      try {
        parsed = JSON.parse(repaired);
      } catch (repairErr) {
        console.error('JSON repair also failed:', repairErr.message);
        throw parseErr; // Throw original error
      }
    }
    
    // Normalize to multi-image structure
    const imageCount = parsed.image_count || 1;
    const images = parsed.images || [];
    
    // Parse recommended styles
    const recommendedStyles = (parsed.recommended_styles || []).map(style => ({
      id: style.id || style.name?.toLowerCase().replace(/\s+/g, '_') || 'default',
      name: style.name || '預設風格',
      description: style.description || '',
      suitableFor: style.suitable_for || ''
    }));
    
    // Fallback styles if AI didn't provide any
    if (recommendedStyles.length === 0) {
      recommendedStyles.push(
        { id: 'realistic', name: '寫實攝影', description: '高解析度攝影風格，自然光影，真實質感', suitableFor: '產品、人像、場景' },
        { id: 'illustration', name: '插畫風格', description: '手繪插畫質感，柔和線條，藝術感色彩', suitableFor: '故事、教學、概念圖' },
        { id: 'minimalist', name: '極簡現代', description: '簡潔俐落，大量留白，幾何元素', suitableFor: '資訊圖表、UI 設計、商業' }
      );
    }
    
    // Get global context for multi-image consistency
    const globalContext = parsed.global_context || '';
    
    // Parse consistency block (new structure for detailed character/style consistency)
    const consistencyBlock = parsed.consistency_block || {};
    const parsedConsistencyBlock = {
      characters: consistencyBlock.characters || '',
      style: consistencyBlock.style || '',
      sceneCoherence: consistencyBlock.scene_coherence || ''
    };
    
    // Parse global paradigms (符號學系譜軸 - 全局)
    const globalParadigms = parsed.global_paradigms || {};
    const parsedGlobalParadigms = {
      characters: globalParadigms.characters || {},
      style: globalParadigms.style || {},
      colorAtmosphere: globalParadigms.color_atmosphere || {}
    };
    
    // If old single-image format, convert to array
    if (images.length === 0 && (parsed.final_prompt || parsed.base_prompt)) {
      images.push({
        title: '圖像',
        use_case: parsed.use_case || '',
        description: parsed.scene_description || '',
        scene_description: parsed.scene_description || '',
        composition: parsed.composition || '',
        text_elements: parsed.text_elements || [],
        material_detail: parsed.material_detail || '',
        placeholders: parsed.placeholders || {},
        image_paradigms: {},
        resolution_hint: parsed.resolution_hint || '高清',
        base_prompt: parsed.base_prompt || parsed.final_prompt || ''
      });
    }
    
    return {
      success: true,
      imageCount: images.length || imageCount,
      themeType: parsed.theme_type || 'concrete',
      useCase: parsed.use_case || '',
      recommendedStyles: recommendedStyles,
      consistencyBlock: parsedConsistencyBlock,
      globalParadigms: parsedGlobalParadigms,
      globalContext: globalContext,
      images: images.map((img, idx) => ({
        id: `img-${idx}`,
        title: img.title || `圖像 ${idx + 1}`,
        useCase: img.use_case || '',
        description: img.description || '',
        sceneDescription: img.scene_description || '',
        composition: img.composition || '',
        textElements: img.text_elements || [],
        materialDetail: img.material_detail || '',
        // Legacy placeholders support
        placeholders: Object.entries(img.placeholders || {}).reduce((acc, [key, val]) => {
          acc[key] = {
            default: val?.default || '',
            options: val?.options || [],
            currentValue: val?.default || ''
          };
          return acc;
        }, {}),
        // New: image paradigms (符號學系譜軸 - 單圖)
        imageParadigms: {
          scene: img.image_paradigms?.scene || {},
          object: img.image_paradigms?.object || {},
          composition: img.image_paradigms?.composition || {}
        },
        resolutionHint: img.resolution_hint || '高清',
        basePrompt: img.base_prompt || img.final_prompt || '',
        // These will be populated after style selection
        finalPrompt: '',
        status: 'pending',
        generatedImage: null,
        error: null
      }))
    };
  } catch (err) {
    console.error('AI prompt generation failed:', err);
    return {
      success: false,
      error: err.message,
      imageCount: 1,
      useCase: '',
      recommendedStyles: [
        { id: 'realistic', name: '寫實攝影', description: '高解析度攝影風格，自然光影，真實質感', suitableFor: '產品、人像、場景' },
        { id: 'illustration', name: '插畫風格', description: '手繪插畫質感，柔和線條，藝術感色彩', suitableFor: '故事、教學、概念圖' },
        { id: 'minimalist', name: '極簡現代', description: '簡潔俐落，大量留白，幾何元素', suitableFor: '資訊圖表、UI 設計、商業' }
      ],
      consistencyBlock: {
        characters: '',
        style: '',
        sceneCoherence: ''
      },
      globalParadigms: {
        characters: {},
        style: {},
        colorAtmosphere: {}
      },
      globalContext: '',
      images: [{
        id: 'img-0',
        title: '圖像',
        useCase: '',
        description: '',
        sceneDescription: '',
        composition: '',
        textElements: [],
        materialDetail: '',
        placeholders: {},
        imageParadigms: {
          scene: {},
          object: {},
          composition: {}
        },
        resolutionHint: '高清',
        basePrompt: '',
        finalPrompt: '',
        status: 'pending',
        generatedImage: null,
        error: null
      }]
    };
  }
}

// Helper: Build paradigm axis HTML for a subject with attributes
function buildParadigmSubjectHtml(subjectName, attributes, axisType, subjectIdx) {
  if (!attributes || typeof attributes !== 'object') return '';
  
  const attributeRows = Object.entries(attributes).map(([attrName, options]) => {
    // Guard: ensure options is an array
    if (!Array.isArray(options)) return '';
    
    const optionChips = options.map((opt, optIdx) => 
      `<button class="paradigm-chip" data-axis="${escapeAttr(axisType)}" data-subject="${escapeAttr(subjectName)}" data-attr="${escapeAttr(attrName)}" data-value="${escapeAttr(opt)}" data-idx="${optIdx}">${escapeHtml(opt)}</button>`
    ).join('');
    return `
      <div class="paradigm-attribute-row">
        <span class="paradigm-attr-label">${escapeHtml(attrName)}</span>
        <div class="paradigm-chips-row">${optionChips}</div>
      </div>
    `;
  }).filter(Boolean).join('');
  
  if (!attributeRows) return '';
  
  return `
    <div class="paradigm-subject" data-subject="${escapeAttr(subjectName)}">
      <div class="paradigm-subject-header">
        <span class="paradigm-subject-icon">📌</span>
        <span class="paradigm-subject-name">${escapeHtml(subjectName)}</span>
      </div>
      <div class="paradigm-attributes">${attributeRows}</div>
    </div>
  `;
}

// Helper: Build full paradigm axis section HTML
function buildParadigmAxisHtml(axisName, axisLabel, subjects, icon = '🎨') {
  if (!subjects || Object.keys(subjects).length === 0) return '';
  
  // Detect structure: nested (characters) vs flat (style/colorAtmosphere)
  // Nested: { "主體名": { "屬性": [...] } }
  // Flat: { "屬性": [...] }
  const firstValue = Object.values(subjects)[0];
  const isFlat = Array.isArray(firstValue);
  
  let subjectsHtml;
  if (isFlat) {
    // Flat structure: wrap in a single virtual subject
    subjectsHtml = buildParadigmSubjectHtml(axisLabel, subjects, axisName, 0);
  } else {
    // Nested structure: iterate over subjects
    subjectsHtml = Object.entries(subjects).map(([name, attrs], idx) => {
      // Guard: skip if attrs is not a valid object
      if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return '';
      return buildParadigmSubjectHtml(name, attrs, axisName, idx);
    }).join('');
  }
  
  return `
    <div class="paradigm-axis-section" data-axis="${escapeAttr(axisName)}">
      <div class="paradigm-axis-header">
        <span class="paradigm-axis-icon">${icon}</span>
        <span class="paradigm-axis-label">${escapeHtml(axisLabel)}</span>
      </div>
      <div class="paradigm-subjects">${subjectsHtml}</div>
    </div>
  `;
}

// Compose a prompt from paradigmatic selections (毗鄰軸組合)
function composePromptFromParadigms(basePrompt, globalSelections, imageSelections) {
  let prompt = basePrompt;
  
  // Replace global paradigm placeholders
  if (globalSelections) {
    // Characters: {角色名.屬性}
    if (globalSelections.characters) {
      Object.entries(globalSelections.characters).forEach(([charName, attrs]) => {
        Object.entries(attrs).forEach(([attrName, value]) => {
          const patterns = [
            `{${charName}.${attrName}}`,
            `{characters.${charName}.${attrName}}`
          ];
          patterns.forEach(pattern => {
            prompt = prompt.split(pattern).join(value);
          });
        });
      });
    }
    
    // Style: {style.屬性}
    if (globalSelections.style) {
      Object.entries(globalSelections.style).forEach(([styleName, attrs]) => {
        Object.entries(attrs).forEach(([attrName, value]) => {
          const patterns = [
            `{style.${attrName}}`,
            `{${styleName}.${attrName}}`
          ];
          patterns.forEach(pattern => {
            prompt = prompt.split(pattern).join(value);
          });
        });
      });
    }
    
    // Color atmosphere: {color.屬性}
    if (globalSelections.colorAtmosphere) {
      Object.entries(globalSelections.colorAtmosphere).forEach(([colorName, attrs]) => {
        Object.entries(attrs).forEach(([attrName, value]) => {
          const patterns = [
            `{color.${attrName}}`,
            `{${colorName}.${attrName}}`
          ];
          patterns.forEach(pattern => {
            prompt = prompt.split(pattern).join(value);
          });
        });
      });
    }
  }
  
  // Replace image-level paradigm placeholders
  if (imageSelections) {
    // Scene: {scene.元素.屬性}
    if (imageSelections.scene) {
      Object.entries(imageSelections.scene).forEach(([element, value]) => {
        if (typeof value === 'string') {
          const patterns = [
            `{scene.${element}}`,
            `{${element}}`
          ];
          patterns.forEach(pattern => {
            prompt = prompt.split(pattern).join(value);
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([attr, attrValue]) => {
            const patterns = [
              `{scene.${element}.${attr}}`,
              `{${element}.${attr}}`
            ];
            patterns.forEach(pattern => {
              prompt = prompt.split(pattern).join(attrValue);
            });
          });
        }
      });
    }
    
    // Object: {object.物件.屬性}
    if (imageSelections.object) {
      Object.entries(imageSelections.object).forEach(([objName, value]) => {
        if (typeof value === 'string') {
          const patterns = [
            `{object.${objName}}`,
            `{${objName}}`
          ];
          patterns.forEach(pattern => {
            prompt = prompt.split(pattern).join(value);
          });
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([attr, attrValue]) => {
            const patterns = [
              `{object.${objName}.${attr}}`,
              `{${objName}.${attr}}`
            ];
            patterns.forEach(pattern => {
              prompt = prompt.split(pattern).join(attrValue);
            });
          });
        }
      });
    }
    
    // Composition: {comp.屬性}
    if (imageSelections.composition) {
      Object.entries(imageSelections.composition).forEach(([compAttr, value]) => {
        const patterns = [
          `{comp.${compAttr}}`,
          `{composition.${compAttr}}`,
          `{${compAttr}}`
        ];
        patterns.forEach(pattern => {
          prompt = prompt.split(pattern).join(value);
        });
      });
    }
  }
  
  // Clean up unselected placeholders - remove them and clean surrounding punctuation
  // Match patterns like {anything.anything} or {anything}
  prompt = prompt
    // Remove placeholder with surrounding Chinese punctuation patterns
    .replace(/[，、；：]?\s*\{[^{}]+\}\s*[，、；：]?/g, match => {
      // If both sides have punctuation, keep one
      const hasLeadingPunct = /^[，、；：]/.test(match);
      const hasTrailingPunct = /[，、；：]$/.test(match);
      if (hasLeadingPunct && hasTrailingPunct) return match.slice(-1);
      return '';
    })
    // Clean up double punctuation that might result
    .replace(/[，、]{2,}/g, '，')
    .replace(/[。]{2,}/g, '。')
    // Clean up leading punctuation at start of sections
    .replace(/^[，、；：\s]+/gm, '')
    // Clean up trailing punctuation before newlines
    .replace(/[，、；：\s]+$/gm, '')
    // Remove any remaining standalone placeholders
    .replace(/\{[^{}]+\}/g, '')
    // Clean up multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  return prompt;
}

// Helper: Build image-level paradigm axis HTML (for scene/object/composition)
function buildImageParadigmAxisHtml(axisType, axisLabel, subjects, imageIdx, icon = '📍') {
  if (!subjects || Object.keys(subjects).length === 0) return '';
  
  const subjectsHtml = Object.entries(subjects).map(([subjectName, attributes]) => {
    // Handle two structures: direct options array or nested attributes object
    if (Array.isArray(attributes)) {
      // Direct options: composition.視角 = ["平視", "俯視"]
      const optionChips = attributes.map((opt, optIdx) => 
        `<button class="image-paradigm-chip" data-image-idx="${imageIdx}" data-axis="${escapeAttr(axisType)}" data-subject="${escapeAttr(subjectName)}" data-value="${escapeAttr(opt)}" data-idx="${optIdx}">${escapeHtml(opt)}</button>`
      ).join('');
      return `
        <div class="image-paradigm-row">
          <span class="image-paradigm-label">${escapeHtml(subjectName)}</span>
          <div class="image-paradigm-chips">${optionChips}</div>
        </div>
      `;
    } else {
      // Nested attributes: scene.櫻花樹 = { 花況: [...], 高度: [...] }
      const attrRows = Object.entries(attributes).map(([attrName, options]) => {
        if (!Array.isArray(options)) return '';
        const optionChips = options.map((opt, optIdx) => 
          `<button class="image-paradigm-chip" data-image-idx="${imageIdx}" data-axis="${escapeAttr(axisType)}" data-subject="${escapeAttr(subjectName)}" data-attr="${escapeAttr(attrName)}" data-value="${escapeAttr(opt)}" data-idx="${optIdx}">${escapeHtml(opt)}</button>`
        ).join('');
        return `
          <div class="image-paradigm-attr-row">
            <span class="image-paradigm-attr-label">${escapeHtml(attrName)}</span>
            <div class="image-paradigm-chips">${optionChips}</div>
          </div>
        `;
      }).join('');
      
      return `
        <div class="image-paradigm-subject">
          <span class="image-paradigm-subject-name">${escapeHtml(subjectName)}</span>
          ${attrRows}
        </div>
      `;
    }
  }).join('');
  
  return `
    <div class="image-paradigm-axis" data-axis="${escapeAttr(axisType)}" data-image-idx="${imageIdx}">
      <div class="image-paradigm-axis-header">
        <span class="image-paradigm-icon">${icon}</span>
        <span class="image-paradigm-axis-label">${escapeHtml(axisLabel)}</span>
      </div>
      <div class="image-paradigm-content">${subjectsHtml}</div>
    </div>
  `;
}

// Style selection UI - Phase 1 of the new flow (with Global Paradigmatic Axes)
function showStyleSelectionUI(aiResult, onStyleSelected, onCancel) {
  const styles = aiResult.recommendedStyles || [];
  const globalContext = aiResult.globalContext || '';
  const globalParadigms = aiResult.globalParadigms || {};
  const imageCount = aiResult.images?.length || 1;
  
  // Track selected paradigm values
  const paradigmSelections = {
    characters: {},
    style: {},
    colorAtmosphere: {}
  };
  
  const styleCardsHtml = styles.map((style, idx) => `
    <div class="style-card" data-style-id="${escapeAttr(style.id)}" data-style-idx="${idx}">
      <div class="style-card-header">
        <span class="style-card-name">${escapeHtml(style.name)}</span>
      </div>
      <p class="style-card-desc">${escapeHtml(style.description)}</p>
      ${style.suitableFor ? `<span class="style-card-suitable">適合：${escapeHtml(style.suitableFor)}</span>` : ''}
    </div>
  `).join('');
  
  // Build global paradigm axes HTML
  const characterParadigmHtml = buildParadigmAxisHtml('characters', '角色系譜軸', globalParadigms.characters, '👤');
  const colorParadigmHtml = buildParadigmAxisHtml('colorAtmosphere', '色彩氛圍系譜軸', globalParadigms.colorAtmosphere, '🎨');
  const styleParadigmHtml = buildParadigmAxisHtml('style', '風格系譜軸', globalParadigms.style, '✏️');
  
  const hasParadigms = characterParadigmHtml || colorParadigmHtml || styleParadigmHtml;
  
  const globalParadigmsHtml = hasParadigms ? `
    <div class="global-paradigms-container">
      <div class="global-paradigms-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>全局系譜軸設定</span>
        <span class="global-paradigms-hint">選擇的屬性將套用至所有圖片</span>
      </div>
      ${characterParadigmHtml}
      ${colorParadigmHtml}
      ${styleParadigmHtml}
    </div>
  ` : '';
  
  const globalContextHtml = `
    <div class="global-context-preview">
      <div class="global-context-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span>一致性描述</span>
        <span class="global-context-hint">可編輯調整，上方選擇會自動更新此區</span>
      </div>
      <textarea id="globalContextTextarea" class="global-context-textarea" rows="4" placeholder="描述多張圖片間需要保持一致的元素（如人物外觀、場景風格等）">${escapeHtml(globalContext)}</textarea>
    </div>
  `;
  
  const html = `
    <div class="style-selection-container">
      <div class="style-selection-header">
        <div class="style-selection-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          選擇統一視覺風格
        </div>
        <span class="style-selection-hint">${imageCount} 張圖片將套用相同風格</span>
      </div>
      
      ${globalParadigmsHtml}
      
      ${globalContextHtml}
      
      <div class="style-cards-grid">
        ${styleCardsHtml}
      </div>
      
      <div class="style-selection-footer">
        <button class="prompt-editor-btn secondary" id="cancelStyleSelection">取消</button>
        <button class="prompt-editor-btn primary" id="confirmStyleSelection" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          確認風格並預覽
        </button>
      </div>
    </div>
  `;
  
  const container = document.createElement('div');
  container.className = 'style-selection-section';
  container.innerHTML = html;
  getImageContainer()?.appendChild(container);
  
  let selectedStyle = null;
  const globalContextTextarea = container.querySelector('#globalContextTextarea');
  
  // Paradigm chip click handlers
  container.querySelectorAll('.paradigm-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const axis = chip.dataset.axis;
      const subject = chip.dataset.subject;
      const attr = chip.dataset.attr;
      const value = chip.dataset.value;
      
      // Toggle selection
      const isSelected = chip.classList.contains('selected');
      
      // Deselect siblings in same attribute row
      chip.closest('.paradigm-chips-row').querySelectorAll('.paradigm-chip').forEach(c => c.classList.remove('selected'));
      
      if (!isSelected) {
        chip.classList.add('selected');
        // Store selection
        if (!paradigmSelections[axis]) paradigmSelections[axis] = {};
        if (!paradigmSelections[axis][subject]) paradigmSelections[axis][subject] = {};
        paradigmSelections[axis][subject][attr] = value;
      } else {
        // Remove selection
        if (paradigmSelections[axis]?.[subject]) {
          delete paradigmSelections[axis][subject][attr];
        }
      }
      
      // Update global context textarea with selections
      updateGlobalContextFromSelections();
    });
  });
  
  // Function to update global context textarea based on paradigm selections
  function updateGlobalContextFromSelections() {
    const parts = [];
    
    // Characters
    if (Object.keys(paradigmSelections.characters || {}).length > 0) {
      const charDescs = Object.entries(paradigmSelections.characters).map(([name, attrs]) => {
        const attrStr = Object.entries(attrs).map(([k, v]) => `${k}:${v}`).join('，');
        return attrStr ? `${name}（${attrStr}）` : null;
      }).filter(Boolean);
      if (charDescs.length > 0) {
        parts.push(`【角色】${charDescs.join('；')}`);
      }
    }
    
    // Color atmosphere
    if (Object.keys(paradigmSelections.colorAtmosphere || {}).length > 0) {
      const colorDescs = Object.entries(paradigmSelections.colorAtmosphere).flatMap(([name, attrs]) => 
        Object.entries(attrs).map(([k, v]) => v)
      );
      if (colorDescs.length > 0) {
        parts.push(`【色彩】${colorDescs.join('，')}`);
      }
    }
    
    // Style
    if (Object.keys(paradigmSelections.style || {}).length > 0) {
      const styleDescs = Object.entries(paradigmSelections.style).flatMap(([name, attrs]) => 
        Object.entries(attrs).map(([k, v]) => v)
      );
      if (styleDescs.length > 0) {
        parts.push(`【畫風】${styleDescs.join('，')}`);
      }
    }
    
    if (parts.length > 0 && globalContextTextarea) {
      const existingText = globalContextTextarea.value.trim();
      // Append to existing or replace paradigm sections
      const newText = parts.join('\n');
      if (!existingText) {
        globalContextTextarea.value = newText;
      } else {
        // Check if existing has paradigm markers
        const hasMarkers = existingText.includes('【角色】') || existingText.includes('【色彩】') || existingText.includes('【畫風】');
        if (hasMarkers) {
          // Replace existing markers
          let updated = existingText;
          parts.forEach(part => {
            const marker = part.match(/^【.+?】/)?.[0];
            if (marker) {
              const regex = new RegExp(`${marker}[^【]*`, 'g');
              if (updated.match(regex)) {
                updated = updated.replace(regex, part);
              } else {
                updated += '\n' + part;
              }
            }
          });
          globalContextTextarea.value = updated.trim();
        } else {
          globalContextTextarea.value = newText + '\n\n' + existingText;
        }
      }
    }
  }
  
  // Style card click handlers
  container.querySelectorAll('.style-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedStyle = {
        id: card.dataset.styleId,
        idx: parseInt(card.dataset.styleIdx),
        ...styles[parseInt(card.dataset.styleIdx)]
      };
      container.querySelector('#confirmStyleSelection').disabled = false;
    });
  });
  
  // Confirm button
  container.querySelector('#confirmStyleSelection').addEventListener('click', () => {
    if (selectedStyle) {
      const editedGlobalContext = globalContextTextarea?.value?.trim() || '';
      container.remove();
      onStyleSelected(selectedStyle, editedGlobalContext, paradigmSelections);
    }
  });
  
  // Cancel button
  container.querySelector('#cancelStyleSelection').addEventListener('click', () => {
    container.remove();
    if (onCancel) onCancel();
  });
}

// System prompt for style integration
const STYLE_INTEGRATION_PROMPT = `你是圖像 Prompt 整合專家。將指定的視覺風格融入每張圖的 prompt 中，保持內容描述不變但加入風格元素。

## 任務
將選定的風格自然地融入每張圖的 prompt，而非簡單地前置風格名稱。

## 融入原則
1. **風格融合**：將風格元素（筆觸、質感、色調）融入場景描述中
2. **保持一致**：所有圖片必須使用相同的風格語言
3. **全局上下文**：將 global_context（人物一致性等）融入每張 prompt 開頭
4. **自然語句**：用完整句子，不要只是堆疊關鍵字
5. **保留 Placeholder**：如果 prompt 中有 {placeholder}（如 {angle}、{background_detail}），必須原封不動保留，不要替換

## 範例
原始 prompt: "一隻狐狸以{angle}站在樹下，{background_detail}，看著遠方"
風格: "水彩童話風格，柔和筆觸，暈染邊緣"
全局上下文: "保持狐狸的外觀一致：棕色毛皮，圓眼睛，短尾巴"

融入後:
"水彩童話風格的插畫，柔和筆觸與暈染邊緣。一隻棕色毛皮、圓眼睛、短尾巴的小狐狸以{angle}站在大樹下，{background_detail}，目光望向遠方。畫面色調溫暖，光線柔和，帶有手繪繪本的質感。"

你必須輸出 JSON：
\`\`\`json
{
  "integrated_prompts": [
    {
      "title": "圖片標題",
      "prompt": "融入風格後的完整 prompt（150-250字），保留所有 {placeholder}"
    }
  ]
}
\`\`\``;

// Integrate selected style into consistency block only (preserve base_prompt placeholders)
async function integrateStyleIntoPrompts(aiResult, selectedStyle, editedGlobalContext) {
  const images = aiResult.images || [];
  const consistencyBlock = aiResult.consistencyBlock || {};
  const globalContext = editedGlobalContext || aiResult.globalContext || '';
  const paradigmSelections = aiResult.paradigmSelections || {};
  
  // Apply paradigm selections to consistency block parts (global placeholders only)
  const processedConsistencyBlock = {
    characters: consistencyBlock.characters 
      ? composePromptFromParadigms(consistencyBlock.characters, paradigmSelections, null)
      : '',
    style: consistencyBlock.style
      ? composePromptFromParadigms(consistencyBlock.style, paradigmSelections, null)
      : '',
    sceneCoherence: consistencyBlock.sceneCoherence
      ? composePromptFromParadigms(consistencyBlock.sceneCoherence, paradigmSelections, null)
      : ''
  };
  
  // Build consistency text from processed block
  const consistencyText = [
    processedConsistencyBlock.characters ? `【角色】${processedConsistencyBlock.characters}` : '',
    processedConsistencyBlock.style ? `【畫風】${processedConsistencyBlock.style}` : '',
    processedConsistencyBlock.sceneCoherence ? `【場景】${processedConsistencyBlock.sceneCoherence}` : ''
  ].filter(Boolean).join('\n');
  
  // Also replace global placeholders in global context
  const processedGlobalContext = composePromptFromParadigms(globalContext, paradigmSelections, null);
  
  // Process base prompts: only replace GLOBAL placeholders, preserve image-level placeholders
  const processedImages = images.map((img, idx) => {
    // Only replace global paradigm placeholders (characters, style, color)
    // Image-level placeholders ({scene.xxx}, {object.xxx}, {comp.xxx}) are preserved
    const processedBasePrompt = composePromptFromParadigms(
      img.basePrompt || img.finalPrompt || '',
      paradigmSelections,
      null // imageSelections = null means image-level placeholders are untouched
    );
    return {
      ...img,
      // Store both: processed (global replaced) and original (for reference)
      basePromptProcessed: processedBasePrompt,
      basePromptOriginal: img.basePrompt || img.finalPrompt || ''
    };
  });
  
  // Use AI only to integrate style into consistency block, not base_prompt
  const styleIntegrationPrompt = `## 任務
將選定的風格融入一致性區塊描述中，輸出融合後的一致性描述文字。

## 選定風格
名稱：${selectedStyle.name}
描述：${selectedStyle.description}

## 原始一致性區塊
${consistencyText || '（無）'}

## 全局上下文
${processedGlobalContext || '（無特定要求）'}

## 輸出要求
輸出融入風格後的一致性描述（不需要 JSON 格式），保持【角色】【畫風】【場景】的分段結構。
將風格元素（筆觸、質感、色調等）自然融入描述中。
字數控制在 150-300 字。`;

  let integratedConsistencyText = consistencyText;
  
  try {
    const result = await queryModelNonStreaming(getAvailableHelperModel(), styleIntegrationPrompt);
    // Use AI result as integrated consistency text (remove markdown if any)
    integratedConsistencyText = result
      .replace(/```[\s\S]*?```/g, '')
      .replace(/^#+\s*.*/gm, '')
      .trim() || consistencyText;
  } catch (err) {
    console.error('Style integration failed, using fallback:', err);
    // Fallback: prepend style name to consistency text
    integratedConsistencyText = `${selectedStyle.name}風格。\n${consistencyText}`;
  }
  
  // Build updated images with layered prompt structure
  const updatedImages = processedImages.map((img, idx) => {
    return {
      ...img,
      // Keep basePrompt with image-level placeholders intact
      basePrompt: img.basePromptProcessed,
      // finalPrompt will be composed at generation time from layers
      finalPrompt: img.basePromptProcessed,
      integratedStyle: selectedStyle.name,
      placeholders: img.placeholders || {}
    };
  });
  
  return {
    ...aiResult,
    selectedStyle: selectedStyle,
    // Store both raw and integrated consistency blocks
    consistencyBlock: processedConsistencyBlock,
    integratedConsistencyText: integratedConsistencyText,
    globalContext: processedGlobalContext,
    images: updatedImages
  };
}

// Preview and edit integrated prompts before generation
function showPromptPreview(integratedResult, onConfirm, onBack, onCancel) {
  const images = integratedResult.images || [];
  const selectedStyle = integratedResult.selectedStyle;
  const globalContext = integratedResult.globalContext || '';
  
  // Build preview content for textarea
  const previewContent = buildPreviewContent(globalContext, selectedStyle, images);
  
  const html = `
    <div class="prompt-preview-container">
      <div class="prompt-preview-header">
        <div class="prompt-preview-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          預覽與編輯
        </div>
        <div class="prompt-preview-badges">
          <span class="style-badge">${escapeHtml(selectedStyle?.name || '預設風格')}</span>
          <span class="count-badge">${images.length} 張圖</span>
        </div>
      </div>
      
      <div class="prompt-preview-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span>風格已融入各圖 prompt，可直接編輯下方內容。確認後進入生成介面。</span>
      </div>
      
      <div class="prompt-preview-textarea-wrapper">
        <textarea id="promptPreviewTextarea" class="prompt-preview-textarea" rows="16">${escapeHtml(previewContent)}</textarea>
      </div>
      
      <div class="prompt-preview-footer">
        <button class="prompt-editor-btn secondary" id="backToStyleSelection">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          重選風格
        </button>
        <div class="prompt-preview-footer-right">
          <button class="prompt-editor-btn secondary" id="cancelPromptPreview">取消</button>
          <button class="prompt-editor-btn primary" id="confirmPromptPreview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            確認並生成
          </button>
        </div>
      </div>
    </div>
  `;
  
  const container = document.createElement('div');
  container.className = 'prompt-preview-section';
  container.innerHTML = html;
  getImageContainer()?.appendChild(container);
  
  const textarea = container.querySelector('#promptPreviewTextarea');
  
  // Confirm button - parse edited content and proceed
  container.querySelector('#confirmPromptPreview').addEventListener('click', () => {
    const editedContent = textarea.value;
    const parsedImages = parsePreviewContent(editedContent, images);
    
    // Update integratedResult with edited prompts
    const updatedResult = {
      ...integratedResult,
      images: parsedImages
    };
    
    container.remove();
    onConfirm(updatedResult);
  });
  
  // Back button - return to style selection
  container.querySelector('#backToStyleSelection').addEventListener('click', () => {
    container.remove();
    if (onBack) onBack();
  });
  
  // Cancel button
  container.querySelector('#cancelPromptPreview').addEventListener('click', () => {
    container.remove();
    if (onCancel) onCancel();
  });
}

// Build formatted preview content for textarea
function buildPreviewContent(globalContext, selectedStyle, images) {
  let content = '';
  
  // Global section
  content += `[全局設定]\n`;
  content += `統一風格：${selectedStyle?.name || '預設'}\n`;
  if (globalContext) {
    content += `一致性要求：${globalContext}\n`;
  }
  content += '\n';
  
  // Each image
  images.forEach((img, idx) => {
    content += `[圖 ${idx + 1}] ${img.title}\n`;
    content += `${img.finalPrompt || img.basePrompt || ''}\n\n`;
  });
  
  return content.trim();
}

// Parse edited preview content back to image array
function parsePreviewContent(content, originalImages) {
  const lines = content.split('\n');
  const parsedImages = [...originalImages];
  
  let currentImageIdx = -1;
  let currentPromptLines = [];
  
  for (const line of lines) {
    // Check for image header: [圖 N] Title
    const imageMatch = line.match(/^\[圖\s*(\d+)\]\s*(.*)$/);
    if (imageMatch) {
      // Save previous image's prompt if any
      if (currentImageIdx >= 0 && currentImageIdx < parsedImages.length) {
        parsedImages[currentImageIdx] = {
          ...parsedImages[currentImageIdx],
          basePrompt: currentPromptLines.join('\n').trim()
        };
      }
      
      currentImageIdx = parseInt(imageMatch[1]) - 1;
      currentPromptLines = [];
      
      // Update title if changed
      const newTitle = imageMatch[2].trim();
      if (newTitle && currentImageIdx >= 0 && currentImageIdx < parsedImages.length) {
        parsedImages[currentImageIdx].title = newTitle;
      }
    } else if (currentImageIdx >= 0 && !line.startsWith('[全局設定]') && !line.startsWith('統一風格：') && !line.startsWith('一致性要求：')) {
      currentPromptLines.push(line);
    }
  }
  
  // Save last image's prompt
  if (currentImageIdx >= 0 && currentImageIdx < parsedImages.length) {
    parsedImages[currentImageIdx] = {
      ...parsedImages[currentImageIdx],
      basePrompt: currentPromptLines.join('\n').trim()
    };
  }
  
  return parsedImages;
}

// System prompt for refining image prompts
const REFINE_PROMPT_SYSTEM = `你是圖像 Prompt 精煉專家。將用戶編輯後的 prompt 進行潤色，確保品質。

## 精煉原則
1. **去除重複**：刪除重複的描述（如角色描述出現兩次）
2. **融合一致性區塊**：確保一致性描述自然融入 prompt，不是生硬的前置
3. **語句流暢**：調整語序使描述更自然
4. **保持完整**：不要刪除重要細節
5. **填補 placeholder**：如果還有未置換的 {placeholder}，用合理的預設值填入

## 輸出要求
只輸出精煉後的 prompt，不要加任何說明或 markdown 格式。
字數控制在 150-250 字。`;

// Refine a single image prompt with AI
async function refinePromptWithAI(prompt, consistencyBlock) {
  const refineRequest = `## 一致性描述
${consistencyBlock || '（無）'}

## 原始 Prompt
${prompt}

請精煉上述 prompt，確保一致性描述自然融入，移除重複內容，使語句流暢。`;

  try {
    const result = await queryModelNonStreaming(getAvailableHelperModel(), REFINE_PROMPT_SYSTEM + '\n\n' + refineRequest);
    // Clean up the result - remove any markdown formatting
    return result
      .replace(/^```[\s\S]*?\n/, '')
      .replace(/\n```$/, '')
      .trim();
  } catch (err) {
    console.error('Prompt refinement failed:', err);
    throw err;
  }
}

// Helper function to format placeholder key to readable label
function formatPlaceholderLabel(key) {
  const labels = {
    'angle': '取景角度',
    'background_detail': '背景細節',
    'character_action': '角色動作',
    'lighting': '光線',
    'mood': '氛圍',
    'clothing_style': '服裝風格',
    'weather': '天氣',
    'time_of_day': '時段'
  };
  return labels[key] || key.replace(/_/g, ' ');
}

// Multi-image editor state
let multiImageState = null;

function showMultiImageEditor(aiResult, onAllComplete, onCancel, onBackToStyleSelection) {
  const hasAIResult = aiResult && aiResult.success;
  const images = aiResult?.images || [];
  const imageCount = images.length;
  const selectedStyle = aiResult.selectedStyle;
  const consistencyBlock = aiResult.consistencyBlock || {};
  
  // Use integrated consistency text (with style fused in), fallback to raw block
  const consistencyText = aiResult.integratedConsistencyText || [
    consistencyBlock.characters ? `【角色】${consistencyBlock.characters}` : '',
    consistencyBlock.style ? `【畫風】${consistencyBlock.style}` : '',
    consistencyBlock.sceneCoherence ? `【場景】${consistencyBlock.sceneCoherence}` : ''
  ].filter(Boolean).join('\n\n');
  
  // Initialize state for tracking each image
  // basePrompt contains image-level placeholders, consistencyBlock is the fused style layer
  multiImageState = {
    images: images.map(img => ({ 
      ...img,
      // Track image-level paradigm selections separately
      imageParadigmSelections: {}
    })),
    completedCount: 0,
    generatedImages: [],
    integratedStyle: selectedStyle?.name || null,
    consistencyBlock: consistencyText // Editable consistency block (style already fused)
  };
  
  // Theme type badge
  const themeTypeBadge = hasAIResult && aiResult.themeType 
    ? `<span class="theme-type-badge ${aiResult.themeType}">${
        aiResult.themeType === 'abstract' ? '抽象概念' :
        aiResult.themeType === 'narrative' ? '敘事場景' :
        aiResult.themeType === 'data' ? '數據視覺化' : '具體場景'
      }</span>` 
    : '';
  
  // Selected style badge (style is already integrated, just show info)
  const styleInfoHtml = selectedStyle ? `
    <div class="integrated-style-info">
      <div class="integrated-style-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>已套用風格：${escapeHtml(selectedStyle.name)}</span>
      </div>
      <p class="integrated-style-desc">${escapeHtml(selectedStyle.description || '')}</p>
    </div>
  ` : '';
  
  // Consistency block UI (editable, shown above all image cards)
  const consistencyBlockHtml = `
    <div class="consistency-block-section">
      <div class="consistency-block-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span>一致性描述</span>
        <span class="consistency-block-hint">此區塊會套用至所有圖片的 prompt 前面</span>
      </div>
      <textarea id="consistencyBlockTextarea" class="consistency-block-textarea" rows="4" placeholder="角色外觀、畫風、場景連貫性描述...">${escapeHtml(consistencyText)}</textarea>
    </div>
  `;
  
  // Build image cards HTML with paradigmatic axes and placeholder options
  const imageCardsHtml = images.map((img, idx) => {
    // Build image paradigms UI (scene, object, composition axes)
    const imageParadigms = img.imageParadigms || {};
    
    // Scene paradigm axis
    const sceneParadigmHtml = buildImageParadigmAxisHtml('scene', '場景系譜軸', imageParadigms.scene, idx, '🏞️');
    // Object paradigm axis  
    const objectParadigmHtml = buildImageParadigmAxisHtml('object', '物件系譜軸', imageParadigms.object, idx, '📦');
    // Composition paradigm axis
    const compositionParadigmHtml = buildImageParadigmAxisHtml('composition', '構圖系譜軸', imageParadigms.composition, idx, '📐');
    
    const hasImageParadigms = sceneParadigmHtml || objectParadigmHtml || compositionParadigmHtml;
    
    const imageParadigmsHtml = hasImageParadigms ? `
      <div class="image-paradigms-container">
        ${sceneParadigmHtml}
        ${objectParadigmHtml}
        ${compositionParadigmHtml}
      </div>
    ` : '';
    
    // Legacy: Build placeholder option chips (fallback for old format)
    const placeholderChipsHtml = Object.entries(img.placeholders || {}).map(([key, ph]) => `
      <div class="placeholder-option-group" data-placeholder-key="${escapeAttr(key)}">
        <label class="placeholder-option-label">${escapeHtml(formatPlaceholderLabel(key))}</label>
        <div class="placeholder-option-chips" data-image-idx="${idx}" data-placeholder="${escapeAttr(key)}">
          ${ph.options.map(opt => `<button class="placeholder-chip${opt === ph.currentValue ? ' selected' : ''}" data-value="${escapeAttr(opt)}">${escapeHtml(opt)}</button>`).join('')}
        </div>
      </div>
    `).join('');
    
    return `
      <div class="image-card" data-image-idx="${idx}" data-status="pending">
        <div class="image-card-header">
          <div class="image-card-number">${idx + 1}</div>
          <div class="image-card-title-area">
            <h4 class="image-card-title">${escapeHtml(img.title)}</h4>
            ${img.description ? `<p class="image-card-desc">${escapeHtml(img.description)}</p>` : ''}
          </div>
          <div class="image-card-status">
            <span class="status-badge pending">待編輯</span>
          </div>
        </div>
        
        <div class="image-card-content">
          ${imageParadigmsHtml}
          ${placeholderChipsHtml && !hasImageParadigms ? `<div class="placeholder-options-container">${placeholderChipsHtml}</div>` : ''}
          
          <div class="prompt-editor-textarea-wrapper">
            <div class="textarea-layer-hint">單圖描述（選擇系譜軸選項會置換 {placeholder}）</div>
            <textarea class="prompt-editor-textarea image-prompt-textarea" data-image-idx="${idx}" rows="5">${escapeHtml(img.basePrompt || img.finalPrompt || '')}</textarea>
            <div class="textarea-hint">生成時會自動組合：一致性描述 + 此區塊內容</div>
          </div>
          
          <div class="image-card-actions">
            <button class="refine-prompt-btn" data-image-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              潤色
            </button>
            <button class="generate-single-btn" data-image-idx="${idx}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              生成此圖
            </button>
          </div>
        </div>
        
        <div class="image-card-result hidden">
          <!-- Generated image will appear here -->
        </div>
      </div>
    `;
  }).join('');
  
  const editorHtml = `
    <div class="multi-image-editor">
      <div class="multi-image-header">
        <div class="multi-image-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          圖像生成編輯器
          ${themeTypeBadge}
          <span class="image-count-badge">${imageCount} 張圖</span>
        </div>
        <div class="multi-image-progress">
          <span class="progress-text"><span id="completedCount">0</span> / ${imageCount} 完成</span>
        </div>
      </div>
      
      ${styleInfoHtml}
      
      ${consistencyBlockHtml}
      
      <div class="image-cards-container">
        ${imageCardsHtml}
      </div>
      
      <div class="multi-image-footer">
        <button class="prompt-editor-btn secondary" id="backToStyleSelection">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          重選風格
        </button>
        <button class="prompt-editor-btn secondary" id="cancelAllImageGen">關閉</button>
      </div>
    </div>
  `;

  const container = document.createElement('div');
  container.className = 'multi-image-editor-section';
  container.innerHTML = editorHtml;
  getImageContainer()?.appendChild(container);

  // Back to style selection button
  if (onBackToStyleSelection) {
    container.querySelector('#backToStyleSelection').addEventListener('click', () => {
      container.remove();
      multiImageState = null;
      onBackToStyleSelection();
    });
  } else {
    // Hide the button if no callback provided
    container.querySelector('#backToStyleSelection').style.display = 'none';
  }

  // Track consistency block changes
  const consistencyTextarea = container.querySelector('#consistencyBlockTextarea');
  if (consistencyTextarea) {
    consistencyTextarea.addEventListener('input', () => {
      multiImageState.consistencyBlock = consistencyTextarea.value;
    });
  }

  // Setup event handlers for each image card
  container.querySelectorAll('.image-card').forEach(card => {
    const idx = parseInt(card.dataset.imageIdx);
    const textarea = card.querySelector('.image-prompt-textarea');
    
    // Placeholder chip click handler - REPLACEMENT instead of append
    card.querySelectorAll('.placeholder-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.value;
        const placeholderKey = chip.closest('.placeholder-option-chips').dataset.placeholder;
        const currentText = textarea.value;
        
        // Get the placeholder info
        const placeholderInfo = multiImageState.images[idx]?.placeholders?.[placeholderKey];
        if (!placeholderInfo) return;
        
        const previousValue = placeholderInfo.currentValue;
        
        // Toggle: if clicking the same value, deselect
        if (previousValue === value) {
          // Reset to default or placeholder
          const defaultValue = placeholderInfo.default;
          
          // Replace the current value with the placeholder marker or default
          if (previousValue) {
            textarea.value = currentText.replace(previousValue, `{${placeholderKey}}`);
          }
          
          placeholderInfo.currentValue = '';
          chip.classList.remove('selected');
        } else {
          // Replace: either the placeholder marker or the previous value
          let newText = currentText;
          
          if (previousValue) {
            // Replace previous value with new value
            newText = currentText.replace(previousValue, value);
          } else {
            // Replace placeholder marker with new value
            newText = currentText.replace(`{${placeholderKey}}`, value);
          }
          
          textarea.value = newText;
          placeholderInfo.currentValue = value;
          
          // Update UI - deselect siblings, select this one
          chip.closest('.placeholder-option-chips').querySelectorAll('.placeholder-chip').forEach(c => c.classList.remove('selected'));
          chip.classList.add('selected');
        }
        
        // Update state - track basePrompt (textarea shows basePrompt layer)
        multiImageState.images[idx].basePrompt = textarea.value;
      });
    });
    
    // Image paradigm chip click handler - for scene/object/composition axes
    card.querySelectorAll('.image-paradigm-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const value = chip.dataset.value;
        const axis = chip.dataset.axis;
        const subject = chip.dataset.subject;
        const attr = chip.dataset.attr || subject; // Use subject as key if no attr
        const currentText = textarea.value;
        
        // Toggle selection
        const isSelected = chip.classList.contains('selected');
        
        // Find sibling chips (same row)
        const siblingContainer = chip.closest('.image-paradigm-chips');
        siblingContainer.querySelectorAll('.image-paradigm-chip').forEach(c => c.classList.remove('selected'));
        
        if (!isSelected) {
          chip.classList.add('selected');
          
          // Build placeholder key based on axis type
          let placeholderKey;
          if (attr && attr !== subject) {
            placeholderKey = `${axis}.${subject}.${attr}`;
          } else {
            placeholderKey = `${axis}.${subject}`;
          }
          // Also try shorter forms
          const shortKey = `comp.${subject}`;
          const sceneKey = `scene.${subject}.${attr}`;
          
          // Try to replace placeholder in prompt
          let newText = currentText;
          const patterns = [
            `{${placeholderKey}}`,
            `{${shortKey}}`,
            `{${sceneKey}}`,
            `{${subject}.${attr}}`,
            `{${subject}}`
          ];
          
          let replaced = false;
          for (const pattern of patterns) {
            if (newText.includes(pattern)) {
              newText = newText.replace(pattern, value);
              replaced = true;
              break;
            }
          }
          
          // Store selection for tracking
          if (!multiImageState.images[idx].imageParadigmSelections) {
            multiImageState.images[idx].imageParadigmSelections = {};
          }
          const selectionKey = attr && attr !== subject ? `${subject}.${attr}` : subject;
          multiImageState.images[idx].imageParadigmSelections[selectionKey] = value;
          
          // If no placeholder found, check if value conflicts with consistency block
          if (!replaced) {
            const consistencyBlock = multiImageState.consistencyBlock || '';
            const valueAlreadyInConsistency = consistencyBlock.includes(value);
            
            if (!valueAlreadyInConsistency) {
              // Append to prompt with clear labeling (user can edit/remove if unwanted)
              const labelMap = {
                'scene': '場景',
                'object': '物件', 
                'composition': '構圖'
              };
              const label = labelMap[axis] || axis;
              const suffix = `（${label}：${value}）`;
              
              // Check if similar suffix already exists, replace it
              const suffixPattern = new RegExp(`（${label}：[^）]+）`, 'g');
              if (suffixPattern.test(newText)) {
                newText = newText.replace(suffixPattern, suffix);
              } else {
                newText = newText.trim() + suffix;
              }
            }
            // If value is in consistency block, don't append (consistency takes precedence)
          }
          
          textarea.value = newText;
        }
        
        // Update state - track both basePrompt edits and final prompt
        multiImageState.images[idx].basePrompt = textarea.value;
      });
    });
    
    // Refine button handler - use AI to polish the prompt
    const refineBtn = card.querySelector('.refine-prompt-btn');
    if (refineBtn) {
      refineBtn.addEventListener('click', async function() {
        const btn = this;
        const prompt = textarea.value.trim();
        
        if (!prompt) {
          showToast('請先輸入 Prompt 再進行潤色', true);
          return;
        }
        
        // Update UI to refining state
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:12px;height:12px"></span> 潤色中...';
        
        try {
          const consistencyBlock = multiImageState.consistencyBlock?.trim() || '';
          const refinedPrompt = await refinePromptWithAI(prompt, consistencyBlock);
          
          // Update textarea with refined prompt (this is the basePrompt layer)
          textarea.value = refinedPrompt;
          multiImageState.images[idx].basePrompt = refinedPrompt;
          
          showToast('Prompt 已精煉完成');
        } catch (err) {
          console.error('Refine failed:', err);
          showToast('潤色失敗：' + err.message, true);
        } finally {
          // Reset button
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            潤色
          `;
        }
      });
    }
    
    // Generate button handler - prepend consistency block to prompt
    card.querySelector('.generate-single-btn').addEventListener('click', async function() {
      const btn = this;
      let prompt = textarea.value.trim();
      
      if (!prompt) {
        showToast('請先輸入或編輯 Prompt', true);
        return;
      }
      
      // Prepend consistency block if available
      const consistencyBlock = multiImageState.consistencyBlock?.trim();
      if (consistencyBlock) {
        prompt = consistencyBlock + '\n\n' + prompt;
      }
      
      // Update UI to generating state
      card.dataset.status = 'generating';
      card.querySelector('.status-badge').className = 'status-badge generating';
      card.querySelector('.status-badge').textContent = '生成中...';
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px"></span> 生成中...';
      
      try {
        const generatedImages = await runImageGeneration(prompt);
        
        if (generatedImages.length > 0) {
          // Check if this is a re-generation
          const isRegeneration = multiImageState.images[idx].status === 'done' || card.dataset.status === 'editing';
          
          // Update state
          multiImageState.images[idx].status = 'done';
          multiImageState.images[idx].generatedImage = generatedImages[0];
          // Store the full composed prompt that was sent to generation
          multiImageState.images[idx].composedPrompt = prompt;
          
          if (isRegeneration) {
            // Replace existing entry in generatedImages
            const existingIdx = multiImageState.generatedImages.findIndex(g => g.index === idx);
            if (existingIdx >= 0) {
              multiImageState.generatedImages[existingIdx] = {
                index: idx,
                title: multiImageState.images[idx].title,
                prompt: prompt,
                image: generatedImages[0]
              };
            }
          } else {
            // First generation - increment count and add to array
            multiImageState.completedCount++;
            multiImageState.generatedImages.push({
              index: idx,
              title: multiImageState.images[idx].title,
              prompt: prompt,
              image: generatedImages[0]
            });
          }
          
          // Update UI
          card.dataset.status = 'done';
          card.querySelector('.status-badge').className = 'status-badge done';
          card.querySelector('.status-badge').textContent = '完成';
          btn.innerHTML = '✓ 已生成';
          btn.classList.add('completed');
          
          // Show generated image
          const resultArea = card.querySelector('.image-card-result');
          resultArea.classList.remove('hidden');
          resultArea.innerHTML = `
            <div class="generated-image-preview">
              <img src="${generatedImages[0]}" alt="${escapeAttr(multiImageState.images[idx].title)}" />
              <div class="image-preview-actions">
                <button class="preview-action-btn reedit-btn" data-idx="${idx}" title="跳至編輯區修改 Prompt">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  修改 Prompt
                </button>
                <button class="preview-action-btn download-btn" data-src="${generatedImages[0]}" data-idx="${idx}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  下載
                </button>
              </div>
            </div>
            <p class="regenerate-hint">不滿意？修改上方 Prompt 後點「重新生成」</p>
          `;
          
          // Add download handler
          resultArea.querySelector('.download-btn').addEventListener('click', function() {
            downloadImage(this.dataset.src, this.dataset.idx);
          });
          
          // Add re-edit handler (for re-expanding if user collapses manually)
          resultArea.querySelector('.reedit-btn').addEventListener('click', function() {
            // Expand the options area if collapsed
            card.querySelector('.image-card-content').classList.remove('collapsed');
            // Focus on textarea for immediate editing
            textarea.focus();
            textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          
          // Keep editing area visible for easy re-generation
          // Just reset button to "regenerate" state
          btn.disabled = false;
          btn.classList.remove('completed');
          btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            重新生成
          `;
          card.dataset.status = 'editing';
          
          // Update progress counter
          document.getElementById('completedCount').textContent = multiImageState.completedCount;
          
          showToast(`圖像 ${idx + 1} 生成成功`);
          
          // Call onAllComplete callback with current results
          if (onAllComplete) {
            onAllComplete(multiImageState.generatedImages);
          }
        }
      } catch (err) {
        console.error('Image generation failed:', err);
        showToast(`圖像 ${idx + 1} 生成失敗: ${err.message}`, true);
        
        card.dataset.status = 'error';
        card.querySelector('.status-badge').className = 'status-badge error';
        card.querySelector('.status-badge').textContent = '失敗';
        btn.disabled = false;
        btn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重試
        `;
        
        multiImageState.images[idx].status = 'error';
        multiImageState.images[idx].error = err.message;
      }
    });
  });
  
  // Toggle card content on header click
  container.querySelectorAll('.image-card-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('.generate-single-btn')) return;
      const card = header.closest('.image-card');
      const content = card.querySelector('.image-card-content');
      content.classList.toggle('collapsed');
    });
  });

  // Scroll to editor
  container.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Cancel button
  document.getElementById('cancelAllImageGen').addEventListener('click', () => {
    container.remove();
    multiImageState = null;
    if (onCancel) onCancel();
  });
}

// Helper to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function runImageGeneration(prompt, timeoutMs = 240000) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('圖片生成逾時（超過 4 分鐘），請稍後再試'));
    }, timeoutMs);
    
    chrome.runtime.sendMessage({ 
      type: 'QUERY_IMAGE', 
      payload: { 
        model: DEFAULT_IMAGE_MODEL, 
        prompt: prompt 
      } 
    }, (response) => {
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message || '連線中斷'));
        return;
      }
      if (response?.error) reject(new Error(response.error));
      else if (!response?.images?.length) {
        // Include debug info if model returned text instead of images
        const debugInfo = response?.debugText ? `\n模型回覆：${response.debugText}...` : '';
        reject(new Error(`未收到圖片${debugInfo}\n請重試或檢查 prompt`));
      }
      else {
        // Track image generation cost
        if (response.usage && response.model) {
          addToSessionCost(
            response.model, 
            response.usage.prompt_tokens || 0, 
            response.usage.completion_tokens || 0,
            'imageGen'
          );
        }
        resolve(response.images);
      }
    });
  });
}

function showError(message) { errorText.textContent = message; errorBanner.classList.remove('hidden'); }
function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function cssEscape(value) { if (CSS.escape) return CSS.escape(value); return value.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&'); }

init();
