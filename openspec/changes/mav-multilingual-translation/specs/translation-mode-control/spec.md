## ADDED Requirements

### Requirement: 系統必須提供翻譯模式控制
系統 MUST 至少提供精準模式、自然模式、新聞模式三種翻譯模式。

#### Scenario: 精準模式
- **WHEN** 使用者選擇精準模式
- **THEN** 系統優先保留原文語義與術語對應

#### Scenario: 新聞模式
- **WHEN** 使用者選擇新聞模式
- **THEN** 系統輸出符合新聞稿語體與可讀性格式

### Requirement: 系統必須保留可審核翻譯中繼資料
系統 MUST 在輸出中附帶來源語言、目標語言、模式、版本與處理時間。

#### Scenario: 翻譯輸出追蹤
- **WHEN** 使用者完成翻譯
- **THEN** 系統提供對應 metadata 供後續比對與審核