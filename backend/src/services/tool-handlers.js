/**
 * Tool Handlers
 * Execute OpenAI function calls
 * This module is used by the chat route to handle tool calls
 */

import { createReservationEvent } from './google-calendar.service.js';
import { createPaymentIntent, createPaymentLink } from './stripe.service.js';
import { createVideoSession } from './heygen.service.js';
import { appendCRMData, formatCRMData } from './google-sheets.service.js';
import { webhookReservationCreated, webhookOrderPaid, webhookVideoStarted, webhookWhatsAppFallback } from './webhook.service.js';
import logger from '../utils/logger.js';

/**
 * Handle qualify_lead tool call
 */
export async function handleQualifyLead(args, sessionId) {
  try {
    const { businessType, mainChannel, leadVolume, mainGoal, recommendedPack } = args;

    // Store in CRM
    await appendCRMData(
      formatCRMData('lead_qualification', {
        businessType,
        mainChannel,
        leadVolume,
        mainGoal,
        recommendedPack,
      })
    );

    logger.info('Lead qualified', {
      sessionId,
      businessType,
      recommendedPack,
    });

    return {
      success: true,
      message: `Based on your ${businessType} business with ${leadVolume} leads/day on ${mainChannel}, I recommend the ${recommendedPack} pack. Would you like to schedule a demo to see it in action?`,
      qualification: {
        businessType,
        mainChannel,
        leadVolume,
        mainGoal,
        recommendedPack,
      },
    };
  } catch (error) {
    logger.error('Tool handler: qualify_lead failed', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Handle schedule_demo tool call
 */
export async function handleScheduleDemo(args, sessionId) {
  try {
    const { name, email, phone, company, preferredTime, notes } = args;

    // Create calendar event (reuse reservation logic)
    const eventData = await createReservationEvent({
      name,
      phone,
      email,
      date: preferredTime || 'TBD',
      time: preferredTime || 'TBD',
      guests: 1,
      notes: `Demo request for ${company || 'company'}. Notes: ${notes || 'None'}`,
    });

    // Store in CRM
    await appendCRMData(
      formatCRMData('demo_scheduled', {
        name,
        phone,
        email,
        company: company || 'N/A',
        preferredTime: preferredTime || 'TBD',
        notes: notes || 'None',
        eventId: eventData.eventId,
      })
    );

    // Trigger webhook
    await webhookReservationCreated({
      name,
      phone,
      email,
      date: preferredTime || 'TBD',
      time: preferredTime || 'TBD',
      guests: 1,
      notes: `Demo request for ${company || 'company'}. Notes: ${notes || 'None'}`,
      eventId: eventData.eventId,
      eventLink: eventData.eventLink,
    });

    logger.info('Demo scheduled', {
      sessionId,
      name,
      email,
      company,
    });

    return {
      success: true,
      message: `Perfect! Demo scheduled for ${name} at ${company || 'your company'}. We'll contact you at ${email} or ${phone} to confirm the exact time. Check your email for the calendar invite!`,
      eventId: eventData.eventId,
      eventLink: eventData.eventLink,
    };
  } catch (error) {
    logger.error('Tool handler: schedule_demo failed', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Handle provide_whatsapp_contact tool call
 */
export async function handleProvideWhatsAppContact(args, sessionId) {
  const whatsappNumber = process.env.WHATSAPP_NUMBER || '1234567890';
  const preMessage = args.prefilledMessage || 'Hello, I need assistance';
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

  logger.info('WhatsApp contact provided', {
    sessionId,
    reason: args.reason,
  });

  return {
    success: true,
    message: `I've prepared a WhatsApp link for you to connect with our team directly. Click here: ${whatsappLink}`,
    whatsappLink,
  };
}

/**
 * Handle provide_whatsapp_link tool call (LEGACY - redirect to provide_whatsapp_contact)
 */
export async function handleProvideWhatsAppLink(args, sessionId) {
  // Redirect to new handler
  return await handleProvideWhatsAppContact(args, sessionId);
}

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

    // Create payment link
    const paymentData = await createPaymentLink({
      items,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    });

    // Store in CRM
    await appendCRMData(
      formatCRMData('order', {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        notes,
        items: items.map(item => `${item.quantity}x ${item.name}`).join(', '),
        amount: paymentData.amount,
        paymentLinkId: paymentData.paymentLinkId,
      })
    );

    return {
      success: true,
      message: `Order created for ${customerName}. Total: $${paymentData.amount.toFixed(2)}. Please use this link to complete payment: ${paymentData.paymentLinkUrl}`,
      paymentLinkId: paymentData.paymentLinkId,
      paymentLinkUrl: paymentData.paymentLinkUrl,
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
 * Route tool calls to appropriate handlers
 */
export async function handleToolCall(toolCall, sessionId) {
  const { name, arguments: args } = toolCall;

  try {
    // Parse arguments if it's a string
    const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;

    switch (name) {
      case 'qualify_lead':
        return await handleQualifyLead(parsedArgs, sessionId);
      case 'schedule_demo':
        return await handleScheduleDemo(parsedArgs, sessionId);
      case 'provide_whatsapp_contact':
        return await handleProvideWhatsAppContact(parsedArgs, sessionId);
      case 'provide_whatsapp_link':
        return await handleProvideWhatsAppLink(parsedArgs, sessionId);
      case 'create_reservation':
        return await handleCreateReservation(parsedArgs, sessionId);
      case 'create_order':
        return await handleCreateOrder(parsedArgs, sessionId);
      case 'get_menu_link':
        return await handleGetMenuLink(parsedArgs);
      case 'create_video_session':
        return await handleCreateVideoSession(parsedArgs, sessionId);
      default:
        // ROBUST FALLBACK: Don't break conversation on unknown tool
        logger.error('Unknown tool called - fallback activated', {
          tool: name,
          sessionId,
          args: parsedArgs,
        });
        
        // Return graceful fallback instead of throwing
        return {
          success: false,
          message: `I can help you with that. What's your name and business name so I can create a follow-up for our team?`,
          fallback: true,
          unknownTool: name,
        };
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
  handleQualifyLead,
  handleScheduleDemo,
  handleProvideWhatsAppContact,
  handleProvideWhatsAppLink,
  handleCreateReservation,
  handleCreateOrder,
  handleGetMenuLink,
  handleCreateVideoSession,
  handleToolCall,
};
