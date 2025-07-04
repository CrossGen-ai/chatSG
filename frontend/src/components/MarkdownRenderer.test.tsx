import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

// Mock the config fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      enabled: true,
      security: {
        allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'code', 'pre', 'blockquote'],
        allowedAttributes: {
          'a': ['href', 'title'],
          'code': ['class']
        }
      }
    }),
  } as Response)
) as jest.Mock;

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Static Markdown Rendering', () => {
    it('renders bold text correctly', async () => {
      const { container } = render(
        <MarkdownRenderer content="This is **bold** text" isStreaming={false} />
      );
      
      await waitFor(() => {
        const boldElement = container.querySelector('strong');
        expect(boldElement).toBeInTheDocument();
        expect(boldElement?.textContent).toBe('bold');
      });
    });

    it('renders italic text correctly', async () => {
      const { container } = render(
        <MarkdownRenderer content="This is *italic* text" isStreaming={false} />
      );
      
      await waitFor(() => {
        const italicElement = container.querySelector('em');
        expect(italicElement).toBeInTheDocument();
        expect(italicElement?.textContent).toBe('italic');
      });
    });

    it('renders code blocks correctly', async () => {
      const { container } = render(
        <MarkdownRenderer content={'```javascript\nconst x = 5;\n```'} isStreaming={false} />
      );
      
      await waitFor(() => {
        const codeBlock = container.querySelector('pre');
        expect(codeBlock).toBeInTheDocument();
        expect(codeBlock?.textContent).toContain('const x = 5;');
      });
    });

    it('renders links with security attributes', async () => {
      const { container } = render(
        <MarkdownRenderer content="[Click here](https://example.com)" isStreaming={false} />
      );
      
      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link).toBeInTheDocument();
        expect(link?.getAttribute('href')).toBe('https://example.com');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
        expect(link?.getAttribute('target')).toBe('_blank');
      });
    });
  });

  describe('Progressive Markdown Parsing', () => {
    it('shows plain text with cursor for incomplete bold', () => {
      const { container } = render(
        <MarkdownRenderer content="This is **bold" isStreaming={true} />
      );
      
      expect(container.textContent).toContain('This is **bold');
      const cursor = container.querySelector('.animate-pulse');
      expect(cursor).toBeInTheDocument();
    });

    it('completes bold when closing tag arrives', async () => {
      const { rerender, container } = render(
        <MarkdownRenderer content="This is **bold" isStreaming={true} />
      );
      
      rerender(
        <MarkdownRenderer content="This is **bold**" isStreaming={true} />
      );
      
      await waitFor(() => {
        const boldElement = container.querySelector('strong');
        expect(boldElement).toBeInTheDocument();
        expect(boldElement?.textContent).toBe('bold');
      });
    });

    it('handles multiple incomplete elements', () => {
      const { container } = render(
        <MarkdownRenderer content="This is **bold and *italic" isStreaming={true} />
      );
      
      expect(container.textContent).toContain('This is **bold and *italic');
    });
  });

  describe('XSS Prevention', () => {
    it('sanitizes malicious scripts', async () => {
      const { container } = render(
        <MarkdownRenderer 
          content='<script>alert("xss")</script>Hello' 
          isStreaming={false} 
        />
      );
      
      await waitFor(() => {
        expect(container.textContent).toBe('Hello');
        const script = container.querySelector('script');
        expect(script).not.toBeInTheDocument();
      });
    });

    it('sanitizes event handlers', async () => {
      const { container } = render(
        <MarkdownRenderer 
          content='<img src=x onerror="alert(1)">' 
          isStreaming={false} 
        />
      );
      
      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img).not.toBeInTheDocument();
      });
    });

    it('sanitizes javascript: URLs', async () => {
      const { container } = render(
        <MarkdownRenderer 
          content='[Click](javascript:alert(1))' 
          isStreaming={false} 
        />
      );
      
      await waitFor(() => {
        const link = container.querySelector('a');
        expect(link?.getAttribute('href')).not.toContain('javascript:');
      });
    });
  });

  describe('Theme Support', () => {
    beforeEach(() => {
      // Reset document classes
      document.documentElement.className = '';
    });

    it('applies light theme styles by default', () => {
      const { container } = render(
        <MarkdownRenderer content="Test content" isStreaming={false} />
      );
      
      expect(container.firstChild).toHaveClass('markdown-light');
    });

    it('applies dark theme styles when dark mode is active', () => {
      document.documentElement.classList.add('dark');
      
      const { container } = render(
        <MarkdownRenderer content="Test content" isStreaming={false} />
      );
      
      expect(container.firstChild).toHaveClass('markdown-dark');
    });
  });

  describe('Performance', () => {
    it('does not re-render when props are the same', () => {
      let renderCount = 0;
      const TestWrapper = () => {
        renderCount++;
        return <MarkdownRenderer content="Test" isStreaming={false} />;
      };

      const { rerender } = render(<TestWrapper />);
      expect(renderCount).toBe(1);

      rerender(<TestWrapper />);
      expect(renderCount).toBe(1); // Should not increase due to memoization
    });
  });
});