// ============================================
// MAV Agent Framework - Bundled Skills
// Auto-generated from skills/*.md files
// ============================================

/**
 * Bundled SKILL.md contents
 * In a Chrome Extension, we cannot dynamically load files,
 * so all skills are bundled here at build time.
 */
window.BUNDLED_SKILLS = {
  'researcher': `---
name: researcher
description: 適用於需要深度研究、多方資料比對的問題。當用戶提問包含研究、分析、比較、調查、評估、探討、深入、全面、詳細等關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "🔬"
  mav-tools: web_search query_council peer_review synthesize
  max-iterations: 8
  max-searches: 3
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- 用戶要求深入研究某個主題
- 需要分析比較多個選項或觀點
- 調查特定事件或現象
- 評估方案的優缺點
- 探討複雜議題的各個面向

## Trigger Keywords

\`研究\` \`分析\` \`比較\` \`調查\` \`評估\` \`探討\` \`深入\` \`全面\` \`詳細\`

## Instructions

1. 這是一個研究型問題，需要收集多方資料進行深入分析
2. 優先使用 web_search 收集多方來源的最新資料
3. 使用 query_council 讓多個模型從不同角度分析資料
4. 使用 peer_review 交叉驗證分析結果的品質
5. 最後 synthesize 產出結構化的研究報告`,

  'educator': `---
name: educator
description: 使用蘇格拉底式教學法，引導學習者自主探索。當學習者模式開啟且非標準模式時觸發，依年齡層調整教學策略。
metadata:
  author: mav
  version: "1.0"
  icon: "📚"
  mav-tools: query_council synthesize
  max-iterations: 5
  response-length: standard
  response-format: exploratory
  citations: false
---

## When to Use

- 學習者模式已開啟（非 standard 模式）
- 用戶是 9-18 歲的學習者
- 需要引導式而非直接給答案的回應

## Instructions

1. 這是一個學習引導型問題
2. 使用 query_council 獲取多元觀點作為教學素材
3. 不需要 web_search 除非問題涉及最新資訊
4. 不需要 peer_review，重點在產出探索式任務而非驗證答案
5. 根據學習者年齡調整揭露程度和引導方式`,

  'quick-answer': `---
name: quick-answer
description: 適用於簡單直接的問題，快速給出答案。當問題長度小於 50 字且不包含複雜分析關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "⚡"
  mav-tools: query_council synthesize
  max-iterations: 3
  response-length: concise
  response-format: text
  citations: false
---

## When to Use

- 簡短的問題（少於 50 字）
- 不需要深入分析的事實查詢
- 定義解釋類問題
- 不包含「為什麼」「如何」「分析」「比較」等複雜關鍵字

## Instructions

1. 這是一個簡單問題，快速回答即可
2. 直接使用 query_council 獲取回答
3. 跳過 peer_review（簡單問題不需要互評）
4. 快速 synthesize 產出簡潔答案
5. 控制迭代次數在 3 次以內`,

  'fact-checker': `---
name: fact-checker
description: 驗證資訊真偽，提供可靠來源。當用戶詢問某事是否為真、要求確認或查證資訊時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "✅"
  mav-tools: web_search query_council peer_review synthesize
  max-iterations: 6
  max-searches: 2
  response-length: standard
  response-format: structured
  citations: true
---

## When to Use

- 用戶詢問「真的嗎？」「是否正確？」
- 需要確認或查證某項資訊
- 驗證網路流傳的說法
- 核實新聞或社群媒體內容

## Trigger Keywords

\`真的嗎\` \`是否\` \`確認\` \`查證\` \`驗證\` \`正確嗎\` \`有沒有\` \`是不是\`

## Instructions

1. 這是一個事實查核問題，必須提供可靠來源
2. 必須先使用 web_search 搜尋可靠來源
3. 使用 query_council 讓多個模型交叉驗證資訊
4. 使用 peer_review 確保結論的可靠性
5. synthesize 時明確標示查核結果`,

  'creative': `---
name: creative
description: 適用於腦力激盪、創意發想、開放性問題。當用戶需要想法、創意、點子、建議、可能方案時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "💡"
  mav-tools: query_council peer_review synthesize
  max-iterations: 5
  response-length: standard
  response-format: mixed
  citations: false
---

## When to Use

- 用戶需要創意點子或想法
- 腦力激盪、發想階段
- 開放性問題，沒有標準答案
- 需要多元觀點和可能性

## Trigger Keywords

\`想法\` \`創意\` \`點子\` \`建議\` \`可能\` \`方法\` \`策略\` \`方案\` \`怎麼辦\`

## Instructions

1. 這是一個創意發想問題，重點在多元觀點
2. 使用 query_council 獲取多個模型的不同創意
3. 不需要 web_search（創意來自思考，不是搜尋）
4. 可用 peer_review 幫助篩選最佳創意（可選）
5. synthesize 整合多元想法，但保留各種可能性`,

  'technical': `---
name: technical
description: 適用於程式碼、技術問題、除錯。當用戶提問涉及程式、API、函數、實作、bug 等技術關鍵字時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "💻"
  mav-tools: query_council peer_review web_search synthesize
  max-iterations: 6
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- 程式碼相關問題
- API 使用或整合
- 技術架構設計
- 除錯（Debug）
- 技術實作方案

## Trigger Keywords

\`程式\` \`code\` \`coding\` \`bug\` \`錯誤\` \`API\` \`函數\` \`function\` \`實作\` \`implement\`

## Instructions

1. 這是一個技術問題，需要精確且可執行的解答
2. 使用 query_council 獲取多個模型的解決方案
3. 使用 peer_review 評估程式碼品質和正確性
4. 如需查詢最新文件或 API 規格，使用 web_search
5. synthesize 時提供完整可執行的程式碼`,

  'current-events': `---
name: current-events
description: 適用於新聞、時事、即時資訊查詢。當用戶詢問最新、現在、今天、最近的事件或新聞時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "📰"
  mav-tools: web_search query_council synthesize
  max-iterations: 5
  max-searches: 2
  response-length: standard
  response-format: mixed
  citations: true
---

## When to Use

- 查詢最新新聞或時事
- 詢問近期發生的事件
- 需要即時資訊（股價、天氣、賽事結果等）
- 追蹤特定議題的最新發展

## Trigger Keywords

\`最新\` \`現在\` \`今天\` \`昨天\` \`最近\` \`新聞\` \`時事\` \`目前\` \`當前\`

## Instructions

1. 這是一個時事問題，需要最新資訊
2. 必須先使用 web_search 獲取最新資訊
3. 使用 query_council 分析整理搜尋結果
4. 不需要 peer_review（新聞重時效，非深度分析）
5. synthesize 時標註資訊來源和時間`,

  'image-design': `---
name: image-design
description: 適用於漫畫、插畫、圖表、視覺設計與生成。當用戶請求生成圖片、繪製插畫、設計視覺內容時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "🎨"
  mav-tools: query_council synthesize
  mav-ui: showImageStyleSelector
  max-iterations: 5
  response-length: standard
  response-format: structured
  citations: false
---

## When to Use

- 用戶請求生成漫畫、插畫
- 需要圖表或資訊圖像設計
- 視覺設計（海報、封面、Logo）
- 討論內容適合視覺化呈現
- 提到特定風格參考

## Trigger Keywords

\`漫畫\` \`圖像\` \`圖片\` \`插畫\` \`設計圖\` \`畫一\` \`繪製\` \`生成圖\` \`圖表\` \`視覺\` \`海報\` \`封面\` \`logo\` \`icon\` \`Q版\` \`卡通\` \`動漫\` \`風格\`

## Instructions

1. 這是圖像設計問題，重點在整合多元設計方案
2. 使用 query_council 獲取多個模型的設計方案
3. 不需要 web_search（除非用戶提到特定風格參考）
4. 不需要 peer_review（創意無對錯）
5. synthesize 後自動觸發風格選擇介面`,

  'vision-analysis': `---
name: vision-analysis
description: 分析上傳圖片的內容、風格、物件。當用戶上傳圖片且非設計請求時觸發，使用視覺模型進行分析。
metadata:
  author: mav
  version: "1.0"
  icon: "👁"
  mav-tools: query_council web_search peer_review synthesize
  require-vision: true
  max-iterations: 6
  max-searches: 2
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- 用戶上傳了圖片需要分析
- 識別圖片中的物件、人物、場景
- 解讀圖片內容或風格
- OCR 文字辨識
- 圖片內容相關查詢（非設計生成）

## Instructions

1. 用戶上傳了圖片需要分析
2. 使用 query_council 讓視覺模型解析圖片內容
3. 可搭配 web_search 查詢相關背景資訊
4. 複雜分析可用 peer_review 交叉驗證
5. synthesize 整合分析結果`,

  // ============================================
  // External Skills from SkillsMP
  // ============================================

  'image-prompt-engineering': `---
name: image-prompt-engineering
description: Craft effective prompts for image generation. MUST READ before any generate_image call. Provides guidelines for narrative descriptions, texture details, text rendering, iterative refinement, and layout control.
metadata:
  author: chufeng-huang-sipaway
  version: "1.0"
  icon: "🎨"
  source: skillsmp
  source_url: https://skillsmp.com/skills/chufeng-huang-sipaway-sip-videogen-src-sip-videogen-advisor-skills-image-prompt-engineering-skill-md
  priority: high
  tools_required: generate_image
  mav-tools: query_council synthesize
  max-iterations: 5
  response-length: detailed
  response-format: structured
  citations: false
---

## When to Use

- User requests image generation
- User needs help writing image prompts
- Before any generate_image call
- Product photography, lifestyle images, hero shots
- Image editing tasks (remove background, relight, colorize)
- Layout/wireframe to polished image conversion
- 2D to 3D or 3D to 2D dimensional translation

## Trigger Keywords

\`image\` \`generate_image\` \`generate image\` \`create image\` \`make image\` \`picture\` \`photo\` \`photograph\` \`visual\` \`artwork\` \`graphic\` \`illustration\` \`render\` \`remove background\` \`colorize\` \`enhance image\` \`edit image\` \`3D render\` \`wireframe\` \`sketch\` \`layout\`

## Instructions

### Core Principle
**Describe scenes narratively, not as keyword lists.**

| Bad (keyword soup) | Good (narrative) |
|-------------------|------------------|
| "coffee shop, cozy, warm lighting, minimalist" | "A minimalist coffee shop interior with warm pendant lighting casting soft shadows on blonde wood tables. Morning sunlight streams through floor-to-ceiling windows." |

### Texture & Material Details
Include surface and material properties for photorealism:
- **Surface finish**: matte, glossy, frosted, brushed, satin, textured, polished
- **Material properties**: soft velvet, cold steel, warm wood grain, cool ceramic, supple leather
- **Imperfections for realism**: condensation droplets, dust particles, fingerprint smudges, micro-scratches, patina

### Text Rendering
For legible text in images:
1. **Quote exact text** with double quotes in prompt
2. **Specify typography**: font style (serif, sans-serif, script), size, color
3. **Describe placement** precisely (centered, above product, along edge)

### Iterative Refinement ("Edit, Don't Re-roll")
When image is 80% correct, use previous output as reference_image with modified prompt.
- Refinement requires BOTH previous output as reference_image AND modified prompt
- Single product refinement: use reference_image alone OR with product_slug
- Multi-product flows: reference_image is ignored, regenerate fresh

### Image Editing via Language
Describe WHAT you want, not HOW to do it. Trust the model to handle low-level operations.
- Remove background: "Keep the product exactly as shown. Remove background and place on pure white backdrop."
- Relight: "Same product, same position. Change to soft, diffused natural window light from the left."
- Colorize: "Colorize this black-and-white photograph with realistic, period-appropriate colors."

### Layout Control via Sketch/Wireframe
When user provides sketch/wireframe:
- The sketch defines WHERE elements go
- Your prompt describes WHAT fills those areas
- Set validate_identity=False (reference is layout, not product)

### Prompt Template - Product Hero Shot
\`\`\`
A [material + finish] [product type] with [distinctive features],
placed [position] on [surface] in [environment].
[Style] with [lighting]. [Camera angle], shallow depth of field.
For [purpose: e-commerce hero, social media, print campaign].
\`\`\``,

  'deep-research': `---
name: deep-research
description: Comprehensive multi-phase research using web search and content analysis. Produces detailed markdown reports with citations similar to academic journals or whitepapers.
metadata:
  author: nateberkopec
  version: "1.0"
  icon: "📚"
  source: skillsmp
  source_url: https://skillsmp.com/skills/nateberkopec-dotfiles-files-home-claude-skills-deep-research-skill-md
  license: MIT
  mav-tools: web_search query_council peer_review synthesize
  max-iterations: 10
  max-searches: 5
  response-length: detailed
  response-format: structured
  citations: true
---

## When to Use

- User requests comprehensive, in-depth research on a topic
- Research requires detailed analysis similar to academic journal or whitepaper
- Multiple sources and synthesis needed
- Deep investigation with proper citations
- Comparative research (technologies, approaches, solutions)
- Technical deep-dives
- Market/landscape research
- Historical/evolution research

## Trigger Keywords

\`深度研究\` \`deep research\` \`whitepaper\` \`白皮書\` \`academic\` \`學術\` \`comprehensive analysis\` \`全面分析\` \`in-depth\` \`詳盡報告\` \`research report\` \`研究報告\` \`market research\` \`市場研究\`

## When NOT to Use

- Simple fact-finding queries
- Single-source information lookup
- Code-only research within repositories
- Quick exploratory searches

## Instructions

### Research Process

**Phase 1: Interview and Scope Definition**
Start by interviewing user to understand research needs:
- Research objectives: What are they trying to understand or decide?
- Depth and breadth: How comprehensive should the research be?
- Target audience: Who will read this report?
- Key questions: What specific questions need answering?
- Scope boundaries: What should be explicitly included or excluded?

**Phase 2: Initial Reconnaissance**
- Conduct 3-5 broad web searches to map the topic space
- Identify key subtopics, domains, and areas of focus
- Note promising sources, authoritative voices, and research gaps
- Create research plan outlining 10+ specific research threads

**Phase 3: Parallel Research**
Execute multiple research threads in parallel:
- Each thread focuses on one subtopic
- Use web_search and query_council for each thread
- Cross-reference findings across threads
- Note conflicting information or perspectives

**Phase 4: Report Generation**
Synthesize all research into final report:
- Executive Summary (2-3 paragraphs)
- Adaptive middle sections based on topic
- Critical Analysis
- Conclusions
- References (numbered citations)

### Output Format
- Use numbered citations [1], [2], etc.
- Include tables for comparisons where appropriate
- Note any conflicts or gaps in the research
- Use clear, precise academic language

### Common Patterns

**Comparative Research**: Assign research thread per option, plus cross-cutting concerns
**Technical Deep-Dives**: Structure from fundamentals → implementation → case studies → limitations
**Market/Landscape Research**: Major players, emerging players, trends, analysis
**Historical Research**: Different time periods, key events, connect to present`
};

/**
 * Bundled reference files (Layer 3)
 * Loaded on-demand when skills need additional context
 */
window.BUNDLED_SKILL_REFS = {
  'image-design/references/prompt-engineering.md': `# 圖像 Prompt 工程指南

## Prompt 結構原則

### 1. 分層描述（由大到小）

\`\`\`
[整體風格] + [主體描述] + [環境場景] + [光線氛圍] + [構圖指示] + [技術參數]
\`\`\`

**範例**：
\`\`\`
水彩童話風格的插畫，一隻棕色毛皮的小狐狸站在古老的大樹下，
秋日森林中金黃色落葉飄落，柔和的午後陽光從樹葉間灑下，
中景半身構圖，畫面色調溫暖
\`\`\`

### 2. 具體勝於抽象

| 抽象（避免） | 具體（推薦） |
|-------------|-------------|
| 可愛的貓 | 圓臉短毛橘貓，眼睛明亮，耳朵豎起 |
| 美麗的風景 | 夕陽餘暉中的海岸線，浪花拍打岩石 |
| 現代風格 | 極簡線條、大量留白、單色調配深灰點綴 |

### 3. 風格關鍵字

#### 繪畫風格
- **水彩**：色彩暈染、邊緣柔和、紙本紋理
- **油畫**：厚重筆觸、色彩層次、光影對比
- **素描**：線條、明暗、質感
- **平面設計**：幾何、色塊、向量感

#### 藝術流派
- **印象派**：光影變化、色點堆疊、戶外場景
- **浮世繪**：平面構圖、粗線條、日式配色
- **Art Deco**：幾何圖案、對稱、金屬光澤
- **賽博龐克**：霓虹燈、科技感、暗色調

## 多圖一致性技巧

### 角色一致性
在每張圖的 prompt 中明確描述角色特徵。

### 風格一致性
定義並重複使用相同的風格描述。

### 場景連貫性
建立共同的場景元素。

## 構圖指示

### 視角
- **平視**：eye level, straight on
- **俯視**：bird's eye view, top-down
- **仰視**：low angle, looking up

### 景別
- **遠景**：full shot, wide shot
- **中景**：medium shot, half body
- **近景**：close-up

## Token 優化

1. 核心描述放前面
2. 刪除冗餘詞彙
3. 使用專業術語
4. 控制 prompt 在 150-250 字之間`,

  'image-design/references/semiotics.md': `# 符號學兩軸論（索緒爾理論）

## 核心概念

索緒爾（Ferdinand de Saussure）的符號學理論提出兩種組織語言的方式：

### 系譜軸（Paradigmatic Axis）

**定義**：垂直的替代關係，在同一位置可以相互替換的元素集合。

**特點**：
- 元素之間是「或」的關係
- 選擇一個就排除其他
- 形成對比和差異

**圖像生成應用**：
\`\`\`
角色 {
  面貌: [方臉 | 圓臉 | 鵝蛋臉]
  表情: [微笑 | 沉思 | 驚喜]
  髮型: [短髮 | 長髮 | 馬尾]
}
\`\`\`

### 毗鄰軸（Syntagmatic Axis）

**定義**：水平的組合關係，元素按照順序線性排列形成完整意義。

**特點**：
- 元素之間是「和」的關係
- 順序和組合創造意義
- 形成結構和敘事

**圖像生成應用**：
\`\`\`
最終 Prompt = 風格 + 角色 + 動作 + 場景 + 光線
\`\`\`

## 在圖像生成中的實踐

### 1. 系譜軸設計（選項池）
為每個視覺元素定義可替換的選項。

### 2. 毗鄰軸組合（Prompt 建構）
將選定的元素按順序組合：
\`\`\`
[一致性區塊] + [單圖描述]
\`\`\`

### 3. Placeholder 機制
使用 placeholder 實現動態替換：
\`\`\`
{角色名.屬性} → 從系譜軸選擇填入
\`\`\`

## 優點

1. **系統化**：將創意過程結構化
2. **可控性**：精確控制每個視覺元素
3. **一致性**：多圖生成時保持風格統一
4. **可擴展**：易於新增或修改選項
5. **可複用**：相同結構可套用不同主題`
};

console.log('Skills bundle loaded:', Object.keys(window.BUNDLED_SKILLS).length, 'skills,', Object.keys(window.BUNDLED_SKILL_REFS).length, 'references');

