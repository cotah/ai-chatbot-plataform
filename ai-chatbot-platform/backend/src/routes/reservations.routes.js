/**
 * Reservation Routes
 * Handle reservation creation with Google Calendar integration
 */

import express from 'express';
import { createReservationEvent } from '../services/google-calendar.service.js';
import { appendCRMData, formatCRMData } from '../services/google-sheets.service.js';
import { webhookReservationCreated, webhookError } from '../services/webhook.service.js';
import { validateReservation } from '../middleware/validator.js';
import { apiRateLimiter } from '../middleware/rateLimiter.js';
import { ApiError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/reservations
 * Create a reservation
 */
router.post('/', apiRateLimiter, validateReservation, async (req, res, next) => {
  try {
    const { name, phone, email, date, time, guests, notes } = req.body;
    const sessionId = req.sessionId;

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

    logger.info('Reservation created successfully', {
      eventId: eventData.eventId,
      email: email ? '***' : '',
      date,
      time,
    });

    res.json({
      success: true,
      reservation: {
        eventId: eventData.eventId,
        eventLink: eventData.eventLink,
        date,
        time,
        guests,
        confirmationMessage: `Reservation confirmed for ${name} on ${date} at ${time} for ${guests} guest(s). A confirmation email has been sent to ${email}.`,
      },
    });
  } catch (error) {
    logger.error('Reservation creation failed', {
      error: error.message,
      sessionId: req.sessionId,
    });

    await webhookError({
      type: 'reservation_error',
      message: error.message,
      context: { sessionId: req.sessionId },
      sessionId: req.sessionId,
    }).catch((err) => {
      logger.error('Failed to send error webhook', { error: err.message });
    });

    next(error);
  }
});

export default router;

