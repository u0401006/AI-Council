// ============================================
// MAV Legacy Workflow - Three-Stage Council
// ============================================
// This module encapsulates the original three-stage workflow logic
// for backward compatibility when Agent mode is disabled.

/**
 * Legacy Council Workflow Controller
 * Manages the traditional Stage 1 → Stage 2 → Stage 3 flow
 */
class LegacyCouncilWorkflow {
  constructor(appContext) {
    this.app = appContext;
  }
  
  /**
   * Run the full council workflow
   * @param {string} query - User's question
   * @returns {Promise<Object>} - Workflow result
   */
  async run(query) {
    const {
      councilModels,
      chairmanModel,
      enableReview,
      enableSearchMode,
      visionMode,
      uploadedImage,
      contextItems,
      learnerMode,
      enableTaskPlanner
    } = this.app.getSettings();
    
    // Validate prerequisites
    this._validatePrerequisites(query, councilModels);
    
    // Initialize workflow state
    const workflowState = {
      query,
      responses: new Map(),
      reviews: new Map(),
      reviewFailures: new Map(),
      savedResponses: [],
      aggregatedRanking: null,
      finalAnswerContent: '',
      searchResults: null
    };
    
    try {
      // === STAGE 1: Parallel Model Queries ===
      await this._runStage1(workflowState);
      
      // Validate minimum responses
      if (workflowState.savedResponses.length < 2) {
        throw new Error('Council 需要至少 2 個模型成功回應');
      }
      
      // === STAGE 2: Peer Review (Optional) ===
      if (enableReview) {
        await this._runStage2(workflowState);
      }
      
      // === STAGE 2.5: Search Selection (If enabled) ===
      if (enableSearchMode) {
        const searchDecision = await this._runStage25(workflowState);
        workflowState.searchResults = searchDecision?.results || null;
      }
      
      // === STAGE 3: Chairman Synthesis ===
      await this._runStage3(workflowState);
      
      return {
        success: true,
        query: workflowState.query,
        responses: workflowState.savedResponses,
        ranking: workflowState.aggregatedRanking,
        finalAnswer: workflowState.finalAnswerContent
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        query: workflowState.query
      };
    }
  }
  
  /**
   * Validate workflow prerequisites
   */
  _validatePrerequisites(query, models) {
    if (!query || query.trim().length === 0) {
      throw new Error('請輸入問題');
    }
    
    if (!models || models.length === 0) {
      throw new Error('尚未選擇模型，請至設定頁面進行設定');
    }
  }
  
  /**
   * Stage 1: Parallel query to all council models
   */
  async _runStage1(state) {
    const { councilModels, buildPromptWithContext, queryModel, COUNCIL_SEARCH_SUFFIX } = this.app;
    
    // Build prompt with context
    let promptWithContext = buildPromptWithContext(state.query);
    
    // Always request search suggestions
    promptWithContext += COUNCIL_SEARCH_SUFFIX;
    
    // Query all models in parallel
    const results = await Promise.allSettled(
      councilModels.map(model => queryModel(model, promptWithContext))
    );
    
    // Collect successful responses
    state.savedResponses = [];
    results.forEach((result, index) => {
      const model = councilModels[index];
      if (result.status === 'fulfilled' && result.value?.status === 'done') {
        state.savedResponses.push({
          model,
          content: result.value.content,
          latency: result.value.latency
        });
        state.responses.set(model, result.value);
      }
    });
    
    return state.savedResponses;
  }
  
  /**
   * Stage 2: Anonymous peer review
   */
  async _runStage2(state) {
    const { runReview, aggregateRankings } = this.app;
    
    // Run reviews in parallel
    const reviewPromises = state.savedResponses.map(response => 
      runReview(response.model, state.query, state.savedResponses)
    );
    
    const reviewResults = await Promise.allSettled(reviewPromises);
    
    // Collect reviews
    reviewResults.forEach((result, index) => {
      const model = state.savedResponses[index].model;
      if (result.status === 'fulfilled' && result.value) {
        state.reviews.set(model, result.value);
      } else {
        state.reviewFailures.set(model, result.reason?.message || 'Review failed');
      }
    });
    
    // Aggregate rankings
    if (state.reviews.size > 0) {
      state.aggregatedRanking = aggregateRankings(
        Array.from(state.reviews.values()),
        state.savedResponses
      );
    }
    
    return state.aggregatedRanking;
  }
  
  /**
   * Stage 2.5: Search selection (optional)
   */
  async _runStage25(state) {
    const { showStage25AndWaitForAction, executeSearchQueries } = this.app;
    
    // Collect search suggestions from responses
    const allSuggestions = this._extractSearchSuggestions(state.savedResponses);
    
    if (allSuggestions.length === 0) {
      return null;
    }
    
    // Show UI and wait for user decision
    const decision = await showStage25AndWaitForAction(allSuggestions);
    
    if (decision?.action === 'search' && decision.queries?.length > 0) {
      // Execute searches
      const results = await executeSearchQueries(decision.queries);
      return { results };
    }
    
    return null;
  }
  
  /**
   * Stage 3: Chairman synthesis
   */
  async _runStage3(state) {
    const { runChairman, enableSearchMode, searchIteration, maxSearchIterations } = this.app;
    
    const withSearchMode = enableSearchMode && searchIteration < maxSearchIterations;
    
    state.finalAnswerContent = await runChairman(
      state.query,
      state.savedResponses,
      state.aggregatedRanking,
      withSearchMode,
      null, // executingCardId
      state.searchResults
    );
    
    return state.finalAnswerContent;
  }
  
  /**
   * Extract search suggestions from model responses
   */
  _extractSearchSuggestions(responses) {
    const suggestions = [];
    const seen = new Set();
    
    for (const response of responses) {
      const match = response.content.match(/```json\s*({[\s\S]*?search_queries[\s\S]*?})\s*```/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed.search_queries)) {
            for (const q of parsed.search_queries) {
              const normalized = q.trim().toLowerCase();
              if (!seen.has(normalized)) {
                seen.add(normalized);
                suggestions.push({ query: q.trim(), source: response.model });
              }
            }
          }
        } catch (e) {
          // JSON parse failed, skip
        }
      }
    }
    
    return suggestions;
  }
}

/**
 * Create a legacy workflow runner
 * This function wraps the existing handleSend logic for backward compatibility
 */
function createLegacyRunner(appContext) {
  return new LegacyCouncilWorkflow(appContext);
}

/**
 * Run legacy council workflow (called from app.js)
 * This is the main entry point for the traditional 3-stage flow
 */
async function runLegacyCouncil(query, appContext) {
  const workflow = createLegacyRunner(appContext);
  return await workflow.run(query);
}

// Export for use in app.js
if (typeof window !== 'undefined') {
  window.MAVLegacy = {
    LegacyCouncilWorkflow,
    createLegacyRunner,
    runLegacyCouncil
  };
}

