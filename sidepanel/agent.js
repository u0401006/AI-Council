// ============================================
// MAV Agent Framework - Agent Loop Core
// Multi-Agent Orchestration Support
// ============================================

/**
 * Agent execution context
 * Maintains state across iterations
 * Extended for Multi-Agent Orchestration
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
    
    // Multi-Agent Orchestration
    this.assignmentPlan = settings.assignmentPlan || null;
    this.currentChairman = settings.chairmanModel || null;
    this.chairmanHistory = [];
    this.roundWinner = null;
    
    // Grouped responses by task (for heterogeneous plans)
    this.taskResponses = new Map(); // taskId -> responses[]
    this.modelWeights = new Map();  // model -> weight
    this.modelStrengths = new Map(); // model -> strength score (from reviews)
    
    // Flags
    this.completed = false;
    this.cancelled = false;
  }
  
  /**
   * Set assignment plan and initialize weights
   */
  setAssignmentPlan(plan) {
    this.assignmentPlan = plan;
    
    console.log('[AgentContext] Assignment plan set:', {
      strategy: plan?.strategy,
      assignmentCount: plan?.assignments?.length
    });
    
    // Initialize model weights from plan
    if (plan && plan.assignments) {
      for (const assignment of plan.assignments) {
        this.modelWeights.set(assignment.model, assignment.weight || 0);
      }
      console.log('[AgentContext] Model weights:', Object.fromEntries(this.modelWeights));
    }
  }
  
  /**
   * Get assignment for a specific model
   */
  getAssignment(model) {
    if (!this.assignmentPlan) return null;
    return this.assignmentPlan.assignments.find(a => a.model === model) || null;
  }
  
  /**
   * Group responses by their assigned task
   */
  groupResponsesByTask() {
    if (!this.assignmentPlan) {
      // No plan, all responses are for same task
      this.taskResponses.set('default', [...this.responses]);
      return;
    }
    
    this.taskResponses.clear();
    
    for (const response of this.responses) {
      const assignment = this.getAssignment(response.model);
      const taskKey = assignment?.task || 'default';
      
      if (!this.taskResponses.has(taskKey)) {
        this.taskResponses.set(taskKey, []);
      }
      this.taskResponses.get(taskKey).push(response);
    }
  }
  
  /**
   * Update model strength score from peer review
   */
  updateModelStrength(model, score) {
    const current = this.modelStrengths.get(model) || 0;
    this.modelStrengths.set(model, current + score);
  }
  
  /**
   * Get weighted score for a model
   * finalScore = taskWeight × modelStrength × peerRank
   */
  getWeightedScore(model, peerRank) {
    const weight = this.modelWeights.get(model) || 1.0;
    const strength = this.modelStrengths.get(model) || 1.0;
    return weight * strength * peerRank;
  }
  
  /**
   * Determine round winner based on peer review results
   */
  determineRoundWinner() {
    if (!this.reviews?.aggregatedRanking?.length) {
      console.log('[AgentContext] No ranking data to determine winner');
      return null;
    }
    
    // Get model with highest weighted score
    let bestModel = null;
    let bestScore = -1;
    
    for (const { model, score } of this.reviews.aggregatedRanking) {
      const weightedScore = this.getWeightedScore(model, score);
      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        bestModel = model;
      }
    }
    
    this.roundWinner = bestModel;
    console.log('[AgentContext] Round winner determined:', bestModel, 'with score:', bestScore);
    return bestModel;
  }
  
  /**
   * Promote round winner to Chairman for next round
   */
  promoteWinnerToChairman() {
    if (this.roundWinner) {
      const previousChairman = this.currentChairman;
      this.chairmanHistory.push(this.currentChairman);
      this.currentChairman = this.roundWinner;
      console.log('[AgentContext] Chairman promoted:', previousChairman, '→', this.currentChairman);
      return this.currentChairman;
    }
    console.log('[AgentContext] No winner to promote');
    return null;
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
      skill: this.skill?.id || null,
      // Multi-Agent Orchestration info
      hasAssignmentPlan: this.assignmentPlan !== null,
      assignmentStrategy: this.assignmentPlan?.strategy || null,
      currentChairman: this.currentChairman,
      roundWinner: this.roundWinner,
      taskCount: this.taskResponses.size
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
        // Group responses by task if we have an assignment plan
        if (this.assignmentPlan) {
          this.groupResponsesByTask();
        }
        break;
        
      case 'web_search':
        this.searches.push({
          query: data.query,
          results: data.results,
          timestamp: Date.now()
        });
        console.log('[AgentContext] Searches updated:', this.searches.length, 'total,', data.results?.length || 0, 'new results');
        break;
        
      case 'peer_review':
        this.reviews = {
          reviews: data.reviews,
          aggregatedRanking: data.aggregatedRanking,
          weightedRanking: data.weightedRanking || null
        };
        
        // Update model strengths from peer review
        if (data.aggregatedRanking) {
          const maxScore = data.aggregatedRanking[0]?.score || 1;
          for (const { model, score } of data.aggregatedRanking) {
            // Normalize to 0-1 range
            this.updateModelStrength(model, score / maxScore);
          }
        }
        
        // Determine round winner for chairman rotation
        this.determineRoundWinner();
        break;
        
      case 'synthesize':
        // Store synthesis result for potential final_answer
        this.lastSynthesis = data?.content || data?.result || null;
        break;
        
      case 'final_answer':
        this.completed = true;
        // If completing a round, promote winner to chairman
        if (this.roundWinner && this.assignmentPlan) {
          this.promoteWinnerToChairman();
        }
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
 * Extended for Multi-Agent Orchestration
 */
class AgentLoop {
  constructor(config = {}) {
    this.toolRegistry = config.toolRegistry || window.MAVTools?.toolRegistry;
    this.planner = config.planner || null;
    this.maxIterations = config.maxIterations || 10;
    this.plannerModel = config.plannerModel || null;
    
    // Orchestrator for multi-agent mode
    this.orchestrator = config.orchestrator || null;
    
    // Callbacks for UI updates
    this.onIterationStart = config.onIterationStart || (() => {});
    this.onPlanDecision = config.onPlanDecision || (() => {});  // Called after planner decides
    this.onToolStart = config.onToolStart || (() => {});
    this.onToolEnd = config.onToolEnd || (() => {});
    this.onIterationEnd = config.onIterationEnd || (() => {});
    this.onComplete = config.onComplete || (() => {});
    this.onError = config.onError || (() => {});
    
    // Orchestration callbacks
    this.onAssignmentPlan = config.onAssignmentPlan || (() => {});
    this.onChairmanChange = config.onChairmanChange || (() => {});
    this.onSkillSelected = config.onSkillSelected || (() => {});
  }
  
  /**
   * Set the planner instance
   */
  setPlanner(planner) {
    this.planner = planner;
  }
  
  /**
   * Set the orchestrator instance
   */
  setOrchestrator(orchestrator) {
    this.orchestrator = orchestrator;
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
    
    // Notify UI
    this.onSkillSelected(skill);
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
      plannerModel: this.plannerModel,
      chairmanModel: options.chairmanModel,
      assignmentPlan: options.assignmentPlan
    });
    
    // Apply skill if provided
    if (options.skill) {
      this.applySkill(options.skill);
    }
    
    // If orchestrator is available and no assignment plan provided, create one
    if (this.orchestrator && !options.assignmentPlan && options.useOrchestration !== false) {
      try {
        const analysis = await this.orchestrator.analyzeTask(query, options.context || {});
        const plan = await this.orchestrator.createAssignmentPlan(analysis, options.models);
        context.setAssignmentPlan(plan);
        context.currentChairman = this.orchestrator.getChairman();
        
        // Notify UI of assignment plan
        this.onAssignmentPlan(plan, analysis);
      } catch (err) {
        console.warn('Orchestrator failed, falling back to standard flow:', err);
      }
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
        
        // Notify UI of planner decision (with reasoning)
        if (this.onPlanDecision) {
          this.onPlanDecision(action, context);
        }
        
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
        
        // Handle request_user_input breakpoint
        // Note: ToolRegistry wraps result in { success, data }, so we need result.data
        if (action.tool === 'request_user_input') {
          console.log('[AgentLoop] request_user_input raw result:', JSON.stringify(result).slice(0, 200));
          const toolData = result.data || result; // Handle both wrapped and unwrapped
          console.log('[AgentLoop] request_user_input toolData:', JSON.stringify(toolData).slice(0, 200));
          console.log('[AgentLoop] toolData.spawnChild:', toolData.spawnChild);
          console.log('[AgentLoop] toolData.continueLoop:', toolData.continueLoop);
          console.log('[AgentLoop] toolData.action:', toolData.action);
          
          // Handle spawn_child action - user action creates a new child card
          if (toolData.spawnChild && toolData.childCardId) {
            console.log('[AgentLoop] Spawning child card:', toolData.childCardId);
            context.completed = true;
            
            // Return with spawn signal for app.js to handle
            this.onComplete({
              success: true,
              content: context.lastSynthesis || '',
              context,
              spawnChild: true,
              childCardId: toolData.childCardId,
              childQuery: toolData.childQuery
            });
            
            return {
              success: true,
              content: context.lastSynthesis || '',
              context: context.getSummary(),
              spawnChild: true,
              childCardId: toolData.childCardId,
              childQuery: toolData.childQuery
            };
          }
          
          if (toolData.continueLoop) {
            // User wants to continue with some action
            console.log('[AgentLoop] User action:', toolData.action, 'continueLoop:', toolData.continueLoop);
            
            switch (toolData.action) {
              case 'search':
                // User chose to search, continue loop with new search results
                context.updateFromResult('web_search', toolData);
                break;
                
              case 'deepen':
              case 'switch_focus':
              case 'rephrase':
              case 'clarify':
              case 'custom':
                // User provided input that modifies the query/focus
                if (toolData.modifiedQuery) {
                  context.query = toolData.modifiedQuery;
                  console.log('[AgentLoop] Query modified:', toolData.modifiedQuery.slice(0, 50) + '...');
                }
                // Reset responses to get new answers with modified context
                context.responses = [];
                context.reviews = null;
                context.lastSynthesis = null;
                break;
            }
            
            context.addHistory(action, toolData);
            continue;
          } else {
            // User chose to proceed, output final answer
            console.log('[AgentLoop] User chose to proceed with conclusion');
            const content = context.lastSynthesis;
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
        }
        
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

/**
 * Orchestrated Agent Loop
 * Extended for full Multi-Agent orchestration with heterogeneous task execution
 */
class OrchestratedAgentLoop extends AgentLoop {
  constructor(config = {}) {
    super(config);
    
    // Ensure orchestrator is available
    if (!this.orchestrator && window.MAVOrchestrator) {
      this.orchestrator = new window.MAVOrchestrator.Orchestrator();
    }
  }
  
  /**
   * Run with full orchestration support
   */
  async runOrchestrated(query, options = {}) {
    const { models, chairmanModel, context: appContext = {} } = options;
    
    // Setup orchestrator
    if (this.orchestrator) {
      this.orchestrator.setChairman(chairmanModel);
      this.orchestrator.setAvailableModels(models);
    }
    
    // Force orchestration mode
    return this.run(query, {
      ...options,
      useOrchestration: true,
      chairmanModel
    });
  }
  
  /**
   * Execute with assignment plan - supports heterogeneous tasks
   */
  async executeWithPlan(plan, query, context) {
    const taskGroups = plan.getTaskGroups();
    const allResponses = [];
    
    // Execute each task group
    for (const [taskKey, assignments] of taskGroups) {
      const models = assignments.map(a => a.model);
      const skill = assignments[0]?.skill || 'quick-answer';
      const task = assignments[0]?.task || query;
      
      // Build task-specific query if different from main query
      const taskQuery = task !== query ? `${task}\n\n原始問題: ${query}` : query;
      
      // Execute query_council for this task group
      const result = await this.toolRegistry.execute('query_council', {
        query: taskQuery,
        models,
        skillId: skill
      }, context);
      
      if (result.success) {
        // Tag responses with their task
        const responses = (result.data.responses || []).map(r => ({
          ...r,
          task: taskKey,
          skill,
          weight: assignments.find(a => a.model === r.model)?.weight || 0
        }));
        allResponses.push(...responses);
      }
    }
    
    return allResponses;
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.MAVAgent = {
    AgentContext,
    AgentLoop,
    SimpleAgent,
    OrchestratedAgentLoop
  };
}

