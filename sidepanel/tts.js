/**
 * SimpleTTS - Web Speech API 封裝
 * 支援語言：繁體中文(台灣)、日文、美國英文
 */

const LANG_PATTERNS = {
  'ja-JP': /[\u3040-\u309F\u30A0-\u30FF]/,  // 平假名、片假名
  'zh-TW': /[\u4E00-\u9FFF]/,               // 中文字
  'en-US': /[a-zA-Z]/,                       // 英文
};

// 各語言偏好語音設定（依優先順序）
const VOICE_PREFERENCES = {
  'zh-TW': [
    { name: 'Meijia', speed: 1.1, pitch: 0.8 },
    { name: 'Google 國語（臺灣）', speed: 1.1, pitch: 1.0 },
  ],
  'ja-JP': [
    { name: 'Google 日本語', speed: 1.0, pitch: 1.1 },
  ],
  'en-US': [
    { name: 'Google US English', speed: 1.1, pitch: 1.1 },
    { name: 'Google UK English Female', speed: 1.1, pitch: 1.1 },
    { name: 'Google UK English Male', speed: 1.1, pitch: 1.1 },
  ],
};

class SimpleTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.currentUtterance = null;
    // 各語言目前使用的偏好索引
    this.preferenceIndex = {
      'zh-TW': 0,
      'ja-JP': 0,
      'en-US': 0,
    };
    // 串流播放狀態
    this.chunkQueue = [];
    this.currentChunkIndex = 0;
    this.isStreaming = false;
    this.streamOptions = null;
    this.onStreamEnd = null;
    this.onChunkStart = null;

    this.loadVoices();

    // 部分瀏覽器需要等待 voiceschanged 事件
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.loadVoices();
    }
  }

  loadVoices() {
    this.voices = this.synth.getVoices();
    console.log('[TTS] loadVoices:', this.voices.length, 'voices loaded');
  }

  /**
   * 取得指定語言的偏好語音設定
   * @param {string} lang - 語言代碼
   * @returns {{ voice: SpeechSynthesisVoice, speed: number, pitch: number } | null}
   */
  getPreferredVoice(lang) {
    const prefs = VOICE_PREFERENCES[lang];
    if (!prefs || prefs.length === 0) return null;

    const index = this.preferenceIndex[lang] || 0;
    const pref = prefs[index];

    // 找到對應的語音
    const voice = this.voices.find(v => v.name === pref.name);
    if (voice) {
      return { voice, speed: pref.speed, pitch: pref.pitch, name: pref.name };
    }

    // 若找不到，嘗試下一個偏好
    for (let i = 0; i < prefs.length; i++) {
      const fallback = this.voices.find(v => v.name === prefs[i].name);
      if (fallback) {
        return { voice: fallback, speed: prefs[i].speed, pitch: prefs[i].pitch, name: prefs[i].name };
      }
    }

    return null;
  }

  /**
   * 切換到下一個偏好語音
   * @param {string} lang - 語言代碼
   */
  nextVoice(lang) {
    const prefs = VOICE_PREFERENCES[lang];
    if (!prefs || prefs.length <= 1) {
      console.log(`[TTS] ${lang} 只有一個偏好語音`);
      return;
    }

    const currentIndex = this.preferenceIndex[lang] || 0;
    const nextIndex = (currentIndex + 1) % prefs.length;
    this.preferenceIndex[lang] = nextIndex;

    const pref = this.getPreferredVoice(lang);
    console.log(`[TTS] 切換 ${lang} 語音: ${pref?.name || '無可用語音'} (${nextIndex + 1}/${prefs.length})`);
    return pref;
  }

  /**
   * 列出指定語言的偏好語音
   * @param {string} lang - 語言代碼
   */
  listPreferences(lang) {
    const prefs = VOICE_PREFERENCES[lang];
    if (!prefs) {
      console.log(`[TTS] 無 ${lang} 的偏好設定`);
      return;
    }

    const currentIndex = this.preferenceIndex[lang] || 0;
    console.log(`[TTS] ${lang} 偏好語音列表 (目前: ${currentIndex + 1}):`);
    prefs.forEach((p, i) => {
      const available = this.voices.some(v => v.name === p.name);
      const marker = i === currentIndex ? '→' : ' ';
      const status = available ? '✓' : '✗';
      console.log(`  ${marker} ${i + 1}. ${p.name} [speed=${p.speed}, pitch=${p.pitch}] ${status}`);
    });
  }

  /**
   * 取得指定語言的可用語音列表
   * @param {string} lang - 語言代碼 (zh-TW, ja-JP, en-US)
   * @returns {SpeechSynthesisVoice[]}
   */
  getVoices(lang) {
    if (!lang) return this.voices;

    const filtered = this.voices.filter(v => {
      if (lang === 'zh-TW') {
        return v.lang.includes('zh-TW') || v.lang.includes('zh_TW') ||
               v.lang.includes('cmn-TW') || v.lang.includes('cmn_TW');
      }
      if (lang === 'ja-JP') {
        return v.lang.includes('ja');
      }
      if (lang === 'en-US') {
        return v.lang.includes('en-US') || v.lang.includes('en_US');
      }
      return false;
    });

    console.log(`[TTS] getVoices(${lang}):`, filtered.map(v => `${v.name} (${v.lang})`));
    return filtered;
  }

  /**
   * 自動偵測文字語言
   * @param {string} text
   * @returns {string} 語言代碼
   */
  detectLang(text) {
    const sample = text.slice(0, 100);

    // 優先判斷日文（因為日文也包含漢字）
    let detected = 'en-US';
    if (LANG_PATTERNS['ja-JP'].test(sample)) {
      detected = 'ja-JP';
    } else if (LANG_PATTERNS['zh-TW'].test(sample)) {
      detected = 'zh-TW';
    }

    console.log('[TTS] detectLang:', { sample: sample.slice(0, 30), detected });
    return detected;
  }

  /**
   * 將長文本切分成小段落
   * @param {string} text - 原始文字
   * @param {number} maxLength - 每段最大字元數（預設 200）
   * @returns {string[]} 切分後的段落陣列
   */
  splitIntoChunks(text, maxLength = 200) {
    if (!text || text.length <= maxLength) {
      return text ? [text.trim()] : [];
    }

    const chunks = [];
    let remaining = text.trim();

    // 句子結束符號（依優先順序）
    const sentenceEnders = [
      /([。！？\.\!\?]+)/,  // 句號、驚嘆號、問號
      /([；;]+)/,           // 分號
      /([，,]+)/,           // 逗號
      /(\s+)/,              // 空白
    ];

    while (remaining.length > 0) {
      if (remaining.length <= maxLength) {
        chunks.push(remaining.trim());
        break;
      }

      // 在 maxLength 範圍內找最佳切分點
      let cutPoint = -1;
      const searchRange = remaining.slice(0, maxLength);

      // 依優先順序嘗試不同的切分符號
      for (const pattern of sentenceEnders) {
        // 找到最後一個符合的位置
        let lastMatch = -1;
        let match;
        const regex = new RegExp(pattern.source, 'g');

        while ((match = regex.exec(searchRange)) !== null) {
          lastMatch = match.index + match[0].length;
        }

        if (lastMatch > 0 && lastMatch > maxLength * 0.3) {
          // 至少要切到 30% 以上的位置
          cutPoint = lastMatch;
          break;
        }
      }

      // 若找不到好的切分點，強制在 maxLength 切
      if (cutPoint <= 0) {
        cutPoint = maxLength;
      }

      const chunk = remaining.slice(0, cutPoint).trim();
      if (chunk) {
        chunks.push(chunk);
      }
      remaining = remaining.slice(cutPoint).trim();
    }

    console.log(`[TTS] splitIntoChunks: ${text.length} 字 → ${chunks.length} 段`);
    return chunks;
  }

  /**
   * 播放語音
   * @param {string} text - 要朗讀的文字
   * @param {Object} options - 選項
   * @param {number} options.speed - 語速 (0.1 ~ 10, 預設 1.0)
   * @param {number} options.pitch - 音調 (0 ~ 2, 預設 1.0)
   * @param {number} options.volume - 音量 (0 ~ 1, 預設 1.0)
   * @param {string} lang - 語言代碼
   * @param {SpeechSynthesisVoice} voice - 指定語音
   */
  speak(text, options = {}, lang, voice) {
    this.stop();

    if (!text || !text.trim()) return false;

    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = lang ?? this.detectLang(text);

    // 取得偏好語音設定
    const preferred = this.getPreferredVoice(targetLang);

    // 設定參數（優先使用傳入的 options，否則使用偏好設定）
    utterance.rate = options.speed ?? preferred?.speed ?? 1.0;
    utterance.pitch = options.pitch ?? preferred?.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    // 設定語音（優先使用傳入的 voice，否則使用偏好語音）
    const targetVoice = voice ?? preferred?.voice ?? this.getVoices(targetLang)[0];

    console.log('[TTS] speak:', {
      textPreview: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
      detectedLang: targetLang,
      selectedVoice: targetVoice ? `${targetVoice.name}` : 'none',
      speed: utterance.rate,
      pitch: utterance.pitch,
      preferredConfig: preferred?.name || 'fallback'
    });

    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = targetLang;
      console.warn(`[TTS] No voice found for ${targetLang}, using browser default`);
    }

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    return true;
  }

  /**
   * 建立 utterance（內部使用）
   * @param {string} text - 文字
   * @param {Object} options - 選項
   * @param {string} lang - 語言
   * @returns {SpeechSynthesisUtterance}
   */
  createUtterance(text, options = {}, lang) {
    const utterance = new SpeechSynthesisUtterance(text);
    const targetLang = lang ?? this.detectLang(text);
    const preferred = this.getPreferredVoice(targetLang);

    utterance.rate = options.speed ?? preferred?.speed ?? 1.0;
    utterance.pitch = options.pitch ?? preferred?.pitch ?? 1.0;
    utterance.volume = options.volume ?? 1.0;

    const targetVoice = preferred?.voice ?? this.getVoices(targetLang)[0];
    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = targetLang;
    }

    return utterance;
  }

  /**
   * 串流播放長文本
   * @param {string} text - 要朗讀的文字
   * @param {Object} options - 選項
   * @param {Function} options.onEnd - 全部播放完成回調
   * @param {Function} options.onChunk - 每段開始播放回調 (index, total)
   * @returns {boolean}
   */
  speakStream(text, options = {}) {
    this.stop();

    if (!text || !text.trim()) return false;

    const chunks = this.splitIntoChunks(text);
    if (chunks.length === 0) return false;

    // 儲存串流狀態
    this.chunkQueue = chunks;
    this.currentChunkIndex = 0;
    this.isStreaming = true;
    this.streamOptions = options;
    this.onStreamEnd = options.onEnd || null;
    this.onChunkStart = options.onChunk || null;

    console.log(`[TTS] speakStream: 開始播放 ${chunks.length} 段`);

    // 開始播放第一段
    this.playNextChunk();
    return true;
  }

  /**
   * 播放下一段（內部使用）
   */
  playNextChunk() {
    // 檢查是否已完成或被停止
    if (!this.isStreaming || this.currentChunkIndex >= this.chunkQueue.length) {
      this.isStreaming = false;
      console.log('[TTS] speakStream: 播放完成');
      if (this.onStreamEnd) {
        this.onStreamEnd();
      }
      return;
    }

    const chunk = this.chunkQueue[this.currentChunkIndex];
    const total = this.chunkQueue.length;
    const current = this.currentChunkIndex + 1;

    console.log(`[TTS] playNextChunk: ${current}/${total}`);

    // 觸發 chunk 開始回調
    if (this.onChunkStart) {
      this.onChunkStart(current, total);
    }

    // 建立並播放 utterance
    const utterance = this.createUtterance(chunk, this.streamOptions);

    utterance.onend = () => {
      this.currentChunkIndex++;
      this.playNextChunk();
    };

    utterance.onerror = (e) => {
      console.error('[TTS] chunk error:', e);
      // 嘗試播放下一段
      this.currentChunkIndex++;
      this.playNextChunk();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  /**
   * 取得串流播放進度
   * @returns {{ current: number, total: number, isStreaming: boolean }}
   */
  getStreamProgress() {
    return {
      current: this.currentChunkIndex + 1,
      total: this.chunkQueue.length,
      isStreaming: this.isStreaming
    };
  }

  /**
   * 暫停
   */
  pause() {
    this.synth.pause();
  }

  /**
   * 繼續
   */
  resume() {
    this.synth.resume();
  }

  /**
   * 停止
   */
  stop() {
    this.synth.cancel();
    this.currentUtterance = null;
    // 清空串流狀態
    this.isStreaming = false;
    this.chunkQueue = [];
    this.currentChunkIndex = 0;
    this.streamOptions = null;
  }

  /**
   * 是否正在播放（包含串流播放）
   */
  get isSpeaking() {
    return this.synth.speaking || this.isStreaming;
  }

  /**
   * 是否暫停中
   */
  get isPaused() {
    return this.synth.paused;
  }

  /**
   * 註冊事件回調
   * @param {string} event - 事件名稱 (end, error, pause, resume)
   * @param {Function} callback
   */
  on(event, callback) {
    if (this.currentUtterance) {
      this.currentUtterance.addEventListener(event, callback);
    }
  }

  /**
   * 列出所有可用語音（Console 用）
   */
  listAllVoices() {
    const grouped = {
      'zh-TW': [],
      'zh': [],
      'ja': [],
      'en': [],
      'other': []
    };

    this.voices.forEach((v, i) => {
      const info = `[${i}] ${v.name} (${v.lang})${v.default ? ' [DEFAULT]' : ''}`;
      if (v.lang.includes('zh-TW') || v.lang.includes('cmn-TW')) {
        grouped['zh-TW'].push(info);
      } else if (v.lang.includes('zh')) {
        grouped['zh'].push(info);
      } else if (v.lang.includes('ja')) {
        grouped['ja'].push(info);
      } else if (v.lang.includes('en')) {
        grouped['en'].push(info);
      } else {
        grouped['other'].push(info);
      }
    });

    console.log('=== 可用語音列表 ===');
    console.log('繁體中文 (zh-TW):', grouped['zh-TW']);
    console.log('其他中文 (zh):', grouped['zh']);
    console.log('日文 (ja):', grouped['ja']);
    console.log('英文 (en):', grouped['en']);
    console.log('其他:', grouped['other']);

    return this.voices;
  }

  /**
   * 測試指定語音
   * @param {number} index - 語音索引（從 listAllVoices 取得）
   * @param {Object} options - 選項
   * @param {string} options.text - 測試文字（選填）
   * @param {number} options.speed - 語速 0.1~10（預設 1）
   * @param {number} options.pitch - 音調 0~2（預設 1）
   */
  testVoice(index, options = {}) {
    const voice = this.voices[index];
    if (!voice) {
      console.error(`[TTS] 找不到索引 ${index} 的語音`);
      return;
    }

    // 支援舊的 testVoice(index, text) 呼叫方式
    if (typeof options === 'string') {
      options = { text: options };
    }

    const testText = options.text || this.getTestText(voice.lang);
    const speed = options.speed ?? 1.0;
    const pitch = options.pitch ?? 1.0;

    console.log(`[TTS] 測試語音: ${voice.name} (${voice.lang})`);
    console.log(`[TTS] 參數: speed=${speed}, pitch=${pitch}`);
    console.log(`[TTS] 測試文字: ${testText}`);

    this.stop();
    const utterance = new SpeechSynthesisUtterance(testText);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = speed;
    utterance.pitch = pitch;
    this.synth.speak(utterance);
  }

  /**
   * 取得測試文字
   */
  getTestText(lang) {
    if (lang.includes('zh')) return '針對各國政府開放資料與公共媒體新聞的收費標準。';
    if (lang.includes('ja')) return 'こんにちは、音声テストです。';
    return 'Hello, this is a voice test.';
  }

  /**
   * 批次測試同語言的所有語音
   * @param {string} langFilter - 語言篩選 (zh-TW, ja, en)
   * @param {Object} options - 選項
   * @param {number} options.delay - 每個語音間隔秒數（預設 3）
   * @param {number} options.speed - 語速 0.1~10（預設 1）
   * @param {number} options.pitch - 音調 0~2（預設 1）
   */
  async testAllVoices(langFilter = 'zh', options = {}) {
    const delay = options.delay ?? 3;
    const speed = options.speed ?? 1.0;
    const pitch = options.pitch ?? 1.0;

    const voices = this.voices.filter(v => v.lang.includes(langFilter));
    console.log(`[TTS] 批次測試 ${voices.length} 個 ${langFilter} 語音`);
    console.log(`[TTS] 參數: delay=${delay}s, speed=${speed}, pitch=${pitch}`);

    for (let i = 0; i < voices.length; i++) {
      const v = voices[i];
      console.log(`[TTS] (${i + 1}/${voices.length}) ${v.name}`);
      this.testVoice(this.voices.indexOf(v), { speed, pitch });
      await new Promise(r => setTimeout(r, delay * 1000));
    }
    console.log('[TTS] 批次測試完成');
  }
}

// 全域實例
window.simpleTTS = new SimpleTTS();

// Console 使用說明
console.log(`
[TTS] 語音指令：
  simpleTTS.speak('文字')            // 使用偏好語音朗讀
  simpleTTS.nextVoice('zh-TW')       // 切換繁中語音（Meijia ↔ Google）
  simpleTTS.nextVoice('en-US')       // 切換英文語音
  simpleTTS.listPreferences('zh-TW') // 查看偏好語音列表
  simpleTTS.stop()                   // 停止播放

[TTS] 測試指令：
  simpleTTS.listAllVoices()          // 列出所有語音
  simpleTTS.testVoice(0)             // 測試索引 0 的語音
  simpleTTS.testVoice(0, { speed: 0.8, pitch: 1.2 })
  simpleTTS.testAllVoices('zh-TW', { delay: 4 })

  speed: 0.1~10 (越小越慢) | pitch: 0~2 (越小越低沉)
`);
