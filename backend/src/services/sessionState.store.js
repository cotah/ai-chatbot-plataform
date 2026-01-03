/**
 * Session State Store
 * Redis-backed storage for conversation state machine
 * 
 * Features:
 * - TTL configurável (30-60 min, renovado a cada mensagem)
 * - Fallback gracioso se Redis indisponível
 * - Mascaramento de PII nos logs
 * - Suporte a múltiplas instâncias
 */

import { getSession, setSession, refreshSessionTTL, isRedisAvailable } from './redis.service.js';
import { getInitialState } from './conversationState.service.js';
import logger from '../utils/logger.js';

// Configuration
const SESSION_STATE_TTL = parseInt(process.env.SESSION_STATE_TTL_SECONDS) || 3600; // 1 hour default
const SESSION_STATE_PREFIX = 'state:';

/**
 * Mask PII data for logging
 */
function maskPII(data) {
  if (!data) return data;
  
  const masked = { ...data };
  
  // Mask email
  if (masked.email) {
    const [local, domain] = masked.email.split('@');
    masked.email = `${local.substring(0, 2)}***@${domain}`;
  }
  
  // Mask phone
  if (masked.phone) {
    masked.phone = `***${masked.phone.slice(-4)}`;
  }
  
  // Mask name (keep first letter)
  if (masked.name) {
    masked.name = `${masked.name.charAt(0)}***`;
  }
  
  return masked;
}

/**
 * Get session state from Redis
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object|null>} Session state or null
 */
export async function getSessionState(sessionId) {
  try {
    // Check if Redis is available
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      logger.warn('Redis unavailable, returning null state', { sessionId });
      return null;
    }
    
    // Get state from Redis
    const key = `${SESSION_STATE_PREFIX}${sessionId}`;
    const state = await getSession(key);
    
    if (!state) {
      logger.debug('No state found in Redis', { sessionId });
      return null;
    }
    
    // Refresh TTL on read
    await refreshSessionTTL(key, SESSION_STATE_TTL);
    
    logger.debug('Session state retrieved from Redis', {
      sessionId,
      currentState: state.current,
      hasData: !!state.data,
      dataKeys: state.data ? Object.keys(state.data) : [],
    });
    
    return state;
    
  } catch (error) {
    logger.error('Failed to get session state from Redis', {
      sessionId,
      error: error.message,
    });
    
    // Return null on error (fallback will handle)
    return null;
  }
}

/**
 * Set session state in Redis
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} state - Session state
 * @returns {Promise<boolean>} Success status
 */
export async function setSessionState(sessionId, state) {
  try {
    // Check if Redis is available
    const redisAvailable = await isRedisAvailable();
    if (!redisAvailable) {
      logger.warn('Redis unavailable, skipping state save', { sessionId });
      return false;
    }
    
    // Add timestamp
    const stateWithTimestamp = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    
    // Save to Redis
    const key = `${SESSION_STATE_PREFIX}${sessionId}`;
    await setSession(key, stateWithTimestamp, SESSION_STATE_TTL);
    
    // Log with masked PII
    const maskedData = maskPII(state.data);
    logger.debug('Session state saved to Redis', {
      sessionId,
      currentState: state.current,
      dataKeys: state.data ? Object.keys(state.data) : [],
      maskedData,
      ttl: SESSION_STATE_TTL,
    });
    
    return true;
    
  } catch (error) {
    logger.error('Failed to set session state in Redis', {
      sessionId,
      error: error.message,
      currentState: state?.current,
    });
    
    // Return false on error (caller should handle)
    return false;
  }
}

/**
 * Delete session state from Redis
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteSessionState(sessionId) {
  try {
    const key = `${SESSION_STATE_PREFIX}${sessionId}`;
    await deleteSession(key);
    
    logger.debug('Session state deleted from Redis', { sessionId });
    return true;
    
  } catch (error) {
    logger.error('Failed to delete session state from Redis', {
      sessionId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get or initialize session state with fallback
 * 
 * This is the main function to use in chat.routes.js
 * Handles fallback gracefully if Redis is unavailable
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Session state (from Redis or initial state)
 */
export async function getOrInitSessionState(sessionId) {
  try {
    // Try to get from Redis
    let state = await getSessionState(sessionId);
    
    // If not found or Redis unavailable, initialize new state
    if (!state) {
      logger.info('Initializing new session state', { sessionId });
      state = getInitialState();
      
      // Try to save to Redis (may fail if Redis unavailable)
      const saved = await setSessionState(sessionId, state);
      
      if (!saved) {
        logger.warn('Failed to save initial state to Redis, using in-memory fallback', { sessionId });
      }
    }
    
    return state;
    
  } catch (error) {
    logger.error('Error in getOrInitSessionState, using fallback', {
      sessionId,
      error: error.message,
    });
    
    // Fallback: return initial state
    return getInitialState();
  }
}

/**
 * Update session state in Redis with automatic TTL refresh
 * 
 * @param {string} sessionId - Session ID
 * @param {Object} newState - New session state
 * @returns {Promise<boolean>} Success status
 */
export async function updateSessionState(sessionId, newState) {
  try {
    const success = await setSessionState(sessionId, newState);
    
    if (!success) {
      logger.warn('Failed to update session state in Redis', {
        sessionId,
        currentState: newState?.current,
      });
    }
    
    return success;
    
  } catch (error) {
    logger.error('Error updating session state', {
      sessionId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Check if session state exists in Redis
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} True if exists
 */
export async function sessionStateExists(sessionId) {
  try {
    const state = await getSessionState(sessionId);
    return !!state;
  } catch (error) {
    logger.error('Error checking session state existence', {
      sessionId,
      error: error.message,
    });
    return false;
  }
}

/**
 * Get fallback message when Redis is unavailable
 * 
 * This message is sent to user when state is lost
 * 
 * @returns {Object} Fallback response
 */
export function getFallbackMessage() {
  return {
    message: `Hi — I'm BTRIX.
I help businesses automate sales, support and operations.
What would you like to do today?
1) Pricing & Plans
2) AI Agents
3) Support
4) Book a Demo`,
    isFallback: true,
  };
}

/**
 * Handle Redis unavailable scenario
 * 
 * Returns a graceful degradation response
 * 
 * @param {string} sessionId - Session ID
 * @returns {Object} Fallback state and message
 */
export function handleRedisUnavailable(sessionId) {
  logger.warn('Redis unavailable, degrading gracefully', { sessionId });
  
  const initialState = getInitialState();
  const fallbackMessage = getFallbackMessage();
  
  return {
    state: initialState,
    message: fallbackMessage,
    redisAvailable: false,
  };
}

/**
 * Get session state statistics (for monitoring)
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Statistics
 */
export async function getSessionStateStats(sessionId) {
  try {
    const state = await getSessionState(sessionId);
    
    if (!state) {
      return {
        exists: false,
        sessionId,
      };
    }
    
    return {
      exists: true,
      sessionId,
      currentState: state.current,
      stateHistory: state.history || [],
      dataKeys: state.data ? Object.keys(state.data) : [],
      createdAt: state.createdAt,
      updatedAt: state.updatedAt,
      age: state.createdAt ? Date.now() - new Date(state.createdAt).getTime() : null,
    };
    
  } catch (error) {
    logger.error('Error getting session state stats', {
      sessionId,
      error: error.message,
    });
    return {
      exists: false,
      error: error.message,
    };
  }
}

export default {
  getSessionState,
  setSessionState,
  deleteSessionState,
  getOrInitSessionState,
  updateSessionState,
  sessionStateExists,
  getFallbackMessage,
  handleRedisUnavailable,
  getSessionStateStats,
  maskPII,
};
