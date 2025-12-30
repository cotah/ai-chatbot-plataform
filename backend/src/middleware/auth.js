/**
 * Authentication Middleware
 * Session-based authentication with Redis storage
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';
import { getSession, setSession, refreshSessionTTL } from '../services/redis.service.js';
import { getClientByIdentifier } from '../services/supabase.service.js';

// Fallback in-memory store if Redis is unavailable
const fallbackSessions = new Map();

/**
 * Generate or retrieve session ID
 * Creates a new session if one doesn't exist
 */
export const sessionMiddleware = async (req, res, next) => {
  try {
    let sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
    let session = null;
    let isNewSession = false;

    // Try to get session from Redis
    if (sessionId) {
      session = await getSession(sessionId);
    }

    // If no session found, create new one
    if (!session) {
      sessionId = uuidv4();
      isNewSession = true;
      session = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        metadata: {
          language: null, // Will be set on first message
          clientId: null,
          conversationId: null,
        },
      };
      logger.info('New session created', { sessionId });
    } else {
      // Update last activity
      session.lastActivity = new Date().toISOString();
    }

    // Try to identify client from session metadata
    if (session.metadata?.clientId) {
      // Client already identified
    } else if (session.metadata?.email || session.metadata?.phone) {
      // Try to find existing client
      const identifier = session.metadata.email || session.metadata.phone;
      const type = session.metadata.email ? 'email' : 'phone';
      const client = await getClientByIdentifier(identifier, type);
      
      if (client) {
        session.metadata.clientId = client.id;
        session.metadata.preferredLanguage = client.preferred_language;
        session.metadata.plan = client.plan;
      }
    }

    // Save session to Redis (with fallback)
    try {
      await setSession(sessionId, session, 86400); // 24 hours TTL
    } catch (error) {
      logger.warn('Failed to save session to Redis, using fallback', {
        error: error.message,
      });
      fallbackSessions.set(sessionId, session);
    }

    req.sessionId = sessionId;
    req.session = session;
    req.isNewSession = isNewSession;

    // Set session ID in response header for frontend
    res.setHeader('X-Session-ID', sessionId);

    next();
  } catch (error) {
    logger.error('Session middleware error', { error: error.message });
    // Continue with fallback
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metadata: {},
    };
    req.sessionId = sessionId;
    req.session = session;
    req.isNewSession = true;
    next();
  }
};

/**
 * Optional: API key validation for admin endpoints
 */
export const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return next(); // Skip if no API key configured
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.warn('Invalid API key attempt', {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  next();
};

/**
 * Update session metadata
 */
export const updateSession = async (sessionId, metadata) => {
  try {
    const session = await getSession(sessionId);
    
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
      session.lastActivity = new Date().toISOString();
      
      // Save to Redis
      try {
        await setSession(sessionId, session, 86400);
      } catch (error) {
        logger.warn('Failed to update session in Redis, using fallback', {
          error: error.message,
        });
        fallbackSessions.set(sessionId, session);
      }
    }
  } catch (error) {
    logger.error('Failed to update session', {
      error: error.message,
      sessionId,
    });
  }
};

