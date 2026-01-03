/**
 * Booking Flow Smoke Test
 * Tests schedule_demo tool call flow end-to-end
 * 
 * Run: node test_booking_flow.js
 */

import { chatCompletion } from './src/services/openai.service.js';
import { handleToolCall } from './src/services/tool-handlers.js';
import logger from './src/utils/logger.js';

// Test cases
const TEST_CASES = [
  {
    name: 'Booking with specific time',
    messages: [
      { role: 'user', content: 'I want to schedule a demo' },
      { role: 'assistant', content: 'Great! To schedule a demo, I need some information. What type of business do you have?' },
      { role: 'user', content: 'I have a restaurant' },
      { role: 'assistant', content: 'Perfect! What\'s your main customer communication channel?' },
      { role: 'user', content: 'WhatsApp' },
      { role: 'assistant', content: 'How many leads/messages do you handle per day?' },
      { role: 'user', content: 'About 100 per day' },
      { role: 'assistant', content: 'What\'s your main goal with automation?' },
      { role: 'user', content: 'I want to automate reservations' },
      { role: 'assistant', content: 'Based on your restaurant with 100 leads/day on WhatsApp, I recommend the Pro pack. Would you like to schedule a demo?' },
      { role: 'user', content: 'Yes, Monday 05/01/2026 at 3pm. My name is John Doe, email john@example.com, phone +1234567890, company is Doe Restaurant' },
    ],
    expectedTool: 'schedule_demo',
    expectedSuccess: true,
  },
  {
    name: 'Booking without specific time',
    messages: [
      { role: 'user', content: 'I want to see a demo. My name is Jane Smith, email jane@test.com, phone +9876543210' },
    ],
    expectedTool: 'schedule_demo',
    expectedSuccess: true,
  },
  {
    name: 'Lead qualification',
    messages: [
      { role: 'user', content: 'I have a clinic with 50 leads per day on WhatsApp, I want to automate scheduling' },
    ],
    expectedTool: 'qualify_lead',
    expectedSuccess: true,
  },
];

// Test runner
async function runTests() {
  console.log('\n🧪 BOOKING FLOW SMOKE TESTS\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('-'.repeat(60));
    
    try {
      // Get completion
      const completion = await chatCompletion(testCase.messages, 'test-session', 'en');
      
      // Check for tool calls
      if (!completion.message.tool_calls || completion.message.tool_calls.length === 0) {
        throw new Error('No tool calls generated');
      }
      
      const toolCall = completion.message.tool_calls[0];
      const toolName = toolCall.function.name;
      
      console.log(`✅ Tool called: ${toolName}`);
      
      // Verify expected tool
      if (toolName !== testCase.expectedTool) {
        throw new Error(`Expected tool "${testCase.expectedTool}", got "${toolName}"`);
      }
      
      // Execute tool call
      const result = await handleToolCall(
        {
          id: toolCall.id,
          name: toolName,
          arguments: toolCall.function.arguments,
        },
        'test-session'
      );
      
      console.log(`✅ Tool executed: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Check for unknown tool fallback
      if (result.fallback && result.unknownTool) {
        console.log(`⚠️  Unknown tool fallback activated: ${result.unknownTool}`);
      }
      
      // Verify success
      if (testCase.expectedSuccess && !result.success) {
        throw new Error('Expected success but got failure');
      }
      
      console.log(`✅ PASSED: ${testCase.name}`);
      passed++;
      results.push({ test: testCase.name, status: 'PASSED', tool: toolName });
      
    } catch (error) {
      console.log(`❌ FAILED: ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      results.push({ test: testCase.name, status: 'FAILED', error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total: ${TEST_CASES.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.test}: ${r.status}`);
    if (r.tool) console.log(`   Tool: ${r.tool}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
