// Popup JavaScript for Kana AI Learning Assistant

document.addEventListener('DOMContentLoaded', function() {
    // Get references to UI elements
    const statusText = document.getElementById('status-text');
    const statusIndicator = document.getElementById('status-indicator');
    const voiceToggle = document.getElementById('voice-toggle');
    const platformText = document.getElementById('platform-text');
    const toggleKanaBtn = document.getElementById('toggle-kana');
    const resetPositionBtn = document.getElementById('reset-position');
    const openSettingsBtn = document.getElementById('open-settings');
    const viewStatsBtn = document.getElementById('view-stats');
    const helpLink = document.getElementById('help-link');
    
    // Load current settings and status
    loadStatus();
    
    // Event listeners
    voiceToggle.addEventListener('click', toggleVoiceCommands);
    toggleKanaBtn.addEventListener('click', toggleKana);
    resetPositionBtn.addEventListener('click', resetPosition);
    openSettingsBtn.addEventListener('click', openSettings);
    viewStatsBtn.addEventListener('click', viewStats);
    helpLink.addEventListener('click', openHelp);
    
    function loadStatus() {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            
            if (!currentTab || !currentTab.url) {
                statusText.textContent = 'No active tab';
                statusIndicator.classList.add('inactive');
                platformText.textContent = 'Unknown';
                return;
            }
            
            const hostname = currentTab.url.toLowerCase();
            let platform = 'Unknown';
            
            if (hostname.includes('canvas') || hostname.includes('instructure')) {
                platform = 'Canvas';
            } else if (hostname.includes('blackboard')) {
                platform = 'Blackboard';
            } else if (hostname.includes('moodle')) {
                platform = 'Moodle';
            } else if (hostname.includes('schoology')) {
                platform = 'Schoology';
            } else if (hostname.includes('holberton')) {
                platform = 'Holberton';
            } else if (hostname.includes('alustudent') || hostname.includes('alu')) {
                platform = 'ALU';
            }
            
            platformText.textContent = platform;
            
            if (platform !== 'Unknown') {
                statusText.textContent = 'Active';
                statusIndicator.classList.remove('inactive');
            } else {
                statusText.textContent = 'Inactive';
                statusIndicator.classList.add('inactive');
            }
        });
        
        chrome.storage.local.get(['kanaEnabled', 'kanaVoiceEnabled'], function(result) {
            if (result.kanaVoiceEnabled !== false) {
                voiceToggle.classList.add('active');
            } else {
                voiceToggle.classList.remove('active');
            }
            
            if (result.kanaEnabled === false) {
                statusText.textContent = 'Disabled';
                statusIndicator.classList.add('inactive');
            }
        });
    }
    
    function toggleVoiceCommands() {
        const isActive = voiceToggle.classList.contains('active');
        chrome.storage.local.set({ kanaVoiceEnabled: !isActive }, function() {
            voiceToggle.classList.toggle('active');
        });
    }
    
    function toggleKana() {
        chrome.storage.local.get(['kanaEnabled'], function(result) {
            const newState = !(result.kanaEnabled !== false);
            chrome.storage.local.set({ kanaEnabled: newState }, function() {
                loadStatus();
            });
        });
    }
    
    function resetPosition() {
        chrome.storage.local.set({
            kanaPosition: { x: 30, y: 50 },
            kanaLocked: false
        }, function() {
            resetPositionBtn.innerHTML = '<span class="action-icon">✅</span><span>Position Reset</span>';
            setTimeout(() => {
                resetPositionBtn.innerHTML = '<span class="action-icon">📍</span><span>Reset Position</span>';
            }, 2000);
        });
    }
    
    function openSettings() {
        chrome.runtime.openOptionsPage();
        window.close();
    }
    
    function viewStats() {
        chrome.storage.local.get(['kanaUsageStats'], function(result) {
            const stats = result.kanaUsageStats || {
                totalInteractions: 0,
                voiceCommands: 0,
                chatMessages: 0,
                lastUsed: null
            };
            
            chrome.tabs.create({
                url: 'data:text/html,' + encodeURIComponent(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Kana Usage Stats</title></head>
                    <body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
                        <h1>Kana AI Learning Assistant - Usage Statistics</h1>
                        <div style="padding: 20px; background: white; border-radius: 8px;">
                            <p><strong>Total Interactions:</strong> ${stats.totalInteractions}</p>
                            <p><strong>Voice Commands:</strong> ${stats.voiceCommands}</p>
                            <p><strong>Chat Messages:</strong> ${stats.chatMessages}</p>
                            <p><strong>Last Used:</strong> ${stats.lastUsed ? new Date(stats.lastUsed).toLocaleString() : 'Never'}</p>
                        </div>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px;">Close</button>
                    </body>
                    </html>
                `)
            });
        });
    }
    
    function openHelp() {
        chrome.tabs.create({
            url: 'https://github.com/brainkink/kana-ai-assistant'
        });
    }
});
