// Test script to verify viewport detection functionality
// This script can be run in a browser console to test the viewport methods

console.log('Testing Kana AI Viewport Detection...');

// Mock the KanaAI class methods for testing
class ViewportTester {
  
  // Test if an element is in viewport
  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
  }
  
  // Test getting visible content
  getVisibleContent() {
    const elements = document.querySelectorAll('h1, h2, h3, .question, .assignment, p');
    const visibleElements = Array.from(elements).filter(el => this.isElementInViewport(el));
    
    return visibleElements.map(el => ({
      text: el.textContent.trim(),
      type: el.tagName.toLowerCase(),
      className: el.className,
      inViewport: true
    }));
  }
  
  // Test the viewport detection
  runTest() {
    console.log('🔍 Testing viewport detection...');
    
    const visibleContent = this.getVisibleContent();
    
    console.log(`✅ Found ${visibleContent.length} visible elements:`);
    visibleContent.forEach((item, index) => {
      console.log(`  ${index + 1}. [${item.type}] ${item.text.substring(0, 50)}...`);
    });
    
    // Test scrolling behavior
    console.log('\n📜 Testing scroll behavior...');
    
    let scrollCount = 0;
    const scrollTest = () => {
      scrollCount++;
      const newVisibleContent = this.getVisibleContent();
      console.log(`  Scroll ${scrollCount}: ${newVisibleContent.length} visible elements`);
      
      if (scrollCount < 3) {
        window.scrollBy(0, 300);
        setTimeout(scrollTest, 1000);
      } else {
        console.log('✅ Viewport detection test completed!');
      }
    };
    
    scrollTest();
  }
}

// Initialize and run the test
const tester = new ViewportTester();
tester.runTest();
