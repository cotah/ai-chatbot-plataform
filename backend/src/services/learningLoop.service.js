/**
 * BTRIX Learning Loop Service
 * Analyze production data to identify gaps and improvement opportunities
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { metricsCollector } from './observability.service.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyze fallback queries to identify KB gaps
 */
export function analyzeFallbacks() {
  const metrics = metricsCollector.getMetrics();
  
  // Get queries that fell below threshold
  const fallbackQueries = metrics.requests
    .filter(req => req.belowThreshold)
    .map(req => ({
      query: req.query,
      similarity: req.topSimilarity,
      intentTags: req.intentTags,
      timestamp: req.timestamp,
      language: req.language,
    }));
  
  // Group by intent
  const byIntent = {};
  fallbackQueries.forEach(fq => {
    const intent = fq.intentTags?.[0] || 'unknown';
    if (!byIntent[intent]) {
      byIntent[intent] = [];
    }
    byIntent[intent].push(fq);
  });
  
  // Find patterns
  const patterns = [];
  Object.entries(byIntent).forEach(([intent, queries]) => {
    if (queries.length >= 3) {
      // Extract common keywords
      const allWords = queries
        .map(q => q.query.toLowerCase().split(/\s+/))
        .flat()
        .filter(word => word.length > 3);
      
      const wordFreq = {};
      allWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      const commonWords = Object.entries(wordFreq)
        .filter(([word, freq]) => freq >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
      
      patterns.push({
        intent,
        count: queries.length,
        avgSimilarity: queries.reduce((sum, q) => sum + q.similarity, 0) / queries.length,
        commonKeywords: commonWords,
        examples: queries.slice(0, 3).map(q => q.query),
      });
    }
  });
  
  return {
    total: fallbackQueries.length,
    byIntent,
    patterns,
    topQueries: fallbackQueries
      .sort((a, b) => a.similarity - b.similarity)
      .slice(0, 20),
  };
}

/**
 * Analyze guardrail violations
 */
export async function analyzeViolations() {
  try {
    const logPath = path.join(__dirname, '../../logs/price_violations.log');
    
    // Check if file exists
    try {
      await fs.access(logPath);
    } catch {
      return {
        total: 0,
        violations: [],
        patterns: [],
      };
    }
    
    // Read violations log
    const content = await fs.readFile(logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line);
    
    const violations = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(v => v !== null);
    
    // Group by rule violated
    const byRule = {};
    violations.forEach(v => {
      const rule = v.ruleViolated || 'unknown';
      if (!byRule[rule]) {
        byRule[rule] = [];
      }
      byRule[rule].push(v);
    });
    
    // Extract patterns
    const patterns = Object.entries(byRule).map(([rule, viols]) => ({
      rule,
      count: viols.length,
      examples: viols.slice(0, 3).map(v => ({
        query: v.query?.substring(0, 100),
        detectedPrices: v.detectedPrices,
        responseSnippet: v.responseBlocked?.substring(0, 150),
      })),
    }));
    
    return {
      total: violations.length,
      byRule,
      patterns,
      recent: violations.slice(-10),
    };
  } catch (error) {
    logger.error('Error analyzing violations', { error: error.message });
    return {
      total: 0,
      violations: [],
      patterns: [],
      error: error.message,
    };
  }
}

/**
 * Analyze similarity by intent
 */
export function analyzeSimilarityByIntent() {
  const metrics = metricsCollector.getMetrics();
  
  const byIntent = {};
  
  metrics.requests.forEach(req => {
    const intent = req.intentTags?.[0] || 'unknown';
    if (!byIntent[intent]) {
      byIntent[intent] = {
        count: 0,
        totalSimilarity: 0,
        belowThreshold: 0,
        queries: [],
      };
    }
    
    byIntent[intent].count++;
    byIntent[intent].totalSimilarity += req.topSimilarity || 0;
    if (req.belowThreshold) {
      byIntent[intent].belowThreshold++;
    }
    byIntent[intent].queries.push({
      query: req.query?.substring(0, 100),
      similarity: req.topSimilarity,
      belowThreshold: req.belowThreshold,
    });
  });
  
  // Calculate averages
  const summary = Object.entries(byIntent).map(([intent, data]) => ({
    intent,
    count: data.count,
    avgSimilarity: data.totalSimilarity / data.count,
    fallbackRate: (data.belowThreshold / data.count) * 100,
    weakQueries: data.queries
      .filter(q => q.similarity < 0.60)
      .slice(0, 5),
  })).sort((a, b) => b.count - a.count);
  
  return {
    byIntent: summary,
    overallAvg: metrics.requests.reduce((sum, r) => sum + (r.topSimilarity || 0), 0) / metrics.requests.length,
  };
}

/**
 * Identify KB gaps based on fallbacks and low similarity
 */
export function identifyKBGaps() {
  const fallbacks = analyzeFallbacks();
  const similarity = analyzeSimilarityByIntent();
  
  const gaps = [];
  
  // Gap 1: High fallback rate for specific intent
  similarity.byIntent.forEach(intent => {
    if (intent.fallbackRate > 30 && intent.count >= 5) {
      gaps.push({
        type: 'high_fallback_rate',
        intent: intent.intent,
        severity: 'high',
        fallbackRate: intent.fallbackRate.toFixed(1) + '%',
        count: intent.count,
        recommendation: `Add more content about "${intent.intent}" to the KB. Current fallback rate is ${intent.fallbackRate.toFixed(1)}%.`,
        examples: intent.weakQueries.map(q => q.query),
      });
    }
  });
  
  // Gap 2: Recurring fallback patterns
  fallbacks.patterns.forEach(pattern => {
    if (pattern.count >= 5) {
      gaps.push({
        type: 'recurring_pattern',
        intent: pattern.intent,
        severity: 'medium',
        count: pattern.count,
        avgSimilarity: pattern.avgSimilarity.toFixed(2),
        keywords: pattern.commonKeywords,
        recommendation: `Users frequently ask about "${pattern.commonKeywords.join(', ')}" but similarity is low (${pattern.avgSimilarity.toFixed(2)}). Consider adding dedicated content.`,
        examples: pattern.examples,
      });
    }
  });
  
  // Gap 3: Low similarity for specific intent
  similarity.byIntent.forEach(intent => {
    if (intent.avgSimilarity < 0.60 && intent.count >= 5) {
      gaps.push({
        type: 'low_similarity',
        intent: intent.intent,
        severity: 'medium',
        avgSimilarity: intent.avgSimilarity.toFixed(2),
        count: intent.count,
        recommendation: `Intent "${intent.intent}" has low average similarity (${intent.avgSimilarity.toFixed(2)}). Review and improve existing content or add synonyms.`,
        examples: intent.weakQueries.map(q => q.query),
      });
    }
  });
  
  return gaps.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Generate daily/weekly learning report
 */
export async function generateLearningReport(period = 'daily') {
  const metrics = metricsCollector.getMetrics();
  const fallbacks = analyzeFallbacks();
  const violations = await analyzeViolations();
  const similarity = analyzeSimilarityByIntent();
  const gaps = identifyKBGaps();
  
  const report = {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRequests: metrics.totalRequests,
      fallbackRate: metrics.fallbackRate.toFixed(1) + '%',
      avgSimilarity: similarity.overallAvg.toFixed(2),
      totalViolations: violations.total,
      avgLatency: metrics.avgLatency.toFixed(0) + 'ms',
    },
    fallbacks: {
      total: fallbacks.total,
      patterns: fallbacks.patterns,
      topQueries: fallbacks.topQueries.slice(0, 10),
    },
    violations: {
      total: violations.total,
      patterns: violations.patterns,
      recent: violations.recent,
    },
    similarity: {
      overall: similarity.overallAvg.toFixed(2),
      byIntent: similarity.byIntent,
    },
    gaps: gaps,
    recommendations: {
      immediate: gaps.filter(g => g.severity === 'high'),
      shortTerm: gaps.filter(g => g.severity === 'medium'),
      longTerm: gaps.filter(g => g.severity === 'low'),
    },
  };
  
  // Save report to file
  const reportPath = path.join(__dirname, '../../logs', `learning_report_${period}_${Date.now()}.json`);
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  
  logger.info('Learning report generated', {
    period,
    reportPath,
    totalRequests: report.summary.totalRequests,
    fallbackRate: report.summary.fallbackRate,
    gaps: gaps.length,
  });
  
  return report;
}

/**
 * Get learning insights for dashboard
 */
export function getLearningInsights() {
  const fallbacks = analyzeFallbacks();
  const similarity = analyzeSimilarityByIntent();
  const gaps = identifyKBGaps();
  
  return {
    topFallbackQueries: fallbacks.topQueries.slice(0, 20),
    weakIntents: similarity.byIntent
      .filter(i => i.avgSimilarity < 0.60 || i.fallbackRate > 30)
      .slice(0, 5),
    criticalGaps: gaps.filter(g => g.severity === 'high'),
    improvementOpportunities: gaps.slice(0, 10),
  };
}

export default {
  analyzeFallbacks,
  analyzeViolations,
  analyzeSimilarityByIntent,
  identifyKBGaps,
  generateLearningReport,
  getLearningInsights,
};
