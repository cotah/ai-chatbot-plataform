/**
 * HeyGen LiveAvatar Service
 * Handles video avatar session creation and management
 */

import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const HEYGEN_BASE_URL = config.heygen.baseUrl || 'https://api.heygen.com';

/**
 * Create a LiveAvatar session
 */
export async function createVideoSession(sessionData) {
  try {
    const { conversationContext, reason } = sessionData;

    // HeyGen LiveAvatar API endpoint (adjust based on actual API documentation)
    const response = await axios.post(
      `${HEYGEN_BASE_URL}/v1/live_avatar/sessions`,
      {
        avatar_id: process.env.HEYGEN_AVATAR_ID || 'default', // Configure your avatar ID
        conversation_context: conversationContext || '',
        reason: reason || 'Customer requested video assistance',
        settings: {
          language: 'en',
          voice: 'default',
        },
      },
      {
        headers: {
          'X-API-KEY': config.heygen.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const session = response.data;

    logger.info('HeyGen video session created', {
      sessionId: session.session_id,
      reason,
    });

    return {
      sessionId: session.session_id,
      sessionUrl: session.session_url,
      streamUrl: session.stream_url,
      token: session.token, // If needed for frontend
    };
  } catch (error) {
    logger.error('Failed to create HeyGen video session', {
      error: error.message,
      response: error.response?.data,
      reason: sessionData.reason,
    });
    throw error;
  }
}

/**
 * End a video session
 */
export async function endVideoSession(sessionId) {
  try {
    await axios.delete(`${HEYGEN_BASE_URL}/v1/live_avatar/sessions/${sessionId}`, {
      headers: {
        'X-API-KEY': config.heygen.apiKey,
      },
      timeout: 5000,
    });

    logger.info('HeyGen video session ended', {
      sessionId,
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to end HeyGen video session', {
      error: error.message,
      sessionId,
    });
    // Don't throw - session might already be ended
    return { success: false, error: error.message };
  }
}

/**
 * Get session status
 */
export async function getSessionStatus(sessionId) {
  try {
    const response = await axios.get(
      `${HEYGEN_BASE_URL}/v1/live_avatar/sessions/${sessionId}`,
      {
        headers: {
          'X-API-KEY': config.heygen.apiKey,
        },
        timeout: 5000,
      }
    );

    return {
      status: response.data.status,
      sessionId: response.data.session_id,
    };
  } catch (error) {
    logger.error('Failed to get HeyGen session status', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Send message to video session (if supported by API)
 */
export async function sendMessageToSession(sessionId, message) {
  try {
    const response = await axios.post(
      `${HEYGEN_BASE_URL}/v1/live_avatar/sessions/${sessionId}/message`,
      {
        message,
      },
      {
        headers: {
          'X-API-KEY': config.heygen.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    );

    return response.data;
  } catch (error) {
    logger.error('Failed to send message to HeyGen session', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

export default {
  createVideoSession,
  endVideoSession,
  getSessionStatus,
  sendMessageToSession,
};

