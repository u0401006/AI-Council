# Change: 修正 P0–P2 安全性、正確性與可維護性問題

## Why
目前擴充功能包含已追蹤憑證、過寬網站權限、互評與失敗模型對應錯誤、未限制 Markdown 連結協定，以及缺乏自動化測試等風險。這些問題會影響使用者安全、排名可信度與後續維護。

## What Changes
- 驗證秘密檔未被 Git 追蹤並擴大秘密檔忽略規則
- 將全網站權限改為執行時選用權限
- 修正 Council 失敗模型與匿名互評排名的對應
- 限制 Markdown 連結為安全協定並移除 Content Script HTML 注入
- 將 API Key 改存本機並自動遷移既有 sync keys
- 移除不可達 Legacy Council 流程
- 抽出可測試的純函式並加入 Node 測試與驗證指令

## Impact
- Affected specs: extension-hardening
- Affected code: manifest.json, background.js, sidepanel/, canvas/, content/, options/
- Storage migration: API keys migrate from chrome.storage.sync to chrome.storage.local

## Approval
使用者已在 2026-08-14 明確要求建立 branch、列出驗證標準、實作全部 P0–P2 修正並加入測試，視為本變更的實作核准。
