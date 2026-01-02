/**
 * BTRIX Brain Service
 * Loads knowledge from the BTRIX Brain repository
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to btrix-brain repository (assuming it's cloned in the same parent directory)
const BRAIN_PATH = path.join(__dirname, '../../../../btrix-brain/core');

/**
 * Load system prompt from Brain
 */
export function loadSystemPrompt() {
  try {
    const promptPath = path.join(BRAIN_PATH, 'BOT_SYSTEM_PROMPT.md');
    
    if (!fs.existsSync(promptPath)) {
      logger.warn('BOT_SYSTEM_PROMPT.md not found, using fallback');
      return getFallbackPrompt();
    }

    const content = fs.readFileSync(promptPath, 'utf-8');
    logger.info('System prompt loaded from Brain');
    return content;
  } catch (error) {
    logger.error('Failed to load system prompt from Brain', { error: error.message });
    return getFallbackPrompt();
  }
}

/**
 * Load specific knowledge document from Brain
 */
export function loadKnowledge(documentName) {
  try {
    const docPath = path.join(BRAIN_PATH, `${documentName}.md`);
    
    if (!fs.existsSync(docPath)) {
      logger.warn(`Knowledge document ${documentName}.md not found`);
      return null;
    }

    const content = fs.readFileSync(docPath, 'utf-8');
    logger.info(`Knowledge document ${documentName} loaded from Brain`);
    return content;
  } catch (error) {
    logger.error(`Failed to load knowledge document ${documentName}`, { error: error.message });
    return null;
  }
}

/**
 * Load all core knowledge documents
 */
export function loadAllKnowledge() {
  const documents = [
    'BTRIX_CORE',
    'BTRIX_PACKS',
    'BTRIX_AGENTS',
    'BTRIX_FAQ',
    'BTRIX_LIMITS',
    'BOT_SYSTEM_PROMPT'
  ];

  const knowledge = {};

  for (const doc of documents) {
    const content = loadKnowledge(doc);
    if (content) {
      knowledge[doc] = content;
    }
  }

  logger.info('All knowledge documents loaded from Brain', { 
    loaded: Object.keys(knowledge).length,
    total: documents.length 
  });

  return knowledge;
}

/**
 * Get condensed system prompt for OpenAI
 * (Extracts key sections from BOT_SYSTEM_PROMPT.md)
 */
export function getCondensedSystemPrompt() {
  const fullPrompt = loadSystemPrompt();
  
  if (!fullPrompt) {
    return getFallbackPrompt();
  }

  // Extract key sections (simplified version for token efficiency)
  const sections = [
    '## Your Identity',
    '## Core Principles',
    '## What BTRIX Is',
    '## Service Packs',
    '## AI Agents (Add-ons)',
    '## Support Structure',
    '## What BTRIX Does NOT Do',
    '## Tone and Style Guidelines'
  ];

  let condensed = '';

  for (const section of sections) {
    const sectionStart = fullPrompt.indexOf(section);
    if (sectionStart === -1) continue;

    const nextSectionStart = fullPrompt.indexOf('##', sectionStart + section.length);
    const sectionContent = nextSectionStart === -1
      ? fullPrompt.substring(sectionStart)
      : fullPrompt.substring(sectionStart, nextSectionStart);

    condensed += sectionContent.trim() + '\n\n';
  }

  return condensed || getFallbackPrompt();
}

/**
 * Get pricing information (extracted from BTRIX_PACKS.md)
 */
export function getPricingInfo() {
  const packs = loadKnowledge('BTRIX_PACKS');
  
  if (!packs) {
    return {
      essential: { setup: 1400, monthly: 300 },
      pro: { setup: 2200, monthly: 550 },
      enterprise: { setup: 3500, monthly: 900 }
    };
  }

  // Extract pricing (simple regex parsing)
  const pricing = {
    essential: extractPrice(packs, 'BTRIX ESSENTIAL'),
    pro: extractPrice(packs, 'BTRIX PRO'),
    enterprise: extractPrice(packs, 'BTRIX ENTERPRISE')
  };

  return pricing;
}

/**
 * Get agents information (extracted from BTRIX_AGENTS.md)
 */
export function getAgentsInfo() {
  const agents = loadKnowledge('BTRIX_AGENTS');
  
  if (!agents) {
    return [];
  }

  // Extract agent names and prices (simple parsing)
  const agentList = [
    { name: 'Sales Agent', price: 200 },
    { name: 'Marketing Agent', price: 200 },
    { name: 'Finance Agent', price: 180 },
    { name: 'Inventory Agent', price: 180 },
    { name: 'Social Media Agent', price: 180 },
    { name: 'Design Agent (Image)', price: 180 },
    { name: 'Video Agent', price: 250 }
  ];

  return agentList;
}

/**
 * Helper: Extract pricing from text
 */
function extractPrice(text, packName) {
  const packSection = text.substring(text.indexOf(packName));
  const setupMatch = packSection.match(/Setup.*?€([\d,]+)/);
  const monthlyMatch = packSection.match(/Monthly.*?€([\d,]+)/);

  return {
    setup: setupMatch ? parseInt(setupMatch[1].replace(',', '')) : 0,
    monthly: monthlyMatch ? parseInt(monthlyMatch[1].replace(',', '')) : 0
  };
}

/**
 * Fallback prompt if Brain is not available
 */
function getFallbackPrompt() {
  return `You are BTRIX, an AI assistant for the BTRIX business operating system.

BTRIX is an AI-powered automation platform that helps businesses operate 24/7 without losing leads.

Service Packs:
- Essential: €1,400 setup + €300/month
- Pro: €2,200 setup + €550/month
- Enterprise: €3,500+ setup + €900+/month

Your goal is to qualify leads, answer questions, and guide prospects toward scheduling a demo.

Be professional, calm, and helpful. Always tell the truth and never invent information.`;
}

export default {
  loadSystemPrompt,
  loadKnowledge,
  loadAllKnowledge,
  getCondensedSystemPrompt,
  getPricingInfo,
  getAgentsInfo
};
