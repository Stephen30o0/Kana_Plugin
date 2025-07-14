const text = 'Check [Unity Input System Documentation](fake-url) and [Unity Raycasting Documentation](another-fake) for help.';
const fakeLinkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;

console.log('Original text:', text);

let cleanedText = text;
let linkMatch;

// Reset regex
fakeLinkPattern.lastIndex = 0;

while ((linkMatch = fakeLinkPattern.exec(text)) !== null) {
  const linkText = linkMatch[1];
  const linkUrl = linkMatch[2];
  console.log('Found link:', linkText, '->', linkUrl);
  
  const isValidUrl = /^https?:\/\/[^\s]+$/.test(linkUrl) || /^www\.[^\s]+$/.test(linkUrl);
  console.log('Is valid URL:', isValidUrl);
  
  if (!isValidUrl) {
    const replacement = `Search for "${linkText}" in documentation or tutorials`;
    cleanedText = cleanedText.replace(linkMatch[0], replacement);
    console.log('Replaced with:', replacement);
  }
}

console.log('Cleaned text:', cleanedText);
