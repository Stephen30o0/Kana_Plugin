// Demo Response Generator for Kana AI Learning Assistant
// Generates safe, educational responses when AI APIs are unavailable

class DemoResponseGenerator {
  constructor() {
    this.log('Demo Response Generator initialized');
    this.subjectPatterns = this.initializeSubjectPatterns();
    this.safeResources = this.initializeSafeResources();
  }

  log(message, level = 'log') {
    console[level](`[Demo Response]: ${message}`);
  }

  initializeSubjectPatterns() {
    return {
      "Unity VR Development": /vr|virtual reality|oculus|headset|controller|interaction|pickup|grab|teleport|6dof|3dof|vr room|unity.*vr|vr.*unity/i,
      "Unity Game Development": /unity(?!.*vr)|game development|gameobject|prefab|script|component|collision|rigidbody|transform|unity.*game|game.*unity/i,
      "Unity Shader Programming": /shader|shadergraph|material|texture|mesh|uv|vertex|fragment|hlsl|surface shader|unity.*shader/i,
      "Web Development": /html|css|javascript|react|vue|angular|nodejs|frontend|backend|web.*dev|fullstack/i,
      "Mobile Development": /android|ios|swift|kotlin|react native|flutter|mobile.*dev|app.*dev/i,
      "Data Science": /machine learning|data science|python.*data|pandas|numpy|tensorflow|pytorch|ai.*model|data.*analysis/i,
      "Computer Science": /algorithm|data structure|binary tree|linked list|sorting|searching|complexity|big o|computer.*science/i,
      "Programming General": /code|programming|function|variable|class|method|array|loop|debug|software/i,
      "Mathematics": /math|algebra|calculus|equation|geometry|trigonometry|number|formula|linear algebra/i,
      "Physics": /physics|force|motion|energy|gravity|mass|velocity|acceleration|momentum|mechanics/i,
      "Chemistry": /chemistry|chemical|reaction|molecule|atom|element|compound|solution|acid|base/i,
      "Biology": /biology|cell|organism|gene|protein|evolution|ecosystem|species|tissue|organ/i,
      "History": /history|century|war|revolution|civilization|empire|kingdom|president|monarch|era|period/i,
      "Literature": /literature|book|novel|author|character|plot|theme|story|writing|poem|poetry/i,
      "Art": /art|design|color|composition|drawing|painting|sculpture|artist|creative|visual/i
    };
  }

  initializeSafeResources() {
    return {
      'Unity VR Development': {
        documentation: [
          {
            title: "Unity XR Interaction Toolkit Documentation",
            url: "https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@latest/",
            description: "Official Unity XR interaction system documentation"
          },
          {
            title: "Unity VR Best Practices",
            url: "https://docs.unity3d.com/Manual/VROverview.html",
            description: "Unity's official VR development guidelines"
          }
        ],
        tutorials: [
          {
            title: "Unity Learn - VR Development",
            url: "https://learn.unity.com/search?k=%5B%22q%3AVR%22%5D",
            description: "Official Unity VR learning resources"
          },
          {
            title: "Unity XR Toolkit Samples",
            url: "https://github.com/Unity-Technologies/XR-Interaction-Toolkit-Examples",
            description: "Official Unity XR examples repository"
          }
        ]
      },
      'Unity Game Development': {
        documentation: [
          {
            title: "Unity Manual",
            url: "https://docs.unity3d.com/Manual/index.html",
            description: "Complete Unity documentation"
          },
          {
            title: "Unity Scripting API",
            url: "https://docs.unity3d.com/ScriptReference/",
            description: "Unity scripting reference"
          }
        ],
        tutorials: [
          {
            title: "Unity Learn Platform",
            url: "https://learn.unity.com/",
            description: "Official Unity learning platform"
          },
          {
            title: "Unity Tutorials",
            url: "https://unity.com/learn/tutorials",
            description: "Official Unity tutorial collection"
          }
        ]
      },
      'Web Development': {
        documentation: [
          {
            title: "MDN Web Docs",
            url: "https://developer.mozilla.org/",
            description: "Comprehensive web development documentation"
          },
          {
            title: "W3Schools",
            url: "https://www.w3schools.com/",
            description: "Web development tutorials and references"
          }
        ],
        tutorials: [
          {
            title: "freeCodeCamp",
            url: "https://www.freecodecamp.org/",
            description: "Free web development curriculum"
          },
          {
            title: "Codecademy Web Development",
            url: "https://www.codecademy.com/catalog/subject/web-development",
            description: "Interactive web development courses"
          }
        ]
      },
      'Programming General': {
        documentation: [
          {
            title: "Stack Overflow",
            url: "https://stackoverflow.com/",
            description: "Programming Q&A community"
          },
          {
            title: "GitHub",
            url: "https://github.com/",
            description: "Code repository and collaboration platform"
          }
        ],
        tutorials: [
          {
            title: "Codecademy",
            url: "https://www.codecademy.com/",
            description: "Interactive programming courses"
          },
          {
            title: "LeetCode",
            url: "https://leetcode.com/",
            description: "Programming practice and interview preparation"
          }
        ]
      }
    };
  }

  detectSubject(userQuestion, pageContent) {
    // Check the question first with priority order (most specific first)
    for (const [subject, pattern] of Object.entries(this.subjectPatterns)) {
      if (pattern.test(userQuestion)) {
        return subject;
      }
    }

    // Check page content safely
    try {
      const pageText = (pageContent.title || '') + ' ' + 
                      (pageContent.headings ? pageContent.headings.map(h => h.text || '').join(' ') : '') + ' ' +
                      (pageContent.text ? pageContent.text.slice(0, 3).join(' ') : '');
      
      for (const [subject, pattern] of Object.entries(this.subjectPatterns)) {
        if (pattern.test(pageText)) {
          return subject;
        }
      }
    } catch (error) {
      console.warn('Error in detectSubject:', error);
    }

    return null;
  }

  getSubjectResources(subject) {
    // Return safe, verified resources without YouTube links that might be fake
    if (this.safeResources[subject]) {
      return [
        ...this.safeResources[subject].documentation,
        ...this.safeResources[subject].tutorials
      ];
    }

    // Default safe resources for any subject
    return [
      {
        title: "Khan Academy",
        url: "https://www.khanacademy.org/",
        description: "Free online courses and practice exercises"
      },
      {
        title: "Coursera",
        url: "https://www.coursera.org/",
        description: "University courses and specializations"
      },
      {
        title: "edX",
        url: "https://www.edx.org/",
        description: "High-quality courses from top universities"
      },
      {
        title: "MIT OpenCourseWare",
        url: "https://ocw.mit.edu/",
        description: "Free course materials from MIT"
      }
    ];
  }

  generateLearningTips(subject, userQuestion) {
    const generalTips = [
      "Break complex problems into smaller, manageable parts",
      "Practice regularly and consistently",
      "Don't hesitate to ask specific questions about what confuses you",
      "Try to explain concepts in your own words",
      "Look for patterns and connections between related concepts"
    ];

    const subjectSpecificTips = {
      'Unity VR Development': [
        "Test frequently in VR headset - desktop testing isn't always accurate",
        "Start with simple interactions before building complex systems",
        "Pay attention to user comfort and motion sickness prevention",
        "Use Unity's XR Interaction Toolkit for standard VR interactions"
      ],
      'Unity Game Development': [
        "Use prefabs to organize reusable game objects",
        "Learn the component system - it's the foundation of Unity",
        "Profile your game early to catch performance issues",
        "Use Unity's built-in physics system before creating custom solutions"
      ],
      'Programming General': [
        "Read error messages carefully - they often tell you exactly what's wrong",
        "Write small test programs to understand new concepts",
        "Use version control (like Git) from the beginning",
        "Code readability is as important as functionality"
      ],
      'Web Development': [
        "Learn HTML and CSS thoroughly before moving to JavaScript",
        "Use browser developer tools to debug and understand code",
        "Practice responsive design from the start",
        "Focus on accessibility - make your sites usable for everyone"
      ]
    };

    return subjectSpecificTips[subject] || generalTips;
  }

  generateSafeResponse(userQuestion, pageContent, platform, errorMessage) {
    const subject = this.detectSubject(userQuestion, pageContent);
    const isRateLimitError = errorMessage && (
      errorMessage.includes('quota') || 
      errorMessage.includes('rate limit') || 
      errorMessage.includes('Too Many Requests') ||
      errorMessage.includes('Service Unavailable')
    );

    const subjectResources = this.getSubjectResources(subject);
    const learningTips = this.generateLearningTips(subject, userQuestion);

    return {
      type: 'learning_guidance',
      title: `Learning Support${subject ? ` for ${subject}` : ''}`,
      content: `
        <div class="kana-learning-help">
          <h3>🎯 Let me help you learn!</h3>
          
          <p>I see you're asking about: <strong>"${userQuestion.substring(0, 100)}${userQuestion.length > 100 ? '...' : ''}"</strong></p>
          
          <h4>📚 Study Strategy</h4>
          <p>Here's how to approach this type of question:</p>
          <ul>
            <li><strong>Break it down:</strong> What are the key concepts involved?</li>
            <li><strong>Find patterns:</strong> Look for similar examples in your materials</li>
            <li><strong>Practice:</strong> Try solving step-by-step with what you know</li>
            <li><strong>Ask specific questions:</strong> What particular part is confusing?</li>
          </ul>
          
          <h4>💡 Learning Tips${subject ? ` for ${subject}` : ''}</h4>
          <ul>
            ${learningTips.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
          
          ${pageContent.headings && pageContent.headings.length > 0 ? `
          <h4>📄 Page Topics I Found</h4>
          <p>This page covers: ${pageContent.headings.slice(0, 3).map(h => h.text || '').join(', ')}</p>
          ` : ''}
          
          <h4>📖 Helpful Resources</h4>
          <ul>
            ${subjectResources.slice(0, 4).map(resource => 
              `<li><a href="${resource.url}" target="_blank" rel="noopener noreferrer">${resource.title}</a> - ${resource.description}</li>`
            ).join('')}
          </ul>
          
          <p><strong>What specific part would you like help understanding better?</strong></p>
          
          ${isRateLimitError ? 
            '<p><em>Note: AI features are temporarily limited due to high usage. Try again in a few minutes.</em></p>' : 
            '<p><em>Note: Working in offline mode - full AI features will return shortly.</em></p>'
          }
        </div>
      `,
      resources: subjectResources,
      encouragement: "Every expert was once a beginner. You're doing great by asking questions!",
      // Explicitly mark this as safe content without potentially fake URLs
      hasValidatedContent: true,
      containsYouTubeUrls: false
    };
  }

  // Generate context-aware hints without giving direct answers
  generateHints(userQuestion, pageContent) {
    const question = userQuestion.toLowerCase();
    
    if (question.includes('how to') || question.includes('how do')) {
      return [
        "Think about what you already know about this topic",
        "What are the main steps or components involved?",
        "Are there any examples in your course materials?",
        "What would happen if you tried a simpler version first?"
      ];
    }
    
    if (question.includes('what is') || question.includes('what are')) {
      return [
        "Look for definitions in your textbook or course materials",
        "How does this concept relate to things you already understand?",
        "Can you find examples of this concept in action?",
        "What keywords or terms are associated with this concept?"
      ];
    }
    
    if (question.includes('why') || question.includes('explain')) {
      return [
        "Think about cause and effect relationships",
        "What problem does this solve or what purpose does it serve?",
        "How does this connect to the bigger picture?",
        "What would happen if this wasn't the case?"
      ];
    }
    
    return [
      "Break the problem down into smaller parts",
      "Look for patterns or similarities to problems you've solved before",
      "What information do you have, and what do you need to find out?",
      "Try working through a simpler example first"
    ];
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.DemoResponseGenerator = DemoResponseGenerator;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DemoResponseGenerator;
}
