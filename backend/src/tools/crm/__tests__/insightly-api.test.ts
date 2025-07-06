/**
 * Tests for Insightly API Tool
 */

import { InsightlyApiTool } from '../InsightlyApiTool';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment
const originalEnv = process.env;

describe('InsightlyApiTool', () => {
  let tool: InsightlyApiTool;

  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.INSIGHTLY_API_KEY = 'test-api-key-123';
    
    // Mock axios.create
    const mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockClient as any);
    
    // Create tool instance
    tool = new InsightlyApiTool();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid API key', async () => {
      await expect(tool.initialize()).resolves.not.toThrow();
    });

    it('should throw error without API key', async () => {
      delete process.env.INSIGHTLY_API_KEY;
      const newTool = new InsightlyApiTool();
      await expect(newTool.initialize()).rejects.toThrow('INSIGHTLY_API_KEY environment variable is required');
    });
  });

  describe('searchContacts', () => {
    beforeEach(async () => {
      await tool.initialize();
    });

    it('should search contacts by name', async () => {
      const mockResponse = {
        data: [
          { CONTACT_ID: 1, FIRST_NAME: 'John', LAST_NAME: 'Doe', EMAIL_ADDRESS: 'john@example.com' }
        ]
      };

      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await tool.searchContacts({ name: 'John', limit: 10 });
      
      expect(result.items).toEqual(mockResponse.data);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('should search contacts by email', async () => {
      const mockResponse = {
        data: [
          { CONTACT_ID: 2, FIRST_NAME: 'Jane', LAST_NAME: 'Smith', EMAIL_ADDRESS: 'jane@example.com' }
        ]
      };

      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await tool.searchContacts({ email: 'jane@example.com' });
      
      expect(mockClient.get).toHaveBeenCalledWith(expect.stringContaining('EMAIL_ADDRESS'));
      expect(result.items).toEqual(mockResponse.data);
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await tool.initialize();
    });

    it('should enforce rate limiting between requests', async () => {
      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockClient.get.mockResolvedValue({ data: [] });

      const startTime = Date.now();
      
      // Make two rapid requests
      await Promise.all([
        tool.searchContacts({ name: 'test1' }),
        tool.searchContacts({ name: 'test2' })
      ]);
      
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      
      // Should take at least 100ms due to rate limiting (10 req/sec = 100ms between requests)
      expect(elapsed).toBeGreaterThanOrEqual(90); // Allow small timing variance
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await tool.initialize();
    });

    it('should handle 401 authentication errors', async () => {
      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const mockError = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        config: {}
      };
      
      // Simulate interceptor behavior
      const errorHandler = mockClient.interceptors.response.use.mock.calls[0][1];
      
      await expect(errorHandler(mockError)).rejects.toThrow('Authentication failed');
    });

    it('should handle 429 rate limit errors', async () => {
      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      const mockError = {
        response: { status: 429, data: { message: 'Rate limit exceeded' } },
        config: {}
      };
      
      const errorHandler = mockClient.interceptors.response.use.mock.calls[0][1];
      
      await expect(errorHandler(mockError)).rejects.toThrow('Rate limit exceeded');
    });
  });

  describe('execute method', () => {
    beforeEach(async () => {
      await tool.initialize();
    });

    it('should execute searchContacts operation', async () => {
      const mockResponse = {
        data: [
          { CONTACT_ID: 1, FIRST_NAME: 'Test', LAST_NAME: 'User' }
        ]
      };

      const mockClient = (mockedAxios.create as jest.Mock).mock.results[0].value;
      mockClient.get.mockResolvedValueOnce(mockResponse);

      const result = await tool.execute({
        operation: 'searchContacts',
        params: { name: 'Test' }
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('items');
      expect(result.metadata?.operation).toBe('searchContacts');
    });

    it('should handle unknown operations', async () => {
      const result = await tool.execute({
        operation: 'unknownOperation',
        params: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown operation');
    });
  });

  describe('validation', () => {
    it('should validate required parameters', () => {
      const result = tool.validate({});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Operation is required');
    });

    it('should validate operation types', () => {
      const result = tool.validate({
        operation: 'invalidOp',
        params: {}
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid operation: invalidOp');
    });

    it('should validate search parameters', () => {
      const result = tool.validate({
        operation: 'searchContacts',
        params: { limit: 1000 }
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Limit must be between 1 and 500');
    });
  });

  describe('health check', () => {
    it('should report unhealthy when not initialized', () => {
      const health = tool.getHealth();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Tool not initialized');
    });

    it('should report healthy when initialized', async () => {
      await tool.initialize();
      const health = tool.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('Tool operational');
    });
  });
});