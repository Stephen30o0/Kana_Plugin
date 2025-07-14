// YouTube Picture-in-Picture Manager for Kana AI Learning Assistant
// Handles automatic opening of YouTube videos in PiP mode when suggested by Kana

class YouTubePiPManager {
  constructor() {
    this.activePiPVideos = new Map(); // Track active PiP videos
    this.maxConcurrentVideos = 3; // Limit concurrent videos
    this.pipQueue = []; // Queue videos if too many are open
    this.videoCounter = 0; // Unique ID for each video
    this.glassmorphismEnabled = true;
    this.currentTheme = 'blue'; // Default theme
    this.glassThemes = {}; // Will be populated by main Kana instance
    this.glassSettings = { // Default glass settings
      opacity: 85,
      blur: 20,
      saturation: 180,
      brightness: 100,
      depth: 100
    };
    
    this.log('YouTube PiP Manager initialized');
    this.setupStyles();
  }

  log(message, level = 'log') {
    console[level](`[YouTube PiP]: ${message}`);
  }

  // Update theme from main Kana instance
  updateTheme(themeColor, glassThemes, glassSettings) {
    this.currentTheme = themeColor || 'blue';
    this.glassThemes = glassThemes || {};
    this.glassSettings = glassSettings || this.glassSettings;
    
    this.log(`Theme updated to: ${this.currentTheme}`);
    this.setupStyles(); // Refresh styles with new theme
    this.updateExistingVideos(); // Update any existing PiP videos
  }

  // Update existing PiP videos with new theme
  updateExistingVideos() {
    this.activePiPVideos.forEach((videoData, containerId) => {
      if (videoData.container) {
        this.applyThemeToContainer(videoData.container);
      }
    });
  }

  // Apply current theme to a specific container
  applyThemeToContainer(container) {
    if (!this.glassThemes[this.currentTheme]) return;
    
    const theme = this.glassThemes[this.currentTheme];
    
    // Only update colors, keep original styling structure
    // Apply theme to title
    const title = container.querySelector('.kana-pip-title');
    if (title) {
      title.style.color = theme.textColor || 'rgba(255, 255, 255, 0.9)';
    }
    
    // Apply theme to buttons
    const buttons = container.querySelectorAll('.kana-pip-btn');
    buttons.forEach(btn => {
      btn.style.color = theme.textColor || 'rgba(255, 255, 255, 0.8)';
    });
  }

  setupStyles() {
    // Remove existing styles
    const existingStyle = document.querySelector('#kana-pip-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Get current theme for accent color
    const theme = this.glassThemes[this.currentTheme] || {};
    const accentColor = theme.orbBg || '#4A90E2'; // Use orb color as accent
    const textColor = theme.textColor || 'rgba(255, 255, 255, 0.9)';

    // Use original clean styling with theme accent
    const styles = `
      .kana-pip-container {
        position: fixed;
        z-index: 10000;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        min-width: 320px;
        min-height: 180px;
        resize: both;
        transition: all 0.3s ease;
      }

      .kana-pip-container:hover {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.3);
      }

      .kana-pip-header {
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        border-left: 3px solid ${accentColor}; /* Theme accent */
      }

      .kana-pip-title {
        color: ${textColor};
        font-size: 12px;
        font-weight: 500;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
        flex: 1;
        margin-right: 8px;
      }

      .kana-pip-controls {
        display: flex;
        gap: 4px;
      }

      .kana-pip-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 4px;
        color: ${textColor};
        cursor: pointer;
        padding: 4px 6px;
        font-size: 10px;
        transition: all 0.2s ease;
      }

      .kana-pip-btn:hover {
        background: ${accentColor}; /* Theme accent on hover */
        color: white;
        border-color: ${accentColor};
      }

      .kana-pip-video {
        width: 100%;
        height: calc(100% - 40px);
        border: none;
        display: block;
      }

      .kana-pip-queue-indicator {
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, ${accentColor}aa 0%, ${accentColor}88 100%);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 10001;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 20px ${accentColor}55;
      }

      @media (max-width: 768px) {
        .kana-pip-container {
          min-width: 280px;
          min-height: 160px;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.id = 'kana-pip-styles';
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  // Extract YouTube video URLs from text content
  extractYouTubeURLs(text) {
    const youtubePatterns = [
      // Standard YouTube URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/g,
      // YouTube shortened URLs
      /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/g,
      // YouTube embed URLs
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/g,
      // YouTube playlist URLs (extract first video)
      /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})&list=/g
    ];

    // Common fake/example video IDs that AIs might generate
    const fakeVideoIds = new Set([
      'example123', 'example', 'dQw4w9WgXcQ', 'rickroll', 'sample', 'demo', 'test123',
      'VIDEO_ID', 'your_video', 'placeholder', 'XXXXXXXXX', 'abcdefghijk'
    ]);

    const videoIds = new Set();
    const urls = [];

    youtubePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const videoId = match[1];
        
        // Skip if it's a known fake ID or already processed
        if (fakeVideoIds.has(videoId)) {
          this.log(`Skipping fake/example video ID: ${videoId}`, 'warn');
        } else if (!videoIds.has(videoId)) {
          videoIds.add(videoId);
          urls.push({
            videoId: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
          });
        }
      }
    });

    return urls;
  }

  // Get video title from YouTube API and validate video exists
  async getVideoTitle(videoId) {
    try {
      // First check if the video ID looks valid (11 characters, alphanumeric and _-)
      if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        throw new Error('Invalid video ID format');
      }

      // Try to fetch video info using YouTube's oembed endpoint (no API key needed)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) {
        throw new Error(`Video not found or unavailable (${response.status})`);
      }
      
      const data = await response.json();
      return data.title || `YouTube Video (${videoId.substring(0, 6)}...)`;
    } catch (error) {
      this.log(`Failed to validate video ${videoId}: ${error.message}`, 'warn');
      throw error; // Re-throw to prevent creating PiP for invalid videos
    }
  }

  // Create PiP video container
  async createPiPContainer(videoData) {
    const { videoId, embedUrl } = videoData;
    const containerId = `kana-pip-${++this.videoCounter}`;
    
    // Get video title
    const title = await this.getVideoTitle(videoId);

    // Create container
    const container = document.createElement('div');
    container.className = 'kana-pip-container';
    container.id = containerId;
    
    // Position new videos with slight offset
    const offset = (this.activePiPVideos.size * 30) % 200;
    container.style.top = `${100 + offset}px`;
    container.style.right = `${20 + offset}px`;
    container.style.width = '400px';
    container.style.height = '280px';

    // Create header with controls
    const header = document.createElement('div');
    header.className = 'kana-pip-header';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'kana-pip-title';
    titleElement.textContent = title;
    titleElement.title = title; // Tooltip for full title

    const controls = document.createElement('div');
    controls.className = 'kana-pip-controls';

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'kana-pip-btn';
    minimizeBtn.innerHTML = '−';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.onclick = () => this.minimizeVideo(containerId);

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'kana-pip-btn';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.title = 'Open in new tab';
    fullscreenBtn.onclick = () => this.openInNewTab(videoData.url);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'kana-pip-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.closeVideo(containerId);

    controls.append(minimizeBtn, fullscreenBtn, closeBtn);
    header.append(titleElement, controls);

    // Create iframe for video
    const iframe = document.createElement('iframe');
    iframe.className = 'kana-pip-video';
    iframe.src = embedUrl;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowfullscreen = true;

    container.append(header, iframe);
    document.body.appendChild(container);

    // Make draggable
    this.makeDraggable(container, header);

    // Apply current theme
    this.applyThemeToContainer(container);

    // Store video data
    this.activePiPVideos.set(containerId, {
      ...videoData,
      title,
      container,
      iframe,
      isMinimized: false
    });

    this.log(`Created PiP video: ${title}`);
    this.updateQueueIndicator();
    
    return containerId;
  }

  // Make container draggable with smooth orb-style dragging
  makeDraggable(container, header) {
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    // Start drag function
    const startDrag = (e) => {
      if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons
      
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      
      // Get touch or mouse position
      const clientX = e.clientX || e.touches[0].clientX;
      const clientY = e.clientY || e.touches[0].clientY;
      
      // Store the offset of the mouse position within the container
      const containerRect = container.getBoundingClientRect();
      dragOffset = {
        x: clientX - containerRect.left,
        y: clientY - containerRect.top
      };
      
      // Add dragging class and bring to front
      container.classList.add('dragging');
      container.style.zIndex = '10002';
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    };

    // Drag function
    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      
      // Get touch or mouse position
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
      
      if (clientX === null || clientY === null) return;
      
      // Calculate new position using offset
      const newLeft = clientX - dragOffset.x;
      const newTop = clientY - dragOffset.y;
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - container.offsetWidth;
      const maxY = window.innerHeight - container.offsetHeight;
      
      const boundedX = Math.max(0, Math.min(newLeft, maxX));
      const boundedY = Math.max(0, Math.min(newTop, maxY));
      
      // Apply new position
      container.style.left = `${boundedX}px`;
      container.style.top = `${boundedY}px`;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
    };

    // Stop drag function
    const stopDrag = () => {
      if (!isDragging) return;
      
      isDragging = false;
      container.classList.remove('dragging');
      container.style.zIndex = '10000'; // Reset z-index
      
      // Restore text selection
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };

    // Mouse events
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    // Touch events for mobile support
    header.addEventListener('touchstart', startDrag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('touchend', stopDrag);
  }

  // Minimize video (reduce size, keep playing)
  minimizeVideo(containerId) {
    const videoData = this.activePiPVideos.get(containerId);
    if (!videoData) return;

    const container = videoData.container;
    
    if (!videoData.isMinimized) {
      // Store original size
      videoData.originalWidth = container.style.width;
      videoData.originalHeight = container.style.height;
      
      // Minimize
      container.style.width = '240px';
      container.style.height = '160px';
      container.style.opacity = '0.8';
      videoData.isMinimized = true;
      
      // Update button
      const minimizeBtn = container.querySelector('.kana-pip-btn');
      minimizeBtn.innerHTML = '+';
      minimizeBtn.title = 'Restore';
    } else {
      // Restore
      container.style.width = videoData.originalWidth || '400px';
      container.style.height = videoData.originalHeight || '280px';
      container.style.opacity = '1';
      videoData.isMinimized = false;
      
      // Update button
      const minimizeBtn = container.querySelector('.kana-pip-btn');
      minimizeBtn.innerHTML = '−';
      minimizeBtn.title = 'Minimize';
    }
  }

  // Open video in new tab
  openInNewTab(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Close video
  closeVideo(containerId) {
    const videoData = this.activePiPVideos.get(containerId);
    if (!videoData) return;

    // Remove from DOM
    videoData.container.remove();
    
    // Remove from tracking
    this.activePiPVideos.delete(containerId);
    
    this.log(`Closed PiP video: ${videoData.title}`);
    
    // Process queue if there are waiting videos
    this.processQueue();
    this.updateQueueIndicator();
  }

  // Process videos from queue
  processQueue() {
    while (this.pipQueue.length > 0 && this.activePiPVideos.size < this.maxConcurrentVideos) {
      const videoData = this.pipQueue.shift();
      this.createPiPContainer(videoData);
    }
  }

  // Update queue indicator
  updateQueueIndicator() {
    const existingIndicator = document.querySelector('.kana-pip-queue-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }

    if (this.activePiPVideos.size > 0 || this.pipQueue.length > 0) {
      const indicator = document.createElement('div');
      indicator.className = 'kana-pip-queue-indicator';
      
      let text = `📺 ${this.activePiPVideos.size} video${this.activePiPVideos.size !== 1 ? 's' : ''}`;
      if (this.pipQueue.length > 0) {
        text += ` (+${this.pipQueue.length} queued)`;
      }
      
      indicator.textContent = text;
      document.body.appendChild(indicator);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        if (indicator.parentNode && this.activePiPVideos.size === 0) {
          indicator.remove();
        }
      }, 3000);
    }
  }

  // Main method to open YouTube videos from Kana's response
  async openYouTubeVideos(responseText) {
    try {
      this.log('Scanning response for YouTube videos...');
      
      // Extract YouTube URLs from the response
      const videoUrls = this.extractYouTubeURLs(responseText);
      
      if (videoUrls.length === 0) {
        this.log('No YouTube videos found in response');
        return;
      }

      this.log(`Found ${videoUrls.length} YouTube video(s)`);
      
      // Process each video
      for (const videoData of videoUrls) {
        if (this.activePiPVideos.size < this.maxConcurrentVideos) {
          try {
            await this.createPiPContainer(videoData);
            // Add small delay between videos to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            this.log(`Failed to create PiP for video ${videoData.videoId}: ${error.message}`, 'warn');
            // Continue with next video
          }
        } else {
          // Add to queue
          this.pipQueue.push(videoData);
          this.log(`Video queued: ${videoData.videoId}`);
        }
      }
      
      this.updateQueueIndicator();
      
    } catch (error) {
      this.log(`Error opening YouTube videos: ${error.message}`, 'error');
    }
  }

  // Method to open pre-validated YouTube videos (skips validation)
  async openValidatedYouTubeVideos(validatedVideoUrls) {
    try {
      this.log(`Opening ${validatedVideoUrls.length} pre-validated YouTube video(s)...`);
      
      if (validatedVideoUrls.length === 0) {
        this.log('No validated YouTube videos to open');
        return;
      }
      
      // Process each validated video
      for (const videoData of validatedVideoUrls) {
        if (this.activePiPVideos.size < this.maxConcurrentVideos) {
          try {
            // Create PiP container directly without validation since URLs are pre-validated
            await this.createPiPContainerValidated(videoData);
            // Add small delay between videos to prevent overwhelming
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error) {
            this.log(`Failed to create PiP for pre-validated video ${videoData.videoId}: ${error.message}`, 'warn');
            // Continue with next video
          }
        } else {
          // Add to queue
          this.pipQueue.push(videoData);
          this.log(`Pre-validated video queued: ${videoData.videoId}`);
        }
      }
      
      this.updateQueueIndicator();
      
    } catch (error) {
      this.log(`Error opening pre-validated YouTube videos: ${error.message}`, 'error');
    }
  }

  // Create PiP container for already validated video data
  async createPiPContainerValidated(videoData) {
    const { videoId, embedUrl, title, author, thumbnail } = videoData;
    const containerId = `kana-pip-${++this.videoCounter}`;
    
    // Use provided title or create a default one
    const videoTitle = title || `YouTube Video (${videoId.substring(0, 6)}...)`;

    // Create container
    const container = document.createElement('div');
    container.className = 'kana-pip-container';
    container.id = containerId;
    
    // Position new videos with slight offset
    const offset = (this.activePiPVideos.size * 30) % 200;
    container.style.top = `${100 + offset}px`;
    container.style.right = `${20 + offset}px`;
    container.style.width = '400px';
    container.style.height = '280px';

    // Create header with controls
    const header = document.createElement('div');
    header.className = 'kana-pip-header';
    
    const titleElement = document.createElement('div');
    titleElement.className = 'kana-pip-title';
    titleElement.textContent = videoTitle;
    titleElement.title = videoTitle; // Tooltip for full title

    const controls = document.createElement('div');
    controls.className = 'kana-pip-controls';

    // Minimize button
    const minimizeBtn = document.createElement('button');
    minimizeBtn.className = 'kana-pip-btn';
    minimizeBtn.innerHTML = '−';
    minimizeBtn.title = 'Minimize';
    minimizeBtn.onclick = () => this.minimizeVideo(containerId);

    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'kana-pip-btn';
    fullscreenBtn.innerHTML = '⛶';
    fullscreenBtn.title = 'Open in new tab';
    fullscreenBtn.onclick = () => this.openInNewTab(videoData.url || `https://www.youtube.com/watch?v=${videoId}`);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'kana-pip-btn';
    closeBtn.innerHTML = '×';
    closeBtn.title = 'Close';
    closeBtn.onclick = () => this.closeVideo(containerId);

    controls.append(minimizeBtn, fullscreenBtn, closeBtn);
    header.append(titleElement, controls);

    // Create iframe for video
    const iframe = document.createElement('iframe');
    iframe.className = 'kana-pip-video';
    iframe.src = embedUrl;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.allowfullscreen = true;

    // Assemble container
    container.append(header, iframe);
    
    // Make draggable
    this.makeDraggable(container, header);
    
    // Apply current theme
    this.applyThemeToContainer(container);
    
    // Add to page
    document.body.appendChild(container);
    
    // Store reference
    this.activePiPVideos.set(containerId, {
      videoId: videoId,
      title: videoTitle,
      url: videoData.url || `https://www.youtube.com/watch?v=${videoId}`,
      container: container,
      isMinimized: false
    });
    
    this.log(`PiP created for pre-validated video: ${videoTitle} (${videoId})`);
    
    // Trigger entrance animation
    setTimeout(() => {
      container.style.opacity = '1';
      container.style.transform = 'scale(1)';
    }, 100);
  }

  // Close all videos
  closeAllVideos() {
    const containerIds = Array.from(this.activePiPVideos.keys());
    containerIds.forEach(id => this.closeVideo(id));
    this.pipQueue = [];
    this.updateQueueIndicator();
    this.log('Closed all PiP videos');
  }

  // Get current status
  getStatus() {
    return {
      activeVideos: this.activePiPVideos.size,
      queuedVideos: this.pipQueue.length,
      maxConcurrent: this.maxConcurrentVideos,
      videoIds: Array.from(this.activePiPVideos.values()).map(v => v.videoId)
    };
  }

  // Set maximum concurrent videos
  setMaxConcurrentVideos(max) {
    this.maxConcurrentVideos = Math.max(1, Math.min(max, 5)); // Limit between 1-5
    this.processQueue(); // Process queue in case limit was increased
    this.log(`Max concurrent videos set to: ${this.maxConcurrentVideos}`);
  }
}

// Make available globally
window.YouTubePiPManager = YouTubePiPManager;
