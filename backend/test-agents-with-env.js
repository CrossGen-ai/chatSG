/**
 * Test Individual Agents with Environment Variables
 * 
 * Load environment variables and test LLM integration
 */

// Load environment variables first
require('dotenv').config();

const path = require('path');

async function testAgentsWithEnv() {
    console.log('=== Testing Individual Agents with Environment ===\n');
    
    try {
        // Check environment variables
        console.log('🔍 Environment Configuration:');
        console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
        console.log(`   OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'default'}`);
        console.log(`   ENVIRONMENT: ${process.env.ENVIRONMENT || 'default'}\n`);
        
        if (!process.env.OPENAI_API_KEY) {
            console.log('❌ OpenAI API key not found. Please set OPENAI_API_KEY in .env file');
            return;
        }
        
        // Load agents
        const analyticalPath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'analytical', 'agent.js');
        const creativePath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'creative', 'agent.js');
        const technicalPath = path.join(__dirname, 'dist', 'src', 'agents', 'individual', 'technical', 'agent.js');
        
        console.log('📦 Loading agents...');
        const { AnalyticalAgent } = require(analyticalPath);
        const { CreativeAgent } = require(creativePath);
        const { TechnicalAgent } = require(technicalPath);
        console.log('✅ Agents loaded successfully\n');
        
        // Test Analytical Agent
        console.log('🧪 Testing Analytical Agent...');
        const analyticalAgent = new AnalyticalAgent();
        await analyticalAgent.initialize();
        
        const analyticalResponse = await analyticalAgent.processMessage(
            'Calculate the mean and explain the calculation for these numbers: 2, 4, 6, 8, 10',
            'test-session-analytical'
        );
        
        console.log('📊 Analytical Agent Results:');
        console.log(`   Success: ${analyticalResponse.success}`);
        console.log(`   LLM Used: ${analyticalResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${analyticalResponse.metadata?.responseLength || 0} chars`);
        console.log(`   Response Preview:\n   "${analyticalResponse.message.substring(0, 200)}..."\n`);
        
        // Test Creative Agent
        console.log('🎨 Testing Creative Agent...');
        const creativeAgent = new CreativeAgent();
        await creativeAgent.initialize();
        
        const creativeResponse = await creativeAgent.processMessage(
            'Write a very short story (2-3 sentences) about a cat who discovers it can fly',
            'test-session-creative'
        );
        
        console.log('📝 Creative Agent Results:');
        console.log(`   Success: ${creativeResponse.success}`);
        console.log(`   LLM Used: ${creativeResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${creativeResponse.metadata?.responseLength || 0} chars`);
        console.log(`   Response Preview:\n   "${creativeResponse.message.substring(0, 200)}..."\n`);
        
        // Test Technical Agent
        console.log('💻 Testing Technical Agent...');
        const technicalAgent = new TechnicalAgent();
        await technicalAgent.initialize();
        
        const technicalResponse = await technicalAgent.processMessage(
            'Write a simple Python function to calculate factorial of a number',
            'test-session-technical'
        );
        
        console.log('🔧 Technical Agent Results:');
        console.log(`   Success: ${technicalResponse.success}`);
        console.log(`   LLM Used: ${technicalResponse.metadata?.llmUsed || 'unknown'}`);
        console.log(`   Response Length: ${technicalResponse.metadata?.responseLength || 0} chars`);
        console.log(`   Response Preview:\n   "${technicalResponse.message.substring(0, 200)}..."\n`);
        
        // Final Analysis
        const allSuccessful = analyticalResponse.success && creativeResponse.success && technicalResponse.success;
        const allUsingLLM = analyticalResponse.metadata?.llmUsed && 
                           creativeResponse.metadata?.llmUsed && 
                           technicalResponse.metadata?.llmUsed;
        
        console.log('🔍 Final Analysis:');
        console.log(`   All agents responded successfully: ${allSuccessful ? '✅ YES' : '❌ NO'}`);
        console.log(`   All agents using LLM: ${allUsingLLM ? '✅ YES' : '❌ NO'}`);
        
        if (allSuccessful && allUsingLLM) {
            console.log('\n🎉 SUCCESS: LLM integration is working perfectly!');
            console.log('   Agents are no longer returning hardcoded responses');
            console.log('   Each agent is using the LLM to generate contextual, relevant responses');
        } else if (allSuccessful) {
            console.log('\n⚠️  Agents are responding but may not be using LLM properly');
        } else {
            console.log('\n❌ Some agents failed to respond properly');
        }
        
        // Cleanup
        await analyticalAgent.cleanup();
        await creativeAgent.cleanup();
        await technicalAgent.cleanup();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error.message.includes('API key')) {
            console.log('\n💡 Tip: Make sure your OpenAI API key is valid and has sufficient credits');
        }
    }
}

// Run the test
testAgentsWithEnv().catch(console.error); 