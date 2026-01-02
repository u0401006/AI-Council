// ============================================
// MAV Agent Framework - Agent Loop Core
// ============================================

/**
 * Agent execution context
 * Maintains state across iterations
 */
class AgentContext {
  constructor(query, settings = {}) {
    this.query = query;
    this.originalQuery = query;
    this.iteration = 0;
    this.maxIterations = settings.maxIterations || 10;
    
    // Accumulated data
    this.responses = [];
    this.reviews = null;
    this.searches = [];
    this.history = [];
    this.lastSynthesis = null;  // Store last synthesis result for final_answer
    
    // Metadata
    this.startTime = Date.now();
    this.skill = settings.skill || null;
    this.plannerModel = settings.plannerModel || null;
    
    // Flags
    this.completed = false;
    this.cancelled = false;
  }
  
  /**
   * Add execution history entry
   */
  addHistory(action, result) {
    this.history.push({
      iteration: this.iteration,
      action,
      result,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get summary of current state (for Planner)
   */
  getSummary() {
    return {
      query: this.query,
      iteration: this.iteration,
      maxIterations: this.maxIterations,
      hasResponses: this.responses.length > 0,
      responseCount: this.responses.length,
      hasReviews: this.reviews !== null,
      hasSearches: this.searches.length > 0,
      searchCount: this.searches.length,
      lastActions: this.history.slice(-3).map(h => h.action.tool),
      elapsedTime: Date.now() - this.startTime,
      skill: this.skill?.id || null
    };
  }
  
  /**
   * Update context with tool result
   */
  updateFromResult(toolName, result) {
    if (!result.success) return;
    
    const data = result.data;
    
    switch (toolName) {
      case 'query_council':
        this.responses = data.responses || [];
        break;
        
      case 'web_search':
        this.searches.push({
          query: data.query,
          results: data.results,
          timestamp: Date.now()
        });
        break;
        
      case 'peer_review':
        this.reviews = {
          reviews: data.reviews,
          aggregatedRanking: data.aggregatedRanking
        };
        break;
        
      case 'synthesize':
        // Store synthesis result for potential final_answer
        this.lastSynthesis = data?.content || data?.result || null;
        break;
        
      case 'final_answer':
        this.completed = true;
        break;
    }
  }
  
  /**
   * Check if context has enough data to synthesize
   */
  canSynthesize() {
    return this.responses.length >= 2;
  }
  
  /**
   * Check for loop detection (repeated actions)
   */
  isLooping() {
    if (this.history.length < 3) return false;
    
    const last3 = this.history.slice(-3).map(h => h.action.tool);
    return last3[0] === last3[1] && last3[1] === last3[2];
  }
}

/**
 * Agent Loop - Core reasoning loop implementation
 */
class AgentLoop {
  constructor(config = {}) {
    this.toolRegistry = config.toolRegistry || window.MAVTools?.toolRegistry;
    this.planner = config.planner || null;
    this.maxIterations = config.maxIterations || 10;
    this.plannerModel = config.plannerModel || null;
    
    // Callbacks for UI updates
    this.onIterationStart = config.onIterationStart || (() => {});
    this.onToolStart = config.onToolStart || (() => {});
    this.onToolEnd = config.onToolEnd || (() => {});
    this.onIterationEnd = config.onIterationEnd || (() => {});
    this.onComplete = config.onComplete || (() => {});
    this.onError = config.onError || (() => {});
  }
  
  /**
   * Set the planner instance
   */
  setPlanner(planner) {
    this.planner = planner;
  }
  
  /**
   * Apply a skill configuration to the agent
   */
  applySkill(skill) {
    if (!skill) return;
    
    // Override settings from skill
    if (skill.maxIterations) {
      this.maxIterations = skill.maxIterations;
    }
    
    if (skill.plannerHint && this.planner) {
      this.planner.setSkillHint(skill.plannerHint);
    }
  }
  
  /**
   * Run the agent loop
   * @param {string} query - User's question
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Final result
   */
  async run(query, options = {}) {
    const context = new AgentContext(query, {
      maxIterations: this.maxIterations,
      skill: options.skill,
      plannerModel: this.plannerModel
    });
    
    // Apply skill if provided
    if (options.skill) {
      this.applySkill(options.skill);
    }
    
    try {
      while (context.iteration < context.maxIterations && !context.completed && !context.cancelled) {
        context.iteration++;
        
        this.onIterationStart(context);
        
        // Debug: log context state before planning
        console.log('Context before planning:', {
          iteration: context.iteration,
          historyLength: context.history.length,
          lastActions: context.getSummary().lastActions,
          hasResponses: context.responses.length > 0,
          lastSynthesis: context.lastSynthesis?.substring?.(0, 50)
        });
        
        // Get next action from planner
        const action = await this._plan(context);
        
        if (!action || action.tool === 'final_answer') {
          // If planner returns final_answer or null, we're done
          const content = action?.parameters?.content || context.lastSynthesis;
          if (content) {
            context.completed = true;
            this.onComplete({
              success: true,
              content: content,
              context
            });
            return {
              success: true,
              content: content,
              context: context.getSummary()
            };
          }
          break;
        }
        
        // Safeguard: if we already have a synthesis and planner wants to synthesize again, return final_answer
        if (action.tool === 'synthesize' && context.lastSynthesis) {
          console.log('Synthesis already done, returning final answer');
          context.completed = true;
          this.onComplete({
            success: true,
            content: context.lastSynthesis,
            context
          });
          return {
            success: true,
            content: context.lastSynthesis,
            context: context.getSummary()
          };
        }
        
        // Execute the action
        this.onToolStart(action, context);
        
        const result = await this._execute(action, context);
        
        this.onToolEnd(action, result, context);
        
        // Update context with result
        context.updateFromResult(action.tool, result);
        context.addHistory(action, result);
        
        // Check for loop detection
        if (context.isLooping()) {
          console.warn('Agent loop detected repeated actions, forcing synthesis');
          break;
        }
        
        this.onIterationEnd(context);
      }
      
      // If we exited the loop without completing, do a fallback synthesis
      if (!context.completed) {
        const fallbackResult = await this._fallbackSynthesize(context);
        this.onComplete({
          success: true,
          content: fallbackResult,
          context,
          fallback: true
        });
        return {
          success: true,
          content: fallbackResult,
          context: context.getSummary(),
          fallback: true
        };
      }
      
    } catch (error) {
      this.onError(error, context);
      return {
        success: false,
        error: error.message,
        context: context.getSummary()
      };
    }
  }
  
  /**
   * Plan next action using the Planner
   */
  async _plan(context) {
    if (!this.planner) {
      // If no planner, use default strategy
      return this._defaultStrategy(context);
    }
    
    return await this.planner.plan(context);
  }
  
  /**
   * Execute a tool action
   */
  async _execute(action, context) {
    if (!this.toolRegistry) {
      throw new Error('Tool registry not initialized');
    }
    
    return await this.toolRegistry.execute(action.tool, action.parameters, context);
  }
  
  /**
   * Default strategy when no planner is available
   * Mimics the legacy 3-stage workflow
   */
  _defaultStrategy(context) {
    const summary = context.getSummary();
    
    // Priority 0: If synthesis already done, return final_answer
    if (context.lastSynthesis) {
      return {
        tool: 'final_answer',
        parameters: { content: context.lastSynthesis },
        reasoning: 'Synthesis completed, returning final answer'
      };
    }
    
    // Check if last action was synthesize
    const lastActions = summary.lastActions || [];
    const lastAction = lastActions[lastActions.length - 1];
    if (lastAction === 'synthesize') {
      return {
        tool: 'final_answer',
        parameters: { content: context.responses?.[0]?.content || '處理完成' },
        reasoning: 'Already synthesized, returning final answer'
      };
    }
    
    // Stage 1: Query models first
    if (!summary.hasResponses) {
      return {
        tool: 'query_council',
        parameters: {
          query: context.query,
          includeSearchSuffix: true
        },
        reasoning: 'First step: query all council models'
      };
    }
    
    // Stage 2: Peer review if we have enough responses
    if (summary.hasResponses && !summary.hasReviews && summary.responseCount >= 2) {
      return {
        tool: 'peer_review',
        parameters: {
          responses: context.responses,
          query: context.query
        },
        reasoning: 'Have responses, running peer review'
      };
    }
    
    // Stage 3: Synthesize
    if (summary.hasResponses) {
      return {
        tool: 'synthesize',
        parameters: {
          query: context.query,
          responses: context.responses,
          reviews: context.reviews,
          searches: context.searches
        },
        reasoning: 'Synthesizing final answer'
      };
    }
    
    // Fallback: just end
    return {
      tool: 'final_answer',
      parameters: {
        content: 'Unable to generate response'
      },
      reasoning: 'Fallback - no valid next action'
    };
  }
  
  /**
   * Fallback synthesis when loop ends without completion
   */
  async _fallbackSynthesize(context) {
    if (context.responses.length === 0) {
      return '無法獲取任何模型回應，請稍後再試。';
    }
    
    // Try to synthesize with whatever we have
    const result = await this.toolRegistry.execute('synthesize', {
      query: context.query,
      responses: context.responses,
      reviews: context.reviews,
      searches: context.searches
    }, context);
    
    if (result.success) {
      return result.data.content;
    }
    
    // Ultimate fallback: return best response
    const bestResponse = context.responses[0];
    return `[基於最佳回應]\n\n${bestResponse.content}`;
  }
  
  /**
   * Cancel the running agent loop
   */
  cancel() {
    // This would need to be implemented with proper async cancellation
    // For now, just log
    console.log('Agent loop cancellation requested');
  }
}

/**
 * Simple Agent - a simplified version for quick tasks
 */
class SimpleAgent extends AgentLoop {
  constructor(config = {}) {
    super({
      ...config,
      maxIterations: config.maxIterations || 3
    });
  }
  
  /**
   * Override to use simpler default strategy
   */
  _defaultStrategy(context) {
    const summary = context.getSummary();
    
    // If synthesis already done, return final_answer
    if (context.lastSynthesis) {
      return {
        tool: 'final_answer',
        parameters: { content: context.lastSynthesis },
        reasoning: 'Synthesis completed'
      };
    }
    
    // Just query and synthesize
    if (!summary.hasResponses) {
      return {
        tool: 'query_council',
        parameters: { query: context.query },
        reasoning: 'Quick query to council'
      };
    }
    
    // Direct synthesis without review
    return {
      tool: 'synthesize',
      parameters: {
        query: context.query,
        responses: context.responses
      },
      reasoning: 'Quick synthesis'
    };
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVAgent = {
    AgentContext,
    AgentLoop,
    SimpleAgent
  };
}

