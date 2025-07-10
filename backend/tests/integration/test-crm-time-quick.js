/**
 * Quick test for time-based CRM queries
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testTimeQuery() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  const query = 'Who did we add to the CRM yesterday?';
  console.log(`\nQuery: "${query}"\n`);
  
  // Test without streaming
  const startTime = Date.now();
  const result = await crmAgent.processMessage(query, 'test-time');
  const duration = Date.now() - startTime;
  
  console.log('=== RESULT ===');
  console.log('Success:', result.success);
  console.log('Duration:', duration, 'ms');
  console.log('Message Preview:', result.message?.substring(0, 150) + '...');
  
  if (result.metadata?.queryUnderstanding) {
    console.log('\n=== UNDERSTANDING ===');
    console.log('Intent:', result.metadata.queryUnderstanding.userIntent);
    console.log('Time References:', result.metadata.queryUnderstanding.extractedInfo?.timeReferences);
    console.log('Primary Approach:', result.metadata.queryUnderstanding.searchStrategy?.primaryApproach);
  }
  
  if (result.metadata?.toolOrchestrationPlan?.toolSequence?.[0]) {
    console.log('\n=== TOOL PARAMS ===');
    const params = result.metadata.toolOrchestrationPlan.toolSequence[0].parameters;
    console.log('Query:', params.query);
    console.log('Options:', JSON.stringify(params.options, null, 2));
  }
  
  console.log('\n✅ Test completed');
}

testTimeQuery().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});