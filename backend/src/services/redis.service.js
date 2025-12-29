/**
 * Redis Service
 * Handles Redis connection and session management
 */

import Redis from 'ioredis';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let redisClient = null;

/**
 * Initialize Redis connection
 */
export function initRedis() {
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('error', (error) => {
      logger.error('Redis client error', { error: error.message });
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
    });

    return redisClient;
  } catch (error) {
    logger.error('Failed to initialize Redis', { error: error.message });
    throw error;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  if (!redisClient) {
    return initRedis();
  }
  return redisClient;
}

/**
 * Get session data from Redis
 */
export async function getSession(sessionId) {
  try {
    const client = getRedisClient();
    const data = await client.get(`session:${sessionId}`);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data);
  } catch (error) {
    logger.error('Failed to get session from Redis', {
      error: error.message,
      sessionId,
    });
    return null;
  }
}

/**
 * Set session data in Redis with TTL
 */
export async function setSession(sessionId, data, ttlSeconds = 86400) {
  try {
    const client = getRedisClient();
    const key = `session:${sessionId}`;
    
    await client.setex(key, ttlSeconds, JSON.stringify(data));
    
    logger.debug('Session saved to Redis', {
      sessionId,
      ttl: ttlSeconds,
    });
  } catch (error) {
    logger.error('Failed to set session in Redis', {
      error: error.message,
      sessionId,
    });
    throw error;
  }
}

/**
 * Delete session from Redis
 */
export async function deleteSession(sessionId) {
  try {
    const client = getRedisClient();
    await client.del(`session:${sessionId}`);
    
    logger.debug('Session deleted from Redis', { sessionId });
  } catch (error) {
    logger.error('Failed to delete session from Redis', {
      error: error.message,
      sessionId,
    });
  }
}

/**
 * Update session TTL
 */
export async function refreshSessionTTL(sessionId, ttlSeconds = 86400) {
  try {
    const client = getRedisClient();
    await client.expire(`session:${sessionId}`, ttlSeconds);
  } catch (error) {
    logger.error('Failed to refresh session TTL', {
      error: error.message,
      sessionId,
    });
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable() {
  try {
    const client = getRedisClient();
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

export default {
  initRedis,
  getRedisClient,
  getSession,
  setSession,
  deleteSession,
  refreshSessionTTL,
  isRedisAvailable,
};

