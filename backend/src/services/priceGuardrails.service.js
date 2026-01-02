/**
 * Price Guardrails Service
 * Validates that responses only contain prices from the official KB
 * 
 * HARD RULES (ZERO TOLERANCE):
 * - Bot NEVER calculates prices
 * - Bot NEVER rounds prices
 * - Bot NEVER infers discounts
 * - Bot NEVER sums agents automatically
 * - Bot can ONLY repeat exact strings from KB
 * - If no exact match → FORCE FALLBACK
 * 
 * FLOW:
 * 1. RAG generates context
 * 2. LLM generates response
 * 3. Guardrail validates response (POST-CHECK)
 * 4. If violation → discard response + force fallback
 * 5. Log all violations for analysis
 */

import logger from '../utils/logger.js';

/**
 * Official prices from BTRIX KB (v1.0.2)
 * Source: BTRIX_PACKS.md + BTRIX_AGENTS.md
 */
const OFFICIAL_PRICES = {
  // BTRIX Packs
  packs: {
    essential: {
      setup: 1400,
      monthly: 300,
      currency: '€',
      display: ['€1,400', '€1400', '1400', '€300', '€ 300', '300'],
    },
    pro: {
      setup: 2200,
      monthly: 550,
      currency: '€',
      display: ['€2,200', '€2200', '2200', '€550', '€ 550', '550'],
    },
    enterprise: {
      setup: 3500, // minimum
      monthly: 900, // minimum
      currency: '€',
      display: ['€3,500', '€3500', '3500', '€900', '€ 900', '900', '€3,500+', '€900+'],
    },
  },
  
  // BTRIX Agents (all €200/month)
  agents: {
    price: 200,
    currency: '€',
    display: ['€200', '€ 200', '200'],
    names: [
      'Sales Agent',
      'Marketing Agent',
      'Finance Agent',
      'Social Media Agent',
      'Inventory Agent',
      'Design Agent',
      'Video Agent',
    ],
  },
  
  // Bundles (discounted)
  bundles: {
    essentialAgents: {
      monthly: 430,
      savings: 250,
      currency: '€',
      display: ['€430', '€ 430', '430', '€250', '250'],
    },
    proAgents: {
      monthly: 790,
      savings: 520,
      currency: '€',
      display: ['€790', '€ 790', '790', '€520', '520'],
    },
    enterpriseAgents: {
      monthly: 1350,
      savings: 640,
      currency: '€',
      display: ['€1,350', '€1350', '1350', '€640', '640'],
    },
  },
};

/**
 * Extract all valid price patterns from official prices
 */
function getAllValidPrices() {
  const validPrices = new Set();
  
  // Add pack prices
  Object.values(OFFICIAL_PRICES.packs).forEach(pack => {
    pack.display.forEach(price => validPrices.add(price));
  });
  
  // Add agent prices
  OFFICIAL_PRICES.agents.display.forEach(price => validPrices.add(price));
  
  // Add bundle prices
  Object.values(OFFICIAL_PRICES.bundles).forEach(bundle => {
    bundle.display.forEach(price => validPrices.add(price));
  });
  
  return Array.from(validPrices);
}

/**
 * Detect price mentions in text
 * Returns array of detected prices
 */
export function detectPrices(text) {
  const pricePatterns = [
    // €1,400 or €1400 or € 1400
    /€\s*[\d,]+/g,
    // 1400€ or 1,400€
    /[\d,]+\s*€/g,
    // "1400 euros" or "1,400 euros"
    /[\d,]+\s*euros?/gi,
    // "1400 per month" or "1,400/month"
    /[\d,]+\s*(?:per month|\/month|monthly)/gi,
    // "setup fee of 1400"
    /(?:setup|fee|cost|price).*?[\d,]+/gi,
  ];
  
  const detectedPrices = [];
  
  pricePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      detectedPrices.push(...matches);
    }
  });
  
  return [...new Set(detectedPrices)]; // Remove duplicates
}

/**
 * Validate that detected prices are in official KB
 * STRICT: Only exact matches in proper context
 */
export function validatePrices(detectedPrices, fullText = '') {
  const validPrices = getAllValidPrices();
  const invalidPrices = [];
  
  // Forbidden contexts (even if number exists in KB)
  const forbiddenPatterns = [
    /approximately|around|about|roughly|estimated?/i,
    /together|total|combined|sum/i,
    /would be|could be|might be/i,
    /starter|basic|beginner/i, // Not official pack names
  ];
  
  detectedPrices.forEach(detected => {
    // Check if price appears in forbidden context
    const hasForbiddenContext = forbiddenPatterns.some(pattern => {
      const contextWindow = fullText.substring(
        Math.max(0, fullText.indexOf(detected) - 50),
        Math.min(fullText.length, fullText.indexOf(detected) + detected.length + 50)
      );
      return pattern.test(contextWindow);
    });
    
    if (hasForbiddenContext) {
      invalidPrices.push(detected);
      return;
    }
    
    // Normalize detected price (remove spaces, keep € and digits)
    const normalized = detected.replace(/\s+/g, '').toLowerCase();
    
    // Check if any valid price matches
    const isValid = validPrices.some(valid => {
      const normalizedValid = valid.replace(/\s+/g, '').toLowerCase();
      return normalized.includes(normalizedValid) || normalizedValid.includes(normalized);
    });
    
    if (!isValid) {
      invalidPrices.push(detected);
    }
  });
  
  return {
    isValid: invalidPrices.length === 0,
    invalidPrices,
    detectedPrices,
  };
}

/**
 * Check response for price guardrails
 * Returns { passed, reason, detectedPrices, invalidPrices }
 */
export function checkPriceGuardrails(responseText) {
  try {
    // Step 1: Detect prices in response
    const detectedPrices = detectPrices(responseText);
    
    // If no prices detected, pass
    if (detectedPrices.length === 0) {
      return {
        passed: true,
        reason: 'No prices detected',
        detectedPrices: [],
        invalidPrices: [],
      };
    }
    
    // Step 2: Validate detected prices with context
    const validation = validatePrices(detectedPrices, responseText);
    
    if (validation.isValid) {
      logger.info('Price guardrails passed', {
        detectedPrices: validation.detectedPrices,
      });
      
      return {
        passed: true,
        reason: 'All prices valid',
        detectedPrices: validation.detectedPrices,
        invalidPrices: [],
      };
    } else {
      logger.warn('Price guardrails FAILED - VIOLATION DETECTED', {
        detectedPrices: validation.detectedPrices,
        invalidPrices: validation.invalidPrices,
        responsePreview: responseText.substring(0, 200),
      });
      
      return {
        passed: false,
        reason: 'Invalid prices detected',
        detectedPrices: validation.detectedPrices,
        invalidPrices: validation.invalidPrices,
      };
    }
  } catch (error) {
    logger.error('Error in price guardrails', { error: error.message });
    
    // On error, fail safe (block response)
    return {
      passed: false,
      reason: 'Guardrails error',
      detectedPrices: [],
      invalidPrices: [],
      error: error.message,
    };
  }
}

/**
 * Get fallback message when guardrails fail
 */
export function getPriceGuardrailFallback(language = 'en') {
  const fallbacks = {
    en: "I want to make sure I give you accurate pricing information. Let me connect you with BTRIX to confirm the exact costs for your specific needs. Would you like to schedule a demo?",
    'pt-BR': "Quero garantir que te passe informações precisas sobre preços. Deixe-me conectar você com a BTRIX para confirmar os custos exatos para suas necessidades específicas. Gostaria de agendar uma demo?",
    es: "Quiero asegurarme de darte información precisa sobre precios. Déjame conectarte con BTRIX para confirmar los costos exactos para tus necesidades específicas. ¿Te gustaría agendar una demo?",
  };
  
  return fallbacks[language] || fallbacks.en;
}

/**
 * Log price violation (CRITICAL - for enterprise evidence)
 */
export function logPriceViolation({
  query,
  response,
  detectedPrices,
  invalidPrices,
  brainVersion,
  conversationId,
  userId,
}) {
  logger.error('PRICE GUARDRAIL VIOLATION', {
    severity: 'CRITICAL',
    query: query?.substring(0, 200), // Truncate for privacy
    responseBlocked: response?.substring(0, 500), // Full context
    detectedPrices,
    invalidPrices,
    ruleViolated: 'Prices not in official KB',
    brainVersion,
    conversationId,
    userId,
    timestamp: new Date().toISOString(),
    action: 'Response discarded, fallback forced',
  });
}

/**
 * Get official prices (for reference)
 */
export function getOfficialPrices() {
  return OFFICIAL_PRICES;
}
