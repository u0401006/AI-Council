# Change: 新增 TTS 語音朗讀功能

## Why

筆記區（Canvas）目前僅支援文字編輯與 AI 輔助功能，用戶無法透過語音聆聽文件內容。新增 TTS 功能可提升無障礙性、支援多工情境（如通勤時聆聽）、並協助語言學習者練習聽力。

## What Changes

- 在 Canvas 工具列新增 TTS 播放按鈕
- 實作 SimpleTTS 模組封裝 Web Speech API
- 支援三種語言自動偵測：繁體中文（zh-TW）、日文（ja-JP）、英文（en-US）
- 提供播放、暫停、停止控制
- 支援語速、音調、音量調整

## Impact

- Affected specs: `canvas`（新增 TTS 能力）
- Affected code:
  - `canvas/canvas.js` - 新增 TTS 控制邏輯
  - `canvas/index.html` - 新增播放按鈕 UI
  - `canvas/style.css` - 新增 TTS UI 樣式
  - `sidepanel/tts.js`（新檔）- SimpleTTS 模組
- 無 breaking changes
- 無後端依賴（使用瀏覽器原生 Web Speech API）
