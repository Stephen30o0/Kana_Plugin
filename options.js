// Options/Settings JavaScript for Kana AI Learning Assistant

document.addEventListener('DOMContentLoaded', function() {
    console.log('Options page DOM loaded');
    
    // Get all setting controls
    const controls = {
        enableKana: document.getElementById('enable-kana'),
        voiceCommands: document.getElementById('voice-commands'),
        autoPosition: document.getElementById('auto-position'),
        orbTheme: document.getElementById('orb-theme'),
        orbSize: document.getElementById('orb-size'),
        orbSizeValue: document.getElementById('orb-size-value'),
        panelTransparency: document.getElementById('panel-transparency'),
        panelTransparencyValue: document.getElementById('panel-transparency-value'),
        autoHide: document.getElementById('auto-hide'),
        autoHideDelay: document.getElementById('auto-hide-delay'),
        autoHideDelayValue: document.getElementById('auto-hide-delay-value'),
        wakeSensitivity: document.getElementById('wake-sensitivity'),
        analytics: document.getElementById('analytics'),
        contentAnalysis: document.getElementById('content-analysis'),
        saveBtn: document.getElementById('save-settings'),
        resetBtn: document.getElementById('reset-settings'),
        
        // Glass customization controls
        glassColor: document.getElementById('glass-color'),
        orbGlassColor: document.getElementById('orb-glass-color'),
        glassOpacity: document.getElementById('glass-opacity'),
        glassOpacityValue: document.getElementById('glass-opacity-value'),
        glassBlur: document.getElementById('glass-blur'),
        glassBlurValue: document.getElementById('glass-blur-value'),
        glassSaturation: document.getElementById('glass-saturation'),
        glassSaturationValue: document.getElementById('glass-saturation-value'),
        glassBrightness: document.getElementById('glass-brightness'),
        glassBrightnessValue: document.getElementById('glass-brightness-value'),
        glassDepth: document.getElementById('glass-depth'),
        glassDepthValue: document.getElementById('glass-depth-value'),
        glassPreview: document.getElementById('glass-preview')
    };
    
    // Default settings
    const defaultSettings = {
        kanaEnabled: true,
        kanaVoiceEnabled: true,
        kanaAutoPosition: true,
        kanaOrbTheme: 'gradient',
        kanaOrbSize: 60,
        kanaPanelTransparency: 95,
        kanaAutoHide: true,
        kanaAutoHideDelay: 30,
        kanaWakeSensitivity: 'medium',
        kanaAnalytics: true,
        kanaContentAnalysis: true,
        
        // Glass customization defaults
        glassColorPanel: 'blue',
        glassColorOrb: 'blue',
        glassOpacity: 80,
        glassBlur: 30,
        glassSaturation: 140,
        glassBrightness: 105,
        glassDepth: 60
    };
    
    // Glass theme definitions (matching content.js)
    const glassThemes = {
        blue: {
            panelBg: 'linear-gradient(135deg, rgba(240, 248, 255, 0.3) 0%, rgba(220, 240, 255, 0.25) 50%, rgba(200, 230, 255, 0.3) 100%), linear-gradient(225deg, rgba(100, 160, 255, 0.12) 0%, rgba(70, 130, 240, 0.08) 50%, rgba(50, 110, 220, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(70, 130, 240, 0.15)',
            textColor: 'rgba(20, 40, 80, 0.92)'
        },
        green: {
            panelBg: 'linear-gradient(135deg, rgba(240, 255, 248, 0.3) 0%, rgba(220, 255, 240, 0.25) 50%, rgba(200, 255, 230, 0.3) 100%), linear-gradient(225deg, rgba(100, 255, 160, 0.12) 0%, rgba(70, 240, 130, 0.08) 50%, rgba(50, 220, 110, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(70, 240, 130, 0.15)',
            textColor: 'rgba(20, 80, 40, 0.92)'
        },
        purple: {
            panelBg: 'linear-gradient(135deg, rgba(248, 240, 255, 0.3) 0%, rgba(240, 220, 255, 0.25) 50%, rgba(230, 200, 255, 0.3) 100%), linear-gradient(225deg, rgba(160, 100, 255, 0.12) 0%, rgba(130, 70, 240, 0.08) 50%, rgba(110, 50, 220, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(130, 70, 240, 0.15)',
            textColor: 'rgba(80, 20, 80, 0.92)'
        },
        yellow: {
            panelBg: 'linear-gradient(135deg, rgba(255, 248, 240, 0.3) 0%, rgba(255, 240, 220, 0.25) 50%, rgba(255, 230, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 200, 100, 0.12) 0%, rgba(240, 180, 70, 0.08) 50%, rgba(220, 160, 50, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(240, 180, 70, 0.15)',
            textColor: 'rgba(80, 60, 20, 0.92)'
        },
        red: {
            panelBg: 'linear-gradient(135deg, rgba(255, 240, 240, 0.3) 0%, rgba(255, 220, 220, 0.25) 50%, rgba(255, 200, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 100, 100, 0.12) 0%, rgba(240, 70, 70, 0.08) 50%, rgba(220, 50, 50, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(240, 70, 70, 0.15)',
            textColor: 'rgba(80, 20, 20, 0.92)'
        },
        teal: {
            panelBg: 'linear-gradient(135deg, rgba(240, 255, 255, 0.3) 0%, rgba(220, 255, 255, 0.25) 50%, rgba(200, 255, 255, 0.3) 100%), linear-gradient(225deg, rgba(100, 255, 255, 0.12) 0%, rgba(70, 240, 240, 0.08) 50%, rgba(50, 220, 220, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(70, 240, 240, 0.15)',
            textColor: 'rgba(20, 80, 80, 0.92)'
        },
        orange: {
            panelBg: 'linear-gradient(135deg, rgba(255, 245, 240, 0.3) 0%, rgba(255, 235, 220, 0.25) 50%, rgba(255, 225, 200, 0.3) 100%), linear-gradient(225deg, rgba(255, 150, 100, 0.12) 0%, rgba(240, 130, 70, 0.08) 50%, rgba(220, 110, 50, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(240, 130, 70, 0.15)',
            textColor: 'rgba(80, 50, 20, 0.92)'
        },
        pink: {
            panelBg: 'linear-gradient(135deg, rgba(255, 240, 248, 0.3) 0%, rgba(255, 220, 240, 0.25) 50%, rgba(255, 200, 230, 0.3) 100%), linear-gradient(225deg, rgba(255, 100, 160, 0.12) 0%, rgba(240, 70, 130, 0.08) 50%, rgba(220, 50, 110, 0.1) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.4)',
            panelShadow: 'rgba(240, 70, 130, 0.15)',
            textColor: 'rgba(80, 20, 60, 0.92)'
        },
        clear: {
            panelBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.12) 100%)',
            panelBorder: 'rgba(255, 255, 255, 0.3)',
            panelShadow: 'rgba(0, 0, 0, 0.1)',
            textColor: 'rgba(40, 40, 40, 0.92)'
        }
    };
    
    console.log('Controls loaded:', controls);
    console.log('Save button found:', controls.saveBtn);
    console.log('Glass color control found:', controls.glassColor);
    
    // Load current settings
    loadSettings();
    
    // Add event listeners
    setupEventListeners();
    
    function loadSettings() {
        chrome.storage.local.get(defaultSettings, function(settings) {
                // Update toggle switches
                updateToggle(controls.enableKana, settings.kanaEnabled);
                updateToggle(controls.voiceCommands, settings.kanaVoiceEnabled);
                updateToggle(controls.autoPosition, settings.kanaAutoPosition);
                updateToggle(controls.autoHide, settings.kanaAutoHide);
                updateToggle(controls.analytics, settings.kanaAnalytics);
                updateToggle(controls.contentAnalysis, settings.kanaContentAnalysis);
                
                // Update select controls
                controls.orbTheme.value = settings.kanaOrbTheme;
                controls.wakeSensitivity.value = settings.kanaWakeSensitivity;
                
                // Update range controls
                controls.orbSize.value = settings.kanaOrbSize;
                controls.orbSizeValue.textContent = settings.kanaOrbSize + 'px';
                
                controls.panelTransparency.value = settings.kanaPanelTransparency;
                controls.panelTransparencyValue.textContent = settings.kanaPanelTransparency + '%';
                
                controls.autoHideDelay.value = settings.kanaAutoHideDelay;
                controls.autoHideDelayValue.textContent = settings.kanaAutoHideDelay + 's';
                
                // Update glass customization controls
                if (controls.glassColor) {
                    controls.glassColor.value = settings.glassColorPanel;
                    controls.orbGlassColor.value = settings.glassColorOrb;
                    
                    controls.glassOpacity.value = settings.glassOpacity;
                    controls.glassOpacityValue.textContent = settings.glassOpacity + '%';
                    
                    controls.glassBlur.value = settings.glassBlur;
                    controls.glassBlurValue.textContent = settings.glassBlur + 'px';
                    
                    controls.glassSaturation.value = settings.glassSaturation;
                    controls.glassSaturationValue.textContent = settings.glassSaturation + '%';
                    
                    controls.glassBrightness.value = settings.glassBrightness;
                    controls.glassBrightnessValue.textContent = settings.glassBrightness + '%';
                    
                    controls.glassDepth.value = settings.glassDepth;
                    controls.glassDepthValue.textContent = settings.glassDepth + '%';
                    
                    // Update preview
                    updateGlassPreview();
                }
            });
        }
        
        function setupEventListeners() {
            console.log('Setting up event listeners');
            console.log('Save button element:', controls.saveBtn);
            
            // Toggle switches
            controls.enableKana.addEventListener('click', () => toggleSwitch(controls.enableKana));
            controls.voiceCommands.addEventListener('click', () => toggleSwitch(controls.voiceCommands));
            controls.autoPosition.addEventListener('click', () => toggleSwitch(controls.autoPosition));
            controls.autoHide.addEventListener('click', () => toggleSwitch(controls.autoHide));
            controls.analytics.addEventListener('click', () => toggleSwitch(controls.analytics));
            controls.contentAnalysis.addEventListener('click', () => toggleSwitch(controls.contentAnalysis));
            
            // Range controls
            controls.orbSize.addEventListener('input', function() {
                controls.orbSizeValue.textContent = this.value + 'px';
            });
            
            controls.panelTransparency.addEventListener('input', function() {
                controls.panelTransparencyValue.textContent = this.value + '%';
            });
            
            controls.autoHideDelay.addEventListener('input', function() {
                controls.autoHideDelayValue.textContent = this.value + 's';
            });
            
            // Buttons
            controls.saveBtn.addEventListener('click', saveSettings);
            controls.resetBtn.addEventListener('click', resetSettings);
            
            // Glass color change
            controls.glassColor.addEventListener('change', updateGlassPreview);
            controls.orbGlassColor.addEventListener('change', updateGlassPreview);
            
            // Glass customization range controls
            controls.glassOpacity.addEventListener('input', function() {
                controls.glassOpacityValue.textContent = this.value + '%';
                updateGlassPreview();
            });
            
            controls.glassBlur.addEventListener('input', function() {
                controls.glassBlurValue.textContent = this.value + 'px';
                updateGlassPreview();
            });
            
            controls.glassSaturation.addEventListener('input', function() {
                controls.glassSaturationValue.textContent = this.value + '%';
                updateGlassPreview();
            });
            
            controls.glassBrightness.addEventListener('input', function() {
                controls.glassBrightnessValue.textContent = this.value + '%';
                updateGlassPreview();
            });
            
            controls.glassDepth.addEventListener('input', function() {
                controls.glassDepthValue.textContent = this.value + '%';
                updateGlassPreview();
            });
        }
        
        function updateToggle(element, isActive) {
            if (isActive) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        }
        
        function toggleSwitch(element) {
            element.classList.toggle('active');
        }
        
        function saveSettings() {
            console.log('Save settings button clicked');
            
            const settings = {
                kanaEnabled: controls.enableKana.classList.contains('active'),
                kanaVoiceEnabled: controls.voiceCommands.classList.contains('active'),
                kanaAutoPosition: controls.autoPosition.classList.contains('active'),
                kanaOrbTheme: controls.orbTheme.value,
                kanaOrbSize: parseInt(controls.orbSize.value),
                kanaPanelTransparency: parseInt(controls.panelTransparency.value),
                kanaAutoHide: controls.autoHide.classList.contains('active'),
                kanaAutoHideDelay: parseInt(controls.autoHideDelay.value),
                kanaWakeSensitivity: controls.wakeSensitivity.value,
                kanaAnalytics: controls.analytics.classList.contains('active'),
                kanaContentAnalysis: controls.contentAnalysis.classList.contains('active'),
                
                // Glass customization settings
                glassColorPanel: controls.glassColor ? controls.glassColor.value : 'blue',
                glassColorOrb: controls.orbGlassColor ? controls.orbGlassColor.value : 'blue',
                glassOpacity: controls.glassOpacity ? parseInt(controls.glassOpacity.value) : 80,
                glassBlur: controls.glassBlur ? parseInt(controls.glassBlur.value) : 30,
                glassSaturation: controls.glassSaturation ? parseInt(controls.glassSaturation.value) : 140,
                glassBrightness: controls.glassBrightness ? parseInt(controls.glassBrightness.value) : 105,
                glassDepth: controls.glassDepth ? parseInt(controls.glassDepth.value) : 60
            };
            
            chrome.storage.local.set(settings, function() {
                console.log('Chrome storage set called');
                console.log('Chrome runtime last error:', chrome.runtime.lastError);
                
                if (chrome.runtime.lastError) {
                    console.error('Error saving settings:', chrome.runtime.lastError);
                    return;
                }
                
                console.log('Settings saved successfully:', settings);
                
                // Show success feedback
                const originalText = controls.saveBtn.textContent;
                controls.saveBtn.textContent = 'Settings Saved!';
                controls.saveBtn.style.background = '#4CAF50';
                
                setTimeout(() => {
                    controls.saveBtn.textContent = originalText;
                    controls.saveBtn.style.background = '';
                }, 2000);
                
                // Notify all tabs with Kana to update their settings via background script
                chrome.runtime.sendMessage({
                    action: 'updateAllTabs',
                    data: {
                        action: 'updateSettings',
                        settings: settings
                    }
                }, function(response) {
                    console.log('Background script notified:', response);
                });
                
                // Also send a specific glass update message for immediate application
                chrome.runtime.sendMessage({
                    action: 'updateAllTabs',
                    data: {
                        action: 'updateGlassTheme',
                        glassSettings: {
                            panelColor: settings.glassColorPanel,
                            orbColor: settings.glassColorOrb,
                            opacity: settings.glassOpacity,
                            blur: settings.glassBlur,
                            saturation: settings.glassSaturation,
                            brightness: settings.glassBrightness,
                            depth: settings.glassDepth
                        }
                    }
                }, function(response) {
                    console.log('Glass theme update sent to background:', response);
                });
            });
        }
        
        function resetSettings() {
            if (confirm('Are you sure you want to reset all settings to their default values?')) {
                chrome.storage.local.set(defaultSettings, function() {
                    // Reload the page to show default values
                    window.location.reload();
                });
            }
        }
        
        // Add keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey) {
                switch(e.key) {
                    case 'S':
                        e.preventDefault();
                        saveSettings();
                        break;
                    case 'R':
                        e.preventDefault();
                        resetSettings();
                        break;
                }
            }
        });
        
        // Function to update glass preview
        function updateGlassPreview() {
            if (!controls.glassPreview) return;
        
        const selectedTheme = glassThemes[controls.glassColor.value] || glassThemes.blue;
        const opacity = parseInt(controls.glassOpacity.value) / 100;
        const blur = parseInt(controls.glassBlur.value);
        const saturation = parseInt(controls.glassSaturation.value) / 100;
        const brightness = parseInt(controls.glassBrightness.value) / 100;
        const depth = parseInt(controls.glassDepth.value) / 100;
        
        controls.glassPreview.style.background = selectedTheme.panelBg;
        controls.glassPreview.style.backdropFilter = `blur(${blur}px) brightness(${brightness}) saturate(${saturation})`;
        controls.glassPreview.style.border = `1px solid ${selectedTheme.panelBorder}`;
        controls.glassPreview.style.color = selectedTheme.textColor;
        controls.glassPreview.style.boxShadow = `
            0 ${25 * depth}px ${45 * depth}px ${selectedTheme.panelShadow},
            0 ${10 * depth}px ${25 * depth}px rgba(100, 160, 255, ${0.1 * opacity}),
            0 ${5 * depth}px ${15 * depth}px rgba(0, 0, 0, ${0.05 * opacity}),
            inset 0 1px 2px rgba(255, 255, 255, ${0.6 * opacity}),
            inset 0 -1px 2px rgba(100, 160, 255, ${0.2 * opacity})
        `;
    }
});
