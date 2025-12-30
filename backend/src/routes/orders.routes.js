/**
 * Order Routes
 * Handle order creation and payment processing
 */

import express from 'express';
import { createPaymentIntent, confirmPaymentIntent } from '../services/stripe.service.js';
import { appendCRMData, formatCRMData } from '../services/google-sheets.service.js';
import { webhookOrderPaid, webhookError } from '../services/webhook.service.js';
import { validateOrder, validatePaymentConfirmation } from '../middleware/validator.js';
import { paymentRateLimiter } from '../middleware/rateLimiter.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/orders/create
 * Create an order and payment intent
 */
router.post('/create', paymentRateLimiter, validateOrder, async (req, res, next) => {
  try {
    const { items, customerName, customerPhone, customerEmail, notes } = req.body;
    const sessionId = req.sessionId;

    // Calculate total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create payment intent
    const paymentData = await createPaymentIntent({
      items,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    });

    // Generate order ID
    const orderId = `order_${uuidv4()}`;

    // Store order in CRM (pending payment)
    await appendCRMData(
      formatCRMData('order', {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        items,
        total,
        paymentIntentId: paymentData.paymentIntentId,
        orderId,
        notes,
      })
    );

    logger.info('Order created', {
      orderId,
      paymentIntentId: paymentData.paymentIntentId,
      amount: paymentData.amount,
      customerEmail: customerEmail ? '***' : '',
    });

    res.json({
      success: true,
      order: {
        orderId,
        paymentIntentId: paymentData.paymentIntentId,
        clientSecret: paymentData.clientSecret,
        amount: paymentData.amount,
        currency: paymentData.currency,
        items,
      },
    });
  } catch (error) {
    logger.error('Order creation failed', {
      error: error.message,
      sessionId: req.sessionId,
    });

    await webhookError({
      type: 'order_error',
      message: error.message,
      context: { sessionId: req.sessionId },
      sessionId: req.sessionId,
    }).catch((err) => {
      logger.error('Failed to send error webhook', { error: err.message });
    });

    next(error);
  }
});

/**
 * POST /api/orders/confirm
 * Confirm payment and finalize order
 */
router.post('/confirm', paymentRateLimiter, validatePaymentConfirmation, async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    const sessionId = req.sessionId;

    // Confirm payment
    const payment = await confirmPaymentIntent(paymentIntentId);

    if (!payment.success) {
      throw new ApiError(400, 'Payment confirmation failed');
    }

    // Get order details from metadata
    const orderData = {
      paymentIntentId,
      amount: payment.amount,
      currency: payment.currency,
      customerName: payment.metadata.customerName,
      customerEmail: payment.metadata.customerEmail,
      customerPhone: payment.metadata.customerPhone,
      items: JSON.parse(payment.metadata.items || '[]'),
      orderId: payment.metadata.orderId || `order_${paymentIntentId}`,
    };

    // Update CRM with confirmed order
    await appendCRMData(
      formatCRMData('order', {
        ...orderData,
        notes: `Order confirmed and paid`,
      })
    );

    // Trigger webhook
    await webhookOrderPaid(orderData);

    logger.info('Order confirmed and paid', {
      orderId: orderData.orderId,
      paymentIntentId,
      amount: payment.amount,
    });

    res.json({
      success: true,
      order: {
        orderId: orderData.orderId,
        paymentIntentId,
        amount: payment.amount,
        currency: payment.currency,
        status: 'confirmed',
        confirmationMessage: `Order confirmed! Your pickup order #${orderData.orderId} has been received and payment processed.`,
      },
    });
  } catch (error) {
    logger.error('Order confirmation failed', {
      error: error.message,
      paymentIntentId: req.body.paymentIntentId,
      sessionId: req.sessionId,
    });

    await webhookError({
      type: 'order_confirmation_error',
      message: error.message,
      context: { sessionId: req.sessionId, paymentIntentId: req.body.paymentIntentId },
      sessionId: req.sessionId,
    }).catch((err) => {
      logger.error('Failed to send error webhook', { error: err.message });
    });

    next(error);
  }
});

export default router;

