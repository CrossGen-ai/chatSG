/**
 * Test CRM Agent Natural Language Processing - Time-Based Queries
 * 
 * Tests the ability to understand and process natural language queries
 * with various time references and date ranges, including:
 * - Relative time (this week, last month)
 * - Specific periods (Q1, January)
 * - Date ranges (between dates)
 * - Activity-based timeframes
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== CRM Natural Language Test: Time-Based Queries ===\n'));

async function testTimeBasedQueries() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  // Initialize CRM Agent
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  console.log(chalk.green('✅ CRM Agent initialized\n'));

  // Test cases for time-based queries
  const testCases = [
    {
      query: 'Show me all contacts added this week',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'this_week',
        description: 'Should filter contacts created in current week'
      }
    },
    {
      query: 'Find leads from last quarter',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'last_quarter',
        description: 'Should understand Q-1 timeframe'
      }
    },
    {
      query: 'Who did we add in January?',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'january',
        description: 'Should filter by specific month'
      }
    },
    {
      query: 'List all contacts from 2024',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'year_2024',
        description: 'Should filter by specific year'
      }
    },
    {
      query: 'Show me leads created between Christmas and New Year',
      expectedBehavior: {
        intent: 'find_contacts_by_daterange',
        timeframe: 'holiday_period',
        description: 'Should understand holiday period references'
      }
    },
    {
      query: 'Find contacts we added in the past 7 days',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        timeframe: 'last_7_days',
        description: 'Should calculate date range for past N days'
      }
    },
    {
      query: 'Who joined us in Q1 2024?',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'q1_2024',
        description: 'Should understand quarter + year combination'
      }
    },
    {
      query: 'Show me contacts from the beginning of this month',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'month_start',
        description: 'Should filter from month start to now'
      }
    },
    {
      query: 'List everyone we\'ve added since last Monday',
      expectedBehavior: {
        intent: 'find_contacts_by_daterange',
        timeframe: 'since_last_monday',
        description: 'Should calculate from specific day reference'
      }
    },
    {
      query: 'Find contacts created over the weekend',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'last_weekend',
        description: 'Should understand weekend as Saturday-Sunday'
      }
    },
    {
      query: 'Who are the new leads from the past 30 days?',
      expectedBehavior: {
        intent: 'find_recent_contacts',
        timeframe: 'last_30_days',
        description: 'Should filter by rolling 30-day window'
      }
    },
    {
      query: 'Show me contacts added during business hours today',
      expectedBehavior: {
        intent: 'find_contacts_by_timeframe',
        timeframe: 'today_business_hours',
        description: 'Should filter by today + time range'
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
        'test-session-time-based',
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
        
        // Check for extracted time information
        if (metadata.queryUnderstanding.extractedInfo) {
          const info = metadata.queryUnderstanding.extractedInfo;
          if (info.timeReferences || info.dateRanges) {
            console.log(chalk.gray(`  Time References: ${JSON.stringify(info.timeReferences || info.dateRanges)}`));
          }
        }
      }
      
      // Log tools used
      if (metadata.toolsUsed && metadata.toolsUsed.length > 0) {
        console.log(chalk.gray(`Tools Used: ${metadata.toolsUsed.join(', ')}`));
      }
      
      // Log tool parameters for date filtering
      if (metadata.toolOrchestrationPlan && metadata.toolOrchestrationPlan.toolSequence) {
        const toolParams = metadata.toolOrchestrationPlan.toolSequence[0]?.parameters;
        if (toolParams) {
          console.log(chalk.gray('Tool Parameters:'));
          if (toolParams.dateFilter || toolParams.createdAfter || toolParams.createdBefore) {
            console.log(chalk.gray(`  Date Filtering: ${JSON.stringify({
              dateFilter: toolParams.dateFilter,
              createdAfter: toolParams.createdAfter,
              createdBefore: toolParams.createdBefore
            })}`));
          }
          if (toolParams.timeframe) {
            console.log(chalk.gray(`  Timeframe: ${toolParams.timeframe}`));
          }
        }
      }
      
      // Validation - check if time-based filtering was understood
      const hasTimeUnderstanding = metadata.queryUnderstanding && 
                                  (metadata.queryUnderstanding.userIntent.includes('time') ||
                                   metadata.queryUnderstanding.userIntent.includes('date') ||
                                   metadata.queryUnderstanding.userIntent.includes('recent') ||
                                   metadata.queryUnderstanding.userIntent.includes('period'));
      
      const success = hasTimeUnderstanding && 
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
        console.log(chalk.red('❌ FAIL - Time-based query not properly understood'));
        failCount++;
        results.push({
          query: testCase.query,
          status: 'FAIL',
          processingTime,
          reason: 'Time-based filtering not properly understood'
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
  console.log(chalk.white('The CRM agent should be able to understand:'));
  console.log(chalk.white('- Relative time references (this week, last month, etc.)'));
  console.log(chalk.white('- Specific periods (Q1, January, 2024)'));
  console.log(chalk.white('- Rolling windows (past 7 days, last 30 days)'));
  console.log(chalk.white('- Natural language date ranges (since Monday, over the weekend)'));
  console.log(chalk.white('- Business concepts (quarters, business hours)'));
  console.log(chalk.white('- Holiday and special period references'));
  
  // Failed query analysis
  const failedQueries = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR');
  if (failedQueries.length > 0) {
    console.log(chalk.red.bold('\n=== Failed Queries Analysis ==='));
    failedQueries.forEach(failed => {
      console.log(chalk.red(`- "${failed.query}"`));
      if (failed.reason) console.log(chalk.gray(`  Reason: ${failed.reason}`));
      if (failed.error) console.log(chalk.gray(`  Error: ${failed.error}`));
    });
  }
  
  return passCount === testCases.length;
}

// Run the test
testTimeBasedQueries()
  .then(allPassed => {
    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All tests passed! The CRM agent handles time-based queries excellently.'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Some tests failed. The CRM agent needs improvement in understanding time-based queries.'));
    }
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red.bold('\n❌ Test suite error:'), error);
    process.exit(1);
  });