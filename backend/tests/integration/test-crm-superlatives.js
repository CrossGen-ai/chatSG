/**
 * Test CRM Agent Natural Language Processing - Superlative Queries
 * 
 * Tests the ability to understand and process natural language queries
 * using superlatives and comparative language, including:
 * - Best/worst (by lead score)
 * - Biggest/smallest (by opportunity value)
 * - Most/least (by various metrics)
 * - Top/bottom rankings
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const chalk = require('chalk');

console.log(chalk.blue.bold('\n=== CRM Natural Language Test: Superlative Queries ===\n'));

async function testSuperlativeQueries() {
  const { IndividualAgentFactory } = require('../../dist/src/agents/individual/IndividualAgentFactory');
  
  // Initialize CRM Agent
  console.log('Initializing CRM Agent...');
  const crmAgent = IndividualAgentFactory.createAgent('crm');
  await crmAgent.initialize();
  console.log(chalk.green('✅ CRM Agent initialized\n'));

  // Test cases for superlative queries
  const testCases = [
    {
      query: 'Who is our best lead?',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'lead_score',
        limit: 1,
        order: 'desc',
        description: 'Should find contact with highest lead score'
      }
    },
    {
      query: 'What\'s our biggest opportunity right now?',
      expectedBehavior: {
        intent: 'find_top_opportunities',
        metric: 'opportunity_value',
        limit: 1,
        order: 'desc',
        description: 'Should find opportunity with highest value'
      }
    },
    {
      query: 'Which contact has the highest lead score?',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'lead_score',
        limit: 1,
        order: 'desc',
        description: 'Should explicitly sort by lead score descending'
      }
    },
    {
      query: 'Show me the most valuable deals',
      expectedBehavior: {
        intent: 'find_top_opportunities',
        metric: 'opportunity_value',
        limit: 10,
        order: 'desc',
        description: 'Should return multiple high-value opportunities'
      }
    },
    {
      query: 'Who are our top 5 customers by opportunity value?',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'total_opportunity_value',
        limit: 5,
        order: 'desc',
        description: 'Should rank contacts by total opportunity value'
      }
    },
    {
      query: 'Find the most engaged contacts',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'engagement_score',
        order: 'desc',
        description: 'Should identify highly engaged contacts'
      }
    },
    {
      query: 'Which leads have the most opportunities?',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'opportunity_count',
        order: 'desc',
        description: 'Should sort by number of opportunities'
      }
    },
    {
      query: 'Show me our worst performing leads',
      expectedBehavior: {
        intent: 'find_bottom_contacts',
        metric: 'lead_score',
        order: 'asc',
        description: 'Should find contacts with lowest lead scores'
      }
    },
    {
      query: 'What are the smallest deals in our pipeline?',
      expectedBehavior: {
        intent: 'find_bottom_opportunities',
        metric: 'opportunity_value',
        order: 'asc',
        description: 'Should find opportunities with lowest values'
      }
    },
    {
      query: 'Who are the least active contacts?',
      expectedBehavior: {
        intent: 'find_inactive_contacts',
        metric: 'last_activity',
        order: 'asc',
        description: 'Should find contacts with oldest activity dates'
      }
    },
    {
      query: 'List the top 10 hottest leads',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'lead_score',
        limit: 10,
        order: 'desc',
        description: 'Should understand "hottest" as high lead score'
      }
    },
    {
      query: 'Who\'s our most promising prospect?',
      expectedBehavior: {
        intent: 'find_top_contacts',
        metric: 'lead_score',
        limit: 1,
        order: 'desc',
        description: 'Should understand "promising" as high potential'
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
        'test-session-superlatives',
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
        
        // Check for superlative understanding
        const searchStrategy = metadata.queryUnderstanding.searchStrategy;
        if (searchStrategy) {
          console.log(chalk.gray(`  Search Strategy: ${searchStrategy.primaryApproach}`));
          if (searchStrategy.rankingCriteria) {
            console.log(chalk.gray(`  Ranking Criteria: ${searchStrategy.rankingCriteria}`));
          }
        }
      }
      
      // Log tools used
      if (metadata.toolsUsed && metadata.toolsUsed.length > 0) {
        console.log(chalk.gray(`Tools Used: ${metadata.toolsUsed.join(', ')}`));
      }
      
      // Log tool parameters for sorting/ranking
      if (metadata.toolOrchestrationPlan && metadata.toolOrchestrationPlan.toolSequence) {
        const toolParams = metadata.toolOrchestrationPlan.toolSequence[0]?.parameters;
        if (toolParams) {
          console.log(chalk.gray('Tool Parameters:'));
          if (toolParams.sortBy) {
            console.log(chalk.gray(`  Sort By: ${toolParams.sortBy}`));
          }
          if (toolParams.orderBy) {
            console.log(chalk.gray(`  Order By: ${toolParams.orderBy}`));
          }
          if (toolParams.limit !== undefined) {
            console.log(chalk.gray(`  Limit: ${toolParams.limit}`));
          }
          if (toolParams.metric) {
            console.log(chalk.gray(`  Metric: ${toolParams.metric}`));
          }
        }
      }
      
      // Validation - check if superlative was understood
      const hasSuperlativeUnderstanding = metadata.queryUnderstanding && 
                                         (metadata.queryUnderstanding.userIntent.includes('top') ||
                                          metadata.queryUnderstanding.userIntent.includes('best') ||
                                          metadata.queryUnderstanding.userIntent.includes('highest') ||
                                          metadata.queryUnderstanding.userIntent.includes('most') ||
                                          metadata.queryUnderstanding.userIntent.includes('biggest') ||
                                          metadata.queryUnderstanding.userIntent.includes('rank') ||
                                          metadata.queryUnderstanding.userIntent.includes('score'));
      
      const hasSortingParams = metadata.toolOrchestrationPlan?.toolSequence?.[0]?.parameters &&
                              (metadata.toolOrchestrationPlan.toolSequence[0].parameters.sortBy ||
                               metadata.toolOrchestrationPlan.toolSequence[0].parameters.orderBy);
      
      const success = hasSuperlativeUnderstanding && 
                     metadata.toolsUsed && 
                     metadata.toolsUsed.length > 0 &&
                     hasSortingParams &&
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
        console.log(chalk.red('❌ FAIL - Superlative query not properly understood or sorted'));
        failCount++;
        results.push({
          query: testCase.query,
          status: 'FAIL',
          processingTime,
          reason: 'Superlative ranking/sorting not properly implemented'
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
  console.log(chalk.white('The CRM agent should understand superlatives for:'));
  console.log(chalk.white('- Lead quality (best, worst, most promising)'));
  console.log(chalk.white('- Deal size (biggest, smallest, most valuable)'));
  console.log(chalk.white('- Engagement metrics (most active, least engaged)'));
  console.log(chalk.white('- Rankings (top 5, bottom 10)'));
  console.log(chalk.white('- Comparative metrics (highest score, most opportunities)'));
  
  // Common metrics that should be understood
  console.log(chalk.blue.bold('\n=== Metrics Understanding ==='));
  console.log(chalk.white('Key metrics the agent should recognize:'));
  console.log(chalk.white('- Lead Score (0-100 calculated score)'));
  console.log(chalk.white('- Opportunity Value (deal size in currency)'));
  console.log(chalk.white('- Opportunity Count (number of deals)'));
  console.log(chalk.white('- Engagement Level (based on interactions)'));
  console.log(chalk.white('- Activity Recency (last interaction date)'));
  
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
testSuperlativeQueries()
  .then(allPassed => {
    if (allPassed) {
      console.log(chalk.green.bold('\n✅ All tests passed! The CRM agent handles superlative queries excellently.'));
    } else {
      console.log(chalk.yellow.bold('\n⚠️  Some tests failed. The CRM agent needs improvement in understanding superlative queries and rankings.'));
    }
    process.exit(allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error(chalk.red.bold('\n❌ Test suite error:'), error);
    process.exit(1);
  });