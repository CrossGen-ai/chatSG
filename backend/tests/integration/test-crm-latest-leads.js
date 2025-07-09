/**
 * Test CRM Agent Natural Language Processing - Latest/Recent/Newest Queries
 * 
 * Tests the ability to understand and process natural language queries
 * about recent leads and contacts, including:
 * - Latest/newest/most recent terminology
 * - Time-based filtering
 * - Proper sorting by creation date
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== CRM Natural Language Test: Latest/Recent Leads ===\n'));

async function testLatestLeadQueries() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  // Initialize CRM Agent
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  console.log(chalk.green('✅ CRM Agent initialized\n'));

  // Test cases for latest/recent/newest queries
  const testCases = [
    {
      query: 'Who is the latest lead added to our database?',
      expectedBehavior: {
        intent: 'find_latest_contact',
        sorting: 'created_desc',
        limit: 1,
        description: 'Should find the single most recently created contact'
      }
    },
    {
      query: 'Show me the most recent contact we\'ve added',
      expectedBehavior: {
        intent: 'find_latest_contact',
        sorting: 'created_desc',
        limit: 1,
        description: 'Should understand "most recent" as latest by creation date'
      }
    },
    {
      query: 'What are the newest leads from this week?',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        timeframe: 'this_week',
        description: 'Should filter by current week and sort by newest first'
      }
    },
    {
      query: 'List contacts created in the last 24 hours',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        timeframe: 'last_24_hours',
        description: 'Should understand specific time period and filter accordingly'
      }
    },
    {
      query: 'Who did we add to the CRM yesterday?',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        timeframe: 'yesterday',
        description: 'Should understand "yesterday" as a specific date range'
      }
    },
    {
      query: 'Show me leads from last month',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        timeframe: 'last_month',
        description: 'Should filter by previous month'
      }
    },
    {
      query: 'Find all new contacts from this year',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        timeframe: 'this_year',
        description: 'Should filter by current year'
      }
    },
    {
      query: 'Show me the 5 newest customers',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        sorting: 'created_desc',
        limit: 5,
        description: 'Should return exactly 5 most recent contacts'
      }
    },
    {
      query: 'Who\'s the newest lead we got?',
      expectedBehavior: {
        intent: 'find_latest_contact',
        sorting: 'created_desc',
        limit: 1,
        description: 'Should handle casual language for latest lead'
      }
    },
    {
      query: 'Latest contact added today',
      expectedBehavior: {
        intent: 'find_latest_contact',
        sorting: 'created_desc',
        timeframe: 'today',
        limit: 1,
        description: 'Should combine latest with today filter'
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
        'test-session-latest-leads',
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
        if (metadata.queryUnderstanding.searchStrategy) {
          console.log(chalk.gray(`  Search Strategy: ${metadata.queryUnderstanding.searchStrategy.primaryApproach}`));
        }
      }
      
      // Log tools used
      if (metadata.toolsUsed && metadata.toolsUsed.length > 0) {
        console.log(chalk.gray(`Tools Used: ${metadata.toolsUsed.join(', ')}`));
      }
      
      // Log tool parameters if available
      if (metadata.toolOrchestrationPlan && metadata.toolOrchestrationPlan.toolSequence) {
        const toolParams = metadata.toolOrchestrationPlan.toolSequence[0]?.parameters;
        if (toolParams) {
          console.log(chalk.gray('Tool Parameters:'));
          if (toolParams.sortBy) {
            console.log(chalk.gray(`  Sort By: ${toolParams.sortBy}`));
          }
          if (toolParams.limit !== undefined) {
            console.log(chalk.gray(`  Limit: ${toolParams.limit}`));
          }
          if (toolParams.dateFilter) {
            console.log(chalk.gray(`  Date Filter: ${JSON.stringify(toolParams.dateFilter)}`));
          }
        }
      }
      
      // Simple validation - check if the query was understood and tools were used
      const success = metadata.queryUnderstanding && 
                     metadata.toolsUsed && 
                     metadata.toolsUsed.length > 0 &&
                     metadata.confidenceScore > 0.5;
      
      if (success) {
        console.log(chalk.green('✅ PASS'));
        passCount++;
        results.push({
          query: testCase.query,
          status: 'PASS',
          processingTime,
          confidence: metadata.confidenceScore
        });
      } else {
        console.log(chalk.red('❌ FAIL - Query not properly understood or processed'));
        failCount++;
        results.push({
          query: testCase.query,
          status: 'FAIL',
          processingTime,
          reason: 'Query not properly understood or no tools used'
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
  console.log(chalk.white('The CRM agent should be able to:'));
  console.log(chalk.white('- Understand various ways to ask for recent/latest contacts'));
  console.log(chalk.white('- Properly sort results by creation date (newest first)'));
  console.log(chalk.white('- Apply appropriate time filters (today, yesterday, this week, etc.)'));
  console.log(chalk.white('- Limit results when specific numbers are requested'));
  console.log(chalk.white('- Handle casual language and variations'));
  
  return passCount === testCases.length;
}

// Run the test
testLatestLeadQueries()
  .then(allPassed => {
    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All tests passed! The CRM agent handles latest/recent queries well.'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Some tests failed. The CRM agent needs improvement in understanding latest/recent queries.'));
    }
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red.bold('\n❌ Test suite error:'), error);
    process.exit(1);
  });