/**
 * Direct test of ContactManagerTool sorting
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function testToolDirectly() {
  console.log('=== Direct ContactManagerTool Test ===\n');
  
  const { ContactManagerTool } = require('../../dist/src/tools/crm/ContactManagerTool');
  const tool = new ContactManagerTool();
  await tool.initialize();
  
  console.log('1. Testing wildcard query with no sorting...');
  try {
    const result1 = await tool.execute({
      action: 'search',
      query: '*',
      options: { limit: 3 }
    });
    console.log('Result:', result1.success ? 'SUCCESS' : 'FAILED');
    console.log('Count:', result1.data?.count);
    if (result1.data?.contacts?.[0]) {
      console.log('First contact:', result1.data.contacts[0].name);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n2. Testing wildcard query WITH sorting by created_desc...');
  try {
    const result2 = await tool.execute({
      action: 'search',
      query: '*',
      options: { 
        sortBy: 'created_desc',
        limit: 1 
      }
    });
    console.log('Result:', result2.success ? 'SUCCESS' : 'FAILED');
    console.log('Count:', result2.data?.count);
    if (result2.data?.contacts?.[0]) {
      const contact = result2.data.contacts[0];
      console.log('Newest contact:', contact.name);
      console.log('Display:', contact.display);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n3. Testing the API tool directly...');
  const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
  const apiTool = new InsightlyApiTool();
  await apiTool.initialize();
  
  try {
    const apiResult = await apiTool.searchContacts({
      limit: 5,
      orderBy: 'DATE_CREATED_UTC desc'
    });
    console.log('API Result count:', apiResult.items.length);
    console.log('First 3 contacts from API:');
    apiResult.items.slice(0, 3).forEach((c, i) => {
      console.log(`  ${i+1}. ${c.FIRST_NAME} ${c.LAST_NAME} - Created: ${c.DATE_CREATED_UTC}`);
    });
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testToolDirectly().catch(console.error);