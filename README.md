# AI Council ～別再怕選錯AI，我全都要

以Chrome Extension 實作 [LLM Council](https://github.com/karpathy/llm-council) 概念：同時查詢多個 LLM，匿名互評，主席綜合產出最終答案。此概念也同於 MAV - Multi-AI Voting，若有興趣可以查詢。

## 功能

- **多模型並行查詢**：同時發送至多個 LLM，串流顯示回應
- **匿名互評**（可選）：各模型評估其他回應，產出排名與評語
- **主席綜合**：指定模型綜合所有回應，產出最終答案
- **動態模型更新**：從 OpenRouter 自動抓取最新模型與定價，依條件篩選（context length、vision 支援等）
- **Web Search**：Brave Search API 整合，支援 AI 延伸搜尋
- **Image Generation**：Gemini 圖片生成
- **Vision Mode**：支援圖片輸入分析
- **Context System**：右鍵加入選取文字、擷取頁面內容
- **Canvas**：Markdown 編輯器，支援分頁或獨立視窗

## 安裝

1. Clone 或下載此 repo
2. 開啟 Chrome，前往 `chrome://extensions/`
3. 開啟右上角「開發人員模式」
4. 點擊「載入未封裝項目」
5. 選擇 repo資料夾

## 設定

點擊擴充功能圖示 → 右鍵 → 選項，或直接前往擴充功能的 Options 頁面。

### API Keys

！重要！務必完成以下步驟：

| Key | 必要性 | 取得方式 |
|-----|--------|----------|
| OpenRouter API Key | **必要** | [openrouter.ai](https://openrouter.ai/) 註冊取得 |
| Brave Search API Key | 可選 | [brave.com/search/api](https://brave.com/search/api/) |

- 無 OpenRouter Key：所有功能無法使用
- 無 Brave Key：Council 功能正常，網搜功能禁用

### 模型設定

- 選擇參與 Council 的模型（至少 2 個）
- 選擇主席模型
- 啟用/停用互評階段
- **從 OpenRouter 更新模型**：點擊「從 OpenRouter 更新」按鈕自動抓取最新模型列表（需先設定 API Key）

## 使用

1. 點擊擴充功能圖示開啟 Side Panel
2. （可選）加入 Context：擷取頁面、選取文字、網搜
3. 輸入問題，點擊送出
4. 觀看執行流程：
   - **🤖 模型回應**：各模型回應（分頁顯示）
   - **📊 互評審查**：模型互評（若啟用）
   - **✨ 主席彙整**：主席綜合答案
   - **⚡ 執行狀態**：Agent 決策過程

### 進階功能

- **Vision Mode**：拖曳或貼上圖片至輸入區
- **延伸搜尋**：AI 自動擴展搜尋範圍
- **生成圖片**：使用 Gemini Image 模型
- **開啟畫布**：將回應匯出至 Canvas 編輯

## 技術

- Chrome Extension Manifest V3
- OpenRouter API（統一介面存取多個 LLM）
- Brave Search API
- Agent Planner 框架（智能任務規劃）
- Skills 系統（9 種專業技能模組）
- 純 JavaScript，無框架依賴

## 專案介紹頁面

本專案提供 GitHub Pages 靜態網站，展示專案功能與安裝指南。

### 線上預覽

訪問：`https://<username>.github.io/ai-council-extension/`

### 本地預覽

```bash
# 使用任意 HTTP 伺服器
cd docs
python3 -m http.server 8000
# 或
npx serve .
```

### GitHub Pages 部署設定

1. 前往 GitHub repo → **Settings** → **Pages**
2. Source 選擇 **Deploy from a branch**
3. Branch 選擇 `main`，資料夾選擇 `/docs`
4. 點擊 **Save**
5. 等待幾分鐘後，訪問 `https://<username>.github.io/ai-council-extension/`

## 授權

MIT

## 參考

- [Karpathy LLM Council](https://github.com/karpathy/llm-council)
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
