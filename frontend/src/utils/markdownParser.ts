import { marked } from 'marked';
import { sanitizeMarkdown } from './sanitizer';

interface ParseResult {
  html: string;
  lastCompletePosition: number;
  pendingMarkdown: string;
}

interface MarkdownElement {
  text: string;
  length: number;
}

// Configure marked for security
marked.setOptions({
  headerIds: false, // Prevent ID injection
  mangle: false, // Don't obfuscate email addresses
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // Convert \n to <br>
});

/**
 * Parse markdown progressively during streaming
 */
export function parseMarkdownProgressive(
  content: string, 
  lastPosition: number = 0,
  config?: any
): ParseResult {
  // PATTERN: Only parse new content since last position
  const newContent = content.slice(lastPosition);
  
  
  // CRITICAL: Identify complete markdown elements
  const completeElements = findCompleteMarkdownElements(newContent);
  
  // GOTCHA: Don't parse incomplete elements
  let parsedHtml = '';
  let currentPos = lastPosition;
  
  for (const element of completeElements) {
    let cleanHtml;
    
    // Check if this is plain text (no markdown formatting)
    if (isPlainText(element.text)) {
      // For plain text, don't wrap in <p> tags - just escape and use as-is
      cleanHtml = escapeHtml(element.text);
    } else {
      // Parse markdown to HTML
      const rawHtml = marked.parse(element.text);
      
      // SECURITY: Sanitize the HTML
      cleanHtml = sanitizeMarkdown(rawHtml);
      
      // For streaming, convert block elements to inline where appropriate
      cleanHtml = convertBlockToInlineForStreaming(cleanHtml);
    }
    
    
    parsedHtml += cleanHtml;
    currentPos += element.length;
  }
  
  // Return pending markdown that's incomplete
  const pendingMarkdown = content.slice(currentPos);
  
  
  return {
    html: parsedHtml,
    lastCompletePosition: currentPos,
    pendingMarkdown
  };
}

/**
 * Parse complete markdown content
 */
export function parseMarkdownComplete(content: string, config?: any): string {
  // Parse the entire content at once
  const rawHtml = marked.parse(content);
  
  // Sanitize and return
  return sanitizeMarkdown(rawHtml);
}

/**
 * Helper to find complete markdown elements
 */
function findCompleteMarkdownElements(text: string): MarkdownElement[] {
  const elements: MarkdownElement[] = [];
  let remainingText = text;
  let position = 0;
  
  while (remainingText.length > 0) {
    const nextElement = findNextCompleteElement(remainingText);
    
    if (nextElement) {
      elements.push(nextElement);
      remainingText = remainingText.slice(nextElement.length);
      position += nextElement.length;
    } else {
      // No more complete elements found
      break;
    }
  }
  
  return elements;
}

/**
 * Find the next complete markdown element in text
 */
function findNextCompleteElement(text: string): MarkdownElement | null {
  // Check for complete bold/italic markers
  const boldMatch = /^(.*?)(\*\*[^*]+\*\*|__[^_]+__)/.exec(text);
  const italicMatch = /^(.*?)(\*[^*\n]+\*|_[^_\n]+_)(?![*_])/.exec(text);
  
  // Check for code blocks
  const codeBlockMatch = /^(.*?)(```[\s\S]*?```)/.exec(text);
  const inlineCodeMatch = /^(.*?)(`[^`\n]+`)/.exec(text);
  
  // Check for headers (must end with newline)
  const headerMatch = /^(.*?)(#{1,6}\s+[^\n]+\n)/.exec(text);
  
  // Check for links
  const linkMatch = /^(.*?)(\[[^\]]+\]\([^)]+\))/.exec(text);
  
  // Check for blockquotes (line starting with >)
  const blockquoteMatch = /^(.*?)(^>[^\n]*\n)/.exec(text);
  
  // Check for lists
  const listMatch = /^(.*?)(^[\s]*[-*+]\s+[^\n]+\n)/.exec(text);
  const orderedListMatch = /^(.*?)(^[\s]*\d+\.\s+[^\n]+\n)/.exec(text);
  
  // Find the earliest match
  const matches = [
    { match: boldMatch, type: 'bold' },
    { match: italicMatch, type: 'italic' },
    { match: codeBlockMatch, type: 'codeBlock' },
    { match: inlineCodeMatch, type: 'code' },
    { match: headerMatch, type: 'header' },
    { match: linkMatch, type: 'link' },
    { match: blockquoteMatch, type: 'blockquote' },
    { match: listMatch, type: 'list' },
    { match: orderedListMatch, type: 'orderedList' }
  ].filter(m => m.match !== null);
  
  if (matches.length === 0) {
    // Check if there's plain text before end of string
    if (text.length > 0) {
      // Look for the next markdown indicator
      const nextMarkdownIndex = findNextMarkdownIndicator(text);
      if (nextMarkdownIndex > 0) {
        return {
          text: text.slice(0, nextMarkdownIndex),
          length: nextMarkdownIndex
        };
      }
    }
    return null;
  }
  
  // Sort by position of the markdown element (after any preceding text)
  matches.sort((a, b) => {
    const aPos = a.match![1].length;
    const bPos = b.match![1].length;
    return aPos - bPos;
  });
  
  const earliest = matches[0];
  const precedingText = earliest.match![1];
  const markdownElement = earliest.match![2];
  
  // Return the complete element including any preceding plain text
  return {
    text: precedingText + markdownElement,
    length: precedingText.length + markdownElement.length
  };
}

/**
 * Find the next markdown indicator in text
 */
function findNextMarkdownIndicator(text: string): number {
  const indicators = ['*', '_', '`', '#', '[', '>', '-', '+', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.'];
  let minIndex = text.length;
  
  for (const indicator of indicators) {
    const index = text.indexOf(indicator);
    if (index >= 0 && index < minIndex) {
      // Check if it's at the start of a line for list items and blockquotes
      if ((indicator === '>' || indicator === '-' || indicator === '+' || /^\d+\.$/.test(indicator))) {
        if (index === 0 || text[index - 1] === '\n') {
          minIndex = index;
        }
      } else {
        minIndex = index;
      }
    }
  }
  
  return minIndex;
}

/**
 * Check if text ends with an incomplete markdown element
 */
export function hasIncompleteMarkdown(text: string): boolean {
  // Check for unclosed bold/italic
  const asteriskCount = (text.match(/\*/g) || []).length;
  const underscoreCount = (text.match(/_/g) || []).length;
  
  if (asteriskCount % 2 !== 0 || underscoreCount % 2 !== 0) {
    return true;
  }
  
  // Check for unclosed code blocks
  const codeBlockCount = (text.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    return true;
  }
  
  // Check for unclosed inline code
  const backtickCount = (text.match(/`/g) || []).length - (codeBlockCount * 3);
  if (backtickCount % 2 !== 0) {
    return true;
  }
  
  // Check for incomplete link
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  
  // Simple check for link syntax
  if (text.includes('[') && (openBrackets !== closeBrackets || 
      (text.lastIndexOf(']') > text.lastIndexOf('[') && openParens !== closeParens))) {
    return true;
  }
  
  return false;
}

/**
 * Check if text is plain text with no markdown formatting
 */
function isPlainText(text: string): boolean {
  // Check for markdown indicators
  const markdownPattern = /[*_`#\[\]>-]|^\d+\./;
  return !markdownPattern.test(text);
}

/**
 * Convert block elements to inline for better streaming flow
 */
function convertBlockToInlineForStreaming(html: string): string {
  // Convert <p> tags to just the content (inline)
  html = html.replace(/<p>(.*?)<\/p>/g, '$1');
  
  // Normalize whitespace - convert multiple spaces/line breaks to single spaces
  html = html.replace(/\s+/g, ' ');
  
  // Remove leading/trailing whitespace
  html = html.trim();
  
  // If we have content, ensure it ends with a space for natural flow
  if (html.length > 0 && !html.endsWith(' ')) {
    html += ' ';
  }
  
  return html;
}

/**
 * Escape HTML entities for plain text and normalize whitespace
 */
function escapeHtml(text: string): string {
  // First normalize whitespace like we do for parsed content
  text = text.replace(/\s+/g, ' ').trim();
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}