---
name: image-design
description: 適用於漫畫、插畫、圖表、視覺設計與生成。當用戶請求生成圖片、繪製插畫、設計視覺內容時觸發。
metadata:
  author: mav
  version: "1.0"
  icon: "\U0001F3A8"
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

`漫畫` `圖像` `圖片` `插畫` `設計圖` `畫一` `繪製` `生成圖` `圖表` `視覺` `海報` `封面` `logo` `icon` `Q版` `卡通` `動漫` `風格`

## Instructions

1. 這是圖像設計問題，重點在整合多元設計方案
2. 使用 `query_council` 獲取多個模型的設計方案
3. **不需要** `web_search`（除非用戶提到特定風格參考）
4. **不需要** `peer_review`（創意無對錯）
5. `synthesize` 後自動觸發風格選擇介面

## Context-Aware Behavior

### 有上傳參考圖像時
- 先用視覺模型解析圖像的風格特徵（色彩、構圖、筆觸）
- 提取可用於生成的風格描述
- 再用 query_council 生成融合風格的設計方案

### 提到特定風格參考時
- 先用 `web_search` 搜尋該風格的特徵描述和視覺元素
- 再用 query_council 融合風格生成設計方案

### 純創意設計時
- 直接使用 query_council 獲取多個設計方案
- 不需要額外搜尋

## Design Principles

採用**符號學兩軸論**（索緒爾理論）：

### 系譜軸（Paradigmatic）- 垂直替代選項
- **角色**：面貌、表情、髮型、服裝
- **風格**：線條、質感、筆觸
- **色彩**：色溫、飽和度、光線

### 毗鄰軸（Syntagmatic）- 橫向組合結構
- 最終 Prompt = 一致性區塊 + 單圖描述
- 確保多圖之間的風格一致性

## Response Guidelines

- 提供 3-5 個風格建議
- 每個風格包含具體視覺描述（筆觸、色調、質感）
- 考慮用途場景給出適當建議
- 為多圖生成提供一致性區塊

## References

- [圖像 Prompt 工程指南](references/prompt-engineering.md)
- [符號學兩軸論](references/semiotics.md)

## Example Queries

- 「幫我畫一系列京都旅遊的插畫」
- 「生成一張賽博龐克風格的城市圖」
- 「設計一個可愛的貓咪 Logo」
- 「把這篇文章的重點做成資訊圖表」

