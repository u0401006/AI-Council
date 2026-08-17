## 1. TTS 模組實作

- [x] 1.1 建立 `sidepanel/tts.js`，實作 SimpleTTS 類別
- [x] 1.2 實作語言自動偵測（zh-TW, ja-JP, en-US）
- [x] 1.3 實作 speak(), pause(), resume(), stop() 方法
- [x] 1.4 實作 isSpeaking, isPaused getter

## 2. Canvas UI 整合

- [x] 2.1 在 `canvas/index.html` 工具列新增 TTS 播放按鈕群組
- [x] 2.2 在 `canvas/style.css` 新增 TTS 按鈕樣式
- [x] 2.3 在 `canvas/canvas.js` 引入 TTS 模組並綁定事件
- [x] 2.4 實作播放狀態 UI 回饋（按鈕 active 狀態、播放中 indicator）

## 3. 功能完善

- [x] 3.1 支援選取文字局部朗讀（若有選取範圍則只唸選取內容）
- [x] 3.2 新增 i18n 翻譯鍵（zh-TW, en-US, ja-JP）
- [x] 3.3 處理 voiceschanged 事件確保語音列表載入
