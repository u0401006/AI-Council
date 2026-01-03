// English (US) translations
window.LOCALE_EN_US = {
  // AI Language Settings
  ai: {
    languageInstruction: '**IMPORTANT: You MUST respond in English. Use clear, professional American English.**',
    languageName: 'English'
  },
  
  // CSS Content (for ::after, ::before pseudo-elements)
  css: {
    contextEmpty: 'No context added yet'
  },
  
  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    models: 'models',
    cards: 'cards',
    times: 'times',
    depth: 'Depth'
  },
  
  // Options Page
  options: {
    pageTitle: 'AI Council Settings',
    subtitle: 'Multi-model AI Council Settings',
    
    // API Section
    apiSection: 'API Settings',
    apiKeyLabel: 'OpenRouter API Key',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyHint: 'Get your key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a>',
    braveApiKeyLabel: 'Brave Search API Key (Optional)',
    braveApiKeyPlaceholder: 'BSA...',
    braveApiKeyHint: 'Get your key at <a href="https://brave.com/search/api/" target="_blank">brave.com/search/api</a> (2000 free queries/month)',
    
    // Language Section
    languageSection: 'Interface Language',
    languageLabel: 'Select interface and AI response language',
    languageHint: 'AI responses will also use the selected language',
    
    // Models Section
    modelsSection: 'Participating Models',
    updateModelsBtn: 'Update from OpenRouter',
    updateModelsLoading: 'Updating...',
    modelsHint: 'Select models to participate in discussions. <span class="vision-badge">VIS</span> = vision support, <span class="image-badge">IMG</span> = image generation. Pricing: $input/$output per million tokens',
    
    // Chairman Section
    chairmanSection: 'Chairman Model',
    chairmanLabel: 'Select the model to synthesize the final answer',
    chairmanHint: 'Select "Review Winner" to dynamically assign the top-ranked model as chairman',
    reviewWinner: 'Review Winner (Dynamic)',
    
    // Options Section
    optionsSection: 'Options',
    enableReviewLabel: 'Enable Peer Review (Stage 2)',
    enableReviewHint: 'Disable to save API costs, but skips model ranking',
    maxSearchLabel: 'Max Search Iterations',
    maxSearchHint: 'Maximum times AI can suggest web searches per conversation',
    maxDepthLabel: 'Max Task Depth',
    maxDepthHint: 'Maximum depth for subtask expansion in task planner',
    depthOption: 'L0 - L{max} ({layers} levels)',
    
    // Learner Mode Section
    learnerSection: 'Learner Mode',
    learnerHint: 'Adjust AI responses for different age groups with guided exploration',
    learnerWarning: 'When an age group is selected, built-in coaching prompts will override custom prompt templates below.',
    learnerStandard: 'Standard Mode',
    learnerStandardHint: 'Full answers, suitable for adults',
    learner9_10: 'Ages 9-10',
    learner9_10Hint: 'Simple vocabulary, real-life examples, discovery-based',
    learner11_12: 'Ages 11-12',
    learner11_12Hint: 'Clue-based reasoning, connecting knowledge',
    learner13_15: 'Ages 13-15',
    learner13_15Hint: 'Methodology guidance, framework thinking, critical analysis',
    learner16_18: 'Ages 16-18',
    learner16_18Hint: 'Academic depth, multiple perspectives, research-oriented',
    learnerModeNote: 'Currently using built-in prompts for ages {mode}',
    
    // Output Style Section
    outputStyleSection: 'Response Style',
    outputStyleHint: 'Control AI response length and format preferences (Standard mode)',
    outputLengthLabel: 'Length Preference',
    lengthConcise: 'Concise',
    lengthConciseHint: '~500 words, key points',
    lengthStandard: 'Standard',
    lengthStandardHint: '~800 words, moderate detail',
    lengthDetailed: 'Detailed',
    lengthDetailedHint: '~1200 words, comprehensive',
    outputFormatLabel: 'Format Preference',
    formatBullet: 'Bullet Points',
    formatBulletHint: 'Use bullet points, brief items',
    formatMixed: 'Mixed',
    formatMixedHint: 'Flexible based on content',
    formatParagraph: 'Paragraphs',
    formatParagraphHint: 'Use full paragraphs',
    
    // Prompts Section
    promptsSection: 'Prompt Templates',
    resetPromptsBtn: 'Reset to Default',
    promptsHint: 'Customize AI instructions. Variables: <code>{query}</code> user question, <code>{responses}</code> model responses, <code>{ranking}</code> review ranking.',
    reviewPromptLabel: 'Review Prompt (Stage 2)',
    reviewPromptHint: 'Instructions for models to evaluate each other\'s responses',
    reviewPromptPlaceholder: 'Enter review instructions...',
    chairmanPromptLabel: 'Chairman Prompt (Stage 3)',
    chairmanPromptHint: 'Instructions for chairman to synthesize final answer',
    chairmanPromptPlaceholder: 'Enter chairman instructions...',
    
    // Actions
    saveBtn: 'Save Settings',
    
    // Status Messages
    statusSaved: 'Settings saved',
    statusMinModels: 'Please select at least 2 models',
    statusPromptsReset: 'Prompts reset to default',
    statusModelsUpdated: 'Successfully updated {count} models',
    statusModelsUpdateFailed: 'Update failed: {error}'
  },
  
  // Sidepanel
  sidepanel: {
    title: 'AI Council',
    
    // Header Buttons
    newChat: 'New Chat',
    history: 'History',
    export: 'Export',
    settings: 'Settings',
    
    // History Panel
    historyTitle: 'History',
    clearHistory: 'Clear All',
    closeHistory: 'Close',
    
    // Breadcrumb
    backToRoot: 'Back to root card',
    depthLabel: 'Depth: {depth}',
    cardCount: '{count} cards',
    viewInCanvas: 'View task tree in canvas',
    
    // Context Section
    contextTitle: 'Context',
    capturePage: 'Capture Page',
    captureSelection: 'Selection',
    webSearch: 'Search',
    paste: 'Paste',
    clearContext: 'Clear all context',
    
    // Search Iteration
    extendSearch: 'Extended search:',
    cancelSearch: 'Cancel',
    
    // Input
    inputPlaceholder: 'Enter your question...',
    uploadImageHint: 'Click or drag image here',
    uploadImageFormats: 'Supports JPG, PNG, GIF, WebP',
    visionToggle: 'Vision Council: Upload image for multi-AI analysis',
    imageToggle: 'Enable image generation (specific models)',
    searchToggle: 'Enable AI search iteration mode',
    modelCount: '{count} models',
    sendBtn: 'Send',
    
    // Cost Tracker
    costTitle: 'Cost Tracker',
    costInput: 'Input',
    costOutput: 'Output',
    costImageTokens: 'Image tokens',
    
    // Stepper
    stepResponse: 'Response',
    stepReview: 'Review',
    stepSynthesis: 'Synthesis',
    
    // Stages
    stage1Label: 'Stage 1',
    stage1Title: 'Model Responses',
    stage2Label: 'Stage 2',
    stage2Title: 'Peer Review',
    stage3Label: 'Stage 3',
    stage3Title: 'Search Options',
    stage4Label: 'Stage 4',
    stage4Title: 'Chairman Synthesis',
    stageComplete: 'Complete',
    stageSkipped: 'Skipped',
    
    // Search Suggestions
    searchSuggestionsIntro: 'Based on model responses, here are suggested search keywords (select up to 3):',
    customKeywordPlaceholder: 'Enter custom keyword...',
    addKeyword: 'Add',
    executeSearch: 'Execute Search',
    skipSearch: 'Skip Search',
    noSuggestions: 'No search suggestions from models',
    
    // Search Strategy
    searchStrategyTitle: 'Extended Search',
    searchIterationCount: '{current}/{max} times',
    customSearchPlaceholder: 'Enter custom keyword...',
    searchStrategyHint: 'Click AI suggestions or enter custom keywords. Results will be added to context and Council will re-run',
    
    // Branch Actions
    branchActionsTitle: 'Next Steps',
    branchSearch: 'Extended Search',
    branchImage: 'Generate Image',
    branchVision: 'Vision Analysis',
    branchCanvas: 'Open Canvas',
    
    // Canvas Section
    openInCanvas: 'Open in Canvas',
    canvasDesc: 'Edit and adjust response content',
    openInTab: 'Open in new tab',
    openInWindow: 'Open in standalone window',
    
    // Empty State
    emptyState: 'Enter a question to query multiple AI models',
    
    // Todo Section
    todoTitle: 'To-do Tasks',
    addTask: 'Add Task',
    todoEmpty: 'No tasks yet. Click the button above to add',
    newTaskPlaceholder: 'Enter new task... (Ctrl+Enter to confirm)',
    newTaskHint: 'Press Ctrl+Enter or click ✓ to confirm',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    
    // Conversation Cost
    conversationCostTitle: 'Conversation Cost',
    costStage1: 'Stage 1 (Model Responses)',
    costStage2: 'Stage 2 (Peer Review)',
    costStage3: 'Stage 3 (Chairman Synthesis)',
    costImageGen: 'Image Generation',
    
    // Export Modal
    exportTitle: 'Export Conversation',
    exportMd: 'Markdown (.md)',
    exportJson: 'JSON (.json)',
    copyClipboard: 'Copy to Clipboard',
    
    // New Conversation Modal
    newConvTitle: 'Start New Conversation',
    newSessionOption: 'Create New Session',
    newSessionDesc: 'Clear all cards and start fresh',
    newRootOption: 'Add Root Card',
    newRootDesc: 'Add another topic in current session',
    
    // Paste Modal
    pasteTitle: 'Paste Context',
    pasteHint: 'Paste the content you want to add as context:',
    pastePlaceholder: 'Paste content here...',
    pasteCharCount: '{count} characters',
    confirmPaste: 'Confirm Paste',
    
    // Web Search Modal
    webSearchTitle: 'Web Search',
    webSearchHint: 'Enter keywords to search the web. Results will be added to context:',
    webSearchPlaceholder: 'Enter search keywords...',
    searchPreparing: 'Preparing search...'
  },
  
  // Canvas
  canvas: {
    pageTitle: 'AI Council Canvas',
    title: 'Canvas',
    untitled: 'Untitled',
    saved: 'Saved',
    saving: 'Saving...',
    
    // Header Buttons
    import: 'Import',
    importTitle: 'Import from Council',
    export: 'Export',
    newDoc: 'New Document',
    
    // Toolbar
    bold: 'Bold (Ctrl+B)',
    italic: 'Italic (Ctrl+I)',
    code: 'Code',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    bulletList: 'Bullet List',
    numberedList: 'Numbered List',
    quote: 'Quote',
    link: 'Link',
    divider: 'Divider',
    
    // Tree View
    treeViewTitle: 'Task Tree',
    closeSidebar: 'Close Sidebar',
    treeEmpty: 'No task cards yet',
    treeEmptyHint: 'Card hierarchy will appear here after creating tasks in Council',
    reload: 'Reload',
    treeViewToggle: 'Task Tree View',
    
    // Editor
    editorPlaceholder: 'Start writing...',
    
    // AI Toolbar
    rewrite: 'Rewrite',
    summarize: 'Summarize',
    expand: 'Expand',
    translate: 'Translate',
    aiProcessing: 'AI Processing...',
    
    // Import Modal
    importTitle: 'Import Content',
    importEmpty: 'No Council responses available to import.',
    
    // Export Modal
    exportTitle: 'Export Document',
    exportMd: 'Markdown (.md)',
    exportTxt: 'Plain Text (.txt)',
    copyClipboard: 'Copy to Clipboard',
    
    // Translate Modal
    translateTitle: 'Translate to',
    langZhTW: '繁體中文',
    langZhCN: '简体中文',
    langEn: 'English',
    langJa: '日本語',
    langKo: '한국어'
  },
  
  // Toast/Status Messages
  messages: {
    // General
    settingsSaved: 'Settings saved',
    copied: 'Copied',
    imported: 'Content imported',
    
    // Context
    contextAdded: 'Added to context',
    pageCaptured: 'Page content captured',
    selectionCaptured: 'Selection captured',
    pasted: 'Content pasted',
    
    // Errors
    noActiveTab: 'No active tab found',
    noContent: 'Page has no content',
    noSelection: 'No text selected on page',
    noInput: 'Please enter content',
    noKeyword: 'Please enter a keyword',
    noQuestion: 'Please enter a question',
    braveKeyRequired: 'Brave Search API key required for web search',
    searchFailed: 'Search failed: {error}',
    noResults: 'No relevant results found',
    captureFailed: 'Capture failed: {error}',
    pasteFailed: 'Paste failed: {error}',
    
    // Search
    searching: 'Searching for "{keyword}"...',
    fetchingResults: 'Fetching search result pages...',
    searchResultsAdded: 'Search results added, running Council...',
    searchCancelled: 'Extended search cancelled',
    maxIterationsReached: 'Maximum search iterations reached',
    
    // Tasks
    taskExists: 'Task already exists',
    switchedToCard: 'Switched to task card',
    childCardCreated: 'Child card created, edit question and submit',
    childCardWithFeatures: 'Child card created with: {features}',
    exploreCardCreated: 'Exploration card created with context',
    taskToInput: 'Task moved to input, submit to start new conversation',
    maxDepthReached: 'Maximum depth L{depth} reached, cannot expand further',
    keywordAdded: 'Keyword added',
    keywordExists: 'Keyword exists, auto-selected',
    selectAtLeastOne: 'Please select at least one keyword',
    maxThreeKeywords: 'Maximum 3 keywords allowed',
    
    // AI
    generatingSuggestions: 'AI is generating suggested follow-up questions...',
    suggestionsGenerated: 'Suggestions generated, edit as needed and submit',
    suggestionsFailed: 'Suggestion generation failed, using default template',
    projectNameFailed: 'Project name generation failed ({error}), using default',
    
    // Storage
    storageWarning: 'Storage {percent}% used ({used}/{total} MB), consider clearing history',
    storageError: 'Insufficient storage, please clear history'
  },
  
  // Error Messages
  errors: {
    connectionFailed: '{model} temporarily unavailable',
    connectionDetail: 'Network issue or model temporarily down',
    timeout: '{model} response timed out',
    timeoutDetail: 'Model processing took too long',
    authFailed: '{model} authentication failed',
    authDetail: 'Please check API key settings',
    rateLimited: '{model} rate limited',
    rateLimitDetail: 'Please try again later',
    genericError: '{model} encountered an error'
  }
};

