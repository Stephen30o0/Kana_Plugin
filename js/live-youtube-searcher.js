// Live YouTube Search Integration for Kana AI Learning Assistant
// This performs REAL YouTube searches using YouTube Data API v3

class LiveYouTubeSearcher {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    this.log('Live YouTube Searcher initialized');
    
    // Fallback to public APIs if no API key
    this.usePublicAPIs = !apiKey;
    if (this.usePublicAPIs) {
      this.log('No API key provided - will use public APIs with limited functionality', 'warn');
    }
  }

  log(message, level = 'log') {
    console[level](`[Live YouTube Search]: ${message}`);
  }

  // REAL YouTube search using YouTube Data API v3
  async searchEducationalVideos(query, maxResults = 10) {
    if (!this.apiKey) {
      this.log('No YouTube API key - falling back to limited search methods', 'warn');
      return await this.searchWithoutAPI(query, maxResults);
    }

    try {
      this.log(`Performing REAL YouTube search for: "${query}"`);
      
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: `${query} tutorial educational`,
        type: 'video',
        order: 'relevance',
        maxResults: maxResults,
        key: this.apiKey,
        safeSearch: 'strict',
        videoEmbeddable: 'true',
        videoSyndicated: 'true'
      });

      const searchUrl = `${this.baseUrl}/search?${searchParams}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        this.log(`No videos found for query: ${query}`, 'warn');
        return [];
      }

      this.log(`Found ${data.items.length} real YouTube videos for: ${query}`);
      
      // Convert to our format
      const videos = data.items.map(item => ({
        id: item.id.videoId,  // Use 'id' for consistency with static database
        videoId: item.id.videoId,  // Keep both for compatibility
        title: item.snippet.title,
        description: item.snippet.description,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&rel=0&modestbranding=1`,
        searchQuery: query,
        isRealSearch: true
      }));

      // Filter for educational content
      return this.filterEducationalContent(videos);

    } catch (error) {
      this.log(`Error in real YouTube search: ${error.message}`, 'error');
      
      // Fallback to public APIs
      this.log('Falling back to public API methods...', 'warn');
      return await this.searchWithoutAPI(query, maxResults);
    }
  }

  // Alias for searchEducationalVideos for consistency
  async searchVideos(query, maxResults = 10) {
    return await this.searchEducationalVideos(query, maxResults);
  }

  // Search without API key using public endpoints
  async searchWithoutAPI(query, maxResults = 5) {
    try {
      this.log(`No YouTube API key available - cannot search for: "${query}"`);
      this.log('To enable real YouTube search, add your YouTube Data API v3 key in extension options');
      
      // Skip public API calls due to CORS restrictions in Chrome extensions
      // These would work in a regular website but not in extension context
      return [];
      
    } catch (error) {
      this.log(`Error in public API search: ${error.message}`, 'error');
      return [];
    }
  }

  // Get YouTube search suggestions (public endpoint)
  async getYouTubeSearchSuggestions(query) {
    try {
      const suggestionUrl = `https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query + ' tutorial')}`;
      
      const response = await fetch(suggestionUrl);
      if (!response.ok) return [];
      
      const text = await response.text();
      
      // Parse JSONP response
      const jsonMatch = text.match(/\[(.*)\]/);
      if (!jsonMatch) return [];
      
      const suggestions = JSON.parse(jsonMatch[0])[1];
      
      // Convert suggestions to search queries and find videos
      const videos = [];
      for (const suggestion of suggestions.slice(0, 3)) {
        const query = suggestion[0];
        const searchResults = await this.searchYouTubeRSS(query);
        videos.push(...searchResults);
      }
      
      return videos;
      
    } catch (error) {
      this.log(`Could not fetch YouTube suggestions: ${error.message}`, 'warn');
      return [];
    }
  }

  // Search educational channels via RSS feeds
  async searchEducationalChannelRSS(query) {
    const educationalChannels = [
      { name: 'Unity', id: 'UCehTQwkJIjbHhRzxhWtvGdQ' },
      { name: 'Brackeys', id: 'UCYbK_tjZ2OrIZFBvU6CCMiA' },
      { name: 'Code Monkey', id: 'UCFK6NCbuqUEKrF9tAmtQLOQ' },
      { name: 'freeCodeCamp', id: 'UC8butISFwT-Wl7EV0hUK0BQ' },
      { name: 'The Net Ninja', id: 'UCW5YeuERMmlnqo4oq8vwUpg' },
      { name: 'Traversy Media', id: 'UC29ju8bIPH5as8OGnQzwJyA' }
    ];

    const videos = [];
    const queryLower = query.toLowerCase();

    for (const channel of educationalChannels) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
        const response = await fetch(rssUrl);
        
        if (response.ok) {
          const xml = await response.text();
          const channelVideos = this.parseYouTubeRSS(xml, channel.name);
          
          // Filter videos that match the query
          const matchingVideos = channelVideos.filter(video => 
            video.title.toLowerCase().includes(queryLower) ||
            video.description.toLowerCase().includes(queryLower)
          );
          
          videos.push(...matchingVideos);
        }
      } catch (error) {
        this.log(`Could not fetch RSS for ${channel.name}: ${error.message}`, 'warn');
      }
    }

    return videos;
  }

  // Search a specific YouTube RSS feed
  async searchYouTubeRSS(query) {
    try {
      // This is a simplified approach - in reality, RSS feeds don't support search
      // We'd need to fetch recent videos and filter them
      return [];
    } catch (error) {
      return [];
    }
  }

  // Parse YouTube RSS feed XML
  parseYouTubeRSS(xml, channelName) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      const entries = doc.querySelectorAll('entry');
      
      const videos = [];
      entries.forEach(entry => {
        const videoId = entry.querySelector('videoId')?.textContent;
        const title = entry.querySelector('title')?.textContent;
        const published = entry.querySelector('published')?.textContent;
        const description = entry.querySelector('description')?.textContent || '';
        
        if (videoId && title) {
          videos.push({
            videoId,
            title,
            description,
            channel: channelName,
            publishedAt: published,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
            isRealSearch: false,
            isRSSSearch: true
          });
        }
      });
      
      return videos;
    } catch (error) {
      this.log(`Error parsing RSS: ${error.message}`, 'warn');
      return [];
    }
  }

  // Filter content to ensure it's educational
  filterEducationalContent(videos) {
    const educationalKeywords = [
      'tutorial', 'guide', 'how to', 'learn', 'course', 'lesson', 'beginner',
      'explained', 'basics', 'introduction', 'fundamentals', 'complete guide'
    ];
    
    return videos.filter(video => {
      const titleLower = video.title.toLowerCase();
      const descLower = (video.description || '').toLowerCase();
      
      return educationalKeywords.some(keyword => 
        titleLower.includes(keyword) || descLower.includes(keyword)
      );
    });
  }

  // Remove duplicate videos
  deduplicateVideos(videos) {
    const seen = new Set();
    return videos.filter(video => {
      if (seen.has(video.videoId)) {
        return false;
      }
      seen.add(video.videoId);
      return true;
    });
  }

  // Get video statistics (requires API key)
  async getVideoStats(videoId) {
    if (!this.apiKey) {
      return null;
    }

    try {
      const statsParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        id: videoId,
        key: this.apiKey
      });

      const statsUrl = `${this.baseUrl}/videos?${statsParams}`;
      const response = await fetch(statsUrl);
      
      if (response.ok) {
        const data = await response.json();
        return data.items[0] || null;
      }
    } catch (error) {
      this.log(`Error getting video stats: ${error.message}`, 'warn');
    }
    
    return null;
  }

  // Search for specific topics with advanced filtering
  async searchForTopic(topic, options = {}) {
    const {
      maxResults = 10,
      duration = 'medium', // short, medium, long
      definition = 'high',
      order = 'relevance' // relevance, date, rating, viewCount
    } = options;

    if (!this.apiKey) {
      return await this.searchEducationalVideos(topic, maxResults);
    }

    try {
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: `${topic} tutorial educational guide`,
        type: 'video',
        order: order,
        maxResults: maxResults,
        key: this.apiKey,
        safeSearch: 'strict',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        videoDuration: duration,
        videoDefinition: definition
      });

      const searchUrl = `${this.baseUrl}/search?${searchParams}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      const videos = data.items.map(item => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.high?.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&rel=0&modestbranding=1`,
        searchQuery: topic,
        isRealSearch: true,
        searchOptions: options
      }));

      this.log(`Advanced search found ${videos.length} videos for topic: ${topic}`);
      return videos;

    } catch (error) {
      this.log(`Error in advanced topic search: ${error.message}`, 'error');
      return await this.searchEducationalVideos(topic, maxResults);
    }
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.LiveYouTubeSearcher = LiveYouTubeSearcher;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveYouTubeSearcher;
}
