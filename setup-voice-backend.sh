#!/bin/bash

echo "🎙️ Setting up Kana Enhanced Voice Recognition Backend"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo

# Navigate to voice backend directory
cd voice-backend

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo
echo "✅ Voice backend setup complete!"
echo
echo "🚀 To start the voice backend server:"
echo "   cd voice-backend"
echo "   npm start"
echo
echo "📝 Make sure google-credentials.json is in the root directory"
echo
