/**
 * Jest Setup for Analytical Agent Isolated Testing
 * 
 * This file sets up mocks for shared services and external dependencies
 * to enable isolated testing of the analytical agent.
 */

// Mock shared services
jest.mock('../../../shared/tools/WebSearchTool', () => ({
  WebSearchTool: jest.fn().mockImplementation(() => ({
    search: jest.fn().mockResolvedValue([
      { title: 'Mock Result', url: 'https://mock.com', snippet: 'Mock snippet' }
    ]),
    isHealthy: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockReturnValue({ requestCount: 0, errorCount: 0 })
  }))
}));

jest.mock('../../../shared/tools/DatabaseTool', () => ({
  DatabaseTool: jest.fn().mockImplementation(() => ({
    query: jest.fn().mockResolvedValue([]),
    insert: jest.fn().mockResolvedValue({ id: 'mock-id' }),
    update: jest.fn().mockResolvedValue({ affectedRows: 1 }),
    delete: jest.fn().mockResolvedValue({ affectedRows: 1 }),
    isHealthy: jest.fn().mockReturnValue(true),
    getStats: jest.fn().mockReturnValue({ queryCount: 0, errorCount: 0 })
  }))
}));

jest.mock('../../../shared/memory/EmbeddingService', () => ({
  EmbeddingService: {
    getInstance: jest.fn().mockReturnValue({
      generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
      generateEmbeddings: jest.fn().mockResolvedValue([[0.1, 0.2, 0.3]]),
      isHealthy: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockReturnValue({ requestCount: 0, errorCount: 0 })
    })
  }
}));

// Mock StateManager
jest.mock('../../../state/StateManager', () => ({
  StateManager: {
    getInstance: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      has: jest.fn().mockResolvedValue(false),
      clear: jest.fn().mockResolvedValue(true),
      getAll: jest.fn().mockResolvedValue({}),
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    })
  }
}));

// Mock ToolRegistry
jest.mock('../../../tools/ToolRegistry', () => ({
  ToolRegistry: {
    getInstance: jest.fn().mockReturnValue({
      registerTool: jest.fn(),
      getTool: jest.fn().mockReturnValue(null),
      getAvailableTools: jest.fn().mockReturnValue([]),
      hasRole: jest.fn().mockReturnValue(false)
    })
  }
}));

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console output during tests unless explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
  
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Restore console methods
  if (!process.env.JEST_VERBOSE) {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
});

// Global test utilities
global.mockAnalyticalData = {
  numbers: [1, 2, 3, 4, 5, 10, 15, 20],
  text: "The temperature is 25 degrees and the humidity is 60%",
  complexData: {
    sales: [100, 150, 200, 175, 225],
    dates: ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05'],
    categories: ['A', 'B', 'A', 'C', 'B']
  }
};

global.mockLLMResponse = {
  success: true,
  message: "Mock LLM response for testing",
  data: {
    analysis: "Mock analysis result",
    confidence: 0.85,
    suggestions: ["Mock suggestion 1", "Mock suggestion 2"]
  }
};

// Test environment configuration
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

console.log('✓ Analytical Agent test environment initialized with mocks'); 