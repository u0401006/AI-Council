// Council logic: Stage 2 (Review) and Stage 3 (Chairman synthesis)

/**
 * Generate review prompt for a model to evaluate other responses
 * @param {string} query - Original user query
 * @param {Array<{model: string, content: string}>} responses - All model responses
 * @param {string} currentModel - The model doing the review (excluded from evaluation)
 * @returns {string} Review prompt
 */
export function generateReviewPrompt(query, responses, currentModel) {
  // Filter out current model and anonymize
  const otherResponses = responses
    .filter(r => r.model !== currentModel)
    .map((r, i) => ({
      label: `Response ${String.fromCharCode(65 + i)}`, // A, B, C, ...
      content: r.content
    }));

  if (otherResponses.length === 0) {
    return null;
  }

  const responsesText = otherResponses
    .map(r => `### ${r.label}\n${r.content}`)
    .join('\n\n---\n\n');

  return `You are an impartial evaluator. Your task is to rank the following responses to a user's question based on accuracy, completeness, and insight.

## User's Question
${query}

## Responses to Evaluate
${responsesText}

## Your Task
Rank these responses from best to worst. For each response, provide:
1. A rank (1 = best)
2. A brief reason (1-2 sentences)

Output your evaluation in this exact JSON format:
\`\`\`json
{
  "rankings": [
    {"response": "A", "rank": 1, "reason": "..."},
    {"response": "B", "rank": 2, "reason": "..."}
  ]
}
\`\`\`

Be objective. Judge only the content, not writing style. Focus on factual accuracy and helpfulness.`;
}

/**
 * Generate chairman synthesis prompt
 * @param {string} query - Original user query
 * @param {Array<{model: string, content: string}>} responses - All model responses
 * @param {Array<{reviewer: string, rankings: Array}>} reviews - Review results (optional)
 * @returns {string} Chairman prompt
 */
export function generateChairmanPrompt(query, responses, reviews = null) {
  const responsesText = responses
    .map((r, i) => `### Expert ${i + 1}\n${r.content}`)
    .join('\n\n---\n\n');

  let reviewSummary = '';
  if (reviews && reviews.length > 0) {
    // Aggregate rankings
    const scores = {};
    responses.forEach((_, i) => {
      scores[`Expert ${i + 1}`] = { totalRank: 0, count: 0 };
    });

    reviews.forEach(review => {
      if (review.rankings) {
        review.rankings.forEach(r => {
          const expertIndex = r.response.charCodeAt(0) - 65; // A=0, B=1, etc
          if (expertIndex >= 0 && expertIndex < responses.length) {
            const key = `Expert ${expertIndex + 1}`;
            if (scores[key]) {
              scores[key].totalRank += r.rank;
              scores[key].count += 1;
            }
          }
        });
      }
    });

    const avgRanks = Object.entries(scores)
      .filter(([_, v]) => v.count > 0)
      .map(([k, v]) => ({ expert: k, avgRank: v.totalRank / v.count }))
      .sort((a, b) => a.avgRank - b.avgRank);

    if (avgRanks.length > 0) {
      reviewSummary = `\n## Peer Review Summary\nBased on peer evaluation, the responses are ranked (best to worst): ${avgRanks.map(r => r.expert).join(' > ')}\n`;
    }
  }

  return `You are the Chairman of an AI Council. Multiple AI experts have provided responses to a user's question. Your task is to synthesize their insights into a single, comprehensive final answer.

## User's Question
${query}

## Expert Responses
${responsesText}
${reviewSummary}
## Your Task
Synthesize the above responses into a single, authoritative answer that:
1. Incorporates the best insights from all experts
2. Resolves any contradictions by favoring the most accurate information
3. Presents information in a clear, well-organized manner
4. Is comprehensive but not redundant

Provide your synthesized answer directly, without meta-commentary about the synthesis process.`;
}

/**
 * Parse review response JSON
 * @param {string} content - Model response containing JSON
 * @returns {Object|null} Parsed rankings or null if failed
 */
export function parseReviewResponse(content) {
  try {
    // Extract JSON from markdown code block if present
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    const parsed = JSON.parse(jsonStr.trim());
    return parsed.rankings || parsed;
  } catch (e) {
    console.error('Failed to parse review response:', e);
    return null;
  }
}

/**
 * Map anonymous labels back to model names
 * @param {Array} rankings - Rankings with anonymous labels (A, B, C)
 * @param {Array<string>} modelOrder - Original model order (excluding reviewer)
 * @returns {Array} Rankings with model names
 */
export function mapRankingsToModels(rankings, modelOrder) {
  if (!rankings || !Array.isArray(rankings)) return [];
  
  return rankings.map(r => {
    const index = r.response.charCodeAt(0) - 65; // A=0, B=1
    return {
      model: modelOrder[index] || r.response,
      rank: r.rank,
      reason: r.reason
    };
  });
}

