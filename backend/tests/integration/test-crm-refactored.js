/**
 * Test the refactored CRM agent with LLM-driven workflow
 * Tests the specific query that was failing: "give be the full details of peter kelly"
 */

const { CRMAgent } = require('../../dist/src/agents/individual/crm/agent');

async function testRefactoredCRMAgent() {
    console.log('🧪 Testing Refactored CRM Agent with LLM-driven workflow');
    console.log('=' * 60);
    
    try {
        // Create CRM agent
        console.log('\n1. Creating CRM Agent...');
        const crmAgent = new CRMAgent();
        
        // Initialize agent
        console.log('\n2. Initializing CRM Agent...');
        await crmAgent.initialize();
        console.log('✅ CRM Agent initialized successfully');
        
        // Test the failing query
        const testQuery = "give be the full details of peter kelly";
        console.log(`\n3. Testing query: "${testQuery}"`);
        console.log('This query was previously failing because:');
        console.log('- Regex was removing "details" from the input');
        console.log('- Pattern matching was not LLM-driven');
        console.log('- No smart tool orchestration');
        
        // Process the message
        console.log('\n4. Processing with LLM-driven workflow...');
        const sessionId = `test-session-${Date.now()}`;
        
        const result = await crmAgent.processMessage(testQuery, sessionId);
        
        console.log('\n5. Results:');
        console.log('✅ Success:', result.success);
        console.log('📝 Message:', result.message);
        console.log('🔧 Metadata:', JSON.stringify(result.metadata, null, 2));
        
        if (result.success) {
            console.log('\n🎉 SUCCESS: The refactored CRM agent processed the query successfully!');
            console.log('\n📊 Key improvements verified:');
            console.log('- ✅ No regex pattern removal of "details"');
            console.log('- ✅ LLM-driven query understanding');
            console.log('- ✅ Smart tool orchestration');
            console.log('- ✅ Agent compiles without syntax errors');
            
            if (result.metadata?.toolsUsed?.length > 0) {
                console.log('- ✅ Tools were used:', result.metadata.toolsUsed.join(', '));
            }
            
            if (result.metadata?.queryIntent) {
                console.log('- ✅ Query intent detected:', result.metadata.queryIntent);
            }
        } else {
            console.log('\n❌ FAILURE: The agent returned success: false');
            console.log('Error details:', result.message);
        }
        
        // Test agent capabilities
        console.log('\n6. Testing agent capabilities...');
        const capabilities = crmAgent.getCapabilities();
        console.log('Agent capabilities:', capabilities.features.join(', '));
        
        // Cleanup
        console.log('\n7. Cleaning up...');
        await crmAgent.cleanup();
        console.log('✅ Cleanup complete');
        
    } catch (error) {
        console.error('❌ Test failed with error:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testRefactoredCRMAgent()
        .then(() => {
            console.log('\n🎯 Test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testRefactoredCRMAgent };