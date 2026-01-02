/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'OPENAI_API_KEY',
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_SHEETS_ID',
  'STRIPE_SECRET_KEY',
  'HEYGEN_API_KEY',
  'N8N_WEBHOOK_URL',
];

// Validate required environment variables
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0 && process.env.NODE_ENV !== 'development') {
  console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
}

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
  },

  google: {
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    sheetsId: process.env.GOOGLE_SHEETS_ID,
    serviceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    serviceAccountKeyJson: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    currency: process.env.STRIPE_CURRENCY || 'usd',
  },

  heygen: {
    apiKey: process.env.HEYGEN_API_KEY,
    baseUrl: process.env.HEYGEN_BASE_URL || 'https://api.heygen.com',
  },

  n8n: {
    webhookUrl: process.env.N8N_WEBHOOK_URL,
    timeout: parseInt(process.env.N8N_WEBHOOK_TIMEOUT || '5000', 10),
    retries: parseInt(process.env.N8N_WEBHOOK_RETRIES || '3', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  language: {
    mode: process.env.LANGUAGE_MODE || 'allowed', // 'single' | 'auto' | 'allowed' - Changed to 'allowed' to enable language selector
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en', // 'en' | 'pt-BR' | 'es'
    allowedLanguages: process.env.ALLOWED_LANGUAGES
      ? process.env.ALLOWED_LANGUAGES.split(',').map((lang) => lang.trim())
      : ['en', 'pt-BR', 'es'], // Changed to include all supported languages
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_SESSION_TTL || '86400', 10), // 24 hours
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
};

export default config;

