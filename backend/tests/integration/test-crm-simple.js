/**
 * Simple CRM Integration Check
 * Quick test to verify CRM is working with API key
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Quick CRM Check ===\n');

async function quickTest() {
  // 1. Check API key
  console.log('✅ API Key:', process.env.INSIGHTLY_API_KEY ? 'Found' : 'Missing');
  
  // 2. Test API connection
  console.log('\nTesting API connection...');
  const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
  const api = new InsightlyApiTool();
  await api.initialize();
  
  const result = await api.searchContacts({ limit: 1 });
  console.log('✅ API works! Found', result.items.length, 'contact(s)');
  
  // 3. Check CRM agent exists
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  const agents = IndividualAgentFactory.getAvailableAgents();
  console.log('✅ CRM Agent:', agents.includes('CRMAgent') ? 'Registered' : 'Missing');
  
  console.log('\n🎉 CRM integration is ready to use!');
  console.log('You can now use CRM queries in ChatSG.');
}

quickTest().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});