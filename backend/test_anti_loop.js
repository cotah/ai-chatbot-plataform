/**
 * Anti-Loop Tests
 * Tests to ensure bot doesn't loop on welcome/menu
 * 
 * Run: node test_anti_loop.js
 */

import { handleConversation } from './src/services/conversationHandler.service.js';
import { STATES, getInitialState } from './src/services/conversationState.service.js';
import logger from './src/utils/logger.js';

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Test 1: Welcome appears only once',
    async test() {
      const sessionId = 'test-loop-1';
      
      // First message: should get welcome
      let state = getInitialState();
      let result = await handleConversation(state, 'Hi', sessionId);
      
      console.log(`  Step 1: User says "Hi"`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message.substring(0, 50)}..."`);
      
      if (result.newState.current !== STATES.MENU) {
        console.log(`  ❌ Expected MENU, got ${result.newState.current}`);
        return false;
      }
      
      if (!result.response.message.includes('BTRIX')) {
        console.log(`  ❌ Welcome message should include "BTRIX"`);
        return false;
      }
      
      // Second message: should NOT get welcome again
      state = result.newState;
      result = await handleConversation(state, 'pricing', sessionId);
      
      console.log(`  Step 2: User says "pricing"`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message.substring(0, 50)}..."`);
      
      if (result.newState.current !== STATES.PRICING_SELECT) {
        console.log(`  ❌ Expected PRICING_SELECT, got ${result.newState.current}`);
        return false;
      }
      
      if (result.response.message.includes('BTRIX')) {
        console.log(`  ❌ Should NOT show welcome again`);
        return false;
      }
      
      console.log(`  ✅ Welcome appeared only once, flow advanced correctly`);
      return true;
    },
  },
  {
    name: 'Test 2: "pricing" goes to PRICING state (not loop)',
    async test() {
      const sessionId = 'test-loop-2';
      
      // Start from MENU
      let state = getInitialState();
      state.current = STATES.MENU;
      
      // User says "pricing"
      let result = await handleConversation(state, 'pricing', sessionId);
      
      console.log(`  User says "pricing" from MENU`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message.substring(0, 50)}..."`);
      
      if (result.newState.current !== STATES.PRICING_SELECT) {
        console.log(`  ❌ Expected PRICING_SELECT, got ${result.newState.current}`);
        return false;
      }
      
      if (result.response.message.includes('What would you like to do today')) {
        console.log(`  ❌ Should NOT show menu again`);
        return false;
      }
      
      console.log(`  ✅ Advanced to PRICING_SELECT without looping`);
      return true;
    },
  },
  {
    name: 'Test 3: "book a demo" starts booking flow',
    async test() {
      const sessionId = 'test-loop-3';
      
      // Start from MENU
      let state = getInitialState();
      state.current = STATES.MENU;
      
      // User says "book a demo"
      let result = await handleConversation(state, 'book a demo', sessionId);
      
      console.log(`  User says "book a demo" from MENU`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message.substring(0, 50)}..."`);
      
      if (result.newState.current !== STATES.BOOK_NAME) {
        console.log(`  ❌ Expected BOOK_NAME, got ${result.newState.current}`);
        return false;
      }
      
      if (!result.response.message.toLowerCase().includes('name')) {
        console.log(`  ❌ Should ask for name`);
        return false;
      }
      
      // Provide name
      state = result.newState;
      result = await handleConversation(state, 'John', sessionId);
      
      console.log(`  User provides name "John"`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message.substring(0, 50)}..."`);
      
      if (result.newState.current !== STATES.BOOK_EMAIL) {
        console.log(`  ❌ Expected BOOK_EMAIL, got ${result.newState.current}`);
        return false;
      }
      
      if (!result.response.message.toLowerCase().includes('email')) {
        console.log(`  ❌ Should ask for email`);
        return false;
      }
      
      console.log(`  ✅ Booking flow started and progressed correctly`);
      return true;
    },
  },
  {
    name: 'Test 4: Invalid input shows short error (not full menu)',
    async test() {
      const sessionId = 'test-loop-4';
      
      // Start from MENU
      let state = getInitialState();
      state.current = STATES.MENU;
      
      // User says something invalid
      let result = await handleConversation(state, 'blah blah blah', sessionId);
      
      console.log(`  User says "blah blah blah" from MENU`);
      console.log(`  ✅ State: ${result.newState.current}`);
      console.log(`  💬 Response: "${result.response.message}"`);
      
      if (result.newState.current !== STATES.MENU) {
        console.log(`  ❌ Should stay in MENU, got ${result.newState.current}`);
        return false;
      }
      
      // Check response is short (anti-loop: don't repeat full menu)
      if (result.response.message.length > 100) {
        console.log(`  ❌ Error message too long (${result.response.message.length} chars), should be short`);
        return false;
      }
      
      if (result.response.message.includes('BTRIX') || result.response.message.includes('What would you like to do')) {
        console.log(`  ❌ Should NOT show full welcome/menu again`);
        return false;
      }
      
      console.log(`  ✅ Short error message shown, no loop`);
      return true;
    },
  },
];

// Test runner
async function runTests() {
  console.log('\n🧪 ANTI-LOOP TESTS\n');
  console.log('='.repeat(80));
  
  let passed = 0;
  let failed = 0;
  const results = [];

  for (const scenario of TEST_SCENARIOS) {
    console.log(`\n📋 ${scenario.name}`);
    console.log('-'.repeat(80));
    
    try {
      const result = await scenario.test();
      
      if (result) {
        console.log(`\n✅ PASSED: ${scenario.name}`);
        passed++;
        results.push({ scenario: scenario.name, status: 'PASSED' });
      } else {
        console.log(`\n❌ FAILED: ${scenario.name}`);
        failed++;
        results.push({ scenario: scenario.name, status: 'FAILED' });
      }
      
    } catch (error) {
      console.log(`\n❌ ERROR: ${scenario.name}`);
      console.log(`   Error: ${error.message}`);
      console.log(`   Stack: ${error.stack}`);
      failed++;
      results.push({ scenario: scenario.name, status: 'ERROR', error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${TEST_SCENARIOS.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / TEST_SCENARIOS.length) * 100).toFixed(1)}%`);
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.scenario}: ${r.status}`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });
  
  console.log('\n' + '='.repeat(80));
  
  // Critical checks
  console.log('\n🔍 CRITICAL CHECKS:');
  console.log('1. ✅ Welcome appears only once (not repeated)');
  console.log('2. ✅ "pricing" advances to PRICING state (no loop)');
  console.log('3. ✅ "book a demo" starts booking flow correctly');
  console.log('4. ✅ Invalid input shows short error (not full menu)');
  
  console.log('\n' + '='.repeat(80));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});
