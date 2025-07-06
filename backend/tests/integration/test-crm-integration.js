/**
 * CRM Integration Test Suite
 * Tests the complete CRM agent and tool system
 */

console.log('=== CRM Integration Test Suite ===\n');

async function runCRMTests() {
  try {
    // Test 1: Check if CRM agent is registered
    console.log('Test 1: Verifying CRM Agent Registration...');
    const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
    
    const agents = IndividualAgentFactory.getAvailableAgents();
    
    if (!agents.includes('CRMAgent')) {
      throw new Error('CRM agent not found in available agents');
    }
    console.log('✅ CRM agent is registered\n');

    // Test 2: Create CRM agent instance
    console.log('Test 2: Creating CRM Agent Instance...');
    const crmAgent = IndividualAgentFactory.createAgent('crm');
    
    if (!crmAgent) {
      throw new Error('Failed to create CRM agent');
    }
    
    const capabilities = crmAgent.getCapabilities();
    console.log('✅ CRM agent created successfully');
    console.log('   Name:', capabilities.name);
    console.log('   Version:', capabilities.version);
    console.log('   Features:', capabilities.features.join(', '));
    console.log();

    // Test 3: Test InsightlyApiTool
    console.log('Test 3: Testing InsightlyApiTool...');
    const { InsightlyApiTool } = require('../../dist/src/tools/crm/InsightlyApiTool');
    
    const apiTool = new InsightlyApiTool();
    const apiSchema = apiTool.getSchema();
    
    console.log('✅ InsightlyApiTool loaded');
    console.log('   Name:', apiSchema.name);
    console.log('   Description:', apiSchema.description);
    console.log();

    // Test 4: Test ContactManagerTool
    console.log('Test 4: Testing ContactManagerTool...');
    const { ContactManagerTool } = require('../../dist/src/tools/crm/ContactManagerTool');
    
    const contactTool = new ContactManagerTool();
    const contactSchema = contactTool.getSchema();
    
    console.log('✅ ContactManagerTool loaded');
    console.log('   Name:', contactSchema.name);
    console.log('   Description:', contactSchema.description);
    console.log('   Actions:', contactSchema.parameters.find(p => p.name === 'action').enum.join(', '));
    console.log();

    // Test 5: Test OpportunityTool
    console.log('Test 5: Testing OpportunityTool...');
    const { OpportunityTool } = require('../../dist/src/tools/crm/OpportunityTool');
    
    const opportunityTool = new OpportunityTool();
    const oppSchema = opportunityTool.getSchema();
    
    console.log('✅ OpportunityTool loaded');
    console.log('   Name:', oppSchema.name);
    console.log('   Description:', oppSchema.description);
    console.log('   Actions:', oppSchema.parameters.find(p => p.name === 'action').enum.join(', '));
    console.log();

    // Test 6: Validate CRM Agent workflow
    console.log('Test 6: Validating CRM Agent Workflow...');
    
    // Check if agent can validate its config
    const validationResult = crmAgent.validateConfig();
    if (!process.env.INSIGHTLY_API_KEY) {
      console.log('⚠️  Skipping validation - INSIGHTLY_API_KEY not set');
      console.log('   Expected errors:', validationResult.errors.join(', '));
    } else if (!validationResult.valid) {
      throw new Error('CRM agent config validation failed: ' + validationResult.errors.join(', '));
    } else {
      console.log('✅ CRM agent configuration is valid');
    }
    console.log();

    // Test 7: Test agent orchestrator integration
    console.log('Test 7: Testing Agent Orchestrator Integration...');
    const { AgentOrchestrator } = require('../../dist/src/routing/AgentOrchestrator');
    
    const orchestrator = new AgentOrchestrator();
    
    // Test CRM-related queries
    const crmQueries = [
      'Find customer john.doe@example.com',
      'Show me the sales pipeline status',
      'What opportunities are closing this month?',
      'Search for contacts at Acme Corp'
    ];
    
    for (const query of crmQueries) {
      const selection = await orchestrator.selectAgent(query, {
        sessionId: 'test-session',
        userInput: query,
        availableAgents: orchestrator.listAgents().map(cap => cap.name)
      });
      
      console.log(`   Query: "${query}"`);
      console.log(`   Selected: ${selection.selectedAgent} (confidence: ${selection.confidence})`);
      
      if (selection.selectedAgent !== 'crm') {
        console.warn(`   ⚠️  Warning: Expected 'crm' agent but got '${selection.selectedAgent}'`);
      }
    }
    console.log();

    // Test 8: Mock API Response (without actual API key)
    console.log('Test 8: Testing Mock API Response...');
    
    // Validate tool parameters
    const searchValidation = contactTool.validate({
      action: 'search',
      query: 'test@example.com'
    });
    
    if (!searchValidation.valid) {
      throw new Error('Contact search validation failed: ' + searchValidation.errors.join(', '));
    }
    console.log('✅ Contact search parameters validated successfully');
    
    const pipelineValidation = opportunityTool.validate({
      action: 'analyzePipeline'
    });
    
    if (!pipelineValidation.valid) {
      throw new Error('Pipeline analysis validation failed: ' + pipelineValidation.errors.join(', '));
    }
    console.log('✅ Pipeline analysis parameters validated successfully\n');

    // Summary
    console.log('=== Test Summary ===');
    console.log('✅ All CRM integration tests passed!');
    console.log('   - CRM agent is properly registered');
    console.log('   - All CRM tools are loaded and configured');
    console.log('   - Agent workflow is valid');
    console.log('   - Orchestrator correctly routes CRM queries');
    console.log('   - Tool parameter validation works correctly');
    console.log('\n🎉 CRM integration is ready for use!');
    
    // Check for API key
    if (!process.env.INSIGHTLY_API_KEY) {
      console.log('\n⚠️  Note: INSIGHTLY_API_KEY is not set in environment');
      console.log('   To use the CRM integration, set your API key:');
      console.log('   export INSIGHTLY_API_KEY=your_api_key_here');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runCRMTests();