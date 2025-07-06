/**
 * Tests for CRM Agent
 */

import { CRMAgent } from '../agent';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the tools
jest.mock('../../../../tools/crm', () => ({
  InsightlyApiTool: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true)
  })),
  ContactManagerTool: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: {
        contacts: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            company: 'Example Corp',
            leadScore: 85,
            display: '**John Doe** at Example Corp'
          }
        ],
        count: 1
      }
    })
  })),
  OpportunityTool: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({
      success: true,
      data: {
        pipelines: [
          {
            id: 1,
            name: 'Sales Pipeline',
            display: '## Sales Pipeline\\nTotal: 10 opportunities',
            summary: { totalOpportunities: 10, totalValue: 500000 }
          }
        ]
      }
    })
  }))
}));

// Mock environment
const originalEnv = process.env;

describe('CRMAgent', () => {
  let agent: CRMAgent;

  beforeEach(() => {
    // Setup environment
    process.env = { ...originalEnv };
    process.env.INSIGHTLY_API_KEY = 'test-api-key';
    
    // Create agent
    agent = new CRMAgent();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should only initialize once', async () => {
      await agent.initialize();
      await agent.initialize(); // Second call should be no-op
      
      // Check that tools were only initialized once
      const { ContactManagerTool } = require('../../../../tools/crm');
      expect(ContactManagerTool).toHaveBeenCalledTimes(1);
    });
  });

  describe('processMessage', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should process customer lookup queries', async () => {
      const result = await agent.processMessage(
        'Find customer john.doe@example.com',
        'test-session-123'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('John Doe');
      expect(result.metadata?.queryIntent).toBe('customer_lookup');
      expect(result.metadata?.confidence).toBeGreaterThan(0.5);
    });

    it('should process pipeline status queries', async () => {
      const result = await agent.processMessage(
        'Show me the sales pipeline status',
        'test-session-456'
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sales Pipeline');
      expect(result.metadata?.queryIntent).toBe('pipeline_status');
    });

    it('should handle general CRM queries', async () => {
      const result = await agent.processMessage(
        'What CRM data do you have?',
        'test-session-789'
      );

      expect(result.success).toBe(true);
      expect(result.metadata?.queryIntent).toBe('general_query');
    });

    it('should use streaming callback when provided', async () => {
      const onStatus = jest.fn();
      const streamCallback = { onStatus };

      await agent.processMessage(
        'Find customer test',
        'test-session',
        streamCallback
      );

      expect(onStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'processing',
          message: 'Analyzing CRM query...'
        })
      );

      expect(onStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'complete',
          message: 'CRM query processed successfully'
        })
      );
    });
  });

  describe('getCapabilities', () => {
    it('should return agent capabilities', () => {
      const capabilities = agent.getCapabilities();

      expect(capabilities.name).toBe('CRMAgent');
      expect(capabilities.version).toBe('1.0.0');
      expect(capabilities.supportedModes).toContain('query');
      expect(capabilities.features).toContain('customer-lookup');
      expect(capabilities.features).toContain('pipeline-analysis');
      expect(capabilities.supportsTools).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate configuration successfully with API key', () => {
      const result = agent.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation without API key', () => {
      delete process.env.INSIGHTLY_API_KEY;
      
      const result = agent.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('INSIGHTLY_API_KEY environment variable is required');
    });

    it('should provide warning for missing optional config', () => {
      delete process.env.INSIGHTLY_API_URL;
      
      const result = agent.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('INSIGHTLY_API_URL not set, using default NA region');
    });
  });

  describe('getInfo', () => {
    it('should return agent information', () => {
      const info = agent.getInfo();
      
      expect(info.name).toBe('CRMAgent');
      expect(info.version).toBe('1.0.0');
      expect(info.type).toBe('crm');
      expect(info.description).toContain('CRM operations');
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await agent.initialize();
      await expect(agent.cleanup()).resolves.not.toThrow();
      
      // Verify tools were cleaned up
      const mockContactTool = (agent as any).contactTool;
      expect(mockContactTool.cleanup).toHaveBeenCalled();
    });
  });

  describe('workflow integration', () => {
    it('should analyze query intent correctly', async () => {
      const testCases = [
        { input: 'find customer john', expectedIntent: 'customer_lookup' },
        { input: 'pipeline analysis', expectedIntent: 'pipeline_status' },
        { input: 'show opportunities', expectedIntent: 'opportunity_details' },
        { input: 'lead information', expectedIntent: 'lead_information' }
      ];

      for (const testCase of testCases) {
        const result = await agent.processMessage(
          testCase.input,
          `test-${testCase.expectedIntent}`
        );

        expect(result.metadata?.queryIntent).toBe(testCase.expectedIntent);
      }
    });
  });

  describe('error handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      // Mock tool error
      const { ContactManagerTool } = require('../../../../tools/crm');
      const mockExecute = ContactManagerTool.mock.results[0].value.execute;
      mockExecute.mockRejectedValueOnce(new Error('API connection failed'));

      const result = await agent.processMessage(
        'find customer test',
        'error-session'
      );

      expect(result.success).toBe(true); // Agent still returns success
      expect(result.message).toContain('encountered some issues');
      expect(result.metadata?.errors).toBeDefined();
    });

    it('should handle initialization errors', async () => {
      // Mock initialization error
      const { InsightlyApiTool } = require('../../../../tools/crm');
      InsightlyApiTool.mockImplementationOnce(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Init failed'))
      }));

      const newAgent = new CRMAgent();
      
      await expect(newAgent.initialize()).rejects.toThrow('Init failed');
    });
  });
});