# Testing the Kana AI Learning Assistant Settings

## Steps to Test the Extension Settings

### 1. Load the Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top-right corner
3. Click "Load unpacked" and select the folder: `c:\Users\musev\BrainkInk Plugin`

### 2. Open the Options Page
**Method 1: Through Extension Management**
1. In `chrome://extensions/`, find "Kana AI Learning Assistant"
2. Click "Details"
3. Click "Extension options"

**Method 2: Right-click Extension Icon**
1. Right-click the Kana extension icon in the toolbar
2. Select "Options"

### 3. Test the Settings
1. **Change Glass Color**: 
   - In the options page, find "Panel Glass Color"
   - Change from "Blue (Default)" to "Purple"
   
2. **Save Settings**:
   - Click the "Save Settings" button
   - You should see the button change to "Settings Saved!" briefly
   - Check the browser console for debug messages

3. **Test on a Web Page**:
   - Open any webpage (like a Canvas/LMS page or test page)
   - Look for the Kana orb (floating assistant)
   - Click the orb to open the chat panel
   - The panel should now have a purple glass theme instead of blue

### 4. Debugging
If the settings don't seem to work:

1. **Check Console Logs**:
   - Open developer tools (F12) on the options page
   - Look for debug messages when saving settings

2. **Check Extension Console**:
   - Go to `chrome://extensions/`
   - Click "Service worker" next to the extension
   - Check for any error messages

3. **Check Content Script Console**:
   - On any web page with Kana loaded
   - Open developer tools (F12)
   - Look for Kana-related messages

### 5. Key Debug Messages to Look For

**In Options Page Console:**
- "Options page DOM loaded"
- "Controls loaded"
- "Save settings button clicked"
- "Settings saved successfully"

**In Background Script Console:**
- "Background script notified"
- "Glass theme update sent to background"

**In Content Script Console:**
- "Updating settings"
- "Glass theme updated"

## Expected Behavior

When you change the glass color to purple and save:
1. The save button should briefly show "Settings Saved!"
2. Any open Kana panels should immediately change to purple theme
3. New panels opened should use the purple theme
4. Settings should persist after refreshing pages

## Common Issues

1. **Options page opened directly in browser**: Must be opened through extension context
2. **Extension not loaded**: Check `chrome://extensions/` for any errors
3. **No content script on page**: Some pages may block content scripts
4. **Permissions**: Extension needs proper permissions for storage and messaging
