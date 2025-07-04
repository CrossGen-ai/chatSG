import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MarkdownRenderer from '../MarkdownRenderer';

// Mock the markdown parser
jest.mock('../../utils/markdownParser', () => ({
  parseMarkdownProgressive: jest.fn((content) => ({
    html: `<p>${content}</p>`,
    lastCompletePosition: content.length,
    pendingMarkdown: ''
  })),
  parseMarkdownComplete: jest.fn((content) => `<p>${content}</p>`),
  hasIncompleteMarkdown: jest.fn(() => false)
}));

// Mock fetch for config loading
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      theme: {
        bold: { fontWeight: '600' },
        code: { backgroundColor: 'rgba(0, 0, 0, 0.05)' }
      },
      darkThemeOverrides: {
        code: { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
      }
    })
  })
) as jest.Mock;

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders static content correctly', async () => {
    const content = 'Hello **world**!';
    
    render(<MarkdownRenderer content={content} isStreaming={false} />);
    
    await waitFor(() => {
      expect(screen.getByText(content)).toBeInTheDocument();
    });
  });

  it('renders streaming content progressively', async () => {
    const content = 'This is **bold';
    
    render(<MarkdownRenderer content={content} isStreaming={true} />);
    
    await waitFor(() => {
      expect(screen.getByText(content)).toBeInTheDocument();
    });
  });

  it('prevents XSS attacks', async () => {
    const maliciousContent = '<script>alert("xss")</script>Hello';
    
    render(<MarkdownRenderer content={maliciousContent} isStreaming={false} />);
    
    await waitFor(() => {
      expect(screen.queryByText('alert')).not.toBeInTheDocument();
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
    });
  });

  it('applies dark mode styles when specified', async () => {
    const content = 'Dark mode test';
    
    const { container } = render(
      <MarkdownRenderer content={content} isStreaming={false} darkMode={true} />
    );
    
    await waitFor(() => {
      expect(container.querySelector('.markdown-content.dark')).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    const content = 'Custom class test';
    const customClass = 'my-custom-class';
    
    const { container } = render(
      <MarkdownRenderer content={content} className={customClass} />
    );
    
    await waitFor(() => {
      expect(container.querySelector(`.${customClass}`)).toBeInTheDocument();
    });
  });

  it('loads configuration on mount', async () => {
    render(<MarkdownRenderer content="Test" />);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/config/markdown');
    });
  });

  it('handles empty content gracefully', () => {
    const { container } = render(<MarkdownRenderer content="" />);
    
    expect(container.querySelector('.markdown-rendered')).toBeEmptyDOMElement();
  });
});