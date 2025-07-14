// Study Pouch Components - Individual draggable widgets
// Base class and specific component implementations

// Base Component Class
class StudyPouchComponent {
    constructor(id, manager, type) {
        this.id = id;
        this.manager = manager;
        this.type = type;
        this.element = null;
        this.isStandalone = false;
        this.standaloneElement = null;
        this.data = {};
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = `study-component study-component-${this.type}`;
        this.element.dataset.componentId = this.id;
        this.element.innerHTML = this.getHTML();
        
        // Ensure element is fully created before setting up listeners and theme
        this.setupEventListeners();
        this.makeComponentDraggable();
        
        // Apply theme immediately after creating the element
        if (this.manager && this.manager.currentTheme) {
            this.applyTheme(this.manager.currentTheme);
        }
        
        return this.element;
    }

    getHTML() {
        // Override in subclasses
        return '<div>Base Component</div>';
    }

    setupEventListeners() {
        // Add close button functionality
        const closeBtn = this.element.querySelector('.component-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.manager.removeComponent(this.id);
            });
        }
    }

    makeComponentDraggable() {
        let isDragging = false;
        let dragStarted = false;
        let startX, startY;

        this.element.addEventListener('mousedown', (e) => {
            if (e.target.closest('.component-close')) return;
            
            isDragging = true;
            dragStarted = false;
            startX = e.clientX;
            startY = e.clientY;
            
            this.element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            
            // Start drag if moved more than 5 pixels
            if (!dragStarted && (deltaX > 5 || deltaY > 5)) {
                dragStarted = true;
                this.manager.startComponentDrag(this, { clientX: startX, clientY: startY });
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (isDragging) {
                isDragging = false;
                dragStarted = false;
                this.element.style.cursor = 'grab';
                
                // If we didn't start dragging, treat as click
                if (!dragStarted) {
                    // Could trigger expansion here if needed
                }
            }
        });
    }

    createFloatingVersion() {
        const floating = this.element.cloneNode(true);
        floating.className += ' floating-component';
        floating.style.cssText = `
            position: fixed;
            pointer-events: none;
            z-index: 2147483647;
            transform: scale(0.9);
            opacity: 0.8;
        `;
        return floating;
    }

    createStandaloneVersion() {
        const standalone = document.createElement('div');
        standalone.className = `study-component-standalone study-component-${this.type}-standalone`;
        standalone.innerHTML = this.getStandaloneHTML();
        
        // Apply proper styling for standalone
        standalone.style.cssText = `
            min-width: 300px;
            max-width: 500px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px) saturate(1.8);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            box-shadow: 
                0 20px 40px rgba(0, 0, 0, 0.15),
                0 10px 20px rgba(0, 0, 0, 0.1),
                inset 0 1px 0 rgba(255, 255, 255, 0.3);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            cursor: grab;
        `;
        
        this.setupStandaloneEventListeners(standalone);
        
        return standalone;
    }

    getStandaloneHTML() {
        // Override in subclasses for expanded standalone view
        return this.getHTML();
    }

    setupStandaloneEventListeners(element) {
        // Override in subclasses
    }

    openStandalone() {
        // Override in subclasses to auto-open the component
        // This is called when component is ejected from pouch
        console.log(`Opening standalone ${this.type} component`);
    }

    applyTheme(themeName) {
        console.log(`Applying theme "${themeName}" to ${this.type} component`);
        
        if (!window.glassThemes || !window.glassThemes[themeName]) {
            console.warn('Glass themes not available or theme not found:', themeName);
            return;
        }
        
        const theme = window.glassThemes[themeName];
        const elements = [this.element, this.standaloneElement].filter(Boolean);
        
        elements.forEach(element => {
            if (element) {
                this.applyGlassTheme(element, theme);
            }
        });
    }
    
    applyAdaptiveColors(element) {
        // Check if adaptive colors are available - prioritize orb colors (more vibrant)
        const mainKanaOrb = document.querySelector('.kana-orb-container.adaptive-colors');
        const mainKanaPanel = document.querySelector('.kana-chat-panel.adaptive-colors');
        
        // Try orb first (more vibrant colors), then fall back to panel
        const sourceElement = mainKanaOrb || mainKanaPanel;
        
        if (sourceElement) {
            const adaptiveBg = sourceElement.style.getPropertyValue('--kana-adaptive-bg');
            const adaptiveBorder = sourceElement.style.getPropertyValue('--kana-adaptive-border');
            const adaptiveText = sourceElement.style.getPropertyValue('--kana-adaptive-text');
            const adaptiveShadow = sourceElement.style.getPropertyValue('--kana-adaptive-shadow');
            
            if (adaptiveBg) {
                console.log(`Applying adaptive colors to ${this.type} component from:`, sourceElement.className);
                
                // Use the adaptive background for the component background
                element.style.background = adaptiveBg;
                element.style.borderColor = adaptiveBorder;
                element.style.color = adaptiveText;
                element.style.boxShadow = adaptiveShadow;
                
                // Set CSS variables using adaptive background colors for consistency
                element.style.setProperty('--theme-primary', adaptiveBg);
                element.style.setProperty('--theme-secondary', adaptiveBorder);
                element.style.setProperty('--theme-accent', adaptiveBorder);
                element.style.setProperty('--theme-text', adaptiveText);
                return true; // Successfully applied adaptive colors
            }
        }
        
        console.log(`No adaptive colors found for ${this.type} component, using fallback`);
        return false; // Could not apply adaptive colors
    }
    
    applyGlassTheme(element, theme) {
        console.log(`Applying glass theme to ${this.type} component:`, theme);
        console.log(`Element to style:`, element);
        
        if (!element) {
            console.warn(`No element found for ${this.type} component`);
            return;
        }
        
        // Create a more opaque background for better visibility and contrast
        const opaqueBackground = theme.panelBg
            .replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g, (match, r, g, b, a) => {
                // Increase opacity significantly for better visibility
                const newAlpha = Math.min(parseFloat(a) * 2.5, 0.9);
                return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
            });
        
        // Apply the same glass theme styling as other Kana components with !important to override CSS
        element.style.setProperty('background', opaqueBackground, 'important');
        element.style.setProperty('border-color', theme.panelBorder, 'important');
        element.style.setProperty('color', theme.textColor, 'important');
        element.style.setProperty('box-shadow', theme.panelShadow, 'important');
        element.style.setProperty('backdrop-filter', 'blur(20px)', 'important');
        element.style.setProperty('border', `1px solid ${theme.panelBorder}`, 'important');
        element.style.setProperty('border-radius', '12px', 'important');
        
        // Set CSS variables for component styling including background
        element.style.setProperty('--theme-bg', opaqueBackground);
        element.style.setProperty('--theme-primary', theme.orbBg);
        element.style.setProperty('--theme-secondary', theme.panelShadow);
        element.style.setProperty('--theme-accent', theme.panelBorder);
        element.style.setProperty('--theme-text', theme.textColor);
        
        console.log(`Applied styles to ${this.type}:`, {
            background: element.style.background,
            borderColor: element.style.borderColor,
            color: element.style.color
        });
    }

    destroy() {
        // Clean up event listeners
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
        }
        
        // Remove elements
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
        if (this.standaloneElement && this.standaloneElement.parentNode) {
            this.standaloneElement.remove();
        }
        
        // Clear references
        this.element = null;
        this.standaloneElement = null;
    }

    // Data persistence methods
    saveData() {
        localStorage.setItem(`study-component-${this.id}`, JSON.stringify(this.data));
    }

    loadData() {
        const saved = localStorage.getItem(`study-component-${this.id}`);
        if (saved) {
            this.data = JSON.parse(saved);
        }
    }
}

// Notepad Component
class StudyNotepadComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'notepad');
        this.loadData();
    }

    getHTML() {
        return `
            <div class="component-header">
                <span class="component-icon">📝</span>
                <span class="component-title">Notes</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="notepad-preview">
                    <div class="note-title-preview">${this.data.title || 'Untitled Note'}</div>
                    <div class="note-content-preview">${this.data.content ? this.data.content.substring(0, 40) + '...' : 'Click to add notes'}</div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        return `
            <div class="standalone-header">
                <span class="component-icon">📝</span>
                <span class="component-title">Study Notes</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="notepad-header">
                    <input type="text" class="note-title" placeholder="Note title or topic..." value="${this.data.title || ''}" />
                </div>
                <textarea class="notepad-textarea" placeholder="Write your study notes here...">${this.data.content || ''}</textarea>
                <div class="notepad-tools">
                    <button class="tool-btn" data-action="bold" title="Bold">B</button>
                    <button class="tool-btn" data-action="italic" title="Italic">I</button>
                    <button class="tool-btn" data-action="bullet" title="Bullet Point">•</button>
                    <button class="tool-btn" data-action="save" title="Save">💾</button>
                    <div class="note-info">
                        <span class="char-count">0 chars</span>
                        <span class="word-count">0 words</span>
                    </div>
                </div>
            </div>
        `;
    }

    setupStandaloneEventListeners(element) {
        const textarea = element.querySelector('.notepad-textarea');
        const titleInput = element.querySelector('.note-title');
        const saveBtn = element.querySelector('[data-action="save"]');
        const returnBtn = element.querySelector('.return-btn');
        const charCount = element.querySelector('.char-count');
        const wordCount = element.querySelector('.word-count');

        // Update counts function
        const updateCounts = () => {
            const text = textarea.value;
            const chars = text.length;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            if (charCount) charCount.textContent = `${chars} chars`;
            if (wordCount) wordCount.textContent = `${words} words`;
        };

        // Auto-save on typing in textarea
        textarea.addEventListener('input', () => {
            this.data.content = textarea.value;
            this.saveData();
            this.updatePreview();
            updateCounts();
        });

        // Auto-save on title change
        titleInput.addEventListener('input', () => {
            this.data.title = titleInput.value;
            this.saveData();
            this.updatePreview();
        });

        // Better title input behavior
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                textarea.focus();
            }
        });

        titleInput.addEventListener('focus', () => {
            titleInput.style.backgroundColor = 'var(--theme-accent, rgba(255,255,255,0.1))';
        });

        titleInput.addEventListener('blur', () => {
            titleInput.style.backgroundColor = '';
        });

        // Manual save
        saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.data.content = textarea.value;
            this.data.title = titleInput.value;
            this.saveData();
            this.showSaveNotification(element);
            // Refocus textarea after save
            textarea.focus();
        });

        // Return to pouch
        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        // Tool buttons - improved focus handling
        element.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleToolAction(btn.dataset.action, textarea);
                // Always refocus textarea after tool action
                setTimeout(() => textarea.focus(), 10);
            });
        });

        // Better focus management for textarea
        textarea.addEventListener('blur', () => {
            // Store cursor position when losing focus
            this.lastCursorPosition = textarea.selectionStart;
        });

        // Click anywhere in the notepad area to focus textarea
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.tool-btn') && !e.target.closest('.standalone-controls') && !e.target.closest('.note-title')) {
                textarea.focus();
                // Restore cursor position if available
                if (this.lastCursorPosition !== undefined) {
                    textarea.setSelectionRange(this.lastCursorPosition, this.lastCursorPosition);
                }
            }
        });

        // Initial count update
        updateCounts();
    }

    handleToolAction(action, textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        switch (action) {
            case 'bold':
                this.wrapText(textarea, '**', '**');
                break;
            case 'italic':
                this.wrapText(textarea, '*', '*');
                break;
            case 'bullet':
                this.addBulletPoint(textarea);
                break;
        }
    }

    wrapText(textarea, prefix, suffix) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        const newText = prefix + selectedText + suffix;
        textarea.setRangeText(newText, start, end, 'end');
        textarea.focus();
    }

    addBulletPoint(textarea) {
        const cursorPos = textarea.selectionStart;
        const beforeCursor = textarea.value.substring(0, cursorPos);
        const afterCursor = textarea.value.substring(cursorPos);
        
        const newText = beforeCursor + '\n• ' + afterCursor;
        textarea.value = newText;
        textarea.setSelectionRange(cursorPos + 3, cursorPos + 3);
        textarea.focus();
    }

    updatePreview() {
        if (this.element) {
            const titlePreview = this.element.querySelector('.note-title-preview');
            const contentPreview = this.element.querySelector('.note-content-preview');
            
            if (titlePreview) {
                titlePreview.textContent = this.data.title || 'Untitled Note';
            }
            
            if (contentPreview) {
                contentPreview.textContent = this.data.content ? 
                    this.data.content.substring(0, 40) + '...' : 
                    'Click to add notes';
            }
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            const textarea = this.standaloneElement.querySelector('.notepad-textarea');
            if (textarea) {
                // Small delay to ensure element is rendered
                setTimeout(() => {
                    textarea.focus();
                }, 100);
            }
        }
    }

    showSaveNotification(element) {
        const notification = document.createElement('div');
        notification.className = 'save-notification';
        notification.textContent = 'Saved!';
        notification.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: var(--theme-accent);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        
        element.appendChild(notification);
        
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Pomodoro Timer Component
class StudyPomodoroComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'pomodoro');
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.isRunning = false;
        this.interval = null;
        this.mode = 'work'; // 'work', 'break', 'longBreak'
        this.sessions = 0;
        this.loadData();
    }

    getHTML() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        return `
            <div class="component-header">
                <span class="component-icon">⏱️</span>
                <span class="component-title">Pomodoro</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="pomodoro-display">
                    <div class="time-display">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                    <div class="pomodoro-mode">${this.mode}</div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        return `
            <div class="standalone-header">
                <span class="component-icon">⏱️</span>
                <span class="component-title">Pomodoro Timer</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="pomodoro-timer">
                    <div class="timer-circle">
                        <svg class="progress-ring" width="120" height="120">
                            <circle class="progress-ring-background" cx="60" cy="60" r="54"></circle>
                            <circle class="progress-ring-progress" cx="60" cy="60" r="54"></circle>
                        </svg>
                        <div class="timer-time">${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}</div>
                    </div>
                    <div class="timer-mode">${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Session</div>
                    <div class="timer-controls">
                        <button class="timer-btn play-pause">${this.isRunning ? '⏸️' : '▶️'}</button>
                        <button class="timer-btn reset">🔄</button>
                        <button class="timer-btn settings">⚙️</button>
                    </div>
                    <div class="session-counter">Sessions: ${this.sessions}</div>
                </div>
            </div>
        `;
    }

    setupStandaloneEventListeners(element) {
        const playPauseBtn = element.querySelector('.play-pause');
        const resetBtn = element.querySelector('.reset');
        const returnBtn = element.querySelector('.return-btn');

        playPauseBtn.addEventListener('click', () => {
            this.toggleTimer(element);
        });

        resetBtn.addEventListener('click', () => {
            this.resetTimer(element);
        });

        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        // Update the display
        this.updateStandaloneDisplay(element);
    }

    toggleTimer(element) {
        if (this.isRunning) {
            this.pauseTimer(element);
        } else {
            this.startTimer(element);
        }
    }

    startTimer(element) {
        this.isRunning = true;
        const playPauseBtn = element.querySelector('.play-pause');
        playPauseBtn.textContent = '⏸️';

        // Add visual indicator that timer is running
        element.classList.add('timer-active');
        
        this.interval = setInterval(() => {
            this.timeLeft--;
            this.updateStandaloneDisplay(element);
            this.updateProgress(element);

            if (this.timeLeft <= 0) {
                this.completeSession(element);
            }
        }, 1000);
        
        this.saveData();
    }

    pauseTimer(element) {
        this.isRunning = false;
        const playPauseBtn = element.querySelector('.play-pause');
        playPauseBtn.textContent = '▶️';
        
        // Remove visual indicator
        element.classList.remove('timer-active');
        
        clearInterval(this.interval);
        this.saveData();
    }

    resetTimer(element) {
        this.pauseTimer(element);
        this.timeLeft = this.getSessionDuration();
        this.updateStandaloneDisplay(element);
        this.updateProgress(element);
    }

    completeSession(element) {
        this.pauseTimer(element);
        this.sessions++;
        
        // Play completion sound (if enabled)
        this.playNotificationSound();
        
        // Switch mode
        if (this.mode === 'work') {
            this.mode = this.sessions % 4 === 0 ? 'longBreak' : 'break';
        } else {
            this.mode = 'work';
        }
        
        this.timeLeft = this.getSessionDuration();
        this.updateStandaloneDisplay(element);
        this.showCompletionNotification(element);
        this.saveData();
    }

    getSessionDuration() {
        switch (this.mode) {
            case 'work': return 25 * 60;
            case 'break': return 5 * 60;
            case 'longBreak': return 15 * 60;
            default: return 25 * 60;
        }
    }

    updateStandaloneDisplay(element) {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        
        const timeDisplay = element.querySelector('.timer-time');
        const modeDisplay = element.querySelector('.timer-mode');
        const sessionDisplay = element.querySelector('.session-counter');
        
        if (timeDisplay) {
            timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        if (modeDisplay) {
            modeDisplay.textContent = `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Session`;
        }
        if (sessionDisplay) {
            sessionDisplay.textContent = `Sessions: ${this.sessions}`;
        }

        // Update in-pouch display too
        if (this.element) {
            const pouchTimeDisplay = this.element.querySelector('.time-display');
            const pouchModeDisplay = this.element.querySelector('.pomodoro-mode');
            
            if (pouchTimeDisplay) {
                pouchTimeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            if (pouchModeDisplay) {
                pouchModeDisplay.textContent = this.mode;
            }
        }
    }

    updateTimerDisplay(element) {
        const timerTime = element.querySelector('.timer-time');
        const playPauseBtn = element.querySelector('.play-pause');
        const modeDisplay = element.querySelector('.timer-mode');
        const sessionCounter = element.querySelector('.session-counter');
        const progressRing = element.querySelector('.progress-ring-progress');

        if (timerTime) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            timerTime.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (playPauseBtn) {
            playPauseBtn.textContent = this.isRunning ? '⏸️' : '▶️';
        }

        if (modeDisplay) {
            modeDisplay.textContent = `${this.mode.charAt(0).toUpperCase() + this.mode.slice(1)} Session`;
        }

        if (sessionCounter) {
            sessionCounter.textContent = `Sessions: ${this.sessions}`;
        }

        if (progressRing) {
            const totalTime = this.mode === 'work' ? this.workDuration : this.breakDuration;
            const progress = ((totalTime - this.timeLeft) / totalTime) * 100;
            const circumference = 2 * Math.PI * 54;
            const offset = circumference - (progress / 100) * circumference;
            progressRing.style.strokeDasharray = circumference;
            progressRing.style.strokeDashoffset = offset;
        }
    }

    updateProgress(element) {
        const progressRing = element.querySelector('.progress-ring-progress');
        if (!progressRing) return;

        const totalDuration = this.getSessionDuration();
        const progress = (totalDuration - this.timeLeft) / totalDuration;
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (progress * circumference);
        
        progressRing.style.strokeDashoffset = offset;
    }

    playNotificationSound() {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    showCompletionNotification(element) {
        const notification = document.createElement('div');
        notification.className = 'completion-notification';
        notification.innerHTML = `
            <div class="notification-icon">🎉</div>
            <div class="notification-text">Session Complete!</div>
            <div class="notification-subtext">Time for a ${this.mode}!</div>
        `;
        
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--theme-primary);
            color: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(0,0,0,0.3);
            animation: bounceIn 0.5s ease-out;
        `;
        
        element.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveData() {
        this.data = {
            timeLeft: this.timeLeft,
            mode: this.mode,
            sessions: this.sessions,
            isRunning: false // Don't persist running state
        };
        super.saveData();
    }

    loadData() {
        super.loadData();
        if (this.data.timeLeft) {
            this.timeLeft = this.data.timeLeft;
        }
        if (this.data.mode) {
            this.mode = this.data.mode;
        }
        if (this.data.sessions) {
            this.sessions = this.data.sessions;
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            console.log('Pomodoro timer opened in standalone mode');
            // Could start timer automatically or show a welcome animation
            this.updateTimerDisplays();
        }
    }

    updateTimerDisplays() {
        if (this.standaloneElement) {
            this.updateTimerDisplay(this.standaloneElement);
        }
        // Update the pouch display if component is still in the pouch
        if (this.element && this.element.parentElement) {
            this.updateTimerDisplay(this.element);
        }
    }
}

// Export components
window.StudyPouchComponent = StudyPouchComponent;
window.StudyNotepadComponent = StudyNotepadComponent;
window.StudyPomodoroComponent = StudyPomodoroComponent;
