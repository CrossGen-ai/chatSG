/**
 * List available contacts to see what we can test with
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

console.log('=== Listing Available Contacts ===\n');

async function listContacts() {
  try {
    // 1. Create CRM agent
    const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
    
    const crmAgent = IndividualAgentFactory.createAgent('crm');
    await crmAgent.initialize();

    // 2. Query for all contacts (using wildcard)
    console.log('Searching for all contacts...');
    
    process.env.DISABLE_MEM0 = 'true';
    const response = await crmAgent.processMessage("show me all contacts", 'test-session-' + Date.now());
    
    console.log('Response:');
    console.log(response.message);
    console.log('\nRecord Count:', response.metadata?.recordCount);
    
  } catch (error) {
    console.error('❌ Failed to list contacts:', error.message);
  }
}

listContacts();