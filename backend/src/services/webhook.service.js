/**
 * n8n Webhook Service
 * Dispatches webhooks to n8n for automation
 */

import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Send webhook to n8n
 */
async function sendWebhook(eventType, payload, retries = 0) {
  try {
    const response = await axios.post(
      config.n8n.webhookUrl,
      {
        event: eventType,
        timestamp: new Date().toISOString(),
        ...payload,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: config.n8n.timeout,
      }
    );

    logger.info('Webhook sent successfully', {
      eventType,
      status: response.status,
    });

    return { success: true, status: response.status };
  } catch (error) {
    if (retries < config.n8n.retries) {
      logger.warn('Webhook failed, retrying', {
        eventType,
        retry: retries + 1,
        error: error.message,
      });
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      return sendWebhook(eventType, payload, retries + 1);
    }

    logger.error('Webhook failed after retries', {
      eventType,
      error: error.message,
      response: error.response?.data,
    });

    // Don't throw - webhook failures shouldn't break the main flow
    return { success: false, error: error.message };
  }
}

/**
 * Webhook: New conversation started
 */
export async function webhookNewConversation(sessionId, metadata = {}) {
  return sendWebhook('conversation.started', {
    sessionId,
    metadata,
  });
}

/**
 * Webhook: Reservation created
 */
export async function webhookReservationCreated(reservationData) {
  return sendWebhook('reservation.created', {
    reservation: {
      name: reservationData.name,
      phone: reservationData.phone,
      email: reservationData.email,
      date: reservationData.date,
      time: reservationData.time,
      guests: reservationData.guests,
      eventId: reservationData.eventId,
      eventLink: reservationData.eventLink,
    },
  });
}

/**
 * Webhook: Order paid
 */
export async function webhookOrderPaid(orderData) {
  return sendWebhook('order.paid', {
    order: {
      paymentIntentId: orderData.paymentIntentId,
      amount: orderData.amount,
      currency: orderData.currency,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone,
      items: orderData.items,
      orderId: orderData.orderId,
    },
  });
}

/**
 * Webhook: Video support started
 */
export async function webhookVideoStarted(sessionData) {
  return sendWebhook('video.started', {
    video: {
      sessionId: sessionData.sessionId,
      sessionUrl: sessionData.sessionUrl,
      reason: sessionData.reason,
    },
  });
}

/**
 * Webhook: Fallback to WhatsApp
 */
export async function webhookWhatsAppFallback(fallbackData) {
  return sendWebhook('whatsapp.fallback', {
    fallback: {
      reason: fallbackData.reason,
      customerMessage: fallbackData.customerMessage,
      sessionId: fallbackData.sessionId,
    },
  });
}

/**
 * Webhook: Error or failure
 */
export async function webhookError(errorData) {
  return sendWebhook('error.occurred', {
    error: {
      type: errorData.type,
      message: errorData.message,
      context: errorData.context,
      sessionId: errorData.sessionId,
    },
  });
}

/**
 * Generic webhook dispatcher
 */
export async function dispatchWebhook(eventType, payload) {
  return sendWebhook(eventType, payload);
}

export default {
  webhookNewConversation,
  webhookReservationCreated,
  webhookOrderPaid,
  webhookVideoStarted,
  webhookWhatsAppFallback,
  webhookError,
  dispatchWebhook,
};

