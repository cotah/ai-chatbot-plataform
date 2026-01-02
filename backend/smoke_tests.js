/**
 * BTRIX Production Smoke Tests
 * Run before and after deployment to ensure system is working correctly
 */

import { retrieveBrainContext } from './src/services/rag.service.js';
import { validatePrices } from './src/services/priceGuardrails.service.js';
import config from './src/config/index.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

// Test cases covering critical paths
const SMOKE_TESTS = [
  {
    id: 'pricing_essential',
    category: 'pricing',
    query: 'How much does BTRIX ESSENTIAL cost?',
    expectedTags: ['pricing', 'packs'],
    minSimilarity: 0.60,
    mustContainPrices: ['€1,400', '€300'],
  },
  {
    id: 'pricing_pro',
    category: 'pricing',
    query: 'What is the price of BTRIX PRO?',
    expectedTags: ['pricing', 'packs'],
    minSimilarity: 0.60,
    mustContainPrices: ['€2,200', '€550'],
  },
  {
    id: 'agents_list',
    category: 'agents',
    query: 'What AI agents are available?',
    expectedTags: ['agents'],
    minSimilarity: 0.55,
    mustContain: ['Sales Agent', 'Marketing Agent', 'Finance Agent'],
  },
  {
    id: 'agents_pricing',
    category: 'agents',
    query: 'How much do agents cost?',
    expectedTags: ['agents', 'pricing'],
    minSimilarity: 0.55,
    mustContainPrices: ['€200', '€180'],
  },
  {
    id: 'support',
    category: 'support',
    query: 'Do you provide 24/7 support?',
    expectedTags: ['support'],
    minSimilarity: 0.55,
    mustContain: ['AI 24/7', 'business hours'],
  },
  {
    id: 'enterprise',
    category: 'enterprise',
    query: 'What is included in BTRIX CUSTOM/ENTERPRISE?',
    expectedTags: ['enterprise', 'packs'],
    minSimilarity: 0.55,
    mustContain: ['custom', 'enterprise'],
  },
  {
    id: 'limits',
    category: 'limits',
    query: 'What does BTRIX NOT do?',
    expectedTags: ['limits'],
    minSimilarity: 0.60,
    mustContain: ['not', 'doesn\'t'],
  },
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Run a single smoke test
 */
async function runTest(test) {
  try {
    // Retrieve context
    const result = await retrieveBrainContext(test.query, {
      maxChunks: 6,
    });
    
    const passed = [];
    const failed = [];
    
    // Check 1: Not below threshold
    if (result.belowThreshold) {
      failed.push(`Below threshold (${result.topSimilarity?.toFixed(2)})`);
    } else {
      passed.push(`Above threshold (${result.topSimilarity?.toFixed(2)})`);
    }
    
    // Check 2: Minimum similarity
    if (result.topSimilarity >= test.minSimilarity) {
      passed.push(`Similarity OK (${result.topSimilarity?.toFixed(2)} >= ${test.minSimilarity})`);
    } else {
      failed.push(`Low similarity (${result.topSimilarity?.toFixed(2)} < ${test.minSimilarity})`);
    }
    
    // Check 3: Expected tags
    if (test.expectedTags) {
      const hasExpectedTag = test.expectedTags.some(tag => 
        result.intentTags?.includes(tag)
      );
      if (hasExpectedTag) {
        passed.push(`Tags OK (${result.intentTags?.join(', ')})`);
      } else {
        failed.push(`Missing tags (got: ${result.intentTags?.join(', ')}, expected: ${test.expectedTags.join(', ')})`);
      }
    }
    
    // Check 4: Must contain text
    if (test.mustContain && result.context) {
      const missingText = test.mustContain.filter(text => 
        !result.context.toLowerCase().includes(text.toLowerCase())
      );
      if (missingText.length === 0) {
        passed.push(`Content OK (all required text found)`);
      } else {
        failed.push(`Missing content: ${missingText.join(', ')}`);
      }
    }
    
    // Check 5: Must contain prices
    if (test.mustContainPrices && result.context) {
      const missingPrices = test.mustContainPrices.filter(price => 
        !result.context.includes(price)
      );
      if (missingPrices.length === 0) {
        passed.push(`Prices OK (all required prices found)`);
      } else {
        failed.push(`Missing prices: ${missingPrices.join(', ')}`);
      }
    }
    
    // Check 6: Chunks retrieved
    if (result.chunksUsed > 0) {
      passed.push(`Chunks retrieved (${result.chunksUsed})`);
    } else {
      failed.push(`No chunks retrieved`);
    }
    
    return {
      id: test.id,
      category: test.category,
      query: test.query,
      passed: failed.length === 0,
      checks: {
        passed,
        failed,
      },
      metadata: {
        topSimilarity: result.topSimilarity,
        intentTags: result.intentTags,
        chunksUsed: result.chunksUsed,
        belowThreshold: result.belowThreshold,
      },
    };
  } catch (error) {
    return {
      id: test.id,
      category: test.category,
      query: test.query,
      passed: false,
      checks: {
        passed: [],
        failed: [`Error: ${error.message}`],
      },
      metadata: {
        error: error.message,
      },
    };
  }
}

/**
 * Check database connectivity
 */
async function checkDatabase() {
  try {
    const { data, error } = await supabase
      .from('knowledge_chunks')
      .select('brain_id')
      .eq('brain_id', config.brain.id)
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return {
        passed: false,
        message: `Brain version ${config.brain.version} not found in database`,
      };
    }
    
    return {
      passed: true,
      message: `Brain version ${config.brain.version} found in database`,
    };
  } catch (error) {
    return {
      passed: false,
      message: `Database error: ${error.message}`,
    };
  }
}

/**
 * Check environment variables
 */
function checkEnvironment() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'OPENAI_API_KEY',
    'BRAIN_VERSION',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    return {
      passed: false,
      message: `Missing env vars: ${missing.join(', ')}`,
    };
  }
  
  return {
    passed: true,
    message: `All required env vars present`,
    brainVersion: config.brain.version,
    brainId: config.brain.id,
  };
}

/**
 * Run all smoke tests
 */
async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║         BTRIX PRODUCTION SMOKE TESTS                     ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  // Pre-flight checks
  log('🔍 Pre-flight Checks\n', 'blue');
  
  // Check 1: Environment
  const envCheck = checkEnvironment();
  if (envCheck.passed) {
    log(`✓ Environment: ${envCheck.message}`, 'green');
    log(`  Brain Version: ${envCheck.brainVersion}`, 'cyan');
    log(`  Brain ID: ${envCheck.brainId}`, 'cyan');
  } else {
    log(`✗ Environment: ${envCheck.message}`, 'red');
    process.exit(1);
  }
  
  // Check 2: Database
  const dbCheck = await checkDatabase();
  if (dbCheck.passed) {
    log(`✓ Database: ${dbCheck.message}\n`, 'green');
  } else {
    log(`✗ Database: ${dbCheck.message}\n`, 'red');
    process.exit(1);
  }
  
  // Run smoke tests
  log('🧪 Running Smoke Tests\n', 'blue');
  
  const results = [];
  let passedCount = 0;
  let failedCount = 0;
  
  for (const test of SMOKE_TESTS) {
    log(`Testing: ${test.id} (${test.category})`, 'cyan');
    log(`Query: "${test.query}"`, 'cyan');
    
    const result = await runTest(test);
    results.push(result);
    
    if (result.passed) {
      passedCount++;
      log(`✓ PASSED\n`, 'green');
    } else {
      failedCount++;
      log(`✗ FAILED\n`, 'red');
      
      // Show failures
      result.checks.failed.forEach(failure => {
        log(`  - ${failure}`, 'red');
      });
      log('', 'reset');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST SUMMARY                          ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝\n', 'cyan');
  
  log(`Total Tests: ${SMOKE_TESTS.length}`, 'cyan');
  log(`Passed: ${passedCount}`, passedCount === SMOKE_TESTS.length ? 'green' : 'yellow');
  log(`Failed: ${failedCount}`, failedCount === 0 ? 'green' : 'red');
  log(`Success Rate: ${((passedCount / SMOKE_TESTS.length) * 100).toFixed(1)}%\n`, 
      passedCount === SMOKE_TESTS.length ? 'green' : 'yellow');
  
  // Detailed results
  if (failedCount > 0) {
    log('Failed Tests:', 'red');
    results.filter(r => !r.passed).forEach(result => {
      log(`\n  ${result.id}:`, 'red');
      result.checks.failed.forEach(failure => {
        log(`    - ${failure}`, 'red');
      });
    });
    log('', 'reset');
  }
  
  // Exit code
  if (failedCount > 0) {
    log('❌ SMOKE TESTS FAILED - DO NOT DEPLOY', 'red');
    process.exit(1);
  } else {
    log('✅ ALL SMOKE TESTS PASSED - READY FOR PRODUCTION', 'green');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
