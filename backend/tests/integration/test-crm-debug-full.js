/**
 * Debug full CRM workflow execution with detailed logging
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function debugFullWorkflow() {
  console.log('=== Full CRM Workflow Debug ===\n');
  
  // First, let's test the API directly
  console.log('1. Testing API directly...');
  const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
  const apiTool = new InsightlyApiTool();
  await apiTool.initialize();
  
  try {
    // Test getting contacts directly
    console.log('\nFetching contacts from API...');
    const directResult = await apiTool.searchContacts({ limit: 5 });
    console.log(`Direct API Result: ${directResult.items.length} contacts found`);
    if (directResult.items.length > 0) {
      console.log('Sample contact:', {
        name: `${directResult.items[0].FIRST_NAME} ${directResult.items[0].LAST_NAME}`,
        created: directResult.items[0].DATE_CREATED_UTC,
        id: directResult.items[0].CONTACT_ID
      });
    }
  } catch (error) {
    console.error('Direct API Error:', error.message);
  }
  
  // Now test the ContactManagerTool
  console.log('\n2. Testing ContactManagerTool...');
  const { ContactManagerTool } = require('../../dist/src/tools/crm/ContactManagerTool');
  const contactTool = new ContactManagerTool();
  await contactTool.initialize();
  
  try {
    // Test with wildcard query
    console.log('\nTesting wildcard search...');
    const toolResult = await contactTool.execute({
      action: 'search',
      query: '*',
      options: { limit: 5, sortBy: 'created_desc' }
    });
    console.log('Tool Result:', {
      success: toolResult.success,
      count: toolResult.data?.count,
      hasContacts: toolResult.data?.contacts?.length > 0
    });
    if (toolResult.data?.contacts?.length > 0) {
      console.log('First contact from tool:', toolResult.data.contacts[0]);
    }
  } catch (error) {
    console.error('Tool Error:', error.message);
  }
  
  // Finally test the full CRM agent
  console.log('\n3. Testing full CRM Agent workflow...');
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  
  const query = 'who is our newest lead?';
  console.log(`\nQuery: "${query}"\n`);
  
  // Create a custom stream callback to capture all output
  let streamOutput = '';
  const streamCallback = (token) => {
    streamOutput += token;
    process.stdout.write(token);
  };
  
  try {
    const result = await crmAgent.processMessage(query, 'test-debug-full', streamCallback);
    
    console.log('\n\n=== FINAL RESULT ===');
    console.log('Success:', result.success);
    console.log('Record Count:', result.metadata?.recordCount);
    
    console.log('\n=== QUERY UNDERSTANDING ===');
    console.log(JSON.stringify(result.metadata?.queryUnderstanding, null, 2));
    
    console.log('\n=== TOOL ORCHESTRATION ===');
    console.log(JSON.stringify(result.metadata?.toolOrchestrationPlan, null, 2));
    
    console.log('\n=== RETRIEVED DATA ===');
    // Check if the workflow state has retrieved data
    if (result.metadata?.recordCount === 0) {
      console.log('❌ No records returned despite database having data!');
      console.log('This suggests the tool execution or parameter passing failed.');
    }
  } catch (error) {
    console.error('Agent Error:', error.message);
    console.error(error.stack);
  }
}

debugFullWorkflow().catch(console.error);