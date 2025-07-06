/**
 * Debug CRM Detailed View Functionality
 * Tests the specific "full details" request flow
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Debugging CRM Detailed View ===\n');

async function debugDetailedView() {
  // 1. Create CRM agent
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

  // 3. Test the specific query that should trigger detailed view
  const detailedQuery = "give full details of peter kelly";
  console.log(`3. Testing detailed query: "${detailedQuery}"`);
  
  try {
    // Disable Mem0 for faster testing
    process.env.DISABLE_MEM0 = 'true';
    
    // Process the message and log intermediate steps
    console.log('\n--- Starting message processing ---');
    
    const response = await crmAgent.processMessage(detailedQuery, 'debug-session-' + Date.now());
    
    console.log('\n--- Final Response ---');
    console.log('Success:', response.success);
    console.log('Message length:', response.message.length);
    console.log('Full message:');
    console.log(response.message);
    console.log('\n--- Metadata ---');
    console.log('Query Intent:', response.metadata?.queryIntent);
    console.log('Confidence:', response.metadata?.confidence);
    console.log('Record Count:', response.metadata?.recordCount);
    console.log('Tools Used:', response.metadata?.toolsUsed);
    console.log('Processing Time:', response.metadata?.processingTime + 'ms');
    
    if (response.metadata?.errors) {
      console.log('Errors:', response.metadata.errors);
    }
    
  } catch (error) {
    console.log('❌ Query failed:', error.message);
    console.log('Stack trace:', error.stack);
  }

  // 4. Test the workflow helper directly to check query analysis
  console.log('\n4. Testing query analysis directly...');
  try {
    const { CRMWorkflowHelper } = require('../../dist/src/agents/individual/crm/workflow');
    
    const analysis = CRMWorkflowHelper.analyzeQueryIntent(detailedQuery);
    console.log('Pattern Analysis Result:');
    console.log('  Intent:', analysis.intent);
    console.log('  Confidence:', analysis.confidence);
    console.log('  Criteria:', JSON.stringify(analysis.criteria, null, 2));
    console.log('  NeedsDetails:', analysis.criteria?.needsDetails);
    
  } catch (error) {
    console.log('❌ Direct analysis failed:', error.message);
  }

  console.log('\n=== Debug Complete ===');
}

debugDetailedView().catch(err => {
  console.error('❌ Debug failed:', err);
  process.exit(1);
});