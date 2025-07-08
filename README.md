# 🤖 Kana AI Learning Assistant

> An intelligent floating AI assistant for Learning Management Systems (LMS) that helps students learn through contextual explanations and guidance.

<div align="center">

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green?style=for-the-badge&logo=googlechrome)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?style=for-the-badge&logo=javascript)
![AI Powered](https://img.shields.io/badge/AI-Powered-blue?style=for-the-badge&logo=openai)
![License](https://img.shields.io/badge/License-MIT-red?style=for-the-badge)

</div>

## Features

### 🌟 **Floating Orb Interface**
- Draggable, lockable orb that stays out of your way
- Advanced glassmorphic design with customizable themes
- Smart positioning to avoid covering important text
- 3D depth effects and smooth animations

### 🎤 **Voice Activation**
- Wake up Kana with "Hey Kana" 
- Natural voice commands for hands-free interaction
- Continuous listening for seamless experience
- Visual feedback for voice states

### 💬 **Chat Interface**
- Click the orb for a clean chat interface
- Type your questions directly
- Context-aware responses based on visible content
- Educational guidance without direct answers

### 🧠 **Contextual Learning Support**
- Intelligent page content analysis
- Question detection and prioritization
- Code block recognition with language detection
- Assignment and due date parsing
- Learning objective extraction
- Adapts to different LMS platforms

### 🎨 **Customizable Glass Themes**
- **Crystal**: Clear blue with subtle highlights (default)
- **Ocean**: Deep blue-teal gradient for focus
- **Sunset**: Warm orange-pink for creativity
- **Forest**: Green nature tones for calm
- **Royal**: Rich purple-blue for elegance
- **Rose**: Soft pink-red for warmth

## Supported Platforms

- **Canvas** (Instructure)
- **Blackboard**
- **Moodle** 
- **Schoology**
- **Holberton School**
- And more LMS platforms

## Installation

### For Development
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the plugin folder
5. Kana will appear on supported LMS sites

### For Production
1. Download from Chrome Web Store (coming soon)
2. Click "Add to Chrome"
3. Visit any supported LMS platform
4. Look for the floating brain orb on the right side

## Usage

### Voice Commands
1. Say "Hey Kana" to activate
2. Ask questions like:
   - "Hey Kana, explain question 2 on the screen"
   - "Hey Kana, help me understand this concept"
   - "Hey Kana, what resources can help with this topic?"

### Chat Interface
1. Click the floating orb
2. Type your question in the chat box
3. Press Enter or click Send
4. View the response in the glassmorphic panel

### Orb Controls
- **Single Click**: Open chat
- **Double Click**: Lock/unlock position
- **Drag**: Move orb around the screen
- **Right Click**: Quick settings menu

## Glass Theme Customization

### How to Customize
1. **Open Options**: Right-click extension icon → "Options" or click the gear icon in popup
2. **Choose Theme**: Select from 6 professional glass themes
3. **Adjust Properties**: Fine-tune transparency, blur, and border opacity
4. **Live Preview**: See changes instantly in the preview orb
5. **Apply**: Settings automatically sync across all tabs

### Theme Properties
- **Primary Color**: Base glass tint and orb color
- **Secondary Color**: Accent color for gradients and highlights  
- **Transparency**: Glass opacity level (20-80%)
- **Blur Intensity**: Backdrop filter strength (5-20px)
- **Border Opacity**: Edge definition and glow (10-50%)

### Custom CSS Variables
The extension uses CSS custom properties for easy theming:
```css
:root {
  --kana-glass-primary: rgba(59, 130, 246, 0.3);
  --kana-glass-secondary: rgba(99, 102, 241, 0.2);
  --kana-glass-blur: 12px;
  --kana-glass-border: rgba(255, 255, 255, 0.2);
}
```

## Settings

Access settings through:
- Extension popup (click the brain icon in your browser)
- Right-click the orb → Settings
- Chrome Extensions page

### Customization Options
- **Glass Themes**: 6 professional glassmorphic styles
- **Appearance**: Transparency, blur effects, and colors
- **Behavior**: Auto-hide, response timing, drag settings
- **Privacy**: Control data usage and analysis
- **Voice**: Sensitivity and wake word settings

## Privacy

Kana is designed with privacy in mind:
- Content analysis happens locally in your browser
- No personal information or assignment content stored externally
- Optional anonymous usage analytics
- Full control over data sharing

## Development

### Project Structure
```
kana-ai-assistant/
├── manifest.json          # Extension manifest
├── content.js             # Main content script
├── background.js          # Service worker
├── kana-styles.css        # Styling
├── popup.html/js          # Extension popup
├── options.html/js        # Settings page
├── package.json           # Project metadata
├── icons/                 # Extension icons
└── README.md             # This file
```

### Building
```bash
npm run build
```

### Testing
```bash
npm run test
```

### Packaging
```bash
npm run package
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Roadmap

- [ ] AI service integration
- [ ] Multi-language support
- [ ] Mobile browser support
- [ ] Advanced content analysis
- [ ] Study session tracking
- [ ] Collaborative features
- [ ] Integration with note-taking apps

## Support

- **Issues**: Report bugs or request features on [GitHub Issues](https://github.com/brainkink/kana-ai-assistant/issues)
- **Discussions**: Join the conversation on [GitHub Discussions](https://github.com/brainkink/kana-ai-assistant/discussions)
- **Email**: support@brainkink.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the need for better learning tools
- Built with love for students and educators
- Thanks to the open-source community

---

**Made with 🧠 by the BrainInk Team**

*Enhancing learning, one interaction at a time.*
