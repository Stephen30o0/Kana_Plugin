const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const speech = require('@google-cloud/speech');
const path = require('path');
require('dotenv').config();

// Initialize Google Cloud Speech client
const speechClient = new speech.SpeechClient({
  keyFilename: path.join(__dirname, '..', 'google-credentials.json'),
  projectId: 'gen-lang-client-0289099834'
});

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware - Enhanced CORS for Chrome Extensions
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or chrome extensions)
    if (!origin) return callback(null, true);
    
    // Allow Chrome extension origins
    if (origin.startsWith('chrome-extension://')) {
      return callback(null, true);
    }
    
    // Allow https origins
    if (origin.startsWith('https://')) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    return callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type']
}));

// Handle preflight requests
app.options('*', cors());

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('📋 Health check request from:', req.headers.origin);
  res.json({ 
    status: 'OK', 
    service: 'Kana Voice Backend',
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// WebSocket connections for streaming audio
wss.on('connection', (ws) => {
  console.log('🎤 New voice client connected');
  
  let recognizeStream = null;
  let isRecognizing = false;
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'start_recognition':
          console.log('🚀 Starting voice recognition');
          startRecognition(ws, data.config);
          break;
          
        case 'audio_data':
          if (recognizeStream && isRecognizing) {
            // Convert base64 audio to Buffer and send to Google Speech
            const audioBuffer = Buffer.from(data.audio, 'base64');
            recognizeStream.write(audioBuffer);
          }
          break;
          
        case 'stop_recognition':
          console.log('⏹️ Stopping voice recognition');
          stopRecognition();
          break;
          
        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Message parsing error:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });
  
  ws.on('close', () => {
    console.log('👋 Voice client disconnected');
    stopRecognition();
  });
  
  function startRecognition(ws, config = {}) {
    if (isRecognizing) {
      stopRecognition();
    }
    
    console.log('🚀 Starting voice recognition with config:', config);
    
    const request = {
      config: {
        encoding: 'WEBM_OPUS', // Chrome's MediaRecorder format
        sampleRateHertz: config.sampleRate || 48000,
        languageCode: config.languageCode || 'en-US',
        enableAutomaticPunctuation: true,
        model: 'latest_short', // Better for wake phrases and short commands
        useEnhanced: true,
        speechContexts: [{
          phrases: [
            // Wake phrases and common commands
            'hey kana', 'kana', 'hey cana',
            'algorithm', 'function', 'variable', 'array', 'object',
            'homework', 'assignment', 'study', 'quiz', 'exam',
            'calculator', 'timer', 'flashcard', 'notes'
          ],
          boost: 15.0
        }]
      },
      interimResults: true
    };
    
    console.log('📡 Creating recognition stream with request:', JSON.stringify(request, null, 2));
    
    recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', (error) => {
        console.error('Recognition error:', error);
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Speech recognition failed',
          details: error.message 
        }));
        isRecognizing = false;
      })
      .on('data', (data) => {
        const result = data.results[0];
        if (result) {
          const transcript = result.alternatives[0].transcript;
          const confidence = result.alternatives[0].confidence || 0;
          const isFinal = result.isFinal;
          
          // Send real-time transcription to extension
          ws.send(JSON.stringify({
            type: 'transcript',
            text: transcript,
            confidence: confidence,
            isFinal: isFinal,
            timestamp: Date.now()
          }));
          
          // Log high-confidence final results
          if (isFinal && confidence > 0.8) {
            console.log(`✅ Final transcript (${Math.round(confidence * 100)}%): "${transcript}"`);
          }
        }
      })
      .on('end', () => {
        console.log('🏁 Recognition stream ended');
        isRecognizing = false;
        ws.send(JSON.stringify({ type: 'recognition_ended' }));
      });
    
    isRecognizing = true;
  }
  
  function stopRecognition() {
    if (recognizeStream) {
      recognizeStream.end();
      recognizeStream = null;
    }
    isRecognizing = false;
  }
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎙️ Kana Voice Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for voice streaming`);
  console.log(`🧠 Google Cloud Speech-to-Text initialized`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('👋 Shutting down voice backend...');
  wss.close();
  server.close();
  process.exit(0);
});
