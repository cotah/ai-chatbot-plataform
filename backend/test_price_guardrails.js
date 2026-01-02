/**
 * Test Price Guardrails with Malicious Queries
 * Tests that guardrails block invalid prices
 */

import { checkPriceGuardrails, detectPrices, validatePrices } from './src/services/priceGuardrails.service.js';

console.log('🧪 TESTING PRICE GUARDRAILS\n');
console.log('=' .repeat(60));

// Test cases: [description, responseText, shouldPass]
const testCases = [
  // VALID CASES (should pass)
  {
    name: 'Valid Essential price',
    response: 'BTRIX ESSENTIAL costs €1,400 setup + €300/month',
    shouldPass: true,
  },
  {
    name: 'Valid Pro price',
    response: 'The PRO plan is €2,200 setup and €550 monthly',
    shouldPass: true,
  },
  {
    name: 'Valid Agent price',
    response: 'Each AI agent costs €200 per month',
    shouldPass: true,
  },
  {
    name: 'Valid Bundle price',
    response: 'The Essential + Agents bundle is €430/month, saving you €250',
    shouldPass: true,
  },
  {
    name: 'No prices mentioned',
    response: 'BTRIX helps you automate operations. Would you like to schedule a demo?',
    shouldPass: true,
  },
  
  // INVALID CASES (should fail - malicious)
  {
    name: 'Calculated price (INVALID)',
    response: 'If you get 3 agents, that would be €600 per month total',
    shouldPass: false,
  },
  {
    name: 'Rounded price (INVALID)',
    response: 'The setup is around €1,500',
    shouldPass: false,
  },
  {
    name: 'Inferred discount (INVALID)',
    response: 'With the bundle you save approximately €300',
    shouldPass: false,
  },
  {
    name: 'Made-up price (INVALID)',
    response: 'The starter pack is €250/month',
    shouldPass: false,
  },
  {
    name: 'Wrong currency (INVALID)',
    response: 'BTRIX ESSENTIAL costs $1,400 setup',
    shouldPass: false,
  },
  {
    name: 'Summed agents (INVALID)',
    response: 'Sales + Marketing agents together cost €400/month',
    shouldPass: false,
  },
  {
    name: 'Estimated price (INVALID)',
    response: 'For your business, it would be about €2,000 setup',
    shouldPass: false,
  },
  {
    name: 'Partial price (INVALID)',
    response: 'The monthly fee is €299',
    shouldPass: false,
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`Response: "${testCase.response.substring(0, 80)}..."`);
  
  const result = checkPriceGuardrails(testCase.response);
  
  const actualPass = result.passed;
  const expectedPass = testCase.shouldPass;
  
  if (actualPass === expectedPass) {
    console.log(`✅ PASS - Guardrail ${actualPass ? 'allowed' : 'blocked'} as expected`);
    passed++;
  } else {
    console.log(`❌ FAIL - Expected ${expectedPass ? 'pass' : 'block'}, got ${actualPass ? 'pass' : 'block'}`);
    failed++;
  }
  
  if (result.detectedPrices.length > 0) {
    console.log(`   Detected prices: ${result.detectedPrices.join(', ')}`);
  }
  
  if (result.invalidPrices.length > 0) {
    console.log(`   Invalid prices: ${result.invalidPrices.join(', ')}`);
  }
  
  console.log(`   Reason: ${result.reason}`);
});

console.log('\n' + '='.repeat(60));
console.log(`\n📊 RESULTS: ${passed}/${testCases.length} tests passed`);

if (failed > 0) {
  console.log(`\n⚠️  ${failed} tests FAILED`);
  process.exit(1);
} else {
  console.log('\n✅ ALL TESTS PASSED - Guardrails are working correctly!');
  process.exit(0);
}
