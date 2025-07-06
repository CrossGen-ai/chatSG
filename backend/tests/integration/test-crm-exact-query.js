/**
 * Test the exact query that's not working
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Testing Exact Query ===\n');

async function testExactQuery() {
  try {
    // 1. Create CRM agent
    const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
    
    const crmAgent = IndividualAgentFactory.createAgent('crm');
    await crmAgent.initialize();

    // Test the exact failing query
    const query = "give be the full details of peter kelly";
    console.log(`Testing: "${query}"`);
    
    process.env.DISABLE_MEM0 = 'true';
    const response = await crmAgent.processMessage(query, 'test-session-' + Date.now());
    
    console.log('\n--- Results ---');
    console.log('Success:', response.success);
    console.log('Record Count:', response.metadata?.recordCount);
    console.log('Query Intent:', response.metadata?.queryIntent);
    console.log('Full Response:');
    console.log(response.message);
    
    // Test the workflow helper directly to see pattern analysis
    console.log('\n--- Direct Pattern Analysis ---');
    const { CRMWorkflowHelper } = require('../../dist/src/agents/individual/crm/workflow');
    const analysis = CRMWorkflowHelper.analyzeQueryIntent(query);
    console.log('Pattern Analysis:');
    console.log('  Intent:', analysis.intent);
    console.log('  Confidence:', analysis.confidence);
    console.log('  Criteria:', JSON.stringify(analysis.criteria, null, 2));
    console.log('  NeedsDetails:', analysis.criteria?.needsDetails);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testExactQuery();