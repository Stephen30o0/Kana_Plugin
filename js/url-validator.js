// URL Validation Utility for Kana AI Learning Assistant
// Validates URLs and YouTube video IDs before processing

class URLValidator {
  constructor() {
    this.log('URL Validator initialized');
    this.validatedVideos = new Map(); // Cache validation results
    this.validationTimeout = 5000; // 5 second timeout for validation
  }

  log(message, level = 'log') {
    console[level](`[URL Validator]: ${message}`);
  }

  // Validate YouTube video ID format
  isValidYouTubeId(videoId) {
    if (!videoId || typeof videoId !== 'string') {
      return false;
    }
    
    // YouTube video IDs are exactly 11 characters long
    // and contain only alphanumeric characters, hyphens, and underscores
    return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
  }

  // Extract YouTube video ID from various URL formats
  extractYouTubeId(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Check for suspicious/fake patterns first
    const suspiciousPatterns = [
      /example/i,
      /placeholder/i,
      /test/i,
      /fake/i,
      /demo/i,
      /sample/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        this.log(`Detected suspicious URL pattern: ${url}`, 'warn');
        return null;
      }
    }

    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && this.isValidYouTubeId(match[1])) {
        return match[1];
      }
    }

    return null;
  }

  // Fast validation using oembed endpoint (no API key required)
  async validateYouTubeVideo(videoId) {
    if (!this.isValidYouTubeId(videoId)) {
      return { isValid: false, error: 'Invalid video ID format' };
    }

    // Check cache first
    if (this.validatedVideos.has(videoId)) {
      const cached = this.validatedVideos.get(videoId);
      // Cache results for 1 hour
      if (Date.now() - cached.timestamp < 3600000) {
        return cached.result;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.validationTimeout);

      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const result = { 
          isValid: false, 
          error: `Video not found or unavailable (${response.status})` 
        };
        
        // Cache negative results too (for shorter time)
        this.validatedVideos.set(videoId, {
          result,
          timestamp: Date.now()
        });
        
        return result;
      }

      const data = await response.json();
      const result = {
        isValid: true,
        title: data.title || `YouTube Video (${videoId})`,
        author: data.author_name || 'Unknown',
        thumbnail: data.thumbnail_url || null
      };

      // Cache positive results
      this.validatedVideos.set(videoId, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const result = {
        isValid: false,
        error: error.name === 'AbortError' ? 'Validation timeout' : error.message
      };

      // Cache errors for a short time to avoid repeated failures
      this.validatedVideos.set(videoId, {
        result,
        timestamp: Date.now()
      });

      return result;
    }
  }

  // Validate multiple YouTube URLs/IDs
  async validateMultipleVideos(urls) {
    const validationPromises = urls.map(async (url) => {
      const videoId = typeof url === 'string' ? this.extractYouTubeId(url) : url.videoId;
      
      if (!videoId) {
        return {
          originalUrl: url,
          videoId: null,
          isValid: false,
          error: 'Could not extract valid video ID'
        };
      }

      const validation = await this.validateYouTubeVideo(videoId);
      return {
        originalUrl: url,
        videoId: videoId,
        ...validation
      };
    });

    const results = await Promise.allSettled(validationPromises);
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          originalUrl: urls[index],
          videoId: null,
          isValid: false,
          error: `Validation failed: ${result.reason.message}`
        };
      }
    });
  }

  // Filter out invalid URLs from a list
  async filterValidYouTubeUrls(urls) {
    if (!Array.isArray(urls) || urls.length === 0) {
      return [];
    }

    const validationResults = await this.validateMultipleVideos(urls);
    
    return validationResults
      .filter(result => result.isValid)
      .map(result => ({
        videoId: result.videoId,
        url: `https://www.youtube.com/watch?v=${result.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${result.videoId}?autoplay=1&rel=0&modestbranding=1`,
        title: result.title,
        author: result.author,
        thumbnail: result.thumbnail
      }));
  }

  // Check if a URL is a valid web URL (not just YouTube)
  isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // Sanitize and validate general URLs
  sanitizeUrl(url) {
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Remove any potential XSS attempts
    const cleanUrl = url.trim().replace(/javascript:/gi, '').replace(/data:/gi, '');
    
    if (!this.isValidUrl(cleanUrl)) {
      return null;
    }

    return cleanUrl;
  }

  // Clear validation cache
  clearCache() {
    this.validatedVideos.clear();
    this.log('Validation cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    const now = Date.now();
    let validCount = 0;
    let invalidCount = 0;
    let expiredCount = 0;

    for (const [videoId, cached] of this.validatedVideos) {
      if (now - cached.timestamp > 3600000) {
        expiredCount++;
      } else if (cached.result.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    }

    return {
      total: this.validatedVideos.size,
      valid: validCount,
      invalid: invalidCount,
      expired: expiredCount
    };
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.URLValidator = URLValidator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLValidator;
}
