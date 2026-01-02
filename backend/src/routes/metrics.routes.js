/**
 * Metrics Routes
 * Endpoints for RAG observability dashboard
 */

import express from 'express';
import { getRAGMetrics, resetRAGMetrics } from '../services/observability.service.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/metrics/rag
 * Get current RAG metrics
 */
router.get('/rag', (req, res) => {
  try {
    const metrics = getRAGMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting RAG metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics',
    });
  }
});

/**
 * POST /api/metrics/rag/reset
 * Reset RAG metrics (for testing/debugging)
 */
router.post('/rag/reset', (req, res) => {
  try {
    resetRAGMetrics();
    
    logger.info('RAG metrics reset');
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error resetting RAG metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
    });
  }
});

/**
 * GET /api/metrics/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
