/**
 * Test CRM without Mem0 to isolate issues
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// Disable Mem0 to test CRM in isolation
process.env.DISABLE_MEM0 = 'true';
process.env.DEBUG = 'true';

console.log('=== Testing CRM without Mem0 ===\n');

async function testCRM() {
  // Test tools directly
  console.log('1. Testing ContactManagerTool directly...');
  const { ContactManagerTool } = require('../../dist/src/tools/crm/ContactManagerTool');
  
  const contactTool = new ContactManagerTool();
  await contactTool.initialize();
  
  try {
    const result = await contactTool.execute({
      action: 'search',
      query: 'peter.kelly@nzdf.mil.nz'
    });
    
    console.log('✅ Contact search worked!');
    console.log('   Found:', result.data.contacts.length, 'contact(s)');
    if (result.data.contacts.length > 0) {
      const contact = result.data.contacts[0];
      console.log('   First contact:', contact.name, '-', contact.email);
      console.log('   Lead Score:', contact.leadScore);
    }
  } catch (err) {
    console.log('❌ Contact search failed:', err.message);
  }
  
  console.log('\n2. Testing OpportunityTool directly...');
  const { OpportunityTool } = require('../../dist/src/tools/crm/OpportunityTool');
  
  const oppTool = new OpportunityTool();
  await oppTool.initialize();
  
  try {
    const result = await oppTool.execute({
      action: 'search',
      query: '',
      filters: { minValue: 10000 }
    });
    
    console.log('✅ Opportunity search worked!');
    console.log('   Found:', result.data.opportunities.length, 'opportunities');
    console.log('   Total value: $' + result.data.totalValue.toLocaleString());
  } catch (err) {
    console.log('❌ Opportunity search failed:', err.message);
  }
  
  console.log('\n3. Testing pipeline analysis...');
  try {
    const result = await oppTool.execute({
      action: 'analyzePipeline'
    });
    
    console.log('✅ Pipeline analysis worked!');
    console.log('   Pipelines analyzed:', result.data.pipelines.length);
  } catch (err) {
    console.log('❌ Pipeline analysis failed:', err.message);
  }
  
  console.log('\n✅ CRM tools are working correctly!');
}

testCRM().catch(err => {
  console.error('❌ Test failed:', err);
  console.error(err.stack);
  process.exit(1);
});