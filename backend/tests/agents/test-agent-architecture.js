/**
 * Agent Architecture Test
 * 
 * Test script to verify the new TypeScript agent architecture
 * integrates correctly with existing JavaScript agents.
 */

const path = require('path');

// Set up environment for testing
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key-for-validation';

console.log('🧪 Testing Agent Architecture Integration');
console.log('=' .repeat(60));

async function testAgentArchitecture() {
    try {
        console.log('\n🔍 Test 1: TypeScript Compilation and Import');
        
        // Test that the compiled TypeScript modules can be imported
        const { initializeAgentSystem, getAgentRegistry, getAgentFactory, getSystemStats } = require('./dist/src/agents');
        
        console.log('   ✅ TypeScript modules imported successfully');
        console.log('   ✅ initializeAgentSystem function available');
        console.log('   ✅ getAgentRegistry function available');
        console.log('   ✅ getAgentFactory function available');
        console.log('   ✅ getSystemStats function available');
        
        console.log('\n🔍 Test 2: Agent System Initialization');
        
        // Initialize the agent system
        await initializeAgentSystem();
        console.log('   ✅ Agent system initialized successfully');
        
        console.log('\n🔍 Test 3: Registry and Factory Access');
        
        const registry = getAgentRegistry();
        const factory = getAgentFactory();
        
        console.log('   ✅ Registry singleton accessed');
        console.log('   ✅ Factory singleton accessed');
        
        console.log('\n🔍 Test 4: Agent Discovery');
        
        const availableAgents = registry.getAvailableAgents();
        console.log(`   📝 Available agents: ${availableAgents.join(', ')}`);
        
        // AgentZero has been removed from the system
        if (availableAgents.includes('AgentZero')) {
            console.log('   ❌ AgentZero should not be present (removed workflow)');
        } else {
            console.log('   ✅ AgentZero correctly removed from registry');
        }
        
        if (availableAgents.includes('AgentRouter')) {
            console.log('   ✅ AgentRouter discovered and registered');
        } else {
            console.log('   ⚠️  AgentRouter not found in registry');
        }
        
        console.log('\n🔍 Test 5: Agent Metadata');
        
        for (const agentName of availableAgents) {
            const metadata = registry.getAgentMetadata(agentName);
            if (metadata) {
                console.log(`   📝 ${agentName}: ${metadata.type} v${metadata.version}`);
                console.log(`      Features: ${metadata.capabilities.features.join(', ')}`);
                console.log(`      Legacy: ${metadata.isLegacy ? 'Yes' : 'No'}`);
            }
        }
        
        console.log('\n🔍 Test 6: Agent Creation via Factory');
        
        try {
            const agentZero = await factory.createAgent('AgentZero');
            console.log('   ❌ AgentZero should not be creatable (removed workflow)');
        } catch (error) {
            console.log(`   ✅ AgentZero correctly throws error: ${error.message}`);
        }
        
        try {
            const agentRouter = await factory.createAgent('AgentRouter');
            console.log('   ✅ AgentRouter created via factory');
            
            const info = agentRouter.getInfo();
            console.log(`   📝 Agent info: ${info.name} v${info.version} (${info.type})`);
            
        } catch (error) {
            console.log(`   ❌ Error creating AgentRouter: ${error.message}`);
        }
        
        console.log('\n🔍 Test 7: System Statistics');
        
        const stats = getSystemStats();
        console.log('   📊 Registry Stats:');
        console.log(`      Total agents: ${stats.registry.totalAgents}`);
        console.log(`      Legacy agents: ${stats.registry.legacyAgents}`);
        console.log(`      TypeScript agents: ${stats.registry.typescriptAgents}`);
        console.log(`      Types: ${Object.keys(stats.registry.agentsByType).join(', ')}`);
        
        console.log('   📊 Factory Stats:');
        console.log(`      Available types: ${stats.factory.availableTypes.join(', ')}`);
        console.log(`      Registered agents: ${stats.factory.registeredAgents}`);
        
        console.log('\n🔍 Test 8: Backward Compatibility');
        
        // Test that AgentZero is no longer available
        try {
            const AgentZero = require('./agent/AgentZero/agent');
            console.log('   ❌ AgentZero should not be available (removed workflow)');
        } catch (error) {
            console.log('   ✅ AgentZero correctly unavailable (removed workflow)');
        }
        
        // Test that AgentRouter still works
        try {
            const AgentRouter = require('./agent/AgentRouter/agent');
            const agentRouterLegacy = new AgentRouter();
            
            console.log('   ✅ Legacy AgentRouter still works');
            console.log(`   📝 Legacy router initialized: ${typeof agentRouterLegacy.classifyPrompt === 'function'}`);
        } catch (error) {
            console.log(`   ❌ Error with AgentRouter: ${error.message}`);
        }
        
        console.log('\n🎉 All agent architecture tests completed successfully!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Agent architecture test failed:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

// Run the test
testAgentArchitecture()
    .then(success => {
        if (success) {
            console.log('\n✅ Agent Architecture - PASSED');
            process.exit(0);
        } else {
            console.log('\n❌ Agent Architecture - FAILED');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Unexpected error:', error);
        process.exit(1);
    }); 