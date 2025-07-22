// Kana AI Learning Assistant - Content Script
// This script creates the floating orb interface and handles all interactions

console.log('Kana AI Learning Assistant - Content Script Loading...');

// Load external data files using dynamic import (CSP-safe)
async function loadDataFiles() {
  try {
    const glassThemesUrl = chrome.runtime.getURL('data/glass-themes.js');
    const subjectResourcesUrl = chrome.runtime.getURL('data/subject-resources.js');

    // Import the modules directly (this is CSP-safe)
    const [glassThemesModule, subjectResourcesModule] = await Promise.all([
      import(glassThemesUrl).catch(async (error) => {
        console.warn('Dynamic import failed, trying fetch approach:', error);
        const response = await fetch(glassThemesUrl);
        const text = await response.text();
        return parseThemeDataSafely(text, 'GLASS_THEMES');
      }),
      import(subjectResourcesUrl).catch(async (error) => {
        console.warn('Dynamic import failed for resources, trying fetch approach:', error);
        const response = await fetch(subjectResourcesUrl);
        const text = await response.text();
        return parseResourceDataSafely(text, 'SUBJECT_RESOURCES');
      })
    ]);

    const glassThemes = glassThemesModule.GLASS_THEMES || glassThemesModule.default?.GLASS_THEMES || {};
    const subjectResources = subjectResourcesModule.SUBJECT_RESOURCES || subjectResourcesModule.default?.SUBJECT_RESOURCES || {};

    return { glassThemes, subjectResources };
  } catch (error) {
    console.warn('Failed to load external data files, using fallbacks:', error);
    return { glassThemes: {}, subjectResources: {} };
  }
}

// CSP-safe parsing functions (no eval/Function constructor)
function parseThemeDataSafely(text, exportName) {
  // This is a simplified fallback - in practice, we'll rely on the import working
  return { [exportName]: {} };
}

function parseResourceDataSafely(text, exportName) {
  // This is a simplified fallback - in practice, we'll rely on the import working  
  return { [exportName]: {} };
}

// Conversation context manager for follow-up questions
class ConversationContext {
  constructor() {
    this.previousQuestions = [];
    this.lastResponse = null;
    this.currentTopic = null;
    this.pageContext = null;
    this.maxHistoryLength = 5; // Keep last 5 questions for context
  }

  addQuestion(question) {
    this.previousQuestions.push(question);
    if (this.previousQuestions.length > this.maxHistoryLength) {
      this.previousQuestions.shift(); // Remove oldest question
    }

    // Try to detect if this continues the current topic
    if (this.currentTopic) {
      const questionLower = question.toLowerCase();
      const topicLower = this.currentTopic.toLowerCase();

      // Simple topic continuity check
      if (questionLower.includes('this') || questionLower.includes('that') ||
        questionLower.includes('it') || questionLower.includes('here') ||
        questionLower.includes(topicLower)) {
        // Question seems to continue the current topic
      } else {
        // Seems like a new topic
        this.currentTopic = this.extractTopicFromQuestion(question);
      }
    } else {
      this.currentTopic = this.extractTopicFromQuestion(question);
    }
  }

  addResponse(response) {
    this.lastResponse = typeof response === 'string' ? response : response.content || '';
  }

  extractTopicFromQuestion(question) {
    // Simple topic extraction - get key nouns/concepts
    const words = question.toLowerCase().split(/\s+/);
    const stopWords = ['what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'can', 'do', 'does', 'will', 'should', 'a', 'an', 'the', 'this', 'that', 'i', 'me', 'my'];
    const meaningfulWords = words.filter(word => !stopWords.includes(word) && word.length > 2);

    return meaningfulWords.slice(0, 3).join(' '); // Take first few meaningful words as topic
  }

  getContext() {
    return {
      previousQuestions: this.previousQuestions,
      lastResponse: this.lastResponse,
      currentTopic: this.currentTopic,
      pageContext: this.pageContext
    };
  }

  clear() {
    this.previousQuestions = [];
    this.lastResponse = null;
    this.currentTopic = null;
    this.pageContext = null;
  }
}

class KanaAssistant {
  constructor() {
    this.log('Initializing...');
    this.orb = null;
    this.chatPanel = null;
    this.isListening = false;
    this.isDragging = false;
    this.isLocked = false;
    this.recognition = null;
    this.position = { x: 30, y: 50 };
    this.wakePhrases = ['hey kana', 'hi kana', 'hello kana'];
    this.conversationContext = new ConversationContext();
    this.glassThemes = {};
    this.subjectResources = {};
    this.dataLoaded = false;
    this.loadExternalData();

    // Track last successful AI model for faster responses
    this.lastSuccessfulModel = null;

    // Voice response settings
    this.voiceResponseEnabled = true;
    this.speechSynthesis = null;
    this.currentSpeech = null;
    this.currentSpeechType = null; // Track type of current speech: 'conversational' or 'reading'
    this.isSpeaking = false;
    this.isInVoiceMode = false;
    this.voiceConversationActive = false;
    this.voiceRecognitionPaused = false; // Track if voice recognition is paused to prevent feedback
    this.selectedVoice = null;
    this.voiceUI = null;
    this.isListeningForInterrupts = false; // Track interrupt detection during explanations
    this.interruptRecognition = null; // Separate recognition for interrupts during speech

    // Voice recognition restart management
    this.voiceRestartAttempts = 0;
    this.maxVoiceRestartAttempts = 5;
    this.voiceRestartTimeout = null;

    // Default glass settings
    this.glassSettings = {
      panelColor: 'blue',
      orbColor: 'blue',
      opacity: 80,
      blur: 30,
      saturation: 140,
      brightness: 105,
      depth: 60
    };

    // Initialize modular components
    this.initializeModules();

    this.init();
  }

  initializeModules() {
    try {
      // Initialize Error Handler
      if (window.ErrorHandler) {
        this.errorHandler = new ErrorHandler();
        this.log('Error Handler initialized successfully');
      } else {
        this.log('Error Handler not available', 'warn');
      }

      // Initialize URL Validator
      if (window.URLValidator) {
        this.urlValidator = new URLValidator();
        this.log('URL Validator initialized successfully');
      } else {
        this.log('URL Validator not available', 'warn');
      }

      // Initialize Demo Response Generator
      if (window.DemoResponseGenerator) {
        this.demoResponseGenerator = new DemoResponseGenerator();
        this.log('Demo Response Generator initialized successfully');
      } else {
        this.log('Demo Response Generator not available', 'warn');
      }

      // Initialize YouTube PiP Manager
      if (window.YouTubePiPManager) {
        this.youtubePiP = new YouTubePiPManager();
        // Set initial theme if available
        if (this.glassThemes && this.glassSettings) {
          this.youtubePiP.updateTheme(this.glassSettings.panelColor, this.glassThemes, this.glassSettings);
        }
        this.log('YouTube PiP Manager initialized successfully');
      } else {
        this.log('YouTube PiP Manager not available', 'warn');
      }

      // Initialize Real YouTube Video Finder (static database)
      if (window.RealYouTubeVideoFinder) {
        this.realYouTubeFinder = new RealYouTubeVideoFinder();
        this.log('Real YouTube Video Finder initialized successfully');
      } else {
        this.log('Real YouTube Video Finder not available', 'warn');
      }

      // Initialize Live YouTube Searcher (real API search)
      if (window.LiveYouTubeSearcher) {
        // Get YouTube API key from storage or use fallback
        this.initializeLiveYouTubeSearch();
      } else {
        this.log('Live YouTube Searcher not available', 'warn');
      }

      // Initialize Study Pouch Manager
      if (window.StudyPouchManager) {
        this.studyPouch = new StudyPouchManager();
        this.log('Study Pouch Manager initialized successfully');
        console.log('StudyPouchManager instance:', this.studyPouch);

        // Apply theme immediately if available
        setTimeout(() => {
          if (this.glassSettings && this.glassThemes) {
            console.log('Applying initial theme to Study Pouch:', this.glassSettings.orbColor);
            this.studyPouch.updateTheme(this.glassSettings.orbColor);
          }
        }, 100);
      } else {
        this.log('Study Pouch Manager not available', 'warn');
        console.error('window.StudyPouchManager is undefined!');
      }
    } catch (error) {
      this.log(`Failed to initialize modules: ${error.message}`, 'error');
    }
  }

  async initializeLiveYouTubeSearch() {
    try {
      // Get stored YouTube API key
      const result = await chrome.storage.local.get(['youtubeApiKey']);
      const apiKey = result.youtubeApiKey;

      this.liveYouTubeSearcher = new LiveYouTubeSearcher(apiKey);

      if (apiKey) {
        this.log('Live YouTube Searcher initialized with API key - REAL search enabled');
      } else {
        this.log('Live YouTube Searcher initialized without API key - using public APIs only');
      }
    } catch (error) {
      this.log(`Failed to initialize Live YouTube Searcher: ${error.message}`, 'error');
      // Fallback without API key
      this.liveYouTubeSearcher = new LiveYouTubeSearcher();
    }
  }

  async loadExternalData() {
    try {
      const data = await loadDataFiles();
      this.glassThemes = data.glassThemes;
      this.subjectResources = data.subjectResources;

      // Make themes globally available for Study Pouch
      window.glassThemes = this.glassThemes;

      // Validate that glass themes were loaded correctly
      if (!this.glassThemes || Object.keys(this.glassThemes).length === 0) {
        this.glassThemes = this.getBuiltInGlassThemes();
        window.glassThemes = this.glassThemes;
      }

      this.dataLoaded = true;

      // Apply glass theme after data is loaded
      if (this.orb && this.chatPanel) {
        this.applyGlassTheme();
      }
    } catch (error) {
      console.warn('Failed to load external data:', error);
      this.glassThemes = this.getBuiltInGlassThemes();
      window.glassThemes = this.glassThemes;
      this.subjectResources = {};
      this.dataLoaded = true; // Set to true so theme can still be applied
    }
  }

  getBuiltInGlassThemes() {
    // Minimal fallback theme - full themes are loaded from data/glass-themes.js
    return {
      blue: {
        panelBg: 'linear-gradient(135deg, rgba(240, 248, 255, 0.3) 0%, rgba(220, 240, 255, 0.25) 50%, rgba(200, 230, 255, 0.3) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(70, 130, 240, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(245, 250, 255, 0.25) 0%, rgba(235, 245, 255, 0.15) 50%, rgba(225, 240, 255, 0.2) 100%)',
        textColor: 'rgba(20, 40, 80, 0.92)',
        orbBg: '#4A90E2',
        orbShadow: 'rgba(74, 144, 226, 0.4)'
      }
    };
  }

  // Helper function to create DOM elements with properties
  createElement(tag, props = {}, styles = {}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    Object.assign(el.style, styles);
    return el;
  }

  // Helper for adding multiple event listeners
  addEvents(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
      element.addEventListener(event, handler);
    });
  }

  // Console wrapper for shorter calls
  log(msg, level = 'log') { console[level](`Kana: ${msg}`); }

  init() {
    this.log('Creating orb...');
    try {
      this.createOrb();
      this.setupEventListeners();
      // Disabled built-in speech recognition to avoid conflict with enhanced voice system
      // this.setupSpeechRecognition();
      this.setupEnhancedVoice();
      this.setupVoiceResponse();
      this.loadPosition();
      this.setupMessageListener();
      this.loadGlassSettings();
      this.loadAdaptiveColorsSetting();
      this.loadVoiceResponseSettings();
      this.log('Initialized successfully!');
    } catch (error) {
      this.log('Initialization failed', 'error');
    }
  }

  async loadAdaptiveColorsSetting() {
    try {
      const settings = await chrome.storage.local.get(['kanaAdaptiveColors']);
      this.useAdaptiveColors = settings.kanaAdaptiveColors !== undefined ? settings.kanaAdaptiveColors : true; // Default to true
      this.useAdaptiveColors ? this.applyAdaptiveColors() : this.applyDefaultColors();
      this.log(`Adaptive colors ${this.useAdaptiveColors ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.log('Error loading adaptive colors setting:', error);
      this.useAdaptiveColors = true; // Default to true
      this.applyAdaptiveColors();
    }
  }

  async loadGlassSettings() {
    try {
      const settings = await chrome.storage.local.get([
        'glassColorPanel', 'glassColorOrb', 'glassOpacity',
        'glassBlur', 'glassSaturation', 'glassBrightness', 'glassDepth'
      ]);

      this.glassSettings = {
        panelColor: settings.glassColorPanel || 'blue',
        orbColor: settings.glassColorOrb || 'blue',
        opacity: settings.glassOpacity || 80,
        blur: settings.glassBlur || 30,
        saturation: settings.glassSaturation || 140,
        brightness: settings.glassBrightness || 105,
        depth: settings.glassDepth || 60
      };

      // Wait for external data to be loaded before applying theme
      if (this.dataLoaded) {
        this.applyGlassTheme();
      } else {
        // Wait for data to load, then apply theme
        const checkData = () => {
          if (this.dataLoaded) {
            this.applyGlassTheme();
          } else {
            setTimeout(checkData, 100);
          }
        };
        checkData();
      }
    } catch (error) {
      console.error('Error loading glass settings:', error);
    }
  }

  applyGlassTheme() {
    if (!this.chatPanel || !this.orb || !this.dataLoaded || !this.glassThemes) {
      return;
    }

    const panelTheme = this.glassThemes[this.glassSettings.panelColor];
    const orbTheme = this.glassThemes[this.glassSettings.orbColor];

    if (!panelTheme || !orbTheme) {
      console.warn('Glass theme not found for colors:', this.glassSettings.panelColor, this.glassSettings.orbColor);
      return;
    }

    // Apply panel theme with custom settings
    const opacityMultiplier = this.glassSettings.opacity / 100;
    const blur = this.glassSettings.blur;
    const saturation = this.glassSettings.saturation / 100;
    const brightness = this.glassSettings.brightness / 100;
    const depthMultiplier = this.glassSettings.depth / 100;

    // Update panel styles
    this.chatPanel.style.background = panelTheme.panelBg;
    this.chatPanel.style.backdropFilter = `blur(${blur}px) brightness(${brightness}) saturate(${saturation})`;
    this.chatPanel.style.border = `1px solid ${panelTheme.panelBorder}`;
    this.chatPanel.style.boxShadow = `
      0 ${25 * depthMultiplier}px ${45 * depthMultiplier}px ${panelTheme.panelShadow},
      0 ${10 * depthMultiplier}px ${25 * depthMultiplier}px rgba(100, 160, 255, ${0.1 * opacityMultiplier}),
      0 ${5 * depthMultiplier}px ${15 * depthMultiplier}px rgba(0, 0, 0, ${0.05 * opacityMultiplier}),
      inset 0 1px 2px rgba(255, 255, 255, ${0.6 * opacityMultiplier}),
      inset 0 -1px 2px rgba(100, 160, 255, ${0.2 * opacityMultiplier})
    `;

    // Update input styles
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    if (chatInput) {
      chatInput.style.background = panelTheme.inputBg;
      chatInput.style.color = panelTheme.textColor;
      chatInput.style.backdropFilter = `blur(${blur * 0.8}px) saturate(${saturation})`;
    }

    // Update response content styles
    const responseContent = this.chatPanel.querySelector('.kana-response-content');
    if (responseContent) {
      responseContent.style.color = panelTheme.textColor;

      const headings = responseContent.querySelectorAll('h3');
      headings.forEach(h => h.style.color = panelTheme.textColor);

      const paragraphs = responseContent.querySelectorAll('p, li');
      paragraphs.forEach(p => p.style.color = panelTheme.textColor);
    }

    // Update voice toggle styles
    const voiceToggle = this.chatPanel.querySelector('.kana-voice-toggle');
    if (voiceToggle) {
      voiceToggle.style.color = panelTheme.textColor;
      voiceToggle.style.backdropFilter = `blur(${blur * 0.5}px) saturate(${saturation})`;

      // Apply active state styling if enabled
      if (this.voiceResponseEnabled) {
        voiceToggle.style.background = `linear-gradient(135deg, ${orbTheme.orbBg}88, ${orbTheme.orbBg}66)`;
        voiceToggle.style.borderColor = `${orbTheme.orbBg}99`;
      } else {
        voiceToggle.style.background = `rgba(255, 255, 255, ${0.15 * opacityMultiplier})`;
        voiceToggle.style.borderColor = `rgba(255, 255, 255, ${0.3 * opacityMultiplier})`;
      }
    }

    // Update chat title styles
    const chatTitle = this.chatPanel.querySelector('.kana-chat-title');
    if (chatTitle) {
      chatTitle.style.color = panelTheme.textColor;
    }

    // Update orb styles with enhanced glassmorphism
    this.orb.style.background = `
      radial-gradient(circle at 30% 30%, rgba(255, 255, 255, ${0.25 * opacityMultiplier}) 0%, rgba(255, 255, 255, ${0.1 * opacityMultiplier}) 40%, transparent 70%),
      radial-gradient(circle at 70% 70%, rgba(0, 0, 0, ${0.1 * opacityMultiplier}) 0%, transparent 50%),
      linear-gradient(135deg, rgba(255, 255, 255, ${0.1 * opacityMultiplier}) 0%, transparent 100%),
      ${orbTheme.orbBg}
    `;
    this.orb.style.boxShadow = `
      0 ${12 * depthMultiplier}px ${25 * depthMultiplier}px ${orbTheme.orbShadow},
      0 ${8 * depthMultiplier}px ${15 * depthMultiplier}px rgba(53, 122, 189, ${0.3 * opacityMultiplier}),
      0 ${4 * depthMultiplier}px ${8 * depthMultiplier}px rgba(46, 109, 164, ${0.25 * opacityMultiplier}),
      inset 0 1px 2px rgba(255, 255, 255, ${0.3 * opacityMultiplier}),
      inset 0 -1px 2px rgba(0, 0, 0, ${0.1 * opacityMultiplier})
    `;
    this.orb.style.backdropFilter = `blur(${2 * blur / 30}px) saturate(${saturation}) brightness(${brightness})`;
    this.orb.style.border = `1px solid rgba(255, 255, 255, ${0.4 * opacityMultiplier})`;

    // Update YouTube PiP Manager theme if available
    if (this.youtubePiP && typeof this.youtubePiP.updateTheme === 'function') {
      this.youtubePiP.updateTheme(this.glassSettings.panelColor, this.glassThemes, this.glassSettings);
    }

    // Update Study Pouch theme to match the orb color
    if (this.studyPouch && typeof this.studyPouch.updateTheme === 'function') {
      console.log('🎨 Syncing Study Pouch theme in applyGlassTheme to:', this.glassSettings.orbColor);
      this.studyPouch.updateTheme(this.glassSettings.orbColor);
    }
  }

  createOrb() {
    try {
      // Create main container
      this.orbContainer = this.createElement('div', {
        className: 'kana-orb-container',
        role: 'button',
        'aria-label': 'Kana AI Learning Assistant',
        tabindex: '0'
      });

      // Create the orb with icon, voice indicator, and lock icon
      this.orb = this.createElement('div', { className: 'kana-orb' });
      const orbIcon = this.createElement('div', {
        className: 'kana-orb-icon',
        innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
          <path d="M12 2a3 3 0 0 0-3 3 3 3 0 0 0-3 3v1a3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3V8a3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/>
          <path d="M12 12a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
          <path d="M9 18h6"/><path d="M10 22h4"/>
        </svg>`
      });

      // Create Study Pouch toggle button
      this.studyPouchButton = this.createElement('div', {
        className: 'kana-study-pouch-toggle',
        title: 'Open Study Pouch',
        innerHTML: '🎒'
      });
      console.log('Study Pouch button created:', this.studyPouchButton);

      this.orb.append(orbIcon,
        this.createElement('div', { className: 'kana-voice-indicator' }),
        this.createElement('div', { className: 'kana-lock-icon', innerHTML: '🔒' }),
        this.studyPouchButton
      );
      console.log('Study Pouch button appended to orb');
      this.orbContainer.appendChild(this.orb);

      // Create chat panel components
      this.chatPanel = this.createElement('div', { className: 'kana-chat-panel' });

      // Create chat header with voice toggle
      const chatHeader = this.createElement('div', { className: 'kana-chat-header' });
      const chatTitle = this.createElement('div', {
        className: 'kana-chat-title',
        textContent: 'Kana AI Assistant'
      });

      // Create voice toggle button (for voice conversation)
      this.voiceToggleButton = this.createElement('button', {
        className: 'kana-voice-toggle',
        'aria-label': 'Start voice conversation',
        title: 'Start voice conversation with Kana',
        innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>`
      });

      // Create reading toggle button (for text-to-speech)
      this.readingToggleButton = this.createElement('button', {
        className: 'kana-reading-toggle',
        'aria-label': 'Read response aloud',
        title: 'Read response aloud',
        innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
          <polygon points="11 5,6 9,2 9,2 15,6 15,11 19,11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>`
      });

      chatHeader.append(chatTitle, this.readingToggleButton, this.voiceToggleButton);
      this.chatPanel.appendChild(chatHeader);

      const chatResponseContent = this.createElement('div', {
        className: 'kana-response-content'
      }, { display: 'none' });
      this.chatPanel.appendChild(chatResponseContent);

      const chatInput = this.createElement('textarea', {
        className: 'kana-chat-input',
        placeholder: 'Ask Kana about what you\'re learning...',
        rows: 2
      });

      const inputContainer = this.createElement('div', { className: 'kana-input-container' });
      const sendButton = this.createElement('button', {
        className: 'kana-send-button',
        'aria-label': 'Send message',
        innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/>
        </svg>`
      });

      inputContainer.append(chatInput, sendButton);
      this.chatPanel.appendChild(inputContainer);

      // Add elements to page and set position
      document.body.append(this.orbContainer, this.chatPanel);
      console.log('Orb container added to DOM:', this.orbContainer);
      console.log('Orb container styles:', window.getComputedStyle(this.orbContainer));
      this.setPosition();
      console.log('Orb position set:', this.position);

      // Apply theme after elements are created
      if (this.dataLoaded) {
        this.applyGlassTheme();
      }
    } catch (error) {
      this.log('Error creating orb', 'error');
    }
  }

  setupEventListeners() {
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    const sendButton = this.chatPanel.querySelector('.kana-send-button');

    // Orb events
    this.addEvents(this.orb, {
      click: (e) => {
        // Don't trigger if clicking on Study Pouch button
        if (e.target.classList.contains('kana-study-pouch-toggle')) {
          console.log('Click on Study Pouch button, ignoring orb click');
          return;
        }
        !this.isDragging && this.toggleChat();
      },
      dblclick: (e) => { e.preventDefault(); this.toggleLock(); },
      mousedown: this.startDrag.bind(this),
      touchstart: this.startDrag.bind(this)
    });

    // Study Pouch button event
    console.log('Setting up Study Pouch button event listener...');
    console.log('Study Pouch button element:', this.studyPouchButton);

    if (this.studyPouchButton) {
      console.log('Adding click event listener to Study Pouch button');
      this.studyPouchButton.addEventListener('click', (e) => {
        console.log('Study Pouch button clicked!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Event propagation stopped');

        if (this.studyPouch) {
          console.log('Study Pouch manager found, toggling...');
          this.studyPouch.toggle();
        } else {
          console.error('Study Pouch manager not initialized!');
        }
      });

      // Also add mousedown to catch the event earlier
      this.studyPouchButton.addEventListener('mousedown', (e) => {
        console.log('Study Pouch button mousedown!');
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      });

      console.log('Study Pouch button event listener added successfully');
    } else {
      console.error('Study Pouch button not found!');
    }

    // Document drag events
    this.addEvents(document, {
      mousemove: this.drag.bind(this),
      mouseup: this.stopDrag.bind(this),
      touchmove: this.drag.bind(this),
      touchend: this.stopDrag.bind(this)
    });

    // Chat input events
    this.addEvents(chatInput, {
      keydown: (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          this.sendChatMessage();
        }
        if (e.key === ' ') e.stopPropagation(); // Prevent space from closing panel
      },
      keyup: (e) => e.stopPropagation()
    });

    sendButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sendChatMessage();
    });

    // Voice conversation button event (starts voice conversation mode)
    if (this.voiceToggleButton) {
      this.voiceToggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.startVoiceConversationMode();
      });
    }

    // Reading toggle button event (reads current response aloud)
    if (this.readingToggleButton) {
      this.readingToggleButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggleResponseReading();
      });
    }

    // Panel click handling
    this.addEvents(this.chatPanel, {
      click: (e) => e.stopPropagation()
    });

    // Click outside to close panels
    document.addEventListener('click', (e) => {
      if (!this.orbContainer.contains(e.target) && !this.chatPanel.contains(e.target)) {
        this.hidePanels();
      }
    });

    // Keyboard accessibility and global shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hidePanels();
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !this.chatPanel.contains(e.target)) {
        this.hidePanels();
      }
    });

    // Window events
    this.addEvents(window, {
      resize: () => this.chatPanel?.classList.contains('visible') && this.positionPanel(this.chatPanel),
      scroll: () => this.chatPanel?.classList.contains('visible') && this.positionPanel(this.chatPanel)
    });
  }

  setupSpeechRecognition() {
    console.log('🎙️ Setting up speech recognition...');

    // Check microphone permissions first
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' }).then((result) => {
        console.log('🎙️ Microphone permission status:', result.state);
        if (result.state === 'denied') {
          console.warn('🎙️ Microphone permission is denied');
        }
      });
    }

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();

      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      console.log('🎙️ Wake phrases configured:', this.wakePhrases);

      this.recognition.onresult = this.handleSpeechResult.bind(this);

      // Add interim results logging for debugging
      this.recognition.addEventListener('result', (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;

          if (result.isFinal) {
            console.log('🎙️ Final transcript:', transcript);
          } else {
            console.log('🎙️ Interim transcript:', transcript);
          }
        }
      });
      this.recognition.onstart = () => {
        console.log('🎙️ Speech recognition started (onstart event)');
      };
      this.recognition.onend = () => {
        console.log('🎙️ Speech recognition ended (onend event)');
        if (this.isListening) {
          setTimeout(() => {
            if (this.isListening) {
              try {
                console.log('🎙️ Restarting speech recognition...');
                this.recognition.start();
              } catch (error) {
                console.warn('🎙️ Failed to restart recognition:', error);
              }
            }
          }, 1000);
        }
      };

      this.recognition.onerror = (event) => {
        // Only log non-routine errors to reduce console noise
        switch (event.error) {
          case 'aborted':
            // Don't log aborted errors as they're normal during restarts
            break;
          case 'no-speech':
          case 'audio-capture':
            // Don't log these common errors
            break;
          case 'not-allowed':
            console.warn('🎙️ Microphone access denied. Please enable microphone permissions.');
            this.stopListening();
            // Show user-friendly error
            this.showChatPanel();
            const responseContent = this.chatPanel.querySelector('.kana-response-content');
            responseContent.style.display = 'block';
            responseContent.innerHTML = `
              <h3>🎙️ Microphone Access Required</h3>
              <p>Please allow microphone access for voice commands to work.</p>
              <p>Look for the microphone icon in your browser's address bar and click "Allow".</p>
            `;
            break;
          case 'network':
            console.warn('🎙️ Network error in speech recognition, retrying...');
            this.stopListening();
            setTimeout(() => this.startListening(), 3000);
            break;
          default:
            console.error('Speech recognition error:', event.error);
            this.stopListening();
            setTimeout(() => this.startListening(), 5000);
        }
      };

      this.startListening();
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      console.log('🎙️ Starting speech recognition...');
      this.isListening = true;
      try {
        this.recognition.start();
        this.updateOrbState('listening');
        console.log('🎙️ Speech recognition started successfully');
      } catch (error) {
        console.error('🎙️ Failed to start speech recognition:', error);
        this.isListening = false;
      }
    } else {
      console.log('🎙️ Speech recognition not available or already listening');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.isListening = false;
      this.recognition.stop();
      this.updateOrbState('idle');
    }
  }

  handleSpeechResult(event) {
    const results = event.results;
    const lastResult = results[results.length - 1];

    if (lastResult.isFinal) {
      const transcript = lastResult[0].transcript.toLowerCase().trim();
      console.log('🎙️ Speech recognized:', transcript);

      // Check for wake phrase
      const hasWakePhrase = this.wakePhrases.some(phrase =>
        transcript.includes(phrase)
      );

      console.log('🎙️ Wake phrase detected:', hasWakePhrase);

      if (hasWakePhrase) {
        // Visual feedback - pulse the orb
        this.orb.classList.add('wake-triggered');
        setTimeout(() => {
          this.orb.classList.remove('wake-triggered');
        }, 1000);

        // Extract the question after wake phrase
        let question = transcript;
        this.wakePhrases.forEach(phrase => {
          question = question.replace(phrase, '').trim();
        });

        if (question.length > 0) {
          this.playAudioFeedback('wake');

          if (!this.chatPanel.classList.contains('visible')) {
            this.showChatPanel();
          }

          this.processVoiceCommand(question);
        } else {
          this.playAudioFeedback('wake-short');
          this.showChatPanel();

          // Show welcome message
          const responseContent = this.chatPanel.querySelector('.kana-response-content');
          responseContent.style.display = 'block';
          responseContent.innerHTML = `
            <h3>Hello! How can I help with your learning?</h3>
            <p>You can ask me to:</p>
            <ul>
              <li>Explain a concept on screen</li>
              <li>Provide a hint for a question</li>
              <li>Find learning resources</li>
            </ul>
          `;
        }
      }
    }
  }

  playAudioFeedback(type) {
    try {
      // Simple audio feedback using AudioContext API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create oscillator for the sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure based on feedback type
      switch (type) {
        case 'wake':
          // Gentle rising tone
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.2);
          gain
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;

        case 'wake-short':
          // Short acknowledgment
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.1);
          break;

        case 'thinking':
          // Low subtle sound
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.2);
          break;

        case 'response':
          // Completion sound
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.3);
          break;
      }
    } catch (error) {
      console.warn('Audio feedback failed:', error);
    }
  }

  setupEnhancedVoice() {
    try {
      // Make kanaAssistant globally available for voice enhancement
      window.kanaAI = this;

      // Initialize enhanced voice recognition if available
      if (window.KanaVoiceRecognition) {
        console.log('🎤 Initializing Enhanced Voice Recognition with Push-to-Talk...');

        // Create enhanced voice recognition instance with push-to-talk mode
        this.enhancedVoice = new window.KanaVoiceRecognition();
        this.enhancedVoice.setPushToTalkMode(true);

        // Set up callbacks for voice recognition
        this.enhancedVoice.onFinalTranscript = (transcript, confidence) => {
          console.log('🎤 Voice transcript received:', transcript);

          // Apply transcript corrections for technical terms
          const correctedTranscript = this.correctTechnicalTerms(transcript);
          if (correctedTranscript !== transcript) {
            console.log('🎤 Transcript corrected:', transcript, '->', correctedTranscript);
          }

          this.handleVoiceCommand(correctedTranscript);
        };

        this.enhancedVoice.onError = (error) => {
          console.error('🎤 Voice recognition error:', error);
          this.updateOrbState('idle');
        };

        this.enhancedVoice.onStatusChange = (status) => {
          console.log('🎤 Voice status changed:', status);
          if (status === 'listening') {
            this.updateOrbState('listening');
          } else if (status === 'stopped') {
            this.updateOrbState('idle');
          }
        };

        // Set up push-to-talk hotkey (Ctrl + Space)
        this.setupPushToTalkHotkey();

        console.log('✅ Push-to-Talk Voice Recognition initialized (Ctrl + Space)');
      } else {
        console.log('📢 Enhanced Voice Recognition not available, using basic speech recognition');
      }

      // Initialize voice integration if available
      if (window.KanaVoiceIntegration) {
        console.log('🔗 Initializing Voice Integration...');
        this.voiceIntegration = new window.KanaVoiceIntegration();
      }

    } catch (error) {
      console.error('Error setting up enhanced voice:', error);
      // Don't fallback to continuous listening
      console.log('🎤 Voice recognition disabled. Use Ctrl + Space when ready.');
    }
  }

  setupPushToTalkHotkey() {
    this.isRecording = false;

    document.addEventListener('keydown', (event) => {
      // Check if Ctrl + Space is pressed
      if (event.ctrlKey && event.code === 'Space' && !this.isRecording) {
        event.preventDefault();
        this.startVoiceRecording();
      }
    });

    document.addEventListener('keyup', (event) => {
      // Check if Ctrl or Space is released
      if ((event.ctrlKey === false || event.code === 'Space') && this.isRecording) {
        event.preventDefault();
        this.stopVoiceRecording();
      }
    });

    console.log('🎤 Push-to-Talk hotkey setup complete (Ctrl + Space)');

    // Show initial instruction
    setTimeout(() => {
      this.showVoiceInstructions();
    }, 2000);
  }

  showVoiceInstructions() {
    // Create instruction panel
    const instructions = document.createElement('div');
    instructions.id = 'kana-voice-instructions';
    instructions.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #2196F3, #42A5F5);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      box-shadow: 0 4px 20px rgba(33, 150, 243, 0.4);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      text-align: center;
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
      transition: all 0.3s ease;
      cursor: pointer;
    `;
    instructions.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: 600;">🎤 Voice Control Ready!</div>
      <div>Hold <strong>Ctrl + Space</strong> to record voice commands</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">Click to dismiss</div>
    `;

    instructions.addEventListener('click', () => {
      instructions.style.opacity = '0';
      instructions.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => {
        if (instructions.parentNode) {
          instructions.parentNode.removeChild(instructions);
        }
      }, 300);
    });

    document.body.appendChild(instructions);

    // Animate in
    setTimeout(() => {
      instructions.style.opacity = '1';
      instructions.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);

    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (instructions.parentNode) {
        instructions.style.opacity = '0';
        instructions.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          if (instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
          }
        }, 300);
      }
    }, 8000);
  }

  async startVoiceRecording() {
    if (this.isRecording || !this.enhancedVoice) return;

    try {
      this.isRecording = true;
      console.log('🎤 Starting voice recording...');
      await this.enhancedVoice.startListening();

      // Visual feedback
      this.showPushToTalkIndicator();
    } catch (error) {
      console.error('❌ Failed to start voice recording:', error);
      this.isRecording = false;
      this.updateOrbState('idle');
    }
  }

  async stopVoiceRecording() {
    if (!this.isRecording || !this.enhancedVoice) return;

    try {
      this.isRecording = false;
      console.log('🎤 Stopping voice recording...');
      await this.enhancedVoice.stopListening();

      // Hide visual feedback
      this.hidePushToTalkIndicator();
    } catch (error) {
      console.error('❌ Failed to stop voice recording:', error);
    }
  }

  showPushToTalkIndicator() {
    // Create or show recording indicator
    let indicator = document.getElementById('kana-recording-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'kana-recording-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ff4444, #ff6666);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 600;
        z-index: 2147483647;
        box-shadow: 0 4px 20px rgba(255, 68, 68, 0.4);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        gap: 8px;
        animation: pulse 1.5s ease-in-out infinite alternate;
      `;
      indicator.innerHTML = `
        <div style="width: 8px; height: 8px; background: white; border-radius: 50%; animation: blink 1s ease-in-out infinite;"></div>
        Recording... (Release Ctrl+Space to stop)
      `;

      // Add CSS animations
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 4px 20px rgba(255, 68, 68, 0.4); }
          100% { box-shadow: 0 4px 30px rgba(255, 68, 68, 0.8); }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(indicator);
    }
    indicator.style.display = 'flex';
  }

  hidePushToTalkIndicator() {
    const indicator = document.getElementById('kana-recording-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Correct common voice transcription errors for technical terms
  correctTechnicalTerms(transcript) {
    if (!transcript) return transcript;

    let corrected = transcript;

    // Technical term corrections
    const corrections = {
      // VR/3D Terms
      '3d wife': '3DOF',
      '3 d wife': '3DOF',
      'three d wife': '3DOF',
      'three dof': '3DOF',
      '6 dof': '6DOF',
      'six dof': '6DOF',
      'vr headset': 'VR headset',
      'ar headset': 'AR headset',

      // Unity Terms
      'game object': 'GameObject',
      'game objects': 'GameObjects',
      'ray casting': 'raycasting',
      'ray cast': 'raycast',
      'prefab': 'Prefab',
      'prefabs': 'Prefabs',
      'mono behavior': 'MonoBehaviour',
      'mono behaviour': 'MonoBehaviour',
      'transform component': 'Transform component',
      'rigid body': 'Rigidbody',

      // Programming Terms
      'object oriented': 'object-oriented',
      'oop': 'OOP',
      'api': 'API',
      'json': 'JSON',
      'xml': 'XML',
      'html': 'HTML',
      'css': 'CSS',
      'javascript': 'JavaScript',
      'c sharp': 'C#',
      'c plus plus': 'C++',

      // Common Misheard Words
      'can i have': 'can you help with',
      'i need you to explain': 'explain',
      'what do you mean by': 'what is',
      'i don\'t understand': 'explain'
    };

    // Apply corrections (case-insensitive)
    for (const [wrong, right] of Object.entries(corrections)) {
      const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      corrected = corrected.replace(regex, right);
    }

    // Clean up extra spaces and punctuation
    corrected = corrected.replace(/\s+/g, ' ').trim();

    return corrected;
  }

  // Correct common speech recognition errors for technical terms (all domains)
  correctTechnicalTerms(transcript) {
    let corrected = transcript;

    // Comprehensive technical term corrections across all domains
    const corrections = {
      // Programming Languages
      'c sharp': 'C#',
      'see sharp': 'C#',
      'java script': 'JavaScript',
      'java scripts': 'JavaScript',
      'type script': 'TypeScript',
      'python three': 'Python 3',
      'c plus plus': 'C++',
      'see plus plus': 'C++',

      // Web Development
      'html five': 'HTML5',
      'css three': 'CSS3',
      'react jay s': 'React.js',
      'angular jay s': 'Angular.js',
      'node jay s': 'Node.js',
      'rest api': 'REST API',
      'api': 'API',
      'json': 'JSON',
      'ajax': 'AJAX',

      // Data Science & AI
      'machine learning': 'machine learning',
      'neural network': 'neural network',
      'artificial intelligence': 'AI',
      'ten sir flow': 'TensorFlow',
      'tensor flow': 'TensorFlow',
      'pi torch': 'PyTorch',
      'pandas': 'pandas',
      'num pie': 'NumPy',
      'numpy': 'NumPy',
      'scikit learn': 'scikit-learn',
      'sk learn': 'scikit-learn',

      // Game Development & VR/AR
      '3d wife': '3DOF',
      '3d wifes': '3DOF',
      '3 d wife': '3DOF',
      'three d wife': '3DOF',
      'three degrees of wife': '3DOF',
      '6d off': '6DOF',
      '6 d off': '6DOF',
      'six degrees of freedom': '6DOF',
      'game object': 'GameObject',
      'game objects': 'GameObjects',
      'ray casting': 'raycasting',
      'collision detector': 'collision detection',
      'on collision enter': 'OnCollisionEnter',
      'on trigger enter': 'OnTriggerEnter',
      'rigid body': 'rigidbody',
      'virtual reality': 'VR',
      'augmented reality': 'AR',
      'mixed reality': 'MR',

      // Mobile Development
      'i o s': 'iOS',
      'android studio': 'Android Studio',
      'react native': 'React Native',
      'flutter': 'Flutter',
      'xamarin': 'Xamarin',

      // Database
      'my sequel': 'MySQL',
      'post gray sequel': 'PostgreSQL',
      'sequel server': 'SQL Server',
      'no sequel': 'NoSQL',
      'mongo db': 'MongoDB',

      // DevOps & Cloud
      'docker': 'Docker',
      'cuber net is': 'Kubernetes',
      'kubernetes': 'Kubernetes',
      'amazon web services': 'AWS',
      'a w s': 'AWS',
      'microsoft azure': 'Azure',
      'google cloud platform': 'GCP',
      'g c p': 'GCP',
      'continuous integration': 'CI',
      'continuous deployment': 'CD',
      'ci cd': 'CI/CD',

      // General Programming
      'object oriented': 'object-oriented',
      'get hub': 'GitHub',
      'git hub': 'GitHub',
      'stack overflow': 'Stack Overflow',
      'visual studio code': 'VS Code',
      'vs code': 'VS Code',
      'integrated development environment': 'IDE',
      'application programming interface': 'API',

      // Cybersecurity
      'encryption': 'encryption',
      'two factor authentication': '2FA',
      'secure socket layer': 'SSL',
      'transport layer security': 'TLS',
      'virtual private network': 'VPN',
      'fire wall': 'firewall',

      // UI/UX Design
      'user interface': 'UI',
      'user experience': 'UX',
      'wire frame': 'wireframe',
      'wire frames': 'wireframes',
      'prototype': 'prototype',
      'figma': 'Figma',
      'adobe x d': 'Adobe XD',
      'oop': 'OOP',

      // VR terms
      'vr controller': 'VR controller',
      'virtual reality': 'VR',
      'headset': 'VR headset',
      'oculus': 'Oculus',
      'meta quest': 'Meta Quest'
    };

    // Apply corrections (case-insensitive)
    for (const [wrong, right] of Object.entries(corrections)) {
      const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      corrected = corrected.replace(regex, right);
    }

    // Fix common punctuation issues
    corrected = corrected.replace(/\s+/g, ' ').trim();

    return corrected;
  }

  // Handle voice commands from speech recognition
  handleVoiceCommand(transcript) {
    console.log('🎤 Processing voice command:', transcript);

    // Clean up the transcript
    const command = transcript.toLowerCase().trim();

    if (!command) {
      console.log('🎤 Empty command, ignoring');
      return;
    }

    // Show that we received the voice input
    this.showVoiceResponseIndicator(`You said: "${transcript}"`);

    // Check for Study Pouch commands first
    if (this.handleStudyPouchCommand(transcript)) {
      return; // Command was handled, don't send to AI
    }

    // Check for panel control commands
    const lowerMessage = transcript.toLowerCase().trim();

    if (lowerMessage.includes('close') || lowerMessage.includes('hide')) {
      this.hidePanels();
      this.showResponse({
        type: 'learning_guidance',
        title: '👋 Panel Closed',
        content: '<div class="kana-ai-response"><p>Chat panel closed. Use Ctrl+Space to ask me anything!</p></div>'
      });
      return;
    }

    if (lowerMessage.includes('open chat') || lowerMessage.includes('show chat')) {
      this.showChatPanel();
      return;
    }

    // Automatically process the voice command with AI
    console.log('🎤 Auto-processing voice command with AI:', transcript);

    // Ensure the chat panel is visible to show the response
    if (!this.chatPanel.classList.contains('visible')) {
      this.showChatPanel();
    }

    // Process the message with AI immediately
    this.analyzeScreenContent(transcript);
  }

  showVoiceResponseIndicator(message) {
    // Create or update voice response indicator
    let indicator = document.getElementById('kana-voice-response');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'kana-voice-response';
      indicator.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #66BB6A);
        color: white;
        padding: 12px 20px;
        border-radius: 25px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 14px;
        font-weight: 500;
        z-index: 2147483647;
        box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        max-width: 300px;
        word-wrap: break-word;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(indicator);
    }

    indicator.textContent = message;
    indicator.style.opacity = '1';
    indicator.style.transform = 'translateX(0)';

    // Hide after 3 seconds
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateX(100%)';
    }, 3000);
  }

  processVoiceCommand(command = '') {
    this.updateOrbState('thinking');
    this.playAudioFeedback('thinking');

    // Display in input area what was heard
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    chatInput.value = command;

    // Analyze screen content with this command
    this.analyzeScreenContent(command);
  }

  // Voice Response Methods
  setupVoiceResponse() {
    console.log('🔊 Setting up voice response system...');
    try {
      if ('speechSynthesis' in window) {
        this.speechSynthesis = window.speechSynthesis;
        console.log('🔊 Voice response system initialized');
        this.log('🔊 Voice response system initialized');

        // Get available voices when they're loaded
        if (this.speechSynthesis.getVoices().length === 0) {
          console.log('🔊 Waiting for voices to load...');
          this.speechSynthesis.addEventListener('voiceschanged', () => {
            this.selectBestFemaleVoice();
            console.log(`🔊 Found ${this.speechSynthesis.getVoices().length} available voices`);
            this.log(`🔊 Found ${this.speechSynthesis.getVoices().length} available voices`);
          });
        } else {
          console.log(`🔊 Found ${this.speechSynthesis.getVoices().length} voices immediately`);
          this.selectBestFemaleVoice();
        }
      } else {
        console.log('❌ Speech synthesis not supported in this browser');
        this.log('❌ Speech synthesis not supported in this browser', 'warn');
        this.voiceResponseEnabled = false;
      }
    } catch (error) {
      console.log(`❌ Failed to setup voice response: ${error.message}`);
      this.log(`❌ Failed to setup voice response: ${error.message}`, 'error');
      this.voiceResponseEnabled = false;
    }
  }

  selectBestFemaleVoice() {
    console.log('🔊 Selecting best female voice...');
    const voices = this.speechSynthesis.getVoices();
    console.log(`🔊 Available voices: ${voices.length}`, voices.map(v => v.name));

    // Priority order for female voices (more natural sounding first)
    const femaleVoiceNames = [
      'Google US English Female',
      'Microsoft Zira Desktop',
      'Microsoft Zira',
      'Samantha',
      'Karen',
      'Moira',
      'Tessa',
      'Veena',
      'Fiona',
      'female'
    ];

    // Find the best available female voice
    for (const voiceName of femaleVoiceNames) {
      const voice = voices.find(v =>
        v.name.toLowerCase().includes(voiceName.toLowerCase()) ||
        v.name.toLowerCase().includes('female')
      );
      if (voice) {
        this.selectedVoice = voice;
        console.log(`🔊 Selected voice: ${voice.name} (${voice.lang})`);
        this.log(`🔊 Selected voice: ${voice.name} (${voice.lang})`);
        return;
      }
    }

    // Fallback: find any female voice
    const femaleVoice = voices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('woman') ||
      v.name.toLowerCase().includes('zira') ||
      v.name.toLowerCase().includes('samantha')
    );

    if (femaleVoice) {
      this.selectedVoice = femaleVoice;
      console.log(`🔊 Selected fallback female voice: ${femaleVoice.name}`);
      this.log(`🔊 Selected fallback female voice: ${femaleVoice.name}`);
    } else {
      // Last resort: use default voice
      this.selectedVoice = voices[0] || null;
      console.log(`🔊 Using default voice: ${this.selectedVoice?.name || 'system default'}`);
      this.log(`🔊 Using default voice: ${this.selectedVoice?.name || 'system default'}`);
    }

    // Force voice selection if none found
    if (!this.selectedVoice && voices.length > 0) {
      this.selectedVoice = voices[0];
      console.log(`🔊 Forced to use first available voice: ${this.selectedVoice.name}`);
    }
  }

  async loadVoiceResponseSettings() {
    try {
      const settings = await chrome.storage.local.get(['kanaVoiceResponseEnabled']);
      this.voiceResponseEnabled = settings.kanaVoiceResponseEnabled !== undefined ?
        settings.kanaVoiceResponseEnabled : true; // Default to enabled

      this.updateVoiceToggleUI();
      this.log(`🔊 Voice response ${this.voiceResponseEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.log('Error loading voice response settings:', error);
      this.voiceResponseEnabled = true; // Default to enabled
      this.updateVoiceToggleUI();
    }
  }

  // Start voice conversation mode (switches to voice UI)
  startVoiceConversationMode() {
    console.log('🎤 Starting voice conversation mode');
    this.voiceResponseEnabled = true;
    this.switchToVoiceUI();
  }

  // Toggle reading the current response aloud
  toggleResponseReading() {
    console.log('🔊 Toggling response reading');

    // If currently speaking, stop it
    if (this.isSpeaking) {
      this.stopSpeaking();
      this.updateReadingButton(false);
      return;
    }

    // Get the current response text
    const responseContent = document.querySelector('.kana-response-content');
    if (!responseContent || !responseContent.textContent.trim()) {
      this.log('No response to read', 'warn');
      return;
    }

    // Start reading the response
    this.readResponseAloud(responseContent.textContent.trim());
  }

  // Read response text aloud
  async readResponseAloud(text) {
    console.log('🔊 Reading response aloud:', text.substring(0, 50) + '...');

    if (!this.speechSynthesis || !text) {
      console.log('❌ Speech synthesis not available or no text');
      return;
    }

    try {
      // Stop any current speech
      this.stopSpeaking();

      // Update button to show speaking state
      this.updateReadingButton(true);

      // Clean the text for better speech synthesis
      const cleanedText = this.prepareTextForSpeech(text);

      // Create speech utterance
      this.currentSpeech = new SpeechSynthesisUtterance(cleanedText);
      this.currentSpeechType = 'reading';

      // Configure voice settings
      this.configureSpeechVoice(this.currentSpeech);

      // Set up event handlers
      this.currentSpeech.onstart = () => {
        this.isSpeaking = true;
        this.updateOrbState('speaking');
        this.log('🔊 Started reading response');
      };

      this.currentSpeech.onend = () => {
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.log('🔊 Finished reading response');
        this.updateReadingButton(false);
      };

      this.currentSpeech.onerror = (error) => {
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.log(`❌ Speech error: ${error.error}`, 'error');
        this.updateReadingButton(false);
      };

      // Speak the response
      this.speechSynthesis.speak(this.currentSpeech);

    } catch (error) {
      console.log(`❌ Reading error: ${error.message}`);
      this.updateReadingButton(false);
    }
  }

  // Update reading button appearance
  updateReadingButton(isSpeaking) {
    if (!this.readingToggleButton) return;

    if (isSpeaking) {
      this.readingToggleButton.classList.add('speaking');
      this.readingToggleButton.title = 'Stop reading';
      this.readingToggleButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
        <rect x="6" y="4" width="4" height="16"/>
        <rect x="14" y="4" width="4" height="16"/>
      </svg>`;
    } else {
      this.readingToggleButton.classList.remove('speaking');
      this.readingToggleButton.title = 'Read response aloud';
      this.readingToggleButton.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
        <polygon points="11 5,6 9,2 9,2 15,6 15,11 19,11 5"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    }
  }

  async toggleVoiceResponse() {
    console.log('🔊 Voice toggle clicked! Current state:', this.voiceResponseEnabled);
    this.voiceResponseEnabled = !this.voiceResponseEnabled;
    console.log('🔊 New voice state:', this.voiceResponseEnabled);

    // Stop any current speech
    if (this.isSpeaking) {
      this.stopSpeaking();
    }

    // Save setting
    try {
      await chrome.storage.local.set({ kanaVoiceResponseEnabled: this.voiceResponseEnabled });
      this.log(`🔊 Voice response ${this.voiceResponseEnabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.log('Error saving voice response setting:', error);
    }

    this.updateVoiceToggleUI();

    // Show feedback
    this.showVoiceToggleFeedback();

    // Switch to voice UI mode if enabled
    if (this.voiceResponseEnabled) {
      console.log('🎤 About to switch to Voice UI...');
      setTimeout(() => {
        console.log('🎤 Executing switchToVoiceUI...');
        this.switchToVoiceUI();
      }, 500); // Small delay for smooth transition
    } else {
      console.log('💬 Switching to Text UI...');
      this.switchToTextUI();
    }
  }

  updateVoiceToggleUI() {
    if (!this.voiceToggleButton) return;

    if (this.voiceResponseEnabled) {
      this.voiceToggleButton.classList.add('active');
      this.voiceToggleButton.title = 'Voice responses enabled - Click to disable';
    } else {
      this.voiceToggleButton.classList.remove('active');
      this.voiceToggleButton.title = 'Voice responses disabled - Click to enable';
    }

    // Apply current theme to the toggle button
    this.applyGlassTheme();
  }

  switchToVoiceUI() {
    console.log('🎤 switchToVoiceUI called');
    this.isInVoiceMode = true;
    console.log('🎤 Set isInVoiceMode to true');

    // IMPORTANT: Ensure voice response is enabled when entering voice mode
    if (!this.voiceResponseEnabled) {
      console.log('🔊 Auto-enabling voice response for voice mode');
      this.voiceResponseEnabled = true;
      this.updateVoiceToggleUI();
      // Save the setting
      chrome.storage.local.set({ kanaVoiceResponseEnabled: true }).catch(e =>
        console.log('Failed to save voice setting:', e)
      );
    }

    // Hide the chat panel
    this.hidePanels();
    console.log('🎤 Chat panels hidden');

    // Create and show voice UI
    this.createVoiceUI();
    console.log('🎤 Voice UI created');

    this.startVoiceConversation();
    console.log('🎤 Voice conversation started');

    this.log('🎤 Switched to Voice UI mode');
  }

  switchToTextUI() {
    console.log('💬 switchToTextUI called');
    this.isInVoiceMode = false;
    this.stopVoiceConversation();
    this.hideVoiceUI();
    this.log('💬 Switched to Text UI mode');
  }

  createVoiceUI() {
    console.log('🎤 createVoiceUI called');

    // Remove existing voice UI if any
    if (this.voiceUI) {
      console.log('🎤 Removing existing voice UI');
      this.voiceUI.remove();
    }

    this.voiceUI = this.createElement('div', {
      className: 'kana-voice-ui'
    });

    // Initialize UI state - start tiny by default
    this.voiceUISize = 'tiny'; // tiny, small, medium, large
    this.voiceUIPosition = { x: window.innerWidth - 70, y: 50 };
    this.isExpanded = false;
    this.isDraggingVoiceUI = false;

    this.voiceUI.innerHTML = `
      <div class="kana-voice-compact">
        <div class="kana-voice-avatar-tiny">
          <div class="kana-voice-status-dot"></div>
        </div>
        <div class="kana-voice-rings-compact">
          <div class="kana-voice-ring-compact"></div>
          <div class="kana-voice-ring-compact"></div>
        </div>
        <div class="kana-voice-audio-bars-compact">
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
          <div class="audio-bar"></div>
        </div>
      </div>
      
      <div class="kana-voice-expanded" style="display: none;">
        <div class="kana-voice-header-minimal">
          <button class="kana-voice-minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
            </svg>
          </button>
          <button class="kana-voice-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="kana-voice-content">
          <div class="kana-voice-avatar-expanded">
            <div class="kana-voice-avatar-inner">
            </div>
            <div class="kana-voice-rings-expanded">
              <div class="kana-voice-ring"></div>
              <div class="kana-voice-ring"></div>
            </div>
          </div>
          
          <div class="kana-voice-status">
            <div class="kana-voice-status-text">Ready to help</div>
          </div>
          
          <div class="kana-voice-audio-visualizer">
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
            <div class="audio-bar"></div>
          </div>
          
          <div class="kana-voice-controls-expanded">
            <button class="kana-voice-conversation-toggle" title="Toggle Voice Conversation">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
            <button class="kana-voice-conversation-pause" title="Pause Speech" style="display: none;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="kana-voice-conversation-mini"></div>
      </div>
    `;

    // Apply theme and positioning
    this.applyVoiceUITheme();
    this.applyVoiceUIPosition();

    document.body.appendChild(this.voiceUI);
    this.setupVoiceUIEvents();

    // Initialize button states
    this.updateVoiceControlButtons();

    // Show with animation
    requestAnimationFrame(() => {
      this.voiceUI.classList.add('visible');
    });

    console.log('🎤 Tiny Voice UI created');

    // Animate in
    console.log('🎤 Animating voice UI in');
    setTimeout(() => {
      this.voiceUI.classList.add('visible');
      console.log('🎤 Voice UI should now be visible');

      // Simple greeting when UI becomes visible
      setTimeout(() => {
        console.log('🔊 Simple greeting when voice UI becomes visible');
        if (this.speechSynthesis && this.selectedVoice) {
          const greeting = "How can I help you?";
          this.addToVoiceConversation('kana', greeting);
          this.speakConversationalResponse(greeting);
        } else {
          console.log('❌ Voice test failed - speech synthesis or voice not available');
          console.log('Speech synthesis:', !!this.speechSynthesis);
          console.log('Selected voice:', this.selectedVoice);
        }
      }, 300);
    }, 10);
  }

  applyVoiceUISize() {
    if (!this.voiceUI) return;

    const sizes = {
      small: {
        width: '96px',
        height: '120px',
        minWidth: '96px',
        minHeight: '120px'
      },
      medium: {
        width: '400px',
        height: '300px',
        minWidth: '300px',
        minHeight: '200px'
      },
      large: {
        width: '600px',
        height: '500px',
        minWidth: '400px',
        minHeight: '300px'
      }
    };

    const size = sizes[this.voiceUISize];
    Object.assign(this.voiceUI.style, {
      width: size.width,
      height: size.height,
      minWidth: size.minWidth,
      minHeight: size.minHeight,
      maxWidth: '80vw',
      maxHeight: '80vh'
    });

    // Adjust content visibility based on size
    const transcript = this.voiceUI.querySelector('.kana-voice-transcript');
    const controls = this.voiceUI.querySelector('.kana-voice-controls');
    const status = this.voiceUI.querySelector('.kana-voice-status');

    if (this.voiceUISize === 'small') {
      transcript.style.display = 'none';
      controls.style.display = 'none';
      status.style.display = 'none';
      this.voiceUI.classList.add('compact');
    } else {
      transcript.style.display = 'block';
      controls.style.display = 'flex';
      status.style.display = 'block';
      this.voiceUI.classList.remove('compact');
    }
  }

  applyVoiceUIPosition() {
    if (!this.voiceUI) return;

    // Ensure position is within viewport bounds
    const maxX = window.innerWidth - parseInt(this.voiceUI.style.width) || window.innerWidth - 400;
    const maxY = window.innerHeight - parseInt(this.voiceUI.style.height) || window.innerHeight - 300;

    this.voiceUIPosition.x = Math.max(0, Math.min(this.voiceUIPosition.x, maxX));
    this.voiceUIPosition.y = Math.max(0, Math.min(this.voiceUIPosition.y, maxY));

    Object.assign(this.voiceUI.style, {
      position: 'fixed',
      left: `${this.voiceUIPosition.x}px`,
      top: `${this.voiceUIPosition.y}px`,
      zIndex: '2147483647'
    });
  }

  cycleVoiceUISize() {
    const sizes = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(this.voiceUISize);
    this.voiceUISize = sizes[(currentIndex + 1) % sizes.length];

    console.log('🔄 Cycling voice UI size to:', this.voiceUISize);
    this.applyVoiceUISize();
    this.applyVoiceUIPosition(); // Reposition to ensure it stays in bounds
  }

  setupVoiceUIEvents() {
    if (!this.voiceUI) return;

    // Compact mode - click to expand
    const compactAvatar = this.voiceUI.querySelector('.kana-voice-avatar-tiny');
    if (compactAvatar) {
      compactAvatar.addEventListener('click', () => {
        this.toggleVoiceUIExpansion();
      });
      compactAvatar.style.cursor = 'pointer';
    }

    // Expanded mode controls
    const minimizeBtn = this.voiceUI.querySelector('.kana-voice-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        this.toggleVoiceUIExpansion();
      });
    }

    // Close button
    const closeBtn = this.voiceUI.querySelector('.kana-voice-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.voiceResponseEnabled = false;
        this.switchToTextUI();
        this.updateVoiceToggleUI();
      });
    }

    // Voice controls
    const testBtn = this.voiceUI.querySelector('.kana-voice-test');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.speakConversationalResponse("How can I help you?");
      });
    }

    // Conversational voice toggle
    const conversationToggleBtn = this.voiceUI.querySelector('.kana-voice-conversation-toggle');
    if (conversationToggleBtn) {
      conversationToggleBtn.addEventListener('click', () => {
        this.toggleConversationalVoice();
      });
    }

    // Conversation pause button
    const conversationPauseBtn = this.voiceUI.querySelector('.kana-voice-conversation-pause');
    if (conversationPauseBtn) {
      conversationPauseBtn.addEventListener('click', () => {
        this.pauseConversationalSpeech();
      });
    }

    // Pause voice button (legacy - keeping for compatibility)
    const pauseBtn = this.voiceUI.querySelector('.kana-voice-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.pauseCurrentSpeech();
      });
    }

    // Drag functionality for the entire UI
    this.voiceUI.addEventListener('mousedown', this.startDragVoiceUI.bind(this));
    document.addEventListener('mousemove', this.handleVoiceUIMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleVoiceUIMouseUp.bind(this));
  }

  applyVoiceUITheme() {
    if (!this.voiceUI) return;

    const panelTheme = this.glassThemes[this.glassSettings.panelColor];
    const orbTheme = this.glassThemes[this.glassSettings.orbColor];

    if (panelTheme && orbTheme) {
      const opacityMultiplier = this.glassSettings.opacity / 100;
      const blur = this.glassSettings.blur;
      const saturation = this.glassSettings.saturation / 100;
      const brightness = this.glassSettings.brightness / 100;

      this.voiceUI.style.setProperty('--theme-bg', panelTheme.panelBg);
      this.voiceUI.style.setProperty('--theme-border', panelTheme.panelBorder);
      this.voiceUI.style.setProperty('--theme-text', panelTheme.textColor);
      this.voiceUI.style.setProperty('--orb-bg', orbTheme.orbBg);
      this.voiceUI.style.setProperty('--orb-shadow', orbTheme.orbShadow);
      this.voiceUI.style.setProperty('--blur', `${blur}px`);
      this.voiceUI.style.setProperty('--brightness', brightness);
      this.voiceUI.style.setProperty('--saturation', saturation);
    }
  }

  applyVoiceUIPosition() {
    if (!this.voiceUI) return;

    // Ensure position is within viewport bounds
    const maxX = window.innerWidth - (this.isExpanded ? 280 : 60);
    const maxY = window.innerHeight - (this.isExpanded ? 300 : 60);

    this.voiceUIPosition.x = Math.max(10, Math.min(this.voiceUIPosition.x, maxX));
    this.voiceUIPosition.y = Math.max(10, Math.min(this.voiceUIPosition.y, maxY));

    this.voiceUI.style.left = `${this.voiceUIPosition.x}px`;
    this.voiceUI.style.top = `${this.voiceUIPosition.y}px`;
  }

  toggleVoiceUIExpansion() {
    if (!this.voiceUI) return;

    this.isExpanded = !this.isExpanded;

    const compact = this.voiceUI.querySelector('.kana-voice-compact');
    const expanded = this.voiceUI.querySelector('.kana-voice-expanded');

    if (this.isExpanded) {
      compact.style.display = 'none';
      expanded.style.display = 'flex';
      this.voiceUI.classList.add('expanded');
    } else {
      compact.style.display = 'flex';
      expanded.style.display = 'none';
      this.voiceUI.classList.remove('expanded');
    }

    this.applyVoiceUIPosition(); // Reposition to stay in bounds
  }

  startDragVoiceUI(e) {
    // Only start drag if clicking on draggable areas
    if (e.target.closest('.kana-voice-close') ||
      e.target.closest('.kana-voice-minimize') ||
      e.target.closest('.kana-voice-test') ||
      e.target.closest('.kana-voice-mute')) {
      return; // Don't drag when clicking buttons
    }

    e.preventDefault();
    this.isDraggingVoiceUI = true;
    this.dragStartX = e.clientX - this.voiceUIPosition.x;
    this.dragStartY = e.clientY - this.voiceUIPosition.y;
    this.voiceUI.classList.add('dragging');
    this.voiceUI.style.cursor = 'grabbing';
  }

  handleVoiceUIMouseMove(e) {
    if (this.isDraggingVoiceUI) {
      this.voiceUIPosition.x = e.clientX - this.dragStartX;
      this.voiceUIPosition.y = e.clientY - this.dragStartY;
      this.applyVoiceUIPosition();
    }
  }

  handleVoiceUIMouseUp(e) {
    if (this.isDraggingVoiceUI) {
      this.isDraggingVoiceUI = false;
      this.voiceUI.classList.remove('dragging');
      this.voiceUI.style.cursor = '';
    }
  }

  hideVoiceUI() {
    if (this.voiceUI) {
      this.voiceUI.classList.remove('visible');
      setTimeout(() => {
        if (this.voiceUI && this.voiceUI.parentNode) {
          this.voiceUI.parentNode.removeChild(this.voiceUI);
        }
        this.voiceUI = null;
      }, 300);
    }
  }

  // Ensure voice context memory is always initialized
  ensureVoiceContextMemory() {
    if (!this.voiceContextMemory || typeof this.voiceContextMemory !== 'object') {
      this.voiceContextMemory = {
        pageTitle: document.title,
        pageUrl: window.location.href,
        previousTopics: [],
        screenReferences: [],
        lastMentionedContent: null,
        conversationStarted: false,
        firstInteraction: true
      };
    }
  }

  startVoiceConversation() {
    if (this.voiceConversationActive) return;

    this.voiceConversationActive = true;

    // Reset voice restart tracking when manually starting conversation
    this.voiceRestartAttempts = 0;
    if (this.voiceRestartTimeout) {
      clearTimeout(this.voiceRestartTimeout);
      this.voiceRestartTimeout = null;
    }

    // Ensure voice synthesis is available
    this.ensureVoiceSynthesisReady();

    this.voiceConversationHistory = []; // Track conversation history
    this.ensureVoiceContextMemory();

    this.setupContinuousListening();
    this.updateVoiceStatus('Listening... Say something to Kana');

    // Give a simple, natural greeting
    setTimeout(() => {
      const greeting = "How can I help you?";
      this.addToVoiceConversation('kana', greeting);
      this.speakConversationalResponse(greeting);
      this.ensureVoiceContextMemory();
      this.voiceContextMemory.conversationStarted = true;
    }, 500);

    this.log('🎤 Started continuous voice conversation');
  }

  ensureVoiceSynthesisReady() {
    console.log('🔊 Ensuring voice synthesis is ready...');

    // Initialize speech synthesis if not already done
    if (!this.speechSynthesis && 'speechSynthesis' in window) {
      console.log('🔊 Initializing speech synthesis...');
      this.speechSynthesis = window.speechSynthesis;
    }

    // Check if we have voices available
    if (this.speechSynthesis) {
      const voices = this.speechSynthesis.getVoices();
      console.log(`🔊 Available voices: ${voices.length}`);

      // If no voices yet, wait for them
      if (voices.length === 0) {
        console.log('🔊 No voices available yet, waiting for voiceschanged event...');
        this.speechSynthesis.addEventListener('voiceschanged', () => {
          const newVoices = this.speechSynthesis.getVoices();
          console.log(`🔊 Voices loaded: ${newVoices.length}`);
          this.selectBestFemaleVoice();
        }, { once: true });
      } else {
        console.log('🔊 Voices already available');
        this.selectBestFemaleVoice();
      }
    } else {
      console.log('❌ Speech synthesis not supported in this browser');
    }

    console.log('🔊 Voice synthesis check complete:', {
      synthAvailable: !!this.speechSynthesis,
      responseEnabled: this.voiceResponseEnabled,
      selectedVoice: this.selectedVoice?.name || 'none'
    });
  }

  // Debug method to test voice synthesis
  testVoiceSynthesis() {
    console.log('🔊 Testing voice synthesis...');

    if (!this.speechSynthesis) {
      console.log('❌ No speech synthesis available');
      return false;
    }

    if (!this.voiceResponseEnabled) {
      console.log('❌ Voice response disabled');
      return false;
    }

    try {
      const testUtterance = new SpeechSynthesisUtterance('Voice synthesis test');
      testUtterance.volume = 0.5;
      testUtterance.rate = 1.0;
      testUtterance.pitch = 1.0;

      if (this.selectedVoice) {
        testUtterance.voice = this.selectedVoice;
      }

      testUtterance.onstart = () => console.log('🔊 Test speech started');
      testUtterance.onend = () => console.log('🔊 Test speech ended');
      testUtterance.onerror = (e) => console.log('❌ Test speech error:', e);

      this.speechSynthesis.speak(testUtterance);
      console.log('🔊 Test speech synthesis triggered');
      return true;
    } catch (error) {
      console.log('❌ Voice synthesis test failed:', error);
      return false;
    }
  }

  stopVoiceConversation() {
    this.voiceConversationActive = false;

    // Clean up restart tracking
    this.voiceRestartAttempts = 0;
    if (this.voiceRestartTimeout) {
      clearTimeout(this.voiceRestartTimeout);
      this.voiceRestartTimeout = null;
    }

    this.stopContinuousListening();
    this.updateVoiceStatus('Conversation ended');
    this.log('🎤 Stopped voice conversation');
  }

  setupContinuousListening() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      this.updateVoiceStatus('Voice recognition not supported');
      return;
    }

    // Don't start if voice recognition is paused (during speech)
    if (this.voiceRecognitionPaused) {
      console.log('🔇 Skipping voice recognition setup - currently paused');
      return;
    }

    // Don't start if already speaking
    if (this.isSpeaking) {
      console.log('🔇 Skipping voice recognition setup - currently speaking');
      return;
    }

    // Don't start if conversation is not active
    if (!this.voiceConversationActive) {
      console.log('🔇 Skipping voice recognition setup - conversation not active');
      return;
    }

    // Stop existing recognition first and wait
    if (this.voiceRecognition) {
      try {
        console.log('🛑 Stopping existing voice recognition');
        this.voiceRecognition.abort(); // Use abort to force stop
        this.voiceRecognition = null;
      } catch (e) {
        console.log('Previous voice recognition already stopped');
      }

      // Wait a bit before creating new instance
      setTimeout(() => {
        this.createVoiceRecognition();
      }, 300); // Increased delay to prevent conflicts
      return;
    }

    this.createVoiceRecognition();
  }

  createVoiceRecognition() {
    // Double check we're still active before creating
    if (!this.voiceConversationActive || this.voiceRecognitionPaused || this.isSpeaking) {
      console.log('🔇 Aborting voice recognition creation - state changed');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.voiceRecognition = new SpeechRecognition();

    this.voiceRecognition.continuous = true;
    this.voiceRecognition.interimResults = true;
    this.voiceRecognition.lang = 'en-US';
    this.voiceRecognition.maxAlternatives = 1; // Faster processing

    this.voiceRecognition.onstart = () => {
      console.log('🎤 Voice recognition started');
      this.updateVoiceStatus('Listening...');
      this.animateVoiceVisualizer(true);
    };

    this.voiceRecognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // ALWAYS check for interrupt commands first, even during speech
      const fullTranscript = (finalTranscript || interimTranscript).toLowerCase();
      if (fullTranscript.includes('stop') || fullTranscript.includes('pause') ||
        fullTranscript.includes('quiet') || fullTranscript.includes('silence')) {
        console.log('🛑 Stop/Pause command detected - interrupting speech');
        this.handleInterruptCommand();
        return;
      }

      // Skip other processing if we're paused (during speech) but not for stop commands
      if (this.voiceRecognitionPaused || this.isSpeaking) {
        console.log('🔇 Ignoring voice input - recognition paused or speaking');
        return;
      }

      if (finalTranscript && finalTranscript.trim().length > 0) {
        console.log('🎤 Processing final transcript:', finalTranscript);
        this.processVoiceInput(finalTranscript);
      } else if (interimTranscript && !this.isSpeaking) {
        this.updateVoiceStatus(`Hearing: "${interimTranscript}"`);
      }
    };

    this.voiceRecognition.onerror = (event) => {
      console.log('❌ Voice recognition error:', event.error);
      this.updateVoiceStatus(`Voice error: ${event.error}`);

      // Clear the current recognition reference
      this.voiceRecognition = null;

      // Only restart on certain errors and within attempt limits
      if (this.voiceConversationActive && !this.voiceRecognitionPaused && !this.isSpeaking) {
        // Check if we've exceeded maximum restart attempts
        if (this.voiceRestartAttempts >= this.maxVoiceRestartAttempts) {
          console.log(`❌ Maximum voice restart attempts reached (${this.maxVoiceRestartAttempts}), stopping auto-restart`);
          this.updateVoiceStatus('Voice recognition stopped - too many errors');
          return;
        }

        // Add error-specific handling
        const restartableErrors = ['no-speech', 'audio-capture', 'network'];
        if (restartableErrors.includes(event.error)) {
          this.voiceRestartAttempts++;

          // Clear any existing restart timeout
          if (this.voiceRestartTimeout) {
            clearTimeout(this.voiceRestartTimeout);
            this.voiceRestartTimeout = null;
          }

          // Implement exponential backoff for restart attempts
          const restartDelay = Math.min(5000, this.voiceRestartAttempts * 1000 + 1000);

          this.voiceRestartTimeout = setTimeout(() => {
            this.voiceRestartTimeout = null;
            if (this.voiceConversationActive && !this.voiceRecognitionPaused && !this.isSpeaking) {
              console.log(`🔄 Restarting voice recognition after ${event.error} (attempt ${this.voiceRestartAttempts}/${this.maxVoiceRestartAttempts})`);
              this.setupContinuousListening();
            }
          }, restartDelay);
        } else {
          console.log(`❌ Not restarting due to error: ${event.error}`);
        }
      }
    };

    this.voiceRecognition.onend = () => {
      console.log('🎤 Voice recognition ended');

      // Clear the recognition reference
      this.voiceRecognition = null;

      // Reset restart attempts on successful end (normal completion)
      this.voiceRestartAttempts = 0;

      // Clear any pending restart timeout
      if (this.voiceRestartTimeout) {
        clearTimeout(this.voiceRestartTimeout);
        this.voiceRestartTimeout = null;
      }

      // Only restart if we're still active and not paused
      if (this.voiceConversationActive && !this.voiceRecognitionPaused && !this.isSpeaking) {
        // Check restart attempts limit before normal restart
        if (this.voiceRestartAttempts >= this.maxVoiceRestartAttempts) {
          console.log(`❌ Maximum voice restart attempts reached, not restarting automatically`);
          this.updateVoiceStatus('Voice recognition paused - say "Hey Kana" to restart');
          return;
        }

        // Use longer delay for normal restart to prevent rapid cycling
        this.voiceRestartTimeout = setTimeout(() => {
          this.voiceRestartTimeout = null;
          if (this.voiceConversationActive && !this.voiceRecognitionPaused && !this.isSpeaking) {
            console.log('🔄 Restarting voice recognition for continuous listening');
            this.setupContinuousListening();
          }
        }, 1500); // Increased delay for stability
      }
    };

    try {
      console.log('🎤 Starting voice recognition');
      this.voiceRecognition.start();
    } catch (error) {
      this.updateVoiceStatus('Failed to start voice recognition');
      console.error('Voice recognition error:', error);
      this.voiceRecognition = null;
    }
  }

  stopContinuousListening() {
    console.log('🛑 Stopping continuous listening');
    if (this.voiceRecognition) {
      try {
        this.voiceRecognition.abort(); // Use abort for immediate stop
      } catch (e) {
        console.log('Voice recognition already stopped');
      }
      this.voiceRecognition = null;
    }
    this.voiceRecognitionPaused = false;
    this.animateVoiceVisualizer(false);
  }

  // Pause voice recognition to prevent feedback during speech
  pauseVoiceRecognition() {
    console.log('🔇 Pausing voice recognition');
    if (this.voiceRecognition && this.voiceConversationActive) {
      try {
        this.voiceRecognitionPaused = true;
        this.voiceRecognition.abort(); // Use abort for immediate stop
        this.voiceRecognition = null; // Clear reference
        console.log('🔇 Voice recognition paused successfully');
      } catch (error) {
        console.log('❌ Error pausing voice recognition:', error);
      }
    } else {
      this.voiceRecognitionPaused = true;
    }
  }

  handleInterruptCommand() {
    console.log('🛑 Handling interrupt command');

    // Immediately stop any current speech
    if (this.isSpeaking && this.speechSynthesis) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentSpeech = null;
      this.updateOrbState('idle');
    }

    // Resume voice recognition immediately
    this.voiceRecognitionPaused = false;
    this.updateVoiceStatus('Listening...');
    this.animateVoiceVisualizer(true, 'listening');

    // Acknowledge the interruption naturally
    setTimeout(() => {
      const acknowledgment = "Yes?";
      this.addToVoiceConversation('kana', acknowledgment);
      this.speakConversationalResponse(acknowledgment);
    }, 300);
  }

  // Resume voice recognition after speech ends
  resumeVoiceRecognition() {
    console.log('🎤 Resuming voice recognition');
    if (this.voiceConversationActive && this.voiceRecognitionPaused) {
      try {
        this.voiceRecognitionPaused = false;

        // Check if recognition is already running
        if (this.voiceRecognition && this.voiceRecognition.state === 'inactive') {
          // Only restart if it's actually stopped
          console.log('🎤 Voice recognition was inactive, restarting...');
          this.setupContinuousListening();
        } else if (!this.voiceRecognition) {
          // Create new recognition if none exists
          console.log('🎤 No voice recognition exists, creating new one...');
          this.setupContinuousListening();
        } else {
          // Recognition is already active, just update status
          console.log('🎤 Voice recognition already active, just updating status');
          this.updateVoiceStatus('Listening...');
          this.animateVoiceVisualizer(true, 'listening');
        }
        console.log('🎤 Voice recognition resumed successfully');
      } catch (error) {
        console.log('❌ Error resuming voice recognition:', error);
        // If restart fails, setup fresh recognition after delay
        setTimeout(() => {
          if (this.voiceConversationActive && !this.isSpeaking && !this.voiceRecognitionPaused) {
            console.log('🎤 Delayed restart of voice recognition');
            this.setupContinuousListening();
          }
        }, 1000);
      }
    }
  }

  // Toggle conversational voice (listening/speaking in voice mode)
  toggleConversationalVoice() {
    console.log('🎤 Toggling conversational voice');
    if (this.voiceConversationActive) {
      this.stopVoiceConversation();
      this.updateVoiceStatus('Conversational voice disabled');
    } else {
      this.startVoiceConversation();
      this.updateVoiceStatus('Conversational voice enabled');
    }
    this.updateVoiceControlButtons();
  }

  // Toggle response reading voice (text-to-speech for responses)
  toggleResponseReadingVoice() {
    console.log('🔊 Toggling response reading voice');
    this.voiceResponseEnabled = !this.voiceResponseEnabled;

    // Save setting
    chrome.storage.local.set({ kanaVoiceResponseEnabled: this.voiceResponseEnabled }).catch(e =>
      console.log('Failed to save voice setting:', e)
    );

    // Stop any current speech if disabling
    if (!this.voiceResponseEnabled && this.isSpeaking) {
      this.stopSpeaking();
    }

    this.updateVoiceControlButtons();
    this.log(`🔊 Response reading voice ${this.voiceResponseEnabled ? 'enabled' : 'disabled'}`);
  }

  // Pause current speech
  pauseCurrentSpeech() {
    console.log('⏸️ Pausing current speech');
    if (this.isSpeaking && this.speechSynthesis) {
      this.speechSynthesis.pause();
      this.updateVoiceStatus('Speech paused');
      this.showPauseButton(false);
      this.showResumeButton(true);
    }
  }

  // Resume paused speech
  resumeCurrentSpeech() {
    console.log('▶️ Resuming paused speech');
    if (this.speechSynthesis && this.speechSynthesis.paused) {
      this.speechSynthesis.resume();
      this.updateVoiceStatus('Kana is speaking...');
      this.showPauseButton(true);
      this.showResumeButton(false);
    }
  }

  // Update voice control button states
  updateVoiceControlButtons() {
    if (!this.voiceUI) return;

    const conversationBtn = this.voiceUI.querySelector('.kana-voice-conversation-toggle');

    if (conversationBtn) {
      conversationBtn.classList.toggle('active', this.voiceConversationActive);
      conversationBtn.title = this.voiceConversationActive ?
        'Stop Voice Conversation' : 'Start Voice Conversation';
    }
  }

  // Show/hide pause button
  showPauseButton(show) {
    if (!this.voiceUI) return;
    const pauseBtn = this.voiceUI.querySelector('.kana-voice-pause');
    if (pauseBtn) {
      pauseBtn.style.display = show ? 'block' : 'none';
    }
  }

  // Show/hide resume button (we'll convert pause button to resume when needed)
  showResumeButton(show) {
    if (!this.voiceUI) return;
    const pauseBtn = this.voiceUI.querySelector('.kana-voice-pause');
    if (pauseBtn && show) {
      pauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      `;
      pauseBtn.title = 'Resume Speech';
      pauseBtn.onclick = () => this.resumeCurrentSpeech();
    } else if (pauseBtn) {
      pauseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="6" y="4" width="4" height="16"/>
          <rect x="14" y="4" width="4" height="16"/>
        </svg>
      `;
      pauseBtn.title = 'Pause Speech';
      pauseBtn.onclick = () => this.pauseCurrentSpeech();
    }
  }

  // Separate speech control methods for different speech types
  pauseConversationalSpeech() {
    console.log('⏸️ Pausing conversational speech');
    if (this.isSpeaking && this.speechSynthesis && this.currentSpeechType === 'conversational') {
      this.speechSynthesis.pause();
      this.updateVoiceStatus('Conversation paused');
      this.showConversationPauseButton(false);
      this.showConversationResumeButton(true);
    }
  }

  pauseReadingSpeech() {
    console.log('⏸️ Pausing reading speech');
    if (this.isSpeaking && this.speechSynthesis && this.currentSpeechType === 'reading') {
      this.speechSynthesis.pause();
      this.updateVoiceStatus('Reading paused');
      this.showReadingPauseButton(false);
      this.showReadingPlayButton(true);
    }
  }

  resumeReadingSpeech() {
    console.log('▶️ Resuming reading speech');
    if (this.speechSynthesis && this.speechSynthesis.paused && this.currentSpeechType === 'reading') {
      this.speechSynthesis.resume();
      this.updateVoiceStatus('Reading text...');
      this.showReadingPauseButton(true);
      this.showReadingPlayButton(false);
    }
  }

  // Show/hide conversation pause button
  showConversationPauseButton(show) {
    if (!this.voiceUI) return;
    const pauseBtn = this.voiceUI.querySelector('.kana-voice-conversation-pause');
    if (pauseBtn) {
      pauseBtn.style.display = show ? 'flex' : 'none';
    }
  }

  // Show/hide conversation resume button
  showConversationResumeButton(show) {
    // For conversation, we just hide the pause button when paused
    this.showConversationPauseButton(!show);
  }

  // Show/hide reading pause button
  showReadingPauseButton(show) {
    if (!this.voiceUI) return;
    const pauseBtn = this.voiceUI.querySelector('.kana-voice-reading-pause');
    if (pauseBtn) {
      pauseBtn.style.display = show ? 'flex' : 'none';
    }
  }

  // Show/hide reading play button
  showReadingPlayButton(show) {
    if (!this.voiceUI) return;
    const playBtn = this.voiceUI.querySelector('.kana-voice-reading-play');
    if (playBtn) {
      playBtn.style.display = show ? 'flex' : 'none';
    }
  }

  processVoiceInput(input) {
    this.ensureVoiceContextMemory();
    console.log('🎤 processVoiceInput called with:', input);
    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      console.log('❌ Invalid or empty input, returning');
      return;
    }

    const cleanInput = input.trim();
    console.log('🎤 Processing voice input:', cleanInput);
    this.updateVoiceStatus('Analyzing screen...');
    this.addToVoiceConversation('user', cleanInput);

    // Use the EXACT same screen analysis as text system with voice-specific processing
    console.log('🎤 Using EXACT same screen analysis as text system...');
    this.isVoiceProcessing = true; // Flag to indicate this is voice processing
    this.analyzeScreenContent(cleanInput);
  }

  async analyzeScreenContentForVoice(userQuestion) {
    try {
      console.log('🎤🔍 Starting EXACT same screen analysis as text system...');
      this.updateVoiceStatus('Reading your screen...');

      // Use the EXACT SAME methods as text system
      const pageContent = this.extractPageContent();
      console.log('🎤🔍 Page content extracted (same as text):', pageContent);

      // Use the EXACT SAME prioritization as text system
      const prioritizedContent = this.prioritizeVisibleContent(pageContent);
      console.log('🎤🔍 Content prioritized (same as text)');

      // Use the EXACT SAME relevance finding as text system
      const relevantVisibleContent = this.findMostRelevantVisibleContent(userQuestion, prioritizedContent);
      console.log('🎤🔍 Found relevant content (same as text)');

      // Use the EXACT SAME platform identification as text system
      const platform = this.identifyLMSPlatform();
      console.log('🎤🔍 Platform identified (same as text):', platform);

      // Use the EXACT SAME question parsing as text system
      const questionContext = this.parseUserQuestionWithViewport(userQuestion, prioritizedContent, relevantVisibleContent);
      console.log('🎤🔍 Question context parsed (same as text)');

      this.updateVoiceStatus('Understanding your question...');

      // Create the EXACT SAME context as text system
      const context = {
        platform: platform,
        url: window.location.href,
        userQuestion: userQuestion,
        questionContext: questionContext,
        pageContent: pageContent,
        prioritizedContent: prioritizedContent,
        relevantVisibleContent: relevantVisibleContent
      };

      // Process with AI for voice response (same context, voice-specific processing)
      this.processWithAIForVoice(context);

    } catch (error) {
      console.error('🎤❌ Error in voice screen analysis:', error);
      this.generateVoiceFallbackResponse("I'm having trouble analyzing your screen right now. Could you be more specific about what you need help with?", {});
    }
  }

  async generateScreenAwareResponse(userInput) {
    console.log('🖥️ generateScreenAwareResponse called with:', userInput);
    try {
      this.updateVoiceStatus('Analyzing your screen...');

      // First, extract current screen content
      const screenContent = await this.analyzeCurrentScreen();
      console.log('🖥️ Screen content analyzed');

      // Analyze user intent for response type
      const responseIntent = this.analyzeUserIntent(userInput);
      console.log('🤖 Detected intent:', responseIntent);

      // Build conversation context from recent history
      const recentContext = this.buildConversationContext();

      // Create screen-aware contextual prompt
      let screenAwarePrompt;

      if (responseIntent.type === 'explanation') {
        screenAwarePrompt = this.buildScreenAwareExplanationPrompt(userInput, screenContent, recentContext, responseIntent);
      } else if (responseIntent.type === 'resources') {
        screenAwarePrompt = this.buildScreenAwareResourcePrompt(userInput, screenContent, recentContext, responseIntent);
      } else {
        screenAwarePrompt = this.buildScreenAwareQuickPrompt(userInput, screenContent, recentContext);
      }

      console.log('🤖 Updating voice status to thinking...');
      this.updateVoiceStatus('Thinking about your screen...');

      console.log('🤖 Calling Gemini API with screen context...');
      const response = await this.callConversationalAPI(screenAwarePrompt);
      console.log('🤖 Gemini API response:', response ? response.substring(0, 100) + '...' : 'null');

      if (response) {
        console.log('🤖 Adding response to conversation and speaking...');
        this.addToVoiceConversation('kana', response);

        // Handle resource requests - use text format for displaying resources
        if (responseIntent.type === 'resources') {
          // Speak the normal voice response first
          this.speakConversationalResponse(response);

          // Also show resources in text format by calling analyzeScreenContent
          setTimeout(async () => {
            console.log('🔍 Showing resources in text format...');
            this.updateVoiceStatus('Finding resources...');

            // Extract topic for resource search
            const searchTopic = this.extractTopicForResources(userInput);

            // Use analyzeScreenContent to get text format resources
            await this.analyzeScreenContent(`find resources about ${searchTopic}`);

            // Voice confirmation that resources are available
            setTimeout(() => {
              const confirmMsg = "Check the chat panel for the resources I found!";
              this.addToVoiceConversation('kana', confirmMsg);
              this.speakConversationalResponse(confirmMsg);
            }, 1000);
          }, 1500);
        } else {
          this.speakConversationalResponse(response, responseIntent.type === 'explanation');
        }
      } else {
        console.log('🤖 No response from API, using contextual fallback...');
        const fallback = this.getScreenAwareFallback(userInput, screenContent);
        this.addToVoiceConversation('kana', fallback);
        this.speakConversationalResponse(fallback);
      }
    } catch (error) {
      console.log('❌ Error in generateScreenAwareResponse:', error);
      const errorResponse = "I'm having trouble analyzing your screen right now. Could you be more specific about what you need help with?";
      this.addToVoiceConversation('kana', errorResponse);
      this.speakConversationalResponse(errorResponse);
    }
  }

  async analyzeCurrentScreen() {
    console.log('🖥️ Starting screen analysis...');
    try {
      // Extract comprehensive page content
      const pageContent = this.extractPageContent();

      // Get additional context from forms, interactive elements
      const interactiveElements = this.extractInteractiveElements();

      // Get current URL and page type
      const pageContext = {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
        isLMS: this.isLMSPage(),
        pageType: this.detectPageType()
      };

      const screenAnalysis = {
        content: pageContent,
        interactive: interactiveElements,
        context: pageContext,
        timestamp: new Date().toISOString()
      };

      console.log('🖥️ Screen analysis complete:', {
        contentLength: pageContent.text?.length || 0,
        elementsFound: interactiveElements.length,
        pageType: pageContext.pageType
      });

      return screenAnalysis;
    } catch (error) {
      console.error('🖥️ Error analyzing screen:', error);
      return {
        content: { text: 'Unable to analyze screen content', headings: [], links: [] },
        interactive: [],
        context: { url: window.location.href, title: document.title },
        error: error.message
      };
    }
  }

  extractPageContent() {
    const content = {
      text: '',
      headings: [],
      links: [],
      images: [],
      tables: []
    };

    try {
      // Get main text content, excluding navigation and ads
      const textElements = document.querySelectorAll('p, div, span, article, section, main, .content, .post, .article');
      const textContent = [];

      textElements.forEach(el => {
        if (el.offsetParent !== null && el.textContent.trim().length > 20) {
          const text = el.textContent.trim();
          if (!textContent.includes(text) && text.length > 20) {
            textContent.push(text);
          }
        }
      });

      content.text = textContent.join(' ').substring(0, 3000); // Limit text length

      // Extract headings
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(heading => {
        if (heading.textContent.trim()) {
          content.headings.push(heading.textContent.trim());
        }
      });

      // Extract important links
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        if (link.textContent.trim() && link.href) {
          content.links.push({
            text: link.textContent.trim(),
            href: link.href
          });
        }
      });

      // Limit arrays to prevent overwhelming the AI
      content.headings = content.headings.slice(0, 10);
      content.links = content.links.slice(0, 10);

    } catch (error) {
      console.error('Error extracting page content:', error);
      content.text = 'Error extracting page content';
    }

    return content;
  }

  isLMSPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    // Check for common LMS platforms
    return url.includes('canvas') ||
      url.includes('blackboard') ||
      url.includes('moodle') ||
      url.includes('schoology') ||
      url.includes('brightspace') ||
      url.includes('desire2learn') ||
      title.includes('canvas') ||
      title.includes('blackboard') ||
      title.includes('moodle');
  }

  extractInteractiveElements() {
    const elements = [];

    // Find form inputs
    const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"], textarea, select');
    inputs.forEach(input => {
      const label = this.findInputLabel(input);
      elements.push({
        type: 'input',
        tag: input.tagName.toLowerCase(),
        inputType: input.type || 'text',
        label: label,
        placeholder: input.placeholder,
        value: input.value ? '[has value]' : '[empty]'
      });
    });

    // Find buttons
    const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"], [role="button"]');
    buttons.forEach(button => {
      elements.push({
        type: 'button',
        text: button.textContent?.trim() || button.value || '[no text]',
        disabled: button.disabled
      });
    });

    // Find navigation elements
    const navElements = document.querySelectorAll('nav a, .nav a, .navigation a, [role="navigation"] a');
    navElements.forEach(nav => {
      elements.push({
        type: 'navigation',
        text: nav.textContent?.trim(),
        href: nav.href
      });
    });

    return elements.slice(0, 20); // Limit to most relevant elements
  }

  findInputLabel(input) {
    // Try to find associated label
    if (input.labels && input.labels.length > 0) {
      return input.labels[0].textContent?.trim();
    }

    // Try aria-label
    if (input.getAttribute('aria-label')) {
      return input.getAttribute('aria-label');
    }

    // Try placeholder
    if (input.placeholder) {
      return input.placeholder;
    }

    // Try nearby text
    const parent = input.parentElement;
    if (parent) {
      const label = parent.querySelector('label');
      if (label) return label.textContent?.trim();
    }

    return '[unlabeled]';
  }

  detectPageType() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    if (url.includes('canvas') || url.includes('blackboard') || url.includes('moodle')) {
      return 'lms';
    }
    if (url.includes('github')) return 'github';
    if (url.includes('stackoverflow') || url.includes('stackexchange')) return 'programming';
    if (url.includes('youtube')) return 'video';
    if (url.includes('google.com/search')) return 'search';
    if (document.querySelector('form input[type="search"]')) return 'search';
    if (document.querySelector('article, .article, .post')) return 'article';
    if (document.querySelector('table, .table')) return 'data';

    return 'general';
  }

  buildScreenAwareQuickPrompt(userInput, screenContent, recentContext) {
    const context = screenContent.context;
    const content = screenContent.content;
    const interactive = screenContent.interactive;

    // Convert text array to string if needed
    const textContent = Array.isArray(content.text) ? content.text.join(' ') : (content.text || '');

    return `You are Kana, a helpful AI learning assistant. The user is currently viewing a ${context.pageType} page: "${context.title}".

CURRENT SCREEN CONTENT:
${textContent ? textContent.substring(0, 1500) : 'No text content found'}

KEY INTERACTIVE ELEMENTS:
${interactive.map(el => `- ${el.type}: ${el.text || el.label || 'unlabeled'}`).join('\n').substring(0, 500)}

USER QUESTION: "${userInput}"

CONTEXT: ${recentContext}

INSTRUCTIONS:
1. Analyze what the user is looking at on their screen
2. Provide direct, actionable guidance based on the screen content
3. Don't ask "what do you want to know" - instead guide them based on what you can see
4. Keep response under 150 words
5. Be conversational and helpful
6. Reference specific elements they can see on their screen

Respond as if you can see their screen and guide them naturally:`;
  }

  buildScreenAwareExplanationPrompt(userInput, screenContent, recentContext, responseIntent) {
    const context = screenContent.context;
    const content = screenContent.content;

    // Convert text array to string if needed
    const textContent = Array.isArray(content.text) ? content.text.join(' ') : (content.text || '');
    const headingsText = Array.isArray(content.headings) ? content.headings.join(', ') : '';

    return `You are Kana, a helpful AI learning assistant. The user is viewing: "${context.title}" and needs a detailed explanation.

CURRENT SCREEN ANALYSIS:
Page Type: ${context.pageType}
Content: ${textContent ? textContent.substring(0, 2000) : 'No content available'}
Key Elements: ${headingsText}

USER QUESTION: "${userInput}"
CONTEXT: ${recentContext}

INSTRUCTIONS:
1. Provide a comprehensive explanation based on what's visible on their screen
2. Break down complex concepts step by step
3. Reference specific content they can see
4. Guide them through the material systematically
5. Keep response under 300 words but be thorough
6. Use the screen content to provide concrete examples

Explain in detail, referencing their current screen:`;
  }

  buildScreenAwareResourcePrompt(userInput, screenContent, recentContext, responseIntent) {
    const context = screenContent.context;

    return `You are Kana, a helpful AI learning assistant. The user is on: "${context.title}" and needs resources.

CURRENT CONTEXT:
- Page: ${context.pageType}
- Domain: ${context.domain}
- User needs: ${userInput}

RECENT CONTEXT: ${recentContext}

INSTRUCTIONS:
1. Suggest resources that complement what they're currently viewing
2. Provide specific, actionable next steps
3. Reference their current screen context
4. Suggest 2-3 relevant resources or actions
5. Keep response under 200 words
6. Be direct and helpful

Suggest resources based on their current screen:`;
  }

  getScreenAwareFallback(userInput, screenContent) {
    const context = screenContent.context;
    return `I can see you're on ${context.title}. Based on your question "${userInput}", let me help guide you through what's on your screen. What specific part would you like me to explain?`;
  }

  async generateConversationalResponse(userInput) {
    console.log('🤖 generateConversationalResponse called with:', userInput);
    try {
      // Build conversation context from recent history
      const recentContext = this.buildConversationContext();

      // Analyze user intent for response type
      const responseIntent = this.analyzeUserIntent(userInput);
      console.log('🤖 Detected intent:', responseIntent);

      // Create contextual prompt based on intent
      let conversationalPrompt;

      if (responseIntent.type === 'explanation') {
        conversationalPrompt = this.buildExplanationPrompt(userInput, recentContext, responseIntent);
      } else if (responseIntent.type === 'resources') {
        conversationalPrompt = this.buildResourcePrompt(userInput, recentContext, responseIntent);
      } else {
        conversationalPrompt = this.buildQuickPrompt(userInput, recentContext);
      }

      console.log('🤖 Updating voice status to thinking...');
      this.updateVoiceStatus('Kana is thinking...');

      console.log('🤖 Calling Gemini API...');
      const response = await this.callConversationalAPI(conversationalPrompt);
      console.log('🤖 Gemini API response:', response ? response.substring(0, 100) + '...' : 'null');

      if (response) {
        console.log('🤖 Adding response to conversation and speaking...');
        this.addToVoiceConversation('kana', response);

        // Handle resource requests - use text format for displaying resources
        if (responseIntent.type === 'resources') {
          // Speak the normal voice response first
          this.speakConversationalResponse(response);

          // Also show resources in text format by calling analyzeScreenContent
          setTimeout(async () => {
            console.log('🔍 Showing resources in text format...');
            this.updateVoiceStatus('Finding resources...');

            // Extract topic for resource search
            const searchTopic = this.extractTopicForResources(userInput);

            // Use analyzeScreenContent to get text format resources
            await this.analyzeScreenContent(`find resources about ${searchTopic}`);

            // Voice confirmation that resources are available
            setTimeout(() => {
              const confirmMsg = "Check the chat panel for the resources I found!";
              this.addToVoiceConversation('kana', confirmMsg);
              this.speakConversationalResponse(confirmMsg);
            }, 1000);
          }, 1500);
        } else {
          this.speakConversationalResponse(response, responseIntent.type === 'explanation');
        }
      } else {
        console.log('🤖 No response from API, using contextual fallback...');
        const fallback = this.getContextualFallback(userInput);
        this.addToVoiceConversation('kana', fallback);
        this.speakConversationalResponse(fallback);
      }
    } catch (error) {
      console.log('❌ Error in generateConversationalResponse:', error);
      const errorResponse = "Sorry, could you repeat that?";
      this.addToVoiceConversation('kana', errorResponse);
      this.speakConversationalResponse(errorResponse);
    }
  }  // Simple API call for conversational responses
  async callConversationalAPI(prompt) {
    try {
      // Get API key from storage, fallback to default
      let GEMINI_API_KEY = "AIzaSyBkyfIR24sNjKIoPQAgHmgNONCu38CqvHQ";
      try {
        const result = await chrome.storage.local.get(['geminiApiKey']);
        if (result.geminiApiKey) {
          GEMINI_API_KEY = result.geminiApiKey;
        }
      } catch (error) {
        console.log('Using default API key for conversational response');
      }

      // Use the most reliable model for conversations
      const model = this.lastSuccessfulModel || "gemini-2.0-flash";
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      // Determine response length based on prompt content
      let maxTokens = 150; // Default for quick responses
      if (prompt.includes('detailed explanation') || prompt.includes('explain') || prompt.includes('thorough')) {
        maxTokens = 300; // Longer for explanations
      } else if (prompt.includes('resource')) {
        maxTokens = 100; // Shorter for resource responses
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.8, // Slightly less creative for more focused responses
            topK: 40,
            topP: 0.95,
            maxOutputTokens: maxTokens, // Dynamic based on response type
            candidateCount: 1
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Extract text from response
        if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0]) {
          return result.candidates[0].content.parts[0].text;
        }
      } else {
        console.log(`API call failed with status: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.log(`Conversational API error: ${error.message}`);
      return null;
    }
  }

  analyzeUserIntent(userInput) {
    const input = userInput.toLowerCase();

    // Check for explanation requests
    if (input.includes('explain') || input.includes('tell me more') || input.includes('how does') ||
      input.includes('why does') || input.includes('what is') || input.includes('what are') ||
      input.includes('break it down') || input.includes('in detail') || input.includes('elaborate')) {
      return {
        type: 'explanation',
        keywords: this.extractKeywords(userInput)
      };
    }

    // Check for resource requests
    if (input.includes('resource') || input.includes('video') || input.includes('article') ||
      input.includes('tutorial') || input.includes('more help') || input.includes('learn more') ||
      input.includes('show me') || input.includes('find') || input.includes('example')) {
      return {
        type: 'resources',
        keywords: this.extractKeywords(userInput)
      };
    }

    // Default to quick response
    return {
      type: 'quick',
      keywords: this.extractKeywords(userInput)
    };
  }

  extractKeywords(text) {
    // Simple keyword extraction for topic identification
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 5); // Top 5 keywords
  }

  buildQuickPrompt(userInput, recentContext) {
    return `You are Kana, a friendly AI learning assistant having a natural voice conversation with a student. 

Recent conversation:
${recentContext}

The student just said: "${userInput}"

Current page: ${document.title}

Respond naturally and conversationally:
- Keep it SHORT (1-2 sentences max for voice)
- Sound human and casual (use contractions, natural speech)
- Be helpful but don't lecture
- If they're asking about something specific on the page, reference it
- If it's a follow-up question, acknowledge the context
- If they seem confused, offer to clarify
- Use encouraging, supportive tone

Respond as if you're a helpful friend sitting next to them:`;
  }

  buildExplanationPrompt(userInput, recentContext, intent) {
    return `You are Kana, a friendly AI learning assistant having a natural voice conversation with a student who wants a detailed explanation.

Recent conversation:
${recentContext}

The student asked for an explanation: "${userInput}"

Current page: ${document.title}
Keywords to focus on: ${intent.keywords.join(', ')}

Provide a detailed explanation that:
- Is thorough but conversational (3-5 sentences for voice)
- Breaks down complex concepts into understandable parts
- Uses examples and analogies when helpful
- Maintains an encouraging, supportive tone
- Speaks naturally (use contractions, casual language)
- References the current page content when relevant

Remember, this is a voice conversation, so speak directly to them as if you're explaining to a friend:`;
  }

  buildResourcePrompt(userInput, recentContext, intent) {
    return `You are Kana, a friendly AI learning assistant. The student is asking for learning resources.

Recent conversation:
${recentContext}

The student asked: "${userInput}"

Current page: ${document.title}
Keywords to focus on: ${intent.keywords.join(', ')}

Respond conversationally by:
- Acknowledging their request for resources (1-2 sentences)
- Mentioning that you're finding relevant videos and articles
- Being encouraging about their learning journey
- Speaking naturally as if you're helping a friend

Keep it brief since you'll be providing actual resources after this response:`;
  }

  buildConversationContext() {
    if (!this.voiceConversationHistory || this.voiceConversationHistory.length === 0) {
      return "This is the start of our conversation.";
    }

    // Get last 3 exchanges for context
    const recent = this.voiceConversationHistory.slice(-6); // Last 3 back-and-forth exchanges
    return recent.map(msg => `${msg.speaker === 'user' ? 'Student' : 'Kana'}: ${msg.message}`).join('\n');
  }

  async handleVoiceResourceRequest(userInput, kanaResponse) {
    console.log('🎯 Handling voice resource request for:', userInput);

    try {
      // Speak the initial response first
      this.speakConversationalResponse(kanaResponse);

      // Wait for speech to complete, then find resources
      setTimeout(async () => {
        console.log('🔍 Finding resources...');
        this.updateVoiceStatus('Finding resources...');

        // Extract topic from user input for resource search
        const searchTopic = this.extractTopicForResources(userInput);
        console.log('🔍 Searching for resources about:', searchTopic);

        // Find YouTube videos
        let resourceResponse = "Here's what I found for you: ";
        let hasResources = false;

        if (this.liveYouTubeSearcher) {
          try {
            const videos = await this.liveYouTubeSearcher.searchVideos(searchTopic, 3);
            if (videos && videos.length > 0) {
              hasResources = true;
              const videoTitles = videos.map(v => v.title).join(', ');
              resourceResponse += `I found ${videos.length} helpful videos: ${videoTitles}. `;

              // Add to voice conversation log
              this.addToVoiceConversation('kana', `Found ${videos.length} videos: ${videoTitles}`);
            }
          } catch (error) {
            console.log('❌ Error finding YouTube videos:', error);
          }
        }

        // Find subject resources (articles, guides)
        try {
          const pageContent = this.extractPageContent();
          const relevantResources = this.findRelevantSubjectResources(searchTopic, pageContent);

          if (relevantResources && relevantResources.length > 0) {
            hasResources = true;
            const resourceTitles = relevantResources.slice(0, 2).map(r => r.title).join(', ');
            resourceResponse += `Plus I have some great articles: ${resourceTitles}. `;

            // Add to voice conversation log
            this.addToVoiceConversation('kana', `Found articles: ${resourceTitles}`);
          }
        } catch (error) {
          console.log('❌ Error finding subject resources:', error);
        }

        if (!hasResources) {
          resourceResponse = "I'm still looking for the best resources for this topic. Try asking about something more specific if you'd like!";
        } else {
          resourceResponse += "Check the chat panel to see all the links!";

          // Show the resources in the text chat panel for easy access
          this.showResourcesInChatPanel(searchTopic, userInput);
        }

        // Speak the resource summary
        setTimeout(() => {
          this.addToVoiceConversation('kana', resourceResponse);
          this.speakConversationalResponse(resourceResponse);
        }, 1000);

      }, 2000); // Wait 2 seconds after initial response

    } catch (error) {
      console.log('❌ Error handling voice resource request:', error);
      const errorMsg = "I had trouble finding resources, but I'm here to help in other ways!";
      this.addToVoiceConversation('kana', errorMsg);
      this.speakConversationalResponse(errorMsg);
    }
  }

  extractTopicForResources(userInput) {
    // Extract the main topic from user input for resource searching
    const input = userInput.toLowerCase();

    // Remove common resource request words to get the core topic
    const cleaned = input
      .replace(/\b(resource|video|article|tutorial|more help|learn more|show me|find|example|resources|help with|about)\b/g, '')
      .replace(/\b(explain|tell me|how|what|why|when|where)\b/g, '')
      .trim();

    // If we have page context, use it to enhance the topic
    const pageTitle = document.title.toLowerCase();
    const keywords = this.extractKeywords(cleaned || userInput);

    // Combine page context with user keywords
    if (keywords.length > 0) {
      return keywords.join(' ');
    } else if (pageTitle) {
      return pageTitle.split(' ').slice(0, 3).join(' ');
    } else {
      return 'general learning';
    }
  }

  async showResourcesInChatPanel(topic, originalInput) {
    console.log('📋 Showing resources in chat panel for:', topic);

    // Ensure chat panel is visible
    if (!this.chatPanel.classList.contains('visible')) {
      this.showChatPanel();
    }

    // Use existing resource finding logic from text version
    try {
      const pageContent = this.extractPageContent();
      await this.analyzeScreenContent(`find resources about ${topic}`);
    } catch (error) {
      console.log('❌ Error showing resources in chat panel:', error);
    }
  }

  getContextualFallback(userInput) {
    const input = userInput.toLowerCase();

    // Context-aware fallbacks based on what they might be asking
    if (input.includes('help') || input.includes('explain')) {
      return "Sure, I'd be happy to help! What specifically are you working on?";
    } else if (input.includes('understand') || input.includes('confused')) {
      return "No worries! Let's break it down. What part is tricky?";
    } else if (input.includes('thank') || input.includes('thanks')) {
      return "You're welcome! Anything else I can help with?";
    } else if (input.includes('question') || input.includes('ask')) {
      return "Go ahead, I'm listening!";
    } else {
      return "Could you tell me more about that?";
    }
  }

  addToVoiceConversation(speaker, message) {
    // Add to conversation history for context
    if (!this.voiceConversationHistory) {
      this.voiceConversationHistory = [];
    }

    this.voiceConversationHistory.push({
      speaker: speaker,
      message: message,
      timestamp: Date.now()
    });

    // Keep only last 10 messages to prevent memory issues
    if (this.voiceConversationHistory.length > 10) {
      this.voiceConversationHistory = this.voiceConversationHistory.slice(-10);
    }

    if (!this.voiceUI) return;

    const conversation = this.voiceUI.querySelector('.kana-voice-conversation');
    if (!conversation) return;

    const messageElement = document.createElement('div');
    messageElement.className = `kana-voice-message kana-voice-message-${speaker}`;

    messageElement.innerHTML = `
      <div class="kana-voice-message-avatar">
        ${speaker === 'user' ? '👤' : '🤖'}
      </div>
      <div class="kana-voice-message-content">
        <div class="kana-voice-message-text">${message}</div>
        <div class="kana-voice-message-time">${new Date().toLocaleTimeString()}</div>
      </div>
    `;

    conversation.appendChild(messageElement);
    conversation.scrollTop = conversation.scrollHeight;
  }

  async speakConversationalResponse(text, isExplanation = false) {
    console.log('🔊 speakConversationalResponse called with:', text ? text.substring(0, 50) + '...' : 'null');
    console.log('🔊 Is explanation:', isExplanation);
    console.log('🔊 Voice response enabled:', this.voiceResponseEnabled);
    console.log('🔊 Speech synthesis available:', !!this.speechSynthesis);

    if (!this.voiceResponseEnabled || !this.speechSynthesis || !text) {
      console.log('❌ Speech conditions not met - returning');
      return;
    }

    try {
      console.log('🔊 Stopping any current speech...');
      // Stop any current speech
      this.stopSpeaking();

      // CRITICAL: Pause voice recognition while speaking to prevent feedback loop
      console.log('🔊 Pausing voice recognition to prevent feedback...');
      this.pauseVoiceRecognition();

      console.log('🔊 Updating voice status and visualizer...');
      this.updateVoiceStatus('Kana is speaking...');
      this.animateVoiceVisualizer(true, 'speaking');

      console.log('🔊 Cleaning text for speech...');
      // Clean the text for better speech synthesis
      const cleanedText = this.prepareTextForSpeech(text);

      console.log('🔊 Creating speech utterance...');
      // Create speech utterance
      this.currentSpeech = new SpeechSynthesisUtterance(cleanedText);

      // Configure for more natural, conversational speech
      if (this.selectedVoice) {
        console.log('🔊 Using selected voice:', this.selectedVoice.name);
        this.currentSpeech.voice = this.selectedVoice;
      } else {
        console.log('⚠️ No selected voice available');
      }

      // Adjust speech settings based on response type
      if (isExplanation) {
        // Slightly slower for detailed explanations
        this.currentSpeech.rate = 0.9;
        this.currentSpeech.pitch = 1.0;
        this.currentSpeech.volume = 0.9;
        console.log('🔊 Using explanation speech settings (slower)');
      } else {
        // Normal speed for quick responses
        this.currentSpeech.rate = 1.0;
        this.currentSpeech.pitch = 1.0;
        this.currentSpeech.volume = 0.9;
        console.log('🔊 Using quick response speech settings');
      }

      // For explanations, enable continuous interrupt detection
      if (isExplanation) {
        this.enableInterruptDetectionDuringSpeech();
      }

      console.log('🔊 Setting up event handlers...');
      // Set speech type for proper button handling
      this.currentSpeechType = 'conversational';

      // Set up event handlers
      this.currentSpeech.onstart = () => {
        console.log('🔊 Speech started!');
        this.isSpeaking = true;
        this.updateOrbState('speaking');
        // Show conversation pause button during speech
        this.showConversationPauseButton(true);
        // Hide reading controls
        this.showReadingPauseButton(false);
        this.showReadingPlayButton(false);
        // Keep voice recognition paused while speaking
        this.pauseVoiceRecognition();
      };

      this.currentSpeech.onend = () => {
        console.log('🔊 Speech ended - resuming voice recognition');
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.updateVoiceStatus('Listening...');
        // Hide conversation pause button when speech ends
        this.showConversationPauseButton(false);
        this.animateVoiceVisualizer(true, 'listening');

        // Disable interrupt detection
        if (isExplanation) {
          this.disableInterruptDetectionDuringSpeech();
        }

        // CRITICAL: Resume voice recognition after speech ends with a small delay
        // to ensure the speaker audio has completely stopped
        setTimeout(() => {
          this.resumeVoiceRecognition();
        }, 500); // 500ms delay to prevent picking up the tail end of speech
      };

      this.currentSpeech.onerror = (error) => {
        console.log('❌ Speech error:', error);
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.updateVoiceStatus('Speech error occurred');
        this.animateVoiceVisualizer(true, 'listening');

        // Hide conversation pause button on error
        this.showConversationPauseButton(false);

        // Disable interrupt detection on error
        if (isExplanation) {
          this.disableInterruptDetectionDuringSpeech();
        }

        // Resume voice recognition even on error
        setTimeout(() => {
          this.resumeVoiceRecognition();
        }, 300);
      };

      console.log('🔊 Starting speech synthesis...');
      // Speak the response
      this.speechSynthesis.speak(this.currentSpeech);
      console.log('🔊 Speech synthesis.speak() called');

    } catch (error) {
      console.log(`❌ Conversational speech error: ${error.message}`);
      this.log(`❌ Conversational speech error: ${error.message}`, 'error');
      this.updateVoiceStatus('Speech error occurred');

      // Resume voice recognition even on error
      setTimeout(() => {
        this.resumeVoiceRecognition();
      }, 300);
    }
  }

  enableInterruptDetectionDuringSpeech() {
    console.log('🎯 Enabling interrupt detection during speech');
    this.isListeningForInterrupts = true;

    // Create a separate recognition instance for interrupt detection
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.interruptRecognition = new SpeechRecognition();

      this.interruptRecognition.continuous = true;
      this.interruptRecognition.interimResults = true;
      this.interruptRecognition.lang = 'en-US';

      this.interruptRecognition.onresult = (event) => {
        if (!this.isListeningForInterrupts || !this.isSpeaking) return;

        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        // Check for stop commands
        if (transcript.toLowerCase().includes('stop') ||
          transcript.toLowerCase().includes('pause') ||
          transcript.toLowerCase().includes('wait')) {
          console.log('🛑 Interrupt detected during explanation:', transcript);
          this.handleInterruptCommand();
        }
      };

      this.interruptRecognition.onerror = (error) => {
        console.log('⚠️ Interrupt recognition error:', error.error);
      };

      try {
        this.interruptRecognition.start();
        console.log('🎯 Interrupt detection started');
      } catch (error) {
        console.log('❌ Failed to start interrupt detection:', error);
      }
    }
  }

  disableInterruptDetectionDuringSpeech() {
    console.log('🎯 Disabling interrupt detection');
    this.isListeningForInterrupts = false;

    if (this.interruptRecognition) {
      try {
        this.interruptRecognition.stop();
        this.interruptRecognition = null;
        console.log('🎯 Interrupt detection stopped');
      } catch (error) {
        console.log('⚠️ Error stopping interrupt detection:', error);
      }
    }
  }

  updateVoiceStatus(status) {
    if (!this.voiceUI) return;

    // Update compact mode status dot
    const statusDot = this.voiceUI.querySelector('.kana-voice-status-dot');
    if (statusDot) {
      // Change dot color based on status
      if (status.includes('Listening')) {
        statusDot.style.background = '#ff4757'; // Red for listening
        statusDot.style.animation = 'pulse 1s infinite';
      } else if (status.includes('speaking') || status.includes('thinking')) {
        statusDot.style.background = '#3742fa'; // Blue for speaking/thinking
        statusDot.style.animation = 'pulse 0.8s infinite';
      } else if (status.includes('error')) {
        statusDot.style.background = '#ff6348'; // Orange for error
        statusDot.style.animation = 'none';
      } else {
        statusDot.style.background = '#00ff88'; // Green for ready
        statusDot.style.animation = 'pulse 2s infinite';
      }
    }

    // Update expanded mode status text
    const statusText = this.voiceUI.querySelector('.kana-voice-status-text');
    if (statusText) {
      statusText.textContent = status;
    }

    this.log(`🎤 Voice status: ${status}`);
  }

  animateVoiceVisualizer(active, mode = 'listening') {
    if (!this.voiceUI) return;

    // Handle compact mode
    const compact = this.voiceUI.querySelector('.kana-voice-compact');
    const compactAvatar = this.voiceUI.querySelector('.kana-voice-avatar-tiny');
    const compactRings = this.voiceUI.querySelector('.kana-voice-rings-compact');
    const compactAudioBars = this.voiceUI.querySelectorAll('.kana-voice-audio-bars-compact .audio-bar');

    // Handle expanded mode
    const expanded = this.voiceUI.querySelector('.kana-voice-avatar-expanded');
    const expandedRings = this.voiceUI.querySelectorAll('.kana-voice-ring');
    const expandedAudioBars = this.voiceUI.querySelectorAll('.kana-voice-audio-visualizer .audio-bar');

    if (active) {
      // Animate compact mode if visible
      if (compact && !this.isExpanded) {
        compact.classList.add('active');
        if (compactAvatar) {
          if (mode === 'speaking') {
            compactAvatar.style.transform = 'scale(1.1)';
            compactAvatar.style.boxShadow = '0 0 25px var(--orb-shadow, rgba(74, 144, 226, 0.6))';
          } else {
            compactAvatar.style.transform = 'scale(1.05)';
            compactAvatar.style.boxShadow = '0 0 20px var(--orb-shadow, rgba(74, 144, 226, 0.4))';
          }
        }
        // Animate compact audio bars
        this.animateAudioBars(compactAudioBars, mode);
      }

      // Animate expanded mode if visible
      if (expanded && this.isExpanded) {
        const expandedContainer = this.voiceUI.querySelector('.kana-voice-expanded');
        if (expandedContainer) {
          expandedContainer.classList.add('active');
        }
        expanded.classList.add('active');
        expandedRings.forEach(ring => {
          if (ring) ring.classList.add('active');
        });

        if (mode === 'speaking') {
          expanded.classList.add('speaking');
          expandedRings.forEach(ring => {
            if (ring) ring.classList.add('speaking');
          });
        }
        // Animate expanded audio bars
        this.animateAudioBars(expandedAudioBars, mode);
      }
    } else {
      // Reset compact mode
      if (compact) {
        compact.classList.remove('active');
        if (compactAvatar) {
          compactAvatar.style.transform = 'scale(1)';
          compactAvatar.style.boxShadow = '0 0 20px var(--orb-shadow, rgba(74, 144, 226, 0.4))';
        }
        this.stopAudioBars(compactAudioBars);
      }

      // Reset expanded mode
      if (expanded) {
        const expandedContainer = this.voiceUI.querySelector('.kana-voice-expanded');
        if (expandedContainer) {
          expandedContainer.classList.remove('active', 'speaking');
        }
        expanded.classList.remove('active', 'speaking');
        expandedRings.forEach(ring => {
          if (ring) ring.classList.remove('active', 'speaking');
        });
        this.stopAudioBars(expandedAudioBars);
      }
    }
  }

  animateAudioBars(audioBars, mode) {
    if (!audioBars || audioBars.length === 0) return;

    audioBars.forEach((bar, index) => {
      if (!bar) return;

      // Create dynamic animation based on mode
      if (mode === 'speaking') {
        bar.style.animationDuration = '0.6s';
        bar.style.animationDelay = `${index * 0.08}s`;
      } else {
        bar.style.animationDuration = '1.2s';
        bar.style.animationDelay = `${index * 0.1}s`;
      }
    });
  }

  stopAudioBars(audioBars) {
    if (!audioBars || audioBars.length === 0) return;

    audioBars.forEach(bar => {
      if (bar) {
        bar.style.animationDuration = '';
        bar.style.animationDelay = '';
      }
    });
  }

  toggleVoiceConversationMute() {
    // Implementation for muting/unmuting the microphone
    if (this.voiceConversationActive) {
      this.stopVoiceConversation();
      this.updateVoiceStatus('Microphone muted');
    } else {
      this.startVoiceConversation();
    }
  }

  showVoiceToggleFeedback() {
    // Create feedback indicator
    const feedback = document.createElement('div');
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, ${this.voiceResponseEnabled ? '#4CAF50' : '#ff5722'}, ${this.voiceResponseEnabled ? '#66BB6A' : '#ff7043'});
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 16px;
      font-weight: 600;
      z-index: 2147483648;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
      transition: all 0.3s ease;
      text-align: center;
    `;
    feedback.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 24px;">${this.voiceResponseEnabled ? '🔊' : '🔇'}</span>
        <span>Voice responses ${this.voiceResponseEnabled ? 'enabled' : 'disabled'}</span>
      </div>
    `;

    document.body.appendChild(feedback);

    // Animate in
    setTimeout(() => {
      feedback.style.opacity = '1';
      feedback.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 10);

    // Animate out and remove
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translate(-50%, -50%) scale(0.8)';
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 300);
    }, 2000);
  }

  async speakResponse(text) {
    if (!this.voiceResponseEnabled || !this.speechSynthesis || !text) {
      return;
    }

    try {
      // Stop any current speech
      this.stopSpeaking();

      // Clean text for speech
      const cleanText = this.prepareTextForSpeech(text);
      if (!cleanText || cleanText.trim().length === 0) {
        return;
      }

      // Create speech utterance
      this.currentSpeech = new SpeechSynthesisUtterance(cleanText);

      // Configure voice settings
      this.configureSpeechVoice(this.currentSpeech);

      // Set speech type for proper button handling
      this.currentSpeechType = 'reading';

      // Set up event handlers
      this.currentSpeech.onstart = () => {
        this.isSpeaking = true;
        this.updateOrbState('speaking');
        this.log('🔊 Started reading response');
        // Show reading pause button during text reading
        this.showReadingPauseButton(true);
        this.showReadingPlayButton(false);
        // Hide conversation controls
        this.showConversationPauseButton(false);
      };

      this.currentSpeech.onend = () => {
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.log('🔊 Finished reading response');
        // Hide reading controls when finished
        this.showReadingPauseButton(false);
        this.showReadingPlayButton(false);
      };

      this.currentSpeech.onerror = (error) => {
        this.isSpeaking = false;
        this.updateOrbState('idle');
        this.currentSpeech = null;
        this.currentSpeechType = null;
        this.log(`❌ Speech error: ${error.error}`, 'error');
        // Hide reading controls on error
        this.showReadingPauseButton(false);
        this.showReadingPlayButton(false);
      };

      // Speak the text
      this.speechSynthesis.speak(this.currentSpeech);

    } catch (error) {
      this.log(`❌ Failed to speak response: ${error.message}`, 'error');
      this.isSpeaking = false;
      this.updateOrbState('idle');
    }
  }

  stopSpeaking() {
    if (this.speechSynthesis && this.isSpeaking) {
      this.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.currentSpeech = null;
      this.currentSpeechType = null;
      this.updateOrbState('idle');
      this.log('🔊 Speech stopped');

      // Hide all speech control buttons
      this.showConversationPauseButton(false);
      this.showReadingPauseButton(false);
      this.showReadingPlayButton(false);
    }
  }

  prepareTextForSpeech(html) {
    try {
      // Create a temporary element to parse HTML
      const temp = document.createElement('div');
      temp.innerHTML = html;

      // Remove script and style elements
      const scripts = temp.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());

      // Replace common HTML elements with speech-friendly text
      const headings = temp.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach(h => {
        const level = h.tagName.toLowerCase();
        h.textContent = `${h.textContent}. `;
      });

      // Add pauses after paragraphs and list items
      const paragraphs = temp.querySelectorAll('p');
      paragraphs.forEach(p => {
        p.textContent = p.textContent + '. ';
      });

      const listItems = temp.querySelectorAll('li');
      listItems.forEach((li, index) => {
        li.textContent = `${li.textContent}. `;
      });

      // Get clean text
      let text = temp.textContent || temp.innerText || '';

      // CRITICAL: Remove asterisks and other formatting that causes speech issues
      text = text
        .replace(/\*+/g, '') // Remove all asterisks
        .replace(/#+/g, '') // Remove hash symbols
        .replace(/_{2,}/g, ' ') // Replace multiple underscores with space
        .replace(/_([^_]+)_/g, '$1') // Remove single underscores (italic markdown)
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to just text
        .replace(/`([^`]+)`/g, '$1') // Remove code formatting
        .replace(/\s+/g, ' ') // Multiple spaces to single space
        .replace(/\n+/g, '. ') // Line breaks to periods
        .replace(/\.+/g, '.') // Multiple periods to single
        .replace(/\.\s*\./g, '.') // Remove duplicate periods
        .replace(/([.!?])\s*([.!?])/g, '$1 ') // Clean up punctuation
        .trim();

      // Remove empty sentences
      text = text.split('. ')
        .filter(sentence => sentence.trim().length > 0)
        .join('. ');

      // Ensure it ends with proper punctuation
      if (!text.match(/[.!?]$/)) {
        text += '.';
      }

      // Limit length for speech (speech synthesis has limits)
      const maxLength = 500;
      if (text.length > maxLength) {
        const sentences = text.split('. ');
        let truncated = '';
        for (const sentence of sentences) {
          if ((truncated + sentence).length < maxLength - 20) {
            truncated += sentence + '. ';
          } else {
            break;
          }
        }
        text = truncated.trim();
      }

      console.log('🧹 Text cleaned for speech:', text.substring(0, 100) + '...');
      return text;
    } catch (error) {
      this.log(`❌ Error preparing text for speech: ${error.message}`, 'error');
      return '';
    }
  }

  configureSpeechVoice(utterance) {
    try {
      // Use the pre-selected female voice if available
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
        this.log(`🔊 Using selected voice: ${this.selectedVoice.name}`);
      } else {
        // Fallback to voice selection
        const voices = this.speechSynthesis.getVoices();
        const englishVoices = voices.filter(voice => voice.lang.startsWith('en-'));

        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0];
        }
      }

      // Configure for natural speech
      utterance.rate = 0.85; // Slower for clarity
      utterance.pitch = 1.0; // Natural pitch
      utterance.volume = 0.9; // High volume for clarity

    } catch (error) {
      this.log(`❌ Error configuring speech voice: ${error.message}`, 'error');
      // Use default voice settings
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
    }
  }

  async analyzeScreenContent(userQuestion) {
    try {
      // Get visible text content from the page
      const pageContent = this.extractPageContent();

      // Prioritize content based on what's currently visible in viewport
      const prioritizedContent = this.prioritizeVisibleContent(pageContent);

      // Find the most relevant visible content for the user's question
      const relevantVisibleContent = this.findMostRelevantVisibleContent(userQuestion, prioritizedContent);

      // Identify the LMS platform
      const platform = this.identifyLMSPlatform();

      // Parse the user's question with priority on visible content
      const questionContext = this.parseUserQuestionWithViewport(userQuestion, prioritizedContent, relevantVisibleContent);

      // Generate an educational response (not an answer)
      const educationalResponse = this.generateEducationalResponse(questionContext, pageContent, platform);

      // Show the response in the UI
      this.showResponse(educationalResponse);

      // Store the question in conversation context
      this.conversationContext.addQuestion(userQuestion);

      // Create context for AI processing with viewport priority
      const context = {
        platform: platform,
        url: window.location.href,
        userQuestion: userQuestion,
        questionContext: questionContext,
        pageContent: pageContent,
        prioritizedContent: prioritizedContent,
        relevantVisibleContent: relevantVisibleContent
      };

      // Check if this is voice processing or text processing
      if (this.isVoiceProcessing) {
        console.log('🎤🔍 Voice processing detected - using voice AI processing');
        this.isVoiceProcessing = false; // Reset flag
        this.updateVoiceStatus('Thinking about your screen...');
        this.processWithAIForVoice(context);
      } else {
        console.log('💬 Text processing - using regular AI processing');
        // Process with AI
        this.processWithAI(context);
      }

    } catch (error) {
      console.error('Error analyzing screen content:', error);
      this.showError(`I encountered an error analyzing the page content: ${error.message}`);
    }
  }

  extractPageContent() {
    try {
      console.log('🔍 Starting page content extraction...');
      const content = {
        title: document.title,
        url: window.location.href,
        headings: [],
        text: [],
        questions: [],
        codeBlocks: [],
        assignments: [],
        learningObjectives: [],
        links: [],
        visibleText: [] // Add visible text content
      };

      // Question patterns to look for
      const questionPatterns = [
        /\b\d+\.\s*[A-Z][^.!?]*[?]/g,
        /Question\s*\d*[:\-]?\s*[A-Z][^.!?]*[?]/gi,
        /What\s+[^.!?]*[?]/gi,
        /How\s+[^.!?]*[?]/gi,
        /Why\s+[^.!?]*[?]/gi,
        /When\s+[^.!?]*[?]/gi,
        /Where\s+[^.!?]*[?]/gi,
        /Which\s+[^.!?]*[?]/gi
      ];

      // Look for questions in various elements
      const questionSelectors = [
        '.question', '.problem', '.exercise', '.quiz-question',
        '[class*="question"]', '[class*="problem"]', '[class*="quiz"]',
        'li', 'p', 'div'
      ];

      questionSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
          const text = el.textContent.trim();
          if (text.length > 10) {
            questionPatterns.forEach(pattern => {
              try {
                const matches = text.match(pattern);
                if (matches) {
                  matches.forEach(match => {
                    content.questions.push({
                      text: match.trim(),
                      element: el,
                      selector: selector,
                      index: content.questions.length + 1,
                      context: this.getElementContext(el)
                    });
                  });
                }
              } catch (err) {
                console.warn('Error processing question pattern:', err);
                // Continue with next pattern
              }
            });
          }
        });
      });

      // Look for code blocks
      const codeSelectors = ['code', 'pre', '.code', '.highlight', '.language-', '[class*="code"]'];
      codeSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const code = el.textContent.trim();
          if (code.length > 5) {
            content.codeBlocks.push({
              code: code,
              language: this.detectCodeLanguage(el),
              context: this.getElementContext(el)
            });
          }
        });
      });

      // Look for learning objectives or outcomes
      const objectivePatterns = [
        /(?:learning objectives?|outcomes?|goals?):?\s*(.*?)(?=\n\n|$)/gi,
        /(?:by the end|after completing|students? will):?\s*(.*?)(?=\n\n|$)/gi
      ];

      const textElements = document.querySelectorAll('p, div, li, td');
      textElements.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 10) {
          objectivePatterns.forEach(pattern => {
            const matches = text.match(pattern);
            if (matches) {
              content.learningObjectives.push(...matches.map(m => m.trim()));
            }
          });

          // Collect general text content
          if (text.length > 20 && text.length < 500) {
            content.text.push(text);
          }
        }
      });

      // Get important links
      const links = document.querySelectorAll('a[href]');
      links.forEach(link => {
        const text = link.textContent.trim();
        const href = link.getAttribute('href');
        if (text.length > 3 && href && !href.startsWith('#')) {
          content.links.push({
            text: text,
            url: href.startsWith('http') ? href : new URL(href, window.location.href).href,
            context: this.getElementContext(link)
          });
        }
      });

      // Look for assignments/submissions
      const assignmentSelectors = [
        '[class*="assignment"]', '[class*="submission"]', '[class*="due"]'
      ];

      assignmentSelectors.forEach(selector => {
        const assignmentElements = document.querySelectorAll(selector);
        assignmentElements.forEach(element => {
          if (this.isElementInViewport(element, 0.3)) {
            content.assignments.push({
              text: element.textContent.trim(),
              type: 'assignment'
            });
          }
        });
      });

      // Get headings
      const headingSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      headingSelectors.forEach(selector => {
        const headings = document.querySelectorAll(selector);
        headings.forEach(heading => {
          content.headings.push({
            text: heading.textContent.trim(),
            level: parseInt(selector.slice(1)),
            element: heading
          });
        });
      });

      // Extract ALL meaningful text content - simple and comprehensive approach
      console.log('🔍 Extracting all page content...');

      // Get ALL text-containing elements
      const allElements = document.querySelectorAll('p, div, span, li, td, th, h1, h2, h3, h4, h5, h6, article, section, blockquote, cite, em, strong, b, i, code, pre');

      // Simple content extraction - just get everything meaningful
      allElements.forEach(el => {
        const text = el.textContent.trim();

        // Only skip if truly useless
        if (text.length < 5 ||
          text.match(/^[\s\d\.\-_\|]+$/) || // Just punctuation/numbers
          text.toLowerCase().match(/^(home|menu|nav|login|logout|close|back|next|prev|continue|submit|ok|cancel)$/)) {
          return;
        }

        // Add to visible text array
        content.visibleText.push({
          text: text,
          element: el,
          isVisible: this.isElementInViewport(el, 0.1),
          context: this.getElementContext(el),
          tag: el.tagName.toLowerCase()
        });

        // Also add to general text for backward compatibility
        if (text.length > 20 && text.length < 2000) {
          content.text.push(text);
        }
      });

      console.log('🔍 Content extraction summary:', {
        title: content.title,
        headings: content.headings.length,
        visibleText: content.visibleText.length,
        generalText: content.text.length,
        questions: content.questions.length,
        links: content.links.length
      });

      // Debug: Log first few pieces of extracted content
      console.log('🔍 Sample extracted content:');
      console.log('- Title:', content.title);
      console.log('- First 3 headings:', content.headings.slice(0, 3).map(h => h.text));
      console.log('- First 3 visible text items:', content.visibleText.slice(0, 3).map(item => `${item.text.substring(0, 100)}... (${item.element.tagName})`));
      console.log('- First 3 general text items:', content.text.slice(0, 3).map(text => text.substring(0, 100) + '...'));

      // Additional debug for main content detection
      if (content.visibleText.length === 0) {
        console.log('⚠️ No visible text found - checking content extraction...');
        console.log('- Main content area:', mainContentArea ? mainContentArea.tagName : 'None found');
        console.log('- Total elements checked:', visibleElements.length);
        console.log('- Sample page text:', document.body.textContent.substring(0, 200) + '...');
      }

      return content;
    } catch (error) {
      console.error('Error extracting page content:', error);
      return {
        title: document.title || '',
        url: window.location.href,
        headings: [],
        text: [],
        questions: [],
        codeBlocks: [],
        assignments: [],
        learningObjectives: [],
        links: [],
        visibleText: []
      };
    }
  }

  extractDates(text) {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(\w+\s+\d+,\s*\d+)/g
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) return match[1] || match[0];
    }
    return null;
  }

  identifyLMSPlatform() {
    const hostname = window.location.hostname.toLowerCase();

    if (hostname.includes('canvas') || hostname.includes('instructure')) {
      return 'Canvas';
    } else if (hostname.includes('blackboard')) {
      return 'Blackboard';
    } else if (hostname.includes('moodle')) {
      return 'Moodle';
    } else if (hostname.includes('schoology')) {
      return 'Schoology';
    } else if (hostname.includes('holberton')) {
      return 'Holberton';
    } else if (hostname.includes('alustudent') || hostname.includes('alu')) {
      return 'ALU';
    } else {
      return 'Learning Platform';
    }
  }

  // Helper methods for content analysis
  getElementContext(element) {
    try {
      // Get contextual information about an element
      const context = {
        tagName: element.tagName.toLowerCase(),
        className: element.className || '',
        id: element.id || '',
        parent: element.parentElement ? element.parentElement.tagName.toLowerCase() : '',
        siblings: element.parentElement ? element.parentElement.children.length : 0,
        textLength: element.textContent.trim().length,
        isVisible: this.isElementInViewport(element, 0.1)
      };

      // Add specific context for common elements
      if (element.tagName.toLowerCase() === 'a') {
        context.href = element.getAttribute('href') || '';
      }

      if (element.tagName.toLowerCase() === 'img') {
        context.alt = element.getAttribute('alt') || '';
        context.src = element.getAttribute('src') || '';
      }

      return context;
    } catch (error) {
      console.warn('Error getting element context:', error);
      return {
        tagName: 'unknown',
        className: '',
        id: '',
        parent: '',
        siblings: 0,
        text,
        isVisible: false
      };
    }
  }

  detectCodeLanguage(element) {
    try {
      // Check class names for language indicators
      const className = element.className.toLowerCase();
      const languageIndicators = {
        'javascript': ['javascript', 'js'],
        'python': ['python', 'py'],
        'java': ['java'],
        'cpp': ['cpp', 'c++', 'cxx'],
        'c': ['c'],
        'html': ['html', 'markup'],
        'css': ['css'],
        'sql': ['sql'],
        'json': ['json'],
        'xml': ['xml'],
        'php': ['php'],
        'ruby': ['ruby', 'rb'],
        'go': ['go', 'golang'],
        'rust': ['rust', 'rs'],
        'shell': ['bash', 'sh', 'shell'],
        'yaml': ['yaml', 'yml']
      };

      // Check class names for language patterns
      for (const [language, indicators] of Object.entries(languageIndicators)) {
        for (const indicator of indicators) {
          if (className.includes(indicator) || className.includes(`language-${indicator}`)) {
            return language;
          }
        }
      }

      // Try to detect language from content patterns
      const code = element.textContent.trim();
      if (code.length > 0) {
        // Basic heuristics for common languages
        if (code.includes('function') && code.includes('{') && code.includes('}')) {
          return 'javascript';
        }
        if (code.includes('def ') && code.includes(':')) {
          return 'python';
        }
        if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) {
          return 'sql';
        }
        if (code.includes('<') && code.includes('>') && code.includes('/')) {
          return code.includes('<!DOCTYPE') ? 'html' : 'xml';
        }
        if (code.includes('#include') || code.includes('int main')) {
          return 'c';
        }
        if (code.includes('public class') || code.includes('import java')) {
          return 'java';
        }
      }

      return 'unknown';
    } catch (error) {
      console.warn('Error detecting code language:', error);
      return 'unknown';
    }
  }

  prioritizeVisibleContent(pageContent) {
    try {
      const prioritized = {
        highPriority: {
          questions: [],
          codeBlocks: [],
          assignments: [],
          text: [],
          headings: []
        },
        mediumPriority: {
          questions: [],
          codeBlocks: [],
          links: [],
          text: [],
          headings: []
        },
        lowPriority: {
          learningObjectives: pageContent.learningObjectives || [],
          allText: pageContent.text || [],
          allLinks: pageContent.links || []
        },
        currentSection: null,
        visibleHeadings: []
      };

      // Find currently visible headings and questions to determine current section
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const allQuestions = document.querySelectorAll('[class*="question"], [id*="question"], [class*="quiz"], .card-title');

      let currentSectionHeading = null;
      let currentQuestionElement = null;
      let closestVisibleHeading = null;
      let minDistance = Infinity;
      let currentQuestionNumber = null;

      // First, find the most prominent visible question/section
      allQuestions.forEach(questionEl => {
        const rect = questionEl.getBoundingClientRect();
        const isVisible = this.isElementInViewport(questionEl, 0.2);

        if (isVisible) {
          const distance = Math.abs(rect.top - (window.innerHeight * 0.3)); // Target upper-middle of screen
          if (distance < minDistance) {
            minDistance = distance;
            currentQuestionElement = questionEl;

            // Try to extract question number from text with multiple patterns
            const text = questionEl.textContent.trim();
            const numberMatch = text.match(/(?:question|problem|quiz)\s*#?(\d+)/i) ||
              text.match(/^(\d+)[\.\)]\s/) ||
              text.match(/(\d+)\s*[\.\)]/) ||
              text.match(/^(\d+)\.\s+/); // Match "3. Let the right one in" format
            if (numberMatch) {
              currentQuestionNumber = parseInt(numberMatch[1]);
            }
          }
        }
      });

      // Also check for numbered sections/headings that might be questions
      const numberedElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, p, span');
      numberedElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const isVisible = this.isElementInViewport(el, 0.3);

        if (isVisible) {
          const text = el.textContent.trim();
          // Look specifically for patterns like "3. Let the right one in"
          const questionPattern = text.match(/^(\d+)\.\s+(.+)/) || text.match(/^(\d+)[\)\-]\s+(.+)/);

          if (questionPattern && questionPattern[2] && questionPattern[2].length > 5) {
            const distance = Math.abs(rect.top - (window.innerHeight * 0.3));
            if (distance < minDistance) {
              minDistance = distance;
              currentQuestionElement = el;
              currentQuestionNumber = parseInt(questionPattern[1]);
            }
          }
        }
      });

      // Also check regular headings
      allHeadings.forEach(heading => {
        const rect = heading.getBoundingClientRect();
        const isVisible = this.isElementInViewport(heading);

        if (isVisible) {
          prioritized.visibleHeadings.push({
            text: heading.textContent.trim(),
            level: parseInt(heading.tagName.substr(1)),
            position: rect.top
          });
        }

        // Find the heading closest to the top of the viewport (but not too far up)
        if (rect.top >= -50 && rect.top <= window.innerHeight * 0.6) {
          const distance = Math.abs(rect.top - 100); // Target ~100px from top
          if (distance < minDistance && !currentQuestionElement) {
            minDistance = distance;
            closestVisibleHeading = heading;
          }
        }
      });

      // Set current section based on the most relevant visible element
      if (currentQuestionElement) {
        const questionText = currentQuestionElement.textContent.trim();
        prioritized.currentSection = {
          text: questionText.substring(0, 100) + (questionText.length > 100 ? '...' : ''),
          level: parseInt(currentQuestionElement.tagName?.substr(1)) || 3,
          element: currentQuestionElement,
          questionNumber: currentQuestionNumber,
          type: 'question'
        };

        // Also get the full question content and any nearby content
        const questionContainer = currentQuestionElement.closest('.card, .question-container, .quiz-question, [class*="question"]') || currentQuestionElement.parentElement;
        if (questionContainer) {
          const fullQuestionText = questionContainer.textContent.trim();
          prioritized.currentSection.fullText = fullQuestionText.substring(0, 500) + (fullQuestionText.length > 500 ? '...' : '');

          // Look for specific question content like lists, instructions, etc.
          const lists = questionContainer.querySelectorAll('ul, ol');
          const paragraphs = questionContainer.querySelectorAll('p');
          if (lists.length > 0 || paragraphs.length > 0) {
            prioritized.currentSection.hasDetailedContent = true;
          }
        }
      } else if (closestVisibleHeading) {
        prioritized.currentSection = {
          text: closestVisibleHeading.textContent.trim(),
          level: parseInt(closestVisibleHeading.tagName.substr(1)),
          element: closestVisibleHeading,
          type: 'heading'
        };
      } else if (prioritized.visibleHeadings.length > 0) {
        // Fallback to first visible heading
        const firstVisible = prioritized.visibleHeadings[0];
        prioritized.currentSection = {
          text: firstVisible.text,
          level: firstVisible.level,
          type: 'heading'
        };
      }

      // Prioritize content based on actual viewport visibility
      const allElements = document.querySelectorAll('p, div, pre, code, blockquote, li, span');

      allElements.forEach(element => {
        const isVisible = this.isElementInViewport(element, 0.3); // 30% visible threshold
        const text = element.textContent.trim();

        if (text.length < 10) return; // Skip very short text

        // Check if it's a question
        if (this.looksLikeQuestion(text)) {
          const questionObj = { text, element, context: { isVisible } };
          if (isVisible) {
            prioritized.highPriority.questions.push(questionObj);
          } else {
            prioritized.mediumPriority.questions.push(questionObj);
          }
        }

        // Check if it's a code block
        if (element.tagName === 'PRE' || element.tagName === 'CODE' ||
          element.className.includes('code') || element.className.includes('highlight')) {
          const codeObj = { text, element, language: this.detectCodeLanguage(element), context: { isVisible } };
          if (isVisible) {
            prioritized.highPriority.codeBlocks.push(codeObj);
          }
        }

        // Add visible text content
        if (isVisible && text.length > 20) {
          prioritized.highPriority.text.push({
            text,
            element,
            context: { isVisible: true }
          });
        } else if (text.length > 50) {
          prioritized.mediumPriority.text.push({
            text,
            element,
            context: { isVisible: false }
          });
        }
      });

      // Find visible links
      const allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(link => {
        const isVisible = this.isElementInViewport(link);
        const linkObj = {
          text: link.textContent.trim(),
          href: link.href,
          element: link,
          context: { isVisible }
        };

        if (isVisible) {
          prioritized.mediumPriority.links.push(linkObj);
        }
      });

      // Always include assignments as high priority
      if (pageContent.assignments) {
        prioritized.highPriority.assignments = pageContent.assignments;
      }

      return prioritized;
    } catch (error) {
      console.warn('Error prioritizing visible content:', error);
      return {
        highPriority: { questions: [], codeBlocks: [], assignments: [], text: [], headings: [] },
        mediumPriority: { questions: [], codeBlocks: [], links: [], text: [], headings: [] },
        lowPriority: { learningObjectives: [], allText: [], allLinks: [] },
        currentSection: null,
        visibleHeadings: []
      };
    }
  }

  // Helper method to detect if text looks like a question
  looksLikeQuestion(text) {
    const questionPatterns = [
      /^(\d+[\.\)]|\w[\.\)])\s+.*\?/i,  // Numbered questions ending with ?
      /^(what|how|why|when|where|which|who)\b.*\?/i, // WH-questions
      /\b(explain|describe|analyze|compare|evaluate|discuss|calculate|solve|find|determine|prove)\b/i,
      /^.*\?\s*$/i  // Any text ending with ?
    ];

    return questionPatterns.some(pattern => pattern.test(text));
  }

  // Viewport detection methods
  isElementInViewport(element, threshold = 0.1) {
    try {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const windowWidth = window.innerWidth || document.documentElement.clientWidth;

      // Check if element is completely outside viewport
      if (rect.bottom < 0 || rect.top > windowHeight || rect.right < 0 || rect.left > windowWidth) {
        return false;
      }

      const visibleTop = Math.max(0, rect.top);
      const visibleBottom = Math.min(windowHeight, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      const visibleLeft = Math.max(0, rect.left);
      const visibleRight = Math.min(windowWidth, rect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);

      const elementArea = rect.width * rect.height;
      const visibleArea = visibleWidth * visibleHeight;

      if (elementArea === 0) return false;

      const visibilityRatio = visibleArea / elementArea;
      return visibilityRatio >= threshold;
    } catch (error) {
      console.warn('Error checking element visibility:', error);
      return false;
    }
  }

  findMostRelevantVisibleContent(userQuestion, prioritizedContent) {
    try {
      // Initialize relevance scoring object
      const relevantContent = {
        questions: [],
        codeBlocks: [],
        assignments: [],
        text: [],
        links: [],
        relevanceScore: 0
      };

      // Convert user question to search terms for matching
      const searchTerms = userQuestion.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter(term => term.length > 2 && !['what', 'how', 'why', 'when', 'where', 'this', 'that', 'the', 'and', 'for'].includes(term));

      // Function to calculate relevance score for text content
      const calculateRelevanceScore = (text) => {
        if (!text || typeof text !== 'string') return 0;

        const lowerText = text.toLowerCase();
        let score = 0;

        searchTerms.forEach(term => {
          // Exact match gets higher score
          if (lowerText.includes(term)) {
            score += term.length > 4 ? 3 : 2;
          }
          // Partial match gets lower score
          if (lowerText.includes(term.substring(0, Math.max(3, term.length - 1)))) {
            score += 1;
          }
        });

        return score;
      };

      // Analyze high priority content first
      if (prioritizedContent.highPriority) {
        // Check questions
        if (prioritizedContent.highPriority.questions) {
          prioritizedContent.highPriority.questions.forEach(question => {
            const score = calculateRelevanceScore(question.text);
            if (score > 0) {
              relevantContent.questions.push({
                ...question,
                relevanceScore: score,
                priority: 'high'
              });
            }
          });
        }

        // Check code blocks
        if (prioritizedContent.highPriority.codeBlocks) {
          prioritizedContent.highPriority.codeBlocks.forEach(codeBlock => {
            const score = calculateRelevanceScore(codeBlock.code);
            if (score > 0) {
              relevantContent.codeBlocks.push({
                ...codeBlock,
                relevanceScore: score,
                priority: 'high'
              });
            }
          });
        }

        // Check assignments
        if (prioritizedContent.highPriority.assignments) {
          prioritizedContent.highPriority.assignments.forEach(assignment => {
            const score = calculateRelevanceScore(assignment.text);
            if (score > 0) {
              relevantContent.assignments.push({
                ...assignment,
                relevanceScore: score,
                priority: 'high'
              });
            }
          });
        }

        // Check text content
        if (prioritizedContent.highPriority.text) {
          prioritizedContent.highPriority.text.forEach(text => {
            const score = calculateRelevanceScore(text);
            if (score > 0) {
              relevantContent.text.push({
                text: text,
                relevanceScore: score,
                priority: 'high'
              });
            }
          });
        }
      }

      // Analyze medium priority content if high priority didn't yield enough results
      if (relevantContent.questions.length < 3 && prioritizedContent.mediumPriority) {
        if (prioritizedContent.mediumPriority.questions) {
          prioritizedContent.mediumPriority.questions.forEach(question => {
            const score = calculateRelevanceScore(question.text);
            if (score > 0) {
              relevantContent.questions.push({
                ...question,
                relevanceScore: score,
                priority: 'medium'
              });
            }
          });
        }

        if (prioritizedContent.mediumPriority.links) {
          prioritizedContent.mediumPriority.links.forEach(link => {
            const score = calculateRelevanceScore(link.text);
            if (score > 0) {
              relevantContent.links.push({
                ...link,
                relevanceScore: score,
                priority: 'medium'
              });
            }
          });
        }
      }

      // Sort all content by relevance score
      relevantContent.questions.sort((a, b) => b.relevanceScore - a.relevanceScore);
      relevantContent.codeBlocks.sort((a, b) => b.relevanceScore - a.relevanceScore);
      relevantContent.assignments.sort((a, b) => b.relevanceScore - a.relevanceScore);
      relevantContent.text.sort((a, b) => b.relevanceScore - a.relevanceScore);
      relevantContent.links.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Calculate overall relevance score
      relevantContent.relevanceScore =
        relevantContent.questions.reduce((sum, q) => sum + q.relevanceScore, 0) +
        relevantContent.codeBlocks.reduce((sum, c) => sum + c.relevanceScore, 0) +
        relevantContent.assignments.reduce((sum, a) => sum + a.relevanceScore, 0) +
        relevantContent.text.reduce((sum, t) => sum + t.relevanceScore, 0) +
        relevantContent.links.reduce((sum, l) => sum + l.relevanceScore, 0);

      // Limit results to most relevant items
      relevantContent.questions = relevantContent.questions.slice(0, 5);
      relevantContent.codeBlocks = relevantContent.codeBlocks.slice(0, 3);
      relevantContent.assignments = relevantContent.assignments.slice(0, 2);
      relevantContent.text = relevantContent.text.slice(0, 8);
      relevantContent.links = relevantContent.links.slice(0, 3);

      return relevantContent;

    } catch (error) {
      console.warn('Error finding most relevant visible content:', error);
      return {
        questions: [],
        codeBlocks: [],
        assignments: [],
        text: [],
        links: [],
        relevanceScore: 0
      };
    }
  }

  findRelevantQuestionsOnPage(userQuestion, pageContent) {
    const relevantContent = {
      questions: [],
      assignments: [],
      concepts: []
    };

    // Convert user question to search terms
    const searchTerms = userQuestion.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(' ')
      .filter(term => term.length > 2);

    // Search through page questions
    pageContent.questions.forEach(q => {
      const questionText = q.text.toLowerCase();
      let relevanceScore = 0;

      // Exact phrase matching
      const questionPhrase = userQuestion.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
      if (questionText.includes(questionPhrase)) {
        relevanceScore += 50;
      }

      // Term matching
      searchTerms.forEach(term => {
        if (questionText.includes(term)) {
          relevanceScore += 10;
        }
      });

      // Question number matching
      const userNumber = userQuestion.match(/(?:question|problem|#)\s*(\d+)/i);
      const questionNumber = questionText.match(/(?:question|problem|#)\s*(\d+)/i);
      if (userNumber && questionNumber && userNumber[1] === questionNumber[1]) {
        relevanceScore += 100; // Very high bonus for exact match
      }

      // Simple number matching
      const userNumbers = userQuestion.match(/\d+/g);
      const questionNumbers = questionText.match(/\d+/g);
      if (userNumbers && questionNumbers) {
        userNumbers.forEach(userNum => {
          if (questionNumbers.includes(userNum)) {
            relevanceScore += 25;
          }
        });
      }

      if (relevanceScore > 0) {
        relevantContent.questions.push({
          ...q,
          relevanceScore: relevanceScore
        });
      }
    });

    relevantContent.questions.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return relevantContent;
  }

  parseUserQuestionWithViewport(userQuestion, prioritizedContent, relevantVisibleContent) {
    try {
      const question = userQuestion.toLowerCase();
      const context = {
        intent: 'learn',
        targetQuestion: null,
        subject: null,
        relatedQuestions: [],
        currentSection: prioritizedContent.currentSection,
        visibleContent: relevantVisibleContent,
        isViewportSpecific: false
      };

      // Detect intent
      if (question.includes('explain') || question.includes('what is') || question.includes('how does')) {
        context.intent = 'explain';
      } else if (question.includes('hint') || question.includes('help with') || question.includes('stuck')) {
        context.intent = 'hint';
      }

      // Check if question is viewport-specific
      if (question.includes('this question') || question.includes('current') ||
        question.includes('here') || question.includes('on screen')) {
        context.isViewportSpecific = true;
      }

      // Prioritize visible questions
      if (relevantVisibleContent.questions.length > 0) {
        context.targetQuestion = relevantVisibleContent.questions[0];
        context.relatedQuestions = relevantVisibleContent.questions.slice(0, 3);
      }

      // Try to identify subject
      const subjectMatches = question.match(/\b(unity|shader|math|programming|code)\b/i);
      if (subjectMatches) {
        context.subject = subjectMatches[0].toLowerCase();
      }

      return context;
    } catch (error) {
      console.error("Error parsing user question with viewport:", error);
      return {
        intent: 'learn',
        targetQuestion: null,
        subject: null,
        relatedQuestions: [],
        currentSection: prioritizedContent.currentSection,
        isViewportSpecific: false
      };
    }
  }

  async processWithAIForVoice(context) {
    const { questionContext, pageContent, platform, userQuestion } = context;

    // Try to get API key from storage, fallback to default
    let GEMINI_API_KEY = "AIzaSyBkyfIR24sNjKIoPQAgHmgNONCu38CqvHQ";
    try {
      const result = await chrome.storage.local.get(['geminiApiKey']);
      if (result.geminiApiKey) {
        GEMINI_API_KEY = result.geminiApiKey;
        this.log('🎤 Using custom Gemini API key from storage');
      }
    } catch (error) {
      this.log('🎤 Failed to get API key from storage, using default', 'warn');
    }

    // Smart model selection for voice responses
    const PRIMARY_MODEL = "gemini-2.0-flash";
    const FALLBACK_MODELS = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro"
    ];

    let modelsToTest;
    if (this.lastSuccessfulModel && this.lastSuccessfulModel !== PRIMARY_MODEL) {
      modelsToTest = [this.lastSuccessfulModel, PRIMARY_MODEL, ...FALLBACK_MODELS.filter(m => m !== this.lastSuccessfulModel)];
    } else {
      modelsToTest = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    }

    try {
      this.updateVoiceStatus('Thinking about your screen...');

      // Prepare a conversational voice prompt using the comprehensive screen analysis
      const voicePrompt = this.prepareVoicePrompt(
        userQuestion,
        pageContent,
        platform,
        context.prioritizedContent,
        context.relevantVisibleContent
      );

      console.log('🎤🤖 Voice prompt prepared, trying AI models...');

      let response;
      let errorMessage = "";
      let modelUsed = null;

      // Try models until one works
      for (const model of modelsToTest.slice(0, 3)) {
        try {
          console.log(`🎤🤖 Trying voice model: ${model}`);

          const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: voicePrompt
                }]
              }],
              generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 500, // Shorter responses for voice
                stopSequences: [],
              }
            })
          });

          if (apiResponse.ok) {
            const data = await apiResponse.json();
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
              response = data.candidates[0].content.parts[0].text;
              modelUsed = model;
              this.lastSuccessfulModel = model; // Remember successful model
              console.log(`🎤✅ Success with model: ${model}`);
              break;
            }
          } else {
            const errorData = await apiResponse.json();
            errorMessage = `${model}: ${errorData.error?.message || 'Unknown error'}`;
            console.warn(`🎤❌ Model ${model} failed:`, errorMessage);
          }
        } catch (error) {
          errorMessage = `${model}: ${error.message}`;
          console.warn(`🎤❌ Model ${model} error:`, error);
        }
      }

      if (response) {
        console.log('🎤✅ Voice AI response received:', response.substring(0, 100) + '...');

        // Update conversation memory with this interaction
        this.updateVoiceConversationMemory(userQuestion, response, pageContent);

        // Add to voice conversation and speak the response
        this.addToVoiceConversation('kana', response);
        this.speakConversationalResponse(response);

        this.updateVoiceStatus('Response complete');

        this.log(`🎤✅ Voice AI processing successful with ${modelUsed}`);
      } else {
        console.log('🎤❌ All voice AI models failed');
        const fallbackResponse = this.generateVoiceFallbackResponse(userQuestion, pageContent);

        // Update conversation memory even for fallback responses
        this.updateVoiceConversationMemory(userQuestion, fallbackResponse, pageContent);

        this.addToVoiceConversation('kana', fallbackResponse);
        this.speakConversationalResponse(fallbackResponse);
        this.updateVoiceStatus('Using fallback response');
      }

    } catch (error) {
      console.error('🎤❌ Voice AI processing error:', error);
      const errorResponse = "I'm having some trouble processing your request right now. Could you try asking in a different way?";

      // Update conversation memory even for error responses
      this.updateVoiceConversationMemory(userQuestion, errorResponse, pageContent);

      this.addToVoiceConversation('kana', errorResponse);
      this.speakConversationalResponse(errorResponse);
      this.updateVoiceStatus('Error - using fallback');
    }
  }

  async processWithAI(context) {
    const { questionContext, pageContent, platform, userQuestion } = context;

    // Try to get API key from storage, fallback to default
    let GEMINI_API_KEY = "AIzaSyBkyfIR24sNjKIoPQAgHmgNONCu38CqvHQ";
    try {
      const result = await chrome.storage.local.get(['geminiApiKey']);
      if (result.geminiApiKey) {
        GEMINI_API_KEY = result.geminiApiKey;
        this.log('Using custom Gemini API key from storage');
      }
    } catch (error) {
      this.log('Failed to get API key from storage, using default', 'warn');
    }

    // Prioritize the best performing models first
    const PRIMARY_MODEL = "gemini-2.0-flash";
    const FALLBACK_MODELS = [
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash-002",
      "gemini-1.5-pro-002"
    ];

    // Smart model selection - try last successful model first
    let modelsToTest;
    if (this.lastSuccessfulModel && this.lastSuccessfulModel !== PRIMARY_MODEL) {
      // Put last successful model first, then primary, then fallbacks
      modelsToTest = [this.lastSuccessfulModel, PRIMARY_MODEL, ...FALLBACK_MODELS.filter(m => m !== this.lastSuccessfulModel)];
    } else {
      modelsToTest = [PRIMARY_MODEL, ...FALLBACK_MODELS];
    }

    try {
      // Update orb state to show we're thinking
      this.updateOrbState('thinking');
      this.playAudioFeedback('thinking');

      // Prepare the content to send to Gemini with viewport context
      const prompt = this.prepareGeminiPrompt(
        userQuestion,
        pageContent,
        platform,
        context.prioritizedContent,
        context.relevantVisibleContent
      );

      // Try multiple models and endpoints
      let response;
      let errorMessage = "";
      let modelUsed = null;

      // Skip model availability check - use smart model selection
      if (this.lastSuccessfulModel) {
        console.log(`Smart model selection: trying last successful model (${this.lastSuccessfulModel}) first`);
      }
      console.log("Models to test:", modelsToTest.slice(0, 3)); // Only log first 3 for cleaner output

      // Limit to 3 models max for faster response (prioritizing the best ones)
      const limitedModels = modelsToTest.slice(0, 3);

      // Try each model until one works
      for (const model of limitedModels) {
        try {
          console.log(`Trying model: ${model}`);

          // Try v1 API first
          const v1Endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
          const apiUrl = `${v1Endpoint}?key=${GEMINI_API_KEY}`;

          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: prompt
                }]
              }],
              generationConfig: {
                temperature: 0.8,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
                candidateCount: 1
              },
              safetySettings: [
                {
                  category: "HARM_CATEGORY_HARASSMENT",
                  threshold: "BLOCK_ONLY_HIGH"
                },
                {
                  category: "HARM_CATEGORY_HATE_SPEECH",
                  threshold: "BLOCK_ONLY_HIGH"
                },
                {
                  category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  threshold: "BLOCK_ONLY_HIGH"
                },
                {
                  category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                  threshold: "BLOCK_ONLY_HIGH"
                }
              ]
            })
          });

          if (response.ok) {
            modelUsed = model;
            this.lastSuccessfulModel = model; // Remember this model for next time
            console.log(`Successfully connected using model: ${model}`);
            break;
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`Model ${model} failed with status:`, response.status, errorData);
            errorMessage = errorData.error?.message || `Model ${model} returned status ${response.status}`;

            // For rate limit errors, don't try v1beta (it will likely fail too)
            if (response.status === 429 || response.status === 503) {
              console.log(`Skipping v1beta for ${model} due to rate limit/service unavailable`);
              continue;
            }

            // If v1 fails with other errors, try v1beta for this model
            try {
              const v1betaEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
              const betaApiUrl = `${v1betaEndpoint}?key=${GEMINI_API_KEY}`;

              response = await fetch(betaApiUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  contents: [{
                    parts: [{
                      text: prompt
                    }]
                  }],
                  generationConfig: {
                    temperature: 0.8,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                    candidateCount: 1
                  },
                  safetySettings: [
                    {
                      category: "HARM_CATEGORY_HARASSMENT",
                      threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                      category: "HARM_CATEGORY_HATE_SPEECH",
                      threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                      threshold: "BLOCK_ONLY_HIGH"
                    },
                    {
                      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                      threshold: "BLOCK_ONLY_HIGH"
                    }
                  ]
                })
              });

              if (response.ok) {
                modelUsed = model + " (v1beta)";
                this.lastSuccessfulModel = model; // Remember the base model for next time
                console.log(`Successfully connected using model: ${model} on v1beta API`);
                break;
              }
            } catch (betaError) {
              console.log(`v1beta also failed for ${model}:`, betaError);
            }
          }
        } catch (modelError) {
          console.error(`Error with model ${model}:`, modelError);
          errorMessage = modelError.message;
        }
      }

      if (response && response.ok) {
        const result = await response.json();
        console.log("Full Gemini API response:", result);

        // Handle different response structures with robust error checking
        let aiResponseText = null;
        let wasBlocked = false;

        try {
          if (result.candidates && Array.isArray(result.candidates) && result.candidates.length > 0) {
            // Standard response structure
            const candidate = result.candidates[0];

            // Check if response was blocked by safety filters
            if (candidate.finishReason === 'SAFETY') {
              console.warn('Response blocked by Gemini safety filters');
              wasBlocked = true;
            } else if (candidate && candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
              aiResponseText = candidate.content.parts[0]?.text;
            }
          } else if (result.content && result.content.parts && Array.isArray(result.content.parts) && result.content.parts.length > 0) {
            // Alternative response structure
            aiResponseText = result.content.parts[0]?.text;
          } else if (result.text) {
            // Direct text response
            aiResponseText = result.text;
          } else if (typeof result === 'string') {
            // String response
            aiResponseText = result;
          }

          // If no text found, check for blocking or other issues
          if (!aiResponseText && result.candidates && result.candidates[0]) {
            const candidate = result.candidates[0];
            if (candidate.finishReason) {
              console.log('Response finish reason:', candidate.finishReason);
              if (candidate.finishReason === 'SAFETY') {
                wasBlocked = true;
              }
            }
          }
        } catch (parseError) {
          console.error("Error parsing Gemini response structure:", parseError);
          console.log("Response structure:", JSON.stringify(result, null, 2));
          // Try to extract any text we can find
          if (result && typeof result === 'object') {
            // Look for text in common response patterns
            const textValue = this.extractTextFromResponse(result);
            if (textValue) {
              aiResponseText = textValue;
            }
          }
        }

        // Provide better fallback responses based on what happened
        if (!aiResponseText) {
          if (wasBlocked) {
            aiResponseText = `I understand you're looking for help with this topic. Let me suggest a different approach:

<h3>🎯 Learning Strategy</h3>
<p>Instead of a direct answer, let's break this down step by step:</p>
<ul>
<li>Review the concepts and definitions in your materials</li>
<li>Look for similar examples or practice problems</li>
<li>Try working through the problem yourself first</li>
<li>Identify which specific part you're struggling with</li>
</ul>

<p><strong>What specific aspect would you like me to help you understand better?</strong></p>`;
          } else {
            aiResponseText = `I'm here to help you learn! While I can't provide a specific response right now, let me offer some guidance:

<h3>📚 Study Approach</h3>
<p>When tackling challenging questions:</p>
<ul>
<li>Start with what you already know</li>
<li>Break complex problems into smaller parts</li>
<li>Look for patterns or similar examples</li>
<li>Don't hesitate to ask for clarification on specific concepts</li>
</ul>

<p><strong>Can you tell me more about what specific concept you'd like help understanding?</strong></p>`;
          }
        }

        console.log("Received Gemini response:", aiResponseText.substring(0, 100) + "...");

        // Parse the AI response to our format (now async to handle YouTube searches)
        const formattedResponse = await this.parseGeminiResponse(aiResponseText, questionContext);

        // Update the UI with the real response
        this.showResponse(formattedResponse);

        // Reset orb state back to idle
        this.updateOrbState('idle');

        // Play audio feedback for response received
        this.playAudioFeedback('response');

        return formattedResponse;
      } else {
        // If we got a response but it wasn't OK, try to get error details
        if (response) {
          try {
            const errorData = await response.json();
            console.error("Gemini API error:", errorData);
            errorMessage = errorData.error?.message || response.statusText;
          } catch (parseError) {
            errorMessage = response.statusText || "Unknown API error";
          }
        }

        // Fall back to demo response if API fails
        console.log("All Gemini models failed, using demo response instead");
        console.log("Last error message:", errorMessage);

        // Check if it's a quota/billing issue
        if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('exceeded')) {
          // Show user-friendly message about API key limits
          const quotaResponse = {
            content: `
              <h3>🤖 Kana AI Assistant</h3>
              <div style="background: rgba(255, 200, 100, 0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #ff9800; margin: 10px 0;">
                <h4>⚠️ API Quota Exceeded</h4>
                <p>The AI service has reached its usage limit. Here's what you can do:</p>
                <ul>
                  <li><strong>Wait a few minutes</strong> - Quotas often reset automatically</li>
                  <li><strong>Try again later</strong> - Daily limits reset at midnight Pacific Time</li>
                  <li><strong>Use extension options</strong> - Add your own Gemini API key for unlimited usage</li>
                </ul>
                <p>💡 <strong>Meanwhile, I can still help!</strong> I found ${this.realYouTubeFinder ? 'real educational videos' : 'learning resources'} for you.</p>
              </div>
              <h4>📚 Learning Guidance for Unity UI</h4>
              <p>Based on what I can see on your screen, here are some ways to understand Unity UI better:</p>
              <ul>
                <li><strong>Start with Canvas:</strong> The Canvas is the root component for all UI elements</li>
                <li><strong>UI Elements:</strong> Buttons, Images, and Text are the building blocks</li>
                <li><strong>Layout Groups:</strong> Use these to organize and position elements automatically</li>
                <li><strong>Event System:</strong> Handles user interactions like clicks and touches</li>
              </ul>
              <h4>🎥 Recommended Learning</h4>
              <p>Search YouTube for these specific tutorials:</p>
              <ul>
                <li>"Unity Canvas and UI System tutorial"</li>
                <li>"Unity Button Events and OnClick"</li>
                <li>"Unity UI Layout Groups explained"</li>
                <li>"Unity UI Responsive Design"</li>
              </ul>
              <p><em>💡 Tip: Unity's official documentation and Unity Learn platform also have excellent UI tutorials!</em></p>
            `,
            videoData: null,
            hasRealContent: true
          };
          this.showResponse(quotaResponse);
          this.updateOrbState('idle');
          return quotaResponse;
        }

        const demoResponse = this.generateSafeDemoResponse(userQuestion, pageContent, platform, `All Gemini models failed: ${errorMessage}`);
        this.showResponse(demoResponse);
        this.updateOrbState('idle');
        return demoResponse;
      }
    } catch (error) {
      console.error("AI processing error:", error);

      // Use error handler if available
      if (this.errorHandler) {
        const errorStrategy = await this.errorHandler.handleError(error, {
          context: 'AI_PROCESSING',
          userQuestion,
          platform
        });

        if (errorStrategy.shouldRetry && errorStrategy.retryCount < 3) {
          setTimeout(() => {
            this.processWithAI({
              ...context,
              retryCount: errorStrategy.retryCount
            });
          }, errorStrategy.retryDelay);
          return;
        }
      }

      // Generate safe demo response
      const demoResponse = this.generateSafeDemoResponse(userQuestion, pageContent, platform, error.message);
      this.showResponse(demoResponse);
      this.updateOrbState('idle');
      return demoResponse;
    }
  }

  generateSafeDemoResponse(userQuestion, pageContent, platform, errorMessage) {
    // Use modular demo response generator if available
    if (this.demoResponseGenerator) {
      return this.demoResponseGenerator.generateSafeResponse(userQuestion, pageContent, platform, errorMessage);
    }

    // Fallback to basic safe response without potentially fake URLs
    return {
      type: 'learning_guidance',
      title: 'Learning Support',
      content: `
        <div class="kana-learning-help">
          <h3>🎯 Let me help you learn!</h3>
          <p>I see you're asking about: <strong>"${userQuestion.substring(0, 100)}${userQuestion.length > 100 ? '...' : ''}"</strong></p>
          
          <h4>📚 Study Strategy</h4>
          <ul>
            <li>Break complex problems into smaller parts</li>
            <li>Look for patterns or similar examples</li>
            <li>Practice with what you know</li>
            <li>Ask specific questions about confusing parts</li>
          </ul>
          
          <p><strong>What specific part would you like help understanding better?</strong></p>
          <p><em>Note: AI features are temporarily unavailable. Full functionality will return shortly.</em></p>
        </div>
      `,
      resources: [],
      encouragement: "Every expert was once a beginner. You're doing great by asking questions!",
      hasValidatedContent: true,
      containsYouTubeUrls: false
    };
  }

  generateDemoResponse(userQuestion, pageContent, platform, errorMessage) {
    // Generate a helpful response when API isn't working
    const subject = this.detectSubject(userQuestion, pageContent);

    // Check if it's a rate limit error specifically
    const isRateLimitError = errorMessage && (
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('Too Many Requests') ||
      errorMessage.includes('Service Unavailable')
    );

    // Generate subject-specific resources
    const subjectResources = this.getSubjectResources(subject, userQuestion);

    return {
      type: 'learning_guidance',
      title: `Learning Support${subject ? ` for ${subject}` : ''}`,
      content: `
        <div class="kana-learning-help">
          <h3>🎯 Let me help you learn!</h3>
          
          <p>I see you're asking about: <strong>"${userQuestion.substring(0, 100)}${userQuestion.length > 100 ? '...' : ''}"</strong></p>
          
          <h4>📚 Study Strategy</h4>
          <p>Here's how to approach this type of question:</p>
          <ul>
            <li><strong>Break it down:</strong> What are the key concepts involved?</li>
            <li><strong>Find patterns:</strong> Look for similar examples in your materials</li>
            <li><strong>Practice:</strong> Try solving step-by-step with what you know</li>
            <li><strong>Ask specific questions:</strong> What particular part is confusing?</li>
          </ul>
          
          <h4>💡 Learning Tips</h4>
          <ul>
            <li>Review related concepts and definitions first</li>
            <li>Look for worked examples or practice problems</li>
            <li>Try explaining the concept in your own words</li>
            <li>Don't hesitate to seek help with specific parts you don't understand</li>
          </ul>
          
          ${pageContent.headings && pageContent.headings.length > 0 ? `
          <h4>📄 Page Topics I Found</h4>
          <p>This page covers: ${pageContent.headings.slice(0, 3).join(', ')}</p>
          ` : ''}
          
          <p><strong>What specific part would you like help understanding better?</strong></p>
          
          ${isRateLimitError ?
          '<p><em>Note: AI features are temporarily limited due to high usage.</em></p>' :
          '<p><em>Note: Working in offline mode - full AI features will return shortly.</em></p>'
        }
        </div>
      `,
      resources: subjectResources,
      encouragement: "Every expert was once a beginner. You're doing great by asking questions!"
    };
  }

  // ...existing code...
  // ...existing code...

  extractKeyTerms(pageContent, count = 3) {
    // Extract likely key terms from the page content
    const allText = pageContent.title + ' ' +
      pageContent.headings.map(h => h.text).join(' ') + ' ' +
      pageContent.text.join(' ');

    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    // Sort by frequency
    const sortedWords = Object.entries(words)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    // Filter out common words
    const commonWords = ['that', 'this', 'with', 'from', 'your', 'have', 'will', 'what', 'about', 'which', 'when', 'there'];
    const filteredWords = sortedWords.filter(word => !commonWords.includes(word));

    // Capitalize first letter
    return filteredWords
      .slice(0, count)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .filter(Boolean);
  }

  // Helper methods for technical domain enhancement (all fields)
  getTechnicalTerms() {
    return [
      // Programming Languages
      'JavaScript', 'Python', 'Java', 'C#', 'C++', 'TypeScript', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      // Web Development
      'HTML', 'CSS', 'React', 'Vue', 'Angular', 'Node.js', 'Express', 'REST API', 'GraphQL', 'webpack', 'responsive design',
      // Data Science & AI
      'machine learning', 'neural network', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'algorithm',
      // Game Development
      'Unity', 'Unreal', 'game engine', 'GameObject', 'physics', 'rendering', 'shader', 'animation', 'collision',
      // VR/AR/XR
      'VR', 'AR', 'MR', 'XR', '3DOF', '6DOF', 'spatial computing', 'immersive', 'tracking', 'haptic feedback',
      // Mobile Development
      'iOS', 'Android', 'React Native', 'Flutter', 'Xamarin', 'mobile app', 'responsive', 'touch interface',
      // Database & Backend
      'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'database', 'backend', 'server', 'API', 'microservices',
      // DevOps & Cloud
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'deployment', 'cloud computing', 'serverless',
      // Cybersecurity
      'encryption', 'authentication', 'authorization', 'firewall', 'penetration testing', 'vulnerability',
      // UI/UX Design
      'user interface', 'user experience', 'wireframe', 'prototype', 'usability', 'accessibility', 'design system'
    ];
  }

  getEducationalVideos(topic) {
    const videoMappings = {
      // Programming
      'javascript': 'JavaScript fundamentals tutorial',
      'python': 'Python programming for beginners',
      'java': 'Java programming tutorial',
      'c#': 'C# programming fundamentals',
      'web development': 'Full stack web development course',
      'react': 'React.js complete tutorial',

      // Data Science
      'machine learning': 'Machine learning explained',
      'data science': 'Data science fundamentals',
      'neural networks': 'Neural networks explained',
      'algorithms': 'Algorithms and data structures',

      // Game Development
      'unity': 'Unity game development tutorial',
      'game development': 'Game development fundamentals',
      'game design': 'Game design principles',

      // Mobile
      'mobile development': 'Mobile app development tutorial',
      'ios development': 'iOS app development Swift',
      'android development': 'Android app development tutorial',

      // DevOps
      'docker': 'Docker containerization tutorial',
      'kubernetes': 'Kubernetes explained',
      'aws': 'AWS cloud computing basics',

      // Database
      'sql': 'SQL database tutorial',
      'database design': 'Database design fundamentals',
      'mongodb': 'MongoDB NoSQL tutorial',

      // Cybersecurity
      'cybersecurity': 'Cybersecurity fundamentals',
      'encryption': 'Encryption and cryptography explained',
      'network security': 'Network security basics',

      // UI/UX
      'ui design': 'UI design principles tutorial',
      'ux design': 'UX design fundamentals',
      'design thinking': 'Design thinking process'
    };

    // Find the best match or use the topic directly
    for (const [key, video] of Object.entries(videoMappings)) {
      if (topic.toLowerCase().includes(key)) {
        return video;
      }
    }
    return `${topic} tutorial explained`;
  }

  getTechnicalDocumentation(topic) {
    const docMappings = {
      // Programming Languages
      'javascript': 'Check MDN Web Docs for JavaScript reference',
      'python': 'Refer to Python official documentation',
      'java': 'Check Oracle Java documentation',
      'c#': 'Refer to Microsoft C# documentation',
      'typescript': 'Check TypeScript handbook',

      // Web Development
      'react': 'Check React official documentation',
      'vue': 'Refer to Vue.js official guide',
      'angular': 'Check Angular official documentation',
      'node': 'Refer to Node.js documentation',
      'html': 'Check MDN HTML reference',
      'css': 'Refer to MDN CSS documentation',

      // Data Science
      'machine learning': 'Check scikit-learn documentation',
      'pandas': 'Refer to pandas official documentation',
      'numpy': 'Check NumPy documentation',
      'tensorflow': 'Refer to TensorFlow documentation',

      // Game Development
      'unity': 'Check Unity official documentation and scripting API',
      'unreal': 'Refer to Unreal Engine documentation',

      // Mobile Development
      'ios': 'Check Apple Developer documentation',
      'android': 'Refer to Android Developer guides',
      'flutter': 'Check Flutter documentation',

      // Database
      'sql': 'Refer to W3Schools SQL tutorial or database vendor docs',
      'mongodb': 'Check MongoDB official documentation',
      'postgresql': 'Refer to PostgreSQL documentation',

      // DevOps & Cloud
      'docker': 'Check Docker official documentation',
      'kubernetes': 'Refer to Kubernetes documentation',
      'aws': 'Check AWS documentation',
      'azure': 'Refer to Microsoft Azure documentation',

      // General Programming
      'algorithms': 'Check algorithm visualization sites like VisuAlgo',
      'data structures': 'Refer to computer science textbooks and online courses'
    };

    for (const [key, doc] of Object.entries(docMappings)) {
      if (topic.toLowerCase().includes(key)) {
        return doc;
      }
    }
    return 'Check the relevant official documentation and community resources';
  }

  detectTechnicalContext(userQuestion, pageContent, prioritizedContent) {
    const technicalIndicators = [
      // Programming languages
      'javascript', 'python', 'java', 'c#', 'c++', 'typescript', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin',
      // Web technologies
      'html', 'css', 'react', 'vue', 'angular', 'node.js', 'express', 'api', 'rest', 'graphql', 'json',
      // Development concepts
      'function', 'variable', 'object', 'class', 'method', 'algorithm', 'database', 'server', 'frontend', 'backend',
      // Game development
      'unity', 'unreal', 'game', 'gameobject', 'physics', 'animation', 'shader', 'rendering', 'collision',
      // VR/AR
      'vr', 'ar', 'xr', 'virtual reality', 'augmented reality', 'dof', 'tracking', 'immersive',
      // Data science
      'machine learning', 'ai', 'neural network', 'data analysis', 'pandas', 'numpy', 'tensorflow',
      // Mobile development
      'ios', 'android', 'flutter', 'react native', 'mobile app',
      // DevOps
      'docker', 'kubernetes', 'aws', 'azure', 'deployment', 'ci/cd', 'cloud'
    ];

    const questionLower = userQuestion.toLowerCase();
    const pageText = pageContent.text ? pageContent.text.join(' ').toLowerCase() : '';
    const pageTitle = pageContent.title ? pageContent.title.toLowerCase() : '';

    // Check user question for technical terms
    const questionHasTech = technicalIndicators.some(term => questionLower.includes(term));

    // Check page content for technical terms
    const pageHasTech = technicalIndicators.some(term =>
      pageText.includes(term) || pageTitle.includes(term)
    );

    // Check prioritized content if available
    let prioritizedHasTech = false;
    if (prioritizedContent) {
      const prioritizedText = prioritizedContent.highPriority?.text
        ?.map(t => t.text)
        ?.join(' ')
        ?.toLowerCase() || '';
      prioritizedHasTech = technicalIndicators.some(term => prioritizedText.includes(term));
    }

    return questionHasTech || pageHasTech || prioritizedHasTech;
  }

  identifyTechnicalDomain(userQuestion, pageContent) {
    const domains = {
      'Web Development': ['html', 'css', 'javascript', 'react', 'vue', 'angular', 'node.js', 'frontend', 'backend', 'api'],
      'Game Development': ['unity', 'unreal', 'game', 'gameobject', 'physics', 'animation', 'rendering'],
      'VR/AR Development': ['vr', 'ar', 'xr', 'virtual reality', 'augmented reality', 'immersive', 'tracking'],
      'Data Science': ['machine learning', 'ai', 'data analysis', 'pandas', 'numpy', 'tensorflow', 'neural network'],
      'Mobile Development': ['ios', 'android', 'flutter', 'react native', 'mobile app', 'swift', 'kotlin'],
      'Programming': ['python', 'java', 'c#', 'c++', 'algorithm', 'function', 'variable', 'object', 'class'],
      'DevOps': ['docker', 'kubernetes', 'aws', 'azure', 'deployment', 'ci/cd', 'cloud', 'server']
    };

    const combinedText = (userQuestion + ' ' +
      (pageContent.title || '') + ' ' +
      (pageContent.text ? pageContent.text.join(' ') : '')).toLowerCase();

    for (const [domain, keywords] of Object.entries(domains)) {
      if (keywords.some(keyword => combinedText.includes(keyword))) {
        return domain;
      }
    }

    return null;
  }

  prepareGeminiPrompt(userQuestion, pageContent, platform, prioritizedContent = null, relevantVisibleContent = null) {
    // Create a simple, flexible prompt that trusts Gemini 2.5's understanding
    let prompt = `You are Kana, an intelligent AI learning assistant. You help students learn by providing guidance, hints, and asking thought-provoking questions rather than giving direct answers.

CONTEXT:
Platform: ${platform}
Page: ${pageContent.title || 'Learning content'}
Student Question: "${userQuestion}"

Your Role: Analyze the page content to understand what subject the student is studying, then provide educational guidance appropriate to that context. Focus on helping them learn and understand rather than just getting answers.`;

    // Add conversation context for follow-up questions
    if (this.conversationContext.previousQuestions.length > 0) {
      prompt += `

CONVERSATION CONTEXT:
Previous Questions: ${this.conversationContext.previousQuestions.slice(-2).join(', ')}`;

      if (this.conversationContext.currentTopic) {
        prompt += `
Current Topic: ${this.conversationContext.currentTopic}`;
      }

      if (this.conversationContext.lastResponse) {
        prompt += `
Previous Response Summary: ${this.conversationContext.lastResponse.substring(0, 200)}...`;
      }
    }

    // Add current section information with enhanced detail
    if (prioritizedContent && prioritizedContent.currentSection) {
      const section = prioritizedContent.currentSection;

      if (section.type === 'question' && section.questionNumber) {
        prompt += `
Current Question: Question #${section.questionNumber}
Question Text: "${section.text}"`;

        if (section.fullText && section.fullText !== section.text) {
          prompt += `
Full Question Content: "${section.fullText}"`;
        }
      } else {
        prompt += `
Current Section: "${section.text}"`;
      }
    }

    // Add visible headings for additional context
    if (prioritizedContent && prioritizedContent.visibleHeadings && prioritizedContent.visibleHeadings.length > 0) {
      const headings = prioritizedContent.visibleHeadings.map(h => h.text).slice(0, 3).join(', ');
      prompt += `
Other Visible Sections: ${headings}`;
    }

    // Add visible questions if any
    if (relevantVisibleContent && relevantVisibleContent.questions.length > 0) {
      prompt += `
Related Questions Visible:
${relevantVisibleContent.questions.slice(0, 3).map((q, i) =>
        `${i + 1}. ${q.text.substring(0, 150)}${q.text.length > 150 ? '...' : ''}`
      ).join('\n')}`;
    }

    // Add main page content for context - prioritize what matters
    if (pageContent.visibleText && pageContent.visibleText.length > 0) {
      console.log('🔍 Adding page content to prompt:', pageContent.visibleText.length, 'items');

      // Get the most relevant content - prioritize by element type and content quality
      const prioritizedContent = pageContent.visibleText
        .sort((a, b) => {
          // Prioritize headings and structured content
          const aScore = (a.tag.match(/h[1-6]/) ? 10 : 0) +
            (a.tag === 'p' ? 5 : 0) +
            (a.text.length > 50 ? 3 : 0) +
            (a.isVisible ? 2 : 0);
          const bScore = (b.tag.match(/h[1-6]/) ? 10 : 0) +
            (b.tag === 'p' ? 5 : 0) +
            (b.text.length > 50 ? 3 : 0) +
            (b.isVisible ? 2 : 0);
          return bScore - aScore;
        })
        .slice(0, 15) // Take top 15 most relevant pieces
        .map(item => item.text.substring(0, 500)) // Generous length
        .join(' ... ');

      if (prioritizedContent.length > 0) {
        prompt += `

Current Page Content:
${prioritizedContent}`;
        console.log('🔍 DEBUG: Prioritized content being sent to AI:', prioritizedContent.substring(0, 500) + '...');
      }
    } else if (pageContent.text && pageContent.text.length > 0) {
      // Ultimate fallback - use any text content available
      const fallbackText = pageContent.text
        .slice(0, 3)
        .map(text => text.substring(0, 250))
        .join(' ... ');
      prompt += `
Page Text Content: ${fallbackText}`;
    }

    // Add general page context
    if (pageContent.headings && pageContent.headings.length > 0) {
      prompt += `
All Page Topics: ${pageContent.headings.slice(0, 5).join(', ')}`;
    }

    prompt += `

GUIDELINES FOR RESPONSE:
- Focus on the EXACT content the student is currently viewing on their screen
- Look at the page title and main headings to understand the core topic
- Provide educational guidance that encourages learning and critical thinking
- Help them understand concepts without giving direct answers
- Use encouraging, supportive language
- When helpful, suggest relevant educational resources like:
  - Official documentation
  - Educational platforms (Khan Academy, Coursera, etc.)
  - Practice sites and communities
- Be generous with learning materials - students benefit from multiple resources
- Respond naturally and conversationally

YOUTUBE VIDEO INTEGRATION:
When educational videos would genuinely help the student understand the current topic better, use this EXACT format:
{{YOUTUBE_SEARCH:specific search term}}

For example:
- If they're confused about entrepreneurial mindset: {{YOUTUBE_SEARCH:entrepreneurial mindset explained}}
- If they need help with business fundamentals: {{YOUTUBE_SEARCH:business fundamentals for beginners}}
- If they're studying programming concepts: {{YOUTUBE_SEARCH:javascript fundamentals tutorial}}

The system will automatically search for and open relevant educational videos. Use specific, focused search terms that match what the student is learning about.

Focus entirely on what they're currently viewing and provide specific, helpful guidance for that exact content.`;

    return prompt;
  }

  prepareVoicePrompt(userQuestion, pageContent, platform, prioritizedContent = null, relevantVisibleContent = null) {
    // Create a conversational voice prompt with memory and context awareness

    // Ensure voice context memory is initialized
    if (!this.voiceContextMemory) {
      console.log('🎤⚠️ Voice context memory not found, initializing...');
      this.voiceContextMemory = {
        pageTitle: document.title,
        pageUrl: window.location.href,
        previousTopics: [],
        screenReferences: [],
        lastMentionedContent: null,
        conversationStarted: false,
        firstInteraction: true
      };
    }

    // Check if this is a follow-up question or reference to previous content
    const isFollowUpQuestion = this.isFollowUpQuestion(userQuestion);
    const screenReferences = this.findScreenReferences(userQuestion, pageContent);

    let prompt = `You are Kana, a conversational AI learning assistant. `;

    // Add conversation context if this isn't the first interaction
    if (!this.voiceContextMemory.firstInteraction) {
      prompt += `You're having an ongoing conversation with a student. `;

      // Add recent conversation context
      if (this.voiceConversationHistory.length > 0) {
        const recentContext = this.voiceConversationHistory
          .slice(-4) // Last 4 messages
          .filter(msg => msg && msg.speaker && msg.message) // Filter out invalid messages
          .map(msg => `${msg.speaker}: ${String(msg.message || '').substring(0, 100)}`)
          .join('\n');

        if (recentContext.trim()) {
          prompt += `

RECENT CONVERSATION:
${recentContext}
`;
        }
      }

      // Add remembered topics and references
      if (this.voiceContextMemory.previousTopics.length > 0) {
        prompt += `
TOPICS WE'VE DISCUSSED: ${this.voiceContextMemory.previousTopics.join(', ')}
`;
      }

      if (this.voiceContextMemory.screenReferences.length > 0) {
        prompt += `
SCREEN CONTENT WE'VE REFERENCED: ${this.voiceContextMemory.screenReferences.slice(-3).join(', ')}
`;
      }
    }

    prompt += `

CURRENT SCREEN CONTEXT:
Platform: ${platform}
Page Title: "${pageContent.title || 'Learning content'}"
URL: ${pageContent.url || ''}

STUDENT'S QUESTION: "${userQuestion}"
`;

    // Add specific screen references if found
    if (screenReferences.length > 0) {
      prompt += `
SPECIFIC CONTENT STUDENT IS REFERENCING:
${screenReferences.join('\n')}
`;
    }

    prompt += `
WHAT I CAN SEE ON THEIR SCREEN:`;

    // Use prioritized content if available (viewport-aware), otherwise fall back to regular content
    if (prioritizedContent && typeof prioritizedContent === 'object' && prioritizedContent.highPriority) {
      // Process the structured prioritized content from prioritizeVisibleContent method
      const prioritizedText = [];

      // Add high priority content first (what's currently in viewport)
      if (prioritizedContent.highPriority.questions && prioritizedContent.highPriority.questions.length > 0) {
        prioritizedText.push('CURRENT QUESTIONS/TASKS:');
        prioritizedContent.highPriority.questions.forEach((q, i) => {
          prioritizedText.push(`${i + 1}. ${q.text}`);
        });
      }

      if (prioritizedContent.highPriority.headings && prioritizedContent.highPriority.headings.length > 0) {
        prioritizedText.push('CURRENT SECTIONS:');
        prioritizedContent.highPriority.headings.forEach(h => {
          prioritizedText.push(`- ${h.text}`);
        });
      }

      if (prioritizedContent.highPriority.text && prioritizedContent.highPriority.text.length > 0) {
        prioritizedText.push('CURRENT VISIBLE CONTENT:');
        prioritizedContent.highPriority.text.slice(0, 5).forEach(t => {
          prioritizedText.push(`${t.text.substring(0, 200)}`);
        });
      }

      // Add current section info if available
      if (prioritizedContent.currentSection) {
        prioritizedText.unshift(`CURRENT SECTION: "${prioritizedContent.currentSection.text}" (${prioritizedContent.currentSection.type})`);
      }

      const formattedContent = prioritizedText.join('\n');
      prompt += `

CURRENT VIEWPORT CONTENT (prioritized by user's scroll position):
${formattedContent}`;
      console.log('🎤🔍 Using structured prioritized content for voice:', formattedContent.substring(0, 200) + '...');
    } else if (relevantVisibleContent && relevantVisibleContent.length > 0) {
      // Use relevant visible content as secondary option
      const relevantContent = relevantVisibleContent
        .slice(0, 10)
        .map(item => `${(item.tag || 'TEXT').toUpperCase()}: ${item.text.substring(0, 200)}`)
        .join('\n');

      prompt += `

RELEVANT VISIBLE CONTENT:
${relevantContent}`;
      console.log('🎤🔍 Using relevant visible content for voice');
    } else if (pageContent.visibleText && pageContent.visibleText.length > 0) {
      // Fallback to all visible content - use SAME logic as text mode for consistency
      const prioritizedContent = pageContent.visibleText
        .sort((a, b) => {
          // Prioritize headings and structured content (same as text mode)
          const aScore = (a.tag.match(/h[1-6]/) ? 10 : 0) +
            (a.tag === 'p' ? 5 : 0) +
            (a.text.length > 50 ? 3 : 0) +
            (a.isVisible ? 2 : 0);
          const bScore = (b.tag.match(/h[1-6]/) ? 10 : 0) +
            (b.tag === 'p' ? 5 : 0) +
            (b.text.length > 50 ? 3 : 0) +
            (b.isVisible ? 2 : 0);
          return bScore - aScore;
        })
        .slice(0, 15) // Take top 15 most relevant pieces (same as text mode)
        .map(item => item.text.substring(0, 500)) // Generous length (same as text mode)
        .join(' ... ');

      if (prioritizedContent.length > 0) {
        prompt += `

VISIBLE CONTENT ON SCREEN (same prioritization as text mode):
${prioritizedContent}`;
        console.log('🎤🔍 Using text-mode compatible prioritization for voice:', prioritizedContent.substring(0, 200) + '...');
      }
    }

    // Add headings for structure
    if (pageContent.headings && pageContent.headings.length > 0) {
      const headings = pageContent.headings.slice(0, 8)
        .filter(h => h && h.text)
        .map(h => h.text)
        .join('\n- ');

      if (headings) {
        prompt += `

MAIN HEADINGS/SECTIONS:
- ${headings}`;
      }
    }

    // Add questions if this is a learning/quiz context
    if (pageContent.questions && pageContent.questions.length > 0) {
      const questions = pageContent.questions.slice(0, 5)
        .filter(q => q && q.text)
        .map((q, i) => `${i + 1}. ${q.text}`)
        .join('\n');

      if (questions) {
        prompt += `

QUESTIONS/EXERCISES VISIBLE:
${questions}`;
      }
    }

    // Add learning objectives or assignments
    if (pageContent.learningObjectives && pageContent.learningObjectives.length > 0) {
      const objectives = pageContent.learningObjectives.slice(0, 5).join('\n- ');
      prompt += `

LEARNING OBJECTIVES:
- ${objectives}`;
    }

    if (pageContent.assignments && pageContent.assignments.length > 0) {
      const assignments = pageContent.assignments.slice(0, 3).join('\n- ');
      prompt += `

ASSIGNMENTS/TASKS:
- ${assignments}`;
    }

    // Add code blocks if present
    if (pageContent.codeBlocks && pageContent.codeBlocks.length > 0) {
      const codeInfo = pageContent.codeBlocks.slice(0, 3)
        .filter(code => code && code.content)
        .map(code =>
          `${code.language || 'code'}: ${code.content.substring(0, 150)}...`
        ).join('\n');

      if (codeInfo) {
        prompt += `

CODE EXAMPLES:
${codeInfo}`;
      }
    }

    // Dynamic instructions based on context
    prompt += `

INSTRUCTIONS:
`;

    if (this.voiceContextMemory.firstInteraction) {
      prompt += `1. This is your first interaction - briefly acknowledge what you see on their screen
2. Reference specific content they're looking at to show you understand their context
3. Be welcoming but focus on helping with their current screen content
`;
      // Mark that we've had our first interaction
      this.voiceContextMemory.firstInteraction = false;
    } else {
      prompt += `1. Continue our conversation naturally - don't repeat screen introductions
2. Reference our previous discussion if relevant to their current question
3. Focus on their specific question about the content we can both see
`;
    }

    prompt += `4. ${isFollowUpQuestion ? 'Build on our previous discussion and' : ''} Provide helpful, conversational guidance
5. Reference specific sections, headings, or content by name when possible
6. Keep response under 250 words and conversational for voice
7. If they mention "this", "that", "here", try to identify what they're referring to from screen content
8. Be encouraging and educational, building on what we've already covered

Respond naturally as if you're looking at their screen with them:`;

    return prompt;
  }

  // Voice conversation memory methods
  isFollowUpQuestion(userQuestion) {
    // Check if the question appears to be following up on a previous topic
    const followUpIndicators = [
      'what about', 'and', 'also', 'but', 'however', 'though', 'can you explain',
      'what does', 'how about', 'tell me more', 'expand on', 'elaborate',
      'this', 'that', 'it', 'they', 'these', 'those', 'here', 'there'
    ];

    const question = userQuestion.toLowerCase();
    return followUpIndicators.some(indicator => question.includes(indicator));
  }

  findScreenReferences(userQuestion, pageContent) {
    // Find specific content on screen that the user might be referencing
    const references = [];
    const question = userQuestion.toLowerCase();

    // Check for direct text matches in headings
    if (pageContent.headings) {
      pageContent.headings.forEach(heading => {
        if (heading.text && question.includes(heading.text.toLowerCase().substring(0, 20))) {
          references.push(`HEADING: ${heading.text}`);
        }
      });
    }

    // Check for mentions of questions or exercises
    if (pageContent.questions) {
      pageContent.questions.forEach((q, index) => {
        if (q.text && question.includes(q.text.toLowerCase().substring(0, 30))) {
          references.push(`QUESTION ${index + 1}: ${q.text}`);
        }
      });
    }

    // Check for references to visible text content
    if (pageContent.visibleText) {
      pageContent.visibleText.slice(0, 10).forEach(item => {
        if (item.text && item.text.length > 10) {
          const contentWords = item.text.toLowerCase().split(' ').slice(0, 5);
          if (contentWords.some(word => word.length > 3 && question.includes(word))) {
            references.push(`CONTENT: ${item.text.substring(0, 100)}`);
          }
        }
      });
    }

    return references.slice(0, 3); // Limit to 3 most relevant references
  }

  updateVoiceConversationMemory(userQuestion, aiResponse, pageContent) {
    // Update conversation memory with new interaction

    // Ensure voice context memory is initialized
    if (!this.voiceContextMemory) {
      console.log('🎤⚠️ Voice context memory not found in updateVoiceConversationMemory, initializing...');
      this.voiceContextMemory = {
        pageTitle: document.title,
        pageUrl: window.location.href,
        previousTopics: [],
        screenReferences: [],
        lastMentionedContent: null,
        conversationStarted: false,
        firstInteraction: true
      };
    }

    // Add to conversation history
    if (!this.voiceConversationHistory) {
      this.voiceConversationHistory = [];
    }

    this.voiceConversationHistory.push({
      role: 'user',
      text: userQuestion,
      timestamp: Date.now()
    });

    this.voiceConversationHistory.push({
      role: 'assistant',
      text: aiResponse,
      timestamp: Date.now()
    });

    // Keep only last 10 messages to prevent memory bloat
    if (this.voiceConversationHistory.length > 10) {
      this.voiceConversationHistory = this.voiceConversationHistory.slice(-10);
    }

    // Extract and store topics mentioned
    const topics = this.extractTopicsFromInteraction(userQuestion, aiResponse, pageContent);
    topics.forEach(topic => {
      if (!this.voiceContextMemory.previousTopics.includes(topic)) {
        this.voiceContextMemory.previousTopics.push(topic);
      }
    });

    // Keep only last 8 topics
    if (this.voiceContextMemory.previousTopics.length > 8) {
      this.voiceContextMemory.previousTopics = this.voiceContextMemory.previousTopics.slice(-8);
    }

    // Store screen references mentioned
    const screenRefs = this.findScreenReferences(userQuestion, pageContent);
    screenRefs.forEach(ref => {
      if (!this.voiceContextMemory.screenReferences.includes(ref)) {
        this.voiceContextMemory.screenReferences.push(ref);
      }
    });

    // Keep only last 6 screen references
    if (this.voiceContextMemory.screenReferences.length > 6) {
      this.voiceContextMemory.screenReferences = this.voiceContextMemory.screenReferences.slice(-6);
    }
  }

  extractTopicsFromInteraction(userQuestion, aiResponse, pageContent) {
    // Extract key topics from the conversation
    const topics = [];

    // Get main topic from page title
    if (pageContent.title) {
      const title = pageContent.title.toLowerCase();
      if (title.length > 5 && title.length < 50) {
        topics.push(pageContent.title);
      }
    }

    // Extract topics from headings mentioned
    if (pageContent.headings) {
      pageContent.headings.slice(0, 3).forEach(heading => {
        if (heading.text && (
          userQuestion.toLowerCase().includes(heading.text.toLowerCase().substring(0, 15)) ||
          aiResponse.toLowerCase().includes(heading.text.toLowerCase().substring(0, 15))
        )) {
          topics.push(heading.text);
        }
      });
    }

    // Extract key terms from user question
    const keyTerms = userQuestion.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    keyTerms.forEach(term => {
      if (term.length > 3 && term.length < 20) {
        topics.push(term);
      }
    });

    return topics.slice(0, 3); // Limit to 3 most relevant topics
  }

  generateVoiceFallbackResponse(userQuestion, pageContent) {
    // Generate a fallback response based on visible content when AI fails
    const title = pageContent.title || 'this page';
    const platform = this.identifyLMSPlatform();

    if (pageContent.questions && pageContent.questions.length > 0) {
      return `I can see you're working on ${title}. There are ${pageContent.questions.length} questions visible on your screen. Which specific question would you like help with?`;
    }

    if (pageContent.headings && pageContent.headings.length > 0) {
      const mainTopic = pageContent.headings[0].text;
      return `I can see you're studying ${mainTopic} on ${title}. What specific part of this topic would you like me to help explain?`;
    }

    if (pageContent.visibleText && pageContent.visibleText.length > 0) {
      return `I can see you're on ${title}. Based on what's visible on your screen, what would you like me to help you understand better?`;
    }

    return `I can see you're on ${title}. Could you tell me what specific part you'd like help with?`;
  }

  addToVoiceConversation(speaker, message) {
    // Add message to voice conversation history
    if (!this.voiceConversationHistory) {
      this.voiceConversationHistory = [];
    }

    // Validate inputs before adding
    if (!speaker || (!message && message !== '')) {
      console.warn('🎤⚠️ Invalid voice conversation entry - skipping:', { speaker, message });
      return;
    }

    // Ensure message is a string
    const messageStr = String(message || '');

    this.voiceConversationHistory.push({
      speaker: speaker,
      message: messageStr,
      timestamp: new Date().toISOString()
    });

    // Keep only last 10 messages to prevent memory issues
    if (this.voiceConversationHistory.length > 10) {
      this.voiceConversationHistory = this.voiceConversationHistory.slice(-10);
    }

    // Update voice UI if expanded to show conversation
    this.updateVoiceConversationDisplay();
  }

  updateVoiceConversationDisplay() {
    if (!this.voiceUI || !this.isExpanded) return;

    const conversationContainer = this.voiceUI.querySelector('.kana-voice-conversation-mini');
    if (!conversationContainer) return;

    // Ensure voiceConversationHistory is initialized
    if (!this.voiceConversationHistory) {
      this.voiceConversationHistory = [];
      return;
    }

    // Show last 3 messages in mini display
    const recentMessages = this.voiceConversationHistory.slice(-3);
    conversationContainer.innerHTML = recentMessages
      .filter(msg => msg && msg.message && msg.speaker) // Filter out invalid messages
      .map(msg => {
        const message = String(msg.message || ''); // Ensure message is a string
        const truncatedMessage = message.length > 100 ? message.substring(0, 100) + '...' : message;
        return `<div class="voice-msg voice-msg-${msg.speaker}">
          <div class="voice-msg-text">${truncatedMessage}</div>
        </div>`;
      }).join('');
  }

  buildConversationContext() {
    // Build context from recent voice conversation
    if (!this.voiceConversationHistory || this.voiceConversationHistory.length === 0) {
      return 'This is the start of our conversation.';
    }

    const recentMessages = this.voiceConversationHistory.slice(-4);
    const contextLines = recentMessages
      .filter(msg => msg && msg.speaker && msg.message) // Filter out invalid messages
      .map(msg => {
        const message = String(msg.message || ''); // Ensure message is a string
        return `${msg.speaker}: ${message.substring(0, 150)}`;
      });

    return `Recent conversation:\n${contextLines.join('\n')}`;
  }

  // Helper method to extract text from unknown response structures
  extractTextFromResponse(responseObj) {
    try {
      // Recursive function to find text in nested objects
      const findText = (obj, maxDepth = 3) => {
        if (maxDepth <= 0) return null;

        if (typeof obj === 'string') {
          return obj;
        }

        if (typeof obj === 'object' && obj !== null) {
          // Check common text field names
          const textFields = ['text', 'content', 'message', 'response', 'answer', 'data'];
          for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string') {
              return obj[field];
            }
          }

          // Check for arrays that might contain text
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const result = findText(item, maxDepth - 1);
              if (result) return result;
            }
          } else {
            // Check all properties recursively
            for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                const result = findText(obj[key], maxDepth - 1);
                if (result) return result;
              }
            }
          }
        }

        return null;
      };

      return findText(responseObj);
    } catch (error) {
      console.error("Error extracting text from response:", error);
      return null;
    }
  }

  async parseGeminiResponse(aiResponseText, questionContext) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
      }

      // PROCESS YOUTUBE SEARCH REQUESTS
      const youtubeSearchPattern = /\{\{YOUTUBE_SEARCH:([^}]+)\}\}/g;
      const searchRequests = [];
      let match;

      // Find all YouTube search requests
      while ((match = youtubeSearchPattern.exec(cleanedResponse)) !== null) {
        searchRequests.push({
          fullMatch: match[0],
          searchTerm: match[1].trim()
        });
      }

      // Process YouTube searches if found
      if (searchRequests.length > 0) {
        this.log(`Found ${searchRequests.length} YouTube search requests`);

        for (const request of searchRequests) {
          try {
            // Use the Live YouTube Searcher to get real videos
            let videos = [];

            if (this.liveYouTubeSearcher) {
              this.log(`Searching YouTube for: "${request.searchTerm}"`);
              videos = await this.liveYouTubeSearcher.searchEducationalVideos(request.searchTerm, 1);
            }

            // Fallback to static database if no live results
            if (!videos || videos.length === 0) {
              this.log(`No live results, checking static database for: "${request.searchTerm}"`);
              videos = this.realYouTubeFinder ? this.realYouTubeFinder.findRealVideos(request.searchTerm, 1) : [];
            }

            // Replace the search request with real video link
            if (videos && videos.length > 0) {
              const video = videos[0];

              // Debug: Log the video object structure
              this.log(`Video object received:`, 'debug');
              console.log('Video object:', video);

              // Normalize video ID - handle both 'id' and 'videoId' properties
              const videoId = video.id || video.videoId;
              const videoTitle = video.title;

              // Validate video object has required properties and that videoId is not undefined
              if (video && videoId && videoId !== 'undefined' && videoTitle) {
                const videoLink = `[${videoTitle}](https://www.youtube.com/watch?v=${videoId})`;
                cleanedResponse = cleanedResponse.replace(request.fullMatch, videoLink);
                this.log(`✅ Replaced search with real video: ${videoTitle} (ID: ${videoId})`);
              } else {
                this.log(`❌ Invalid video object - missing id/videoId or title. Object:`, 'error');
                console.error('Invalid video object:', video);

                // Fallback to search suggestion if video object is malformed
                cleanedResponse = cleanedResponse.replace(
                  request.fullMatch,
                  `Search YouTube for "${request.searchTerm}" for visual tutorials`
                );
                this.log(`🔄 Used fallback search suggestion for: "${request.searchTerm}"`);
              }
            } else {
              // Replace with search suggestion if no videos found
              cleanedResponse = cleanedResponse.replace(
                request.fullMatch,
                `Search YouTube for "${request.searchTerm}" for visual tutorials`
              );
              this.log(`❌ No videos found for: "${request.searchTerm}"`);
            }
          } catch (error) {
            this.log(`Error processing YouTube search for "${request.searchTerm}": ${error.message}`, 'error');
            // Replace with search suggestion on error
            cleanedResponse = cleanedResponse.replace(
              request.fullMatch,
              `Search YouTube for "${request.searchTerm}" for tutorials`
            );
          }
        }
      }


      // CLEAN UP FAKE LINKS - Remove any invalid markdown links
      // Pattern to match [text](invalid-url) where invalid-url is not a real URL
      const fakeLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      const foundLinks = [];
      let linkMatch;

      // First, collect all links
      while ((linkMatch = fakeLinkPattern.exec(cleanedResponse)) !== null) {
        foundLinks.push({
          fullMatch: linkMatch[0],
          text: linkMatch[1],
          url: linkMatch[2]
        });
      }

      // Then process each link
      foundLinks.forEach(link => {
        // Check if it's a valid URL - be very strict
        const isValidUrl = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]\//.test(link.url) ||
          /^www\.[a-zA-Z0-9][a-zA-Z0-9-._]*[a-zA-Z0-9]/.test(link.url);

        // Common fake URL patterns to catch
        const isFakeUrl = /^(fake|non-working|invalid|placeholder|example|test|dummy)-?(url|link)$/i.test(link.url) ||
          /^(url|link|href|src)$/i.test(link.url) ||
          link.url.includes('fake') ||
          link.url.includes('placeholder') ||
          link.url.length < 5;

        // If it's not a valid URL or is clearly fake, convert to plain text suggestion
        if (!isValidUrl || isFakeUrl) {
          const replacement = `Search for "${link.text}" in documentation or tutorials`;
          cleanedResponse = cleanedResponse.replace(link.fullMatch, replacement);
          this.log(`🧹 Cleaned up fake link: [${link.text}](${link.url})`);
        }
      });

      // Check if the response is in JSON format (legacy support)
      if (cleanedResponse.startsWith('{')) {
        try {
          const jsonResponse = JSON.parse(cleanedResponse);
          return {
            type: 'learning_guidance',
            title: jsonResponse.title || this.generateResponseTitle(questionContext),
            content: jsonResponse.content || "I'm here to help guide your learning process.",
            hints: [],
            resources: [],
            concepts: [],
            nextSteps: []
          };
        } catch (jsonError) {
          console.warn("Failed to parse JSON response:", jsonError);
          // Continue to markdown parsing approach
        }
      }

      // For natural markdown/text responses, parse as pure content
      let processedContent = cleanedResponse;

      // Convert Markdown to HTML if it's not already HTML
      if (!processedContent.includes('<') || processedContent.includes('**') || processedContent.includes('##')) {
        processedContent = this.convertMarkdownToHtml(processedContent);
      }

      // NO EXTRACTION - let AI handle everything
      return {
        type: 'learning_guidance',
        title: this.generateResponseTitle(questionContext),
        content: `<div class="kana-ai-response">${processedContent}</div>`,
        hints: [],
        concepts: [],
        nextSteps: [],
        resources: []
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        type: 'learning_guidance',
        title: "Learning Support",
        content: `<div class="kana-ai-response">${this.convertMarkdownToHtml(aiResponseText || "I'm here to help guide your learning process.")}</div>`,
        hints: [],
        concepts: [],
        nextSteps: [],
        resources: []
      };
    }
  }

  convertMarkdownToHtml(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Convert headers (## Header -> <h3>Header</h3>, ### Header -> <h4>Header</h4>)
    html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

    // Convert bold text (**text** -> <strong>text</strong>)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convert italic text (*text* -> <em>text</em>)
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Convert inline code (`code` -> <code>code</code>)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert links ([text](url) -> <a href="url">text</a>)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Convert unordered lists (- item or * item -> <ul><li>item</li></ul>)
    // Handle nested lists better
    const lines = html.split('\n');
    let inList = false;
    let listType = null;
    let processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Check for unordered list item
      const unorderedMatch = trimmedLine.match(/^[-\*\+]\s+(.+)/);
      // Check for ordered list item  
      const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)/);

      if (unorderedMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul>');
          listType = 'ul';
          inList = true;
        }
        processedLines.push(`<li>${unorderedMatch[1]}</li>`);
      } else if (orderedMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol>');
          listType = 'ol';
          inList = true;
        }
        processedLines.push(`<li>${orderedMatch[1]}</li>`);
      } else {
        if (inList && trimmedLine === '') {
          // Empty line - might end list or continue
          continue;
        } else if (inList && trimmedLine !== '') {
          // Non-list item while in list - end list
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = null;
          processedLines.push(line);
        } else {
          // Normal line
          processedLines.push(line);
        }
      }
    }

    // Close any open list
    if (inList) {
      processedLines.push(`</${listType}>`);
    }

    html = processedLines.join('\n');

    // Convert line breaks to proper paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';

      // Don't wrap if it's already a block element
      if (p.match(/^<(h[1-6]|ul|ol|div|blockquote|li)/)) {
        return p;
      }

      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');

    // Clean up any remaining newlines in non-paragraph content
    html = html.replace(/\n(?![<>])/g, '<br>');

    return html;
  }

  extractHintsFromResponse(response) {
    // Only extract hints if they're actually useful - no generic extractions
    const hintKeywords = ['try this', 'consider', 'think about', 'remember that', 'start by', 'tip:', 'suggestion:', 'approach this by'];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 25);

    const hints = sentences.filter(sentence => {
      const lower = sentence.toLowerCase().trim();
      return hintKeywords.some(keyword => lower.includes(keyword)) &&
        !lower.includes('resource') &&
        !lower.includes('link') &&
        !lower.includes('http') &&
        !lower.includes('additional') &&
        lower.length > 30 &&
        lower.length < 180;
    }).slice(0, 2);

    // Only return meaningful, contextual hints
    return hints.length > 0 && hints[0].length > 30 ? hints : [];
  }

  extractConceptsFromResponse(response, questionContext) {
    // Only extract truly relevant concepts, not generic ones
    const subject = this.detectSubject(response, { text: [response] });
    const foundConcepts = [];

    // Only add the detected subject if it's specific and relevant
    if (subject &&
      subject !== 'General' &&
      subject !== 'Programming General' &&
      subject !== 'Web Development' &&
      !subject.includes('General')) {
      foundConcepts.push(subject);
    }

    // Look for actual concepts mentioned in the content (not generic extraction)
    const conceptPatterns = [
      /ethical principles?/i,
      /data privacy/i,
      /informed consent/i,
      /transparency/i,
      /accountability/i,
      /bias mitigation/i,
      /algorithmic fairness/i,
      /human rights/i,
      /stakeholder engagement/i,
      /risk assessment/i
    ];

    conceptPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        const concept = matches[0].replace(/s$/, ''); // Remove plural
        const formatted = concept.charAt(0).toUpperCase() + concept.slice(1);
        if (!foundConcepts.includes(formatted)) {
          foundConcepts.push(formatted);
        }
      }
    });

    // Only return if we found meaningful, specific concepts
    return foundConcepts.length > 0 ? foundConcepts.slice(0, 3) : [];
  }

  extractNextStepsFromResponse(response) {
    // Only extract actionable next steps, not generic suggestions
    const stepIndicators = [
      'you should',
      'you could',
      'next, try',
      'i recommend',
      'consider doing',
      'you might want to',
      'start by',
      'begin with'
    ];

    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 25);

    const steps = sentences.filter(sentence => {
      const lower = sentence.toLowerCase().trim();
      return stepIndicators.some(indicator => lower.includes(indicator)) &&
        !lower.includes('resource') &&
        !lower.includes('link') &&
        !lower.includes('http') &&
        lower.length > 30 &&
        lower.length < 180;
    }).slice(0, 2);

    // Only return meaningful, actionable steps
    return steps.length > 0 && steps[0].length > 30 ? steps : [];
  }

  extractResourcesFromResponse(response, questionContext) {
    // Extract URLs and resource mentions from AI response
    const extractedResources = [];

    // Extract URLs with titles/descriptions
    const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    let match;
    while ((match = urlRegex.exec(response)) !== null) {
      extractedResources.push({
        title: match[1],
        url: match[2],
        description: "Resource mentioned in response"
      });
    }

    // Extract plain URLs
    const plainUrlRegex = /(https?:\/\/[^\s]+)/g;
    while ((match = plainUrlRegex.exec(response)) !== null) {
      const url = match[1];
      // Skip if already found in markdown format
      if (!extractedResources.some(r => r.url === url)) {
        let title = "Helpful Resource";

        // Try to extract a meaningful title from the URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          title = "YouTube Video";
        } else if (url.includes('khanacademy.org')) {
          title = "Khan Academy Lesson";
        } else if (url.includes('coursera.org')) {
          title = "Coursera Course";
        } else if (url.includes('edx.org')) {
          title = "edX Course";
        } else if (url.includes('freecodecamp.org')) {
          title = "FreeCodeCamp Tutorial";
        } else if (url.includes('stackoverflow.com')) {
          title = "Stack Overflow Discussion";
        } else if (url.includes('github.com')) {
          title = "GitHub Repository";
        } else if (url.includes('docs.')) {
          title = "Documentation";
        }

        extractedResources.push({
          title: title,
          url: url,
          description: "Resource mentioned in response"
        });
      }
    }

    // If no resources were extracted from the response, provide defaults based on subject
    if (extractedResources.length === 0 && questionContext) {
      const subject = this.detectSubject(response, { text: [response] });
      return this.getSubjectResources(subject, response).slice(0, 2);
    }

    return extractedResources.slice(0, 4); // Limit to 4 resources
  }

  generateResponseTitle(questionContext) {
    const { intent, targetQuestion, subject } = questionContext;

    if (targetQuestion) {
      switch (intent) {
        case 'explain':
          return "Understanding the Concept";
        case 'hint':
          return "Learning Guidance";
        case 'example':
          return "Related Examples";
        case 'resource':
          return "Learning Resources";
        case 'concept':
          return "Key Concepts";
        case 'steps':
          return "Problem-Solving Approach";
        default:
          return "Learning Support";
      }
    }

    return subject ? `${subject.charAt(0).toUpperCase() + subject.slice(1)} Learning Support` : 'Learning Guidance';
  }

  // Additional methods that may have been cut off

  parseUserQuestion(userQuestion, pageContent) {
    try {
      // Parse the user's question to get context
      const question = userQuestion.toLowerCase();
      const context = {
        intent: 'learn', // Default intent
        targetQuestion: null,
        subject: null,
        relatedQuestions: []
      };

      // Detect intent from question phrases
      if (question.includes('explain') || question.includes('what is') || question.includes('how does')) {
        context.intent = 'explain';
      } else if (question.includes('hint') || question.includes('help with') || question.includes('stuck')) {
        context.intent = 'hint';
      } else if (question.includes('example') || question.includes('show me')) {
        context.intent = 'example';
      } else if (question.includes('resource') || question.includes('where can i find')) {
        context.intent = 'resource';
      }

      // Try to identify subject matter from the question
      const subjectMatches = question.match(/\b(math|algebra|calculus|physics|chemistry|biology|history|english|programming|computer science|statistics)\b/i);
      if (subjectMatches) {
        context.subject = subjectMatches[0].toLowerCase();
      }

      // Find related questions on the page
      context.relatedQuestions = this.findRelatedQuestionsOnPage(question, pageContent);

      // If we found related questions, set the most relevant one as target
      if (context.relatedQuestions.length > 0) {
        context.targetQuestion = context.relatedQuestions[0];
      }

      return context;
    } catch (error) {
      console.error("Error parsing user question:", error);
      return { intent: 'learn', targetQuestion: null, subject: null, relatedQuestions: [] };
    }
  }

  findRelatedQuestionsOnPage(userQuestion, pageContent) {
    try {
      const userWords = userQuestion.toLowerCase().split(/\s+/).filter(word => word.length > 3);
      const relatedQuestions = [];

      if (pageContent.questions.length > 0) {
        // Score each question based on word overlap
        pageContent.questions.forEach(q => {
          const questionText = q.text.toLowerCase();
          const words = questionText.split(/\s+/);

          let score = 0;
          userWords.forEach(word => {
            if (questionText.includes(word)) score++;
          });

          if (score > 0) {
            relatedQuestions.push({
              text: q.text,
              score: score,
              originalQuestion: q
            });
          }
        });

        // Sort by score (highest first)
        relatedQuestions.sort((a, b) => b.score - a.score);
      }

      return relatedQuestions.slice(0, 3); // Return top 3 related questions
    } catch (error) {
      console.error("Error finding related questions:", error);
      return [];
    }
  }

  generateEducationalResponse(questionContext, pageContent, platform) {
    // Generate a placeholder response until AI generates the real one
    const { intent, targetQuestion, subject } = questionContext;

    return {
      type: 'educational',
      title: 'Analyzing your question...',
      content: '<p>I\'m currently analyzing the content to provide you with helpful guidance. One moment please...</p>',
      loading: true
    };
  }

  showResponse(response) {
    console.log('🔊 showResponse called with voice enabled:', this.voiceResponseEnabled, 'voice mode:', this.isInVoiceMode);
    console.log('Response type:', response.type);

    const responseContent = this.chatPanel.querySelector('.kana-response-content');
    responseContent.style.display = 'block';

    // Determine text to speak (will be used for all response types if voice is enabled)
    let textToSpeak = '';

    if (response.type === 'error') {
      responseContent.innerHTML = `
        <div class="kana-error">
          <h3>${response.title}</h3>
          <p>${response.content}</p>
        </div>
      `;
      textToSpeak = `Error: ${response.title}. ${response.content}`;
    } else if (response.type === 'educational' || response.type === 'learning_guidance') {
      // Pure AI response - no generic sections
      let html = `
        <div class="kana-response">
          <h3>${response.title}</h3>
          <div class="kana-response-main">
            ${response.content}
          </div>
        </div>
      `;

      responseContent.innerHTML = html;
      textToSpeak = `${response.title}. ${response.content}`;

      // Check for YouTube videos in the response and open them in PiP
      this.handleYouTubeVideosInResponse(response.content || response.title || '');

      // Scroll to top of response
      responseContent.scrollTop = 0;
    } else {
      // Handle any other response types (fallback)
      console.log('🔊 Handling fallback response type:', response.type);

      let html = '';
      if (typeof response === 'string') {
        html = `<div class="kana-response"><div class="kana-response-main">${response}</div></div>`;
        textToSpeak = response;
      } else if (response.content) {
        html = `
          <div class="kana-response">
            ${response.title ? `<h3>${response.title}</h3>` : ''}
            <div class="kana-response-main">${response.content}</div>
          </div>
        `;
        textToSpeak = `${response.title || ''}. ${response.content}`;
      } else {
        html = `<div class="kana-response"><div class="kana-response-main">Response received</div></div>`;
        textToSpeak = 'Response received';
      }

      responseContent.innerHTML = html;

      // Check for YouTube videos in any response
      this.handleYouTubeVideosInResponse((response.content || response.title || response || '').toString());

      // Scroll to top of response
      responseContent.scrollTop = 0;
    }

    // Handle voice response for ALL response types if voice is enabled and not in voice mode
    if (this.voiceResponseEnabled && !this.isInVoiceMode && textToSpeak) {
      console.log('🔊 Speaking response in text mode:', textToSpeak.substring(0, 50) + '...');
      this.speakResponse(textToSpeak);
    } else {
      console.log('🔊 Voice not triggered - voiceEnabled:', this.voiceResponseEnabled, 'voiceMode:', this.isInVoiceMode, 'hasText:', !!textToSpeak);
    }
    // Note: Voice mode responses are handled separately in voice UI
  }

  // Handle YouTube videos found in Kana's response
  async handleYouTubeVideosInResponse(response) {
    try {
      if (this.youtubePiP && typeof response === 'string') {
        // Check if response contains YouTube links or educational content
        const hasYouTubeLinks = /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed)/i.test(response);

        if (hasYouTubeLinks) {
          this.log('YouTube videos detected in response, validating before opening PiP...');

          // Use URL validator if available to pre-validate URLs
          if (this.urlValidator) {
            // Extract YouTube URLs from response
            const youtubeUrls = response.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/g);

            if (youtubeUrls && youtubeUrls.length > 0) {
              // Log what we're about to validate for debugging
              this.log(`Found ${youtubeUrls.length} YouTube URLs to validate: ${youtubeUrls.map(url => url.substring(url.length - 15)).join(', ')}`);

              // Validate URLs before attempting to open
              const validatedUrls = await this.urlValidator.filterValidYouTubeUrls(youtubeUrls);

              if (validatedUrls.length > 0) {
                this.log(`Opening ${validatedUrls.length} validated YouTube videos in PiP...`);

                // Small delay to let the response render first
                setTimeout(() => {
                  // Pass validated URLs directly to avoid re-validation
                  this.youtubePiP.openValidatedYouTubeVideos(validatedUrls);
                }, 500);
              } else {
                // Check if AI response contains YouTube search patterns before falling back
                const hasYouTubeSearchPatterns = /\{\{YOUTUBE_SEARCH:[^}]+\}\}/g.test(response);

                if (!hasYouTubeSearchPatterns) {
                  this.log('No valid YouTube videos found after validation and no search patterns - trying real video finder', 'warn');
                  await this.findAndOpenRealVideos(response);
                } else {
                  this.log('AI response has search patterns but validation failed - search patterns should have been processed already');
                }
              }
            }
          } else {
            // Fallback to original behavior if validator not available
            setTimeout(() => {
              this.youtubePiP.openYouTubeVideos(response);
            }, 500);
          }
        } else {
          // Let Gemini decide if videos are needed based on the content and context
          this.log('No YouTube URLs found in AI response - letting Gemini handle video suggestions naturally');
        }
      }
    } catch (error) {
      // Use error handler if available
      if (this.errorHandler) {
        await this.errorHandler.handleError(error, {
          context: 'YOUTUBE_VIDEO_HANDLING',
          response: response?.substring(0, 100)
        });
      } else {
        this.log(`Error handling YouTube videos: ${error.message}`, 'error');
      }
    }
  }

  // Find and open real educational videos based on the conversation topic
  async findAndOpenRealVideos(response) {
    try {
      // Extract educational topics from the response
      const topics = this.extractEducationalTopics(response);

      if (topics.length === 0) {
        this.log('No educational topics detected for video search');
        return;
      }

      this.log(`Searching for real educational videos for topics: ${topics.join(', ')}`);
      const primaryTopic = topics[0];

      let realVideos = [];

      // Priority 1: Try Live YouTube Search (real API search)
      if (this.liveYouTubeSearcher) {
        try {
          this.log(`Attempting LIVE YouTube search for: ${primaryTopic}`);
          realVideos = await this.liveYouTubeSearcher.searchEducationalVideos(primaryTopic, 3);

          if (realVideos.length > 0) {
            this.log(`✅ LIVE search found ${realVideos.length} real videos for: ${primaryTopic}`);
          } else {
            this.log(`⚠️ LIVE search found no videos for: ${primaryTopic}`);
          }
        } catch (error) {
          this.log(`❌ LIVE search failed: ${error.message}`, 'warn');
        }
      }

      // Priority 2: Fallback to Static Database if live search didn't find enough
      if (realVideos.length === 0 && this.realYouTubeFinder) {
        this.log(`Falling back to static database for: ${primaryTopic}`);
        const staticVideos = await this.realYouTubeFinder.findRealVideos(primaryTopic, 2);

        if (staticVideos.length > 0) {
          realVideos = staticVideos;
          this.log(`📚 Static database found ${realVideos.length} videos for: ${primaryTopic}`);
        }
      }

      // Open videos in PiP if found
      if (realVideos.length > 0) {
        this.log(`🎥 Opening ${realVideos.length} educational videos in PiP`);

        // Pass video objects directly to PiP manager (don't convert to URLs)
        setTimeout(() => {
          this.youtubePiP.openValidatedYouTubeVideos(realVideos);
        }, 500);
      } else {
        this.log(`❌ No educational videos found for topic: ${primaryTopic}`);
      }
    } catch (error) {
      this.log(`Error finding real videos: ${error.message}`, 'error');
    }
  }

  // Extract educational topics from response text
  extractEducationalTopics(text) {
    const topics = [];
    const textLower = text.toLowerCase();

    // Define topic patterns and their corresponding search terms
    const topicPatterns = {
      'entrepreneurship': /entrepreneur|entrepreneurial.*mindset|startup|business.*mindset|resilience|resourcefulness|solutions.*oriented/i,
      'business fundamentals': /business.*fundamental|business.*strategy|business.*plan|venture|founding.*company/i,
      'leadership': /leadership|leader|management|team.*building|vision/i,
      'innovation': /innovation|innovative.*thinking|creativity|problem.*solving|disruptive/i,
      'unity prefabs': /prefab|reusable.*object|instantiat.*object/i,
      'unity ui': /ui|user.*interface|canvas|button.*ui|menu/i,
      'unity scripting': /script|c#|coding|programming.*unity|unity.*code/i,
      'unity buttons': /button|click|ui.*button|onclick|button.*event/i,
      'unity gameobjects': /gameobject|game.*object|unity.*object|hierarchy/i,
      'unity physics': /physics|rigidbody|collider|collision|force/i,
      'programming basics': /programming.*basic|learn.*programming|code.*beginner|javascript|python|c\+\+/i,
      'game development': /game.*dev|making.*game|create.*game|game.*design/i,
      'web development': /web.*dev|html|css|react|vue|angular|node/i,
      'data science': /data.*science|machine.*learning|ai|pandas|numpy/i,
      'software engineering': /software.*eng|algorithms|data.*structures|design.*patterns/i
    };

    // Check for topic matches
    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(textLower)) {
        topics.push(topic);
      }
    }

    // Extract technology/topic keywords from text for broader coverage
    const techKeywords = textLower.match(/\b(unity|react|javascript|python|java|c#|html|css|sql|mongodb|docker|kubernetes|aws|azure|firebase|nodejs|express|django|flask|spring|angular|vue|svelte|typescript|php|ruby|go|rust|swift|kotlin|flutter|xamarin|ionic|cordova|webpack|babel|jest|cypress|selenium|git|github|linux|windows|macos|android|ios)\b/gi);

    if (techKeywords) {
      // Add unique tech keywords as topics
      const uniqueTechTopics = [...new Set(techKeywords.map(kw => kw.toLowerCase()))];
      topics.push(...uniqueTechTopics);
    }

    // Filter out non-educational terms
    const nonEducationalTerms = /^(hey|hi|hello|thanks|ok|yes|no|the|and|or|but|if|when|where|how|what|why)$/i;
    const educationalTopics = topics.filter(topic => !nonEducationalTerms.test(topic));

    // Also extract from current conversation context
    if (this.conversationContext && this.conversationContext.currentTopic) {
      const currentTopic = this.conversationContext.currentTopic.toLowerCase();
      if (!nonEducationalTerms.test(currentTopic) &&
        !educationalTopics.some(topic => topic.includes(currentTopic))) {
        educationalTopics.unshift(this.conversationContext.currentTopic); // Add as primary topic
      }
    }

    return educationalTopics.slice(0, 3); // Limit to top 3 topics
  }

  showError(message) {
    const responseContent = this.chatPanel.querySelector('.kana-response-content');
    responseContent.style.display = 'block';
    responseContent.innerHTML = `
      <div class="kana-error">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  loadPosition() {
    try {
      const storedPosition = localStorage.getItem('kana-position');
      if (storedPosition) {
        this.position = JSON.parse(storedPosition);
      }
      this.setPosition();
    } catch (error) {
      console.error('Error loading position:', error);
    }
  }

  savePosition() {
    try {
      localStorage.setItem('kana-position', JSON.stringify(this.position));
    } catch (error) {
      console.error('Error saving position:', error);
    }
  }

  setPosition() {
    // Position from right and top as percentage
    if (this.orbContainer) {
      this.orbContainer.style.right = `${this.position.x}px`;
      this.orbContainer.style.top = `${this.position.y}px`;
    }
  }

  startDrag(e) {
    // Don't start drag if locked
    if (this.isLocked) return;

    e.preventDefault();
    this.isDragging = true;

    // Get touch or mouse position
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;

    // Store the offset of the mouse position within the orb
    const orbRect = this.orbContainer.getBoundingClientRect();
    this.dragOffset = {
      x: clientX - orbRect.left,
      y: clientY - orbRect.top
    };

    // Add dragging class
    this.orbContainer.classList.add('dragging');
  }

  drag(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    // Get touch or mouse position
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);

    if (clientX === null || clientY === null) return;

    // Calculate new position
    const newLeft = clientX - this.dragOffset.x;
    const newTop = clientY - this.dragOffset.y;

    // Apply new position
    this.orbContainer.style.left = `${newLeft}px`;
    this.orbContainer.style.top = `${newTop}px`;
    this.orbContainer.style.right = 'auto';
    this.orbContainer.style.bottom = 'auto';

    // Update position for storage (using pixels now)
    this.position.x = newLeft;
    this.position.y = newTop;
  }

  stopDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.orbContainer.classList.remove('dragging');

    // Save the new position
    this.savePosition();
  }

  toggleLock() {
    this.isLocked = !this.isLocked;
    this.orbContainer.classList.toggle('locked', this.isLocked);
  }

  toggleChat() {
    const isVisible = this.chatPanel.classList.contains('visible');

    if (isVisible) {
      this.hidePanels();
    } else {
      this.showChatPanel();
    }
  }

  showChatPanel() {
    this.chatPanel.classList.add('visible');
    this.positionPanel(this.chatPanel);

    // Focus the chat input
    setTimeout(() => {
      const chatInput = this.chatPanel.querySelector('.kana-chat-input');
      if (chatInput) chatInput.focus();
    }, 100);
  }

  hidePanels() {
    this.chatPanel.classList.remove('visible');
  }

  positionPanel(panel) {
    if (!this.orb) return;

    const orbRect = this.orb.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate ideal positions - position BELOW the orb by default
    let left = orbRect.left + (orbRect.width / 2) - (panelRect.width / 2);
    let top = orbRect.bottom + 10;

    // Make sure panel stays within viewport horizontally
    if (left < 10) left = 10;
    if (left + panelRect.width > viewportWidth - 10) {
      left = viewportWidth - panelRect.width - 10;
    }

    // If panel would go below viewport, position it above the orb
    if (top + panelRect.height > viewportHeight - 10) {
      top = orbRect.top - panelRect.height - 10;
      panel.classList.add('bottom');
    } else {
      panel.classList.remove('bottom');
    }

    // Apply position
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  updateOrbState(state) {
    if (!this.orb) return;

    // Remove all state classes
    this.orb.classList.remove('idle', 'listening', 'thinking', 'speaking');

    // Add the current state class
    this.orb.classList.add(state);

    // Update the voice indicator
    const voiceIndicator = this.orb.querySelector('.kana-voice-indicator');
    if (voiceIndicator) {
      if (state === 'listening' || state === 'thinking') {
        voiceIndicator.style.display = 'block';
      } else {
        voiceIndicator.style.display = 'none';
      }
    }
  }

  handleStudyPouchCommand(message) {
    const lowerMessage = message.toLowerCase().trim();

    // Define command patterns and corresponding component types
    const commandMap = {
      // Notes/Notepad commands
      'open notepad': 'notepad',
      'open notes': 'notepad',
      'show notepad': 'notepad',
      'show notes': 'notepad',
      'create notes': 'notepad',
      'new notes': 'notepad',

      // Pomodoro timer commands
      'open pomodoro': 'pomodoro',
      'open timer': 'pomodoro',
      'show pomodoro': 'pomodoro',
      'show timer': 'pomodoro',
      'start pomodoro': 'pomodoro',
      'start timer': 'pomodoro',

      // Task tracker commands
      'open tasks': 'task-tracker',
      'open task tracker': 'task-tracker',
      'show tasks': 'task-tracker',
      'show task tracker': 'task-tracker',
      'open todos': 'task-tracker',
      'show todos': 'task-tracker',

      // Music player commands
      'open music': 'music',
      'show music': 'music',
      'play music': 'music',
      'music player': 'music',

      // Calculator commands
      'open calculator': 'calculator',
      'show calculator': 'calculator',
      'open calc': 'calculator',
      'show calc': 'calculator',

      // Video library commands
      'open videos': 'video-library',
      'show videos': 'video-library',
      'open video library': 'video-library',
      'show video library': 'video-library'
    };

    // Check for exact command matches
    for (const [command, componentType] of Object.entries(commandMap)) {
      if (lowerMessage === command || lowerMessage.includes(command)) {
        this.executeStudyPouchCommand(componentType, command);
        return true; // Command was handled
      }
    }

    // Check for general "open study pouch" command
    if (lowerMessage.includes('open study pouch') ||
      lowerMessage.includes('show study pouch') ||
      lowerMessage.includes('open pouch') ||
      lowerMessage.includes('show pouch')) {
      this.executeStudyPouchCommand('pouch', 'open study pouch');
      return true;
    }

    return false; // No command found
  }

  executeStudyPouchCommand(componentType, originalCommand) {
    console.log(`Executing Study Pouch command: ${originalCommand} -> ${componentType}`);

    // Display confirmation message
    this.showResponse(`
      <div class="kana-ai-response">
        <h3>🎒 Study Pouch Command</h3>
        <p><strong>Command:</strong> "${originalCommand}"</p>
        <p>Opening ${this.getComponentDisplayName(componentType)}...</p>
      </div>
    `);

    if (componentType === 'pouch') {
      // Open the Study Pouch itself
      if (this.studyPouch) {
        this.studyPouch.show();
      }
    } else {
      // Open specific component as standalone floating window
      console.log(`About to call openComponentAsStandalone for: ${componentType}`);
      console.log(`StudyPouchManager exists:`, !!this.studyPouch);

      if (this.studyPouch) {
        try {
          console.log(`Calling openComponentAsStandalone(${componentType})`);
          const component = this.studyPouch.openComponentAsStandalone(componentType);
          console.log(`openComponentAsStandalone returned:`, component);

          if (component) {
            console.log(`✅ Opened ${componentType} component as standalone`);
            this.showResponse(`
              <div class="kana-ai-response">
                <h3>🎒 Study Pouch Command</h3>
                <p><strong>Command:</strong> "${originalCommand}"</p>
                <p>✅ ${this.getComponentDisplayName(componentType)} opened successfully!</p>
              </div>
            `);
          } else {
            console.error(`❌ Failed to create ${componentType} component - method returned null/undefined`);
            throw new Error(`Failed to create ${componentType} component`);
          }
        } catch (error) {
          console.error(`❌ Error opening ${componentType} component:`, error);
          this.showResponse(`
            <div class="kana-ai-response">
              <h3>⚠️ Component Error</h3>
              <p>Sorry, I couldn't open the ${this.getComponentDisplayName(componentType)}. The component might not be available yet.</p>
              <p><em>Try clicking the Study Pouch button (🎒) and selecting it manually.</em></p>
            </div>
          `);
        }
      } else {
        this.showResponse(`
          <div class="kana-ai-response">
            <h3>⚠️ Study Pouch Unavailable</h3>
            <p>The Study Pouch is not available right now. Please try again in a moment.</p>
          </div>
        `);
      }
    }
  }

  getComponentDisplayName(componentType) {
    const displayNames = {
      'notepad': 'Study Notes',
      'pomodoro': 'Pomodoro Timer',
      'task-tracker': 'Task Tracker',
      'music': 'Music Player',
      'calculator': 'Calculator',
      'video-library': 'Video Library',
      'pouch': 'Study Pouch'
    };
    return displayNames[componentType] || componentType;
  }

  sendChatMessage() {
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    const message = chatInput.value.trim();

    if (message) {
      console.log('Sending chat message:', message);
      chatInput.value = '';

      // Check for Study Pouch commands first
      if (this.handleStudyPouchCommand(message)) {
        return; // Command was handled, don't send to AI
      }

      // Process the message with AI
      this.analyzeScreenContent(message);
    }
  }

  setupMessageListener() {
    // Listen for messages from popup or options
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('Message received:', request);

      if (request.action === 'toggleKana') {
        this.toggleChat();
        sendResponse({ result: 'toggled' });
      } else if (request.action === 'updateSettings') {
        this.updateSettings(request.settings);
        sendResponse({ result: 'settings updated' });
      } else if (request.action === 'updateGlassTheme') {
        // Direct glass theme update for immediate application
        Object.assign(this.glassSettings, request.glassSettings);
        this.applyGlassTheme();
        sendResponse({ result: 'glass theme updated' });
      } else if (request.action === 'reloadGlassSettings') {
        // Reload glass settings from storage
        this.loadGlassSettings();
        sendResponse({ result: 'glass settings reloaded' });
      } else if (request.action === 'toggleStudyPouch') {
        // Toggle Study Pouch visibility
        if (this.studyPouch) {
          this.studyPouch.toggle();
          sendResponse({ result: 'study pouch toggled' });
        } else {
          sendResponse({ result: 'study pouch not available' });
        }
      }

      // Return true to indicate we'll send a response asynchronously
      return true;
    });
  }

  updateSettings(settings) {
    console.log('Updating settings:', settings);

    // Update wake phrases if provided
    if (settings.wakeWords && Array.isArray(settings.wakeWords)) {
      this.wakePhrases = settings.wakeWords;
    }

    // Update adaptive colors if setting changed
    if (settings.kanaAdaptiveColors !== undefined) {
      this.useAdaptiveColors = settings.kanaAdaptiveColors;
      this.useAdaptiveColors ? this.applyAdaptiveColors() : this.applyDefaultColors();
    }

    // Update glass settings if provided
    if (settings.glassColorPanel !== undefined) {
      this.glassSettings.panelColor = settings.glassColorPanel;
    }
    if (settings.glassColorOrb !== undefined) {
      this.glassSettings.orbColor = settings.glassColorOrb;
    }
    if (settings.glassOpacity !== undefined) {
      this.glassSettings.opacity = settings.glassOpacity;
    }
    if (settings.glassBlur !== undefined) {
      this.glassSettings.blur = settings.glassBlur;
    }
    if (settings.glassSaturation !== undefined) {
      this.glassSettings.saturation = settings.glassSaturation;
    }
    if (settings.glassBrightness !== undefined) {
      this.glassSettings.brightness = settings.glassBrightness;
    }
    if (settings.glassDepth !== undefined) {
      this.glassSettings.depth = settings.glassDepth;
    }

    // Apply glass theme if any glass settings were updated
    if (settings.glassColorPanel !== undefined || settings.glassColorOrb !== undefined ||
      settings.glassOpacity !== undefined || settings.glassBlur !== undefined ||
      settings.glassSaturation !== undefined || settings.glassBrightness !== undefined ||
      settings.glassDepth !== undefined) {
      this.applyGlassTheme();
    }

    // Apply any other settings
    // ...
  }

  applyAdaptiveColors() {
    try {
      // Sample colors from the page
      const colors = this.sampleBackgroundColors();

      // Apply to orb and panels
      this.adaptOrbColors(colors);
      this.adaptPanelBackground(colors);
    } catch (error) {
      console.error('Error applying adaptive colors:', error);
      this.applyDefaultColors();
    }
  }

  applyDefaultColors() {
    // Reset to default color scheme
    this.orbContainer.classList.remove('adaptive-colors');
    this.chatPanel.classList.remove('adaptive-colors');
  }

  adaptOrbColors(colors) {
    if (!colors || !colors.main) return;

    // Get the orb container
    const orb = this.orbContainer;
    orb.classList.add('adaptive-colors');

    const mainColor = colors.main;

    // Create complementary colors for better visual appeal
    const lightColor = this.lightenColor(mainColor, 0.3);
    const darkColor = this.darkenColor(mainColor, 0.2);

    // Apply adaptive background and border to orb, but NEVER change the icon color
    orb.style.setProperty('--kana-adaptive-bg',
      `linear-gradient(135deg, 
        rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.4) 0%, 
        rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.2) 100%)`);
    orb.style.setProperty('--kana-adaptive-border',
      `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.6)`);
    orb.style.setProperty('--kana-adaptive-shadow',
      `0 8px 32px rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0.3)`);

    // IMPORTANT: Do NOT set --kana-adaptive-text for orb - let CSS keep icon white

    console.log('Applied adaptive colors to orb (keeping logo white):', mainColor);
  }

  adaptPanelBackground(colors) {
    if (!colors || !colors.main) return;

    // Get the panel
    const panel = this.chatPanel;
    panel.classList.add('adaptive-colors');

    const mainColor = colors.main;

    // Improved contrast calculation for better readability
    const brightness = this.calculateColorBrightness(mainColor);

    // More aggressive contrast - use darker text on light backgrounds, brighter text on dark backgrounds
    let textColor;
    if (brightness > 140) {
      // Light background - use dark text with good contrast
      textColor = 'rgba(20, 30, 40, 0.95)';
    } else if (brightness > 100) {
      // Medium brightness - use darker text
      textColor = 'rgba(40, 50, 60, 0.9)';
    } else {
      // Dark background - use bright white text
      textColor = 'rgba(255, 255, 255, 0.95)';
    }

    // Create subtle variations
    const lightColor = this.lightenColor(mainColor, 0.4);
    const darkColor = this.darkenColor(mainColor, 0.1);

    // Apply styles with enhanced glassmorphic effect
    panel.style.setProperty('--kana-adaptive-bg',
      `linear-gradient(135deg, 
        rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.12) 0%, 
        rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.08) 100%)`);
    panel.style.setProperty('--kana-adaptive-border',
      `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.3)`);
    panel.style.setProperty('--kana-adaptive-text', textColor);
    panel.style.setProperty('--kana-adaptive-shadow',
      `0 20px 60px rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0.2)`);

    console.log(`Applied adaptive colors to panel - brightness: ${brightness}, text: ${textColor}:`, mainColor);

    // Update Study Pouch theme to match adaptive colors (throttled)
    if (this.studyPouch && typeof this.studyPouch.updateTheme === 'function') {
      // Throttle theme updates to prevent spam
      if (!this.themeUpdateTimeout) {
        this.themeUpdateTimeout = setTimeout(() => {
          const currentTheme = this.glassSettings?.orbColor || 'blue';
          console.log('🎨 Syncing Study Pouch theme to adaptive colors:', currentTheme);
          this.studyPouch.updateTheme(currentTheme);
          this.themeUpdateTimeout = null;
        }, 100); // Reduced timeout for more responsive updates
      }
    }
  }

  sampleBackgroundColors() {
    // Sample colors from the page background more comprehensively
    const samples = [];

    // Add body background
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
      samples.push(bodyBg);
    }

    // Add html background
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    if (htmlBg && htmlBg !== 'rgba(0, 0, 0, 0)' && htmlBg !== 'transparent') {
      samples.push(htmlBg);
    }

    // Add element background colors with priority order
    const elements = [
      'main', 'article', 'section', 'header', 'nav',
      '.content', '.main-content', '.page-content', '.container',
      '[class*="content"]', '[class*="main"]', '[class*="page"]'
    ];

    elements.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          samples.push(bg);
        }
      }
    });

    // Get colors from largest visible elements
    const largeElements = Array.from(document.querySelectorAll('div, section, main, article'))
      .filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 200 && rect.height > 100;
      })
      .slice(0, 5);

    largeElements.forEach(el => {
      const bg = window.getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        samples.push(bg);
      }
    });

    if (samples.length === 0) {
      // Default fallback
      return { main: { r: 100, g: 150, b: 220, a: 1 } };
    }

    // Find the most suitable color (avoid pure white/black/transparent)
    for (const sample of samples) {
      const color = this.parseColor(sample);
      if (color) {
        const brightness = this.calculateColorBrightness(color);
        // Look for colors that aren't too extreme
        if (brightness > 40 && brightness < 240) {
          console.log(`Selected color with brightness ${brightness}:`, color);
          return { main: color };
        }
      }
    }

    // If no suitable color found, use first valid color
    for (const sample of samples) {
      const color = this.parseColor(sample);
      if (color) {
        console.log('Using fallback color:', color);
        return { main: color };
      }
    }

    // Ultimate fallback
    console.log('Using ultimate fallback color');
    return { main: { r: 100, g: 150, b: 220, a: 1 } };
  }

  lightenColor(color, amount) {
    return {
      r: Math.min(255, Math.floor(color.r + (255 - color.r) * amount)),
      g: Math.min(255, Math.floor(color.g + (255 - color.g) * amount)),
      b: Math.min(255, Math.floor(color.b + (255 - color.b) * amount)),
      a: color.a
    };
  }

  darkenColor(color, amount) {
    return {
      r: Math.max(0, Math.floor(color.r * (1 - amount))),
      g: Math.max(0, Math.floor(color.g * (1 - amount))),
      b: Math.max(0, Math.floor(color.b * (1 - amount))),
      a: color.a
    };
  }

  parseColor(colorStr) {
    if (!colorStr) return null;

    try {
      // Handle rgb/rgba
      if (colorStr.startsWith('rgb')) {
        const values = colorStr.match(/\d+/g).map(Number);
        if (values.length >= 3) {
          return {
            r: values[0],
            g: values[1],
            b: values[2],
            a: values.length > 3 ? values[3] : 1
          };
        }
      }

      // Handle hex
      if (colorStr.startsWith('#')) {
        const hex = colorStr.substring(1);
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return { r, g, b, a: 1 };
      }
    } catch (error) {
      console.warn('Error parsing color:', error);
    }

    return null;
  }

  calculateColorBrightness(color) {
    return (color.r * 299 + color.g * 587 + color.b * 114) / 1000;
  }

  async getAvailableGeminiModels(apiKey) {
    // Check which Gemini models are available
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);

      if (response.ok) {
        const data = await response.json();
        const models = data.models?.filter(model =>
          model.name.includes('gemini') &&
          model.supportedGenerationMethods?.includes('generateContent')
        ).map(model => model.name.split('/').pop()) || [];

        console.log("Available Gemini models from API:", models);
        return models;
      } else {
        console.warn("Failed to fetch available models:", response.status);
        return [];
      }
    } catch (error) {
      console.warn("Error fetching available models:", error);
      return [];
    }
  }

  generateContextualHints(pageContent, userQuestion) {
    // Generate contextual hints based on page content
    const hints = [];

    // If there are code blocks, suggest code analysis
    if (pageContent.codeBlocks.length > 0) {
      hints.push("Examine the code examples on this page - try to understand what each part does");
    }

    // If there are many questions, suggest systematic approach
    if (pageContent.questions.length > 5) {
      hints.push("This page has many questions - try tackling them one at a time");
    }

    // If there are assignments, suggest breaking them down
    if (pageContent.assignments.length > 0) {
      hints.push("Break down the assignments into smaller tasks and tackle them step by step");
    }

    // If there are learning objectives, suggest reviewing them
    if (pageContent.learningObjectives.length > 0) {
      hints.push("Review the learning objectives to understand what you should focus on");
    }

    // Based on user question intent
    const question = userQuestion.toLowerCase();
    if (question.includes('how') || question.includes('what')) {
      hints.push("Try to find definitions and explanations in the course materials");
    }

    if (question.includes('why')) {
      hints.push("Look for cause-and-effect relationships in the content");
    }

    if (question.includes('when') || question.includes('where')) {
      hints.push("Focus on context and conditions mentioned in the materials");
    }

    // Default hints if none specific were added
    if (hints.length === 0) {
      hints.push("Try to identify the key concepts in this material");
      hints.push("Connect these ideas to previous lessons");
    }

    return hints.slice(0, 4); // Return max 4 hints
  }

  generateContextualNextSteps(pageContent, platform) {
    // Generate next steps based on page content
    const steps = [];

    // Based on content type
    if (pageContent.codeBlocks.length > 0) {
      steps.push("Try running or modifying the code examples to see how they work");
    }

    if (pageContent.questions.length > 0) {
      steps.push("Work through the practice questions to test your understanding");
    }

    if (pageContent.assignments.length > 0) {
      steps.push("Start with the assignment requirements and create a plan");
    }

    if (pageContent.links.length > 0) {
      steps.push("Explore the additional resources and links provided");
    }

    // Platform-specific suggestions
    if (platform === 'ALU') {
      steps.push("Check the project rubric and requirements carefully");
      steps.push("Consider collaborating with your cohort on understanding concepts");
    } else if (platform === 'Canvas') {
      steps.push("Review the course modules and related materials");
    } else if (platform === 'Holberton') {
      steps.push("Apply the concepts through practical exercises");
    }

    // Default steps
    if (steps.length === 0) {
      steps.push("Review related course materials");
      steps.push("Try practice problems to reinforce understanding");
      steps.push("Discuss concepts with classmates");
    }

    return steps.slice(0, 4); // Return max 4 steps
  }

  generatePageInsights(pageContent, userQuestion) {
    // Generate insights about the current page content
    const insights = [];

    // Analyze content complexity
    const avgHeadingLength = pageContent.headings.reduce((sum, h) => sum + h.text.length, 0) / pageContent.headings.length;
    const avgTextLength = pageContent.text.reduce((sum, t) => sum + t.length, 0) / pageContent.text.length;

    if (pageContent.codeBlocks.length > 0) {
      const languages = [...new Set(pageContent.codeBlocks.map(cb => cb.language))];
      insights.push(`📝 Found ${pageContent.codeBlocks.length} code examples in: ${languages.join(', ')}`);
    }

    if (pageContent.questions.length > 10) {
      insights.push(`❓ This page has ${pageContent.questions.length} questions - consider working through them systematically`);
    } else if (pageContent.questions.length > 0) {
      insights.push(`❓ Found ${pageContent.questions.length} questions to help test your understanding`);
    }

    if (pageContent.assignments.length > 0) {
      insights.push(`📋 ${pageContent.assignments.length} assignment(s) detected - review requirements carefully`);
    }

    if (pageContent.learningObjectives.length > 0) {
      insights.push(`🎯 Learning objectives are defined - use them to guide your focus`);
    }

    // Check for common topics
    const allText = pageContent.title + ' ' + pageContent.text.join(' ');
    const lowerText = allText.toLowerCase();

    if (lowerText.includes('unity') || lowerText.includes('shader')) {
      insights.push(`🎮 This appears to be about Unity/Shader development - focus on practical implementation`);
    }

    if (lowerText.includes('algorithm') || lowerText.includes('complexity')) {
      insights.push(`⚡ Algorithm content detected - consider time/space complexity when learning`);
    }

    if (lowerText.includes('database') || lowerText.includes('sql')) {
      insights.push(`🗄️ Database content - try to understand relationships between concepts`);
    }

    return insights.slice(0, 3); // Return max 3 insights
  }

  // Method to manually trigger YouTube video opening (for voice commands)
  openYouTubeVideosFromText(text) {
    if (this.youtubePiP) {
      this.youtubePiP.openYouTubeVideos(text);
    } else {
      this.log('YouTube PiP Manager not available', 'warn');
    }
  }

  // ...existing code...
}

// Initialize the assistant when the content script loads
const kanaAssistant = new KanaAssistant();

// Make it globally available for voice enhancement
window.kanaAssistant = kanaAssistant;

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { KanaAssistant };
}