import DOMPurify from 'dompurify';

// Configure DOMPurify for React
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Set all links to open in new tab with security attributes
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  allowImages?: boolean;
  allowLinks?: boolean;
}

// Default sanitization options for chat messages
const DEFAULT_CHAT_OPTIONS: SanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'span'],
  allowedAttributes: {},
  allowImages: false,
  allowLinks: false
};

// Markdown-specific sanitization options
const MARKDOWN_OPTIONS: SanitizeOptions = {
  allowedTags: [
    'b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 
    'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 
    'h4', 'h5', 'h6', 'br', 'hr', 'span', 'del'
  ],
  allowedAttributes: {
    'a': ['href', 'title'],
    'code': ['class'],
    'span': ['class'],
    'pre': ['class']
  },
  allowImages: false, // Can be enabled if needed
  allowLinks: true
};

/**
 * Sanitize HTML content for safe rendering
 */
export function sanitizeHtml(
  dirty: string, 
  options: SanitizeOptions = DEFAULT_CHAT_OPTIONS
): string {
  const config: any = {
    ALLOWED_TAGS: options.allowedTags,
    ALLOWED_ATTR: Object.keys(options.allowedAttributes || {}),
    ALLOWED_URI_REGEXP: options.allowLinks 
      ? /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
      : /^$/,
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  };

  // Add specific attribute rules
  if (options.allowedAttributes) {
    config.ALLOWED_ATTR = [];
    Object.entries(options.allowedAttributes).forEach(([tag, attrs]) => {
      attrs.forEach(attr => {
        config.ALLOWED_ATTR.push(`${tag}[${attr}]`);
      });
    });
  }

  return DOMPurify.sanitize(dirty, config);
}

/**
 * Sanitize markdown-generated HTML
 */
export function sanitizeMarkdown(html: string): string {
  return sanitizeHtml(html, MARKDOWN_OPTIONS);
}

/**
 * Sanitize user input before sending to server
 */
export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });
  
  // Additional cleaning
  return cleaned
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

/**
 * Check if content contains potentially dangerous patterns
 */
export function containsDangerousContent(content: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\(/i,
    /expression\(/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(content));
}

/**
 * Escape HTML entities for display
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char] || char);
}