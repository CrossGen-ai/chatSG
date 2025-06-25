/**
 * Test Analytical Agent Integration
 * Simple test to verify the analytical agent can be created and works properly.
 */

const { AgentFactory } = require('./src/agents/core/AgentFactory');

async function testAnalyticalAgent() {
    console.log('=== Testing Analytical Agent Integration ===');
    
    try {
        // Create agent factory
        const factory = AgentFactory.getInstance();
        
        // Check if analytical agent is available
        const availableAgents = factory.getAvailableAgents();
        console.log('Available agents:', availableAgents);
        
        const isAvailable = factory.isAgentAvailable('analytical');
        console.log('Is analytical agent available?', isAvailable);
        
        if (!isAvailable) {
            throw new Error('Analytical agent not available');
        }
        
        // Create analytical agent
        console.log('\nCreating analytical agent...');
        const agent = await factory.createAgent('analytical');
        
        // Get agent info
        const info = agent.getInfo();
        console.log('Agent info:', info);
        
        // Get capabilities
        const capabilities = agent.getCapabilities();
        console.log('Agent capabilities:', capabilities);
        
        // Validate configuration
        const validation = agent.validateConfig();
        console.log('Configuration validation:', validation);
        
        // Test message processing - statistical analysis
        console.log('\n--- Testing statistical analysis ---');
        const statsResponse = await agent.processMessage(
            'Analyze these values: 1, 5, 3, 8, 2, 9, 4', 
            'test-session-1'
        );
        console.log('Statistical analysis response:', statsResponse);
        
        // Test message processing - visualization
        console.log('\n--- Testing visualization request ---');
        const vizResponse = await agent.processMessage(
            'Create a bar chart from my data', 
            'test-session-1'
        );
        console.log('Visualization response:', vizResponse);
        
        // Test message processing - research
        console.log('\n--- Testing data research ---');
        const researchResponse = await agent.processMessage(
            'Help me find financial data sources', 
            'test-session-1'
        );
        console.log('Research response:', researchResponse);
        
        // Test message processing - general
        console.log('\n--- Testing general analysis ---');
        const generalResponse = await agent.processMessage(
            'What can you help me with?', 
            'test-session-1'
        );
        console.log('General response:', generalResponse);
        
        // Test session operations
        console.log('\n--- Testing session operations ---');
        const sessionInfo = agent.getSessionInfo('test-session-1');
        console.log('Session info:', sessionInfo);
        
        await agent.clearSession('test-session-1');
        console.log('Session cleared successfully');
        
        // Cleanup
        await agent.cleanup();
        console.log('Agent cleanup completed');
        
        console.log('\n✅ All tests passed! Analytical agent is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testAnalyticalAgent().then(() => {
    console.log('\n🎉 Analytical agent test completed successfully!');
    process.exit(0);
}).catch((error) => {
    console.error('💥 Analytical agent test failed:', error);
    process.exit(1);
}); 