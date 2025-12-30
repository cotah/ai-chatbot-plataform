/**
 * Google Sheets Service
 * Handles CRM data storage in Google Sheets
 */

import { google } from 'googleapis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let sheetsClient = null;

/**
 * Initialize Google Sheets client
 */
async function initializeSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    let credentials;

    // Try to parse JSON string first
    if (config.google.serviceAccountKeyJson) {
      credentials = JSON.parse(config.google.serviceAccountKeyJson);
    } else if (config.google.serviceAccountKey) {
      // Check if it's a JSON string or file path
      const keyValue = config.google.serviceAccountKey.trim();
      
      if (keyValue.startsWith('{')) {
        // It's a JSON string
        try {
          credentials = JSON.parse(keyValue);
        } catch (parseError) {
          throw new Error('Invalid JSON in GOOGLE_SERVICE_ACCOUNT_KEY');
        }
      } else {
        // It's a file path
        const fs = await import('fs');
        const credentialsData = fs.readFileSync(keyValue, 'utf8');
        credentials = JSON.parse(credentialsData);
      }
    } else {
      throw new Error('Google service account credentials not configured');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });
    logger.info('Google Sheets client initialized');

    return sheetsClient;
  } catch (error) {
    logger.error('Failed to initialize Google Sheets client', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Append CRM data to Google Sheets
 */
export async function appendCRMData(data) {
  // Skip if not configured
  if (!config.google.serviceAccountKey && !config.google.serviceAccountKeyJson) {
    logger.debug('Google Sheets not configured, skipping CRM data append');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const sheets = await initializeSheetsClient();

    const {
      name,
      phone,
      email,
      intent, // 'reservation', 'order', 'support', 'video', 'whatsapp'
      timestamp,
      notes,
      metadata = {},
    } = data;

    const row = [
      timestamp || new Date().toISOString(), // Timestamp
      intent || 'support',                   // Type
      name || '',                            // Name
      email || '',                           // Email
      phone || '',                           // Phone
      notes || '',                           // Notes
      JSON.stringify(metadata),              // Extra
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: config.google.sheetsId,
      range: 'Sheet1!A:G', // Adjust range as needed
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [row],
      },
    });

    logger.info('CRM data appended to Google Sheets', {
      rowCount: response.data.updates?.updatedRows || 0,
      intent,
      email: email ? '***' : '', // Don't log full email
    });

    return {
      success: true,
      rowIndex: response.data.updates?.updatedRows || 0,
    };
  } catch (error) {
    logger.error('Failed to append CRM data', {
      error: error.message,
      intent: data.intent,
    });
    throw error;
  }
}

/**
 * Initialize sheet headers (run once to set up the sheet)
 */
export async function initializeSheetHeaders() {
  try {
    const sheets = await initializeSheetsClient();

    const headers = [
      'Timestamp',
      'Type',
      'Name',
      'Email',
      'Phone',
      'Notes',
      'Extra',
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: config.google.sheetsId,
      range: 'Sheet1!A1:G1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [headers],
      },
    });

    logger.info('Sheet headers initialized');
    return { success: true };
  } catch (error) {
    logger.error('Failed to initialize sheet headers', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Format CRM data for different intents
 */
export function formatCRMData(intent, data) {
  const baseData = {
    name: data.name || '',
    phone: data.phone || '',
    email: data.email || '',
    intent,
    timestamp: new Date().toISOString(),
    notes: data.notes || '',
    metadata: {},
  };

  switch (intent) {
    case 'reservation':
      return {
        ...baseData,
        notes: `Reservation: ${data.date} at ${data.time} for ${data.guests} guest(s)`,
        metadata: {
          date: data.date,
          time: data.time,
          guests: data.guests,
          eventId: data.eventId,
        },
      };

    case 'order':
      return {
        ...baseData,
        notes: `Order: ${data.items?.length || 0} item(s), Total: ${data.total || 0}`,
        metadata: {
          items: data.items,
          total: data.total,
          paymentIntentId: data.paymentIntentId,
          orderId: data.orderId,
        },
      };

    case 'video':
      return {
        ...baseData,
        notes: `Video session: ${data.reason || 'Customer requested'}`,
        metadata: {
          sessionId: data.sessionId,
          reason: data.reason,
        },
      };

    case 'whatsapp':
      return {
        ...baseData,
        notes: `WhatsApp handoff: ${data.reason || 'Customer requested human support'}`,
        metadata: {
          reason: data.reason,
        },
      };

    default:
      return {
        ...baseData,
        notes: data.message || data.notes || 'General inquiry',
        metadata: data.metadata || {},
      };
  }
}

export default {
  appendCRMData,
  initializeSheetHeaders,
  formatCRMData,
};

