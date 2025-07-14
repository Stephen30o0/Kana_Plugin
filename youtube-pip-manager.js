// YouTube Picture-in-Picture Manager for Kana AI Learning Assistant
// Handles automatic opening of YouTube videos in PiP mode when suggested by Kana

class YouTubePiPManager {
  constructor() {
    this.activeVideos = new Map(); // Track active PiP videos
    this.pipSupported = 'pictureInPictureEnabled' in document;
    this.maxConcurrentVideos = 3; // Limit to prevent overwhelming the user
    this.videoQueue = []; // Queue for videos if max limit reached
    
    this.log('YouTube PiP Manager initialized');
    this.setupGlobalStyles();
  }

  log(message, level = 'log') {
    console[level](`Kana PiP: ${message}`);
  }

  setupGlobalStyles() {
    // Inject styles for our custom PiP controls
    const style = document.createElement('style');
    style.textContent = `
      .kana-pip-overlay {
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        z-index: 10000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      
      .kana-pip-counter {
        position: fixed;
        top: 10px;
        left: 10px;
        background: linear-gradient(135deg, rgba(74, 144, 226, 0.9), rgba(154, 74, 226, 0.9));
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 11px;
        font-weight: 500;
        z-index: 10001;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
      }
      
      .kana-pip-counter:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      
      .kana-pip-container {
        position: relative;
        display: inline-block;
      }
      
      .kana-pip-controls {
        position: absolute;
        top: 5px;
        right: 5px;
        background: rgba(0, 0, 0, 0.7);
        border-radius: 4px;
        padding: 4px;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .kana-pip-container:hover .kana-pip-controls {
        opacity: 1;
      }
      
      .kana-pip-close {
        background: rgba(255, 77, 77, 0.9);
        color: white;
        border: none;
        border-radius: 3px;
        width: 20px;
        height: 20px;
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .kana-pip-close:hover {
        background: rgba(255, 77, 77, 1);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Extract YouTube video ID from various URL formats
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Check if a URL is a YouTube video
   */
  isYouTubeVideo(url) {
    return /(?:youtube\.com|youtu\.be)/.test(url) && this.extractVideoId(url) !== null;
  }

  /**
   * Create an embedded YouTube player
   */
  createYouTubePlayer(videoId, title = 'YouTube Video') {
    const container = document.createElement('div');
    container.className = 'kana-pip-container';
    container.style.cssText = `
      position: fixed;
      width: 320px;
      height: 180px;
      z-index: 9999;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      background: black;
    `;

    // Position videos in a grid pattern
    const position = this.calculateVideoPosition();
    container.style.top = position.top;
    container.style.right = position.right;

    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`;
    iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
    `;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
    iframe.title = title;

    // Create controls overlay
    const controls = document.createElement('div');
    controls.className = 'kana-pip-controls';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'kana-pip-close';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close video';
    closeButton.onclick = () => this.closeVideo(videoId);
    
    controls.appendChild(closeButton);
    container.append(iframe, controls);

    // Make draggable
    this.makeDraggable(container);

    return container;
  }

  /**
   * Calculate position for new video to avoid overlap
   */
  calculateVideoPosition() {
    const videoCount = this.activeVideos.size;
    const spacing = 200; // Space between videos
    
    return {
      top: `${20 + (videoCount * spacing)}px`,
      right: '20px'
    };
  }

  /**
   * Make video container draggable
   */
  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return; // Don't drag when clicking buttons
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(window.getComputedStyle(element).right, 10) || 0;
      startTop = parseInt(window.getComputedStyle(element).top, 10) || 0;
      
      element.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = startX - e.clientX; // Reverse for right positioning
      const deltaY = e.clientY - startY;
      
      element.style.right = `${startLeft + deltaX}px`;
      element.style.top = `${startTop + deltaY}px`;
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      element.style.cursor = 'grab';
    });

    element.style.cursor = 'grab';
  }

  /**
   * Open YouTube videos in Picture-in-Picture mode
   */
  async openYouTubeVideos(urls, titles = []) {
    if (!Array.isArray(urls)) {
      urls = [urls];
    }

    const youtubeUrls = urls.filter(url => this.isYouTubeVideo(url));
    
    if (youtubeUrls.length === 0) {
      this.log('No YouTube videos found in provided URLs');
      return;
    }

    this.log(`Opening ${youtubeUrls.length} YouTube video(s) in PiP mode`);

    // Show notification
    this.showNotification(`Opening ${youtubeUrls.length} YouTube video(s)...`);

    for (let i = 0; i < youtubeUrls.length; i++) {
      const url = youtubeUrls[i];
      const title = titles[i] || `YouTube Video ${i + 1}`;
      
      if (this.activeVideos.size >= this.maxConcurrentVideos) {
        // Add to queue if we've reached the limit
        this.videoQueue.push({ url, title });
        this.log(`Video queued: ${title} (${this.videoQueue.length} in queue)`);
        continue;
      }

      await this.openSingleVideo(url, title);
      
      // Small delay between opening multiple videos
      if (i < youtubeUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.updateVideoCounter();
  }

  /**
   * Open a single YouTube video
   */
  async openSingleVideo(url, title) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      this.log(`Could not extract video ID from URL: ${url}`, 'warn');
      return;
    }

    // Check if video is already open
    if (this.activeVideos.has(videoId)) {
      this.log(`Video ${videoId} is already open`);
      return;
    }

    try {
      const videoElement = this.createYouTubePlayer(videoId, title);
      document.body.appendChild(videoElement);
      
      // Store video info
      this.activeVideos.set(videoId, {
        element: videoElement,
        title: title,
        url: url,
        openedAt: Date.now()
      });

      this.log(`Opened video: ${title} (${videoId})`);
      
      // Auto-close after 30 minutes to prevent accumulation
      setTimeout(() => {
        if (this.activeVideos.has(videoId)) {
          this.closeVideo(videoId, 'Auto-closed after 30 minutes');
        }
      }, 30 * 60 * 1000);

    } catch (error) {
      this.log(`Error opening video ${videoId}: ${error.message}`, 'error');
    }
  }

  /**
   * Close a specific video
   */
  closeVideo(videoId, reason = 'User closed') {
    const videoInfo = this.activeVideos.get(videoId);
    if (!videoInfo) {
      this.log(`Video ${videoId} not found`, 'warn');
      return;
    }

    // Remove from DOM
    if (videoInfo.element && videoInfo.element.parentNode) {
      videoInfo.element.parentNode.removeChild(videoInfo.element);
    }

    // Remove from tracking
    this.activeVideos.delete(videoId);
    this.log(`Closed video: ${videoInfo.title} (${reason})`);

    // Open next video from queue if available
    if (this.videoQueue.length > 0) {
      const nextVideo = this.videoQueue.shift();
      setTimeout(() => {
        this.openSingleVideo(nextVideo.url, nextVideo.title);
      }, 500);
    }

    this.updateVideoCounter();
  }

  /**
   * Close all active videos
   */
  closeAllVideos() {
    const videoIds = Array.from(this.activeVideos.keys());
    videoIds.forEach(videoId => this.closeVideo(videoId, 'Close all requested'));
    this.videoQueue = []; // Clear queue as well
    this.hideVideoCounter();
  }

  /**
   * Update the video counter display
   */
  updateVideoCounter() {
    let counter = document.querySelector('.kana-pip-counter');
    
    const totalVideos = this.activeVideos.size + this.videoQueue.length;
    
    if (totalVideos === 0) {
      if (counter) {
        counter.remove();
      }
      return;
    }

    if (!counter) {
      counter = document.createElement('div');
      counter.className = 'kana-pip-counter';
      counter.onclick = () => this.showVideoManager();
      document.body.appendChild(counter);
    }

    const queueText = this.videoQueue.length > 0 ? ` (+${this.videoQueue.length} queued)` : '';
    counter.textContent = `🎥 ${this.activeVideos.size} video(s)${queueText}`;
    counter.title = 'Click to manage videos';
  }

  /**
   * Hide the video counter
   */
  hideVideoCounter() {
    const counter = document.querySelector('.kana-pip-counter');
    if (counter) {
      counter.remove();
    }
  }

  /**
   * Show a temporary notification
   */
  showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.className = 'kana-pip-overlay';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);
  }

  /**
   * Show video manager (for advanced control)
   */
  showVideoManager() {
    const activeCount = this.activeVideos.size;
    const queuedCount = this.videoQueue.length;
    
    if (activeCount === 0 && queuedCount === 0) {
      this.showNotification('No videos currently playing');
      return;
    }

    const actions = [
      `${activeCount} video(s) playing`,
      queuedCount > 0 ? `${queuedCount} video(s) queued` : null,
      'Click video close buttons (×) to close individually',
      'Or double-click this counter to close all'
    ].filter(Boolean).join('\n');

    this.showNotification(actions, 5000);
  }

  /**
   * Get statistics about current videos
   */
  getVideoStats() {
    return {
      active: this.activeVideos.size,
      queued: this.videoQueue.length,
      total: this.activeVideos.size + this.videoQueue.length,
      maxConcurrent: this.maxConcurrentVideos,
      pipSupported: this.pipSupported
    };
  }
}

// Export for use in content.js
window.YouTubePiPManager = YouTubePiPManager;
