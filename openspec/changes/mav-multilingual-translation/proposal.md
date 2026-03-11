## Why

現行 AI-Council 能力面向較廣，但新版本目標是聚焦「文章多語種互譯」工作流。為降低複雜度並提升可控性，需要以 MAV-Council 協作模式建立專用翻譯流程，並移除非必要能力（圖片生成、網路搜尋、階層延伸任務）。

## What Changes

- 新增以 MAV-Council 為核心的多語互譯能力（來源語言自動判斷 + 目標語言輸出）。
- 新增文章翻譯任務編排：分段翻譯、術語一致性、風格一致性、最終整併。
- 新增翻譯模式設定：精準模式、自然模式、新聞模式。
- 明確停用非目標能力：**BREAKING** 不提供圖片生成、即時網搜、階層式延伸任務。

## Capabilities

### New Capabilities
- `mav-translation-orchestration`: 使用 MAV-Council 進行多模型翻譯投票與主席整併。
- `article-multilingual-pipeline`: 文章級翻譯流程（分段、術語表、整體校正、輸出）。
- `translation-mode-control`: 翻譯模式與輸出格式控制（語氣、專有名詞、段落保留）。

### Modified Capabilities
- 無（以新 capability 增建為主）

## Impact

- 主要影響：`skills/`, `background.js`, `sidepanel/`, `options/`, `docs/`。
- 介面變更：任務入口改為翻譯導向；功能選單下架非目標項。
- 風險：多模型結果一致性、成本控制、長文 token 切片策略。