/**
 * Global Error Handler Middleware
 * Centralized error handling and logging
 */

import logger from '../utils/logger.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error('Request error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    path: req.path,
    method: req.method,
    sessionId: req.sessionId,
    ip: req.ip,
  });

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      message: err.message,
    });
  }

  // Handle external API errors
  if (err.response) {
    const statusCode = err.response.status || 502;
    return res.status(statusCode).json({
      error: 'External service error',
      message: 'An error occurred while processing your request. Please try again.',
    });
  }

  // Handle Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return res.status(400).json({
      error: 'Payment error',
      message: err.message || 'An error occurred with the payment. Please try again.',
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred'
      : err.message;

  res.status(statusCode).json({
    error: 'Internal server error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};

