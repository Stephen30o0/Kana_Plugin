// Error Handler for Kana AI Learning Assistant
// Centralized error handling and recovery strategies

class ErrorHandler {
  constructor() {
    this.log('Error Handler initialized');
    this.errorCounts = new Map(); // Track error frequencies
    this.lastErrors = []; // Keep recent errors for analysis
    this.maxRecentErrors = 10;
    this.retryDelays = [1000, 2000, 5000, 10000]; // Progressive retry delays
  }

  log(message, level = 'log') {
    console[level](`[Error Handler]: ${message}`);
  }

  // Categorize different types of errors
  categorizeError(error, context = {}) {
    const errorMessage = typeof error === 'string' ? error : error?.message || 'Unknown error';
    const errorStack = error?.stack || null;
    
    const categories = {
      network: /network|fetch|connection|timeout|cors|net::/i,
      rateLimit: /quota|rate limit|too many requests|429/i,
      authentication: /auth|unauthorized|forbidden|401|403/i,
      notFound: /not found|404/i,
      serverError: /server error|internal|500|502|503|504/i,
      validation: /validation|invalid|malformed|bad request|400/i,
      youtube: /youtube|video|oembed|pip/i,
      api: /api|gemini|openai|claude/i,
      speechRecognition: /speech|recognition|microphone|audio/i,
      storage: /storage|quota exceeded|disk/i,
      permission: /permission|blocked|denied/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(errorMessage)) {
        return {
          category,
          message: errorMessage,
          stack: errorStack,
          context,
          timestamp: Date.now(),
          severity: this.getSeverity(category, errorMessage)
        };
      }
    }

    return {
      category: 'unknown',
      message: errorMessage,
      stack: errorStack,
      context,
      timestamp: Date.now(),
      severity: 'medium'
    };
  }

  getSeverity(category, message) {
    const highSeverityPatterns = [
      /critical|fatal|emergency/i,
      /storage.*full|quota.*exceeded/i,
      /permission.*denied/i
    ];

    const lowSeverityPatterns = [
      /rate limit|429/i,
      /not found|404/i,
      /network.*timeout/i,
      /youtube.*validation/i
    ];

    for (const pattern of highSeverityPatterns) {
      if (pattern.test(message)) return 'high';
    }

    for (const pattern of lowSeverityPatterns) {
      if (pattern.test(message)) return 'low';
    }

    return 'medium';
  }

  // Handle specific error categories with appropriate strategies
  async handleError(error, context = {}) {
    const categorizedError = this.categorizeError(error, context);
    this.trackError(categorizedError);

    this.log(`Handling ${categorizedError.category} error: ${categorizedError.message}`, 
            categorizedError.severity === 'high' ? 'error' : 'warn');

    switch (categorizedError.category) {
      case 'network':
        return this.handleNetworkError(categorizedError, context);
      
      case 'rateLimit':
        return this.handleRateLimitError(categorizedError, context);
      
      case 'youtube':
        return this.handleYouTubeError(categorizedError, context);
      
      case 'api':
        return this.handleAPIError(categorizedError, context);
      
      case 'speechRecognition':
        return this.handleSpeechError(categorizedError, context);
      
      case 'notFound':
        return this.handleNotFoundError(categorizedError, context);
      
      default:
        return this.handleGenericError(categorizedError, context);
    }
  }

  trackError(categorizedError) {
    const key = `${categorizedError.category}:${categorizedError.message.substring(0, 50)}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);

    this.lastErrors.push(categorizedError);
    if (this.lastErrors.length > this.maxRecentErrors) {
      this.lastErrors.shift();
    }
  }

  async handleNetworkError(error, context) {
    const retryCount = context.retryCount || 0;
    
    if (retryCount < this.retryDelays.length) {
      const delay = this.retryDelays[retryCount];
      this.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 1})`);
      
      return {
        shouldRetry: true,
        retryDelay: delay,
        retryCount: retryCount + 1,
        userMessage: `Connection issue. Retrying in ${Math.ceil(delay/1000)} seconds...`,
        fallbackAction: 'showOfflineResponse'
      };
    }

    return {
      shouldRetry: false,
      userMessage: 'Unable to connect. Please check your internet connection and try again.',
      fallbackAction: 'showOfflineResponse'
    };
  }

  async handleRateLimitError(error, context) {
    // For rate limits, wait longer before retry
    const baseDelay = 60000; // 1 minute base delay
    const retryCount = context.retryCount || 0;
    const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff

    return {
      shouldRetry: retryCount < 3,
      retryDelay: Math.min(delay, 300000), // Max 5 minutes
      retryCount: retryCount + 1,
      userMessage: 'AI service is busy. Please wait a moment and try again.',
      fallbackAction: 'showOfflineResponse'
    };
  }

  async handleYouTubeError(error, context) {
    // For YouTube errors, don't retry - just skip the invalid videos
    const videoId = context.videoId || 'unknown';
    
    // Check if this is a common fake URL pattern
    if (/not found|404/i.test(error.message)) {
      this.log(`YouTube video ${videoId} does not exist (likely AI-generated fake URL), skipping silently`, 'warn');
    } else {
      this.log(`YouTube video ${videoId} failed validation: ${error.message}, skipping`, 'warn');
    }
    
    return {
      shouldRetry: false,
      userMessage: null, // Don't show user message for YouTube validation failures
      fallbackAction: 'skipInvalidVideo',
      skipVideoId: videoId,
      isSilentFailure: true // Mark this as a silent failure to avoid user notification
    };
  }

  async handleAPIError(error, context) {
    const retryCount = context.retryCount || 0;
    
    // Try different API models/endpoints
    if (retryCount < 3) {
      return {
        shouldRetry: true,
        retryDelay: this.retryDelays[retryCount] || 5000,
        retryCount: retryCount + 1,
        userMessage: 'Trying alternative AI service...',
        fallbackAction: 'tryAlternativeModel'
      };
    }

    return {
      shouldRetry: false,
      userMessage: 'AI services are temporarily unavailable. Showing offline help.',
      fallbackAction: 'showOfflineResponse'
    };
  }

  async handleSpeechError(error, context) {
    if (error.message.includes('not-allowed')) {
      return {
        shouldRetry: false,
        userMessage: 'Microphone access denied. Please enable microphone permissions.',
        fallbackAction: 'disableSpeechRecognition'
      };
    }

    if (error.message.includes('no-speech')) {
      return {
        shouldRetry: true,
        retryDelay: 1000,
        userMessage: null, // Don't spam user for no speech detected
        fallbackAction: 'continueSpeechRecognition'
      };
    }

    return {
      shouldRetry: true,
      retryDelay: 3000,
      userMessage: null,
      fallbackAction: 'restartSpeechRecognition'
    };
  }

  async handleNotFoundError(error, context) {
    return {
      shouldRetry: false,
      userMessage: 'Resource not found. Please check the link or try a different search.',
      fallbackAction: 'showAlternativeResources'
    };
  }

  async handleGenericError(error, context) {
    const retryCount = context.retryCount || 0;
    
    if (retryCount < 2 && error.severity !== 'high') {
      return {
        shouldRetry: true,
        retryDelay: this.retryDelays[retryCount] || 3000,
        retryCount: retryCount + 1,
        userMessage: 'Something went wrong. Trying again...',
        fallbackAction: 'retry'
      };
    }

    return {
      shouldRetry: false,
      userMessage: 'An error occurred. Please try again later.',
      fallbackAction: 'showErrorMessage'
    };
  }

  // Get error statistics for debugging
  getErrorStats() {
    const stats = {
      totalUniqueErrors: this.errorCounts.size,
      recentErrors: this.lastErrors.length,
      topErrors: [],
      errorsByCategory: {},
      errorsBySeverity: { high: 0, medium: 0, low: 0 }
    };

    // Get top 5 most frequent errors
    const sortedErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    stats.topErrors = sortedErrors.map(([error, count]) => ({ error, count }));

    // Count by category and severity
    this.lastErrors.forEach(error => {
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;
      stats.errorsBySeverity[error.severity]++;
    });

    return stats;
  }

  // Clear error tracking data
  clearErrorData() {
    this.errorCounts.clear();
    this.lastErrors = [];
    this.log('Error tracking data cleared');
  }

  // Check if we should show error details to user (for debugging)
  shouldShowErrorDetails(error) {
    // Only show details for high severity errors or if user is in debug mode
    return error.severity === 'high' || 
           (typeof window !== 'undefined' && window.localStorage?.getItem('kana-debug') === 'true');
  }

  // Format error message for user display
  formatUserErrorMessage(error, includeDetails = false) {
    let message = error.message || 'An unexpected error occurred.';
    
    if (includeDetails && error.stack) {
      message += `\n\nTechnical details:\n${error.stack.substring(0, 200)}...`;
    }
    
    return message;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.ErrorHandler = ErrorHandler;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
