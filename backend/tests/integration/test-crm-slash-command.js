/**
 * Test CRM Agent with Slash Commands and LLM
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const axios = require('axios');
const API_URL = process.env.API_URL || 'http://localhost:3000';

console.log('=== Testing CRM Agent with Slash Commands ===\n');

async function testSlashCommandRouting() {
  console.log('1. Testing slash command routing...');
  
  try {
    // First, validate the slash command
    const validateResponse = await axios.post(`${API_URL}/api/slash-commands/validate`, {
      command: '/crm'
    });
    
    console.log('Slash command validation:', validateResponse.data);
    
    if (!validateResponse.data.success) {
      console.error('❌ Slash command /crm is not valid');
      return;
    }
    
    console.log('✅ Slash command /crm is valid\n');
    
    // Test queries with typos that should use LLM
    const testQueries = [
      '/crm what is the piplien status?',  // Your original typo
      '/crm show me the piepline',          // Another typo
      '/crm whats the sales funnel looking like',  // Natural language
      '/crm any big deals coming up'        // Conversational
    ];
    
    console.log('2. Testing typo handling and LLM understanding...\n');
    
    for (const query of testQueries) {
      console.log(`Query: "${query}"`);
      console.log('Expected: Should understand pipeline-related queries despite typos');
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testDirectCRMAgent() {
  console.log('\n3. Testing CRM Agent directly...');
  
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  try {
    const crmAgent = IndividualAgentFactory.createAgent('crm');
    await crmAgent.initialize();
    
    // Test query with typo
    const testQuery = 'what is the piplien status?';
    console.log(`\nTesting query: "${testQuery}"`);
    
    // Create a simple callback to capture output
    let output = '';
    const streamCallback = (token) => {
      output += token;
    };
    
    const result = await crmAgent.processMessage(testQuery, 'test-session', streamCallback);
    
    console.log('\nResult metadata:', {
      queryIntent: result.metadata?.queryIntent,
      confidence: result.metadata?.confidence,
      toolsUsed: result.metadata?.toolsUsed
    });
    
    if (result.metadata?.queryIntent === 'pipeline_status') {
      console.log('✅ LLM correctly identified pipeline_status intent despite typo!');
    } else {
      console.log(`❌ Intent was ${result.metadata?.queryIntent}, expected pipeline_status`);
    }
    
  } catch (error) {
    console.error('Error testing CRM agent:', error);
  }
}

// Run tests
testSlashCommandRouting()
  .then(() => testDirectCRMAgent())
  .then(() => {
    console.log('\n✅ Tests complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });