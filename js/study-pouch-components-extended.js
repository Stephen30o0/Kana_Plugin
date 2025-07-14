// Additional Study Pouch Components - Music, Video, Calculator, Tasks

// Music Player Component
class StudyMusicComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'music');
        this.currentTrack = null;
        this.isPlaying = false;
        this.volume = 0.7;
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.loadData();
    }

    getHTML() {
        return `
            <div class="component-header">
                <span class="component-icon">🎵</span>
                <span class="component-title">Music</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="music-preview">
                    <div class="current-track">${this.currentTrack || 'No track'}</div>
                    <div class="play-indicator">${this.isPlaying ? '🔊' : '🔇'}</div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        return `
            <div class="standalone-header">
                <span class="component-icon">🎵</span>
                <span class="component-title">Study Music</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="music-player">
                    <div class="track-info">
                        <div class="track-title">${this.currentTrack || 'Select a track'}</div>
                        <div class="track-progress">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="time-display">0:00 / 0:00</div>
                        </div>
                    </div>
                    
                    <div class="player-controls">
                        <button class="control-btn prev">⏮️</button>
                        <button class="control-btn play-pause">${this.isPlaying ? '⏸️' : '▶️'}</button>
                        <button class="control-btn next">⏭️</button>
                        <button class="control-btn shuffle">🔀</button>
                    </div>
                    
                    <div class="volume-control">
                        <span>🔊</span>
                        <input type="range" class="volume-slider" min="0" max="100" value="${this.volume * 100}">
                    </div>
                    
                    <div class="playlist-section">
                        <div class="playlist-header">
                            <span>Study Playlists</span>
                            <button class="add-playlist-btn">+</button>
                        </div>
                        <div class="preset-playlists">
                            <div class="playlist-item" data-playlist="lofi">📻 Lo-Fi Hip Hop</div>
                            <div class="playlist-item" data-playlist="classical">🎼 Classical Focus</div>
                            <div class="playlist-item" data-playlist="ambient">🌊 Ambient Sounds</div>
                            <div class="playlist-item" data-playlist="nature">🌲 Nature Sounds</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupStandaloneEventListeners(element) {
        const playPauseBtn = element.querySelector('.play-pause');
        const returnBtn = element.querySelector('.return-btn');
        const volumeSlider = element.querySelector('.volume-slider');
        const playlistItems = element.querySelectorAll('.playlist-item');

        playPauseBtn.addEventListener('click', () => {
            this.togglePlayback(element);
        });

        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        volumeSlider.addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            this.updateVolume();
        });

        playlistItems.forEach(item => {
            item.addEventListener('click', () => {
                this.loadPlaylist(item.dataset.playlist, element);
            });
        });
    }

    togglePlayback(element) {
        if (this.isPlaying) {
            this.pauseMusic(element);
        } else {
            this.playMusic(element);
        }
    }

    playMusic(element) {
        this.isPlaying = true;
        const playPauseBtn = element.querySelector('.play-pause');
        playPauseBtn.textContent = '⏸️';
        
        // In a real implementation, this would start actual audio playback
        this.updatePouchDisplay();
    }

    pauseMusic(element) {
        this.isPlaying = false;
        const playPauseBtn = element.querySelector('.play-pause');
        playPauseBtn.textContent = '▶️';
        
        this.updatePouchDisplay();
    }

    loadPlaylist(playlistType, element) {
        const playlists = {
            'lofi': ['Chill Study Beats', 'Lo-Fi Coffee Shop', 'Midnight Study'],
            'classical': ['Bach Focus', 'Piano Concentration', 'Orchestral Study'],
            'ambient': ['Rain & Thunder', 'Ocean Waves', 'Forest Ambience'],
            'nature': ['Birdsong', 'River Flow', 'Wind in Trees']
        };

        this.playlist = playlists[playlistType] || [];
        this.currentTrackIndex = 0;
        this.currentTrack = this.playlist[0] || 'No track selected';
        
        const trackTitle = element.querySelector('.track-title');
        trackTitle.textContent = this.currentTrack;
        
        this.updatePouchDisplay();
        this.saveData();
    }

    updatePouchDisplay() {
        if (this.element) {
            const trackDisplay = this.element.querySelector('.current-track');
            const playIndicator = this.element.querySelector('.play-indicator');
            
            if (trackDisplay) {
                trackDisplay.textContent = this.currentTrack || 'No track';
            }
            if (playIndicator) {
                playIndicator.textContent = this.isPlaying ? '🔊' : '🔇';
            }
        }
    }

    updateVolume() {
        // In a real implementation, this would adjust actual audio volume
        this.saveData();
    }

    saveData() {
        this.data = {
            currentTrack: this.currentTrack,
            volume: this.volume,
            playlist: this.playlist,
            currentTrackIndex: this.currentTrackIndex
        };
        super.saveData();
    }

    loadData() {
        super.loadData();
        if (this.data.currentTrack) {
            this.currentTrack = this.data.currentTrack;
        }
        if (this.data.volume !== undefined) {
            this.volume = this.data.volume;
        }
        if (this.data.playlist) {
            this.playlist = this.data.playlist;
        }
        if (this.data.currentTrackIndex !== undefined) {
            this.currentTrackIndex = this.data.currentTrackIndex;
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            console.log('Music player opened in standalone mode');
            this.updateMusicDisplay();
        }
    }

    updateMusicDisplay() {
        if (this.standaloneElement) {
            const trackDisplay = this.standaloneElement.querySelector('.current-track');
            const playIndicator = this.standaloneElement.querySelector('.play-indicator');
            
            if (trackDisplay) {
                trackDisplay.textContent = this.currentTrack || 'No track';
            }
            if (playIndicator) {
                playIndicator.textContent = this.isPlaying ? '🔊' : '🔇';
            }
        }
    }
}

// Video Library Component
class StudyVideoLibraryComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'video-library');
        this.savedVideos = [];
        this.loadData();
    }

    getHTML() {
        const videoCount = this.savedVideos.length;
        return `
            <div class="component-header">
                <span class="component-icon">📹</span>
                <span class="component-title">Videos</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="video-library-preview">
                    <div class="video-count">${videoCount} saved</div>
                    <div class="recent-video">${videoCount > 0 ? 'Recent: ' + this.savedVideos[videoCount - 1].title.substring(0, 20) + '...' : 'No videos'}</div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        return `
            <div class="standalone-header">
                <span class="component-icon">📹</span>
                <span class="component-title">Video Library</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="video-library">
                    <div class="library-tools">
                        <input type="text" class="video-url-input" placeholder="Paste YouTube URL to save...">
                        <button class="save-video-btn">Save</button>
                    </div>
                    
                    <div class="library-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="recent">Recent</button>
                        <button class="filter-btn" data-filter="favorites">Favorites</button>
                    </div>
                    
                    <div class="videos-grid">
                        ${this.renderVideoGrid()}
                    </div>
                </div>
            </div>
        `;
    }

    renderVideoGrid() {
        if (this.savedVideos.length === 0) {
            return `
                <div class="empty-library">
                    <div class="empty-icon">📹</div>
                    <div class="empty-text">No videos saved yet</div>
                    <div class="empty-subtext">Paste a YouTube URL above to get started</div>
                </div>
            `;
        }

        return this.savedVideos.map(video => `
            <div class="video-item" data-video-id="${video.id}">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}">
                    <div class="video-duration">${video.duration}</div>
                    <button class="play-video-btn">▶️</button>
                </div>
                <div class="video-info">
                    <div class="video-title">${video.title}</div>
                    <div class="video-channel">${video.channel}</div>
                </div>
                <div class="video-actions">
                    <button class="action-btn favorite ${video.favorite ? 'active' : ''}" title="Favorite">⭐</button>
                    <button class="action-btn drag-out" title="Drag Out">📤</button>
                    <button class="action-btn delete" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    setupStandaloneEventListeners(element) {
        const urlInput = element.querySelector('.video-url-input');
        const saveBtn = element.querySelector('.save-video-btn');
        const returnBtn = element.querySelector('.return-btn');
        const filterBtns = element.querySelectorAll('.filter-btn');

        saveBtn.addEventListener('click', () => {
            const url = urlInput.value.trim();
            if (url) {
                this.saveVideoFromUrl(url, element);
                urlInput.value = '';
            }
        });

        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveBtn.click();
            }
        });

        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterVideos(btn.dataset.filter, element);
            });
        });

        this.setupVideoItemListeners(element);
    }

    setupVideoItemListeners(element) {
        const videoItems = element.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            const videoId = item.dataset.videoId;
            const video = this.savedVideos.find(v => v.id === videoId);
            
            if (video) {
                const playBtn = item.querySelector('.play-video-btn');
                const favoriteBtn = item.querySelector('.favorite');
                const dragBtn = item.querySelector('.drag-out');
                const deleteBtn = item.querySelector('.delete');
                
                playBtn.addEventListener('click', () => {
                    this.playVideo(video);
                });
                
                favoriteBtn.addEventListener('click', () => {
                    this.toggleFavorite(video, element);
                });
                
                dragBtn.addEventListener('click', () => {
                    this.dragOutVideo(video);
                });
                
                deleteBtn.addEventListener('click', () => {
                    this.deleteVideo(video, element);
                });
            }
        });
    }

    saveVideoFromUrl(url, element) {
        // Extract video ID from YouTube URL
        const videoId = this.extractVideoId(url);
        if (!videoId) {
            this.showNotification(element, 'Invalid YouTube URL', 'error');
            return;
        }

        // Mock video data (in real implementation, would fetch from YouTube API)
        const video = {
            id: videoId,
            title: 'Study Video ' + (this.savedVideos.length + 1),
            channel: 'Study Channel',
            duration: '10:30',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            url: url,
            savedAt: Date.now(),
            favorite: false
        };

        this.savedVideos.push(video);
        this.saveData();
        this.refreshVideoGrid(element);
        this.updatePouchDisplay();
        this.showNotification(element, 'Video saved!', 'success');
    }

    extractVideoId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    refreshVideoGrid(element) {
        const grid = element.querySelector('.videos-grid');
        grid.innerHTML = this.renderVideoGrid();
        this.setupVideoItemListeners(element);
    }

    toggleFavorite(video, element) {
        video.favorite = !video.favorite;
        this.saveData();
        this.refreshVideoGrid(element);
    }

    dragOutVideo(video) {
        // Create a YouTube PiP window for this video
        if (window.youtubeManager) {
            window.youtubeManager.createPiPFromLibrary(video);
        }
    }

    deleteVideo(video, element) {
        this.savedVideos = this.savedVideos.filter(v => v.id !== video.id);
        this.saveData();
        this.refreshVideoGrid(element);
        this.updatePouchDisplay();
    }

    playVideo(video) {
        // Open video in new tab or embedded player
        window.open(video.url, '_blank');
    }

    filterVideos(filter, element) {
        // Implementation for filtering videos
        let filteredVideos = [...this.savedVideos];
        
        switch (filter) {
            case 'recent':
                filteredVideos = filteredVideos.sort((a, b) => b.savedAt - a.savedAt).slice(0, 10);
                break;
            case 'favorites':
                filteredVideos = filteredVideos.filter(v => v.favorite);
                break;
        }
        
        // For now, just refresh the grid (would implement actual filtering)
        this.refreshVideoGrid(element);
    }

    updatePouchDisplay() {
        if (this.element) {
            const countDisplay = this.element.querySelector('.video-count');
            const recentDisplay = this.element.querySelector('.recent-video');
            
            if (countDisplay) {
                countDisplay.textContent = `${this.savedVideos.length} saved`;
            }
            if (recentDisplay) {
                const videoCount = this.savedVideos.length;
                recentDisplay.textContent = videoCount > 0 ? 
                    'Recent: ' + this.savedVideos[videoCount - 1].title.substring(0, 20) + '...' : 
                    'No videos';
            }
        }
    }

    showNotification(element, message, type) {
        const notification = document.createElement('div');
        notification.className = `video-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            color: white;
            background: ${type === 'success' ? 'var(--theme-accent)' : '#ff4757'};
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 1000;
        `;
        
        element.appendChild(notification);
        
        setTimeout(() => notification.style.opacity = '1', 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    saveData() {
        this.data = {
            savedVideos: this.savedVideos
        };
        super.saveData();
    }

    loadData() {
        super.loadData();
        if (this.data.savedVideos) {
            this.savedVideos = this.data.savedVideos;
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            console.log('Video library opened in standalone mode');
            const searchInput = this.standaloneElement.querySelector('.video-search');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 100);
            }
        }
    }
}

// Calculator Component
class StudyCalculatorComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'calculator');
        this.display = '0';
        this.previousValue = null;
        this.operation = null;
        this.waitingForOperand = false;
        this.history = [];
        this.loadData();
    }

    getHTML() {
        return `
            <div class="component-header">
                <span class="component-icon">🧮</span>
                <span class="component-title">Calculator</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="calculator-preview">
                    <div class="calc-display">${this.display}</div>
                    <div class="calc-hint">Click to expand</div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        return `
            <div class="standalone-header">
                <span class="component-icon">🧮</span>
                <span class="component-title">Calculator</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="calculator">
                    <div class="calc-display-area">
                        <div class="calc-history"></div>
                        <div class="calc-main-display">${this.display}</div>
                    </div>
                    
                    <div class="calc-buttons">
                        <button class="calc-btn function" data-action="clear">C</button>
                        <button class="calc-btn function" data-action="clear-entry">CE</button>
                        <button class="calc-btn function" data-action="backspace">⌫</button>
                        <button class="calc-btn operator" data-action="divide">÷</button>
                        
                        <button class="calc-btn number" data-value="7">7</button>
                        <button class="calc-btn number" data-value="8">8</button>
                        <button class="calc-btn number" data-value="9">9</button>
                        <button class="calc-btn operator" data-action="multiply">×</button>
                        
                        <button class="calc-btn number" data-value="4">4</button>
                        <button class="calc-btn number" data-value="5">5</button>
                        <button class="calc-btn number" data-value="6">6</button>
                        <button class="calc-btn operator" data-action="subtract">-</button>
                        
                        <button class="calc-btn number" data-value="1">1</button>
                        <button class="calc-btn number" data-value="2">2</button>
                        <button class="calc-btn number" data-value="3">3</button>
                        <button class="calc-btn operator" data-action="add">+</button>
                        
                        <button class="calc-btn number span-2" data-value="0">0</button>
                        <button class="calc-btn number" data-value=".">.</button>
                        <button class="calc-btn equals" data-action="equals">=</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupStandaloneEventListeners(element) {
        const returnBtn = element.querySelector('.return-btn');
        const calcBtns = element.querySelectorAll('.calc-btn');

        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        calcBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (btn.dataset.value) {
                    this.inputNumber(btn.dataset.value, element);
                } else if (btn.dataset.action) {
                    this.handleAction(btn.dataset.action, element);
                }
            });
        });

        // Improved keyboard support - only when calculator is focused
        const keyHandler = (e) => {
            // Only handle keyboard events when calculator is active and visible
            if (!element.closest('body') || !this.isStandalone) return;
            
            // Don't interfere with other input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            
            // Check if calculator area is being interacted with
            const calculatorArea = element.querySelector('.calculator');
            if (!calculatorArea) return;
            
            e.stopPropagation();
            this.handleKeyboard(e, element);
        };
        
        // Store reference to remove later
        this.keyHandler = keyHandler;
        document.addEventListener('keydown', keyHandler);
        
        // Clean up when component is destroyed
        element.addEventListener('remove', () => {
            if (this.keyHandler) {
                document.removeEventListener('keydown', this.keyHandler);
            }
        });
    }

    inputNumber(num, element) {
        if (this.waitingForOperand) {
            this.display = num;
            this.waitingForOperand = false;
        } else {
            this.display = this.display === '0' ? num : this.display + num;
        }
        
        this.updateDisplay(element);
        this.updatePouchDisplay();
    }

    handleAction(action, element) {
        const inputValue = parseFloat(this.display);

        switch (action) {
            case 'clear':
                this.display = '0';
                this.previousValue = null;
                this.operation = null;
                this.waitingForOperand = false;
                break;
                
            case 'clear-entry':
                this.display = '0';
                break;
                
            case 'backspace':
                this.display = this.display.slice(0, -1) || '0';
                break;
                
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                if (this.previousValue === null) {
                    this.previousValue = inputValue;
                } else if (this.operation) {
                    const currentValue = this.previousValue || 0;
                    const newValue = this.calculate(currentValue, inputValue, this.operation);
                    
                    this.display = String(newValue);
                    this.previousValue = newValue;
                    this.addToHistory(`${currentValue} ${this.getOperatorSymbol(this.operation)} ${inputValue} = ${newValue}`);
                }
                
                this.waitingForOperand = true;
                this.operation = action;
                break;
                
            case 'equals':
                if (this.previousValue !== null && this.operation) {
                    const newValue = this.calculate(this.previousValue, inputValue, this.operation);
                    this.display = String(newValue);
                    this.addToHistory(`${this.previousValue} ${this.getOperatorSymbol(this.operation)} ${inputValue} = ${newValue}`);
                    this.previousValue = null;
                    this.operation = null;
                    this.waitingForOperand = true;
                }
                break;
        }
        
        this.updateDisplay(element);
        this.updatePouchDisplay();
        this.saveData();
    }

    calculate(firstValue, secondValue, operation) {
        switch (operation) {
            case 'add':
                return firstValue + secondValue;
            case 'subtract':
                return firstValue - secondValue;
            case 'multiply':
                return firstValue * secondValue;
            case 'divide':
                return secondValue !== 0 ? firstValue / secondValue : 0;
            default:
                return secondValue;
        }
    }

    getOperatorSymbol(operation) {
        const symbols = {
            'add': '+',
            'subtract': '-',
            'multiply': '×',
            'divide': '÷'
        };
        return symbols[operation] || '';
    }

    addToHistory(calculation) {
        this.history.unshift(calculation);
        if (this.history.length > 10) {
            this.history = this.history.slice(0, 10);
        }
    }

    updateDisplay(element) {
        const mainDisplay = element.querySelector('.calc-main-display');
        const historyDisplay = element.querySelector('.calc-history');
        
        if (mainDisplay) {
            mainDisplay.textContent = this.display;
        }
        
        if (historyDisplay && this.history.length > 0) {
            historyDisplay.innerHTML = this.history.slice(0, 3).map(calc => 
                `<div class="history-item">${calc}</div>`
            ).join('');
        }
    }

    updatePouchDisplay() {
        if (this.element) {
            const pouchDisplay = this.element.querySelector('.calc-display');
            if (pouchDisplay) {
                pouchDisplay.textContent = this.display;
            }
        }
    }

    handleKeyboard(e, element) {
        const key = e.key;
        
        if ('0123456789.'.includes(key)) {
            e.preventDefault();
            this.inputNumber(key, element);
        } else if ('+-*/'.includes(key)) {
            e.preventDefault();
            const actionMap = {
                '+': 'add',
                '-': 'subtract',
                '*': 'multiply',
                '/': 'divide'
            };
            this.handleAction(actionMap[key], element);
        } else if (key === 'Enter' || key === '=') {
            e.preventDefault();
            this.handleAction('equals', element);
        } else if (key === 'Escape') {
            e.preventDefault();
            this.handleAction('clear', element);
        } else if (key === 'Backspace') {
            e.preventDefault();
            this.handleAction('backspace', element);
        }
    }

    saveData() {
        this.data = {
            display: this.display,
            history: this.history
        };
        super.saveData();
    }

    loadData() {
        super.loadData();
        if (this.data.display) {
            this.display = this.data.display;
        }
        if (this.data.history) {
            this.history = this.data.history;
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            // Ensure proper z-index to avoid interference
            this.standaloneElement.style.zIndex = '2147483647';
            console.log('Calculator opened in standalone mode');
            this.updateDisplay(this.standaloneElement);
        }
    }

    destroy() {
        // Clean up keyboard handler
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        super.destroy();
    }
}

// Task Tracker Component
class StudyTaskTrackerComponent extends StudyPouchComponent {
    constructor(id, manager) {
        super(id, manager, 'task-tracker');
        this.tasks = [];
        this.loadData();
    }

    getHTML() {
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const totalTasks = this.tasks.length;
        
        return `
            <div class="component-header">
                <span class="component-icon">✅</span>
                <span class="component-title">Tasks</span>
                <button class="component-close">×</button>
            </div>
            <div class="component-content">
                <div class="task-tracker-preview">
                    <div class="task-progress">${completedTasks}/${totalTasks}</div>
                    <div class="progress-bar-mini">
                        <div class="progress-fill-mini" style="width: ${totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0}%"></div>
                    </div>
                </div>
            </div>
        `;
    }

    getStandaloneHTML() {
        return `
            <div class="standalone-header">
                <span class="component-icon">✅</span>
                <span class="component-title">Task Tracker</span>
                <div class="standalone-controls">
                    <button class="minimize-btn">−</button>
                    <button class="return-btn">↵</button>
                </div>
            </div>
            <div class="standalone-content">
                <div class="task-tracker">
                    <div class="task-input-area">
                        <input type="text" class="new-task-input" placeholder="Add a new task...">
                        <button class="add-task-btn">Add</button>
                    </div>
                    
                    <div class="task-filters">
                        <button class="filter-btn active" data-filter="all">All</button>
                        <button class="filter-btn" data-filter="pending">Pending</button>
                        <button class="filter-btn" data-filter="completed">Completed</button>
                    </div>
                    
                    <div class="task-progress-overview">
                        <div class="progress-stats">
                            <span class="completed-count">${this.tasks.filter(t => t.completed).length}</span>
                            <span class="total-count">/ ${this.tasks.length} tasks</span>
                        </div>
                        <div class="progress-bar-full">
                            <div class="progress-fill-full"></div>
                        </div>
                    </div>
                    
                    <div class="task-list">
                        ${this.renderTaskList()}
                    </div>
                </div>
            </div>
        `;
    }

    renderTaskList() {
        if (this.tasks.length === 0) {
            return `
                <div class="empty-tasks">
                    <div class="empty-icon">📝</div>
                    <div class="empty-text">No tasks yet</div>
                    <div class="empty-subtext">Add a task above to get started</div>
                </div>
            `;
        }

        return this.tasks.map(task => `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <button class="task-checkbox ${task.completed ? 'checked' : ''}">
                    ${task.completed ? '✓' : ''}
                </button>
                <div class="task-content">
                    <div class="task-text">${task.text}</div>
                    <div class="task-meta">
                        <span class="task-date">${new Date(task.createdAt).toLocaleDateString()}</span>
                        ${task.priority ? `<span class="task-priority ${task.priority}">${task.priority}</span>` : ''}
                    </div>
                </div>
                <div class="task-actions">
                    <button class="task-action-btn edit" title="Edit">✏️</button>
                    <button class="task-action-btn priority" title="Priority">⚡</button>
                    <button class="task-action-btn delete" title="Delete">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    setupStandaloneEventListeners(element) {
        const taskInput = element.querySelector('.new-task-input');
        const addBtn = element.querySelector('.add-task-btn');
        const returnBtn = element.querySelector('.return-btn');
        const filterBtns = element.querySelectorAll('.filter-btn');

        addBtn.addEventListener('click', () => {
            const taskText = taskInput.value.trim();
            if (taskText) {
                this.addTask(taskText, element);
                taskInput.value = '';
            }
        });

        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addBtn.click();
            }
        });

        returnBtn.addEventListener('click', () => {
            this.manager.returnComponentToPouch(this);
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterTasks(btn.dataset.filter, element);
            });
        });

        this.setupTaskItemListeners(element);
        this.updateProgress(element);
    }

    setupTaskItemListeners(element) {
        const taskItems = element.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskId = item.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            
            if (task) {
                const checkbox = item.querySelector('.task-checkbox');
                const editBtn = item.querySelector('.edit');
                const priorityBtn = item.querySelector('.priority');
                const deleteBtn = item.querySelector('.delete');
                
                checkbox.addEventListener('click', () => {
                    this.toggleTask(task, element);
                });
                
                editBtn.addEventListener('click', () => {
                    this.editTask(task, element);
                });
                
                priorityBtn.addEventListener('click', () => {
                    this.cyclePriority(task, element);
                });
                
                deleteBtn.addEventListener('click', () => {
                    this.deleteTask(task, element);
                });
            }
        });
    }

    addTask(text, element) {
        const task = {
            id: Date.now().toString(),
            text: text,
            completed: false,
            createdAt: Date.now(),
            priority: null
        };
        
        this.tasks.unshift(task);
        this.saveData();
        this.refreshTaskList(element);
        this.updatePouchDisplay();
        
        // Show success feedback
        this.showTaskAddedNotification(element, text);
    }

    toggleTask(task, element) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        
        this.saveData();
        this.refreshTaskList(element);
        this.updatePouchDisplay();
        
        // Show success feedback for completion
        if (task.completed) {
            this.showTaskCompletedNotification(element, task.text);
        }
    }

    editTask(task, element) {
        const newText = prompt('Edit task:', task.text);
        if (newText && newText.trim()) {
            task.text = newText.trim();
            this.saveData();
            this.refreshTaskList(element);
        }
    }

    cyclePriority(task, element) {
        const priorities = [null, 'low', 'medium', 'high'];
        const currentIndex = priorities.indexOf(task.priority);
        const nextIndex = (currentIndex + 1) % priorities.length;
        
        task.priority = priorities[nextIndex];
        this.saveData();
        this.refreshTaskList(element);
    }

    deleteTask(task, element) {
        if (confirm('Delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== task.id);
            this.saveData();
            this.refreshTaskList(element);
            this.updatePouchDisplay();
        }
    }

    filterTasks(filter, element) {
        const taskItems = element.querySelectorAll('.task-item');
        
        taskItems.forEach(item => {
            const taskId = item.dataset.taskId;
            const task = this.tasks.find(t => t.id === taskId);
            
            let show = true;
            
            switch (filter) {
                case 'pending':
                    show = !task.completed;
                    break;
                case 'completed':
                    show = task.completed;
                    break;
                case 'all':
                default:
                    show = true;
                    break;
            }
            
            item.style.display = show ? 'flex' : 'none';
        });
    }

    refreshTaskList(element) {
        const taskList = element.querySelector('.task-list');
        taskList.innerHTML = this.renderTaskList();
        this.setupTaskItemListeners(element);
        this.updateProgress(element);
    }

    updateProgress(element) {
        const completedTasks = this.tasks.filter(task => task.completed).length;
        const totalTasks = this.tasks.length;
        const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        const completedCount = element.querySelector('.completed-count');
        const totalCount = element.querySelector('.total-count');
        const progressFill = element.querySelector('.progress-fill-full');
        
        if (completedCount) {
            completedCount.textContent = completedTasks;
        }
        if (totalCount) {
            totalCount.textContent = `/ ${totalTasks} tasks`;
        }
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
    }

    updatePouchDisplay() {
        if (this.element) {
            const completedTasks = this.tasks.filter(task => task.completed).length;
            const totalTasks = this.tasks.length;
            const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
            
            const progressDisplay = this.element.querySelector('.task-progress');
            const progressFill = this.element.querySelector('.progress-fill-mini');
            
            if (progressDisplay) {
                progressDisplay.textContent = `${completedTasks}/${totalTasks}`;
            }
            if (progressFill) {
                progressFill.style.width = percentage + '%';
            }
        }
    }

    saveData() {
        this.data = {
            tasks: this.tasks
        };
        super.saveData();
    }

    loadData() {
        super.loadData();
        if (this.data.tasks) {
            this.tasks = this.data.tasks;
        }
    }

    openStandalone() {
        if (this.standaloneElement) {
            console.log('Task tracker opened in standalone mode');
            const taskInput = this.standaloneElement.querySelector('.new-task-input');
            if (taskInput) {
                setTimeout(() => taskInput.focus(), 100);
            }
        }
    }

    showTaskAddedNotification(element, taskText) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--theme-accent, rgba(76, 175, 80, 0.9));
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = `✓ Task added: "${taskText.length > 30 ? taskText.substring(0, 30) + '...' : taskText}"`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    showTaskCompletedNotification(element, taskText) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--theme-accent, rgba(33, 150, 243, 0.9));
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = `🎉 Completed: "${taskText.length > 30 ? taskText.substring(0, 30) + '...' : taskText}"`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    renderTaskList() {
        if (this.standaloneElement) {
            const tasksList = this.standaloneElement.querySelector('.tasks-list');
            if (tasksList) {
                this.renderTasks(tasksList);
            }
        }
    }
}

// Export additional components
window.StudyMusicComponent = StudyMusicComponent;
window.StudyVideoLibraryComponent = StudyVideoLibraryComponent;
window.StudyCalculatorComponent = StudyCalculatorComponent;
window.StudyTaskTrackerComponent = StudyTaskTrackerComponent;
