## ADDED Requirements

### Requirement: TTS 語音朗讀

Canvas 筆記區 SHALL 提供 TTS（Text-to-Speech）語音朗讀功能，讓用戶可聆聽文件內容。

#### Scenario: 播放全文

- **WHEN** 用戶點擊工具列的 TTS 播放按鈕
- **AND** 編輯器內有文字內容
- **THEN** 系統自動偵測文字語言並開始朗讀全文
- **AND** 播放按鈕切換為播放中狀態

#### Scenario: 播放選取文字

- **WHEN** 用戶選取編輯器內的部分文字
- **AND** 點擊 TTS 播放按鈕
- **THEN** 系統只朗讀選取範圍的文字

#### Scenario: 暫停與繼續

- **WHEN** TTS 正在播放中
- **AND** 用戶點擊暫停按鈕
- **THEN** 朗讀暫停
- **WHEN** 用戶再次點擊播放按鈕
- **THEN** 朗讀從暫停處繼續

#### Scenario: 停止播放

- **WHEN** TTS 正在播放或暫停中
- **AND** 用戶點擊停止按鈕
- **THEN** 朗讀完全停止
- **AND** 下次播放從頭開始

#### Scenario: 空內容處理

- **WHEN** 用戶點擊 TTS 播放按鈕
- **AND** 編輯器內無任何文字內容
- **THEN** 系統顯示 toast 提示「沒有可朗讀的內容」
- **AND** 不觸發 TTS

### Requirement: TTS 語言支援

TTS 功能 SHALL 支援以下語言，並能自動偵測文字語言：

- 繁體中文（zh-TW）
- 日文（ja-JP）
- 美國英文（en-US）

#### Scenario: 語言自動偵測

- **GIVEN** 用戶輸入的文字包含中文字元
- **WHEN** 觸發 TTS 播放
- **THEN** 系統自動選擇繁體中文語音

#### Scenario: 日文偵測優先

- **GIVEN** 文字包含平假名或片假名
- **WHEN** 觸發 TTS 播放
- **THEN** 系統優先判定為日文（即使同時包含漢字）

#### Scenario: 預設英文

- **GIVEN** 文字僅包含英文字母
- **WHEN** 觸發 TTS 播放
- **THEN** 系統選擇美國英文語音
