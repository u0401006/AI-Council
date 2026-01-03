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
    statusModelsUpdateFailed: '更新に失敗しました: {error}'
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
    viewInCanvas: 'キャンバスでタスクツリーを表示',
    
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
    
    // Cost Tracker
    costTitle: 'コスト追跡',
    costInput: '入力',
    costOutput: '出力',
    costImageTokens: '画像トークン',
    
    // Stepper
    stepResponse: '回答',
    stepReview: 'レビュー',
    stepSynthesis: '統合',
    
    // Stages
    stage1Label: 'ステージ 1',
    stage1Title: 'モデル回答',
    stage2Label: 'ステージ 2',
    stage2Title: '相互レビュー',
    stage3Label: 'ステージ 3',
    stage3Title: '検索オプション',
    stage4Label: 'ステージ 4',
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
    branchCanvas: 'キャンバスを開く',
    
    // Canvas Section
    openInCanvas: 'キャンバスで開く',
    canvasDesc: '回答内容を編集・調整',
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
    costStage1: 'ステージ 1（モデル回答）',
    costStage2: 'ステージ 2（相互レビュー）',
    costStage3: 'ステージ 3（議長統合）',
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
    searchPreparing: '検索準備中...'
  },
  
  // Canvas
  canvas: {
    pageTitle: 'AI Council キャンバス',
    title: 'キャンバス',
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
    langKo: '한국어'
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
    
    // Errors
    noActiveTab: 'アクティブなタブが見つかりません',
    noContent: 'ページに内容がありません',
    noSelection: 'ページでテキストが選択されていません',
    noInput: '内容を入力してください',
    noKeyword: 'キーワードを入力してください',
    noQuestion: '質問を入力してください',
    braveKeyRequired: 'ウェブ検索には Brave Search API キーが必要です',
    searchFailed: '検索に失敗しました: {error}',
    noResults: '関連する結果が見つかりません',
    captureFailed: '取得に失敗しました: {error}',
    pasteFailed: '貼り付けに失敗しました: {error}',
    
    // Search
    searching: '「{keyword}」を検索中...',
    fetchingResults: '検索結果ページを取得中...',
    searchResultsAdded: '検索結果を追加、Council を実行中...',
    searchCancelled: '拡張検索をキャンセルしました',
    maxIterationsReached: '検索イテレーション上限に達しました',
    
    // Tasks
    taskExists: 'タスクは既に存在します',
    switchedToCard: 'タスクカードに切り替えました',
    childCardCreated: '子カードを作成しました。質問を編集して送信してください',
    childCardWithFeatures: '子カードを作成しました: {features}',
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

