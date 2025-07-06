/**
 * Simple CRM API Test
 * Tests the CRM integration with actual API calls
 */

// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== CRM API Test ===\n');

async function testCRMApi() {
  try {
    // Check if API key is loaded
    console.log('1. Checking environment variables...');
    if (!process.env.INSIGHTLY_API_KEY) {
      console.error('❌ INSIGHTLY_API_KEY not found in environment');
      console.log('   Make sure it\'s set in backend/.env file');
      process.exit(1);
    }
    console.log('✅ INSIGHTLY_API_KEY found:', process.env.INSIGHTLY_API_KEY.substring(0, 10) + '...\n');

    // Test InsightlyApiTool
    console.log('2. Testing InsightlyApiTool initialization...');
    const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
    
    const apiTool = new InsightlyApiTool();
    await apiTool.initialize();
    console.log('✅ InsightlyApiTool initialized successfully\n');

    // Test a simple API call
    console.log('3. Testing API connection with contact search...');
    try {
      const result = await apiTool.searchContacts({
        limit: 5
      });
      
      console.log('✅ API call successful!');
      console.log(`   Found ${result.items.length} contacts`);
      
      if (result.items.length > 0) {
        console.log('   First contact:', {
          name: `${result.items[0].FIRST_NAME || ''} ${result.items[0].LAST_NAME || ''}`.trim(),
          email: result.items[0].EMAIL_ADDRESS,
          company: result.items[0].ORGANISATION_NAME
        });
      }
    } catch (apiError) {
      console.error('❌ API call failed:', apiError.message);
      if (apiError.message.includes('401')) {
        console.log('   This indicates an authentication issue. Please check your API key.');
      }
    }
    console.log();

    // Test CRM Agent validation
    console.log('4. Testing CRM Agent with API key...');
    const { CRMAgent } = require('../../dist/src/agents/individual/crm/agent');
    
    const crmAgent = new CRMAgent();
    
    // Initialize the agent first
    console.log('   Initializing CRM Agent...');
    await crmAgent.initialize();
    
    const validation = crmAgent.validateConfig();
    
    if (validation.valid) {
      console.log('✅ CRM Agent validation passed!');
      console.log('   The agent is ready to process CRM queries.');
    } else {
      console.log('❌ CRM Agent validation failed:');
      validation.errors.forEach(err => console.log(`   - ${err}`));
    }
    
    // Test a simple query
    console.log('\n5. Testing CRM Agent with a sample query...');
    const testQuery = "Show me the top 5 contacts";
    console.log(`   Query: "${testQuery}"`);
    
    try {
      const response = await crmAgent.processMessage(testQuery, 'test-session-123');
      console.log('✅ Agent processed query successfully!');
      console.log('   Response preview:', response.message.substring(0, 200) + '...');
    } catch (queryError) {
      console.log('❌ Query processing failed:', queryError.message);
    }

    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCRMApi().catch(console.error);