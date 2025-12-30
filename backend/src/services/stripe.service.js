/**
 * Stripe Service
 * Handles payment processing for orders
 */

import Stripe from 'stripe';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const stripe = new Stripe(config.stripe.secretKey);

/**
 * Create a payment intent for an order
 */
export async function createPaymentIntent(orderData) {
  try {
    const { items, customerName, customerEmail, customerPhone, notes } = orderData;

    // Calculate total amount
    const amount = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // Convert to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(amount * 100);

    if (amountInCents < 50) {
      // Minimum charge amount (adjust based on currency)
      throw new Error('Order total must be at least $0.50');
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: config.stripe.currency,
      metadata: {
        customerName,
        customerEmail,
        customerPhone,
        orderType: 'pickup',
        itemCount: items.length.toString(),
        notes: notes || '',
      },
      description: `Pickup order for ${customerName}`,
      receipt_email: customerEmail,
    });

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      customerEmail: customerEmail ? '***' : '', // Don't log full email
    });

    return {
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: amount,
      amountInCents,
      currency: config.stripe.currency,
    };
  } catch (error) {
    logger.error('Failed to create payment intent', {
      error: error.message,
      customerEmail: orderData.customerEmail ? '***' : '',
    });
    throw error;
  }
}

/**
 * Confirm payment intent (verify payment was successful)
 */
export async function confirmPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      logger.info('Payment confirmed', {
        paymentIntentId,
        amount: paymentIntent.amount,
      });

      return {
        success: true,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100, // Convert back to dollars
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
      };
    } else if (paymentIntent.status === 'requires_payment_method') {
      throw new Error('Payment requires a payment method');
    } else if (paymentIntent.status === 'requires_confirmation') {
      throw new Error('Payment requires confirmation');
    } else {
      throw new Error(`Payment status: ${paymentIntent.status}`);
    }
  } catch (error) {
    logger.error('Failed to confirm payment', {
      error: error.message,
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);

    logger.info('Payment intent cancelled', {
      paymentIntentId,
    });

    return {
      success: true,
      status: paymentIntent.status,
    };
  } catch (error) {
    logger.error('Failed to cancel payment intent', {
      error: error.message,
      paymentIntentId,
    });
    throw error;
  }
}

/**
 * Verify webhook signature (for Stripe webhooks)
 */
export function verifyWebhookSignature(payload, signature) {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.stripe.webhookSecret
    );
    return event;
  } catch (error) {
    logger.error('Stripe webhook signature verification failed', {
      error: error.message,
    });
    throw error;
  }
}

export default {
  createPaymentIntent,
  confirmPaymentIntent,
  cancelPaymentIntent,
  verifyWebhookSignature,
};

