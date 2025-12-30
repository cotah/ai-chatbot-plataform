/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair usage
 */

import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * General API rate limiter
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      sessionId: req.sessionId,
      path: req.path,
    });
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  },
});

/**
 * Stricter rate limiter for chat endpoint
 */
export const chatRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    error: 'Too many chat requests',
    message: 'Please slow down. You can send up to 20 messages per minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Chat rate limit exceeded', {
      ip: req.ip,
      sessionId: req.sessionId,
    });
    res.status(429).json({
      error: 'Too many chat requests',
      message: 'Please slow down. You can send up to 20 messages per minute.',
    });
  },
});

/**
 * Rate limiter for payment endpoints
 */
export const paymentRateLimiter = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5, // 5 payment attempts per minute
  message: {
    error: 'Too many payment requests',
    message: 'Please wait before attempting another payment.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Payment rate limit exceeded', {
      ip: req.ip,
      sessionId: req.sessionId,
    });
    res.status(429).json({
      error: 'Too many payment requests',
      message: 'Please wait before attempting another payment.',
    });
  },
});

