import { parseMarkdownProgressive, parseMarkdownComplete } from './markdownParser';

const mockConfig = {
  security: {
    allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3'],
    allowedAttributes: {
      'a': ['href', 'title'],
      'code': ['class']
    }
  }
};

describe('markdownParser', () => {
  describe('parseMarkdownProgressive', () => {
    it('parses complete bold text', () => {
      const result = parseMarkdownProgressive('Hello **world**', 0, mockConfig);
      expect(result.html).toContain('<strong>world</strong>');
      expect(result.lastCompletePosition).toBe(15);
      expect(result.pendingMarkdown).toBe('');
    });

    it('does not parse incomplete bold text', () => {
      const result = parseMarkdownProgressive('Hello **world', 0, mockConfig);
      expect(result.html).toContain('Hello ');
      expect(result.html).not.toContain('<strong>');
      expect(result.pendingMarkdown).toBe('**world');
    });

    it('completes bold when closing tag arrives', () => {
      // First pass - incomplete
      const result1 = parseMarkdownProgressive('Hello **world', 0, mockConfig);
      expect(result1.lastCompletePosition).toBe(6); // After "Hello "

      // Second pass - complete
      const result2 = parseMarkdownProgressive('Hello **world**', result1.lastCompletePosition, mockConfig);
      expect(result2.html).toContain('<strong>world</strong>');
      expect(result2.lastCompletePosition).toBe(15);
    });

    it('handles multiple markdown elements', () => {
      const content = 'This is **bold** and *italic* text';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.html).toContain('<em>italic</em>');
    });

    it('handles code blocks', () => {
      const content = '```javascript\nconst x = 5;\n```';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('<pre>');
      expect(result.html).toContain('const x = 5;');
    });

    it('handles incomplete code blocks', () => {
      const content = '```javascript\nconst x = 5;';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toBe('');
      expect(result.pendingMarkdown).toBe(content);
    });

    it('handles headers', () => {
      const content = '# Hello World\nThis is text';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('<h1>Hello World</h1>');
    });

    it('handles links', () => {
      const content = 'Check out [this link](https://example.com)';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('<a href="https://example.com"');
      expect(result.html).toContain('rel="noopener noreferrer"');
      expect(result.html).toContain('target="_blank"');
    });

    it('handles incomplete links', () => {
      const content = 'Check out [this link](https://example';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('Check out ');
      expect(result.html).not.toContain('<a');
      expect(result.pendingMarkdown).toBe('[this link](https://example');
    });
  });

  describe('parseMarkdownComplete', () => {
    it('parses all markdown elements', () => {
      const content = `
# Header 1
## Header 2

This is **bold** and *italic* text.

\`\`\`javascript
const x = 5;
\`\`\`

> This is a blockquote

- List item 1
- List item 2

[Link](https://example.com)
      `;
      
      const result = parseMarkdownComplete(content, mockConfig);
      expect(result).toContain('<h1>Header 1</h1>');
      expect(result).toContain('<h2>Header 2</h2>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<pre>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>');
    });

    it('sanitizes malicious content', () => {
      const content = '<script>alert("xss")</script>Hello **world**';
      const result = parseMarkdownComplete(content, mockConfig);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<strong>world</strong>');
    });

    it('sanitizes javascript URLs', () => {
      const content = '[Click me](javascript:alert(1))';
      const result = parseMarkdownComplete(content, mockConfig);
      expect(result).not.toContain('javascript:');
    });

    it('adds security attributes to links', () => {
      const content = '[Example](https://example.com)';
      const result = parseMarkdownComplete(content, mockConfig);
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      const result = parseMarkdownProgressive('', 0, mockConfig);
      expect(result.html).toBe('');
      expect(result.lastCompletePosition).toBe(0);
      expect(result.pendingMarkdown).toBe('');
    });

    it('handles content with only whitespace', () => {
      const result = parseMarkdownProgressive('   \n\n  ', 0, mockConfig);
      expect(result.lastCompletePosition).toBe(7);
    });

    it('handles nested markdown', () => {
      const content = '**This is *nested* markdown**';
      const result = parseMarkdownComplete(content, mockConfig);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>nested</em>');
    });

    it('handles mixed content', () => {
      const content = 'Normal text **bold** more text *italic* end';
      const result = parseMarkdownProgressive(content, 0, mockConfig);
      expect(result.html).toContain('Normal text');
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.html).toContain('<em>italic</em>');
    });
  });
});