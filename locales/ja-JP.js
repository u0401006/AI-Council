// Japanese translations
window.LOCALE_JA_JP = {
  // AI Language Settings
  ai: {
    languageInstruction: '**重要：日本語で回答してください。丁寧で自然な日本語を使用してください。専門用語は英語のままでも構いません。**',
    languageName: '日本語'
  },

  // CSS Content (for ::after, ::before pseudo-elements)
  css: {
    contextEmpty: 'まだ参照資料がありません'
  },

  // Common
  common: {
    save: '保存',
    cancel: 'キャンセル',
    confirm: '確認',
    close: '閉じる',
    delete: '削除',
    edit: '編集',
    add: '追加',
    search: '検索',
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    warning: '警告',
    models: 'モデル',
    cards: 'カード',
    times: '回',
    depth: '深度'
  },

  // Options Page
  options: {
    pageTitle: 'AI Council 設定',
    subtitle: 'マルチモデル AI カウンシル設定',

    // API Section
    apiSection: 'API 設定',
    apiKeyLabel: 'OpenRouter API キー',
    apiKeyPlaceholder: 'sk-or-v1-...',
    apiKeyHint: '<a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a> でキーを取得',
    braveApiKeyLabel: 'Brave Search API キー（任意）',
    braveApiKeyPlaceholder: 'BSA...',
    braveApiKeyHint: '<a href="https://brave.com/search/api/" target="_blank">brave.com/search/api</a> でキーを取得（月2000回無料）',

    // Language Section
    languageSection: 'インターフェース言語',
    languageLabel: 'インターフェースと AI 回答の言語を選択',
    languageHint: 'AI の回答も選択した言語で表示されます',

    // Models Section
    modelsSection: '参加モデル',
    updateModelsBtn: 'OpenRouter から更新',
    updateModelsLoading: '更新中...',
    modelsHint: 'ディスカッションに参加するモデルを選択。<span class="vision-badge">VIS</span> = 画像分析対応、<span class="image-badge">IMG</span> = 画像生成対応。価格: $入力/$出力（100万トークンあたり）',

    // Chairman Section
    chairmanSection: '議長モデル',
    chairmanLabel: '最終回答をまとめるモデルを選択',
    chairmanHint: '「レビュー勝者」を選択すると、ランキング1位のモデルが動的に議長を務めます',
    reviewWinner: 'レビュー勝者（動的）',

    // Planner Section
    plannerSection: 'プランナーモデル',
    plannerLabel: '意思決定と計画を担当するモデルを選択',
    plannerHint: '複雑な質問の動的な意思決定に使用します。空欄の場合は低コストのルールベース処理を使用します。',

    // Skills Section
    skillsSection: 'スキル管理',
    browseSkillsBtn: 'スキルマーケットを見る',
    skillsHint: 'インストール済みスキルの管理、またはローカルパスから SKILL.md をインポートします。',
    installedSkillsLabel: 'インストール済みスキル',
    importSkillLabel: 'スキルをインポート',
    importSkillBtn: 'インポート',
    importSkillHint: 'SKILL.md を含むローカルのスキルディレクトリを入力してください。',

    // Options Section
    optionsSection: 'オプション',
    enableReviewLabel: '相互レビューを有効化（ステージ 2）',
    enableReviewHint: '無効にすると API コストを節約できますが、モデルランキングがスキップされます',
    maxSearchLabel: '検索イテレーション上限',
    maxSearchHint: '1回の会話で AI が提案できるウェブ検索の最大回数',
    maxDepthLabel: 'タスク深度上限',
    maxDepthHint: 'タスクプランナーでサブタスクを展開できる最大深度',
    depthOption: 'L0 - L{max}（{layers} 層）',

    // Learner Mode Section
    learnerSection: '学習者モード',
    learnerHint: '年齢層に合わせて AI の回答方法を調整し、ガイド付き探索を有効にします',
    learnerWarning: '年齢層を選択すると、組み込みのコーチングプロンプトが下のカスタムテンプレートを上書きします。',
    learnerStandard: '標準モード',
    learnerStandardHint: '完全な回答、大人向け',
    learner9_10: '9-10 歳',
    learner9_10Hint: 'シンプルな言葉、日常の例、発見型学習',
    learner11_12: '11-12 歳',
    learner11_12Hint: 'ヒントベースの推論、知識の接続',
    learner13_15: '13-15 歳',
    learner13_15Hint: '方法論のガイダンス、フレームワーク思考、批判的分析',
    learner16_18: '16-18 歳',
    learner16_18Hint: '学術的深さ、多角的視点、研究志向',
    learnerModeNote: '現在 {mode} 歳の組み込みプロンプトを使用中',

    // Output Style Section
    outputStyleSection: '回答スタイル',
    outputStyleHint: 'AI 回答の長さとフォーマットの好みを制御（標準モード）',
    outputLengthLabel: '長さの好み',
    lengthConcise: '簡潔',
    lengthConciseHint: '約500字、要点のみ',
    lengthStandard: '標準',
    lengthStandardHint: '約800字、適度な詳細',
    lengthDetailed: '詳細',
    lengthDetailedHint: '約1200字、包括的',
    outputFormatLabel: 'フォーマットの好み',
    formatBullet: '箇条書き優先',
    formatBulletHint: '箇条書き、各項目は簡潔に',
    formatMixed: '混合',
    formatMixedHint: '内容に応じて柔軟に',
    formatParagraph: '段落形式',
    formatParagraphHint: '完全な段落を使用',

    // Prompts Section
    promptsSection: 'プロンプトテンプレート',
    resetPromptsBtn: 'デフォルトにリセット',
    promptsHint: 'AI への指示をカスタマイズ。変数: <code>{query}</code> ユーザーの質問、<code>{responses}</code> モデルの回答、<code>{ranking}</code> レビューランキング。',
    reviewPromptLabel: 'レビュープロンプト（ステージ 2）',
    reviewPromptHint: 'モデルが互いの回答を評価するための指示',
    reviewPromptPlaceholder: 'レビュー指示を入力...',
    chairmanPromptLabel: '議長プロンプト（ステージ 3）',
    chairmanPromptHint: '議長が最終回答をまとめるための指示',
    chairmanPromptPlaceholder: '議長指示を入力...',

    // Actions
    saveBtn: '設定を保存',

    // Status Messages
    statusSaved: '設定を保存しました',
    statusMinModels: '少なくとも2つのモデルを選択してください',
    statusPromptsReset: 'プロンプトをデフォルトにリセットしました',
    statusModelsUpdated: '{count} 個のモデルを更新しました',
    statusModelsUpdateFailed: '更新に失敗しました: {error}',

    // Skills
    skillDeleted: 'スキルを削除しました',
    enterSkillPath: 'スキルパスを入力してください',
    importingSkill: 'インポート中...',
    confirmDeleteSkill: 'スキル「{skillId}」を削除してもよろしいですか？',
    invalidSkillFormat: '無効な SKILL.md 形式',
    invalidGitHubPath: '無効な GitHub パス形式'
  },

  // Sidepanel
  sidepanel: {
    title: 'AI Council',

    // Header Buttons
    newChat: '新しいチャット',
    history: '履歴',
    export: 'エクスポート',
    settings: '設定',

    // History Panel
    historyTitle: '履歴',
    clearHistory: 'すべてクリア',
    closeHistory: '閉じる',

    // Breadcrumb
    backToRoot: 'ルートカードに戻る',
    depthLabel: '深度: {depth}',
    cardCount: '{count} カード',
    viewInCanvas: 'メモでタスクツリーを表示',

    // Context Section
    contextTitle: '参照',
    capturePage: 'ページ取得',
    captureSelection: '選択テキスト',
    webSearch: '検索',
    paste: '貼り付け',
    clearContext: 'すべての参照をクリア',

    // Search Iteration
    extendSearch: '拡張検索：',
    cancelSearch: 'キャンセル',

    // Input
    inputPlaceholder: '質問を入力...',
    uploadImageHint: 'クリックまたはドラッグで画像をアップロード',
    uploadImageFormats: 'JPG、PNG、GIF、WebP 対応',
    visionToggle: 'Vision Council：画像をアップロードして複数の AI で分析',
    imageToggle: '画像生成を有効化（特定モデル）',
    searchToggle: 'AI 検索イテレーションモードを有効化',
    modelCount: '{count} モデル',
    sendBtn: '送信',

    // Skill Selector
    selectSkill: 'スキルモードを選択',
    autoDetect: '自動検出',
    searchSkills: 'スキルを検索...',
    recommended: 'おすすめ',
    clearSkillSelection: '選択をクリア（自動検出を使用）',

    // Cost Tracker
    costTitle: 'コスト追跡',
    costInput: '入力',
    costOutput: '出力',
    costImageTokens: '画像トークン',

    // Stepper
    stepResponse: '回答',
    stepReview: 'レビュー',
    stepSynthesis: '統合',

    // Stages (no numbered labels, icon-based UI)
    stage1Title: 'モデル回答',
    stage2Title: '相互レビュー',
    stage3Title: '検索オプション',
    stage4Title: '議長統合',
    stageComplete: '完了',
    stageSkipped: 'スキップ',

    // Search Suggestions
    searchSuggestionsIntro: 'モデルの回答に基づく検索キーワードの提案（最大3つ選択）：',
    customKeywordPlaceholder: 'カスタムキーワードを入力...',
    addKeyword: '追加',
    executeSearch: '検索実行',
    skipSearch: '検索をスキップ',
    noSuggestions: 'モデルからの検索提案なし',

    // Search Strategy
    searchStrategyTitle: '拡張検索',
    searchIterationCount: '{current}/{max} 回',
    customSearchPlaceholder: 'カスタムキーワードを入力...',
    searchStrategyHint: 'AI の提案をクリックするかカスタムキーワードを入力。結果は参照に追加され、Council が再実行されます',

    // Branch Actions
    branchActionsTitle: '次のステップ',
    branchSearch: '拡張検索',
    branchImage: '画像生成',
    branchVision: 'Vision 分析',
    branchCanvas: 'メモを取る',

    // Notes Section (formerly Canvas)
    openInCanvas: 'メモを取る',
    canvasDesc: '内容を編集・拡張',

    // Image Description Modal
    imageDescTitle: '画像生成',
    imageDescHint: '生成したい画像の説明を入力してください：',
    imageDescPlaceholder: '例：星空の下を走るオオカミ、オーロラが雪原を照らす...',
    summarizeContent: '会話から要約',
    startImageGen: '生成開始',
    openInTab: '新しいタブで開く',
    openInWindow: '独立ウィンドウで開く',

    // Empty State
    emptyState: '質問を入力して複数の AI モデルに問い合わせ',

    // Todo Section
    todoTitle: 'ToDoタスク',
    addTask: 'タスク追加',
    todoEmpty: 'タスクなし。上のボタンをクリックして追加',
    newTaskPlaceholder: '新しいタスクを入力...（Ctrl+Enterで確認）',
    newTaskHint: 'Ctrl+Enter または ✓ をクリックして確認',
    priorityHigh: '高',
    priorityMedium: '中',
    priorityLow: '低',

    // Conversation Cost
    conversationCostTitle: '会話コスト',
    costStage1: 'モデル回答',
    costStage2: '相互レビュー',
    costStage3: '議長統合',
    costImageGen: '画像生成',

    // Export Modal
    exportTitle: '会話をエクスポート',
    exportMd: 'Markdown (.md)',
    exportJson: 'JSON (.json)',
    copyClipboard: 'クリップボードにコピー',

    // New Conversation Modal
    newConvTitle: '新しい会話を開始',
    newSessionOption: '新しいセッションを作成',
    newSessionDesc: 'すべてのカードをクリアして最初から開始',
    newRootOption: 'ルートカードを追加',
    newRootDesc: '現在のセッションに別のトピックを追加',

    // Paste Modal
    pasteTitle: '参照を貼り付け',
    pasteHint: '参照として追加する内容を貼り付けてください：',
    pastePlaceholder: 'ここに内容を貼り付け...',
    pasteCharCount: '{count} 文字',
    confirmPaste: '貼り付けを確認',

    // Web Search Modal
    webSearchTitle: 'ウェブ検索',
    webSearchHint: 'キーワードを入力してウェブを検索。結果は参照に追加されます：',
    webSearchPlaceholder: '検索キーワードを入力...',
    searchPreparing: '検索準備中...',

    // Skills
    noSkillsFound: '該当するスキルが見つかりません',
    skillSourceAuto: '自動',
    skillSourceSelected: '選択済み',

    // Stage Status
    stagePreparing: '準備中...',
    stageSearching: '検索中...',
    stageReviewing: 'レビュー中...',
    stageSynthesizing: '統合中...',
    stageCouncilRunning: 'Council 実行中...',
    stageCardRunning: 'このカード実行中...',
    stageFailed: '失敗',
    stageGenerating: '生成中...',
    stageRefining: 'リファイン中...',
    stageRetrying: '再試行中...',
    stageSummarizing: '要約中...',

    // Review
    reviewInProgress: 'モデルが互いにレビュー中...',
    reviewDisabled: '相互レビューは無効です',
    reviewNoData: 'レビューデータなし',
    chairmanFailed: '議長の統合に失敗しました：{error}',

    // AI Loading
    generatingImage: '{model} で画像を生成中...',
    analyzingImage: '{model} で画像を分析中...',
    connectingModel: '{model} に接続中...',
    visionAnalyzing: 'Vision 分析中',
    creatingVisual: 'ビジュアルコンテンツを作成中...',
    generatingNext: '生成中...',
    startNextRound: '次のラウンドを開始',

    // Actions
    download: 'ダウンロード',
    copy: 'コピー',
    copiedBrief: 'コピーしました！',
    analyze: '分析',

    // Labels
    chairmanLabel: '議長',
    send: '送信',
    generateImage: '画像生成',

    // Summary
    completed: '完了',
    extendSearch: '拡張検索',
    webSearchContext: 'ウェブ検索',
    braveKeyNeeded: 'Brave Search API キーが必要です',

    // Task Types
    taskSearch: '検索',
    taskImage: '画像',
    taskVision: 'ビジョン',
    taskExplore: '探索',
    taskVerify: '検証',
    taskApply: 'やってみる',
    taskConnect: '接続',

    // Branch Actions Labels
    analyzeImageLabel: '画像を分析',
    takeNotesLabel: 'メモを取る',
    generateImageLabel: '画像を生成',

    // Suggested Actions
    suggestedActions: '次のステップの提案',
    quickInputPlaceholder: 'フォローアップの質問...',

    // UI Actions
    proceed: '続行',
    cancelAction: 'キャンセル',
    processing: '処理中...',
    responding: '応答中...',
    justNow: 'たった今',
    expanded: '展開済み',
    pending: '保留中',
    minutesAgo: '{n}分前',
    hoursAgo: '{n}時間前',

    // Misc UI
    characters: '文字',
    iterationQuerying: 'イテレーション {n}: クエリ中...',
    modelsCompleted: '{done}/{total} 完了'
  },

  // Notes (formerly Canvas)
  canvas: {
    pageTitle: 'AI Council メモ',
    title: 'メモ',
    untitled: '無題',
    saved: '保存済み',
    saving: '保存中...',

    // Header Buttons
    import: 'インポート',
    importTitle: 'Council からインポート',
    export: 'エクスポート',
    newDoc: '新規ドキュメント',

    // Toolbar
    bold: '太字 (Ctrl+B)',
    italic: '斜体 (Ctrl+I)',
    code: 'コード',
    h1: '見出し 1',
    h2: '見出し 2',
    h3: '見出し 3',
    bulletList: '箇条書きリスト',
    numberedList: '番号付きリスト',
    quote: '引用',
    link: 'リンク',
    divider: '区切り線',

    // Tree View
    treeViewTitle: 'タスクツリー',
    closeSidebar: 'サイドバーを閉じる',
    treeEmpty: 'タスクカードなし',
    treeEmptyHint: 'Council でタスクを作成すると、ここにカード階層が表示されます',
    reload: '再読み込み',
    treeViewToggle: 'タスクツリービュー',

    // Editor
    editorPlaceholder: '書き始める...',

    // AI Toolbar
    rewrite: '書き換え',
    summarize: '要約',
    expand: '拡張',
    translate: '翻訳',
    aiProcessing: 'AI 処理中...',

    // Import Modal
    importTitle: 'コンテンツをインポート',
    importEmpty: 'インポート可能な Council 回答がありません。',

    // Export Modal
    exportTitle: 'ドキュメントをエクスポート',
    exportMd: 'Markdown (.md)',
    exportTxt: 'プレーンテキスト (.txt)',
    copyClipboard: 'クリップボードにコピー',

    // Translate Modal
    translateTitle: '翻訳先',
    langZhTW: '繁體中文',
    langZhCN: '简体中文',
    langEn: 'English',
    langJa: '日本語',
    langKo: '한국어',

    // AI Prompt Modal
    selectedText: '選択したテキスト',
    customInstructions: '追加指示',
    customInstructionsPlaceholder: '（任意）例：よりフォーマルなトーンで、受動態を避けて...',
    execute: '実行',

    // Global Chat Bar
    globalChatPlaceholder: '文書について質問...',
    sendQuestion: '質問を送信',
    aiResponse: 'AI 回答',
    insertToEditor: 'エディタに挿入',
    copyResponse: '回答をコピー',

    // TTS
    ttsPlay: '読み上げ',
    ttsPause: '一時停止',
    ttsStop: '停止',
    ttsVoice: '音声を切り替え',
    ttsNoContent: '読み上げるコンテンツがありません',
    ttsNotSupported: 'このブラウザは音声合成に対応していません',
    ttsError: '音声再生に失敗しました'
  },

  // Toast/Status Messages
  messages: {
    // General
    settingsSaved: '設定を保存しました',
    copied: 'コピーしました',
    imported: 'コンテンツをインポートしました',

    // Context
    contextAdded: '参照に追加しました',
    pageCaptured: 'ページ内容を取得しました',
    selectionCaptured: '選択内容を取得しました',
    pasted: '内容を貼り付けました',
    selectionCaptureFailed: '選択内容の取得に失敗しました：{error}',
    noContextToClear: 'クリアする参照がありません',
    contextCleared: 'すべての参照をクリアしました',
    contextUpgraded: 'セッションレベルの参照にアップグレードしました',
    noCardContextToClear: 'このカードにはカードレベルのデータがありません（セッションレベルのデータはルートカードでクリアしてください）',
    noContextInConversation: 'この会話には参照がありません',

    // Errors
    noActiveTab: 'アクティブなタブが見つかりません',
    noContent: 'ページに内容がありません',
    noSelection: 'ページでテキストが選択されていません',
    noInput: '内容を入力してください',
    noKeyword: 'キーワードを入力してください',
    noQuestion: '質問を入力してください',
    braveKeyRequired: 'ウェブ検索には Brave Search API キーが必要です',
    searchFailed: '検索に失敗しました：{error}',
    noResults: '関連する結果が見つかりません',
    captureFailed: '取得に失敗しました：{error}',
    pasteFailed: '貼り付けに失敗しました：{error}',
    executionFailed: '実行に失敗しました：{error}',
    saveFailed: '保存に失敗しました：{error}',
    deleteFailed: '削除に失敗しました：{error}',
    loadFailed: '読み込みに失敗しました：{error}',
    clearFailed: 'クリアに失敗しました：{error}',
    copyFailed: 'コピーに失敗しました',
    retryFailed: '再試行できません：元のクエリが見つかりません',

    // Search
    searching: '「{keyword}」を検索中...',
    fetchingResults: '検索結果ページを取得中...',
    searchResultsAdded: '検索結果を追加、Council を実行中...',
    searchCancelled: '拡張検索をキャンセルしました',
    maxIterationsReached: '検索イテレーション上限に達しました',
    searchWillContinue: '検索に失敗しましたが、結論の生成を続行します',
    enterSearchKeyword: '拡張検索キーワードを選択または入力してください',
    enterCustomKeyword: 'カスタムキーワードを入力して拡張検索を行う',

    // Tasks
    taskExists: 'タスクは既に存在します',
    switchedToCard: 'タスクカードに切り替えました',
    childCardCreated: '子カードを作成しました。質問を編集して送信してください',
    childCardWithFeatures: '子カードを作成しました：{features}',
    exploreCardCreated: 'コンテキスト付きの探索カードを作成しました',
    taskToInput: 'タスクを入力欄に移動しました。送信して新しい会話を開始',
    maxDepthReached: '最大深度 L{depth} に達しました。これ以上展開できません',
    keywordAdded: 'キーワードを追加しました',
    keywordExists: 'キーワードは既に存在します。自動選択しました',
    selectAtLeastOne: '少なくとも1つのキーワードを選択してください',
    maxThreeKeywords: '最大3つのキーワードまで',

    // AI
    generatingSuggestions: 'AI がフォローアップの質問を生成中...',
    suggestionsGenerated: '提案を生成しました。必要に応じて編集して送信',
    suggestionsFailed: '提案の生成に失敗しました。デフォルトテンプレートを使用',
    projectNameFailed: 'プロジェクト名の生成に失敗しました（{error}）。デフォルトを使用',
    aiPromptFailed: 'AI プロンプト生成に失敗しました。デフォルトモードを使用',
    councilMinModels: 'Council には少なくとも2つのモデルが正常に応答する必要があります',

    // Image
    noConversationToSummarize: '要約する会話内容がありません',
    summaryGenerated: '画像説明の要約を生成しました',
    summaryFailed: '要約の生成に失敗しました',
    minDescriptionLength: '説明は5文字以上入力してください',
    imageEditorClosed: '画像エディタを閉じました',
    imageCancelled: '画像生成をキャンセルしました',
    imageGenFailed: '画像生成に失敗しました：{error}',
    invalidImageFile: '有効な画像ファイルをアップロードしてください',
    imageSizeLimit: '画像サイズが20MB制限を超えています',
    imageDataFailed: '画像データを取得できませんでした',
    imageLoaded: '画像を読み込みました。分析の質問を入力して送信してください',
    imageLoadFailed: '画像の読み込みに失敗しました',
    imageDownloaded: '画像をダウンロードしました',
    imageCopied: '画像をコピーしました',
    imageCopyFailed: '画像のコピーに失敗しました',
    uploadImageForAnalysis: '分析する画像をアップロードしてください',

    // History & Export
    newConversationStarted: '新しい会話を開始しました',
    newRootCardReady: '新しいルートカードを追加する準備ができました',
    recordDeleted: '記録を削除しました',
    storageFull: '保存に失敗しました：ストレージがいっぱいです',
    autoCleanedOldRecords: 'ストレージがいっぱいのため、古い記録を自動クリアしました',
    projectLoaded: 'プロジェクトを読み込みました',
    historyCleared: '履歴をクリアしました',
    noConversationToExport: 'エクスポートする会話がありません',
    exportedMarkdown: 'Markdown でエクスポートしました',
    exportedJson: 'JSON でエクスポートしました',
    copiedToClipboard: 'クリップボードにコピーしました',
    noHistoryYet: 'まだ履歴がありません',

    // Prompt
    enterPromptFirst: 'リファインする前にプロンプトを入力してください',
    promptRefined: 'プロンプトのリファインが完了しました',
    refineFailed: 'リファインに失敗しました：{error}',
    editPromptFirst: 'まずプロンプトを入力または編集してください',

    // Card Status
    cardRunning: 'このカードは実行中です。完了を待つか、他のカードに切り替えてください',

    // Storage
    storageWarning: 'ストレージ使用率 {percent}%（{used}/{total} MB）。履歴のクリアを検討してください',
    storageError: 'ストレージ不足です。履歴をクリアしてください'
  },

  // Error Messages
  errors: {
    connectionFailed: '{model} に一時的に接続できません',
    connectionDetail: 'ネットワークの問題またはモデルが一時的にダウン',
    timeout: '{model} の応答がタイムアウトしました',
    timeoutDetail: 'モデルの処理に時間がかかりすぎています',
    authFailed: '{model} の認証に失敗しました',
    authDetail: 'API キーの設定を確認してください',
    rateLimited: '{model} がレート制限されました',
    rateLimitDetail: '後でもう一度お試しください',
    genericError: '{model} でエラーが発生しました'
  }
};
