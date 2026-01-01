/**
 * Video Routes
 * Handle HeyGen LiveAvatar video session creation
 */

import express from 'express';
import { createVideoSession, endVideoSession } from '../services/heygen.service.js';
import { appendCRMData, formatCRMData } from '../services/google-sheets.service.js';
import { webhookVideoStarted, webhookError } from '../services/webhook.service.js';
import { validateVideoSession } from '../middleware/validator.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/video/session
 * Create a video avatar session
 */
router.post('/session', apiRateLimiter, validateVideoSession, async (req, res, next) => {
  try {
    const { conversationContext, reason } = req.body;
    const sessionId = req.sessionId;

    // Create video session
    const videoSession = await createVideoSession({
      conversationContext,
      reason: reason || 'Customer requested video assistance',
    });

    // Store in CRM
    await appendCRMData(
      formatCRMData('video', {
        sessionId: videoSession.sessionId,
        reason: reason || 'Customer requested video assistance',
      })
    );

    // Trigger webhook
    await webhookVideoStarted({
      sessionId: videoSession.sessionId,
      sessionUrl: videoSession.sessionUrl,
      reason: reason || 'Customer requested video assistance',
    });

    logger.info('Video session created', {
      sessionId: videoSession.sessionId,
      reason,
    });

    res.json({
      success: true,
      session: {
        sessionId: videoSession.sessionId,
        sessionUrl: videoSession.sessionUrl,
        streamUrl: videoSession.streamUrl,
        token: videoSession.token,
      },
    });
  } catch (error) {
    logger.error('Video session creation failed', {
      error: error.message,
      sessionId: req.sessionId,
    });

    // Trigger error webhook
    await webhookError({
      type: 'video_error',
      message: error.message,
      context: { sessionId: req.sessionId },
      sessionId: req.sessionId,
    }).catch((err) => {
      logger.error('Failed to send error webhook', { error: err.message });
    });

    // Return error but don't fail completely - offer WhatsApp fallback
    res.status(502).json({
      success: false,
      error: 'Video session unavailable',
      message: 'We apologize, but video assistance is currently unavailable. Please use WhatsApp for direct support.',
      whatsappFallback: true,
    });
  }
});

/**
 * DELETE /api/video/session/:sessionId
 * End a video session
 */
router.delete('/session/:sessionId', apiRateLimiter, async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    await endVideoSession(sessionId);

    res.json({
      success: true,
      message: 'Video session ended',
    });
  } catch (error) {
    logger.error('Failed to end video session', {
      error: error.message,
      sessionId: req.params.sessionId,
    });
    next(error);
  }
});

export default router;

