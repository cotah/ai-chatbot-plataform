/**
 * Health Check Routes
 * System health and status endpoints
 */

import express from 'express';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ai-chatbot-platform',
    version: '1.0.0',
  });
});

export default router;

