/**
 * Request Validation Middleware
 * Input sanitization and validation using express-validator
 */

import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors', {
      errors: errors.array(),
      path: req.path,
      sessionId: req.sessionId,
    });
    return res.status(400).json({
      error: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Chat message validation
 */
export const validateChatMessage = [
  body('message')
    .trim()
    .isLength({ min: 0, max: 2000 })
    .withMessage('Message must be at most 2000 characters'),
  body('conversationId')
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      // Allow null, undefined, or empty string
      if (!value) return true;
      // Validate format if provided
      if (!/^conv_[0-9]+_[a-z0-9]+$/.test(value)) {
        throw new Error('Invalid conversation ID format');
      }
      return true;
    }),
  body('languageOverride')
    .optional()
    .isString()
    .isLength({ min: 2, max: 10 })
    .withMessage('Invalid language code'),
  handleValidationErrors,
];

/**
 * Reservation validation
 */
export const validateReservation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .escape(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone must be between 10 and 20 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .isISO8601()
    .withMessage('Date must be in ISO 8601 format'),
  body('time')
    .trim()
    .notEmpty()
    .withMessage('Time is required')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format (24-hour)'),
  body('guests')
    .notEmpty()
    .withMessage('Number of guests is required')
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of guests must be between 1 and 50'),
  handleValidationErrors,
];

/**
 * Order validation
 */
export const validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.name')
    .trim()
    .notEmpty()
    .withMessage('Item name is required')
    .escape(),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  body('items.*.price')
    .isFloat({ min: 0 })
    .withMessage('Item price must be a positive number'),
  body('customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters')
    .escape(),
  body('customerPhone')
    .trim()
    .notEmpty()
    .withMessage('Customer phone is required')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('customerEmail')
    .trim()
    .notEmpty()
    .withMessage('Customer email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  handleValidationErrors,
];

/**
 * Payment confirmation validation
 */
export const validatePaymentConfirmation = [
  body('paymentIntentId')
    .trim()
    .notEmpty()
    .withMessage('Payment intent ID is required')
    .matches(/^pi_[a-zA-Z0-9]+$/)
    .withMessage('Invalid payment intent ID format'),
  handleValidationErrors,
];

/**
 * Video session validation
 */
export const validateVideoSession = [
  body('conversationContext')
    .optional()
    .isString()
    .withMessage('Conversation context must be a string')
    .isLength({ max: 5000 })
    .withMessage('Conversation context must be less than 5000 characters'),
  handleValidationErrors,
];

