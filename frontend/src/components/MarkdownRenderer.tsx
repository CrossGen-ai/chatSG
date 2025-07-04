import React, { useMemo, useRef, useEffect, useState } from 'react';
import { 
  parseMarkdownProgressive, 
  parseMarkdownComplete, 
  hasIncompleteMarkdown 
} from '../utils/markdownParser';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
  darkMode?: boolean;
}

interface MarkdownConfig {
  theme: any;
  darkThemeOverrides: any;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(({ 
  content, 
  isStreaming = false,
  className = '',
  darkMode = false
}) => {
  const [config, setConfig] = useState<MarkdownConfig | null>(null);
  const lastPositionRef = useRef(0);
  const parsedContentRef = useRef('');
  const pendingContentRef = useRef('');
  
  // Load markdown config on mount
  useEffect(() => {
    fetch('/api/config/markdown')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load markdown config:', err));
  }, []);
  
  // Reset refs when streaming starts/stops
  useEffect(() => {
    if (!isStreaming) {
      lastPositionRef.current = 0;
      parsedContentRef.current = '';
      pendingContentRef.current = '';
    }
  }, [isStreaming]);
  
  // Parse content
  const parsedHtml = useMemo(() => {
    if (!content) return '';
    
    if (isStreaming) {
      // Progressive parsing for streaming content
      const result = parseMarkdownProgressive(
        content, 
        lastPositionRef.current,
        config
      );
      
      // Update refs
      lastPositionRef.current = result.lastCompletePosition;
      parsedContentRef.current += result.html;
      pendingContentRef.current = result.pendingMarkdown;
      
      // Return accumulated parsed content + pending plain text
      return parsedContentRef.current + 
        (pendingContentRef.current ? `<span class="pending-markdown">${escapeHtml(pendingContentRef.current)}</span>` : '');
    } else {
      // Complete parsing for static content
      return parseMarkdownComplete(content, config);
    }
  }, [content, isStreaming, config]);
  
  // Apply theme styles
  const themeStyles = useMemo(() => {
    if (!config) return {};
    
    const theme = darkMode && config.darkThemeOverrides 
      ? { ...config.theme, ...config.darkThemeOverrides }
      : config.theme;
    
    return {
      '--md-bold-weight': theme.bold?.fontWeight,
      '--md-h1-size': theme.h1?.fontSize,
      '--md-h1-weight': theme.h1?.fontWeight,
      '--md-h1-margin-top': theme.h1?.marginTop,
      '--md-h1-margin-bottom': theme.h1?.marginBottom,
      '--md-h2-size': theme.h2?.fontSize,
      '--md-h2-weight': theme.h2?.fontWeight,
      '--md-code-bg': theme.code?.backgroundColor,
      '--md-code-padding': theme.code?.padding,
      '--md-code-radius': theme.code?.borderRadius,
      '--md-code-block-bg': theme.codeBlock?.backgroundColor,
      '--md-code-block-padding': theme.codeBlock?.padding,
      '--md-link-color': theme.link?.color,
      '--md-blockquote-border': theme.blockquote?.borderLeft,
      '--md-blockquote-padding': theme.blockquote?.paddingLeft,
      '--md-blockquote-color': theme.blockquote?.color,
    } as React.CSSProperties;
  }, [config, darkMode]);
  
  // Show pending indicator for incomplete markdown
  const showPendingIndicator = isStreaming && hasIncompleteMarkdown(content);
  
  return (
    <div 
      className={`markdown-content ${className} ${darkMode ? 'dark' : 'light'}`}
      style={themeStyles}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: parsedHtml }}
        className="markdown-rendered"
      />
      {showPendingIndicator && (
        <span className="markdown-pending-indicator" aria-label="Processing markdown...">
          ...
        </span>
      )}
    </div>
  );
});

MarkdownRenderer.displayName = 'MarkdownRenderer';

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

export default MarkdownRenderer;