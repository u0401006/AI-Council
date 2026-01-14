// Traditional Chinese (Taiwan) translations
window.LOCALE_ZH_TW = {
  // AI Language Settings
  ai: {
    languageInstruction: '**重要：你必須使用繁體中文（台灣用語）回應。禁止使用簡體中文。英文與日文專有名詞可保留原文。**',
    languageName: '繁體中文'
  },
  
  // CSS Content (for ::after, ::before pseudo-elements)
  css: {
    contextEmpty: '尚未新增參考資料'
  },
  
  // Common
  common: {
    save: '儲存',
    cancel: '取消',
    confirm: '確認',
    close: '關閉',
    delete: '刪除',
    edit: '編輯',
    add: '新增',
    search: '搜尋',
    loading: '載入中...',
    error: '錯誤',
    success: '成功',
    warning: '警告',
    models: '個模型',
    cards: '張卡片',
    times: '次',
    depth: '深度'
  },
  
  // Options Page
  options: {
    pageTitle: 'AI Council 設定',
    subtitle: '多模型 AI 智囊團設定',
    
    // API Section
    apiSection: 'API 設定',
    apiKeyLabel: 'OpenRouter API 金鑰',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyHint: '前往 <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a> 取得金鑰',
    braveApiKeyLabel: 'Brave Search API 金鑰（選填）',
    braveApiKeyPlaceholder: 'BSA...',
    braveApiKeyHint: '前往 <a href="https://brave.com/search/api/" target="_blank">brave.com/search/api</a> 取得金鑰（免費額度 2000 次/月）',
    
    // Language Section
    languageSection: '介面語言',
    languageLabel: '選擇介面與 AI 回應語言',
    languageHint: '變更後 AI 回應也會使用選擇的語言',
    
    // Models Section
    modelsSection: '參與模型',
    updateModelsBtn: '從 OpenRouter 更新',
    updateModelsLoading: '更新中...',
    modelsHint: '選擇要參與討論的模型。<span class="vision-badge">VIS</span> 表示支援圖片分析，<span class="image-badge">IMG</span> 表示支援圖片生成。定價顯示為：$輸入/$輸出（每百萬 tokens）',
    
    // Chairman Section
    chairmanSection: '主席模型',
    chairmanLabel: '選擇負責彙整最終答案的模型',
    chairmanHint: '選擇「互評勝者」可讓排名第一的模型動態擔任主席',
    reviewWinner: '互評勝者（動態）',
    
    // Options Section
    optionsSection: '選項',
    enableReviewLabel: '啟用互評審查',
    enableReviewHint: '停用可節省 API 費用，但會跳過模型排名',
    maxSearchLabel: '網搜迭代上限',
    maxSearchHint: '單次對話中 AI 可建議網搜的最大次數',
    maxDepthLabel: '任務深度上限',
    maxDepthHint: '任務規劃器中子任務可展開的最大深度',
    depthOption: 'L0 - L{max}（{layers} 層）',
    
    // Learner Mode Section
    learnerSection: '學習者模式',
    learnerHint: '針對不同年齡層調整 AI 的回應方式，啟用教練式引導探索',
    learnerWarning: '選擇年齡層後，將使用內建的教練式提示詞，下方「提示詞範本」的自訂設定會被覆蓋。',
    learnerStandard: '標準模式',
    learnerStandardHint: '完整回答，適合成人使用',
    learner9_10: '9-10 歲',
    learner9_10Hint: '簡單詞彙、生活例子、發現式引導',
    learner11_12: '11-12 歲',
    learner11_12Hint: '給線索推導、連結已知、探索式學習',
    learner13_15: '13-15 歲',
    learner13_15Hint: '方法論引導、框架思考、批判分析',
    learner16_18: '16-18 歲',
    learner16_18Hint: '學術深度、多元觀點、自主研究導向',
    learnerModeNote: '目前使用 {mode} 歲學習者模式的內建提示詞',
    
    // Output Style Section
    outputStyleSection: '回應風格',
    outputStyleHint: '控制 AI 回應的長度與格式偏好（標準模式適用）',
    outputLengthLabel: '長度偏好',
    lengthConcise: '簡潔',
    lengthConciseHint: '約 500 字，重點摘要',
    lengthStandard: '標準',
    lengthStandardHint: '約 800 字，適度展開',
    lengthDetailed: '詳盡',
    lengthDetailedHint: '約 1200 字，完整說明',
    outputFormatLabel: '格式偏好',
    formatBullet: '條列式優先',
    formatBulletHint: '使用項目符號，每點簡短',
    formatMixed: '混合',
    formatMixedHint: '依內容性質靈活選擇',
    formatParagraph: '段落式',
    formatParagraphHint: '使用完整段落說明',
    
    // Prompts Section
    promptsSection: '提示詞範本',
    resetPromptsBtn: '重設為預設',
    promptsHint: '自訂給 AI 模型的指令。可用變數：<code>{query}</code> 使用者問題、<code>{responses}</code> 模型回應、<code>{ranking}</code> 審查排名。',
    reviewPromptLabel: '審查提示詞',
    reviewPromptHint: '模型互相評估回應的指令',
    reviewPromptPlaceholder: '輸入審查指令...',
    chairmanPromptLabel: '主席提示詞',
    chairmanPromptHint: '主席彙整最終答案的指令',
    chairmanPromptPlaceholder: '輸入主席指令...',
    
    // Actions
    saveBtn: '儲存設定',
    
    // Status Messages
    statusSaved: '設定已儲存',
    statusMinModels: '請選擇至少 2 個模型',
    statusPromptsReset: '提示詞已重設為預設',
    statusModelsUpdated: '成功更新 {count} 個模型',
    statusModelsUpdateFailed: '更新失敗: {error}',
    
    // Skills
    skillDeleted: '技能已刪除',
    enterSkillPath: '請輸入技能路徑',
    importingSkill: '匯入中...',
    confirmDeleteSkill: '確定要刪除技能 "{skillId}"？',
    invalidSkillFormat: '無效的 SKILL.md 格式',
    invalidGitHubPath: '無效的 GitHub 路徑格式'
  },
  
  // Sidepanel
  sidepanel: {
    title: 'AI Council',
    
    // Header Buttons
    newChat: '新對話',
    history: '歷史紀錄',
    export: '匯出',
    settings: '設定',
    
    // History Panel
    historyTitle: '歷史紀錄',
    clearHistory: '全部清除',
    closeHistory: '關閉',
    
    // Breadcrumb
    backToRoot: '回到根卡片',
    depthLabel: '深度: {depth}',
    cardCount: '{count} 張卡片',
    viewInCanvas: '在筆記中檢視任務樹',
    
    // Context Section
    contextTitle: '參考',
    capturePage: '擷取頁面',
    captureSelection: '選取文字',
    webSearch: '網搜',
    paste: '貼上',
    clearContext: '清除所有參考資料',
    
    // Search Iteration
    extendSearch: '延伸搜尋：',
    cancelSearch: '取消',
    
    // Input
    inputPlaceholder: '輸入您的問題...',
    uploadImageHint: '點擊或拖放圖片至此',
    uploadImageFormats: '支援 JPG、PNG、GIF、WebP',
    visionToggle: 'Vision Council：上傳圖片讓多個 AI 分析',
    imageToggle: '啟用圖片生成（支援特定模型）',
    searchToggle: '啟用 AI 網搜迭代模式',
    modelCount: '{count} 個模型',
    sendBtn: '送出',
    
    // Skill Selector
    selectSkill: '選擇技能模式',
    autoDetect: '自動偵測',
    searchSkills: '搜尋技能...',
    recommended: '推薦',
    clearSkillSelection: '清除選擇（使用自動偵測）',
    
    // Cost Tracker
    costTitle: '費用追蹤',
    costInput: '輸入',
    costOutput: '輸出',
    costImageTokens: '圖片 tokens',
    
    // Stepper
    stepResponse: '回應',
    stepReview: '審查',
    stepSynthesis: '彙整',
    
    // Stages (no numbered labels, icon-based UI)
    stage1Title: '模型回應',
    stage2Title: '互評審查',
    stage3Title: '搜尋選擇',
    stage4Title: '主席彙整',
    stageComplete: '完成',
    stageSkipped: '已跳過',
    
    // Search Suggestions
    searchSuggestionsIntro: '根據模型回答，以下是建議的搜尋關鍵詞（最多選擇 3 項）：',
    customKeywordPlaceholder: '輸入自訂關鍵字...',
    addKeyword: '新增',
    executeSearch: '執行搜尋',
    skipSearch: '跳過搜尋',
    noSuggestions: '各模型未提供搜尋建議',
    
    // Search Strategy
    searchStrategyTitle: '延伸搜尋',
    searchIterationCount: '{current}/{max} 次',
    customSearchPlaceholder: '輸入自訂關鍵字...',
    searchStrategyHint: '點擊 AI 建議或輸入自訂關鍵字，搜尋結果將加入參考資料並重新執行 Council',
    
    // Branch Actions
    branchActionsTitle: '下一步',
    branchSearch: '延伸搜尋',
    branchImage: '生成圖片',
    branchVision: 'Vision 分析',
    branchCanvas: '做筆記',
    
    // Notes Section (formerly Canvas)
    openInCanvas: '做筆記',
    canvasDesc: '編輯與延伸內容',
    
    // Image Description Modal
    imageDescTitle: '圖片生成',
    imageDescHint: '描述您想要生成的圖片內容：',
    imageDescPlaceholder: '例如：一隻在星空下奔跑的狼，極光照亮雪地...',
    summarizeContent: '從對話摘要',
    startImageGen: '開始生成',
    openInTab: '在新分頁開啟',
    openInWindow: '在獨立視窗開啟',
    
    // Empty State
    emptyState: '輸入問題，同時查詢多個 AI 模型',
    
    // Todo Section
    todoTitle: '待辦任務',
    addTask: '新增任務',
    todoEmpty: '暫無任務，點擊上方按鈕新增',
    newTaskPlaceholder: '輸入新任務... (Ctrl+Enter 確認)',
    newTaskHint: '按 Ctrl+Enter 或點擊右側 ✓ 確認新增',
    priorityHigh: '高優先',
    priorityMedium: '中優先',
    priorityLow: '低優先',
    
    // Conversation Cost
    conversationCostTitle: '本次對話費用',
    costStage1: '模型回應',
    costStage2: '互評審查',
    costStage3: '主席彙整',
    costImageGen: '圖片生成',
    
    // Export Modal
    exportTitle: '匯出對話',
    exportMd: 'Markdown (.md)',
    exportJson: 'JSON (.json)',
    copyClipboard: '複製到剪貼簿',
    
    // New Conversation Modal
    newConvTitle: '開啟新對話',
    newSessionOption: '建立全新 Session',
    newSessionDesc: '清空所有卡片，從頭開始新專案',
    newRootOption: '新增 Root 卡片',
    newRootDesc: '在目前 Session 內新增另一個主題',
    
    // Paste Modal
    pasteTitle: '貼上參考資料',
    pasteHint: '請在下方貼上您要加入的參考資料內容：',
    pastePlaceholder: '在此貼上內容...',
    pasteCharCount: '{count} 字元',
    confirmPaste: '確認貼上',
    
    // Web Search Modal
    webSearchTitle: '網路搜尋',
    webSearchHint: '輸入關鍵字搜尋網路資料，結果將加入參考資料：',
    webSearchPlaceholder: '輸入搜尋關鍵字...',
    searchPreparing: '準備搜尋中...',
    
    // Skills
    noSkillsFound: '找不到符合的技能',
    skillSourceAuto: '自動',
    skillSourceSelected: '已選',
    
    // Stage Status
    stagePreparing: '準備中...',
    stageSearching: '搜尋中...',
    stageReviewing: '審查中...',
    stageSynthesizing: '彙整中...',
    stageCouncilRunning: 'Council 執行中...',
    stageCardRunning: '此卡片執行中...',
    stageFailed: '失敗',
    stageGenerating: '生成中...',
    stageRefining: '潤色中...',
    stageRetrying: '重試中...',
    stageSummarizing: '摘要中...',
    
    // Review
    reviewInProgress: '模型正在互相審查...',
    reviewDisabled: '互評審查已停用',
    reviewNoData: '無審查資料',
    chairmanFailed: '主席彙整失敗：{error}',
    
    // AI Loading
    generatingImage: '使用 {model} 生成圖片中...',
    analyzingImage: '使用 {model} 分析圖片...',
    connectingModel: '連線至 {model}...',
    visionAnalyzing: 'Vision 分析中',
    creatingVisual: '建立視覺內容中...',
    generatingNext: '生成中...',
    startNextRound: '開始下一輪',
    
    // Actions
    download: '下載',
    copy: '複製',
    copiedBrief: '已複製！',
    analyze: '分析',
    
    // Labels
    chairmanLabel: '主席',
    send: '送出',
    generateImage: '生成圖片',
    
    // Summary
    completed: '完成',
    extendSearch: '延伸搜尋',
    webSearchContext: '網路搜尋',
    braveKeyNeeded: '需要設定 Brave Search API 金鑰',
    
    // Task Types
    taskSearch: '搜尋',
    taskImage: '製圖',
    taskVision: '視覺',
    taskExplore: '探索',
    taskVerify: '驗證',
    taskApply: '試試看',
    taskConnect: '連結',
    
    // Branch Actions Labels
    analyzeImageLabel: '分析圖片',
    takeNotesLabel: '做筆記',
    generateImageLabel: '生成圖像',
    
    // Suggested Actions
    suggestedActions: '建議下一步',
    quickInputPlaceholder: '進一步提問...',
    
    // UI Actions
    proceed: '繼續',
    cancelAction: '取消',
    processing: '處理中...',
    responding: '回應中...',
    justNow: '剛剛',
    expanded: '已展開',
    pending: '待處理',
    minutesAgo: '{n}分鐘前',
    hoursAgo: '{n}小時前',
    
    // Misc UI
    characters: '字元',
    iterationQuerying: '迭代 {n}: 查詢中...',
    modelsCompleted: '{done}/{total} 完成'
  },
  
  // Notes (formerly Canvas)
  canvas: {
    pageTitle: 'AI Council 筆記',
    title: '筆記',
    untitled: '未命名',
    saved: '已儲存',
    saving: '儲存中...',
    
    // Header Buttons
    import: '匯入',
    importTitle: '從 Council 匯入',
    export: '匯出',
    newDoc: '新增文件',
    
    // Toolbar
    bold: '粗體 (Ctrl+B)',
    italic: '斜體 (Ctrl+I)',
    code: '程式碼',
    h1: '標題 1',
    h2: '標題 2',
    h3: '標題 3',
    bulletList: '項目符號清單',
    numberedList: '編號清單',
    quote: '引用',
    link: '連結',
    divider: '分隔線',
    
    // Tree View
    treeViewTitle: '任務樹',
    closeSidebar: '關閉側邊欄',
    treeEmpty: '尚無任務卡片',
    treeEmptyHint: '從 Council 建立任務後，卡片階層將顯示於此',
    reload: '重新載入',
    treeViewToggle: '任務樹視圖',
    
    // Editor
    editorPlaceholder: '開始撰寫...',
    
    // AI Toolbar
    rewrite: '改寫',
    summarize: '摘要',
    expand: '擴充',
    translate: '翻譯',
    aiProcessing: 'AI 處理中...',
    
    // Import Modal
    importTitle: '匯入內容',
    importEmpty: '沒有可匯入的 Council 回應。',
    
    // Export Modal
    exportTitle: '匯出文件',
    exportMd: 'Markdown (.md)',
    exportTxt: '純文字 (.txt)',
    copyClipboard: '複製到剪貼簿',
    
    // Translate Modal
    translateTitle: '翻譯為',
    langZhTW: '繁體中文',
    langZhCN: '简体中文',
    langEn: 'English',
    langJa: '日本語',
    langKo: '한국어',
    
    // AI Prompt Modal
    selectedText: '選取的文字',
    customInstructions: '額外指示',
    customInstructionsPlaceholder: '（選填）例如：使用更正式的語氣、避免使用被動語態...',
    execute: '執行',
    
    // Global Chat Bar
    globalChatPlaceholder: '基於全文提問...',
    sendQuestion: '送出問題',
    aiResponse: 'AI 回應',
    insertToEditor: '插入編輯器',
    copyResponse: '複製回應'
  },
  
  // Toast/Status Messages
  messages: {
    // General
    settingsSaved: '設定已儲存',
    copied: '已複製',
    imported: '已匯入內容',
    
    // Context
    contextAdded: '已加入參考資料',
    pageCaptured: '已擷取頁面內容',
    selectionCaptured: '已擷取選取內容',
    pasted: '已貼上內容',
    selectionCaptureFailed: '擷取選取內容失敗：{error}',
    noContextToClear: '沒有參考資料可清除',
    contextCleared: '已清除所有參考資料',
    contextUpgraded: '已升級為 Session 級參考資料',
    noCardContextToClear: '此卡片沒有 Card 級資料可清除（Session 級資料需在根卡片清除）',
    noContextInConversation: '此對話無參考資料',
    
    // Errors
    noActiveTab: '找不到使用中的分頁',
    noContent: '頁面沒有內容',
    noSelection: '頁面上沒有選取文字',
    noInput: '請輸入內容',
    noKeyword: '請輸入關鍵字',
    noQuestion: '請輸入問題',
    braveKeyRequired: '需要設定 Brave Search API 金鑰才能使用網搜功能',
    searchFailed: '搜尋失敗：{error}',
    noResults: '找不到相關結果',
    captureFailed: '擷取失敗：{error}',
    pasteFailed: '貼上失敗：{error}',
    executionFailed: '執行失敗：{error}',
    saveFailed: '儲存失敗：{error}',
    deleteFailed: '刪除失敗：{error}',
    loadFailed: '載入失敗：{error}',
    clearFailed: '清除失敗：{error}',
    copyFailed: '複製失敗',
    retryFailed: '無法重試：找不到原始查詢',
    
    // Search
    searching: '正在搜尋「{keyword}」...',
    fetchingResults: '正在擷取搜尋結果內頁內容...',
    searchResultsAdded: '已加入搜尋結果，正在執行 Council...',
    searchCancelled: '已取消延伸搜尋',
    maxIterationsReached: '已達搜尋次數上限',
    searchWillContinue: '搜尋失敗，將繼續生成結論',
    enterSearchKeyword: '請選擇或輸入延伸搜尋關鍵字',
    enterCustomKeyword: '請輸入自訂關鍵字進行延伸搜尋',
    
    // Tasks
    taskExists: '已存在相同的待辦任務',
    switchedToCard: '已切換至任務卡片',
    childCardCreated: '已建立子卡片，修改問題後按送出',
    childCardWithFeatures: '已建立子卡片，已啟用：{features}',
    exploreCardCreated: '已建立探索卡片，提示已加入脈絡',
    taskToInput: '已將任務帶入輸入框，按送出開始新對話',
    maxDepthReached: '已達最大深度 L{depth}，無法再展開子任務',
    keywordAdded: '已新增關鍵字',
    keywordExists: '關鍵字已存在，已自動勾選',
    selectAtLeastOne: '請至少選擇一個搜尋關鍵字',
    maxThreeKeywords: '最多選擇 3 個關鍵字',
    
    // AI
    generatingSuggestions: 'AI 正在生成建議的延伸問題...',
    suggestionsGenerated: '已生成建議問題，可自行修改後送出',
    suggestionsFailed: '建議生成失敗，已使用預設模板',
    projectNameFailed: '專案名稱生成失敗（{error}），使用預設名稱',
    aiPromptFailed: 'AI Prompt 生成失敗，使用預設模式',
    councilMinModels: 'Council 需要至少 2 個模型成功回應',
    
    // Image
    noConversationToSummarize: '尚無對話內容可供摘要',
    summaryGenerated: '已生成圖片描述摘要',
    summaryFailed: '摘要生成失敗',
    minDescriptionLength: '請輸入至少 5 個字的描述',
    imageEditorClosed: '已關閉圖像編輯器',
    imageCancelled: '已取消圖像生成',
    imageGenFailed: '圖片生成失敗：{error}',
    invalidImageFile: '請上傳有效的圖片檔案',
    imageSizeLimit: '圖片大小超過 20MB 限制',
    imageDataFailed: '無法取得圖片資料',
    imageLoaded: '已載入圖片，請輸入分析問題後送出',
    imageLoadFailed: '圖片載入失敗',
    imageDownloaded: '已下載圖片',
    imageCopied: '已複製圖片',
    imageCopyFailed: '複製圖片失敗',
    uploadImageForAnalysis: '請上傳要分析的圖片',
    
    // History & Export
    newConversationStarted: '已開始新對話',
    newRootCardReady: '已準備新增 Root 卡片',
    recordDeleted: '已刪除紀錄',
    storageFull: '儲存失敗：空間不足',
    autoCleanedOldRecords: '儲存空間不足，已自動清理舊紀錄',
    projectLoaded: '已載入專案',
    historyCleared: '已清除歷史紀錄',
    noConversationToExport: '尚無對話可匯出',
    exportedMarkdown: '已匯出 Markdown',
    exportedJson: '已匯出 JSON',
    copiedToClipboard: '已複製到剪貼簿',
    noHistoryYet: '尚無歷史紀錄',
    
    // Prompt
    enterPromptFirst: '請先輸入 Prompt 再進行潤色',
    promptRefined: 'Prompt 已精煉完成',
    refineFailed: '潤色失敗：{error}',
    editPromptFirst: '請先輸入或編輯 Prompt',
    
    // Card Status
    cardRunning: '此卡片正在執行中，請等待完成或切換至其他卡片',
    
    // Storage
    storageWarning: '儲存空間已使用 {percent}% ({used}/{total} MB)，建議清理歷史紀錄',
    storageError: '儲存空間不足，請清理歷史紀錄'
  },
  
  // Error Messages
  errors: {
    connectionFailed: '{model} 暫時無法連線',
    connectionDetail: '網路問題或該模型暫時不可用',
    timeout: '{model} 回應超時',
    timeoutDetail: '模型處理時間過長',
    authFailed: '{model} 認證失敗',
    authDetail: '請檢查 API Key 設定',
    rateLimited: '{model} 請求過於頻繁',
    rateLimitDetail: '請稍後再試',
    genericError: '{model} 發生錯誤'
  }
};

