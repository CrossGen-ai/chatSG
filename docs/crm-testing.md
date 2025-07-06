# CRM Testing Guide

This guide provides comprehensive testing strategies, procedures, and tools for the ChatSG CRM integration system.

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [API Testing](#api-testing)
- [Load Testing](#load-testing)
- [End-to-End Testing](#end-to-end-testing)
- [Test Data Management](#test-data-management)
- [Automated Testing](#automated-testing)
- [Manual Testing](#manual-testing)
- [Performance Testing](#performance-testing)
- [Security Testing](#security-testing)
- [Regression Testing](#regression-testing)

## Testing Strategy

### Testing Pyramid

```
        /\
       /  \
      / E2E \     End-to-End Tests (UI + API flows)
     /______\
    /        \
   / API/Int  \   Integration Tests (CRM tools + LLM)
  /__________\
 /            \
/ Unit Tests   \  Unit Tests (individual functions)
/______________\
```

### Test Types Coverage

| Test Type | Coverage | Purpose |
|-----------|----------|---------|
| Unit Tests | 80%+ | Individual functions, classes, components |
| Integration Tests | 70%+ | API interactions, tool orchestration |
| End-to-End Tests | 60%+ | Complete user workflows |
| Performance Tests | Key paths | Response times, throughput |
| Security Tests | All endpoints | Authentication, authorization, injection |

## Unit Testing

### Agent Components

#### Test Files Structure

```
backend/tests/unit/
├── agents/
│   └── crm/
│       ├── test-crm-agent.js
│       ├── test-workflow-helper.js
│       └── test-state-management.js
├── tools/
│   └── crm/
│       ├── test-insightly-api-tool.js
│       ├── test-contact-manager-tool.js
│       └── test-opportunity-tool.js
└── utils/
    ├── test-api-compliance.js
    └── test-data-validation.js
```

#### CRM Agent Unit Tests

```javascript
// backend/tests/unit/agents/crm/test-crm-agent.js
const assert = require('assert');
const { CRMAgent } = require('../../../../src/agents/individual/crm/agent');

describe('CRMAgent Unit Tests', function() {
  let agent;
  
  beforeEach(function() {
    // Mock LLM and tools
    const mockLLM = {
      invoke: async (prompt) => ({ content: 'mocked response' })
    };
    agent = new CRMAgent(mockLLM);
  });

  describe('Initialization', function() {
    it('should initialize with required dependencies', function() {
      assert(agent.llm, 'LLM should be initialized');
      assert(agent.tools, 'Tools should be initialized');
      assert(agent.workflow, 'Workflow should be initialized');
    });

    it('should validate environment variables', function() {
      // Test with missing INSIGHTLY_API_KEY
      delete process.env.INSIGHTLY_API_KEY;
      assert.throws(() => new CRMAgent(), /INSIGHTLY_API_KEY/);
    });
  });

  describe('Query Processing', function() {
    it('should process simple contact search', async function() {
      const state = {
        messages: [{ content: 'Find John Doe' }],
        sessionId: 'test-session'
      };
      
      const result = await agent.processMessage(state);
      assert(result.response, 'Should return response');
      assert(result.currentStage === 'complete', 'Should complete workflow');
    });

    it('should handle detailed query requests', async function() {
      const state = {
        messages: [{ content: 'Give me full details of Peter Kelly' }],
        sessionId: 'test-session'
      };
      
      const result = await agent.processMessage(state);
      assert(result.queryUnderstanding?.searchStrategy.needsDetailedView, 
             'Should detect detailed view requirement');
    });
  });

  describe('Error Handling', function() {
    it('should throw clear errors on LLM failure', async function() {
      agent.llm.invoke = async () => { throw new Error('LLM failed'); };
      
      const state = {
        messages: [{ content: 'test query' }],
        sessionId: 'test-session'
      };
      
      try {
        await agent.processMessage(state);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert(error.message.includes('CRM Agent LLM'), 
               'Should provide clear error context');
      }
    });
  });
});
```

#### Tool Unit Tests

```javascript
// backend/tests/unit/tools/crm/test-insightly-api-tool.js
const assert = require('assert');
const nock = require('nock');
const { InsightlyApiTool } = require('../../../../src/tools/crm/InsightlyApiTool');

describe('InsightlyApiTool Unit Tests', function() {
  let tool;
  const API_KEY = 'test-api-key';
  const API_URL = 'https://api.insightly.com/v3.1';

  beforeEach(function() {
    process.env.INSIGHTLY_API_KEY = API_KEY;
    process.env.INSIGHTLY_API_URL = API_URL;
    tool = new InsightlyApiTool();
  });

  afterEach(function() {
    nock.cleanAll();
  });

  describe('Authentication', function() {
    it('should use correct Basic auth format', function() {
      const expectedAuth = Buffer.from(API_KEY + ':').toString('base64');
      const actualAuth = tool.getAuthHeader();
      assert.strictEqual(actualAuth, `Basic ${expectedAuth}`);
    });
  });

  describe('Contact Search', function() {
    it('should search contacts with proper parameters', async function() {
      const mockResponse = {
        data: [
          { CONTACT_ID: 123, FIRST_NAME: 'John', LAST_NAME: 'Doe' }
        ]
      };

      nock(API_URL)
        .get('/Contacts/Search')
        .query({
          field_name: 'FIRST_NAME',
          field_value: 'John',
          top: 20
        })
        .reply(200, mockResponse.data);

      const result = await tool.searchContacts({
        searchField: 'FIRST_NAME',
        searchValue: 'John',
        maxResults: 20
      });

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].FIRST_NAME, 'John');
    });

    it('should handle API errors gracefully', async function() {
      nock(API_URL)
        .get('/Contacts/Search')
        .reply(401, { error: 'Unauthorized' });

      try {
        await tool.searchContacts({
          searchField: 'FIRST_NAME',
          searchValue: 'John'
        });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert(error.message.includes('Authentication failed'));
      }
    });
  });

  describe('Rate Limiting', function() {
    it('should respect rate limits', async function() {
      // Mock multiple rapid requests
      const requests = Array(15).fill().map((_, i) => 
        nock(API_URL)
          .get('/Contacts/Search')
          .query(true)
          .reply(200, [])
      );

      const startTime = Date.now();
      
      // Fire 15 requests rapidly
      const promises = Array(15).fill().map(() => 
        tool.searchContacts({
          searchField: 'FIRST_NAME',
          searchValue: 'Test'
        })
      );

      await Promise.all(promises);
      
      const elapsed = Date.now() - startTime;
      // Should take at least 2 seconds due to rate limiting (5 req per 2 sec)
      assert(elapsed >= 2000, 'Should enforce rate limiting');
    });
  });
});
```

## Integration Testing

### CRM Agent + Tools Integration

```javascript
// backend/tests/integration/test-crm-integration.js
const assert = require('assert');
const { CRMAgent } = require('../../src/agents/individual/crm/agent');
const { setupTestLLM } = require('../helpers/test-llm');

describe('CRM Integration Tests', function() {
  let agent;
  let mockLLM;

  this.timeout(30000); // Extended timeout for LLM calls

  beforeEach(async function() {
    mockLLM = await setupTestLLM();
    agent = new CRMAgent(mockLLM);
  });

  describe('Complete Workflow Tests', function() {
    it('should complete contact search workflow', async function() {
      const testMessage = 'Find contacts at Microsoft Corporation';
      
      const result = await agent.processMessage({
        messages: [{ content: testMessage }],
        sessionId: 'integration-test-1'
      });

      // Verify workflow completion
      assert.strictEqual(result.currentStage, 'complete');
      assert(result.response, 'Should have response');
      assert(result.toolsUsed.length > 0, 'Should have used tools');
      assert(result.retrievedData, 'Should have retrieved data');
    });

    it('should handle detailed query with multi-tool orchestration', async function() {
      const testMessage = 'Give me full details of the contact with ID 12345';
      
      const result = await agent.processMessage({
        messages: [{ content: testMessage }],
        sessionId: 'integration-test-2'
      });

      // Verify detailed workflow
      assert(result.queryUnderstanding?.searchStrategy.needsDetailedView);
      assert(result.toolsUsed.includes('InsightlyApiTool'));
      assert(result.toolsUsed.length >= 2, 'Should use multiple tools for details');
    });
  });

  describe('Error Recovery Tests', function() {
    it('should handle partial tool failures', async function() {
      // Mock one tool to fail
      const originalSearchContacts = agent.tools.InsightlyApiTool.searchContacts;
      agent.tools.InsightlyApiTool.searchContacts = async () => {
        throw new Error('API temporarily unavailable');
      };

      const result = await agent.processMessage({
        messages: [{ content: 'Find John Doe' }],
        sessionId: 'error-test-1'
      });

      // Should still provide meaningful response about the error
      assert(result.errors.length > 0, 'Should record errors');
      assert(result.response.includes('unable'), 'Should explain failure');

      // Restore original function
      agent.tools.InsightlyApiTool.searchContacts = originalSearchContacts;
    });
  });
});
```

## API Testing

### REST API Endpoints

```javascript
// backend/tests/api/test-crm-endpoints.js
const request = require('supertest');
const app = require('../../server');

describe('CRM API Endpoints', function() {
  describe('POST /api/chat (CRM routing)', function() {
    it('should route CRM queries to CRM agent', async function() {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Find customer John Smith',
          sessionId: 'api-test-session'
        })
        .expect(200);

      assert(response.body.agent === 'CRMAgent');
      assert(response.body.response);
    });

    it('should handle slash command routing', async function() {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: '/crm show pipeline status',
          sessionId: 'slash-test-session'
        })
        .expect(200);

      assert(response.body.agent === 'CRMAgent');
      assert(response.body.metadata?.commandName === 'crm');
    });
  });

  describe('GET /api/health/crm', function() {
    it('should return CRM agent health status', async function() {
      const response = await request(app)
        .get('/api/health/crm')
        .expect(200);

      assert(response.body.status);
      assert(response.body.tools);
      assert(response.body.apiConnectivity);
    });
  });
});
```

### Streaming API Tests

```javascript
// backend/tests/api/test-crm-streaming.js
const EventSource = require('eventsource');

describe('CRM Streaming API', function() {
  it('should stream CRM responses via SSE', function(done) {
    this.timeout(15000);
    
    const url = 'http://localhost:3000/api/chat/stream';
    const payload = {
      message: '/crm find contacts at Google',
      sessionId: 'stream-test-session'
    };

    // Start SSE connection
    const eventSource = new EventSource(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'test-token'
      }
    });

    let responseChunks = [];
    let isComplete = false;

    eventSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      
      if (data.type === 'content') {
        responseChunks.push(data.content);
      } else if (data.type === 'done') {
        isComplete = true;
        eventSource.close();
        
        // Verify streaming response
        const fullResponse = responseChunks.join('');
        assert(fullResponse.length > 0, 'Should receive content');
        assert(isComplete, 'Should complete stream');
        done();
      } else if (data.type === 'error') {
        done(new Error(data.message));
      }
    };

    eventSource.onerror = function(error) {
      done(error);
    };

    // Send initial request
    setTimeout(() => {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token'
        },
        body: JSON.stringify(payload)
      });
    }, 100);
  });
});
```

## Load Testing

### Contact Search Load Test

```javascript
// backend/tests/load/test-crm-load.js
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const axios = require('axios');

if (isMainThread) {
  // Main thread - orchestrate load test
  async function runLoadTest() {
    const numWorkers = 10;
    const requestsPerWorker = 50;
    const workers = [];
    
    console.log(`Starting load test: ${numWorkers} workers, ${requestsPerWorker} requests each`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(__filename, {
        workerData: { workerId: i, requestsPerWorker }
      });
      
      workers.push(new Promise((resolve) => {
        worker.on('message', resolve);
      }));
    }
    
    const results = await Promise.all(workers);
    const endTime = Date.now();
    
    // Aggregate results
    let totalRequests = 0;
    let totalSuccesses = 0;
    let totalErrors = 0;
    let totalResponseTime = 0;
    
    results.forEach(result => {
      totalRequests += result.requests;
      totalSuccesses += result.successes;
      totalErrors += result.errors;
      totalResponseTime += result.avgResponseTime * result.requests;
    });
    
    const avgResponseTime = totalResponseTime / totalRequests;
    const throughput = totalRequests / ((endTime - startTime) / 1000);
    
    console.log('\n=== Load Test Results ===');
    console.log(`Total Requests: ${totalRequests}`);
    console.log(`Successes: ${totalSuccesses} (${(totalSuccesses/totalRequests*100).toFixed(1)}%)`);
    console.log(`Errors: ${totalErrors} (${(totalErrors/totalRequests*100).toFixed(1)}%)`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`Throughput: ${throughput.toFixed(1)} requests/second`);
    
    // Performance assertions
    assert(avgResponseTime < 5000, 'Average response time should be under 5 seconds');
    assert(totalSuccesses / totalRequests > 0.95, 'Success rate should be above 95%');
    assert(throughput > 1, 'Should handle at least 1 request per second');
  }
  
  runLoadTest().catch(console.error);
  
} else {
  // Worker thread - execute requests
  async function workerTest() {
    const { workerId, requestsPerWorker } = workerData;
    
    let successes = 0;
    let errors = 0;
    let totalResponseTime = 0;
    
    for (let i = 0; i < requestsPerWorker; i++) {
      const startTime = Date.now();
      
      try {
        await axios.post('http://localhost:3000/api/chat', {
          message: `Find contact test-${workerId}-${i}`,
          sessionId: `load-test-${workerId}-${i}`
        }, {
          timeout: 10000
        });
        
        successes++;
        totalResponseTime += Date.now() - startTime;
        
      } catch (error) {
        errors++;
      }
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    parentPort.postMessage({
      workerId,
      requests: requestsPerWorker,
      successes,
      errors,
      avgResponseTime: totalResponseTime / requestsPerWorker
    });
  }
  
  workerTest();
}
```

## End-to-End Testing

### Browser Automation Tests

```javascript
// backend/tests/e2e/test-crm-ui.js
const puppeteer = require('puppeteer');
const assert = require('assert');

describe('CRM E2E Tests', function() {
  let browser;
  let page;
  
  this.timeout(60000);

  beforeEach(async function() {
    browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI
      devtools: false 
    });
    page = await browser.newPage();
    await page.goto('http://localhost:5173');
  });

  afterEach(async function() {
    if (browser) {
      await browser.close();
    }
  });

  describe('CRM Chat Interface', function() {
    it('should handle CRM query end-to-end', async function() {
      // Wait for chat interface to load
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Type CRM query
      const query = 'Find contacts at Microsoft';
      await page.type('[data-testid="chat-input"]', query);
      
      // Send message
      await page.click('[data-testid="send-button"]');
      
      // Wait for response
      await page.waitForSelector('[data-testid="message-bubble"]', { 
        timeout: 15000 
      });
      
      // Verify response contains CRM data
      const messages = await page.$$eval('[data-testid="message-bubble"]', 
        elements => elements.map(el => el.textContent)
      );
      
      const responseMessage = messages[messages.length - 1];
      assert(responseMessage.includes('contact') || responseMessage.includes('Microsoft'),
             'Response should contain relevant CRM information');
    });

    it('should handle slash command routing', async function() {
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Type slash command
      await page.type('[data-testid="chat-input"]', '/crm show pipeline status');
      await page.click('[data-testid="send-button"]');
      
      // Wait for response
      await page.waitForSelector('[data-testid="message-bubble"]', { 
        timeout: 15000 
      });
      
      // Verify agent indicator shows CRM
      const agentIndicator = await page.$eval('[data-testid="agent-indicator"]', 
        el => el.textContent
      );
      
      assert(agentIndicator.includes('CRM') || agentIndicator.includes('⚙️'),
             'Should show CRM agent indicator');
    });
  });

  describe('Streaming Response', function() {
    it('should display streaming CRM responses', async function() {
      await page.waitForSelector('[data-testid="chat-input"]');
      
      // Type query that generates substantial response
      await page.type('[data-testid="chat-input"]', 
                      'Give me detailed analysis of our sales pipeline');
      await page.click('[data-testid="send-button"]');
      
      // Monitor for streaming indicators
      let streamingDetected = false;
      
      // Wait for streaming to start
      try {
        await page.waitForSelector('[data-testid="typing-indicator"]', { 
          timeout: 5000 
        });
        streamingDetected = true;
      } catch (e) {
        // May appear briefly, so check message content growth
      }
      
      // Wait for final response
      await page.waitForSelector('[data-testid="message-bubble"]', { 
        timeout: 20000 
      });
      
      const finalResponse = await page.$eval(
        '[data-testid="message-bubble"]:last-child',
        el => el.textContent
      );
      
      assert(finalResponse.length > 100, 
             'Should receive substantial CRM analysis');
    });
  });
});
```

## Test Data Management

### Test Data Setup

```javascript
// backend/tests/fixtures/crm-test-data.js
module.exports = {
  contacts: [
    {
      CONTACT_ID: 12345,
      FIRST_NAME: 'John',
      LAST_NAME: 'Doe',
      EMAIL_ADDRESS: 'john.doe@example.com',
      ORGANISATION_NAME: 'Test Corp',
      PHONE: '+1-555-0123'
    },
    {
      CONTACT_ID: 12346,
      FIRST_NAME: 'Jane',
      LAST_NAME: 'Smith',
      EMAIL_ADDRESS: 'jane.smith@microsoft.com',
      ORGANISATION_NAME: 'Microsoft Corporation',
      PHONE: '+1-555-0124'
    }
  ],
  
  opportunities: [
    {
      OPPORTUNITY_ID: 67890,
      OPPORTUNITY_NAME: 'Enterprise Software Deal',
      OPPORTUNITY_VALUE: 50000,
      PROBABILITY: 75,
      STAGE: 'Proposal',
      CONTACT_ID: 12345
    }
  ],
  
  searchQueries: [
    {
      query: 'Find John Doe',
      expectedContactId: 12345,
      expectedFields: ['FIRST_NAME', 'LAST_NAME']
    },
    {
      query: 'Show contacts at Microsoft',
      expectedOrgName: 'Microsoft Corporation',
      expectedMinResults: 1
    }
  ]
};
```

### Mock Data Server

```javascript
// backend/tests/helpers/mock-insightly-server.js
const express = require('express');
const testData = require('../fixtures/crm-test-data');

class MockInsightlyServer {
  constructor(port = 3001) {
    this.app = express();
    this.server = null;
    this.port = port;
    this.setupRoutes();
  }

  setupRoutes() {
    this.app.use(express.json());
    
    // Mock authentication
    this.app.use((req, res, next) => {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
    });

    // Mock contact search
    this.app.get('/Contacts/Search', (req, res) => {
      const { field_name, field_value } = req.query;
      
      let results = testData.contacts;
      
      if (field_name && field_value) {
        results = results.filter(contact => 
          contact[field_name]?.toLowerCase().includes(field_value.toLowerCase())
        );
      }
      
      res.json(results);
    });

    // Mock contact details
    this.app.get('/Contacts/:id', (req, res) => {
      const contact = testData.contacts.find(c => 
        c.CONTACT_ID === parseInt(req.params.id)
      );
      
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      
      res.json(contact);
    });

    // Mock opportunities
    this.app.get('/Opportunities', (req, res) => {
      res.json(testData.opportunities);
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`Mock Insightly server running on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(resolve);
      });
    }
  }
}

module.exports = MockInsightlyServer;
```

## Automated Testing

### Test Runner Configuration

```javascript
// backend/tests/test-runner.js
const Mocha = require('mocha');
const path = require('path');

class CRMTestRunner {
  constructor() {
    this.mocha = new Mocha({
      timeout: 30000,
      reporter: 'spec',
      recursive: true
    });
  }

  addTestSuite(suiteName) {
    const suiteMap = {
      unit: 'tests/unit/**/*.js',
      integration: 'tests/integration/**/*.js',
      api: 'tests/api/**/*.js',
      e2e: 'tests/e2e/**/*.js',
      load: 'tests/load/**/*.js'
    };

    const pattern = suiteMap[suiteName];
    if (!pattern) {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }

    const glob = require('glob');
    const files = glob.sync(pattern, { cwd: __dirname });
    
    files.forEach(file => {
      this.mocha.addFile(path.join(__dirname, file));
    });
  }

  async run() {
    return new Promise((resolve, reject) => {
      this.mocha.run((failures) => {
        if (failures) {
          reject(new Error(`${failures} test(s) failed`));
        } else {
          resolve();
        }
      });
    });
  }
}

// CLI interface
if (require.main === module) {
  const runner = new CRMTestRunner();
  const suite = process.argv[2] || 'unit';
  
  console.log(`Running ${suite} tests...`);
  
  runner.addTestSuite(suite);
  runner.run()
    .then(() => {
      console.log('✅ All tests passed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error.message);
      process.exit(1);
    });
}

module.exports = CRMTestRunner;
```

### CI/CD Pipeline Tests

```yaml
# .github/workflows/crm-tests.yml
name: CRM Tests

on:
  push:
    paths:
      - 'backend/src/agents/individual/crm/**'
      - 'backend/src/tools/crm/**'
      - 'backend/tests/**'
  pull_request:
    paths:
      - 'backend/src/agents/individual/crm/**'
      - 'backend/src/tools/crm/**'

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run unit tests
        run: |
          cd backend
          npm run test:crm:unit
        env:
          INSIGHTLY_API_KEY: test-key
          OPENAI_API_KEY: test-key

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Start mock services
        run: |
          cd backend
          npm run start:test-services &
          sleep 5
      
      - name: Run integration tests
        run: |
          cd backend
          npm run test:crm:integration
        env:
          INSIGHTLY_API_KEY: ${{ secrets.TEST_INSIGHTLY_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
      
      - name: Stop services
        run: |
          cd backend
          npm run stop:test-services

  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd backend
          npm ci
      
      - name: Run performance tests
        run: |
          cd backend
          npm run test:crm:performance
        env:
          INSIGHTLY_API_KEY: ${{ secrets.TEST_INSIGHTLY_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.TEST_OPENAI_API_KEY }}
```

## Manual Testing

### Test Scenarios Checklist

#### Basic Functionality Tests

- [ ] **Contact Search**
  - [ ] Search by first name
  - [ ] Search by last name
  - [ ] Search by email
  - [ ] Search by company name
  - [ ] Empty search results handling

- [ ] **Detailed Contact View**
  - [ ] Request full contact details
  - [ ] Contact with opportunities
  - [ ] Contact without opportunities
  - [ ] Non-existent contact handling

- [ ] **Pipeline Analysis**
  - [ ] Pipeline status overview
  - [ ] Stage-specific analysis
  - [ ] Value calculations
  - [ ] Probability assessments

#### Slash Command Tests

- [ ] **Routing Verification**
  - [ ] `/crm` routes to CRM Agent
  - [ ] `/customer` routes to CRM Agent
  - [ ] `/sales` routes to CRM Agent
  - [ ] Invalid slash commands handled gracefully

#### Error Handling Tests

- [ ] **API Failures**
  - [ ] Invalid API key
  - [ ] Network connectivity issues
  - [ ] Rate limiting scenarios
  - [ ] Malformed API responses

- [ ] **LLM Failures**
  - [ ] LLM API unavailable
  - [ ] LLM timeout scenarios
  - [ ] Invalid LLM responses

#### Performance Tests

- [ ] **Response Times**
  - [ ] Simple queries < 2 seconds
  - [ ] Complex queries < 5 seconds
  - [ ] Detailed views < 3 seconds
  - [ ] Error responses < 1 second

- [ ] **Concurrent Usage**
  - [ ] Multiple users simultaneously
  - [ ] Multiple queries per user
  - [ ] Resource cleanup verification

### Manual Test Scripts

```bash
#!/bin/bash
# backend/tests/manual/test-crm-scenarios.sh

echo "=== CRM Manual Test Suite ==="

# Test 1: Basic contact search
echo "Test 1: Basic contact search"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find contact John Doe", "sessionId": "manual-test-1"}' \
  | jq '.response'

echo -e "\n"

# Test 2: Detailed contact query
echo "Test 2: Detailed contact query"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Give me full details of Peter Kelly", "sessionId": "manual-test-2"}' \
  | jq '.response'

echo -e "\n"

# Test 3: Slash command routing
echo "Test 3: Slash command routing"
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "/crm show pipeline status", "sessionId": "manual-test-3"}' \
  | jq '.agent, .response'

echo -e "\n"

# Test 4: Error handling
echo "Test 4: Error handling (invalid API key)"
INSIGHTLY_API_KEY=invalid-key curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Find any contact", "sessionId": "manual-test-4"}' \
  | jq '.response'

echo -e "\n=== Tests Complete ==="
```

## Performance Testing

### Benchmarking Scripts

```javascript
// backend/tests/performance/benchmark-crm.js
const { performance } = require('perf_hooks');
const axios = require('axios');

class CRMBenchmark {
  constructor() {
    this.results = {
      contactSearch: [],
      detailedQuery: [],
      pipelineAnalysis: [],
      slashCommands: []
    };
  }

  async benchmarkOperation(name, operation, iterations = 10) {
    console.log(`Benchmarking ${name} (${iterations} iterations)...`);
    
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        await operation(i);
        const end = performance.now();
        times.push(end - start);
      } catch (error) {
        console.error(`Error in iteration ${i}:`, error.message);
        times.push(null);
      }
      
      // Brief pause between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const validTimes = times.filter(t => t !== null);
    const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    const min = Math.min(...validTimes);
    const max = Math.max(...validTimes);
    const successRate = (validTimes.length / times.length) * 100;
    
    this.results[name] = { avg, min, max, successRate, times: validTimes };
    
    console.log(`  Average: ${avg.toFixed(0)}ms`);
    console.log(`  Min: ${min.toFixed(0)}ms`);
    console.log(`  Max: ${max.toFixed(0)}ms`);
    console.log(`  Success Rate: ${successRate.toFixed(1)}%`);
    console.log('');
  }

  async runBenchmarks() {
    console.log('Starting CRM Performance Benchmarks...\n');
    
    // Benchmark contact search
    await this.benchmarkOperation('contactSearch', async (i) => {
      await axios.post('http://localhost:3000/api/chat', {
        message: `Find contact test-${i}`,
        sessionId: `bench-search-${i}`
      });
    });
    
    // Benchmark detailed queries
    await this.benchmarkOperation('detailedQuery', async (i) => {
      await axios.post('http://localhost:3000/api/chat', {
        message: `Give me full details of contact ${12345 + i}`,
        sessionId: `bench-detail-${i}`
      });
    });
    
    // Benchmark pipeline analysis
    await this.benchmarkOperation('pipelineAnalysis', async (i) => {
      await axios.post('http://localhost:3000/api/chat', {
        message: 'Show me pipeline status for this quarter',
        sessionId: `bench-pipeline-${i}`
      });
    });
    
    // Benchmark slash commands
    await this.benchmarkOperation('slashCommands', async (i) => {
      await axios.post('http://localhost:3000/api/chat', {
        message: `/crm search for opportunity ${i}`,
        sessionId: `bench-slash-${i}`
      });
    });
    
    this.generateReport();
  }

  generateReport() {
    console.log('=== Performance Benchmark Report ===\n');
    
    Object.entries(this.results).forEach(([operation, metrics]) => {
      console.log(`${operation.toUpperCase()}:`);
      console.log(`  Average Response Time: ${metrics.avg.toFixed(0)}ms`);
      console.log(`  Range: ${metrics.min.toFixed(0)}ms - ${metrics.max.toFixed(0)}ms`);
      console.log(`  Success Rate: ${metrics.successRate.toFixed(1)}%`);
      console.log('');
    });
    
    // Performance assertions
    const assertions = [
      { metric: 'contactSearch', threshold: 3000, description: 'Contact search under 3s' },
      { metric: 'detailedQuery', threshold: 5000, description: 'Detailed query under 5s' },
      { metric: 'pipelineAnalysis', threshold: 8000, description: 'Pipeline analysis under 8s' },
      { metric: 'slashCommands', threshold: 3000, description: 'Slash commands under 3s' }
    ];
    
    console.log('=== Performance Assertions ===\n');
    
    let allPassed = true;
    assertions.forEach(({ metric, threshold, description }) => {
      const avg = this.results[metric]?.avg || Infinity;
      const passed = avg <= threshold;
      
      console.log(`${passed ? '✅' : '❌'} ${description}: ${avg.toFixed(0)}ms (limit: ${threshold}ms)`);
      
      if (!passed) allPassed = false;
    });
    
    console.log(`\n${allPassed ? '✅ All performance tests passed' : '❌ Some performance tests failed'}`);
    
    return allPassed;
  }
}

// Run benchmarks if called directly
if (require.main === module) {
  const benchmark = new CRMBenchmark();
  benchmark.runBenchmarks()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Benchmark failed:', error);
      process.exit(1);
    });
}

module.exports = CRMBenchmark;
```

## Security Testing

### Security Test Suite

```javascript
// backend/tests/security/test-crm-security.js
const request = require('supertest');
const app = require('../../server');

describe('CRM Security Tests', function() {
  describe('Input Validation', function() {
    it('should reject malicious SQL-like input', async function() {
      const maliciousInput = "'; DROP TABLE contacts; --";
      
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: `Find contact ${maliciousInput}`,
          sessionId: 'security-test-1'
        })
        .expect(200);
      
      // Should sanitize input and not execute SQL
      assert(!response.body.response.includes('DROP TABLE'));
      assert(!response.body.error?.includes('SQL'));
    });

    it('should sanitize XSS attempts', async function() {
      const xssInput = '<script>alert("xss")</script>';
      
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: `Find contact ${xssInput}`,
          sessionId: 'security-test-2'
        })
        .expect(200);
      
      // Should sanitize script tags
      assert(!response.body.response.includes('<script>'));
    });
  });

  describe('Authentication', function() {
    it('should require valid API credentials', async function() {
      // Test with invalid/missing API key
      const originalKey = process.env.INSIGHTLY_API_KEY;
      delete process.env.INSIGHTLY_API_KEY;
      
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Find any contact',
          sessionId: 'auth-test-1'
        })
        .expect(200);
      
      // Should indicate authentication issue
      assert(response.body.response.includes('authentication') || 
             response.body.response.includes('configuration'));
      
      // Restore API key
      process.env.INSIGHTLY_API_KEY = originalKey;
    });
  });

  describe('Rate Limiting', function() {
    it('should enforce rate limits', async function() {
      this.timeout(30000);
      
      const requests = [];
      const sessionId = 'rate-limit-test';
      
      // Send rapid requests
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/chat')
            .send({
              message: `Test request ${i}`,
              sessionId: `${sessionId}-${i}`
            })
        );
      }
      
      const responses = await Promise.allSettled(requests);
      
      // Some requests should be rate limited
      const errors = responses.filter(r => r.status === 'rejected' || 
                                         r.value?.status >= 400);
      
      assert(errors.length > 0, 'Should enforce rate limiting');
    });
  });

  describe('Data Exposure', function() {
    it('should not expose sensitive API keys in responses', async function() {
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: 'Show me system configuration',
          sessionId: 'exposure-test-1'
        })
        .expect(200);
      
      const responseText = JSON.stringify(response.body);
      
      // Should not contain API keys
      assert(!responseText.includes(process.env.INSIGHTLY_API_KEY || ''));
      assert(!responseText.includes(process.env.OPENAI_API_KEY || ''));
    });
  });
});
```

## Regression Testing

### Regression Test Suite

```javascript
// backend/tests/regression/test-crm-regression.js
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CRMRegressionTester {
  constructor() {
    this.baselineDir = path.join(__dirname, 'baselines');
    this.currentDir = path.join(__dirname, 'current');
  }

  async ensureDirectories() {
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.currentDir, { recursive: true });
  }

  async captureBaseline(testName, result) {
    await this.ensureDirectories();
    
    const baselinePath = path.join(this.baselineDir, `${testName}.json`);
    const normalizedResult = this.normalizeResult(result);
    
    await fs.writeFile(baselinePath, JSON.stringify(normalizedResult, null, 2));
    console.log(`Baseline captured for ${testName}`);
  }

  async compareWithBaseline(testName, currentResult) {
    await this.ensureDirectories();
    
    const baselinePath = path.join(this.baselineDir, `${testName}.json`);
    const currentPath = path.join(this.currentDir, `${testName}.json`);
    
    try {
      const baselineData = await fs.readFile(baselinePath, 'utf8');
      const baseline = JSON.parse(baselineData);
      
      const normalizedCurrent = this.normalizeResult(currentResult);
      await fs.writeFile(currentPath, JSON.stringify(normalizedCurrent, null, 2));
      
      return this.compareResults(baseline, normalizedCurrent, testName);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`No baseline found for ${testName}, capturing current as baseline`);
        await this.captureBaseline(testName, currentResult);
        return { passed: true, message: 'Baseline created' };
      }
      throw error;
    }
  }

  normalizeResult(result) {
    // Remove timestamp-dependent fields
    const normalized = JSON.parse(JSON.stringify(result));
    
    if (normalized.processingTime) {
      delete normalized.processingTime;
    }
    
    if (normalized.metadata?.timestamp) {
      delete normalized.metadata.timestamp;
    }
    
    // Normalize dynamic IDs
    if (normalized.sessionId) {
      normalized.sessionId = 'NORMALIZED_SESSION_ID';
    }
    
    return normalized;
  }

  compareResults(baseline, current, testName) {
    const differences = this.findDifferences(baseline, current);
    
    if (differences.length === 0) {
      return { passed: true, message: 'No differences found' };
    }
    
    // Some differences might be acceptable
    const significantDifferences = differences.filter(diff => 
      !this.isAcceptableDifference(diff)
    );
    
    if (significantDifferences.length === 0) {
      return { passed: true, message: 'Only acceptable differences found' };
    }
    
    return {
      passed: false,
      message: `Significant differences found in ${testName}`,
      differences: significantDifferences
    };
  }

  findDifferences(obj1, obj2, path = '') {
    const differences = [];
    
    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
    
    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;
      
      if (!(key in obj1)) {
        differences.push({ type: 'added', path: newPath, value: obj2[key] });
      } else if (!(key in obj2)) {
        differences.push({ type: 'removed', path: newPath, value: obj1[key] });
      } else if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
        differences.push(...this.findDifferences(obj1[key], obj2[key], newPath));
      } else if (obj1[key] !== obj2[key]) {
        differences.push({
          type: 'changed',
          path: newPath,
          oldValue: obj1[key],
          newValue: obj2[key]
        });
      }
    }
    
    return differences;
  }

  isAcceptableDifference(diff) {
    // Define acceptable difference patterns
    const acceptablePatterns = [
      /\.timestamp$/,
      /\.processingTime$/,
      /\.requestId$/,
      /\.sessionId$/
    ];
    
    return acceptablePatterns.some(pattern => pattern.test(diff.path));
  }
}

// Test runner
describe('CRM Regression Tests', function() {
  const tester = new CRMRegressionTester();
  
  const testCases = [
    {
      name: 'basic_contact_search',
      input: 'Find contact John Doe'
    },
    {
      name: 'detailed_contact_query',
      input: 'Give me full details of Peter Kelly'
    },
    {
      name: 'pipeline_analysis',
      input: 'Show me pipeline status for Q4'
    },
    {
      name: 'slash_command_routing',
      input: '/crm search for opportunities'
    }
  ];

  testCases.forEach(({ name, input }) => {
    it(`should maintain consistent behavior for ${name}`, async function() {
      this.timeout(15000);
      
      // Execute test case
      const response = await request(app)
        .post('/api/chat')
        .send({
          message: input,
          sessionId: `regression-${name}`
        })
        .expect(200);
      
      // Compare with baseline
      const comparison = await tester.compareWithBaseline(name, response.body);
      
      if (!comparison.passed) {
        console.log('Regression detected:', comparison.message);
        console.log('Differences:', comparison.differences);
      }
      
      assert(comparison.passed, comparison.message);
    });
  });
});

module.exports = CRMRegressionTester;
```

## Test Commands Reference

### NPM Scripts

Add these to your `backend/package.json`:

```json
{
  "scripts": {
    "test:crm": "node tests/test-runner.js unit",
    "test:crm:unit": "node tests/test-runner.js unit",
    "test:crm:integration": "node tests/test-runner.js integration",
    "test:crm:api": "node tests/test-runner.js api",
    "test:crm:e2e": "node tests/test-runner.js e2e",
    "test:crm:load": "node tests/test-runner.js load",
    "test:crm:performance": "node tests/performance/benchmark-crm.js",
    "test:crm:security": "mocha tests/security/test-crm-security.js",
    "test:crm:regression": "mocha tests/regression/test-crm-regression.js",
    "test:crm:all": "npm run test:crm:unit && npm run test:crm:integration && npm run test:crm:api",
    "test:crm:ci": "npm run test:crm:all && npm run test:crm:security",
    "start:test-services": "node tests/helpers/start-test-services.js",
    "stop:test-services": "node tests/helpers/stop-test-services.js"
  }
}
```

### Command Usage

```bash
# Run all CRM tests
npm run test:crm:all

# Run specific test types
npm run test:crm:unit
npm run test:crm:integration
npm run test:crm:performance

# Run security tests
npm run test:crm:security

# Run regression tests
npm run test:crm:regression

# CI/CD pipeline tests
npm run test:crm:ci
```

This comprehensive testing guide ensures thorough validation of the CRM integration system at all levels, from individual components to complete user workflows. Adjust test configurations and thresholds based on your specific requirements and performance targets.