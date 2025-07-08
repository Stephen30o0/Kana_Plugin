// Kana AI Learning Assistant - Content Script
// This script creates the floating orb interface and handles all interactions

console.log('Kana AI Learning Assistant - Content Script Loading...');

class KanaAssistant {
  constructor() {
    console.log('Kana Assistant initializing...');
    this.orb = null;
    this.chatPanel = null;
    this.isListening = false;
    this.isDragging = false;
    this.isLocked = false;
    this.recognition = null;
    this.position = { x: 30, y: 50 }; // percentage from right and top
    this.wakePhrases = ['hey kana', 'hi kana', 'hello kana'];
    
    // Glass theme definitions
    this.glassThemes = {
      blue: {
        panelBg: 'linear-gradient(135deg, rgba(240, 248, 255, 0.3) 0%, rgba(220, 240, 255, 0.25) 50%, rgba(200, 230, 255, 0.3) 100%), linear-gradient(225deg, rgba(100, 160, 255, 0.12) 0%, rgba(70, 130, 240, 0.08) 50%, rgba(50, 110, 220, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(70, 130, 240, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(245, 250, 255, 0.25) 0%, rgba(235, 245, 255, 0.15) 50%, rgba(225, 240, 255, 0.2) 100%), linear-gradient(225deg, rgba(120, 180, 255, 0.15) 0%, rgba(100, 160, 255, 0.08) 50%, rgba(80, 140, 255, 0.1) 100%)',
        textColor: 'rgba(20, 40, 80, 0.92)',
        orbBg: '#4A90E2',
        orbShadow: 'rgba(74, 144, 226, 0.4)'
      },
      green: {
        panelBg: 'linear-gradient(135deg, rgba(240, 255, 248, 0.3) 0%, rgba(220, 255, 240, 0.25) 50%, rgba(200, 255, 230, 0.3) 100%), linear-gradient(225deg, rgba(100, 255, 160, 0.12) 0%, rgba(70, 240, 130, 0.08) 50%, rgba(50, 220, 110, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(70, 240, 130, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(245, 255, 250, 0.25) 0%, rgba(235, 255, 245, 0.15) 50%, rgba(225, 255, 240, 0.2) 100%), linear-gradient(225deg, rgba(120, 255, 180, 0.15) 0%, rgba(100, 255, 160, 0.08) 50%, rgba(80, 255, 140, 0.1) 100%)',
        textColor: 'rgba(20, 80, 40, 0.92)',
        orbBg: '#4AE290',
        orbShadow: 'rgba(74, 226, 144, 0.4)'
      },
      purple: {
        panelBg: 'linear-gradient(135deg, rgba(248, 240, 255, 0.3) 0%, rgba(240, 220, 255, 0.25) 50%, rgba(230, 200, 255, 0.3) 100%), linear-gradient(225deg, rgba(160, 100, 255, 0.12) 0%, rgba(130, 70, 240, 0.08) 50%, rgba(110, 50, 220, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(130, 70, 240, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(250, 245, 255, 0.25) 0%, rgba(245, 235, 255, 0.15) 50%, rgba(240, 225, 255, 0.2) 100%), linear-gradient(225deg, rgba(180, 120, 255, 0.15) 0%, rgba(160, 100, 255, 0.08) 50%, rgba(140, 80, 255, 0.1) 100%)',
        textColor: 'rgba(80, 20, 80, 0.92)',
        orbBg: '#9A4AE2',
        orbShadow: 'rgba(154, 74, 226, 0.4)'
      },
      yellow: {
        panelBg: 'linear-gradient(135deg, rgba(255, 248, 240, 0.3) 0%, rgba(255, 240, 220, 0.25) 50%, rgba(255, 230, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 200, 100, 0.12) 0%, rgba(240, 180, 70, 0.08) 50%, rgba(220, 160, 50, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(240, 180, 70, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(255, 250, 245, 0.25) 0%, rgba(255, 245, 235, 0.15) 50%, rgba(255, 240, 225, 0.2) 100%), linear-gradient(225deg, rgba(255, 220, 120, 0.15) 0%, rgba(255, 200, 100, 0.08) 50%, rgba(255, 180, 80, 0.1) 100%)',
        textColor: 'rgba(80, 60, 20, 0.92)',
        orbBg: '#E2B04A',
        orbShadow: 'rgba(226, 176, 74, 0.4)'
      },
      red: {
        panelBg: 'linear-gradient(135deg, rgba(255, 240, 240, 0.3) 0%, rgba(255, 220, 220, 0.25) 50%, rgba(255, 200, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 100, 100, 0.12) 0%, rgba(240, 70, 70, 0.08) 50%, rgba(220, 50, 50, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(240, 70, 70, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(255, 245, 245, 0.25) 0%, rgba(255, 235, 235, 0.15) 50%, rgba(255, 225, 225, 0.2) 100%), linear-gradient(225deg, rgba(255, 120, 120, 0.15) 0%, rgba(255, 100, 100, 0.08) 50%, rgba(255, 80, 80, 0.1) 100%)',
        textColor: 'rgba(80, 20, 20, 0.92)',
        orbBg: '#E24A4A',
        orbShadow: 'rgba(226, 74, 74, 0.4)'
      },
      teal: {
        panelBg: 'linear-gradient(135deg, rgba(240, 255, 255, 0.3) 0%, rgba(220, 255, 255, 0.25) 50%, rgba(200, 255, 255, 0.3) 100%), linear-gradient(225deg, rgba(100, 255, 255, 0.12) 0%, rgba(70, 240, 240, 0.08) 50%, rgba(50, 220, 220, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(70, 240, 240, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(245, 255, 255, 0.25) 0%, rgba(235, 255, 255, 0.15) 50%, rgba(225, 255, 255, 0.2) 100%), linear-gradient(225deg, rgba(120, 255, 255, 0.15) 0%, rgba(100, 255, 255, 0.08) 50%, rgba(80, 255, 255, 0.1) 100%)',
        textColor: 'rgba(20, 80, 80, 0.92)',
        orbBg: '#4AE2E2',
        orbShadow: 'rgba(74, 226, 226, 0.4)'
      },
      orange: {
        panelBg: 'linear-gradient(135deg, rgba(255, 245, 240, 0.3) 0%, rgba(255, 235, 220, 0.25) 50%, rgba(255, 225, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 150, 100, 0.12) 0%, rgba(240, 130, 70, 0.08) 50%, rgba(220, 110, 50, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(240, 130, 70, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(255, 248, 245, 0.25) 0%, rgba(255, 243, 235, 0.15) 50%, rgba(255, 238, 225, 0.2) 100%), linear-gradient(225deg, rgba(255, 170, 120, 0.15) 0%, rgba(255, 150, 100, 0.08) 50%, rgba(255, 130, 80, 0.1) 100%)',
        textColor: 'rgba(80, 50, 20, 0.92)',
        orbBg: '#E2944A',
        orbShadow: 'rgba(226, 148, 74, 0.4)'
      },
      pink: {
        panelBg: 'linear-gradient(135deg, rgba(255, 240, 248, 0.3) 0%, rgba(255, 220, 240, 0.25) 50%, rgba(255, 200, 230, 0.3) 100%), linear-gradient(225deg, rgba(255, 100, 160, 0.12) 0%, rgba(240, 70, 130, 0.08) 50%, rgba(220, 50, 110, 0.1) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.4)',
        panelShadow: 'rgba(240, 70, 130, 0.15)',
        inputBg: 'linear-gradient(135deg, rgba(255, 245, 250, 0.25) 0%, rgba(255, 235, 245, 0.15) 50%, rgba(255, 225, 240, 0.2) 100%), linear-gradient(225deg, rgba(255, 120, 180, 0.15) 0%, rgba(255, 100, 160, 0.08) 50%, rgba(255, 80, 140, 0.1) 100%)',
        textColor: 'rgba(80, 20, 60, 0.92)',
        orbBg: '#E24A94',
        orbShadow: 'rgba(226, 74, 148, 0.4)'
      },
      clear: {
        panelBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.12) 100%)',
        panelBorder: 'rgba(255, 255, 255, 0.3)',
        panelShadow: 'rgba(0, 0, 0, 0.1)',
        inputBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.16) 100%)',
        textColor: 'rgba(40, 40, 40, 0.92)',
        orbBg: '#ffffff',
        orbShadow: 'rgba(0, 0, 0, 0.2)'
      }
    };
    
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
    
    this.init();
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
      
      this.applyGlassTheme();
    } catch (error) {
      console.error('Error loading glass settings:', error);
    }
  }

  init() {
    console.log('Kana Assistant creating orb...');
    try {
      this.createOrb();
      this.setupEventListeners();
      this.setupSpeechRecognition();
      this.loadPosition();
      this.setupMessageListener();
      
      // Load glass settings and apply them
      this.loadGlassSettings();
      
      // Enable adaptive colors by default
      this.useAdaptiveColors = true;
      this.applyAdaptiveColors();
      
      console.log('Kana Assistant initialized successfully!');
    } catch (error) {
      console.error('Kana Assistant initialization failed:', error);
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
      
      this.applyGlassTheme();
    } catch (error) {
      console.error('Error loading glass settings:', error);
      this.applyGlassTheme(); // Apply defaults
    }
  }

  applyGlassTheme() {
    if (!this.chatPanel || !this.orb) return;
    
    const panelTheme = this.glassThemes[this.glassSettings.panelColor];
    const orbTheme = this.glassThemes[this.glassSettings.orbColor];
    
    if (!panelTheme || !orbTheme) return;
    
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
  }

  createOrb() {
    console.log('Creating orb elements...');
    try {
      // Create main container
      this.orbContainer = document.createElement('div');
      this.orbContainer.className = 'kana-orb-container';
      this.orbContainer.setAttribute('role', 'button');
      this.orbContainer.setAttribute('aria-label', 'Kana AI Learning Assistant');
      this.orbContainer.setAttribute('tabindex', '0');
      console.log('Orb container created');

      // Create the orb
      this.orb = document.createElement('div');
      this.orb.className = 'kana-orb';
      
      // Create orb icon
      const orbIcon = document.createElement('div');
      orbIcon.className = 'kana-orb-icon';
      // Create brain SVG icon
      orbIcon.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 24px; height: 24px;">
          <path d="M12 2a3 3 0 0 0-3 3 3 3 0 0 0-3 3v1a3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3V8a3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/>
          <path d="M12 12a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"/>
          <path d="M9 18h6"/>
          <path d="M10 22h4"/>
        </svg>
      `;
      this.orb.appendChild(orbIcon);

      // Create voice indicator
      const voiceIndicator = document.createElement('div');
      voiceIndicator.className = 'kana-voice-indicator';
      this.orb.appendChild(voiceIndicator);

      // Create lock icon
      const lockIcon = document.createElement('div');
      lockIcon.className = 'kana-lock-icon';
      lockIcon.innerHTML = '🔒';
      this.orb.appendChild(lockIcon);

      this.orbContainer.appendChild(this.orb);
      console.log('Orb element created');

      // Create chat panel (will also show responses)
      this.chatPanel = document.createElement('div');
      this.chatPanel.className = 'kana-chat-panel';
      
      // Create response content area (initially hidden)
      const chatResponseContent = document.createElement('div');
      chatResponseContent.className = 'kana-response-content';
      chatResponseContent.style.display = 'none';
      this.chatPanel.appendChild(chatResponseContent);
      
      const chatInput = document.createElement('textarea');
      chatInput.className = 'kana-chat-input';
      chatInput.placeholder = 'Ask Kana about what you\'re learning...';
      chatInput.rows = 2;
      
      // Create input container to hold both textarea and send button
      const inputContainer = document.createElement('div');
      inputContainer.className = 'kana-input-container';
      
      const sendButton = document.createElement('button');
      sendButton.className = 'kana-send-button';
      // Create paper plane send icon
      sendButton.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px;">
          <path d="M22 2 11 13"/>
          <path d="M22 2 15 22 11 13 2 9z"/>
        </svg>
      `;
      sendButton.setAttribute('aria-label', 'Send message');
      
      inputContainer.appendChild(chatInput);
      inputContainer.appendChild(sendButton);
      
      this.chatPanel.appendChild(inputContainer);
      
      console.log('Chat panel created');

      // Add orb to page
      document.body.appendChild(this.orbContainer);
      console.log('Orb added to page');
      
      // Add chat panel to page (separate from orb container)
      document.body.appendChild(this.chatPanel);
      console.log('Chat panel added to page');
      
      // Set initial position
      this.setPosition();
      console.log('Orb positioned');
    } catch (error) {
      console.error('Error creating orb:', error);
    }
  }

  setupEventListeners() {
    // Orb click for chat
    this.orb.addEventListener('click', (e) => {
      if (!this.isDragging) {
        this.toggleChat();
      }
    });

    // Double click to lock/unlock
    this.orb.addEventListener('dblclick', (e) => {
      e.preventDefault();
      this.toggleLock();
    });

    // Drag functionality
    this.orb.addEventListener('mousedown', this.startDrag.bind(this));
    document.addEventListener('mousemove', this.drag.bind(this));
    document.addEventListener('mouseup', this.stopDrag.bind(this));

    // Touch events for mobile
    this.orb.addEventListener('touchstart', this.startDrag.bind(this));
    document.addEventListener('touchmove', this.drag.bind(this));
    document.addEventListener('touchend', this.stopDrag.bind(this));

    // Chat input events
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    const sendButton = this.chatPanel.querySelector('.kana-send-button');
    
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        this.sendChatMessage();
      }
      // Prevent space from closing the panel
      if (e.key === ' ') {
        e.stopPropagation();
      }
    });
    
    // Prevent keydown events from bubbling up
    chatInput.addEventListener('keyup', (e) => {
      e.stopPropagation();
    });
    
    sendButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sendChatMessage();
    });
    
    // Prevent chat panel from closing when clicking inside it
    this.chatPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Click outside to close panels (but not when clicking in chat)
    document.addEventListener('click', (e) => {
      if (!this.orbContainer.contains(e.target) && !this.chatPanel.contains(e.target)) {
        this.hidePanels();
      }
    });
    
    // Prevent chat panel from closing when clicking inside it
    this.chatPanel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // Keyboard accessibility and global shortcuts
    document.addEventListener('keydown', (e) => {
      // Close panels on Escape
      if (e.key === 'Escape') {
        this.hidePanels();
      }
      // Don't close on space unless it's not in an input
      if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        // Only close if not typing in chat
        if (!this.chatPanel.contains(e.target)) {
          this.hidePanels();
        }
      }
    });

    // Reposition panel when window is resized
    window.addEventListener('resize', () => {
      if (this.chatPanel && this.chatPanel.classList.contains('visible')) {
        this.positionPanel(this.chatPanel);
      }
    });
    
    // Reposition panel when page is scrolled
    window.addEventListener('scroll', () => {
      if (this.chatPanel && this.chatPanel.classList.contains('visible')) {
        this.positionPanel(this.chatPanel);
      }
    });
  }

  setupSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      
      this.recognition.onresult = this.handleSpeechResult.bind(this);
      this.recognition.onend = () => {
        if (this.isListening) {
          // Wait a moment before restarting to avoid rapid retries
          setTimeout(() => {
            if (this.isListening) {
              console.log('Restarting speech recognition...');
              try {
                this.recognition.start();
              } catch (error) {
                console.warn('Failed to restart recognition:', error);
              }
            }
          }, 1000);
        }
      };
      
      this.recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        
        // Handle different error types more gracefully
        switch (event.error) {
          case 'aborted':
            // This is usually from stopping/restarting recognition - don't log as error
            console.log('Speech recognition was stopped/restarted');
            break;
          case 'no-speech':
          case 'audio-capture':
            console.log('Recoverable speech error, continuing to listen...');
            break;
          case 'not-allowed':
            console.warn('Microphone access denied by user');
            this.stopListening();
            break;
          case 'network':
            console.warn('Network error in speech recognition');
            this.stopListening();
            setTimeout(() => this.startListening(), 3000);
            break;
          default:
            console.error('Speech recognition error:', event.error);
            this.stopListening();
            // Try to restart after a delay for other errors
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
      this.isListening = true;
      this.recognition.start();
      this.updateOrbState('listening');
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
      console.log('Speech recognized:', transcript);
      
      // Check for wake phrase
      const hasWakePhrase = this.wakePhrases.some(phrase => 
        transcript.includes(phrase)
      );
      
      if (hasWakePhrase) {
        console.log('Wake phrase detected!');
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
        
        console.log('Command after wake phrase:', question);
        
        if (question.length > 0) {
          // Audio feedback - subtle chime
          this.playAudioFeedback('wake');
          
          // Show the chat panel and update its content
          if (!this.chatPanel.classList.contains('visible')) {
            this.showChatPanel();
          }
          
          // Process the voice command
          this.processVoiceCommand(question);
        } else {
          // Just wake up without a command
          console.log('Wake phrase with no command, waiting for input');
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
          gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
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

  processVoiceCommand(command = '') {
    console.log('Processing voice command:', command);
    this.updateOrbState('thinking');
    this.playAudioFeedback('thinking');
    
    // Display in input area what was heard
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    chatInput.value = command;
    
    // Analyze screen content with this command
    this.analyzeScreenContent(command);
  }

  async analyzeScreenContent(userQuestion) {
    console.log('Analyzing screen content for question:', userQuestion);
    try {
      // Get visible text content from the page
      const pageContent = this.extractPageContent();
      console.log('Extracted page content:', pageContent);
      
      // Prioritize content based on what's currently visible in viewport
      const prioritizedContent = this.prioritizeVisibleContent(pageContent);
      console.log('Prioritized visible content:', prioritizedContent);
      console.log('Current section detected:', prioritizedContent.currentSection);
      if (prioritizedContent.currentSection) {
        console.log('Section type:', prioritizedContent.currentSection.type);
        console.log('Question number:', prioritizedContent.currentSection.questionNumber);
        console.log('Full section text:', prioritizedContent.currentSection.fullText);
      }
      console.log('Visible headings:', prioritizedContent.visibleHeadings);
      
      // Find the most relevant visible content for the user's question
      const relevantVisibleContent = this.findMostRelevantVisibleContent(userQuestion, prioritizedContent);
      console.log('Most relevant visible content:', relevantVisibleContent);
      
      // Identify the LMS platform
      const platform = this.identifyLMSPlatform();
      console.log('Identified platform:', platform);
      
      // Parse the user's question with priority on visible content
      const questionContext = this.parseUserQuestionWithViewport(userQuestion, prioritizedContent, relevantVisibleContent);
      console.log('Question context with viewport:', questionContext);
      
      // Generate an educational response (not an answer)
      const educationalResponse = this.generateEducationalResponse(questionContext, pageContent, platform);
      
      // Show the response in the UI
      this.showResponse(educationalResponse);
      
      // Create context for AI processing with viewport priority
      const context = {
        platform: platform,
        url: window.location.href,
        userQuestion: userQuestion,
        questionContext: questionContext,
        pageContent: pageContent,
        prioritizedContent: prioritizedContent,
        relevantVisibleContent: relevantVisibleContent,
        timestamp: new Date().toISOString()
      };
      
      console.log('Created context for AI processing:', context);
      
      // Process with AI
      const response = await this.processWithAI(context);
      console.log('Got AI response:', response);
      
      this.showResponse(response);
      this.updateOrbState('idle');
      console.log('Response shown, orb state reset to idle');
      
    } catch (error) {
      console.error('Error analyzing screen content:', error);
      this.showError('Sorry, I encountered an error analyzing the content.');
      this.updateOrbState('idle');
    }
  }

  extractPageContent() {
    console.log('Starting content extraction...');
    // Extract relevant content from the page
    const content = {
      title: document.title || 'Untitled Page',
      headings: [],
      questions: [],
      assignments: [],
      codeBlocks: [],
      learningObjectives: [],
      text: [],
      links: []
    };
    
    try {
      // Get headings with their hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings.forEach((h, index) => {
        content.headings.push({
          level: h.tagName.toLowerCase(),
          text: h.textContent.trim(),
          id: h.id || `heading-${index}`,
          position: index
        });
      });
      
      // Enhanced question detection patterns
      const questionPatterns = [
        /(?:question|problem|exercise)\s*(?:#|\d+|[a-z])[:\.]?\s*(.*?)(?=(?:question|problem|exercise|\n\n|$))/gi,
        /^\d+[\.\)]\s+(.+?)(?=^\d+[\.\)]|$)/gm,
        /^[a-z][\.\)]\s+(.+?)(?=^[a-z][\.\)]|$)/gm,
        /(?:what|how|why|when|where|which|who).*?\?/gi,
        /(?:explain|describe|analyze|compare|evaluate|discuss).*?(?=\.|$)/gi,
        /(?:calculate|solve|find|determine|prove).*?(?=\.|$)/gi
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
    } catch (error) {
      console.error('Error extracting page content:', error);
      return content;
    }
    
    return content;
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
        textLength: 0,
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
      
      console.log('Search terms for relevance:', searchTerms);
      
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
      
      console.log('Found relevant content with score:', relevantContent.relevanceScore);
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
    console.log("Processing with Gemini AI");
    
    const { questionContext, pageContent, platform, userQuestion } = context;
    const GEMINI_API_KEY = "AIzaSyC1yj16iVGJodO5uWKa0sRYhU7ma9R0qKM";
    
    // List of models to try in order of preference (newest first)
    const MODELS_TO_TRY = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash-002",
      "gemini-1.5-flash",
      "gemini-1.5-pro-002",
      "gemini-1.5-pro", 
      "gemini-pro",
      "gemini-1.0-pro-latest",
      "gemini-1.0-pro"
    ];
    
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
      
      // First, try to get available models
      const availableModels = await this.getAvailableGeminiModels(GEMINI_API_KEY);
      console.log("Available Gemini models:", availableModels);
      
      // Filter our preferred models by what's actually available
      const modelsToTest = availableModels.length > 0 ? 
        MODELS_TO_TRY.filter(model => availableModels.includes(model)) : 
        MODELS_TO_TRY;
      
      console.log("Models to test:", modelsToTest);
      
      // Try each model until one works
      for (const model of modelsToTest) {
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
                maxOutputTokens: 1000,
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
                    maxOutputTokens: 1000,
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
        
        // Parse the AI response to our format
        const formattedResponse = this.parseGeminiResponse(aiResponseText, questionContext);
        
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
        return this.generateDemoResponse(userQuestion, pageContent, platform, `All Gemini models failed: ${errorMessage}`);
      }
    } catch (error) {
      console.error("AI processing error:", error);
      return this.generateDemoResponse(userQuestion, pageContent, platform, error.message);
    }
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
  
  detectSubject(userQuestion, pageContent) {
    // Enhanced subject detection with more specific patterns
    const subjectPatterns = {
      "Unity VR Development": /vr|virtual reality|oculus|headset|controller|interaction|pickup|grab|teleport|6dof|3dof|vr room|unity.*vr|vr.*unity/i,
      "Unity Game Development": /unity(?!.*vr)|game development|gameobject|prefab|script|component|collision|rigidbody|transform|unity.*game|game.*unity/i,
      "Unity Shader Programming": /shader|shadergraph|material|texture|mesh|uv|vertex|fragment|hlsl|surface shader|unity.*shader/i,
      "Web Development": /html|css|javascript|react|vue|angular|nodejs|frontend|backend|web.*dev|fullstack/i,
      "Mobile Development": /android|ios|swift|kotlin|react native|flutter|mobile.*dev|app.*dev/i,
      "Data Science": /machine learning|data science|python.*data|pandas|numpy|tensorflow|pytorch|ai.*model|data.*analysis/i,
      "Computer Science": /algorithm|data structure|binary tree|linked list|sorting|searching|complexity|big o|computer.*science/i,
      "Programming General": /code|programming|function|variable|class|method|array|loop|debug|software/i,
      "Mathematics": /math|algebra|calculus|equation|geometry|trigonometry|number|formula|linear algebra/i,
      "Physics": /physics|force|motion|energy|gravity|mass|velocity|acceleration|momentum|mechanics/i,
      "Chemistry": /chemistry|chemical|reaction|molecule|atom|element|compound|solution|acid|base/i,
      "Biology": /biology|cell|organism|gene|protein|evolution|ecosystem|species|tissue|organ/i,
      "History": /history|century|war|revolution|civilization|empire|kingdom|president|monarch|era|period/i,
      "Literature": /literature|book|novel|author|character|plot|theme|story|writing|poem|poetry/i,
      "Art": /art|design|color|composition|drawing|painting|sculpture|artist|creative|visual/i
    };
    
    // Check the question first with priority order (most specific first)
    for (const [subject, pattern] of Object.entries(subjectPatterns)) {
      if (pattern.test(userQuestion)) {
        return subject;
      }
    }
    
    // Check page content safely
    try {
      const pageText = (pageContent.title || '') + ' ' + 
                      (pageContent.headings ? pageContent.headings.map(h => h.text || '').join(' ') : '') + ' ' +
                      (pageContent.text ? pageContent.text.slice(0, 3).join(' ') : '');
      
      for (const [subject, pattern] of Object.entries(subjectPatterns)) {
        if (pattern.test(pageText)) {
          return subject;
        }
      }
    } catch (error) {
      console.warn('Error in detectSubject:', error);
    }
    
    return null;
  }

  getSubjectResources(subject, userQuestion) {
    // Return subject-specific resources with real links
    const baseResources = [
      {
        title: "Khan Academy",
        url: "https://www.khanacademy.org/",
        description: "Free online courses and practice exercises"
      },
      {
        title: "Coursera",
        url: "https://www.coursera.org/",
        description: "University courses and specializations"
      }
    ];

    switch (subject) {
      case 'Unity VR Development':
        // Check for specific VR interaction topics
        if (/pickup|grab|interact|object.*interact/i.test(userQuestion)) {
          return [
            {
              title: "Unity VR Object Interaction Tutorial",
              url: "https://www.youtube.com/watch?v=2WisM6xcboo",
              description: "Complete guide to VR object pickup and interaction"
            },
            {
              title: "VR Interaction Framework - Unity Learn",
              url: "https://learn.unity.com/tutorial/vr-interaction-framework",
              description: "Official Unity VR interaction system tutorial"
            },
            {
              title: "How to Pick Up Objects in VR",
              url: "https://www.youtube.com/watch?v=DA_cFl_MN_k",
              description: "Step-by-step VR object grabbing mechanics"
            },
            {
              title: "Unity XR Interaction Toolkit",
              url: "https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@latest/",
              description: "Official XR Interaction Toolkit documentation"
            }
          ];
        } else if (/teleport|movement|locomotion/i.test(userQuestion)) {
          return [
            {
              title: "VR Teleportation Tutorial - Unity",
              url: "https://www.youtube.com/watch?v=KHWuTBmT1oI",
              description: "Implementing VR teleportation systems"
            },
            {
              title: "VR Locomotion Techniques",
              url: "https://learn.unity.com/tutorial/vr-locomotion",
              description: "Different approaches to VR movement"
            },
            {
              title: "Unity VR Movement Scripts",
              url: "https://www.youtube.com/watch?v=2D_qEgk_ZLs",
              description: "Complete VR movement implementation"
            }
          ];
        } else {
          // General VR development resources
          return [
            {
              title: "Unity VR Development Course",
              url: "https://learn.unity.com/course/oculus-vr-development",
              description: "Complete Unity VR development course"
            },
            {
              title: "VR Development with Unity - YouTube Series",
              url: "https://www.youtube.com/playlist?list=PLrk7hDwk64-Y6Geabn_xNrjuCnLKd2klJ",
              description: "Comprehensive VR development tutorial series"
            },
            {
              title: "Unity XR Development Documentation",
              url: "https://docs.unity3d.com/Manual/XR.html",
              description: "Official Unity XR and VR documentation"
            }
          ];
        }

      case 'Unity Game Development':
        if (/collision|physics|rigidbody/i.test(userQuestion)) {
          return [
            {
              title: "Unity Physics and Collision Tutorial",
              url: "https://www.youtube.com/watch?v=Bc9lmHjhagc",
              description: "Understanding Unity physics and collisions"
            },
            {
              title: "Rigidbody Mechanics - Unity Learn",
              url: "https://learn.unity.com/tutorial/physics-and-rigidbodies",
              description: "Official Unity physics tutorial"
            },
            {
              title: "Unity Collision Detection Guide",
              url: "https://docs.unity3d.com/ScriptReference/Collision.html",
              description: "Official collision detection documentation"
            }
          ];
        } else if (/script|component|gameobject/i.test(userQuestion)) {
          return [
            {
              title: "Unity Scripting for Beginners",
              url: "https://www.youtube.com/watch?v=UuKX9OJDXDI",
              description: "Complete Unity C# scripting tutorial"
            },
            {
              title: "Unity Component System",
              url: "https://learn.unity.com/tutorial/components-and-scripts",
              description: "Understanding Unity's component architecture"
            },
            {
              title: "Unity Scripting API Reference",
              url: "https://docs.unity3d.com/ScriptReference/",
              description: "Complete Unity scripting documentation"
            }
          ];
        } else {
          return [
            {
              title: "Unity Learn Platform",
              url: "https://learn.unity.com/",
              description: "Official Unity tutorials and courses"
            },
            {
              title: "Brackeys Unity Tutorials",
              url: "https://www.youtube.com/c/Brackeys",
              description: "Popular Unity game development tutorials"
            },
            {
              title: "Unity Documentation",
              url: "https://docs.unity3d.com/",
              description: "Official Unity scripting and component reference"
            }
          ];
        }

      case 'Unity Shader Programming':
        return [
          {
            title: "Unity Shader Graph Tutorial",
            url: "https://www.youtube.com/watch?v=Ar9eIn4z6XE",
            description: "Complete Shader Graph tutorial for beginners"
          },
          {
            title: "Unity Shader Graph Documentation",
            url: "https://docs.unity3d.com/Packages/com.unity.shadergraph@latest/",
            description: "Official Shader Graph documentation"
          },
          {
            title: "HLSL Shader Programming",
            url: "https://www.youtube.com/watch?v=C4_RG8ZWCfM",
            description: "Understanding HLSL for Unity shaders"
          },
          {
            title: "Unity Shaders and Effects Cookbook",
            url: "https://catlikecoding.com/unity/tutorials/rendering/",
            description: "Advanced Unity rendering and shader tutorials"
          }
        ];

      case 'Web Development':
        if (/html|css/i.test(userQuestion)) {
          return [
            {
              title: "HTML & CSS Full Course",
              url: "https://www.youtube.com/watch?v=G3e-cpL7ofc",
              description: "Complete HTML and CSS tutorial"
            },
            {
              title: "MDN Web Docs - HTML",
              url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
              description: "Comprehensive HTML documentation"
            },
            {
              title: "CSS-Tricks",
              url: "https://css-tricks.com/",
              description: "CSS tutorials, guides, and reference"
            }
          ];
        } else if (/javascript|js/i.test(userQuestion)) {
          return [
            {
              title: "JavaScript Full Course for Beginners",
              url: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
              description: "Complete JavaScript tutorial"
            },
            {
              title: "MDN JavaScript Guide",
              url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
              description: "Official JavaScript documentation"
            },
            {
              title: "JavaScript.info",
              url: "https://javascript.info/",
              description: "Modern JavaScript tutorial"
            }
          ];
        } else {
          return [
            {
              title: "FreeCodeCamp Web Development",
              url: "https://www.freecodecamp.org/",
              description: "Free full-stack web development course"
            },
            {
              title: "The Odin Project",
              url: "https://www.theodinproject.com/",
              description: "Free full-stack curriculum"
            },
            {
              title: "MDN Web Docs",
              url: "https://developer.mozilla.org/",
              description: "Comprehensive web development documentation"
            }
          ];
        }

      case 'Computer Science':
        return [
          {
            title: "CS50 Introduction to Computer Science",
            url: "https://www.youtube.com/watch?v=YoXxevp1WRQ&list=PLhQjrBD2T382_R182iC2gNZI9HzWFMC_8",
            description: "Harvard's comprehensive intro CS course"
          },
          {
            title: "Data Structures and Algorithms",
            url: "https://www.youtube.com/watch?v=RBSGKlAvoiM",
            description: "Complete DSA course for beginners"
          },
          {
            title: "LeetCode",
            url: "https://leetcode.com/",
            description: "Practice coding problems and algorithms"
          },
          {
            title: "GeeksforGeeks",
            url: "https://www.geeksforgeeks.org/",
            description: "Computer science tutorials and practice"
          }
        ];

      case 'Mathematics':
        return [
          {
            title: "Khan Academy Math",
            url: "https://www.khanacademy.org/math",
            description: "Free math lessons from basic to advanced"
          },
          {
            title: "Professor Leonard",
            url: "https://www.youtube.com/c/ProfessorLeonard",
            description: "Clear math explanations and examples"
          },
          {
            title: "Wolfram Alpha",
            url: "https://www.wolframalpha.com/",
            description: "Step-by-step solutions and calculations"
          },
          {
            title: "Paul's Online Math Notes",
            url: "https://tutorial.math.lamar.edu/",
            description: "Comprehensive calculus and algebra notes"
          }
        ];

      case 'Physics':
        return [
          {
            title: "Khan Academy Physics",
            url: "https://www.khanacademy.org/science/physics",
            description: "Interactive physics lessons and practice"
          },
          {
            title: "Physics Classroom",
            url: "https://www.physicsclassroom.com/",
            description: "Comprehensive physics tutorials and concepts"
          },
          {
            title: "MinutePhysics",
            url: "https://www.youtube.com/user/minutephysics",
            description: "Quick, visual physics explanations"
          },
          {
            title: "HyperPhysics",
            url: "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html",
            description: "Interactive physics concept map"
          }
        ];

      case 'Chemistry':
        return [
          {
            title: "Khan Academy Chemistry",
            url: "https://www.khanacademy.org/science/chemistry",
            description: "Complete chemistry course with practice"
          },
          {
            title: "Crash Course Chemistry",
            url: "https://www.youtube.com/playlist?list=PL8dPuuaLjXtPHzzYuWy6fYEaX9mQQ8oGr",
            description: "Engaging chemistry video series"
          },
          {
            title: "ChemCollective",
            url: "http://chemcollective.org/",
            description: "Virtual chemistry labs and simulations"
          },
          {
            title: "PubChem",
            url: "https://pubchem.ncbi.nlm.nih.gov/",
            description: "Chemical database and molecular information"
          }
        ];

      case 'Biology':
        return [
          {
            title: "Khan Academy Biology",
            url: "https://www.khanacademy.org/science/biology",
            description: "Comprehensive biology lessons and practice"
          },
          {
            title: "Crash Course Biology",
            url: "https://www.youtube.com/playlist?list=PL3EED4C1D684D3ADF",
            description: "Fun and informative biology videos"
          },
          {
            title: "Biology Online",
            url: "https://www.biologyonline.com/",
            description: "Biology dictionary and study guides"
          },
          {
            title: "NCBI Learning Center",
            url: "https://www.ncbi.nlm.nih.gov/home/learn/",
            description: "Bioinformatics and molecular biology resources"
          }
        ];

      default:
        // Check for specific keywords in the question to provide targeted resources
        if (/programming|code|software/i.test(userQuestion)) {
          return [
            {
              title: "FreeCodeCamp",
              url: "https://www.freecodecamp.org/",
              description: "Learn to code for free with interactive lessons"
            },
            {
              title: "Codecademy",
              url: "https://www.codecademy.com/",
              description: "Interactive programming courses"
            },
            {
              title: "Stack Overflow",
              url: "https://stackoverflow.com/",
              description: "Programming Q&A community"
            }
          ];
        } else if (/study|learn|education/i.test(userQuestion)) {
          return [
            {
              title: "Coursera",
              url: "https://www.coursera.org/",
              description: "University-level courses from top institutions"
            },
            {
              title: "edX",
              url: "https://www.edx.org/",
              description: "Free online courses from universities"
            },
            {
              title: "Khan Academy",
              url: "https://www.khanacademy.org/",
              description: "Free education for anyone, anywhere"
            }
          ];
        } else {
          return baseResources;
        }
    }
  }
  
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
  
  prepareGeminiPrompt(userQuestion, pageContent, platform, prioritizedContent = null, relevantVisibleContent = null) {
    // Create a well-structured prompt for the Gemini API with viewport awareness
    let prompt = `You are Kana, a friendly AI learning assistant that helps students understand concepts and develop problem-solving skills.

CONTEXT:
Platform: ${platform}
Page: ${pageContent.title || 'Learning content'}
Student Question: "${userQuestion}"`;

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

GUIDELINES FOR RESPONSE:
- IMPORTANT: The student is asking about what they can currently see on their screen
- If they ask "what question am I on?" respond with the Current Question number and brief description
- If they ask "what should I do here?" or "give me insight on this", focus on the Current Question content
- When they say "this" they mean the question/section currently visible on their screen
- Provide educational guidance for the specific question they're viewing
- Help them understand the concepts without giving direct answers
- Ask follow-up questions to guide their thinking
- Use encouraging, supportive language
- Format with HTML headings (h3), paragraphs (p), and lists (ul/li)
- ALWAYS include helpful resources: SPECIFIC tutorials and guides that directly address the exact topic/problem
- For Unity VR questions: provide Unity VR tutorials, XR Interaction Toolkit guides, specific VR mechanics tutorials
- For coding questions: provide tutorials about the specific programming concept, not general programming courses
- For math/science: provide tutorials about the specific mathematical or scientific concept being asked about
- Provide 2-4 highly relevant links that directly help with the current specific question or problem
- Avoid generic educational platforms unless they have specific content for the exact topic

RESOURCE GUIDELINES:
- If asking about Unity VR object interaction → Unity VR interaction tutorials, XR Toolkit docs
- If asking about specific algorithms → algorithm-specific tutorials and visualizations  
- If asking about math concepts → tutorials specifically about that mathematical concept
- If asking about physics problems → physics tutorials about that specific topic
- Make resources as specific and directly relevant as possible

RESPONSE FORMAT:
1. Greeting and context acknowledgment
2. Learning guidance specific to their question using Markdown formatting
3. Key concepts breakdown
4. Helpful resources section with real links formatted as: [Title](URL)
   
Examples of good resource formatting:
- [Khan Academy Linear Algebra](https://www.khanacademy.org/math/linear-algebra)
- [CS50 Introduction to Programming](https://www.youtube.com/watch?v=YoXxevp1WRQ)
- [Unity Learn Platform](https://learn.unity.com/)
- [MDN Web Development Docs](https://developer.mozilla.org/)

IMPORTANT: Always include at least 2-3 real, working links to educational resources that directly relate to the student's question. Use the [Title](URL) format for all links.

Focus your response on the Current Question/Section they are viewing and provide specific, contextual help with actionable resources.`;

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
  
  parseGeminiResponse(aiResponseText, questionContext) {
    try {
      // Remove markdown code blocks if present
      let cleanedResponse = aiResponseText.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/g, '').replace(/\s*```$/g, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/g, '').replace(/\s*```$/g, '');
      }
      
      // Check if the response is in JSON format
      if (cleanedResponse.startsWith('{')) {
        try {
          const jsonResponse = JSON.parse(cleanedResponse);
          return {
            type: 'learning_guidance',
            title: jsonResponse.title || this.generateResponseTitle(questionContext),
            content: jsonResponse.content || "I'm here to help guide your learning process.",
            hints: jsonResponse.hints || ["Break down the problem into smaller parts"],
            resources: jsonResponse.resources || [],
            concepts: jsonResponse.concepts || ["Critical Thinking"],
            nextSteps: jsonResponse.nextSteps || ["Review your course materials"]
          };
        } catch (jsonError) {
          console.warn("Failed to parse JSON response:", jsonError);
          // Continue to text parsing approach
        }
      }
      
      // For HTML/text responses, create a structured response
      let processedContent = cleanedResponse;
      
      // Convert Markdown to HTML if it's not already HTML
      if (!processedContent.includes('<') || processedContent.includes('**') || processedContent.includes('##')) {
        processedContent = this.convertMarkdownToHtml(processedContent);
      }
      
      return {
        type: 'learning_guidance',
        title: this.generateResponseTitle(questionContext),
        content: `<div class="kana-ai-response">${processedContent}</div>`,
        hints: this.extractHintsFromResponse(cleanedResponse),
        concepts: this.extractConceptsFromResponse(cleanedResponse, questionContext),
        nextSteps: this.extractNextStepsFromResponse(cleanedResponse),
        resources: this.extractResourcesFromResponse(cleanedResponse, questionContext)
      };
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return {
        type: 'learning_guidance',
        title: "Learning Support",
        content: `<div class="kana-ai-response">${this.convertMarkdownToHtml(aiResponseText || "I'm here to help guide your learning process.")}</div>`,
        hints: ["Break down the concept into smaller parts"],
        concepts: ["Critical Thinking"],
        nextSteps: ["Review your course materials"],
        resources: this.getSubjectResources(null, aiResponseText || "").slice(0, 2)
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
    
    // Convert unordered lists (- item or * item -> <ul><li>item</li></ul>)
    html = html.replace(/^\s*[-\*\+]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Convert numbered lists (1. item -> <ol><li>item</li></ol>)
    html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, function(match) {
      // Only convert if it's not already in a <ul> tag
      if (match.includes('<ul>')) {
        return match;
      }
      return '<ol>' + match + '</ol>';
    });
    
    // Fix multiple consecutive ul/ol tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    
    // Convert line breaks to proper paragraphs
    const paragraphs = html.split(/\n\s*\n/);
    html = paragraphs.map(p => {
      p = p.trim();
      if (!p) return '';
      
      // Don't wrap if it's already a block element
      if (p.match(/^<(h[1-6]|ul|ol|div|blockquote)/)) {
        return p;
      }
      
      // Don't wrap single list items
      if (p.match(/^<li>/)) {
        return p;
      }
      
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    // Clean up any remaining newlines in non-paragraph content
    html = html.replace(/\n(?![<>])/g, '<br>');
    
    return html;
  }
  
  extractHintsFromResponse(response) {
    // Extract hints from the response text
    const hintKeywords = ['hint', 'try', 'consider', 'think about', 'remember', 'start by'];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const hints = sentences.filter(sentence => 
      hintKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    ).slice(0, 3);
    
    return hints.length > 0 ? hints : [
      "Break down the problem into smaller parts",
      "Connect concepts to what you already know",
      "Try explaining the concept in your own words"
    ];
  }
  
  extractConceptsFromResponse(response, questionContext) {
    // Extract key concepts from the response
    const commonConcepts = ['Critical Thinking', 'Problem Solving', 'Analysis', 'Comprehension'];
    const subject = this.detectSubject(response, { text: [response] });
    
    if (subject && subject !== 'General') {
      return [subject, ...commonConcepts.slice(0, 2)];
    }
    
    return commonConcepts.slice(0, 3);
  }
  
  extractNextStepsFromResponse(response) {
    // Extract next steps from the response
    const stepKeywords = ['next', 'should', 'review', 'practice', 'study', 'read'];
    const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    const steps = sentences.filter(sentence => 
      stepKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    ).slice(0, 3);
    
    return steps.length > 0 ? steps : [
      "Review related course materials",
      "Practice with similar problems",
      "Discuss concepts with classmates"
    ];
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
      let html = `
        <div class="kana-response">
          <h3>${response.title}</h3>
          <div class="kana-response-main">
            ${response.content}
          </div>
      `;
      
      if (response.hints && response.hints.length > 0) {
        html += `
          <div class="kana-hints">
            <h4>Learning Hints</h4>
            <ul>
              ${response.hints.map(hint => `<li>${hint}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (response.concepts && response.concepts.length > 0) {
        html += `
          <div class="kana-concepts">
            <h4>Key Concepts</h4>
            <ul>
              ${response.concepts.map(concept => `<li>${concept}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (response.nextSteps && response.nextSteps.length > 0) {
        html += `
          <div class="kana-next-steps">
            <h4>Next Steps</h4>
            <ul>
              ${response.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (response.resources && response.resources.length > 0) {
        html += `
          <div class="kana-resources">
            <h4>Helpful Resources</h4>
            <ul>
              ${response.resources.map(resource => `
                <li>
                  <a href="${resource.url}" target="_blank" rel="noopener noreferrer">
                    ${resource.title}
                  </a>
                  ${resource.description ? ` - ${resource.description}` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }
      
      html += `
        </div>
      `;
      
      responseContent.innerHTML = html;
      
      // Scroll to top of response
      responseContent.scrollTop = 0;
    }
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
  
  sendChatMessage() {
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    const message = chatInput.value.trim();
    
    if (message) {
      console.log('Sending chat message:', message);
      chatInput.value = '';
      
      // Process the message
      this.analyzeScreenContent(message);
    }
  }
  
  sendChatMessage() {
    const chatInput = this.chatPanel.querySelector('.kana-chat-input');
    const message = chatInput.value.trim();
    
    if (message) {
      console.log('Sending chat message:', message);
      chatInput.value = '';
      
      // Process the message
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
    if (settings.useAdaptiveColors !== undefined) {
      this.useAdaptiveColors = settings.useAdaptiveColors;
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
    
    // Calculate contrasting text color (white or black)
    const brightness = this.calculateColorBrightness(mainColor);
    const textColor = brightness > 128 ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.9)';
    
    // Create complementary colors for better visual appeal
    const lightColor = this.lightenColor(mainColor, 0.3);
    const darkColor = this.darkenColor(mainColor, 0.2);
    
    // Apply styles with enhanced glassmorphic effect
    orb.style.setProperty('--kana-adaptive-bg', 
      `linear-gradient(135deg, 
        rgba(${mainColor.r}, ${mainColor.g}, ${mainColor.b}, 0.4) 0%, 
        rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.2) 100%)`);
    orb.style.setProperty('--kana-adaptive-border', 
      `rgba(${lightColor.r}, ${lightColor.g}, ${lightColor.b}, 0.6)`);
    orb.style.setProperty('--kana-adaptive-text', textColor);
    orb.style.setProperty('--kana-adaptive-shadow', 
      `0 8px 32px rgba(${darkColor.r}, ${darkColor.g}, ${darkColor.b}, 0.3)`);
    
    console.log('Applied adaptive colors to orb:', mainColor);
  }
  
  adaptPanelBackground(colors) {
    if (!colors || !colors.main) return;
    
    // Get the panel
    const panel = this.chatPanel;
    panel.classList.add('adaptive-colors');
    
    const mainColor = colors.main;
    
    // Calculate contrasting text color
    const brightness = this.calculateColorBrightness(mainColor);
    const textColor = brightness > 128 ? 'rgba(0, 0, 0, 0.85)' : 'rgba(255, 255, 255, 0.9)';
    
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
    
    console.log('Applied adaptive colors to panel:', mainColor);
  }
  
  sampleBackgroundColors() {
    // Sample colors from the page background
    const samples = [];
    
    // Add body background
    samples.push(window.getComputedStyle(document.body).backgroundColor);
    
    // Add element background colors
    const elements = [
      'main', 'article', 'section', 'header', 'nav', 
      '.content', '.main-content', '.page-content'
    ];
    
    elements.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) {
        const bg = window.getComputedStyle(el).backgroundColor;
        if (bg) samples.push(bg);
      }
    });
    
    if (samples.length === 0) {
      // Default fallback
      return { main: { r: 100, g: 150, b: 220, a: 1 } };
    }
    
    // Find the most suitable color (one that's not white/black)
    for (const sample of samples) {
      const color = this.parseColor(sample);
      if (color) {
        const brightness = this.calculateColorBrightness(color);
        if (brightness > 30 && brightness < 230) {
          return { main: color };
        }
      }
    }
    
    // If no suitable color found, use first valid color
    for (const sample of samples) {
      const color = this.parseColor(sample);
      if (color) {
        return { main: color };
      }
    }
    
    // Ultimate fallback
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

  // ...existing code...
}

// Initialize the assistant when the content script loads
const kanaAssistant = new KanaAssistant();

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { KanaAssistant };
}