/**
 * Debug CRM workflow understanding
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function debugWorkflow() {
  console.log('=== Debugging CRM Workflow ===\n');
  
  // Test just the LLM understanding part
  const { CRMWorkflowHelper } = require('../../dist/src/agents/individual/crm/workflow');
  const { LLMHelper } = require('../../utils/llm-helper');
  
  const llm = new LLMHelper().createChatLLM(false);
  
  const testQuery = 'Who is the latest lead added to our database?';
  console.log(`Testing query: "${testQuery}"\n`);
  
  try {
    // Test query understanding
    console.log('1. Testing Query Understanding...');
    const understanding = await CRMWorkflowHelper.analyzeQueryWithLLM(testQuery, llm);
    console.log('Query Understanding:', JSON.stringify(understanding, null, 2));
    
    // Test tool orchestration
    console.log('\n2. Testing Tool Orchestration...');
    const toolPlan = await CRMWorkflowHelper.createToolOrchestrationPlan(understanding, llm);
    console.log('Tool Plan:', JSON.stringify(toolPlan, null, 2));
    
    console.log('\n✅ Workflow components working correctly');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugWorkflow().catch(console.error);