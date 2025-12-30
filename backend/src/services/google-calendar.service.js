/**
 * Google Calendar Service
 * Handles calendar event creation for reservations
 */

import { google } from 'googleapis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let calendarClient = null;

/**
 * Initialize Google Calendar client
 */
async function initializeCalendarClient() {
  if (calendarClient) {
    return calendarClient;
  }

  try {
    let credentials;

    // Try to parse JSON string first
    if (config.google.serviceAccountKeyJson) {
      credentials = JSON.parse(config.google.serviceAccountKeyJson);
    } else if (config.google.serviceAccountKey) {
      // Load from file path
      const fs = await import('fs');
      const credentialsData = fs.readFileSync(config.google.serviceAccountKey, 'utf8');
      credentials = JSON.parse(credentialsData);
    } else {
      throw new Error('Google service account credentials not configured');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    calendarClient = google.calendar({ version: 'v3', auth });
    logger.info('Google Calendar client initialized');

    return calendarClient;
  } catch (error) {
    logger.error('Failed to initialize Google Calendar client', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create a calendar event for a reservation
 */
export async function createReservationEvent(reservationData) {
  try {
    const calendar = await initializeCalendarClient();

    const { name, phone, email, date, time, guests, notes } = reservationData;

    // Combine date and time into ISO 8601 format
    const dateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(dateTime);
    endDateTime.setHours(endDateTime.getHours() + 2); // Default 2-hour reservation

    const event = {
      summary: `Reservation: ${name} (${guests} guest${guests > 1 ? 's' : ''})`,
      description: `Customer: ${name}\nPhone: ${phone}\nEmail: ${email}\nGuests: ${guests}${notes ? `\nNotes: ${notes}` : ''}`,
      start: {
        dateTime: dateTime.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC',
      },
      attendees: [
        {
          email: email,
          displayName: name,
        },
      ],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      colorId: '10', // Green color
    };

    const response = await calendar.events.insert({
      calendarId: config.google.calendarId,
      requestBody: event,
      sendUpdates: 'all', // Send email notifications
    });

    logger.info('Reservation event created', {
      eventId: response.data.id,
      customerEmail: email,
      date: date,
      time: time,
    });

    return {
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      startTime: response.data.start.dateTime,
      endTime: response.data.end.dateTime,
    };
  } catch (error) {
    logger.error('Failed to create reservation event', {
      error: error.message,
      reservationData: { name, email, date, time },
    });
    throw error;
  }
}

/**
 * Check calendar availability (optional - for future use)
 */
export async function checkAvailability(date, time, durationMinutes = 120) {
  try {
    const calendar = await initializeCalendarClient();

    const startDateTime = new Date(`${date}T${time}:00`);
    const endDateTime = new Date(startDateTime);
    endDateTime.setMinutes(endDateTime.getMinutes() + durationMinutes);

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDateTime.toISOString(),
        timeMax: endDateTime.toISOString(),
        items: [{ id: config.google.calendarId }],
      },
    });

    const busy = response.data.calendars[config.google.calendarId]?.busy || [];
    return busy.length === 0;
  } catch (error) {
    logger.error('Failed to check calendar availability', {
      error: error.message,
      date,
      time,
    });
    // Return true on error to not block reservations
    return true;
  }
}

export default {
  createReservationEvent,
  checkAvailability,
};

