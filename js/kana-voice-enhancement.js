/**
 * Kana Voice Enhancement Patch
 * Minimal modifications to integrate enhanced voice recognition
 * 
 * This file contains only the necessary additions to connect the enhanced
 * voice system with the existing Kana AI functionality.
 */

// Voice Enhancement Integration
(function() {
  'use strict';
  
  // Wait for the main KanaAssistant instance to be available
  function waitForKanaAI() {
    if (typeof window.kanaAssistant !== 'undefined' && window.kanaAssistant) {
      enhanceVoiceCapabilities();
    } else {
      setTimeout(waitForKanaAI, 100);
    }
  }
  
  function enhanceVoiceCapabilities() {
    const originalKanaAI = window.kanaAssistant;
    
    // Store original voice methods
    const originalStartVoiceRecognition = originalKanaAI.startVoiceRecognition?.bind(originalKanaAI);
    const originalStopVoiceRecognition = originalKanaAI.stopVoiceRecognition?.bind(originalKanaAI);
    const originalHandleVoiceInput = originalKanaAI.handleVoiceInput?.bind(originalKanaAI);
    
    // Enhanced voice input handler
    originalKanaAI.handleVoiceInput = function(transcript) {
      console.log('🎤 Enhanced voice input received:', transcript);
      
      // Use enhanced voice integration if available
      if (window.kanaVoiceIntegration && window.kanaVoiceIntegration.isEnhancedAvailable()) {
        // The voice integration will handle submission automatically
        return;
      }
      
      // Fallback to original implementation
      if (originalHandleVoiceInput) {
        return originalHandleVoiceInput(transcript);
      }
      
      // Default fallback: submit to chat
      this.handleUserInput(transcript);
    };
    
    // Enhanced start voice recognition
    originalKanaAI.startVoiceRecognition = function() {
      console.log('🎙️ Starting enhanced voice recognition');
      
      // Try enhanced voice first
      if (window.kanaVoiceIntegration && window.kanaVoiceIntegration.isEnhancedAvailable()) {
        return window.kanaVoiceIntegration.startEnhancedListening()
          .catch(error => {
            console.warn('🔄 Enhanced voice failed, falling back to original:', error);
            if (originalStartVoiceRecognition) {
              return originalStartVoiceRecognition();
            }
          });
      }
      
      // Fallback to original implementation
      if (originalStartVoiceRecognition) {
        return originalStartVoiceRecognition();
      }
    };
    
    // Enhanced stop voice recognition
    originalKanaAI.stopVoiceRecognition = function() {
      console.log('🔇 Stopping enhanced voice recognition');
      
      // Stop enhanced voice
      if (window.kanaVoiceIntegration) {
        window.kanaVoiceIntegration.stopEnhancedListening();
      }
      
      // Also stop original implementation
      if (originalStopVoiceRecognition) {
        originalStopVoiceRecognition();
      }
    };
    
    // Add wake word detection method
    originalKanaAI.startWakeWordDetection = function() {
      console.log('👋 Starting wake word detection');
      if (window.kanaVoiceIntegration) {
        window.kanaVoiceIntegration.startWakeWordDetection();
      }
    };
    
    originalKanaAI.stopWakeWordDetection = function() {
      console.log('👋 Stopping wake word detection');
      if (window.kanaVoiceIntegration) {
        window.kanaVoiceIntegration.stopWakeWordDetection();
      }
    };
    
    // Add voice status getter
    originalKanaAI.getVoiceStatus = function() {
      if (window.kanaVoiceIntegration) {
        return window.kanaVoiceIntegration.getVoiceStatus();
      }
      return null;
    };
    
    console.log('✅ Voice capabilities enhanced for KanaAI');
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForKanaAI);
  } else {
    waitForKanaAI();
  }
  
  // Add voice backend status check with better error handling
  function checkVoiceBackendStatus() {
    // Try different approaches to connect to voice backend
    const backendUrls = [
      'http://localhost:3001/health',
      'http://127.0.0.1:3001/health'
    ];
    
    async function tryConnection(url) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('🎙️ Voice backend status:', data);
          updateVoiceBackendIndicator(true);
          return true;
        }
      } catch (error) {
        console.log(`📴 Failed to connect to ${url}:`, error.message);
      }
      return false;
    }
    
    // Try each URL
    Promise.all(backendUrls.map(tryConnection))
      .then(results => {
        const anySuccess = results.some(result => result);
        if (!anySuccess) {
          console.log('📴 Voice backend not available - using fallback');
          updateVoiceBackendIndicator(false);
        }
      });
  }
  
  function updateVoiceBackendIndicator(isAvailable) {
    // Find or create voice backend status indicator
    let indicator = document.querySelector('.kana-voice-backend-status');
    
    if (!indicator) {
      const orbContainer = document.querySelector('.kana-orb-container');
      if (orbContainer) {
        indicator = document.createElement('div');
        indicator.className = 'kana-voice-backend-status';
        indicator.style.cssText = `
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.3s ease;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        `;
        indicator.title = isAvailable ? 
          'Enhanced Voice Backend Connected' : 
          'Using Fallback Voice Recognition';
        orbContainer.appendChild(indicator);
      }
    }
    
    if (indicator) {
      indicator.style.background = isAvailable ? '#4AE290' : '#FFB347';
      indicator.style.boxShadow = isAvailable ? 
        '0 0 4px rgba(74, 226, 144, 0.6)' : 
        '0 0 4px rgba(255, 179, 71, 0.6)';
    }
  }
  
  // Check voice backend status periodically
  setTimeout(checkVoiceBackendStatus, 2000);
  setInterval(checkVoiceBackendStatus, 30000); // Check every 30 seconds
  
})();
