// Background Service Worker for Kana AI Learning Assistant
// Handles extension lifecycle, storage, and communication

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Kana AI Learning Assistant installed');
    
    // Set default settings
    chrome.storage.local.set({
      kanaEnabled: true,
      kanaPosition: { x: 30, y: 50 },
      kanaLocked: false,
      kanaVoiceEnabled: true,
      kanaTheme: 'default'
    });
    
    console.log('Kana is ready to help you learn!');
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'analyzeContent':
      handleContentAnalysis(request.data, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      chrome.storage.local.set(request.settings, () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'getSettings':
      chrome.storage.local.get(null, (settings) => {
        sendResponse({ settings });
      });
      return true;
      
    case 'updateAllTabs':
      // Forward message to all tabs with content scripts
      chrome.tabs.query({}, (tabs) => {
        let sentCount = 0;
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, request.data, (response) => {
            if (!chrome.runtime.lastError) {
              sentCount++;
            }
          });
        });
        sendResponse({ success: true, tabsNotified: sentCount });
      });
      return true;
      
    case 'trackUsage':
      trackUsage(request.data);
      break;
      
    default:
      console.warn('Unknown message action:', request.action);
  }
});

// Handle content analysis requests
async function handleContentAnalysis(data, sendResponse) {
  try {
    // This is where you'd integrate with your AI service
    // For now, we'll use a mock implementation
    
    const analysis = await analyzeWithAI(data);
    sendResponse({ success: true, analysis });
    
  } catch (error) {
    console.error('Content analysis error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Mock AI analysis function
async function analyzeWithAI(data) {
  // Simulate AI processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { question, content, platform } = data;
  
  // Simple keyword-based response generation (replace with actual AI)
  let response = {
    type: 'explanation',
    title: 'Learning Guidance',
    content: '',
    resources: [],
    hints: []
  };
  
  // Analyze the question for key concepts
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('question') && questionLower.match(/\d+/)) {
    const questionNumber = questionLower.match(/\d+/)[0];
    response.title = `Understanding Question ${questionNumber}`;
    response.content = `Let me help you understand question ${questionNumber}. This appears to be asking about key concepts in your current lesson.`;
    response.hints = [
      'Break down the question into smaller parts',
      'Identify the key concepts being tested',
      'Think about what you\'ve learned recently that relates to this'
    ];
  } else if (questionLower.includes('explain')) {
    response.title = 'Explanation Request';
    response.content = 'I can help explain concepts! Based on what I can see on your screen, this relates to your current coursework.';
    response.hints = [
      'Consider the context of your current lesson',
      'Think about how this connects to previous topics',
      'Try to identify the core principle being demonstrated'
    ];
  } else {
    response.title = 'Learning Support';
    response.content = 'I\'m here to help guide your learning! I can see you\'re working on something interesting.';
    response.hints = [
      'Focus on understanding the underlying concepts',
      'Don\'t just memorize - try to understand why',
      'Connect new information to what you already know'
    ];
  }
  
  // Add platform-specific resources
  if (platform === 'Canvas') {
    response.resources.push(
      { title: 'Canvas Student Guide', url: 'https://community.canvaslms.com/t5/Student-Guide/tkb-p/student' }
    );
  } else if (platform === 'Holberton') {
    response.resources.push(
      { title: 'Holberton Resources', url: 'https://intranet.hbtn.io' }
    );
  }
  
  // Add general learning resources
  response.resources.push(
    { title: 'Khan Academy', url: 'https://www.khanacademy.org' },
    { title: 'Coursera', url: 'https://www.coursera.org' }
  );
  
  return response;
}

// Track usage for analytics (privacy-conscious)
function trackUsage(data) {
  // Only track non-personal usage statistics
  chrome.storage.local.get(['kanaUsageStats'], (result) => {
    const stats = result.kanaUsageStats || {
      totalInteractions: 0,
      voiceCommands: 0,
      chatMessages: 0,
      lastUsed: null
    };
    
    stats.totalInteractions++;
    stats.lastUsed = new Date().toISOString();
    
    if (data.type === 'voice') {
      stats.voiceCommands++;
    } else if (data.type === 'chat') {
      stats.chatMessages++;
    }
    
    chrome.storage.local.set({ kanaUsageStats: stats });
  });
}

// Handle tab updates to reinject content script if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'instructure.com',
      'canvas.com',
      'blackboard.com',
      'moodle.org',
      'schoology.com',
      'holbertonschool.com'
    ];
    
    const isSupported = supportedSites.some(site => tab.url.includes(site));
    
    if (isSupported) {
      // Ensure content script is injected
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      }).catch(err => {
        // Script might already be injected, ignore error
        console.log('Content script injection skipped:', err.message);
      });
    }
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open options page or toggle Kana
  chrome.runtime.openOptionsPage();
});

// Cleanup on extension uninstall
chrome.runtime.onSuspend.addListener(() => {
  console.log('Kana AI Learning Assistant suspended');
});
