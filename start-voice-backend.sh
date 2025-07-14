#!/bin/bash

# Kana Voice Backend Startup Script
echo "🎙️ Starting Kana Voice Backend Server..."

# Change to voice-backend directory
cd voice-backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the voice backend server
echo "🚀 Starting voice server on port 3001..."
node voice-server.js
