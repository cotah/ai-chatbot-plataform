/**
 * Tool Handlers
 * Execute OpenAI function calls
 * This module is used by the chat route to handle tool calls
 */

import { createReservationEvent } from './google-calendar.service.js';
import { createPaymentIntent } from './stripe.service.js';
import { createVideoSession } from './heygen.service.js';
import { appendCRMData, formatCRMData } from './google-sheets.service.js';
import { webhookReservationCreated, webhookOrderPaid, webhookVideoStarted, webhookWhatsAppFallback } from './webhook.service.js';
import logger from '../utils/logger.js';

/**
 * Handle create_reservation tool call
 */
export async function handleCreateReservation(args, sessionId) {
  try {
    const { name, phone, email, date, time, guests, notes } = args;

    // Create calendar event
    const eventData = await createReservationEvent({
      name,
      phone,
      email,
      date,
      time,
      guests,
      notes,
    });

    // Store in CRM
    await appendCRMData(
      formatCRMData('reservation', {
        name,
        phone,
        email,
        date,
        time,
        guests,
        notes,
        eventId: eventData.eventId,
      })
    );

    // Trigger webhook
    await webhookReservationCreated({
      name,
      phone,
      email,
      date,
      time,
      guests,
      notes,
      eventId: eventData.eventId,
      eventLink: eventData.eventLink,
    });

    return {
      success: true,
      message: `Reservation confirmed for ${name} on ${date} at ${time} for ${guests} guest(s). A confirmation email has been sent to ${email}.`,
      eventId: eventData.eventId,
      eventLink: eventData.eventLink,
    };
  } catch (error) {
    logger.error('Tool handler: create_reservation failed', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Handle create_order tool call
 */
export async function handleCreateOrder(args, sessionId) {
  try {
    const { items, customerName, customerPhone, customerEmail, notes } = args;

    // Create payment intent
    const paymentData = await createPaymentIntent({
      items,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    });

    return {
      success: true,
      message: `Order created. Please proceed to payment.`,
      paymentIntentId: paymentData.paymentIntentId,
      clientSecret: paymentData.clientSecret,
      amount: paymentData.amount,
      currency: paymentData.currency,
    };
  } catch (error) {
    logger.error('Tool handler: create_order failed', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Handle get_menu_link tool call
 */
export async function handleGetMenuLink(args) {
  // Return YouTube channel/playlist link
  // This should be configured in environment variables
  const menuLink = process.env.MENU_YOUTUBE_LINK || 'https://www.youtube.com/channel/your-channel-id';
  const category = args.category || '';

  return {
    success: true,
    message: `Our menu is available via video content! Each item is presented in a short video format. You can view it here: ${menuLink}${category ? `?category=${category}` : ''}`,
    link: menuLink,
  };
}

/**
 * Handle create_video_session tool call
 */
export async function handleCreateVideoSession(args, sessionId) {
  try {
    const { reason, conversationContext } = args;

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

    return {
      success: true,
      message: `Video assistance is now available. Opening video session...`,
      sessionId: videoSession.sessionId,
      sessionUrl: videoSession.sessionUrl,
      streamUrl: videoSession.streamUrl,
      token: videoSession.token,
    };
  } catch (error) {
    logger.error('Tool handler: create_video_session failed', {
      error: error.message,
      sessionId,
    });
    // Return fallback message instead of throwing
    return {
      success: false,
      message: `I apologize, but video assistance is currently unavailable. Would you like to connect via WhatsApp for direct support?`,
      whatsappFallback: true,
    };
  }
}

/**
 * Handle provide_whatsapp_link tool call
 */
export async function handleProvideWhatsAppLink(args, sessionId) {
  const whatsappNumber = process.env.WHATSAPP_NUMBER || '1234567890';
  const preMessage = args.message || 'Hello, I need assistance';
  const encodedMessage = encodeURIComponent(preMessage);
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

  // Store in CRM
  await appendCRMData(
    formatCRMData('whatsapp', {
      reason: args.reason || 'Customer requested human support',
    })
  );

  // Trigger webhook
  await webhookWhatsAppFallback({
    reason: args.reason || 'Customer requested human support',
    customerMessage: preMessage,
    sessionId,
  });

  return {
    success: true,
    message: `I've prepared a WhatsApp link for you to connect with our team directly. Click here: ${whatsappLink}`,
    whatsappLink,
  };
}

/**
 * Route tool calls to appropriate handlers
 */
export async function handleToolCall(toolCall, sessionId) {
  const { name, arguments: args } = toolCall;

  try {
    // Parse arguments if it's a string
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

    switch (name) {
      case 'create_reservation':
        return await handleCreateReservation(parsedArgs, sessionId);
      case 'create_order':
        return await handleCreateOrder(parsedArgs, sessionId);
      case 'get_menu_link':
        return await handleGetMenuLink(parsedArgs);
      case 'create_video_session':
        return await handleCreateVideoSession(parsedArgs, sessionId);
      case 'provide_whatsapp_link':
        return await handleProvideWhatsAppLink(parsedArgs, sessionId);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    logger.error('Tool call handler error', {
      tool: name,
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

export default {
  handleCreateReservation,
  handleCreateOrder,
  handleGetMenuLink,
  handleCreateVideoSession,
  handleProvideWhatsAppLink,
  handleToolCall,
};

