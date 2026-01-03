/**
 * Message Formatter Service
 * Post-processes AI responses to ensure WhatsApp-friendly formatting
 */

import logger from '../utils/logger.js';

/**
 * Configuration
 */
const MAX_MESSAGE_LENGTH = 450; // Characters threshold for splitting
const PARAGRAPH_SEPARATOR = '\n\n';

/**
 * Split long message into multiple shorter messages
 * Preserves paragraph boundaries and maintains coherence
 */
export function splitLongMessage(message) {
  // If message is short enough, return as-is
  if (message.length <= MAX_MESSAGE_LENGTH) {
    return [message];
  }

  const parts = [];
  const paragraphs = message.split(PARAGRAPH_SEPARATOR);
  let currentPart = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed limit, save current part and start new one
    if (currentPart && (currentPart.length + paragraph.length + 2) > MAX_MESSAGE_LENGTH) {
      parts.push(currentPart.trim());
      currentPart = paragraph;
    } else {
      // Add paragraph to current part
      currentPart += (currentPart ? PARAGRAPH_SEPARATOR : '') + paragraph;
    }
  }

  // Add remaining content
  if (currentPart) {
    parts.push(currentPart.trim());
  }

  // If no paragraphs were split (single long paragraph), split by sentences
  if (parts.length === 1 && parts[0].length > MAX_MESSAGE_LENGTH) {
    return splitBySentences(parts[0]);
  }

  return parts;
}

/**
 * Split long paragraph by sentences
 */
function splitBySentences(text) {
  const parts = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentPart = '';

  for (const sentence of sentences) {
    if (currentPart && (currentPart.length + sentence.length) > MAX_MESSAGE_LENGTH) {
      parts.push(currentPart.trim());
      currentPart = sentence;
    } else {
      currentPart += (currentPart ? ' ' : '') + sentence;
    }
  }

  if (currentPart) {
    parts.push(currentPart.trim());
  }

  return parts;
}

/**
 * Format message for WhatsApp
 * - Splits long messages
 * - Logs when splitting occurs
 * - Returns array of messages ready to send
 */
export function formatForWhatsApp(message, conversationId = null) {
  const parts = splitLongMessage(message);

  // Log if message was split
  if (parts.length > 1) {
    logger.info('Message split for WhatsApp', {
      conversationId,
      originalLength: message.length,
      parts: parts.length,
      partLengths: parts.map(p => p.length),
    });
  }

  return parts;
}

/**
 * Validate message length and format
 * Returns warnings if message is too long or poorly formatted
 */
export function validateMessageFormat(message) {
  const warnings = [];

  // Check length
  if (message.length > MAX_MESSAGE_LENGTH) {
    warnings.push({
      type: 'length',
      message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters (${message.length} chars)`,
      severity: 'warning',
    });
  }

  // Check for walls of text (no line breaks)
  const lineBreaks = (message.match(/\n/g) || []).length;
  if (message.length > 200 && lineBreaks === 0) {
    warnings.push({
      type: 'formatting',
      message: 'Message is a wall of text with no line breaks',
      severity: 'warning',
    });
  }

  // Check for multiple questions in one message
  const questionMarks = (message.match(/\?/g) || []).length;
  if (questionMarks > 1) {
    warnings.push({
      type: 'questions',
      message: `Message contains ${questionMarks} questions (should be 1 per message)`,
      severity: 'info',
    });
  }

  // Check for long lists
  const bulletPoints = (message.match(/^[-•*]\s/gm) || []).length;
  if (bulletPoints > 4) {
    warnings.push({
      type: 'list',
      message: `Message contains ${bulletPoints} bullet points (max 4 recommended)`,
      severity: 'info',
    });
  }

  return warnings;
}

/**
 * Get formatting metrics for a message
 */
export function getMessageMetrics(message) {
  return {
    length: message.length,
    paragraphs: message.split(PARAGRAPH_SEPARATOR).length,
    sentences: (message.match(/[.!?]+/g) || []).length,
    questions: (message.match(/\?/g) || []).length,
    bulletPoints: (message.match(/^[-•*]\s/gm) || []).length,
    lineBreaks: (message.match(/\n/g) || []).length,
    exceedsLimit: message.length > MAX_MESSAGE_LENGTH,
  };
}

export default {
  splitLongMessage,
  formatForWhatsApp,
  validateMessageFormat,
  getMessageMetrics,
};
