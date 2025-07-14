/**
 * Kana Voice Integration
 * Minimal integration layer that enhances existing voice system
 */

class KanaVoiceIntegration {
  constructor() {
    this.voiceRecognition = null;
    this.isEnhancedVoiceEnabled = false;
    this.currentTranscript = '';
    this.isProcessingVoice = false;
    
    this.initializeEnhancedVoice();
  }
  
  async initializeEnhancedVoice() {
    try {
      // Load the enhanced voice recognition module
      if (typeof KanaVoiceRecognition !== 'undefined') {
        this.voiceRecognition = new KanaVoiceRecognition();
        
        // Set up callbacks
        this.voiceRecognition.setCallbacks({
          onTranscript: (text, isFinal, confidence) => {
            this.handleTranscript(text, isFinal, confidence);
          },
          onFinalTranscript: (text, confidence) => {
            this.handleFinalTranscript(text, confidence);
          },
          onError: (error) => {
            this.handleVoiceError(error);
          },
          onStatusChange: (status) => {
            this.handleStatusChange(status);
          }
        });
        
        this.isEnhancedVoiceEnabled = true;
        console.log('🎙️ Enhanced voice recognition initialized');
        
        // Update UI to show enhanced voice capabilities
        this.updateVoiceUI();
        
      } else {
        console.warn('⚠️ Enhanced voice recognition not available');
      }
    } catch (error) {
      console.error('❌ Failed to initialize enhanced voice:', error);
    }
  }
  
  handleTranscript(text, isFinal, confidence) {
    this.currentTranscript = text;
    
    // Update UI with real-time transcript
    this.updateTranscriptDisplay(text, isFinal, confidence);
    
    // Auto-submit on high-confidence final results
    if (isFinal && confidence > 0.85 && text.trim().length > 3) {
      setTimeout(() => {
        this.submitVoiceInput(text);
      }, 500); // Small delay to allow for corrections
    }
  }
  
  handleFinalTranscript(text, confidence) {
    console.log(`🎤 Final transcript (${Math.round(confidence * 100)}%): "${text}"`);
    
    // Store for potential resubmission
    this.lastFinalTranscript = { text, confidence, timestamp: Date.now() };
    
    // Submit to existing Kana system
    this.submitVoiceInput(text);
  }
  
  handleVoiceError(error) {
    console.error('🎙️ Voice error:', error);
    
    // Show user-friendly error message
    this.showVoiceErrorMessage(error);
    
    // Fallback to original Web Speech API if available
    if (window.kanaAI && window.kanaAI.startVoiceRecognition) {
      console.log('🔄 Falling back to original voice system');
      // Let original system handle it
    }
  }
  
  handleStatusChange(status) {
    console.log('🎙️ Voice status:', status);
    
    // Update orb visual state
    this.updateOrbStatus(status);
    
    switch (status) {
      case 'listening':
        this.setOrbState('listening');
        break;
      case 'processing':
        this.setOrbState('thinking');
        break;
      case 'wake_word_detected':
        this.setOrbState('speaking');
        // Flash the orb to indicate wake word detected
        setTimeout(() => this.setOrbState('listening'), 1000);
        break;
      case 'error':
        this.setOrbState('error');
        setTimeout(() => this.setOrbState('idle'), 3000);
        break;
      default:
        this.setOrbState('idle');
    }
  }
  
  submitVoiceInput(text) {
    if (this.isProcessingVoice) {
      console.log('🔄 Already processing voice input, skipping');
      return;
    }
    
    this.isProcessingVoice = true;
    
    try {
      // Find chat input and submit
      const chatInput = document.querySelector('.kana-chat-input');
      if (chatInput && window.kanaAI) {
        // Set the text
        chatInput.value = text;
        
        // Trigger input event to update any listeners
        chatInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Submit through existing system
        if (window.kanaAI.handleUserInput) {
          window.kanaAI.handleUserInput(text);
        } else {
          // Fallback: trigger send button
          const sendButton = document.querySelector('.kana-send-button');
          if (sendButton) {
            sendButton.click();
          }
        }
        
        console.log('✅ Voice input submitted:', text);
        
        // Clear transcript display
        this.clearTranscriptDisplay();
        
      } else {
        console.warn('⚠️ Chat input not found, cannot submit voice input');
      }
    } catch (error) {
      console.error('❌ Failed to submit voice input:', error);
    } finally {
      // Reset processing flag after delay
      setTimeout(() => {
        this.isProcessingVoice = false;
      }, 1000);
    }
  }
  
  updateTranscriptDisplay(text, isFinal, confidence) {
    // Create or update transcript overlay
    let transcriptDisplay = document.querySelector('.kana-voice-transcript');
    
    if (!transcriptDisplay) {
      transcriptDisplay = document.createElement('div');
      transcriptDisplay.className = 'kana-voice-transcript';
      transcriptDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 2147483648;
        max-width: 80vw;
        text-align: center;
        backdrop-filter: blur(10px);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
      `;
      document.body.appendChild(transcriptDisplay);
    }
    
    // Update content
    const confidenceIndicator = confidence ? `${Math.round(confidence * 100)}%` : '';
    const statusIndicator = isFinal ? '✅' : '🎤';
    
    transcriptDisplay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${statusIndicator}</span>
        <span style="flex: 1;">${text}</span>
        ${confidenceIndicator ? `<span style="font-size: 12px; opacity: 0.7;">${confidenceIndicator}</span>` : ''}
      </div>
    `;
    
    // Show with animation
    transcriptDisplay.style.opacity = '1';
    
    // Auto-hide interim results after delay
    if (!isFinal) {
      clearTimeout(this.transcriptHideTimeout);
      this.transcriptHideTimeout = setTimeout(() => {
        if (transcriptDisplay && !isFinal) {
          transcriptDisplay.style.opacity = '0';
        }
      }, 3000);
    }
  }
  
  clearTranscriptDisplay() {
    const transcriptDisplay = document.querySelector('.kana-voice-transcript');
    if (transcriptDisplay) {
      transcriptDisplay.style.opacity = '0';
      setTimeout(() => {
        if (transcriptDisplay.parentNode) {
          transcriptDisplay.parentNode.removeChild(transcriptDisplay);
        }
      }, 300);
    }
  }
  
  setOrbState(state) {
    const orb = document.querySelector('.kana-orb');
    if (orb) {
      // Remove existing state classes
      orb.classList.remove('listening', 'thinking', 'speaking', 'error');
      
      // Add new state class
      if (state !== 'idle') {
        orb.classList.add(state);
      }
    }
  }
  
  updateOrbStatus(status) {
    // Update any status indicators on the orb
    const voiceIndicator = document.querySelector('.kana-voice-indicator');
    if (voiceIndicator) {
      voiceIndicator.classList.toggle('active', status === 'listening');
    }
  }
  
  updateVoiceUI() {
    // Add enhanced voice indicator to UI
    const orbContainer = document.querySelector('.kana-orb-container');
    if (orbContainer && !document.querySelector('.kana-enhanced-voice-indicator')) {
      const enhancedIndicator = document.createElement('div');
      enhancedIndicator.className = 'kana-enhanced-voice-indicator';
      enhancedIndicator.style.cssText = `
        position: absolute;
        top: -3px;
        left: -3px;
        width: 8px;
        height: 8px;
        background: #4AE290;
        border-radius: 50%;
        box-shadow: 0 0 4px rgba(74, 226, 144, 0.6);
        opacity: ${this.isEnhancedVoiceEnabled ? '1' : '0'};
        transition: opacity 0.3s ease;
      `;
      enhancedIndicator.title = 'Enhanced Voice Recognition Active';
      orbContainer.appendChild(enhancedIndicator);
    }
  }
  
  showVoiceErrorMessage(error) {
    // Create temporary error notification
    const errorNotification = document.createElement('div');
    errorNotification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 82, 82, 0.9);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483648;
      backdrop-filter: blur(10px);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    errorNotification.textContent = `Voice Recognition Error: ${error}`;
    
    document.body.appendChild(errorNotification);
    
    // Animate in
    setTimeout(() => {
      errorNotification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove after delay
    setTimeout(() => {
      errorNotification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (errorNotification.parentNode) {
          errorNotification.parentNode.removeChild(errorNotification);
        }
      }, 300);
    }, 5000);
  }
  
  // Public API methods
  startEnhancedListening() {
    if (this.voiceRecognition) {
      return this.voiceRecognition.startListening();
    }
    return Promise.reject('Enhanced voice not available');
  }
  
  stopEnhancedListening() {
    if (this.voiceRecognition) {
      this.voiceRecognition.stopListening();
    }
  }
  
  startWakeWordDetection() {
    if (this.voiceRecognition) {
      this.voiceRecognition.startWakeWordDetection();
    }
  }
  
  stopWakeWordDetection() {
    if (this.voiceRecognition) {
      this.voiceRecognition.stopWakeWordDetection();
    }
  }
  
  isEnhancedAvailable() {
    return this.isEnhancedVoiceEnabled && this.voiceRecognition;
  }
  
  getVoiceStatus() {
    if (this.voiceRecognition) {
      return this.voiceRecognition.getStatus();
    }
    return null;
  }
}

// Initialize voice integration when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.kanaVoiceIntegration = new KanaVoiceIntegration();
  });
} else {
  window.kanaVoiceIntegration = new KanaVoiceIntegration();
}

// Export for external use
window.KanaVoiceIntegration = KanaVoiceIntegration;
