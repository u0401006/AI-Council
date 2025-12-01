# MAV 產品上架與行銷計畫
1. 命名策略
現況問題
MAV (Multi-AI Voting) 名稱過於技術導向，缺乏記憶點
搜尋性差，不易與功能聯想
建議方案
| 方案 | 名稱 | 定位語 | 優點 | 風險 |
|------|------|--------|------|------|
| A | Consilium | AI Council in Your Browser | 拉丁語「議會」，高端專業感 | 發音門檻、已有同名企業軟體 |
| B | Verdict AI | Multiple AIs, One Answer | 直觀、有決策感 | 需加 AI 後綴區隔 |
| C | Chorus AI | Where AI Minds Converge | 音樂隱喻，暗示和諧整合 | 已有同名產品 |
| D | CouncilAI | The AI Jury You Need | 簡潔直白、SEO 友善 | 較平淡 |
| E | MAV | Multi-AI Voting | 技術精準、可縮寫 | 缺乏記憶點、不直觀 |
| 推薦 | **保留 MAV** 搭配強副標題 | **MAV - AI Council for Chrome** | 品牌一致性、tech-savvy 感 | 需靠副標題說明功能 |

**建議理由：**
- 改名風險高：現有 Git 歷史、文件都使用 MAV
- MAV 作為縮寫反而有記憶點（類似 GPT、API 等技術縮寫）
- Chrome Web Store 顯示格式：主標題 + 副標題，可充分說明
- 若真要改名，**VerdictAI** 或 **CouncilAI** 較 Consilium 更直觀

命名原則
保留 URL 友善：consilium.ai 或 mav.app
Chrome Web Store 名稱建議：Consilium - AI Council 或 MAV: Multi-AI Voting
---

2. 產品定位與價值主張
核心定位
「一次提問，多腦共識」 — 不是讓你選哪個 AI 最好，而是讓所有頂級 AI 一起給你最好的答案。

差異化價值
| 競品 | 定位 | MAV 差異 |
|------|------|---------|
| ChatGPT/Claude | 單一模型對話 | 多模型並行 + 互評機制 |
| Poe | 多模型切換 | 自動綜合，無需手動比較 |
| OpenRouter | API 聚合 | 終端用戶友善，完整 UI |

一句話賣點
英文："Why trust one AI when you can have a council?"
中文：「為什麼只問一個 AI？讓整個 AI 議會幫你。」
---

3. 目標用戶分群
| 群體 | 痛點 | 使用情境 | 訊息切入點 |
|------|------|----------|------------|
| 專業工作者 | 單一 AI 答案不可靠 | 法律、醫療、金融諮詢 | 「多重驗證，專業級可靠」 |
| 研究人員 | 需要多角度觀點 | 文獻分析、假說檢驗 | 「學術級 AI 共識機制」 |
| AI 重度用戶 | 手動比較多模型太麻煩 | 日常問答優化 | 「一鍵取代你的多分頁比較」 |
| 開發者/創作者 | 需要最佳化內容 | Code review、文案生成 | 「讓 AI 互相 review，你只看結果」 |

---

4. 定價模式
模式選項
| 模式 | 說明 | 優點 | 缺點 |
|------|------|------|------|
| A. 免費 + BYOK | 用戶自帶 OpenRouter API Key | 無營收壓力、快速成長 | 無商業模式 |
| B. Freemium | 免費版限 2 模型，Pro 解鎖全部 | 有轉換收入 | 需要支付基礎設施 |
| C. 內建額度 | 提供免費額度，用完加購 | 降低入門門檻 | 需要處理付款、成本控制 |

建議策略
**Phase 1（上架初期）：採用 模式 A（免費 + BYOK）**
- 快速獲取用戶、收集回饋
- 用戶自負 API 成本，無財務壓力
- 建立口碑與評價基礎
- **關鍵：提供清晰的 OpenRouter 註冊教學與 API Key 設定指南**

**Phase 2（驗證後）：有三種變現路徑**

| 路徑 | 方式 | 優點 | 風險 |
|------|------|------|------|
| 2A: Premium 功能 | $5/月解鎖進階功能（自訂 Prompt、更多模型、歷史紀錄雲端同步） | 無成本壓力 | 功能吸引力需足夠 |
| 2B: 內建額度 | 提供 MAV Credits 轉售 API 使用額度 | 降低入門門檻 | **需處理成本控制、濫用風險、金流** |
| 2C: 企業授權 | B2B SaaS，提供團隊版、API、自建部署 | 高 ARPU | 需企業開發資源 |

**推薦：2A → 2C 路徑**
- 避免 API 轉售的財務風險與客服負擔
- Premium 功能易於控制成本（雲端同步、Canvas 進階功能）
- 長期可切入企業市場（法律、醫療、金融等需要多重驗證的專業場景）
---

5. Chrome Web Store 上架準備
必備資產
| 項目 | 規格 | 狀態 | 優先級 |
|------|------|------|---------|
| 圖示 | 128x128 PNG（Chrome 會自動縮放） | ✅ 已有 | P0 |
| 宣傳圖塊 | 1400x560 或 920x680 PNG（小型）| ❌ 需製作 | P0 |
| 截圖 | 1280x800 或 640x400，**至少 1 張，建議 3-5 張** | ❌ 需製作 | P0 |
| 說明文案 | 短描述（132 字元內）/ 長描述 | ❌ 需撰寫 | P0 |
| 隱私權政策頁面 | 可公開訪問的 URL | ❌ 需準備 | P0 |
| 宣傳影片 | YouTube 連結，30-60 秒 | ❌ 選配 | P1 |
| 網站/Landing Page | 產品介紹網站 | ❌ 選配 | P2 |

**截圖內容建議（3 張）：**
1. **主介面** - Side Panel 顯示多模型並行查詢的畫面
2. **互評結果** - Stage 2 peer review 排名顯示
3. **Canvas 編輯器** - WYSIWYG markdown 與 AI 輔助功能

**隱私政策必備內容：**
- ✅ 資料不上傳至 MAV 伺服器（所有 API 呼叫直接前往 OpenRouter）
- ✅ API Key 僅儲存於 chrome.storage.sync（Google 帳號加密同步）
- ✅ 對話歷史僅存於本地裝置
- ✅ 無第三方追蹤或分析工具

商店描述文案建議

**短描述（132 字元內，約 44 個中文字）**
> 同時查詢多個頂級 AI（GPT-5、Claude、Gemini、Grok），讓 AI 互相評審，為你綜合出最可靠的答案。

**長描述結構（詳細版範例）**

```
🤔 你是否曾經懷疑單一 AI 的答案是否正確？

MAV (Multi-AI Voting) 採用「AI 議會」機制，一次提問讓多個頂級 AI 同時回答，再由 AI 互相評審，最後產出經過多重驗證的綜合答案。

✨ 三階段智能機制
1️⃣ 並行查詢：同時向 GPT-5、Claude Sonnet 4.5、Gemini、Grok 等模型提問
2️⃣ 匿名互評：各模型評審其他 AI 的答案，提供排名與理由
3️⃣ 主席綜合：指定模型整合所有回答，產出最佳答案

🎯 核心功能
• 支援 15+ 頂級 AI 模型（OpenAI、Anthropic、Google、xAI、Meta 等）
• 串流即時顯示各模型回應
• 可自訂 Peer Review 與 Chairman 提示詞
• Canvas 畫布：AI 輔助的 Markdown 編輯器
• 網頁內容擷取與 Context 管理
• Web Search 整合（Brave Search）

🔐 隱私優先
• 所有對話不經過我們的伺服器，直接呼叫 OpenRouter API
• API Key 使用 Chrome 加密同步儲存
• 對話歷史僅存於您的本地裝置

⚙️ 使用要求
需自行準備 OpenRouter API Key（https://openrouter.ai/）
支援 BYOK (Bring Your Own Key)，您完全掌控成本與隱私

🌐 開源專案
GitHub: [repository URL]

---
為什麼只問一個 AI？讓整個 AI 議會幫你做決策。
```

---

6. 行銷發布計畫
發布渠道優先順序

| 優先級 | 渠道 | 具體行動 | 預期效果 | 注意事項 |
|--------|------|----------|----------|----------|
| **P0** | Chrome Web Store | 正式上架 | 搜尋流量基礎 | 審核需 3-7 天 |
| **P0** | GitHub | 開源 Repository + README | 技術信任、SEO | 決定是否 MIT/Apache 授權 |
| **P1** | Hacker News | "Show HN: MAV - AI Council Extension" | 技術社群第一波驗證 | **比 PH 更適合初期驗證** |
| **P1** | Reddit | r/ChatGPT, r/LocalLLaMA, r/chrome_extensions | 目標用戶精準觸及 | 避免過度推廣，提供實用價值 |
| **P1** | X/Twitter | 功能演示 GIF + 技術拆解 Thread | AI 圈層傳播 | Tag @OpenRouterAI 可能獲得轉發 |
| **P2** | Product Hunt | 正式 Launch（需累積一定用戶後） | 主流曝光、媒體報導 | **建議等 50+ 安裝後再發**，避免冷啟動 |
| **P2** | YouTube/抖音 | 15-60 秒功能演示短片 | 長尾流量 | 中英雙語版本 |
| **P3** | 中文社群 | PTT、Threads、Dcard、巴哈 | 中文市場 | 台灣市場較小，優先級較低 |

**關鍵調整理由：**
1. **HN 優先於 PH**：Show HN 更適合技術產品冷啟動，PH 需要一定用戶基礎才能衝榜
2. **GitHub 開源**：建立技術信任，Extension 用戶會檢查程式碼安全性
3. **避免同時多平台**：集中火力在 1-2 個平台，避免分散

Product Hunt 發布要點
選擇週二或週三發布（流量最高）
準備 Maker Comment 說明開發動機
製作 3-5 張動態 GIF 展示核心功能
發布當天積極回覆評論
---

7. 發布時程建議（修正版）

| 階段 | 時間 | 關鍵任務 | 可交付成果 |
|------|------|----------|------------|
| **Week 1-2** | 準備期 | • 製作 3 張截圖（主介面、互評、Canvas）<br>• 撰寫隱私政策頁面<br>• 準備 Store 文案（中英文）<br>• 決定是否開源 | 上架資料包 |
| **Week 3** | 上架 | • 提交 Chrome Web Store（審核 3-7 天）<br>• 準備 GitHub README<br>• 錄製 30 秒演示影片 | Extension 審核中 |
| **Week 4** | Soft Launch | • 審核通過後，發布 GitHub Repo<br>• Show HN 貼文<br>• Reddit 分享（2-3 個 subreddit） | 初期用戶（目標 20-50） |
| **Week 5-6** | 收集反饋 | • 回應用戶問題<br>• 修復 Bug<br>• 優化 Onboarding 流程<br>• 累積評價 | 穩定版本 + 5+ 評價 |
| **Week 7+** | Hard Launch | • Product Hunt 發布<br>• Twitter 推廣<br>• YouTube 影片發布 | 規模化成長 |

**關鍵里程碑檢查點：**
- ✅ Week 3 結束前必須完成 Chrome Store 提交
- ✅ Week 4 至少獲得 3 個真實用戶反饋
- ✅ Week 6 達到 4.0+ 評分才考慮 PH Launch
- ✅ 每週固定時間檢視 Chrome Web Store 安裝數據

---

8. 成功指標（調整版）

| 指標 | 30 天目標 | 90 天目標 | 180 天目標 | 測量方式 |
|------|----------|----------|------------|----------|
| Chrome Web Store 安裝數 | 100+ | 500+ | 2,000+ | CWS Dashboard |
| 週活躍用戶 (WAU) | 30+ | 150+ | 600+ | Chrome Analytics |
| 評價數量 | 5+ | 20+ | 50+ | CWS Reviews |
| 平均評分 | 4.0+ | 4.3+ | 4.5+ | CWS Rating |
| GitHub Stars | 20+ | 100+ | 300+ | GitHub Stats |
| Show HN 排名 | 前 30 | — | — | HN Frontpage |
| Product Hunt 排名 | — | Top 10 | — | PH Dashboard |

**北極星指標：週活躍用戶 (WAU)**
- 比總安裝數更重要（很多人安裝後不用）
- 目標：30 天內 WAU/安裝數 > 30%（表示產品有黏性）

**早期警示指標：**
- ⚠️ 若 7 天內評價 < 3 分 → 立即修復問題
- ⚠️ 若 30 天內評論提到「不知道怎麼用」超過 3 次 → 改善 Onboarding
- ⚠️ 若安裝後 24 小時留存 < 20% → 優化首次體驗

---

---

## 9. 關鍵決策點（執行前必須確認）

| 決策項目 | 選項 | 建議 | 理由 |
|---------|------|------|------|
| **命名** | A. 維持 MAV<br>B. 改名 Consilium/VerdictAI | **A. 維持 MAV** | 改名成本高，MAV 作為技術縮寫有記憶點 |
| **語言** | A. 英文優先<br>B. 中英並行<br>C. 中文優先 | **A. 英文優先** | 國際市場大，Chrome Store 主要用戶為英文 |
| **開源** | A. 完全開源（MIT/Apache）<br>B. 部分開源<br>C. 閉源 | **A. 完全開源（MIT）** | Extension 必須開源才能建立信任，避免安全疑慮 |
| **試用額度** | A. BYOK only<br>B. 提供免費額度<br>C. 免費模式限 2 模型 | **A. BYOK only** | Phase 1 避免財務負擔，OpenRouter 本身有 $1 免費額度 |
| **Onboarding** | A. 首次開啟顯示教學<br>B. 內建 Demo Query<br>C. 無引導 | **B. 內建 Demo Query** | 降低使用門檻，預設一個示範問題可直接測試 |
| **分析追蹤** | A. Google Analytics<br>B. 自建匿名統計<br>C. 完全不追蹤 | **C. 完全不追蹤** | 強化隱私承諾，與「資料不上傳」一致 |

**立即需要行動的決策：**
1. ✅ **本週內決定是否開源**（影響 GitHub 準備時程）
2. ✅ **確認 Store 名稱**：建議 "MAV - AI Council for Chrome"
3. ✅ **準備隱私政策頁面**：可用 GitHub Pages 快速建立（mav.github.io/privacy）
4. ✅ **決定首次體驗流程**：建議新用戶看到「如何取得 API Key」的快速指南

---

## 10. 風險與應對

| 風險 | 可能性 | 影響 | 應對策略 |
|------|--------|------|----------|
| OpenRouter API 不穩定/限流 | 中 | 高 | 加入 Retry 機制、顯示清楚錯誤訊息、文件說明 Rate Limit |
| 用戶不願自備 API Key | 高 | 高 | **強化價值溝通**：「掌控成本與隱私」、提供詳細教學 |
| Chrome Store 審核被拒 | 低 | 高 | 確保符合 Manifest V3、清楚說明權限用途、隱私政策完整 |
| 競品快速跟進 | 中 | 中 | 開源建立先發優勢、快速迭代、建立社群 |
| 評價不佳（< 3 分） | 低 | 致命 | Beta 測試、快速回應問題、主動收集反饋 |
| 無人使用（安裝數停滯） | 中 | 高 | 多渠道驗證 PMF、調整定位、改善 Onboarding |

**降低風險的 Pre-launch Checklist：**
- [ ] 至少 3 個朋友/同事完整測試（含 API Key 設定流程）
- [ ] 準備 5 個常見問題的罐頭回覆（FAQ）
- [ ] 測試所有 15+ 模型是否正常運作
- [ ] 準備 OpenRouter 連線失敗的 Fallback UI
- [ ] 檢查所有權限說明是否清楚（避免用戶疑慮）