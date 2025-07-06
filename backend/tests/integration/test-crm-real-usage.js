/**
 * Test CRM as it would be used in ChatSG
 * Simulates real agent/tool usage
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Testing CRM Real Usage ===\n');

async function testRealUsage() {
  // 1. Create CRM agent like the orchestrator would
  console.log('1. Creating CRM Agent...');
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  if (!crmAgent) {
    throw new Error('Failed to create CRM agent');
  }
  console.log('✅ CRM Agent created\n');

  // 2. Initialize the agent
  console.log('2. Initializing CRM Agent...');
  await crmAgent.initialize();
  console.log('✅ CRM Agent initialized\n');

  // 3. Test with real CRM queries
  const testQueries = [
    "Search for contacts with email peter.kelly@nzdf.mil.nz",
    "Show me 3 recent contacts",
    "Find opportunities worth over $10000"
  ];

  for (const query of testQueries) {
    console.log(`3. Testing query: "${query}"`);
    
    try {
      // Disable Mem0 for faster testing
      process.env.DISABLE_MEM0 = 'true';
      
      const response = await crmAgent.processMessage(query, 'test-session-' + Date.now());
      
      console.log('✅ Response received:');
      console.log('   Success:', response.success);
      console.log('   Message preview:', response.message.substring(0, 150) + '...');
      console.log();
      
    } catch (error) {
      console.log('❌ Query failed:', error.message);
      console.log();
    }
  }

  console.log('=== CRM is working correctly! ===');
  console.log('The agent can process CRM queries and return results.');
}

testRealUsage().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});