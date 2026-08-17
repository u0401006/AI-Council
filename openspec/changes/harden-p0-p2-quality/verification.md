# P0–P2 修正驗證標準

## P0

### 秘密檔管理
- `git ls-files -- temp-secret` 輸出為空
- `temp-secret/`、`.env*`、私鑰副檔名受到 `.gitignore` 保護
- 自動測試確認秘密目錄未被追蹤

### 最小權限
- `manifest.host_permissions` 不包含 `<all_urls>`
- 任意 HTTP(S) 網站權限只存在於 `optional_host_permissions`
- 擷取頁面或需開啟網站工具時才請求對應 origin 權限

## P1

### Council 結果正確性
- 任意位置的 rejected Promise 都保留正確 model ID
- Review 排序與原回答順序不同時，分數仍依明確 model ID 聚合
- `runReview` 回傳標準化 `{ reviewerModel, rankings }`

### 輸出安全
- Markdown 僅允許 HTTP、HTTPS、mailto、站內路徑和 fragment 連結
- `javascript:`、`data:` 與無效 URL 轉成 `#`
- Content Script 通知訊息使用 `textContent`

## P2

### 憑證與維護
- 新 API Key 只寫入 `chrome.storage.local`
- 舊 sync key 自動遷移至 local 後從 sync 移除
- `app.js` 不再包含不可達 Legacy Council 流程
- 安全、settled result mapping 與互評聚合使用獨立純函式

### 自動驗證
- `npm run verify`：全部 JavaScript 語法檢查和測試通過
- `openspec validate harden-p0-p2-quality --strict --no-interactive` 通過
- `git diff --check` 對本次新增／修改內容不產生新的 whitespace error
