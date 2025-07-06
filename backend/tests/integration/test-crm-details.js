/**
 * Test CRM Agent - Full Details Query
 * Tests the ability to fetch detailed information about a specific contact
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_SESSION_ID = `test-crm-details-${Date.now()}`;
const TEST_USER_ID = 'test-user';

async function testCRMDetails() {
  console.log('🧪 Testing CRM Full Details Query...\n');

  const testCases = [
    {
      name: 'Full details with exact name',
      message: '/crm give full details of peter kelly',
      expectedBehavior: 'Should return detailed info for Peter Kelly only'
    },
    {
      name: 'Details request variation',
      message: '/crm show me detailed information about peter kelly',
      expectedBehavior: 'Should understand "detailed information" means full details'
    },
    {
      name: 'Complete info request',
      message: '/crm I need complete info on peter kelly',
      expectedBehavior: 'Should understand "complete info" means full details'
    },
    {
      name: 'Regular search (no details)',
      message: '/crm find peter kelly',
      expectedBehavior: 'Should return basic search results'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log(`💬 Query: "${testCase.message}"`);
    console.log(`✅ Expected: ${testCase.expectedBehavior}`);
    
    try {
      // Create a unique session for each test (must match pattern)
      const sessionId = `test-details-${Date.now()}`;
      
      const response = await axios.post(`${BASE_URL}/api/chat`, {
        message: testCase.message,
        sessionId: sessionId,
        userId: TEST_USER_ID,
        slashCommand: {
          command: 'crm',
          agentType: 'crm'
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'test-token' // Will be bypassed in dev mode
        },
        timeout: 30000  // 30 second timeout
      });

      const { response: agentResponse, agent, metadata } = response.data;
      
      console.log(`\n🤖 Agent: ${agent || 'CRMAgent'}`);
      console.log('📝 Response Preview:');
      
      // Handle case where response might be undefined
      if (!agentResponse) {
        console.log('❌ No response received');
        continue;
      }
      
      // Check if it's a detailed view or regular search
      const isDetailedView = agentResponse.includes('opportunities') || 
                            agentResponse.includes('Lead Score:') ||
                            agentResponse.includes('Total Value:');
      
      if (testCase.message.includes('full details') || 
          testCase.message.includes('detailed information') || 
          testCase.message.includes('complete info')) {
        if (isDetailedView) {
          console.log('✅ Correctly returned detailed view');
        } else {
          console.log('❌ Expected detailed view but got regular search');
        }
      } else {
        if (!isDetailedView) {
          console.log('✅ Correctly returned regular search');
        } else {
          console.log('❌ Expected regular search but got detailed view');
        }
      }
      
      // Show a snippet of the response
      const lines = agentResponse.split('\n').slice(0, 10);
      lines.forEach(line => console.log(`   ${line}`));
      if (agentResponse.split('\n').length > 10) {
        console.log('   ... (truncated)');
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error.response?.data || error.message);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n\n📊 Test Summary:');
  console.log('- The CRM agent should recognize requests for "full details", "detailed information", or "complete info"');
  console.log('- When details are requested, it should use multiple tools to gather comprehensive information');
  console.log('- Regular searches should return a simple list');
}

// Run the test
testCRMDetails().catch(console.error);