/**
 * Test detailed view for a specific contact that we know exists
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Testing Specific Contact Details ===\n');

async function testSpecificContact() {
  try {
    // 1. Create CRM agent
    const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
    
    const crmAgent = IndividualAgentFactory.createAgent('crm');
    await crmAgent.initialize();

    // Test queries for Peter Kelly
    const testQueries = [
      "give full details of Peter Kelly",
      "find contact peter kelly",
      "search for Peter",
      "show me details for peter.kelly@nzdf.mil.nz"
    ];

    for (const query of testQueries) {
      console.log(`\n=== Testing: "${query}" ===`);
      
      process.env.DISABLE_MEM0 = 'true';
      const response = await crmAgent.processMessage(query, 'test-session-' + Date.now());
      
      console.log('Success:', response.success);
      console.log('Record Count:', response.metadata?.recordCount);
      console.log('Query Intent:', response.metadata?.queryIntent);
      console.log('Message Preview:');
      console.log(response.message.substring(0, 300) + '...');
      
      // Check if this was a detailed view
      if (response.message.includes('**Full Details for')) {
        console.log('✅ DETAILED VIEW DETECTED!');
      } else if (response.metadata?.recordCount > 0) {
        console.log('📋 Regular search result');
      } else {
        console.log('❌ No results found');
      }
    }
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
  }
}

testSpecificContact();