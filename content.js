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
      this.loadPosition();
      this.setupMessageListener();
      this.loadGlassSettings();
      this.loadAdaptiveColorsSetting();
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
      
      // Process with AI
      this.processWithAI(context);
      
    } catch (error) {
      console.error('Error analyzing screen content:', error);
      this.showError(`I encountered an error analyzing the page content: ${error.message}`);
    }
  }

  extractPageContent() {
    try {
      const content = {
        title: document.title,
        url: window.location.href,
        headings: [],
        text: [],
        questions: [],
        codeBlocks: [],
        assignments: [],
        learningObjectives: [],
        links: []
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
        links: []
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
    // Detect technical development context and domain
    const isTechnicalContext = this.detectTechnicalContext(userQuestion, pageContent, prioritizedContent);
    const technicalDomain = this.identifyTechnicalDomain(userQuestion, pageContent);
    
    // Create a well-structured prompt for the Gemini API with enhanced technical awareness
    let prompt = `You are Kana, a friendly AI learning assistant that helps students understand concepts and develop problem-solving skills.

CONTEXT:
Platform: ${platform}
Page: ${pageContent.title || 'Learning content'}
Student Question: "${userQuestion}"`;

    // Add technical domain context
    if (technicalDomain) {
      prompt += `
Technical Domain: ${technicalDomain}`;
    }

    // Add specialized technical context if detected
    if (isTechnicalContext) {
      prompt += `

TECHNICAL DEVELOPMENT CONTEXT DETECTED:
- This appears to be a technical development question
- Technical domains may include: Programming, Web Dev, Game Dev, VR/AR, Data Science, Mobile Dev, DevOps, etc.
- Common technical terms: API, framework, library, algorithm, database, deployment, etc.
- VR/AR terms: DOF (Degrees of Freedom), immersive, spatial computing, tracking
- Game dev terms: GameObject, physics, rendering, collision, animation
- Web dev terms: frontend, backend, responsive design, REST API, database
- Programming terms: object-oriented, algorithm, data structure, debugging
- Focus on practical, domain-specific guidance and best practices`;
    }

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

    // Add visible content for context
    if (prioritizedContent && prioritizedContent.highPriority.text.length > 0) {
      const visibleText = prioritizedContent.highPriority.text
        .slice(0, 2)
        .map(t => t.text.substring(0, 200))
        .join(' ... ');
      prompt += `
Visible Content: ${visibleText}`;
    }

    // Add general page context
    if (pageContent.headings && pageContent.headings.length > 0) {
      prompt += `
All Page Topics: ${pageContent.headings.slice(0, 5).join(', ')}`;
    }

    prompt += `

CRITICAL LINK RULES - READ CAREFULLY:
🚫 NEVER WRITE: [Unity Input System Documentation](fake-url)
🚫 NEVER WRITE: [Unity Raycasting Documentation](invalid-link) 
🚫 NEVER WRITE: [C# static variables](placeholder-url)
✅ INSTEAD WRITE: "Check Unity's Input System documentation"
✅ INSTEAD WRITE: "Look up Unity Raycasting in the official docs"
✅ INSTEAD WRITE: "Search for C# static variables in Microsoft docs"
✅ FOR VIDEOS USE: {{YOUTUBE_SEARCH:Unity raycasting tutorial}}

GUIDELINES FOR RESPONSE:
- CRITICAL: The student is asking about what they can currently see on their screen
- Look at the "Current Section" and "Other Visible Sections" to understand exactly where they are
- If this is a follow-up question, they're referring to the same screen location as before
- When they say "this part" or "explain this" they mean the specific section visible on their screen
- Focus your response on the EXACT content they're viewing, not generic information
- If you see a current section like "System Security and Ethical Development", focus on that specific section
- Provide educational guidance for the specific content they're viewing
- Help them understand the concepts without giving direct answers
- Use encouraging, supportive language
- Respond naturally as a conversational AI - format your response however makes most sense
- IMPORTANT: Proactively include educational videos and resources for most topics using {{YOUTUBE_SEARCH:topic}}
- Be generous with learning materials - students benefit from multiple resources
- Include relevant educational resources using well-known, reliable sites like official documentation, Khan Academy, or established educational platforms

CRITICAL LINK RULES - FOLLOW EXACTLY:
- NEVER EVER create fake links in the format [Text](fake-url) or [Text](non-working-link)
- NEVER make up YouTube video URLs or IDs - they will be 404 errors and frustrate users
- NEVER create clickable links unless you are 100% certain they exist and work
- DO NOT write things like "[Unity Input System Documentation](fake-link)" - this doesn't work!
- DO NOT write things like "[Unity Raycasting Documentation](non-working-url)" - this doesn't work!
- INSTEAD of fake links, write: "Check the Unity Input System documentation" or "Look up Unity Raycasting in the official docs"
- For YouTube videos, ONLY use this format: {{YOUTUBE_SEARCH:search_term}}
- Example: {{YOUTUBE_SEARCH:Unity raycasting tutorial}} will find real videos
- Example: {{YOUTUBE_SEARCH:C# static variables explained}} will find real videos  
- The system will automatically replace {{YOUTUBE_SEARCH:term}} patterns with real, working YouTube videos
- Use established educational platforms: Unity Learn, MDN Web Docs, W3Schools, Khan Academy, Coursera, etc.
- Write "Search Unity Learn for..." instead of "[Unity Learn](fake-url)"
- Write "Look up on Stack Overflow..." instead of "[Stack Overflow](fake-url)"

RESPONSE APPROACH:
Provide helpful educational guidance focused on the current screen content. IMPORTANT: For most concepts and topics, include relevant educational videos and resources to enhance learning:

WHEN TO INCLUDE VIDEOS AND RESOURCES:
- For programming concepts (use {{YOUTUBE_SEARCH:specific_programming_concept}})
- For technical tutorials (use {{YOUTUBE_SEARCH:step_by_step_tutorial}})
- For mathematical concepts (use {{YOUTUBE_SEARCH:math_concept_explained}})
- For science topics (use {{YOUTUBE_SEARCH:science_topic_tutorial}})
- For design principles (use {{YOUTUBE_SEARCH:design_concept_guide}})
- For any complex topic that benefits from visual learning
- When explaining "how" something works
- When breaking down difficult concepts

EXAMPLES OF GOOD VIDEO SEARCHES:
- {{YOUTUBE_SEARCH:Unity C# scripting basics}}
- {{YOUTUBE_SEARCH:object oriented programming explained}}
- {{YOUTUBE_SEARCH:Unity raycasting tutorial}}
- {{YOUTUBE_SEARCH:JavaScript functions beginner guide}}
- {{YOUTUBE_SEARCH:CSS flexbox layout tutorial}}

ADDITIONAL RESOURCES TO MENTION:
- Official documentation (Unity Learn, MDN, Microsoft Docs)
- Educational platforms (Khan Academy, Coursera, freeCodeCamp)
- Practice sites (Codecademy, LeetCode for coding)
- Community resources (Stack Overflow, Reddit communities)

Be generous with educational resources - students learn better with multiple learning materials. Focus entirely on what they're currently viewing on their screen and provide specific, helpful guidance for that exact content with comprehensive educational support.`;

    return prompt;
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
    const responseContent = this.chatPanel.querySelector('.kana-response-content');
    responseContent.style.display = 'block';
    
    if (response.type === 'error') {
      responseContent.innerHTML = `
        <div class="kana-error">
          <h3>${response.title}</h3>
          <p>${response.content}</p>
        </div>
      `;
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
      
      // Check for YouTube videos in the response and open them in PiP
      this.handleYouTubeVideosInResponse(response.content || response.title || '');
      
      // Scroll to top of response
      responseContent.scrollTop = 0;
    }
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
          // AI response will contain YouTube search patterns if videos are needed
          // No fallback search required since AI handles video discovery
          this.log('No YouTube URLs found in AI response - search patterns will be processed separately');
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