/**
 * Language Service
 * Handles language detection, validation, and session language management
 */

import config from '../config/index.js';
import logger from '../utils/logger.js';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
  es: 'Español',
};

// Language detection keywords
const LANGUAGE_KEYWORDS = {
  en: [
    'english',
    'inglês',
    'inglés',
    'en',
    'english please',
    'speak english',
    'in english',
  ],
  'pt-BR': [
    'português',
    'portuguese',
    'português brasileiro',
    'brasileiro',
    'pt-br',
    'pt',
    'falar português',
    'em português',
  ],
  es: [
    'español',
    'spanish',
    'es',
    'hablar español',
    'en español',
    'castellano',
  ],
};

/**
 * Detect language from text using keyword matching
 * This is a simple heuristic - in production, consider using a proper language detection library
 */
export function detectLanguage(text) {
  if (!text || typeof text !== 'string') {
    return config.language.defaultLanguage;
  }

  const lowerText = text.toLowerCase().trim();

  // Check for explicit language requests first
  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        logger.debug('Language detected from keywords', { language: lang, keyword });
        return lang;
      }
    }
  }

  // Simple heuristic detection based on common words/patterns
  // Portuguese patterns
  if (
    /\b(olá|oi|tchau|obrigado|obrigada|por favor|quero|gostaria)\b/i.test(text) ||
    /\b(é|não|sim|tem|está|fazer|falar)\b/i.test(text)
  ) {
    return 'pt-BR';
  }

  // Spanish patterns
  if (
    /\b(hola|adiós|gracias|por favor|quiero|gustaría)\b/i.test(text) ||
    /\b(es|no|sí|tiene|está|hacer|hablar)\b/i.test(text)
  ) {
    return 'es';
  }

  // Default to English if no clear pattern
  return 'en';
}

/**
 * Check if a language is allowed based on configuration
 */
export function isLanguageAllowed(language) {
  const { mode, allowedLanguages, defaultLanguage } = config.language;

  if (mode === 'single') {
    return language === defaultLanguage;
  }

  if (mode === 'allowed') {
    return allowedLanguages.includes(language);
  }

  // auto mode: all supported languages are allowed
  return Object.keys(SUPPORTED_LANGUAGES).includes(language);
}

/**
 * Get session language based on mode and user input
 */
export function getSessionLanguage(session, userMessage, languageOverride = null) {
  const { mode, defaultLanguage, allowedLanguages } = config.language;

  // If language override is provided, validate it
  if (languageOverride) {
    if (isLanguageAllowed(languageOverride)) {
      logger.info('Language override applied', {
        sessionId: session.id,
        language: languageOverride,
      });
      return languageOverride;
    } else {
      logger.warn('Language override not allowed, using default', {
        sessionId: session.id,
        requested: languageOverride,
        default: defaultLanguage,
      });
      return defaultLanguage;
    }
  }

  // Check if session already has a language set
  if (session.metadata?.language) {
    return session.metadata.language;
  }

  // Determine language based on mode
  if (mode === 'single') {
    return defaultLanguage;
  }

  if (mode === 'auto' || mode === 'allowed') {
    // Detect language from first message
    const detectedLanguage = detectLanguage(userMessage);

    if (mode === 'allowed') {
      // Check if detected language is in allowed list
      if (allowedLanguages.includes(detectedLanguage)) {
        return detectedLanguage;
      } else {
        logger.info('Detected language not in allowed list, using default', {
          detected: detectedLanguage,
          default: defaultLanguage,
        });
        return defaultLanguage;
      }
    }

    // auto mode: use detected language
    return detectedLanguage;
  }

  // Fallback to default
  return defaultLanguage;
}

/**
 * Check if user is requesting a language change
 */
export function checkLanguageChangeRequest(message) {
  const lowerMessage = message.toLowerCase();

  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (
        lowerMessage.includes(`change to ${keyword}`) ||
        lowerMessage.includes(`switch to ${keyword}`) ||
        lowerMessage.includes(`use ${keyword}`) ||
        lowerMessage.includes(`speak ${keyword}`) ||
        lowerMessage.includes(`in ${keyword}`)
      ) {
        return lang;
      }
    }
  }

  return null;
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language) {
  return SUPPORTED_LANGUAGES[language] || language;
}

/**
 * Get language code from display name or code
 */
export function normalizeLanguageCode(language) {
  // Check if it's already a valid code
  if (SUPPORTED_LANGUAGES[language]) {
    return language;
  }

  // Try to find by display name
  for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (name.toLowerCase() === language.toLowerCase()) {
      return code;
    }
  }

  // Default fallback
  return config.language.defaultLanguage;
}

export default {
  detectLanguage,
  isLanguageAllowed,
  getSessionLanguage,
  checkLanguageChangeRequest,
  getLanguageDisplayName,
  normalizeLanguageCode,
  SUPPORTED_LANGUAGES,
};

