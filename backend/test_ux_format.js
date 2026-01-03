/**
 * UX Format Tests
 * Validates that AI responses are short, WhatsApp-friendly, and well-formatted
 * 
 * Run: node test_ux_format.js
 */

import { chatCompletion } from './src/services/openai.service.js';
import { validateMessageFormat, getMessageMetrics } from './src/services/messageFormatter.service.js';
import logger from './src/utils/logger.js';

// Test cases for common scenarios
const TEST_CASES = [
  {
    name: 'Pricing question',
    messages: [
      { role: 'user', content: 'How much does BTRIX cost?' },
    ],
    maxLength: 450,
    maxQuestions: 1,
    maxBullets: 4,
  },
  {
    name: 'Agents question',
    messages: [
      { role: 'user', content: 'What AI agents do you have?' },
    ],
    maxLength: 450,
    maxQuestions: 1,
    maxBullets: 4,
  },
  {
    name: 'Support question',
    messages: [
      { role: 'user', content: 'Do you have 24/7 support?' },
    ],
    maxLength: 450,
    maxQuestions: 1,
    maxBullets: 4,
  },
  {
    name: 'Enterprise question',
    messages: [
      { role: 'user', content: 'Tell me about the Enterprise pack' },
    ],
    maxLength: 450,
    maxQuestions: 1,
    maxBullets: 4,
  },
  {
    name: 'Schedule request',
    messages: [
      { role: 'user', content: 'I want to schedule a demo' },
    ],
    maxLength: 450,
    maxQuestions: 1,
    maxBullets: 4,
  },
];

// Validation functions
function validateLength(message, maxLength) {
  return {
    passed: message.length <= maxLength,
    actual: message.length,
    expected: `<= ${maxLength}`,
    message: message.length > maxLength 
      ? `Message too long (${message.length} chars, max ${maxLength})` 
      : 'Length OK',
  };
}

function validateQuestions(message, maxQuestions) {
  const questionCount = (message.match(/\?/g) || []).length;
  return {
    passed: questionCount <= maxQuestions,
    actual: questionCount,
    expected: `<= ${maxQuestions}`,
    message: questionCount > maxQuestions 
      ? `Too many questions (${questionCount}, max ${maxQuestions})` 
      : 'Questions OK',
  };
}

function validateBullets(message, maxBullets) {
  const bulletCount = (message.match(/^[-•*]\s/gm) || []).length;
  return {
    passed: bulletCount <= maxBullets,
    actual: bulletCount,
    expected: `<= ${maxBullets}`,
    message: bulletCount > maxBullets 
      ? `Too many bullets (${bulletCount}, max ${maxBullets})` 
      : 'Bullets OK',
  };
}

function validateWallOfText(message) {
  const lineBreaks = (message.match(/\n/g) || []).length;
  const isWallOfText = message.length > 200 && lineBreaks === 0;
  return {
    passed: !isWallOfText,
    actual: lineBreaks,
    expected: '> 0 if length > 200',
    message: isWallOfText 
      ? 'Wall of text detected (no line breaks)' 
      : 'Formatting OK',
  };
}

// Test runner
async function runTests() {
  console.log('\n🧪 UX FORMAT TESTS\n');
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  const results = [];
  const allMetrics = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('-'.repeat(60));
    
    try {
      // Get completion
      const completion = await chatCompletion(testCase.messages, 'test-session', 'en');
      const message = completion.message.content;
      
      console.log(`\n💬 Response:\n"${message}"\n`);
      
      // Get metrics
      const metrics = getMessageMetrics(message);
      allMetrics.push({ test: testCase.name, ...metrics });
      
      // Run validations
      const validations = {
        length: validateLength(message, testCase.maxLength),
        questions: validateQuestions(message, testCase.maxQuestions),
        bullets: validateBullets(message, testCase.maxBullets),
        wallOfText: validateWallOfText(message),
      };
      
      // Check if all validations passed
      const allPassed = Object.values(validations).every(v => v.passed);
      
      // Log validation results
      console.log('📊 Validations:');
      Object.entries(validations).forEach(([key, result]) => {
        const icon = result.passed ? '✅' : '❌';
        console.log(`  ${icon} ${key}: ${result.message} (${result.actual} vs ${result.expected})`);
      });
      
      // Get format warnings
      const warnings = validateMessageFormat(message);
      if (warnings.length > 0) {
        console.log('\n⚠️  Format Warnings:');
        warnings.forEach(w => {
          console.log(`  - [${w.severity}] ${w.type}: ${w.message}`);
        });
      }
      
      if (allPassed) {
        console.log(`\n✅ PASSED: ${testCase.name}`);
        passed++;
        results.push({ test: testCase.name, status: 'PASSED', metrics });
      } else {
        console.log(`\n❌ FAILED: ${testCase.name}`);
        failed++;
        results.push({ 
          test: testCase.name, 
          status: 'FAILED', 
          metrics,
          failedValidations: Object.entries(validations)
            .filter(([_, v]) => !v.passed)
            .map(([key, v]) => `${key}: ${v.message}`)
        });
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${testCase.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
      results.push({ test: testCase.name, status: 'ERROR', error: error.message });
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
  
  // Average metrics
  if (allMetrics.length > 0) {
    const avgLength = allMetrics.reduce((sum, m) => sum + m.length, 0) / allMetrics.length;
    const avgQuestions = allMetrics.reduce((sum, m) => sum + m.questions, 0) / allMetrics.length;
    const avgBullets = allMetrics.reduce((sum, m) => sum + m.bulletPoints, 0) / allMetrics.length;
    const exceedingLimit = allMetrics.filter(m => m.exceedsLimit).length;
    
    console.log('\n📈 AVERAGE METRICS:');
    console.log(`  Length: ${avgLength.toFixed(0)} chars`);
    console.log(`  Questions: ${avgQuestions.toFixed(1)}`);
    console.log(`  Bullets: ${avgBullets.toFixed(1)}`);
    console.log(`  Exceeding limit (450 chars): ${exceedingLimit}/${allMetrics.length}`);
  }
  
  // Detailed results
  console.log('\n📋 DETAILED RESULTS:');
  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.test}: ${r.status}`);
    if (r.metrics) {
      console.log(`   Length: ${r.metrics.length} chars`);
      console.log(`   Questions: ${r.metrics.questions}`);
      console.log(`   Bullets: ${r.metrics.bulletPoints}`);
      console.log(`   Exceeds limit: ${r.metrics.exceedsLimit ? 'YES' : 'NO'}`);
    }
    if (r.failedValidations) {
      console.log(`   Failed: ${r.failedValidations.join(', ')}`);
    }
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
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
