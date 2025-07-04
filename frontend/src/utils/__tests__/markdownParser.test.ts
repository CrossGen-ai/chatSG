import {
  parseMarkdownProgressive,
  parseMarkdownComplete,
  hasIncompleteMarkdown
} from '../markdownParser';

describe('Markdown Parser', () => {
  describe('parseMarkdownProgressive', () => {
    it('parses complete bold text', () => {
      const content = 'This is **bold** text';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.pendingMarkdown).toBe('');
      expect(result.lastCompletePosition).toBe(content.length);
    });

    it('handles incomplete bold text', () => {
      const content = 'This is **bold';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('This is ');
      expect(result.pendingMarkdown).toBe('**bold');
      expect(result.lastCompletePosition).toBe(8); // Position after "This is "
    });

    it('parses complete italic text', () => {
      const content = 'This is *italic* text';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<em>italic</em>');
      expect(result.pendingMarkdown).toBe('');
    });

    it('handles incomplete italic text', () => {
      const content = 'This is *italic';
      const result = parseMarkdownProgressive(content);
      
      expect(result.pendingMarkdown).toBe('*italic');
    });

    it('parses inline code', () => {
      const content = 'Use `console.log()` to debug';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<code>console.log()</code>');
    });

    it('handles incomplete code blocks', () => {
      const content = '```javascript\nconst x = 1;';
      const result = parseMarkdownProgressive(content);
      
      expect(result.pendingMarkdown).toBe('```javascript\nconst x = 1;');
    });

    it('parses complete code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<pre>');
      expect(result.html).toContain('<code');
      expect(result.pendingMarkdown).toBe('');
    });

    it('continues from last position', () => {
      const content = 'First part. **Bold** text';
      const result1 = parseMarkdownProgressive(content.slice(0, 12), 0);
      expect(result1.lastCompletePosition).toBe(12);
      
      const result2 = parseMarkdownProgressive(content, result1.lastCompletePosition);
      expect(result2.html).toContain('<strong>Bold</strong>');
    });

    it('handles mixed markdown elements', () => {
      const content = '# Header\n\nThis is **bold** and *italic* text with `code`.';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<h1');
      expect(result.html).toContain('<strong>bold</strong>');
      expect(result.html).toContain('<em>italic</em>');
      expect(result.html).toContain('<code>code</code>');
    });

    it('parses links correctly', () => {
      const content = 'Check out [Google](https://google.com)';
      const result = parseMarkdownProgressive(content);
      
      expect(result.html).toContain('<a href="https://google.com"');
      expect(result.html).toContain('>Google</a>');
    });

    it('handles incomplete links', () => {
      const content = 'Check out [Google](https://google.com';
      const result = parseMarkdownProgressive(content);
      
      expect(result.pendingMarkdown).toContain('[Google](https://google.com');
    });
  });

  describe('parseMarkdownComplete', () => {
    it('parses all markdown at once', () => {
      const content = '# Title\n\n**Bold** and *italic* with `code`';
      const result = parseMarkdownComplete(content);
      
      expect(result).toContain('<h1');
      expect(result).toContain('Title</h1>');
      expect(result).toContain('<strong>Bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<code>code</code>');
    });

    it('handles lists', () => {
      const content = '- Item 1\n- Item 2\n- Item 3';
      const result = parseMarkdownComplete(content);
      
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
    });

    it('handles blockquotes', () => {
      const content = '> This is a quote\n> with multiple lines';
      const result = parseMarkdownComplete(content);
      
      expect(result).toContain('<blockquote>');
    });
  });

  describe('hasIncompleteMarkdown', () => {
    it('detects incomplete bold', () => {
      expect(hasIncompleteMarkdown('This is **bold')).toBe(true);
      expect(hasIncompleteMarkdown('This is **bold**')).toBe(false);
    });

    it('detects incomplete italic', () => {
      expect(hasIncompleteMarkdown('This is *italic')).toBe(true);
      expect(hasIncompleteMarkdown('This is *italic*')).toBe(false);
    });

    it('detects incomplete code', () => {
      expect(hasIncompleteMarkdown('This is `code')).toBe(true);
      expect(hasIncompleteMarkdown('This is `code`')).toBe(false);
    });

    it('detects incomplete code blocks', () => {
      expect(hasIncompleteMarkdown('```javascript\ncode here')).toBe(true);
      expect(hasIncompleteMarkdown('```javascript\ncode here\n```')).toBe(false);
    });

    it('detects incomplete links', () => {
      expect(hasIncompleteMarkdown('[link text')).toBe(true);
      expect(hasIncompleteMarkdown('[link text]')).toBe(true);
      expect(hasIncompleteMarkdown('[link text](url')).toBe(true);
      expect(hasIncompleteMarkdown('[link text](url)')).toBe(false);
    });

    it('handles mixed complete markdown', () => {
      expect(hasIncompleteMarkdown('**bold** and *italic* with `code`')).toBe(false);
    });
  });
});