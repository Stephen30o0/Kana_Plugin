/**
 * Kana Enhanced Voice Recognition System
 * Provides Cluely-level speed and accuracy using Google Cloud Speech-to-Text
 */

class KanaVoiceRecognition {
  constructor() {
    this.isListening = false;
    this.isConnected = false;
    this.ws = null;
    this.mediaRecorder = null;
    this.audioStream = null;
    this.voiceBackendUrl = 'ws://localhost:3001';
    this.fallbackToWebSpeech = true;
    this.webSpeechRecognition = null;
    
    // Voice activity detection
    this.silenceTimeout = null;
    this.speechStarted = false;
    this.lastTranscriptTime = 0;
    
    // Push-to-talk mode (replaces wake word detection)
    this.isPushToTalkMode = false;
    this.isCurrentlyRecording = false;
    
    // Callbacks
    this.onTranscript = null;
    this.onFinalTranscript = null;
    this.onError = null;
    this.onStatusChange = null;
    
    this.initializeVoiceSystem();
  }
  
  setPushToTalkMode(enabled) {
    this.isPushToTalkMode = enabled;
    console.log('🎤 Push-to-Talk mode:', enabled ? 'enabled' : 'disabled');
  }
  
  async initializeVoiceSystem() {
    try {
      // Try to connect to enhanced backend first
      await this.connectToVoiceBackend();
    } catch (error) {
      console.warn('🔄 Voice backend unavailable, falling back to Web Speech API');
      if (this.fallbackToWebSpeech) {
        this.initializeWebSpeechAPI();
      }
    }
  }
  
  async connectToVoiceBackend() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.voiceBackendUrl);
        
        this.ws.onopen = () => {
          console.log('🎙️ Connected to Kana Voice Backend');
          this.isConnected = true;
          this.notifyStatusChange('connected');
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.handleBackendMessage(data);
        };
        
        this.ws.onclose = () => {
          console.log('📴 Voice backend disconnected');
          this.isConnected = false;
          this.notifyStatusChange('disconnected');
          
          // Fallback to Web Speech API
          if (this.fallbackToWebSpeech && !this.webSpeechRecognition) {
            this.initializeWebSpeechAPI();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ Voice backend error:', error);
          reject(error);
        };
        
        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Voice backend connection timeout'));
          }
        }, 5000);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  initializeWebSpeechAPI() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Web Speech API not supported');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.webSpeechRecognition = new SpeechRecognition();
    
    this.webSpeechRecognition.continuous = true;
    this.webSpeechRecognition.interimResults = true;
    this.webSpeechRecognition.lang = 'en-US';
    
    this.webSpeechRecognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (interimTranscript && this.onTranscript) {
        this.onTranscript(interimTranscript, false, 0.8);
      }
      
      if (finalTranscript && this.onFinalTranscript) {
        this.onFinalTranscript(finalTranscript, 0.8);
      }
    };
    
    this.webSpeechRecognition.onerror = (event) => {
      console.error('🔊 Web Speech API error:', event.error);
      if (this.onError) {
        this.onError(event.error);
      }
    };
    
    console.log('🔊 Web Speech API initialized as fallback');
  }
  
  handleBackendMessage(data) {
    switch (data.type) {
      case 'transcript':
        this.lastTranscriptTime = Date.now();
        
        if (this.onTranscript) {
          this.onTranscript(data.text, data.isFinal, data.confidence);
        }
        
        if (data.isFinal && this.onFinalTranscript) {
          this.onFinalTranscript(data.text, data.confidence);
        }
        
        // Handle wake word detection
        if (this.isWakeWordMode && this.detectWakeWord(data.text)) {
          this.onWakeWordDetected(data.text);
        }
        
        break;
        
      case 'error':
        console.error('🎙️ Backend error:', data.message);
        if (this.onError) {
          this.onError(data.message);
        }
        break;
        
      case 'recognition_ended':
        this.stopListening();
        break;
        
      default:
        console.log('📨 Backend message:', data);
    }
  }
  
  async startListening(config = {}) {
    console.log('🎤 KanaVoiceRecognition: startListening called');
    
    if (this.isListening) {
      console.warn('⚠️ Already listening');
      return;
    }
    
    try {
      console.log('🎤 Requesting microphone permission...');
      // Get microphone permission
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      console.log('✅ Microphone permission granted');
      this.isListening = true;
      this.isCurrentlyRecording = true;
      this.speechStarted = false;
      this.notifyStatusChange('listening');
      
      if (this.isConnected && this.ws) {
        console.log('🎤 Using enhanced backend recognition');
        // Use enhanced backend
        await this.startBackendRecognition(config);
      } else if (this.webSpeechRecognition) {
        console.log('🎤 Using Web Speech API fallback');
        // Use Web Speech API fallback
        this.webSpeechRecognition.start();
      } else {
        throw new Error('No voice recognition system available');
      }
      
    } catch (error) {
      console.error('🎙️ Failed to start listening:', error);
      this.isListening = false;
      this.isCurrentlyRecording = false;
      this.notifyStatusChange('error');
      if (this.onError) {
        this.onError(error.message);
      }
    }
  }

  async stopListening() {
    if (!this.isListening) {
      console.warn('⚠️ Not currently listening');
      return;
    }

    console.log('🎤 Stopping voice recognition...');
    
    try {
      // Stop backend recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }
      
      // Stop Web Speech API
      if (this.webSpeechRecognition) {
        this.webSpeechRecognition.stop();
      }
      
      // Close audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }
      
      this.isListening = false;
      this.isCurrentlyRecording = false;
      this.speechStarted = false;
      this.notifyStatusChange('stopped');
      
      console.log('✅ Voice recognition stopped');
      
    } catch (error) {
      console.error('❌ Error stopping voice recognition:', error);
      if (this.onError) {
        this.onError(error.message);
      }
    }
  }
  
  async startBackendRecognition(config) {
    // Configure MediaRecorder for optimal quality
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 48000
    };
    
    this.mediaRecorder = new MediaRecorder(this.audioStream, options);
    
    // Send start command to backend
    this.ws.send(JSON.stringify({
      type: 'start_recognition',
      config: {
        sampleRate: 48000,
        languageCode: config.languageCode || 'en-US',
        ...config
      }
    }));
    
    // Stream audio data
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.ws && this.isConnected) {
        // Convert blob to base64 and send
        const reader = new FileReader();
        reader.onload = () => {
          const base64Audio = reader.result.split(',')[1];
          this.ws.send(JSON.stringify({
            type: 'audio_data',
            audio: base64Audio
          }));
        };
        reader.readAsDataURL(event.data);
      }
    };
    
    // Start recording in small chunks for real-time streaming
    this.mediaRecorder.start(250); // 250ms chunks
  }
  
  stopListening() {
    if (!this.isListening) {
      return;
    }
    
    this.isListening = false;
    this.speechStarted = false;
    
    // Stop backend recognition
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify({ type: 'stop_recognition' }));
    }
    
    // Stop MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    // Stop Web Speech API
    if (this.webSpeechRecognition) {
      this.webSpeechRecognition.stop();
    }
    
    // Stop audio stream
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    
    this.notifyStatusChange('stopped');
    console.log('🔇 Voice recognition stopped');
  }
  
  startWakeWordDetection() {
    this.isWakeWordMode = true;
    this.startListening({ continuous: true });
  }
  
  stopWakeWordDetection() {
    this.isWakeWordMode = false;
    this.stopListening();
  }
  
  detectWakeWord(transcript) {
    const normalizedTranscript = transcript.toLowerCase().trim();
    return this.wakeWords.some(wakeWord => 
      normalizedTranscript.includes(wakeWord) ||
      this.fuzzyMatch(normalizedTranscript, wakeWord, 0.8)
    );
  }
  
  fuzzyMatch(str1, str2, threshold = 0.8) {
    // Simple Levenshtein distance-based fuzzy matching
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    const similarity = (maxLength - distance) / maxLength;
    return similarity >= threshold;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  onWakeWordDetected(transcript) {
    console.log('👋 Wake word detected:', transcript);
    this.notifyStatusChange('wake_word_detected');
    
    // Stop wake word mode and switch to command mode
    this.isWakeWordMode = false;
    
    // Trigger the main Kana interface
    if (window.kanaAI && window.kanaAI.handleVoiceInput) {
      window.kanaAI.handleVoiceInput(transcript);
    }
  }
  
  notifyStatusChange(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }
  
  // Public API methods
  setCallbacks({ onTranscript, onFinalTranscript, onError, onStatusChange }) {
    this.onTranscript = onTranscript;
    this.onFinalTranscript = onFinalTranscript;
    this.onError = onError;
    this.onStatusChange = onStatusChange;
  }
  
  isBackendConnected() {
    return this.isConnected;
  }
  
  getStatus() {
    return {
      isListening: this.isListening,
      isConnected: this.isConnected,
      isWakeWordMode: this.isWakeWordMode,
      hasWebSpeechFallback: !!this.webSpeechRecognition
    };
  }
  
  destroy() {
    this.stopListening();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Export for use in content script
window.KanaVoiceRecognition = KanaVoiceRecognition;
