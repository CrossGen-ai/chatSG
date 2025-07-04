import { contentValidator } from '../ContentValidator';

// Mock fetch
global.fetch = jest.fn();

describe('ContentValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful security config fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        validation: {
          maxMessageLength: 10000,
          maxSessionIdLength: 100
        },
        csrf: {
          enabled: true
        }
      })
    });
  });

  describe('validateMessage', () => {
    it('validates valid messages', () => {
      const result = contentValidator.validateMessage('Hello, world!');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello, world!');
    });

    it('rejects empty messages', () => {
      const result = contentValidator.validateMessage('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('rejects messages that are too long', () => {
      const longMessage = 'a'.repeat(10001);
      const result = contentValidator.validateMessage(longMessage);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('sanitizes HTML in messages', () => {
      const result = contentValidator.validateMessage('<script>alert("xss")</script>Hello');
      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Hello');
    });

    it('rejects messages with too much invalid content', () => {
      const result = contentValidator.validateMessage('<script><script><script>H');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid content');
    });
  });

  describe('validateSessionId', () => {
    it('validates valid session IDs', () => {
      const result = contentValidator.validateSessionId('session-123_abc');
      expect(result.valid).toBe(true);
    });

    it('rejects session IDs with invalid characters', () => {
      const result = contentValidator.validateSessionId('session<>123');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid session ID format');
    });

    it('rejects session IDs that are too long', () => {
      const longId = 'a'.repeat(101);
      const result = contentValidator.validateSessionId(longId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
    });
  });

  describe('checkForThreats', () => {
    it('detects script tags', () => {
      const threats = contentValidator.checkForThreats('<script>alert(1)</script>');
      expect(threats).toContain('Script tag detected');
    });

    it('detects event handlers', () => {
      const threats = contentValidator.checkForThreats('<div onclick="alert(1)">');
      expect(threats).toContain('Event handler detected');
    });

    it('detects suspicious data URIs', () => {
      const threats = contentValidator.checkForThreats('data:text/html,<script>alert(1)</script>');
      expect(threats).toContain('Suspicious data URI detected');
    });

    it('detects iframes', () => {
      const threats = contentValidator.checkForThreats('<iframe src="evil.com"></iframe>');
      expect(threats).toContain('IFrame detected');
    });

    it('returns empty array for safe content', () => {
      const threats = contentValidator.checkForThreats('Hello, this is safe content!');
      expect(threats).toHaveLength(0);
    });
  });

  describe('CSRF token management', () => {
    it('fetches CSRF token from server', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-csrf-token' })
      });

      const token = await contentValidator.getCSRFToken();
      expect(token).toBe('test-csrf-token');
    });

    it('adds CSRF headers to requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'test-csrf-token' })
      });

      const headers = await contentValidator.addCSRFHeaders({ 'Content-Type': 'application/json' });
      expect(headers['X-CSRF-Token']).toBe('test-csrf-token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('handles CSRF token fetch failures gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const token = await contentValidator.getCSRFToken();
      expect(token).toBeNull();
    });
  });
});