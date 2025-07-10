/**
 * Test the fixed newest lead query
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testNewestLead() {
  console.log('=== Testing Fixed Newest Lead Query ===\n');
  
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  const query = 'who is our newest lead?';
  console.log(`Query: "${query}"\n`);
  
  console.log('Processing...\n');
  
  let output = '';
  const streamCallback = (token) => {
    output += token;
  };
  
  const result = await crmAgent.processMessage(query, 'test-fixed', streamCallback);
  
  console.log('\n=== RESPONSE ===');
  console.log(output);
  
  console.log('\n=== ANALYSIS ===');
  console.log('Success:', result.success);
  console.log('Record Count:', result.metadata?.recordCount);
  
  if (result.metadata?.recordCount === 0) {
    console.log('\n❌ ISSUE: No records returned!');
    console.log('This means the tool execution failed to find contacts.');
  } else {
    console.log('\n✅ SUCCESS: Found', result.metadata.recordCount, 'contact(s)');
  }
  
  // Check tool parameters
  if (result.metadata?.toolOrchestrationPlan?.toolSequence?.[0]) {
    const params = result.metadata.toolOrchestrationPlan.toolSequence[0].parameters;
    console.log('\n=== TOOL PARAMETERS ===');
    console.log('Query:', params.query);
    console.log('Sort By:', params.options?.sortBy);
    console.log('Limit:', params.options?.limit);
  }
}

testNewestLead().catch(console.error);