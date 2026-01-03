// i18n Module - Multi-language support for AI Council
const i18n = {
  currentLocale: 'zh-TW',
  translations: {},
  
  // Initialize i18n system
  async init() {
    const result = await chrome.storage.sync.get({ language: 'zh-TW' });
    this.currentLocale = result.language;
    await this.loadTranslations(this.currentLocale);
    this.applyToPage();
    return this.currentLocale;
  },
  
  // Load translations for a locale
  async loadTranslations(locale) {
    // Translations are loaded via script tags, access from window
    const localeMap = {
      'zh-TW': window.LOCALE_ZH_TW,
      'en-US': window.LOCALE_EN_US,
      'ja-JP': window.LOCALE_JA_JP
    };
    this.translations = localeMap[locale] || localeMap['zh-TW'];
  },
  
  // Get translation by key with optional params
  t(key, params = {}) {
    let text = this.getNestedValue(this.translations, key);
    if (text === undefined) {
      console.warn(`[i18n] Missing translation: ${key}`);
      return key;
    }
    // Replace placeholders {name} with params
    if (params && typeof text === 'string') {
      Object.keys(params).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), params[k]);
      });
    }
    return text;
  },
  
  // Get nested value from object using dot notation
  getNestedValue(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);
  },
  
  // Set locale and reload translations
  async setLocale(locale) {
    this.currentLocale = locale;
    await chrome.storage.sync.set({ language: locale });
    await this.loadTranslations(locale);
    this.applyToPage();
  },
  
  // Apply translations to all elements with data-i18n attribute
  applyToPage() {
    // Handle text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const text = this.t(key);
      if (text !== key) {
        el.textContent = text;
      }
    });
    
    // Handle placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const text = this.t(key);
      if (text !== key) {
        el.placeholder = text;
      }
    });
    
    // Handle titles (tooltips)
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const text = this.t(key);
      if (text !== key) {
        el.title = text;
      }
    });
    
    // Handle HTML content (for elements with mixed content)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const text = this.t(key);
      if (text !== key) {
        el.innerHTML = text;
      }
    });
    
    // Update document title if applicable
    const titleKey = document.querySelector('title')?.getAttribute('data-i18n');
    if (titleKey) {
      document.title = this.t(titleKey);
    }
    
    // Apply CSS custom properties for ::after/::before content
    this.applyCssVariables();
  },
  
  // Set CSS custom properties for pseudo-element content
  applyCssVariables() {
    const cssTranslations = this.translations.css;
    if (!cssTranslations) return;
    
    const root = document.documentElement;
    
    // Map css keys to CSS variable names
    const cssVarMap = {
      contextEmpty: '--i18n-context-empty'
    };
    
    for (const [key, varName] of Object.entries(cssVarMap)) {
      if (cssTranslations[key]) {
        root.style.setProperty(varName, `'${cssTranslations[key]}'`);
      }
    }
  },
  
  // Get current locale
  getLocale() {
    return this.currentLocale;
  },
  
  // Get language name for display
  getLanguageName(locale) {
    const names = {
      'zh-TW': '繁體中文',
      'en-US': 'English',
      'ja-JP': '日本語'
    };
    return names[locale] || locale;
  },
  
  // Get AI response language instruction
  getAILanguageInstruction() {
    return this.t('ai.languageInstruction');
  },
  
  // Get AI response language name
  getAILanguageName() {
    return this.t('ai.languageName');
  }
};

// Shorthand function
function t(key, params) {
  return i18n.t(key, params);
}

// Export for use in other scripts
window.i18n = i18n;
window.t = t;

