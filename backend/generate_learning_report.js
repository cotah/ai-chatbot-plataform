/**
 * Generate Learning Report
 * Run this script daily/weekly to analyze production data and identify improvements
 */

import { generateLearningReport } from './src/services/learningLoop.service.js';
import logger from './src/utils/logger.js';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printSection(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function printGap(gap, index) {
  const severityColors = {
    high: 'red',
    medium: 'yellow',
    low: 'blue',
  };
  
  log(`\n${index + 1}. [${gap.severity.toUpperCase()}] ${gap.type}`, severityColors[gap.severity]);
  log(`   Intent: ${gap.intent}`, 'cyan');
  if (gap.count) log(`   Occurrences: ${gap.count}`, 'reset');
  if (gap.fallbackRate) log(`   Fallback Rate: ${gap.fallbackRate}`, 'reset');
  if (gap.avgSimilarity) log(`   Avg Similarity: ${gap.avgSimilarity}`, 'reset');
  log(`   Recommendation: ${gap.recommendation}`, 'yellow');
  
  if (gap.examples && gap.examples.length > 0) {
    log(`   Examples:`, 'magenta');
    gap.examples.slice(0, 3).forEach(ex => {
      log(`     - "${ex}"`, 'reset');
    });
  }
}

async function main() {
  const period = process.argv[2] || 'daily';
  
  if (!['daily', 'weekly'].includes(period)) {
    log('Usage: node generate_learning_report.js [daily|weekly]', 'red');
    process.exit(1);
  }
  
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║         BTRIX LEARNING REPORT GENERATOR                  ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nGenerating ${period} report...\n`, 'blue');
  
  try {
    const report = await generateLearningReport(period);
    
    // Print Summary
    printSection('SUMMARY');
    log(`\nPeriod: ${period}`, 'cyan');
    log(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, 'cyan');
    log(`\nTotal Requests: ${report.summary.totalRequests}`, 'reset');
    log(`Fallback Rate: ${report.summary.fallbackRate}`, 'yellow');
    log(`Avg Similarity: ${report.summary.avgSimilarity}`, 'green');
    log(`Total Violations: ${report.summary.totalViolations}`, report.summary.totalViolations > 0 ? 'red' : 'green');
    log(`Avg Latency: ${report.summary.avgLatency}`, 'reset');
    
    // Print Fallbacks
    if (report.fallbacks.total > 0) {
      printSection('FALLBACK ANALYSIS');
      log(`\nTotal Fallbacks: ${report.fallbacks.total}`, 'yellow');
      
      if (report.fallbacks.patterns.length > 0) {
        log(`\nPatterns Detected: ${report.fallbacks.patterns.length}`, 'cyan');
        report.fallbacks.patterns.forEach((pattern, i) => {
          log(`\n${i + 1}. Intent: ${pattern.intent}`, 'cyan');
          log(`   Count: ${pattern.count}`, 'reset');
          log(`   Avg Similarity: ${pattern.avgSimilarity.toFixed(2)}`, 'reset');
          log(`   Common Keywords: ${pattern.commonKeywords.join(', ')}`, 'magenta');
        });
      }
      
      if (report.fallbacks.topQueries.length > 0) {
        log(`\nTop 10 Fallback Queries:`, 'cyan');
        report.fallbacks.topQueries.slice(0, 10).forEach((q, i) => {
          log(`${i + 1}. [${q.similarity.toFixed(2)}] "${q.query}"`, 'reset');
        });
      }
    } else {
      printSection('FALLBACK ANALYSIS');
      log(`\n✓ No fallbacks detected!`, 'green');
    }
    
    // Print Violations
    if (report.violations.total > 0) {
      printSection('GUARDRAIL VIOLATIONS');
      log(`\nTotal Violations: ${report.violations.total}`, 'red');
      
      if (report.violations.patterns.length > 0) {
        log(`\nViolations by Rule:`, 'cyan');
        report.violations.patterns.forEach((pattern, i) => {
          log(`\n${i + 1}. Rule: ${pattern.rule}`, 'red');
          log(`   Count: ${pattern.count}`, 'reset');
          if (pattern.examples.length > 0) {
            log(`   Examples:`, 'magenta');
            pattern.examples.forEach(ex => {
              log(`     Query: "${ex.query}"`, 'reset');
              log(`     Prices: ${ex.detectedPrices?.join(', ')}`, 'yellow');
            });
          }
        });
      }
    } else {
      printSection('GUARDRAIL VIOLATIONS');
      log(`\n✓ No violations detected!`, 'green');
    }
    
    // Print Similarity by Intent
    printSection('SIMILARITY BY INTENT');
    log(`\nOverall Avg Similarity: ${report.similarity.overall}`, 'green');
    
    if (report.similarity.byIntent.length > 0) {
      log(`\nBy Intent:`, 'cyan');
      report.similarity.byIntent.forEach(intent => {
        const color = intent.avgSimilarity < 0.60 ? 'red' : intent.avgSimilarity < 0.70 ? 'yellow' : 'green';
        log(`\n  ${intent.intent}:`, 'cyan');
        log(`    Count: ${intent.count}`, 'reset');
        log(`    Avg Similarity: ${intent.avgSimilarity.toFixed(2)}`, color);
        log(`    Fallback Rate: ${intent.fallbackRate.toFixed(1)}%`, intent.fallbackRate > 30 ? 'red' : 'green');
      });
    }
    
    // Print KB Gaps
    if (report.gaps.length > 0) {
      printSection('KNOWLEDGE BASE GAPS');
      log(`\nTotal Gaps Identified: ${report.gaps.length}`, 'yellow');
      
      const highSeverity = report.gaps.filter(g => g.severity === 'high');
      const mediumSeverity = report.gaps.filter(g => g.severity === 'medium');
      const lowSeverity = report.gaps.filter(g => g.severity === 'low');
      
      if (highSeverity.length > 0) {
        log(`\n🔴 HIGH SEVERITY (${highSeverity.length}):`, 'red');
        highSeverity.forEach((gap, i) => printGap(gap, i));
      }
      
      if (mediumSeverity.length > 0) {
        log(`\n🟡 MEDIUM SEVERITY (${mediumSeverity.length}):`, 'yellow');
        mediumSeverity.forEach((gap, i) => printGap(gap, i));
      }
      
      if (lowSeverity.length > 0) {
        log(`\n🔵 LOW SEVERITY (${lowSeverity.length}):`, 'blue');
        lowSeverity.forEach((gap, i) => printGap(gap, i));
      }
    } else {
      printSection('KNOWLEDGE BASE GAPS');
      log(`\n✓ No significant gaps detected!`, 'green');
    }
    
    // Print Recommendations
    printSection('RECOMMENDATIONS');
    
    if (report.recommendations.immediate.length > 0) {
      log(`\n🔴 IMMEDIATE ACTION REQUIRED (${report.recommendations.immediate.length}):`, 'red');
      report.recommendations.immediate.forEach((gap, i) => {
        log(`\n${i + 1}. ${gap.recommendation}`, 'red');
      });
    }
    
    if (report.recommendations.shortTerm.length > 0) {
      log(`\n🟡 SHORT-TERM IMPROVEMENTS (${report.recommendations.shortTerm.length}):`, 'yellow');
      report.recommendations.shortTerm.forEach((gap, i) => {
        log(`\n${i + 1}. ${gap.recommendation}`, 'yellow');
      });
    }
    
    if (report.recommendations.longTerm.length > 0) {
      log(`\n🔵 LONG-TERM ENHANCEMENTS (${report.recommendations.longTerm.length}):`, 'blue');
      report.recommendations.longTerm.forEach((gap, i) => {
        log(`\n${i + 1}. ${gap.recommendation}`, 'blue');
      });
    }
    
    if (report.recommendations.immediate.length === 0 && 
        report.recommendations.shortTerm.length === 0 && 
        report.recommendations.longTerm.length === 0) {
      log(`\n✓ No recommendations at this time. System performing well!`, 'green');
    }
    
    // Footer
    log('\n' + '='.repeat(60), 'cyan');
    log(`\n✓ Report saved to: logs/learning_report_${period}_*.json`, 'green');
    log(`\nNext steps:`, 'cyan');
    log(`  1. Review high-severity gaps and update KB`, 'reset');
    log(`  2. Test changes in staging`, 'reset');
    log(`  3. Deploy new KB version (v1.0.3)`, 'reset');
    log(`  4. Monitor metrics for improvements\n`, 'reset');
    
  } catch (error) {
    log(`\n❌ Error generating report: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
