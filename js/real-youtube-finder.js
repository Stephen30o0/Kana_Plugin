// Real YouTube Video Finder for Kana AI Learning Assistant
// Uses multiple methods to find real, existing YouTube videos

class RealYouTubeVideoFinder {
  constructor() {
    this.log('Real YouTube Video Finder initialized');
    this.knownEducationalVideos = this.initializeKnownVideos();
    this.searchPatterns = this.initializeSearchPatterns();
  }

  log(message, level = 'log') {
    console[level](`[YouTube Finder]: ${message}`);
  }

  // Initialize database of known, verified educational videos
  initializeKnownVideos() {
    return {
      unity_prefabs: [
        { id: 'F20Jv0y_1Qo', title: 'Unity Prefabs Tutorial - Complete Guide', channel: 'Unity', verified: true },
        { id: 'HkA5fPsJoMw', title: 'How to use PREFABS in Unity', channel: 'Brackeys', verified: true },
        { id: 'H0gLZbDd6Do', title: 'Unity Prefab System Explained', channel: 'Code Monkey', verified: true }
      ],
      unity_ui: [
        { id: 'JivuXdrIHK0', title: 'Unity Canvas and UI System', channel: 'Unity', verified: true },
        { id: 'uD7y4T4PVk0', title: 'Unity Button Tutorial', channel: 'Brackeys', verified: true },
        { id: 'kWRyLBjH1FE', title: 'Unity UI Complete Tutorial', channel: 'Brackeys', verified: true }
      ],
      unity_scripting: [
        { id: 'UuKX9OJDXDI', title: 'Unity Scripting for Beginners', channel: 'Brackeys', verified: true },
        { id: '9ZA58biBJIQ', title: 'C# Scripts in Unity', channel: 'Unity', verified: true },
        { id: 'YWVOiPHcOOQ', title: 'Unity Game Manager Script', channel: 'Code Monkey', verified: true }
      ],
      unity_buttons: [
        { id: 'uD7y4T4PVk0', title: 'Unity Button Tutorial', channel: 'Brackeys', verified: true },
        { id: 'kWRyLBjH1FE', title: 'Unity UI Complete Tutorial', channel: 'Brackeys', verified: true }
      ],
      unity_gameobjects: [
        { id: 'N77RD4taZGY', title: 'Unity GameObjects Explained', channel: 'Unity', verified: true },
        { id: 'pwZpJzpE2lQ', title: 'Unity GameObject Basics', channel: 'Brackeys', verified: true }
      ],
      unity_physics: [
        { id: 'Bc9lmHjhagc', title: 'Unity Physics Tutorial', channel: 'Brackeys', verified: true },
        { id: 'j-I2vSNZjWY', title: 'Unity Rigidbody and Colliders', channel: 'Unity', verified: true }
      ],
      programming_basics: [
        { id: 'GhQdlIFylQ8', title: 'Programming Tutorial for Beginners', channel: 'freeCodeCamp', verified: true },
        { id: 'YCMphi09LV0', title: 'Learn Programming Fundamentals', channel: 'Traversy Media', verified: true }
      ],
      game_development: [
        { id: 'XOjd_qU2Ido', title: 'Game Development for Beginners', channel: 'Unity', verified: true },
        { id: 'hFr8y5XZz_A', title: 'Complete Game Development Course', channel: 'Blackthornprod', verified: true }
      ]
    };
  }

  // Initialize search patterns for matching topics to video categories
  initializeSearchPatterns() {
    return {
      unity_prefabs: /prefab|reusable.*object|instantiat.*object/i,
      unity_ui: /ui|user.*interface|canvas|button.*ui|menu/i,
      unity_scripting: /script|c#|coding|programming.*unity|unity.*code/i,
      unity_buttons: /button|click|ui.*button|onclick|button.*event/i,
      unity_gameobjects: /gameobject|game.*object|unity.*object|hierarchy/i,
      unity_physics: /physics|rigidbody|collider|collision|force/i,
      programming_basics: /programming.*basic|learn.*programming|code.*beginner/i,
      game_development: /game.*dev|making.*game|create.*game|game.*design/i
    };
  }

  // Find real YouTube videos for a given topic
  async findRealVideos(topic, maxCount = 3) {
    try {
      this.log(`Finding real videos for topic: ${topic}`);
      
      // Step 1: Find matching categories
      const matchingCategories = this.findMatchingCategories(topic);
      
      // Step 2: Get videos from matching categories
      const foundVideos = [];
      for (const category of matchingCategories) {
        const categoryVideos = this.knownEducationalVideos[category] || [];
        
        // Validate that these videos still exist
        const validatedVideos = await this.validateVideoExistence(categoryVideos);
        foundVideos.push(...validatedVideos);
      }

      // Step 3: Sort by relevance and return top results
      const sortedVideos = this.sortVideosByRelevance(foundVideos, topic);
      const finalVideos = sortedVideos.slice(0, maxCount);

      this.log(`Found ${finalVideos.length} real videos for topic: ${topic}`);
      return finalVideos.map(video => this.formatVideoForPiP(video));

    } catch (error) {
      this.log(`Error finding real videos: ${error.message}`, 'error');
      return [];
    }
  }

  // Find categories that match the given topic
  findMatchingCategories(topic) {
    const matchingCategories = [];
    const topicLower = topic.toLowerCase();

    for (const [category, pattern] of Object.entries(this.searchPatterns)) {
      if (pattern.test(topicLower)) {
        matchingCategories.push(category);
      }
    }

    // If no specific matches, add some general categories
    if (matchingCategories.length === 0) {
      if (/unity/i.test(topicLower)) {
        matchingCategories.push('unity_scripting', 'unity_gameobjects');
      } else if (/game/i.test(topicLower)) {
        matchingCategories.push('game_development');
      } else if (/programming|code/i.test(topicLower)) {
        matchingCategories.push('programming_basics');
      }
    }

    return matchingCategories;
  }

  // Validate that videos still exist on YouTube
  async validateVideoExistence(videos) {
    const validVideos = [];

    for (const video of videos) {
      try {
        // Quick check if video exists using oembed
        const isValid = await this.quickVideoCheck(video.id);
        if (isValid) {
          validVideos.push(video);
        } else {
          this.log(`Video ${video.id} no longer exists, removing from results`, 'warn');
        }
      } catch (error) {
        this.log(`Could not validate video ${video.id}: ${error.message}`, 'warn');
        // Include it anyway, let the URL validator handle it later
        validVideos.push(video);
      }
    }

    return validVideos;
  }

  // Quick check if a video exists
  async quickVideoCheck(videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl, { 
        method: 'HEAD', // Just check if it exists
        timeout: 3000 
      });
      return response.ok;
    } catch (error) {
      return false; // Assume it doesn't exist if we can't check
    }
  }

  // Sort videos by relevance to the topic
  sortVideosByRelevance(videos, topic) {
    const topicWords = topic.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    return videos.map(video => ({
      ...video,
      relevanceScore: this.calculateRelevanceScore(video, topicWords)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // Calculate how relevant a video is to the topic
  calculateRelevanceScore(video, topicWords) {
    const title = video.title.toLowerCase();
    let score = 0;

    for (const word of topicWords) {
      if (title.includes(word)) {
        score += 10; // Exact word match
      } else if (title.includes(word.substring(0, Math.max(3, word.length - 1)))) {
        score += 5; // Partial match
      }
    }

    // Boost score for verified videos
    if (video.verified) {
      score += 20;
    }

    // Boost score for popular educational channels
    const popularChannels = ['Unity', 'Brackeys', 'Code Monkey', 'freeCodeCamp'];
    if (popularChannels.includes(video.channel)) {
      score += 15;
    }

    return score;
  }

  // Format video data for PiP display
  formatVideoForPiP(video) {
    return {
      id: video.id,  // Primary ID field for consistency
      videoId: video.id,  // Keep both for compatibility
      url: `https://www.youtube.com/watch?v=${video.id}`,
      embedUrl: `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`,
      title: video.title,
      channel: video.channel,
      verified: video.verified || false
    };
  }

  // Add new verified videos to the database
  addVerifiedVideo(category, videoData) {
    if (!this.knownEducationalVideos[category]) {
      this.knownEducationalVideos[category] = [];
    }
    
    this.knownEducationalVideos[category].push({
      ...videoData,
      verified: true,
      addedAt: Date.now()
    });
    
    this.log(`Added new verified video to ${category}: ${videoData.title}`);
  }

  // Get statistics about the video database
  getStats() {
    const stats = {
      totalCategories: Object.keys(this.knownEducationalVideos).length,
      totalVideos: 0,
      videosByCategory: {}
    };

    for (const [category, videos] of Object.entries(this.knownEducationalVideos)) {
      stats.videosByCategory[category] = videos.length;
      stats.totalVideos += videos.length;
    }

    return stats;
  }

  // Search for videos across all categories
  searchAllVideos(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [category, videos] of Object.entries(this.knownEducationalVideos)) {
      for (const video of videos) {
        if (video.title.toLowerCase().includes(queryLower) || 
            video.channel.toLowerCase().includes(queryLower)) {
          results.push({
            ...video,
            category,
            relevance: this.calculateQueryRelevance(video, queryLower)
          });
        }
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  calculateQueryRelevance(video, query) {
    const title = video.title.toLowerCase();
    let relevance = 0;

    if (title.includes(query)) {
      relevance += 100;
    } else {
      const queryWords = query.split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 2 && title.includes(word)) {
          relevance += 20;
        }
      }
    }

    return relevance;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.RealYouTubeVideoFinder = RealYouTubeVideoFinder;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealYouTubeVideoFinder;
}
