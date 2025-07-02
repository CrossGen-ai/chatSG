/**
 * Customer Support Agency Test
 * 
 * Test script to verify the CustomerSupportAgency implementation
 * with LangGraph workflow orchestration.
 */

const { AgentFactory } = require('./src/agents/core/AgentFactory');

async function testCustomerSupportAgency() {
    console.log('=== Customer Support Agency Test ===\n');

    try {
        // Initialize the factory
        const factory = AgentFactory.getInstance();
        
        console.log('1. Testing agency creation...');
        const agency = await factory.createAgent('customer-support');
        
        console.log('✓ Customer Support Agency created successfully');
        console.log(`   Name: ${agency.getInfo().name}`);
        console.log(`   Type: ${agency.getInfo().type}`);
        console.log(`   Version: ${agency.getInfo().version}\n`);

        // Test capabilities
        console.log('2. Testing agency capabilities...');
        const capabilities = agency.getCapabilities();
        console.log('✓ Agency capabilities:');
        console.log(`   Supported modes: ${capabilities.supportedModes.join(', ')}`);
        console.log(`   Features: ${capabilities.features.join(', ')}`);
        console.log(`   Input types: ${capabilities.inputTypes.join(', ')}`);
        console.log(`   Output types: ${capabilities.outputTypes.join(', ')}\n`);

        // Test workflow status
        console.log('3. Testing workflow status...');
        const workflowStatus = agency.getWorkflowStatus();
        console.log('✓ Workflow status:');
        console.log(`   Initialized: ${workflowStatus.initialized}`);
        console.log(`   Available agents: ${JSON.stringify(workflowStatus.availableAgents)}`);
        console.log(`   Workflow stages: ${workflowStatus.workflowStages.join(' → ')}\n`);

        // Test configuration validation
        console.log('4. Testing configuration validation...');
        const validation = agency.validateConfig();
        console.log('✓ Configuration validation:');
        console.log(`   Valid: ${validation.valid}`);
        if (validation.errors.length > 0) {
            console.log(`   Errors: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
            console.log(`   Warnings: ${validation.warnings.join(', ')}`);
        }
        console.log();

        // Test different customer support scenarios
        const testScenarios = [
            {
                name: 'Billing Issue (Frustrated Customer)',
                input: "I'm really frustrated! I was charged twice for my subscription and this is unacceptable. I want my money back now!",
                sessionId: 'test-billing-001'
            },
            {
                name: 'Technical Problem (Neutral Customer)', 
                input: "Hi, I'm having trouble logging into my account. The error message says 'invalid credentials' but I'm sure my password is correct.",
                sessionId: 'test-technical-001'
            },
            {
                name: 'General Inquiry (Positive Customer)',
                input: "Hello! I love your service and I'm wondering if you have any new features coming soon. Keep up the great work!",
                sessionId: 'test-general-001'
            },
            {
                name: 'Account Issue (Neutral Customer)',
                input: "I need to update my email address on my account but I can't find the option in the settings.",
                sessionId: 'test-account-001'
            }
        ];

        console.log('5. Testing customer support workflows...\n');

        for (const scenario of testScenarios) {
            console.log(`--- Testing: ${scenario.name} ---`);
            console.log(`Input: "${scenario.input}"`);
            console.log(`Session: ${scenario.sessionId}\n`);

            try {
                const startTime = Date.now();
                const response = await agency.processMessage(scenario.input, scenario.sessionId);
                const processingTime = Date.now() - startTime;

                console.log('✓ Agency Response:');
                console.log(`   Success: ${response.success}`);
                console.log(`   Processing time: ${processingTime}ms`);
                console.log(`   Message: "${response.message}"`);
                
                if (response.metadata) {
                    console.log('\n   Workflow Metadata:');
                    console.log(`   - Agency: ${response.metadata.agencyName}`);
                    console.log(`   - Stage: ${response.metadata.workflowStage}`);
                    console.log(`   - Sentiment: ${response.metadata.customerSentiment}`);
                    console.log(`   - Category: ${response.metadata.issueCategory}`);
                    
                    if (response.metadata.resolution) {
                        console.log(`   - Resolution Type: ${response.metadata.resolution.type}`);
                    }
                    
                    if (response.metadata.workflowMetadata) {
                        console.log(`   - Workflow Completed: ${response.metadata.workflowMetadata.workflowCompleted}`);
                    }
                }

                // Test session info
                const sessionInfo = agency.getSessionInfo(scenario.sessionId);
                console.log('\n   Session Info:');
                console.log(`   - Session ID: ${sessionInfo.sessionId}`);
                console.log(`   - Agency Type: ${sessionInfo.agencyType}`);
                console.log(`   - Initialized: ${sessionInfo.initialized}`);

            } catch (error) {
                console.error(`✗ Failed to process scenario: ${error.message}`);
            }

            console.log('\n' + '='.repeat(60) + '\n');
        }

        // Test agency statistics
        console.log('6. Testing factory statistics...');
        const factoryStats = factory.getStats();
        console.log('✓ Factory statistics:');
        console.log(`   Available types: ${factoryStats.availableTypes.join(', ')}`);
        console.log(`   Registered agents: ${factoryStats.registeredAgents}`);
        console.log(`   Configured types: ${factoryStats.configuredTypes.join(', ')}\n`);

        // Test agency cleanup
        console.log('7. Testing agency cleanup...');
        if (agency.cleanup) {
            await agency.cleanup();
            console.log('✓ Agency cleaned up successfully\n');
        }

        console.log('=== All Customer Support Agency Tests Completed Successfully! ===');

    } catch (error) {
        console.error('✗ Customer Support Agency test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testCustomerSupportAgency()
        .then(() => {
            console.log('\n✓ Test completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n✗ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testCustomerSupportAgency }; 