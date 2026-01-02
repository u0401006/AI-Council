---
name: vision-analysis
description: 分析上傳圖片的內容、風格、物件。當用戶上傳圖片且非設計請求時觸發，使用視覺模型進行分析。
metadata:
  author: mav
  version: "1.0"
  icon: "\U0001F441"
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
2. 使用 `query_council` 讓視覺模型解析圖片內容
3. 可搭配 `web_search` 查詢相關背景資訊
4. 複雜分析可用 `peer_review` 交叉驗證
5. `synthesize` 整合分析結果

## Model Requirements

- 必須使用支援視覺的模型（canVision: true）
- 優先選擇：GPT-5.1, GPT-4o, Claude Sonnet 4.5, Gemini 系列

## Analysis Dimensions

### 內容分析
- 識別主要物件和人物
- 描述場景和環境
- 辨識文字內容（OCR）
- 偵測情緒和氛圍

### 風格分析
- 攝影/繪畫風格
- 色彩運用
- 構圖手法
- 光線特徵

### 技術分析
- 圖片品質評估
- 可能的後製處理
- 拍攝參數推測

## Response Format

```
## 圖片分析結果

### 內容摘要
[一句話描述圖片主要內容]

### 詳細分析

#### 主要元素
- [物件/人物 1]：[描述]
- [物件/人物 2]：[描述]

#### 場景環境
[場景描述]

#### 文字內容（如有）
[OCR 結果]

### 風格特徵
- **色調**：[描述]
- **構圖**：[描述]
- **光線**：[描述]

### 背景資訊（如有搜尋結果）
[相關背景資訊]

### 可能用途建議
- [建議 1]
- [建議 2]
```

## Example Queries

- 「這張圖片裡有什麼？」
- 「幫我辨識這張照片是在哪裡拍的」
- 「這張海報上寫了什麼？」
- 「分析這幅畫的風格」

