/**
 * Test a single CRM latest lead query
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testSingleQuery() {
  console.log('=== Testing Single Latest Lead Query ===\n');
  
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  console.log('✅ CRM Agent initialized\n');
  
  const query = 'Who is the latest lead added to our database?';
  console.log(`Query: "${query}"\n`);
  
  try {
    let output = '';
    const streamCallback = (token) => {
      output += token;
      process.stdout.write(token);
    };
    
    const result = await crmAgent.processMessage(query, 'test-session', streamCallback);
    
    console.log('\n\n=== Result Metadata ===');
    console.log('Intent:', result.metadata?.queryIntent);
    console.log('Tools Used:', result.metadata?.toolsUsed);
    console.log('Record Count:', result.metadata?.recordCount);
    console.log('Confidence:', result.metadata?.confidence);
    
    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

testSingleQuery().catch(console.error);