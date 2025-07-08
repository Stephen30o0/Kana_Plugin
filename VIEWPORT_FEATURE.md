## 🎯 Viewport-Aware Kana AI Assistant

### What's New: Smart Content Prioritization

Kana now **intelligently prioritizes content based on what you're currently viewing on screen**! This makes the assistant much more contextually aware and helpful.

### How It Works:

1. **Viewport Detection**: When you ask a question, Kana scans what's currently visible in your browser viewport
2. **Content Prioritization**: It identifies and prioritizes:
   - Questions that are visible on screen
   - The current section/heading you're viewing
   - Relevant assignments, code blocks, and text
3. **Smart Relevance Scoring**: Content gets scored based on:
   - How visible it is (fully vs. partially visible)
   - How close it is to the center of your screen
   - How relevant it is to your question

### Example Usage:

**Scenario 1: Numbered Questions**
- You're viewing "Question 2" on screen and ask: "help with question 2"
- Kana will prioritize Question 2 over other questions, even if Question 1 appears earlier in the page

**Scenario 2: Current Section Awareness**
- You're scrolled to the "Unity Shaders" section
- When you ask "what is base color?", Kana knows you're in the shader context
- It will provide shader-specific guidance about base colors

**Scenario 3: Code Context**
- You're viewing a specific code block
- Ask "explain this code" and Kana focuses on the visible code

### Key Features:

✅ **Viewport Detection**: Knows what you can currently see
✅ **Question Number Matching**: "question 1", "question 2", etc.
✅ **Section Context**: Understands which topic section you're in
✅ **Visibility Priority**: Prioritizes fully visible over partially visible content
✅ **Smart Relevance**: Combines visibility with keyword matching

### Technical Implementation:

- `isElementInViewport()`: Detects if elements are visible
- `prioritizeVisibleContent()`: Ranks content by visibility
- `findMostRelevantVisibleContent()`: Matches user questions to visible content
- `parseUserQuestionWithViewport()`: Enhanced question parsing with viewport context

### Console Output Example:
```
Prioritizing content based on viewport visibility...
Viewport prioritization results: {
  currentSection: "Unity ShaderGraph Basics",
  visibleQuestions: 3
}
Most relevant visible content: {
  questions: [
    { text: "What is the purpose of a base color?", relevanceScore: 125 }
  ]
}
```

This makes Kana much more intelligent and context-aware, especially for long pages with multiple questions and sections!
