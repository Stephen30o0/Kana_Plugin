<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Kana AI Learning Assistant - Development Instructions

## Project Overview
This is a browser extension that creates an intelligent floating AI assistant for LMS platforms. The assistant, called "Kana," appears as a draggable orb that helps students learn without providing direct answers.

## Key Design Principles
- **Non-intrusive**: The UI should never distract from the learning content
- **Glassmorphic Design**: Use transparent, blurred backgrounds with subtle borders
- **Educational Focus**: Provide guidance, hints, and resources rather than direct answers
- **Contextual Awareness**: Analyze page content to provide relevant assistance
- **Voice-first**: Prioritize voice interaction with "Hey Kana" activation

## Architecture
- **Content Script**: Main UI and interaction logic (`content.js`)
- **Background Script**: Service worker for extension lifecycle (`background.js`)
- **Popup**: Quick controls and status (`popup.html/js`)
- **Options**: Full settings interface (`options.html/js`)
- **Styles**: Glassmorphic styling (`kana-styles.css`)

## UI/UX Guidelines
- Use the floating orb as the primary interface element
- Implement smooth animations and transitions
- Position panels intelligently to avoid covering content
- Maintain accessibility with proper ARIA labels and keyboard navigation
- Use a gradient color scheme with blues and purples

## Voice Integration
- Implement continuous speech recognition for "Hey Kana" wake phrase
- Handle voice commands naturally without requiring specific syntax
- Provide visual feedback for voice states (listening, thinking, speaking)

## LMS Platform Support
- Canvas (Instructure)
- Blackboard
- Moodle
- Schoology
- Holberton School
- Be prepared to add more platforms

## Privacy Considerations
- Process content locally when possible
- Provide clear opt-out options for data collection
- Never store personal or assignment content externally
- Use anonymous analytics only with user consent

## Code Style
- Use modern JavaScript (ES6+)
- Implement proper error handling
- Add comprehensive comments for complex logic
- Follow Chrome Extension Manifest V3 best practices
- Use semantic HTML and accessible CSS

## Feature Development
When adding new features:
1. Ensure they enhance learning without providing shortcuts
2. Maintain the non-intrusive design philosophy
3. Test across multiple LMS platforms
4. Consider accessibility implications
5. Update both the UI and settings as needed

## Testing
- Test on real LMS platforms, not just mock-ups
- Verify voice recognition works in noisy environments
- Check responsive design on different screen sizes
- Ensure performance doesn't impact page load times

## Common Patterns
- Use chrome.storage.local for persistent settings
- Implement proper message passing between scripts
- Handle DOM changes with MutationObserver when needed
- Use requestAnimationFrame for smooth animations
