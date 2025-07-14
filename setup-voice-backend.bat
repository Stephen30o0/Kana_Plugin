@echo off
echo 🎙️ Setting up Kana Enhanced Voice Recognition Backend
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
echo.

REM Navigate to voice backend directory
cd voice-backend

echo 📦 Installing dependencies...
npm install

if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ✅ Voice backend setup complete!
echo.
echo 🚀 To start the voice backend server:
echo    cd voice-backend
echo    npm start
echo.
echo 📝 Make sure google-credentials.json is in the root directory
echo.
pause
