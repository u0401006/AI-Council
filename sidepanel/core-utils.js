(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MAVCoreUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

  function sanitizeLinkUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return '#';
    if (value.startsWith('#') || value.startsWith('/')) return value;
    try {
      const url = new URL(value);
      return SAFE_PROTOCOLS.has(url.protocol) ? value : '#';
    } catch (_) {
      return '#';
    }
  }

  function mapSettledModelResults(models, settledResults) {
    const responses = [];
    const failures = [];
    settledResults.forEach((result, index) => {
      const model = models[index];
      if (result.status === 'fulfilled') responses.push(result.value);
      else failures.push({ model, error: result.reason?.message || 'Unknown error' });
    });
    return { responses, failures };
  }

  function aggregatePeerReviewScores(reviews, responseCount) {
    const scores = new Map();
    for (const review of reviews || []) {
      for (const rank of review?.rankings || []) {
        const model = rank.model || rank.modelId;
        if (!model || !Number.isFinite(rank.rank)) continue;
        scores.set(model, (scores.get(model) || 0) + (responseCount - rank.rank));
      }
    }
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([model, score]) => ({ model, score }));
  }

  return { sanitizeLinkUrl, mapSettledModelResults, aggregatePeerReviewScores };
});
