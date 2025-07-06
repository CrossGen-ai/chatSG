/**
 * Test CRM detailed view formatting with mock data
 */

const { CRMWorkflowHelper } = require('../../dist/src/agents/individual/crm/workflow');

// Mock detailed contact data
const mockDetailedData = {
  contacts: [{
    id: 123,
    name: 'Peter Kelly',
    email: 'peter.kelly@example.com',
    company: 'Example Corp',
    phone: '555-1234',
    leadScore: 100,
    display: '**Peter Kelly**\n📧 peter.kelly@example.com\n🏢 Example Corp\n📞 555-1234\n🎯 Lead Score: 100/100',
    opportunities: [
      {
        id: 456,
        name: 'Enterprise Deal Q1',
        value: 250000,
        stage: 'Negotiation',
        probability: 75,
        closeDate: '2024-03-31'
      },
      {
        id: 789,
        name: 'Expansion Project',
        value: 150000,
        stage: 'Proposal',
        probability: 50,
        closeDate: '2024-04-15'
      }
    ],
    notes: 'Key decision maker for enterprise solutions',
    tags: ['Enterprise', 'High Value', 'Q1 Target']
  }],
  isDetailedView: true,
  insights: [
    'Average lead score: 100/100',
    '1 contact(s) have active opportunities'
  ],
  suggestions: [
    'Follow up on Enterprise Deal Q1',
    'Schedule demo for Expansion Project'
  ]
};

// Test regular view (no details)
const mockRegularData = {
  contacts: [{
    id: 123,
    name: 'Peter Kelly',
    email: 'peter.kelly@example.com',
    company: 'Example Corp',
    display: '**Peter Kelly**\n📧 peter.kelly@example.com\n🏢 Example Corp'
  }],
  isDetailedView: false
};

console.log('🧪 Testing CRM Response Formatting\n');

console.log('1️⃣ Testing Detailed View:');
console.log('=====================================');
const detailedResponse = CRMWorkflowHelper.formatDataForResponse(mockDetailedData, 'customer_lookup');
console.log(detailedResponse);

console.log('\n\n2️⃣ Testing Regular View:');
console.log('=====================================');
const regularResponse = CRMWorkflowHelper.formatDataForResponse(mockRegularData, 'customer_lookup');
console.log(regularResponse);

console.log('\n\n✅ Expected Behavior:');
console.log('- Detailed view should show "Full Details for Peter Kelly" header');
console.log('- Should list all opportunities with values and stages');
console.log('- Should show total opportunity value');
console.log('- Should include notes and tags');
console.log('- Regular view should just show basic contact info');