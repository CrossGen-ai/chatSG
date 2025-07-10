/**
 * Test CRM response when database is empty
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testEmptyResults() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  console.log('=== Testing CRM Empty Results Handling ===\n');
  
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  // Simulate the exact query from the screenshot
  const query = 'who is our newest lead?';
  console.log(`Query: "${query}"\n`);
  
  // Get response without streaming
  const result = await crmAgent.processMessage(query, 'test-empty');
  
  console.log('=== RESPONSE ===');
  console.log(result.message);
  
  console.log('\n=== METADATA ===');
  console.log('Intent:', result.metadata?.queryUnderstanding?.userIntent);
  console.log('Search Strategy:', result.metadata?.queryUnderstanding?.searchStrategy);
  console.log('Record Count:', result.metadata?.recordCount);
  
  // Check if response is specific about what was searched
  const isSpecific = result.message.includes('most recently') || 
                     result.message.includes('sorted by creation date') ||
                     result.message.includes('database appears to be empty');
  
  console.log('\n=== QUALITY CHECK ===');
  console.log('Response is specific about search:', isSpecific ? '✅' : '❌');
  console.log('Avoids generic "no new leads" message:', !result.message.includes("we don't have any new leads") ? '✅' : '❌');
}

testEmptyResults().catch(console.error);