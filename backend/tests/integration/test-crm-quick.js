/**
 * Quick test for CRM latest query
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function quickTest() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  const query = 'Who is the latest lead added to our database?';
  console.log(`\nQuery: "${query}"\n`);
  
  // Don't use streaming to avoid output issues
  const result = await crmAgent.processMessage(query, 'test-quick');
  
  console.log('=== RESULT ===');
  console.log('Success:', result.success);
  console.log('Message:', result.message?.substring(0, 200) + '...');
  console.log('\n=== METADATA ===');
  console.log('Intent:', result.metadata?.queryIntent);
  console.log('Tools Used:', result.metadata?.toolsUsed);
  console.log('Confidence:', result.metadata?.confidence);
  
  if (result.metadata?.queryUnderstanding) {
    console.log('\n=== UNDERSTANDING ===');
    console.log('Primary Approach:', result.metadata.queryUnderstanding.searchStrategy?.primaryApproach);
    console.log('Sort By:', result.metadata.queryUnderstanding.searchStrategy?.sortBy);
    console.log('Limit:', result.metadata.queryUnderstanding.searchStrategy?.limit);
  }
  
  if (result.metadata?.toolOrchestrationPlan?.toolSequence?.[0]) {
    console.log('\n=== TOOL PARAMS ===');
    console.log(JSON.stringify(result.metadata.toolOrchestrationPlan.toolSequence[0].parameters, null, 2));
  }
}

quickTest().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});