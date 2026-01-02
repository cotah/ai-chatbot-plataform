/**
 * Observability Service
 * Structured logging for RAG operations and metrics collection
 */

import logger from '../utils/logger.js';

/**
 * Log RAG request with structured data
 */
export function logRAGRequest(data) {
  const {
    query,
    language,
    intentTags,
    topSimilarity,
    belowThreshold,
    chunkIds,
    retrievalTime,
    totalTime,
    conversationId,
    userId,
  } = data;

  // Structured log for production monitoring
  logger.info('RAG_REQUEST', {
    query: query?.substring(0, 200), // Truncate for privacy
    queryLength: query?.length || 0,
    language,
    intentTags: intentTags || [],
    topSimilarity: topSimilarity ? parseFloat(topSimilarity.toFixed(4)) : null,
    belowThreshold: Boolean(belowThreshold),
    chunksUsed: chunkIds?.length || 0,
    chunkIds: chunkIds || [],
    retrievalTimeMs: retrievalTime ? Math.round(retrievalTime) : null,
    totalTimeMs: totalTime ? Math.round(totalTime) : null,
    conversationId,
    userId,
    timestamp: new Date().toISOString(),
  });

  // If below threshold, log separately for fallback analysis
  if (belowThreshold) {
    logger.warn('RAG_FALLBACK', {
      query: query?.substring(0, 200),
      intentTags: intentTags || [],
      topSimilarity: topSimilarity ? parseFloat(topSimilarity.toFixed(4)) : null,
      language,
      conversationId,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Log RAG error
 */
export function logRAGError(error, context = {}) {
  logger.error('RAG_ERROR', {
    message: error.message,
    stack: error.stack,
    query: context.query?.substring(0, 200),
    intentTags: context.intentTags,
    conversationId: context.conversationId,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Aggregate metrics for dashboard
 * (In-memory for now, can be moved to Redis/DB later)
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      fallbackCount: 0,
      similarityByIntent: {},
      fallbackQueries: [],
      latencies: [],
    };
  }

  recordRequest(data) {
    this.metrics.totalRequests++;

    // Record fallback
    if (data.belowThreshold) {
      this.metrics.fallbackCount++;
      
      // Keep top 20 fallback queries
      this.metrics.fallbackQueries.push({
        query: data.query?.substring(0, 100),
        intentTags: data.intentTags,
        topSimilarity: data.topSimilarity,
        timestamp: new Date().toISOString(),
      });
      
      if (this.metrics.fallbackQueries.length > 20) {
        this.metrics.fallbackQueries.shift();
      }
    }

    // Record similarity by intent
    if (data.intentTags && data.topSimilarity) {
      data.intentTags.forEach(intent => {
        if (!this.metrics.similarityByIntent[intent]) {
          this.metrics.similarityByIntent[intent] = [];
        }
        this.metrics.similarityByIntent[intent].push(data.topSimilarity);
        
        // Keep last 100 per intent
        if (this.metrics.similarityByIntent[intent].length > 100) {
          this.metrics.similarityByIntent[intent].shift();
        }
      });
    }

    // Record latency
    if (data.totalTime) {
      this.metrics.latencies.push(data.totalTime);
      
      // Keep last 1000
      if (this.metrics.latencies.length > 1000) {
        this.metrics.latencies.shift();
      }
    }
  }

  getMetrics() {
    const fallbackRate = this.metrics.totalRequests > 0
      ? (this.metrics.fallbackCount / this.metrics.totalRequests * 100).toFixed(2)
      : 0;

    const avgSimilarityByIntent = {};
    Object.keys(this.metrics.similarityByIntent).forEach(intent => {
      const similarities = this.metrics.similarityByIntent[intent];
      const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;
      avgSimilarityByIntent[intent] = parseFloat((avg * 100).toFixed(2));
    });

    const avgLatency = this.metrics.latencies.length > 0
      ? Math.round(this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length)
      : 0;

    return {
      totalRequests: this.metrics.totalRequests,
      fallbackCount: this.metrics.fallbackCount,
      fallbackRate: parseFloat(fallbackRate),
      avgSimilarityByIntent,
      top20FallbackQueries: this.metrics.fallbackQueries.slice(-20).reverse(),
      avgLatencyMs: avgLatency,
      p95LatencyMs: this.getPercentile(this.metrics.latencies, 95),
      p99LatencyMs: this.getPercentile(this.metrics.latencies, 99),
    };
  }

  getPercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return Math.round(sorted[index]);
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      fallbackCount: 0,
      similarityByIntent: {},
      fallbackQueries: [],
      latencies: [],
    };
  }
}

// Singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Get current metrics
 */
export function getRAGMetrics() {
  return metricsCollector.getMetrics();
}

/**
 * Reset metrics (useful for testing)
 */
export function resetRAGMetrics() {
  metricsCollector.reset();
}
