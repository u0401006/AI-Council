// ============================================
// Translation-Focus: Planner (Simplified)
// Removed: LLM-based planner, web_search flow, request_user_input,
//          HybridPlanner, OrchestratedPlanner
// Peer review is always enabled (hard-coded)
// Flow: query_council → peer_review → synthesize → final_answer
// ============================================

/**
 * Rule-based Planner — translation-only, peer_review always on
 */
class RuleBasedPlanner {
  constructor(config = {}) {
    this.skillHint = null;
    this.preferredTools = null;
    this.skill = null;
  }

  setSkillHint(hint) { this.skillHint = hint; }
  setTools(_tools) { /* no-op */ }
  setPreferredTools(tools) { this.preferredTools = tools; }
  setSkill(skill) { this.skill = skill; }
  setOrchestrator(_o) { /* no-op */ }

  async plan(context) {
    const summary = context.getSummary();
    const lastActions = summary.lastActions || [];
    const lastAction = lastActions[lastActions.length - 1];

    // If synthesis done, return final answer
    if (context.lastSynthesis) {
      return {
        tool: 'final_answer',
        parameters: { content: context.lastSynthesis },
        reasoning: 'Synthesis completed'
      };
    }
    if (lastAction === 'synthesize') {
      return {
        tool: 'final_answer',
        parameters: { content: context.responses?.[0]?.content || '翻譯完成' },
        reasoning: 'Already synthesized'
      };
    }

    // Loop detection
    const secondLast = lastActions[lastActions.length - 2];
    if (lastAction && lastAction === secondLast) {
      return {
        tool: 'synthesize',
        parameters: {
          query: context.query,
          responses: context.responses,
          reviews: context.reviews,
          searches: []
        },
        reasoning: 'Forcing synthesis after repeated action'
      };
    }

    // Step 1: Query council (all models translate)
    if (!summary.hasResponses) {
      return {
        tool: 'query_council',
        parameters: { query: context.query, includeSearchSuffix: false },
        reasoning: 'Starting: query all models for translation'
      };
    }

    // Step 2: Peer review (always enabled, requires ≥2 responses)
    if (summary.hasResponses && !summary.hasReviews && summary.responseCount >= 2) {
      return {
        tool: 'peer_review',
        parameters: { responses: context.responses, query: context.query },
        reasoning: 'Running peer review on translations'
      };
    }

    // Step 3: Synthesize
    if (summary.hasResponses) {
      return {
        tool: 'synthesize',
        parameters: {
          query: context.query,
          responses: context.responses,
          reviews: context.reviews,
          searches: []
        },
        reasoning: 'Synthesizing best translation'
      };
    }

    // Fallback
    return {
      tool: 'final_answer',
      parameters: { content: '無法完成翻譯' },
      reasoning: 'Fallback'
    };
  }
}

/**
 * createPlanner — always returns RuleBasedPlanner (no LLM planner)
 */
function createPlanner(config = {}) {
  return new RuleBasedPlanner(config);
}

// Stubs for compatibility
class Planner extends RuleBasedPlanner {}
class OrchestratedPlanner extends RuleBasedPlanner {}
class HybridPlanner extends RuleBasedPlanner {}

// Format/build/parse kept as thin stubs so callers don't break
function formatToolsForPrompt() { return ''; }
function buildPlanningPrompt(context) { return context?.query || ''; }
function parsePlannerResponse() { return null; }

if (typeof window !== 'undefined') {
  window.MAVPlanner = {
    PLANNER_SYSTEM_PROMPT: '',
    formatToolsForPrompt,
    buildPlanningPrompt,
    parsePlannerResponse,
    Planner,
    RuleBasedPlanner,
    OrchestratedPlanner,
    HybridPlanner,
    createPlanner
  };
}
