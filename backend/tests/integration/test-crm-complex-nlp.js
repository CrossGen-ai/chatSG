/**
 * Test CRM Agent Natural Language Processing - Complex Natural Language
 * 
 * Tests the ability to understand and process complex, ambiguous, and
 * context-heavy natural language queries, including:
 * - Partial information ("that guy from...")
 * - Context clues ("the person who emailed about...")
 * - Multi-criteria queries
 * - Conversational language
 * - Typos and casual speech
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== CRM Natural Language Test: Complex Natural Language ===\n'));

async function testComplexNaturalLanguage() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  // Initialize CRM Agent
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  console.log(chalk.green('✅ CRM Agent initialized\n'));

  // Test cases for complex natural language
  const testCases = [
    {
      query: 'I need to find that guy from the conference last week whose name started with J',
      expectedBehavior: {
        intent: 'find_contact_by_partial_info',
        extractedCriteria: ['name_starts_with_J', 'recent_timeframe'],
        description: 'Should handle partial name info + time context'
      }
    },
    {
      query: 'Can you pull up the contact info for the person who emailed us about the enterprise deal?',
      expectedBehavior: {
        intent: 'find_contact_by_context',
        extractedCriteria: ['enterprise_deal_context'],
        description: 'Should understand contextual references'
      }
    },
    {
      query: 'Show me people we should prioritize for Q1 outreach',
      expectedBehavior: {
        intent: 'find_priority_contacts',
        extractedCriteria: ['high_priority', 'q1_timeframe'],
        description: 'Should identify high-value contacts for outreach'
      }
    },
    {
      query: 'Find warm leads who might be interested in our new product',
      expectedBehavior: {
        intent: 'find_qualified_leads',
        extractedCriteria: ['warm_leads', 'product_interest'],
        description: 'Should identify engaged, qualified leads'
      }
    },
    {
      query: 'Who are the contacts that haven\'t converted yet but show high engagement?',
      expectedBehavior: {
        intent: 'find_engaged_prospects',
        extractedCriteria: ['not_converted', 'high_engagement'],
        description: 'Should combine multiple criteria intelligently'
      }
    },
    {
      query: 'I\'m looking for tech companies in California with deals over 50k',
      expectedBehavior: {
        intent: 'find_contacts_multi_criteria',
        extractedCriteria: ['industry_tech', 'location_california', 'deal_value_50k+'],
        description: 'Should handle multiple specific criteria'
      }
    },
    {
      query: 'whos the person from acme corp that we talked to last month about the integration',
      expectedBehavior: {
        intent: 'find_contact_by_company_context',
        extractedCriteria: ['company_acme', 'last_month', 'integration_context'],
        description: 'Should handle typos + company + context'
      }
    },
    {
      query: 'Find me someone to talk to about our SaaS solution - preferably a decision maker',
      expectedBehavior: {
        intent: 'find_decision_makers',
        extractedCriteria: ['decision_maker_role', 'saas_interest'],
        description: 'Should identify contacts by role and interest'
      }
    },
    {
      query: 'Show me contacts who\'ve gone cold but used to be really engaged',
      expectedBehavior: {
        intent: 'find_re_engagement_targets',
        extractedCriteria: ['previously_engaged', 'now_inactive'],
        description: 'Should understand engagement history'
      }
    },
    {
      query: 'gimme all the ppl we met at dreamforce who havent signed up yet',
      expectedBehavior: {
        intent: 'find_event_contacts',
        extractedCriteria: ['event_dreamforce', 'not_converted'],
        description: 'Should handle casual language + event context'
      }
    },
    {
      query: 'Which contacts should I follow up with based on their interaction history?',
      expectedBehavior: {
        intent: 'find_followup_candidates',
        extractedCriteria: ['interaction_history', 'followup_needed'],
        description: 'Should analyze interaction patterns'
      }
    },
    {
      query: 'Find contacts similar to John Smith - you know, same industry, company size, that kind of thing',
      expectedBehavior: {
        intent: 'find_similar_contacts',
        extractedCriteria: ['reference_contact', 'similar_attributes'],
        description: 'Should understand similarity matching'
      }
    }
  ];

  let passCount = 0;
  let failCount = 0;
  const results = [];

  for (const testCase of testCases) {
    console.log(chalk.cyan(`\nTest: ${testCase.expectedBehavior.description}`));
    console.log(chalk.white(`Query: "${testCase.query}"`));
    
    try {
      // Process the query
      let responseText = '';
      let metadata = {};
      
      const streamCallback = (token) => {
        responseText += token;
      };
      
      const startTime = Date.now();
      const result = await crmAgent.processMessage(
        testCase.query, 
        'test-session-complex-nlp',
        streamCallback
      );
      const processingTime = Date.now() - startTime;
      
      // Extract metadata from result
      metadata = result.metadata || {};
      
      // Log what the agent understood
      console.log(chalk.gray('Query Understanding:'));
      if (metadata.queryUnderstanding) {
        console.log(chalk.gray(`  Intent: ${metadata.queryUnderstanding.userIntent}`));
        console.log(chalk.gray(`  Confidence: ${metadata.queryUnderstanding.confidence}`));
        
        // Log extracted information
        const extracted = metadata.queryUnderstanding.extractedInfo;
        if (extracted) {
          console.log(chalk.gray('  Extracted Information:'));
          if (extracted.names?.length) console.log(chalk.gray(`    Names: ${extracted.names.join(', ')}`));
          if (extracted.companies?.length) console.log(chalk.gray(`    Companies: ${extracted.companies.join(', ')}`));
          if (extracted.context) console.log(chalk.gray(`    Context: ${extracted.context}`));
          if (extracted.criteria) console.log(chalk.gray(`    Criteria: ${JSON.stringify(extracted.criteria)}`));
        }
        
        // Log search strategy
        const strategy = metadata.queryUnderstanding.searchStrategy;
        if (strategy) {
          console.log(chalk.gray(`  Search Strategy: ${strategy.primaryApproach}`));
          if (strategy.complexQuery) {
            console.log(chalk.gray(`  Complex Query: ${strategy.complexQuery}`));
          }
        }
      }
      
      // Log tools used
      if (metadata.toolsUsed && metadata.toolsUsed.length > 0) {
        console.log(chalk.gray(`Tools Used: ${metadata.toolsUsed.join(', ')}`));
      }
      
      // Log how the complex query was translated
      if (metadata.toolOrchestrationPlan && metadata.toolOrchestrationPlan.toolSequence) {
        console.log(chalk.gray('Tool Orchestration:'));
        metadata.toolOrchestrationPlan.toolSequence.forEach((step, idx) => {
          console.log(chalk.gray(`  ${idx + 1}. ${step.toolName}: ${step.reason}`));
          if (step.parameters && Object.keys(step.parameters).length > 0) {
            console.log(chalk.gray(`     Parameters: ${JSON.stringify(step.parameters)}`));
          }
        });
      }
      
      // Validation - check if complex query was properly understood
      const hasComplexUnderstanding = metadata.queryUnderstanding && 
                                     metadata.queryUnderstanding.confidence > 0 &&
                                     (metadata.queryUnderstanding.extractedInfo?.names?.length > 0 ||
                                      metadata.queryUnderstanding.extractedInfo?.companies?.length > 0 ||
                                      metadata.queryUnderstanding.extractedInfo?.context ||
                                      metadata.queryUnderstanding.searchStrategy?.complexQuery);
      
      const success = hasComplexUnderstanding && 
                     metadata.toolsUsed && 
                     metadata.toolsUsed.length > 0 &&
                     metadata.confidenceScore > 0.3; // Lower threshold for complex queries
      
      if (success) {
        console.log(chalk.green('✅ PASS'));
        passCount++;
        results.push({
          query: testCase.query,
          status: 'PASS',
          processingTime,
          confidence: metadata.confidenceScore,
          understanding: metadata.queryUnderstanding?.userIntent
        });
      } else {
        console.log(chalk.red('❌ FAIL - Complex query not properly understood'));
        failCount++;
        results.push({
          query: testCase.query,
          status: 'FAIL',
          processingTime,
          reason: 'Complex natural language not properly parsed',
          understanding: metadata.queryUnderstanding?.userIntent
        });
      }
      
      // Log processing time
      console.log(chalk.gray(`Processing Time: ${processingTime}ms`));
      
    } catch (error) {
      console.log(chalk.red(`❌ ERROR: ${error.message}`));
      failCount++;
      results.push({
        query: testCase.query,
        status: 'ERROR',
        error: error.message
      });
    }
  }
  
  // Summary
  console.log(chalk.blue.bold('\n=== Test Summary ==='));
  console.log(chalk.green(`Passed: ${passCount}`));
  console.log(chalk.red(`Failed: ${failCount}`));
  console.log(chalk.white(`Total: ${testCases.length}`));
  console.log(chalk.yellow(`Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`));
  
  // Performance metrics
  const successfulResults = results.filter(r => r.status === 'PASS');
  if (successfulResults.length > 0) {
    const avgTime = successfulResults.reduce((sum, r) => sum + r.processingTime, 0) / successfulResults.length;
    const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;
    
    console.log(chalk.blue.bold('\n=== Performance Metrics ==='));
    console.log(chalk.white(`Average Processing Time: ${avgTime.toFixed(0)}ms`));
    console.log(chalk.white(`Average Confidence Score: ${avgConfidence.toFixed(2)}`));
  }
  
  // Key insights
  console.log(chalk.blue.bold('\n=== Key Insights ==='));
  console.log(chalk.white('The CRM agent should handle complex queries with:'));
  console.log(chalk.white('- Partial information (name starts with...)'));
  console.log(chalk.white('- Contextual references (the person who...)'));
  console.log(chalk.white('- Multiple criteria combinations'));
  console.log(chalk.white('- Casual/conversational language'));
  console.log(chalk.white('- Typos and abbreviations'));
  console.log(chalk.white('- Business context (decision makers, warm leads)'));
  console.log(chalk.white('- Historical patterns (used to be engaged)'));
  
  // Understanding analysis
  console.log(chalk.blue.bold('\n=== Understanding Analysis ==='));
  const understandingMap = {};
  results.forEach(r => {
    if (r.understanding) {
      understandingMap[r.understanding] = (understandingMap[r.understanding] || 0) + 1;
    }
  });
  
  console.log(chalk.white('Query intents identified:'));
  Object.entries(understandingMap).forEach(([intent, count]) => {
    console.log(chalk.white(`- ${intent}: ${count} queries`));
  });
  
  // Failed query analysis
  const failedQueries = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
  if (failedQueries.length > 0) {
    console.log(chalk.red.bold('\n=== Failed Queries Analysis ==='));
    failedQueries.forEach(failed => {
      console.log(chalk.red(`- "${failed.query}"`));
      if (failed.reason) console.log(chalk.gray(`  Reason: ${failed.reason}`));
      if (failed.error) console.log(chalk.gray(`  Error: ${failed.error}`));
      if (failed.understanding) console.log(chalk.gray(`  Understood as: ${failed.understanding}`));
    });
  }
  
  return passCount === testCases.length;
}

// Run the test
testComplexNaturalLanguage()
  .then(allPassed => {
    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All tests passed! The CRM agent handles complex natural language excellently.'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Some tests failed. The CRM agent needs improvement in understanding complex, contextual queries.'));
    }
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red.bold('\n❌ Test suite error:'), error);
    process.exit(1);
  });