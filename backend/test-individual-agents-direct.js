/**
 * Direct Test of Individual Agents with LLM Integration
 * 
 * Test each agent directly to verify LLM integration is working
 */

const path = require('path');

async function testIndividualAgents() {
    console.log('=== Direct Test of Individual Agents ===\n');
    
    try {
        // Since we can't import TypeScript directly, let's check if the compiled JS exists
        const analyticalPath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'analytical', 'agent.js');
        const creativePath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'creative', 'agent.js');
        const technicalPath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'technical', 'agent.js');
        
        console.log('🔍 Checking compiled agent files...');
        const fs = require('fs');
        
        const analyticalExists = fs.existsSync(analyticalPath);
        const creativeExists = fs.existsSync(creativePath);
        const technicalExists = fs.existsSync(technicalPath);
        
        console.log(`   Analytical Agent: ${analyticalExists ? '✅ Found' : '❌ Missing'}`);
        console.log(`   Creative Agent: ${creativeExists ? '✅ Found' : '❌ Missing'}`);
        console.log(`   Technical Agent: ${technicalExists ? '✅ Found' : '❌ Missing'}\n`);
        
        if (!analyticalExists || !creativeExists || !technicalExists) {
            console.log('❌ Compiled agent files not found. Need to compile TypeScript first.');
            console.log('   Run: npx tsc\n');
            return;
        }
        
        // Try to load and test the agents
        console.log('📦 Loading compiled agents...');
        
        try {
            const { AnalyticalAgent } = require(analyticalPath);
            const { CreativeAgent } = require(creativePath);
            const { TechnicalAgent } = require(technicalPath);
            
            console.log('✅ Agents loaded successfully\n');
            
            // Test Analytical Agent
            console.log('🧪 Testing Analytical Agent...');
            const analyticalAgent = new AnalyticalAgent();
            await analyticalAgent.initialize();
            
            const analyticalResponse = await analyticalAgent.processMessage(
                'Calculate the mean of these numbers: 1, 2, 3, 4, 5',
                'test-session-analytical'
            );
            
            console.log('📊 Analytical Agent Response:');
            console.log(`   Success: ${analyticalResponse.success}`);
            console.log(`   Response Preview: ${analyticalResponse.message.substring(0, 100)}...`);
            console.log(`   LLM Used: ${analyticalResponse.metadata?.llmUsed || 'unknown'}`);
            console.log(`   Response Length: ${analyticalResponse.metadata?.responseLength || 'unknown'}\n`);
            
            // Test Creative Agent
            console.log('🎨 Testing Creative Agent...');
            const creativeAgent = new CreativeAgent();
            await creativeAgent.initialize();
            
            const creativeResponse = await creativeAgent.processMessage(
                'Write a short story about a robot learning to paint',
                'test-session-creative'
            );
            
            console.log('📝 Creative Agent Response:');
            console.log(`   Success: ${creativeResponse.success}`);
            console.log(`   Response Preview: ${creativeResponse.message.substring(0, 100)}...`);
            console.log(`   LLM Used: ${creativeResponse.metadata?.llmUsed || 'unknown'}`);
            console.log(`   Response Length: ${creativeResponse.metadata?.responseLength || 'unknown'}\n`);
            
            // Test Technical Agent
            console.log('💻 Testing Technical Agent...');
            const technicalAgent = new TechnicalAgent();
            await technicalAgent.initialize();
            
            const technicalResponse = await technicalAgent.processMessage(
                'Write a Python function to sort a list of dictionaries by a key',
                'test-session-technical'
            );
            
            console.log('🔧 Technical Agent Response:');
            console.log(`   Success: ${technicalResponse.success}`);
            console.log(`   Response Preview: ${technicalResponse.message.substring(0, 100)}...`);
            console.log(`   LLM Used: ${technicalResponse.metadata?.llmUsed || 'unknown'}`);
            console.log(`   Response Length: ${technicalResponse.metadata?.responseLength || 'unknown'}\n`);
            
            // Analysis
            const allUsingLLM = analyticalResponse.metadata?.llmUsed && 
                               creativeResponse.metadata?.llmUsed && 
                               technicalResponse.metadata?.llmUsed;
            
            if (allUsingLLM) {
                console.log('🎉 SUCCESS: All agents are using LLM integration!');
            } else {
                console.log('⚠️  Some agents may not be using LLM properly');
            }
            
            // Cleanup
            await analyticalAgent.cleanup();
            await creativeAgent.cleanup();
            await technicalAgent.cleanup();
            
        } catch (loadError) {
            console.error('❌ Error loading agents:', loadError.message);
            console.log('\nThis might be due to TypeScript compilation issues.');
            console.log('The agents have been updated to use LLM integration, but need to be compiled first.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testIndividualAgents().catch(console.error); 