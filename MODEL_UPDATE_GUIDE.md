# 模型更新功能使用指南

## 功能說明

從 OpenRouter API 動態抓取最新模型列表，並依條件自動篩選適合的模型。

## 使用方式

1. 開啟 Extension Options 頁面
2. 確保已輸入 OpenRouter API 金鑰
3. 在「參與模型」區域，點擊「從 OpenRouter 更新」按鈕
4. 等待更新完成（顯示成功訊息）
5. 模型列表會自動更新並儲存

## 篩選與排序邏輯

### 供應商限制
**僅允許以下 4 個供應商**，每個供應商有不同的模型數量限制：
- **OpenAI** (`openai`): 前 4 個最新模型
- **Anthropic** (`anthropic`): 前 4 個最新模型
- **Google** (`google`): 前 4 個最新模型
- **Meta** (`meta-llama`): 前 2 個最新模型

**總計最多 14 個模型**。其他供應商（如 xAI, Mistral, DeepSeek 等）會被完全排除。

### 基本條件
- **最小 Context Length**: 8000 tokens
- **排除關鍵字**: `free`, `online`, `extended`, `nitro`, `:free`

### 排序與限制流程
1. **基本篩選**：排除不符合條件的模型（context 太小、包含排除關鍵字）
2. **供應商分組**：將模型依供應商分組
3. **時間排序**：每組內按 `created` 時間戳降序排序（最新優先）
4. **數量限制**：每個供應商只取前 N 個模型（見上方限制）
5. **最終排序**：按供應商字母排序，同供應商內按 `created` 降序

### 範例
假設 OpenAI 有 6 個模型：
- `gpt-5.1` (created: 1700000005) ✓ 取
- `gpt-4o` (created: 1700000004) ✓ 取
- `gpt-4o-mini` (created: 1700000003) ✓ 取
- `gpt-4-turbo` (created: 1700000002) ✓ 取
- `gpt-3.5-turbo` (created: 1700000001) ✗ 第 5 個，排除
- `gpt-3.5` (created: 1700000000) ✗ 第 6 個，排除

### 能力檢測
- **Vision 支援**: 檢測 `vision`, `gemini`, `gpt-4`, `claude-3`, `grok` 等關鍵字
- **Image 生成**: 檢測 `image`, `-image-` 等關鍵字

## 技術實作

### 主要函數

```javascript
fetchModelsFromOpenRouter()
// 從 OpenRouter API 獲取原始模型列表（含 created 時間戳）

filterAndSortModels(rawModels)
// 完整的篩選與排序邏輯：
// 1. 過濾：僅保留允許的供應商 + 基本條件
// 2. 分組：依供應商分組
// 3. 排序：每組內按 created 時間戳降序
// 4. 限制：每個供應商保留前 N 個最新模型
// 5. 輸出：最終按供應商、時間排序

updateModelsFromOpenRouter()
// 完整更新流程：抓取 → 篩選排序 → 儲存 → 更新 UI
```

### 資料結構

```javascript
{
  id: 'openai/gpt-4o',          // OpenRouter 模型 ID
  name: 'GPT-4o',                // 顯示名稱
  provider: 'OpenAI',            // 提供商
  canVision: true,               // 支援圖片分析
  canImage: false,               // 支援圖片生成
  inputPrice: 2.5,               // 輸入費率 (USD per 1M tokens)
  outputPrice: 10                // 輸出費率 (USD per 1M tokens)
}
```

### 定價資訊

- 從 OpenRouter API 的 `pricing` 欄位提取
- 自動轉換為「每 100 萬 tokens 的美元價格」
- 儲存於 `chrome.storage.local.availableModels`
- Options 頁面顯示格式：`$輸入/$輸出` (如 `$2.50/$10.00`)
- Sidepanel 啟動時自動載入並合併至成本計算系統
- 若無定價資訊，預設為 $0

### 儲存位置

- `chrome.storage.local.availableModels`: 動態模型列表（含定價）
- Fallback 至 `DEFAULT_AVAILABLE_MODELS` 若 API 失敗

## 觸發時機

- **手動**: 點擊「從 OpenRouter 更新」按鈕
- **自動**: 首次載入時從 storage 讀取（若無則使用預設）

## 注意事項

1. **需要有效 API Key**: 更新前必須輸入 OpenRouter API 金鑰
2. **網路連線**: 需要網路連線至 `openrouter.ai`
3. **篩選結果**: 若無符合條件的模型會顯示錯誤
4. **定價同步**: 每次更新都會同步最新定價，Sidepanel 會在下次啟動時自動使用新定價
5. **定價顯示**: Options 頁面會顯示每個模型的輸入/輸出費率

