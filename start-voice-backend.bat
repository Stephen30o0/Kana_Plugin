@echo off
echo 🎙️ Starting Kana Voice Backend Server...

cd voice-backend

if not exist node_modules (
    echo 📦 Installing dependencies...
    npm install
)

echo 🚀 Starting voice server on port 3001...
node voice-server.js

pause
