/**
 * OpenAI Service
 * Handles chat completions, embeddings, and function calling
 */

import OpenAI from 'openai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { getCondensedSystemPrompt } from './brain.service.js';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * Get language-specific instructions for system prompt
 */
function getLanguageInstructions(sessionLanguage) {
  const instructions = {
    en: 'You MUST respond ONLY in English. All your responses, tool calls, and interactions must be in English.',
    'pt-BR': 'You MUST respond ONLY in Portuguese (Brazilian). All your responses, tool calls, and interactions must be in Portuguese (Brazilian). Use Brazilian Portuguese spelling and expressions.',
    es: 'You MUST respond ONLY in Spanish. All your responses, tool calls, and interactions must be in Spanish.',
  };

  return instructions[sessionLanguage] || instructions.en;
}

/**
 * Generate system prompt with language context
 */
export function getSystemPrompt(sessionLanguage) {
  const languageInstructions = getLanguageInstructions(sessionLanguage);
  
  // Load system prompt from BTRIX Brain
  let brainPrompt = getCondensedSystemPrompt();
  
  // Add language instructions
  const fullPrompt = `${brainPrompt}

---

## Language Instructions

${languageInstructions}

**Important**: NEVER mix languages in your responses. Respond ONLY in the session language.`;
  
  return fullPrompt;
}

/**
 * System prompt template (legacy - use getSystemPrompt instead)
 */
export const SYSTEM_PROMPT = getSystemPrompt('en');

/**
 * Tool definitions for function calling
 * Focused on lead qualification and demo scheduling
 */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'qualify_lead',
      description: 'Qualify a lead by collecting business information. Use this after gathering: business type, main channel, lead volume, and main goal.',
      parameters: {
        type: 'object',
        properties: {
          businessType: {
            type: 'string',
            description: 'Type of business (e.g., "clinic", "restaurant", "e-commerce", "real estate")',
          },
          mainChannel: {
            type: 'string',
            description: 'Main customer communication channel (e.g., "WhatsApp", "email", "phone", "Instagram")',
          },
          leadVolume: {
            type: 'string',
            description: 'Approximate lead/message volume per day (e.g., "10-50", "50-200", "200+")',
          },
          mainGoal: {
            type: 'string',
            description: 'Main automation goal (e.g., "sales", "support", "scheduling", "operations")',
          },
          recommendedPack: {
            type: 'string',
            description: 'Recommended BTRIX pack based on qualification ("Essential", "Pro", or "Enterprise")',
          },
        },
        required: ['businessType', 'mainChannel', 'leadVolume', 'mainGoal', 'recommendedPack'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'schedule_demo',
      description: 'Collect contact information to schedule a demo. Use this when the lead is qualified and interested in seeing BTRIX in action.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Lead full name',
          },
          email: {
            type: 'string',
            description: 'Lead email address',
          },
          phone: {
            type: 'string',
            description: 'Lead phone number (with country code if possible)',
          },
          company: {
            type: 'string',
            description: 'Company name (optional)',
          },
          preferredTime: {
            type: 'string',
            description: 'Preferred time for demo (e.g., "morning", "afternoon", "specific date/time")',
          },
          notes: {
            type: 'string',
            description: 'Additional notes or specific questions for the demo',
          },
        },
        required: ['name', 'email', 'phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'provide_whatsapp_contact',
      description: 'Provide WhatsApp contact for direct communication. Use when lead prefers WhatsApp or needs immediate human assistance.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for WhatsApp contact (e.g., "lead prefers WhatsApp", "complex question", "urgent request")',
          },
          prefilledMessage: {
            type: 'string',
            description: 'Pre-filled message for WhatsApp with context',
          },
        },
        required: ['reason'],
      },
    },
  },
];

/**
 * Chat completion with function calling
 */
export async function chatCompletion(messages, conversationId = null, sessionLanguage = 'en') {
  try {
    logger.info('OpenAI chat completion request', {
      conversationId,
      messageCount: messages.length,
      sessionLanguage,
    });

    const systemPrompt = getSystemPrompt(sessionLanguage);

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens,
    });

    const completion = response.choices[0];
    logger.info('OpenAI chat completion response', {
      conversationId,
      finishReason: completion.finish_reason,
      hasToolCalls: !!completion.message.tool_calls,
    });

    return {
      message: completion.message,
      usage: response.usage,
      finishReason: completion.finish_reason,
    };
  } catch (error) {
    logger.error('OpenAI chat completion error', {
      error: error.message,
      conversationId,
    });
    throw error;
  }
}

/**
 * Generate embeddings for knowledge base (future use)
 */
export async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    logger.error('OpenAI embedding error', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Speech-to-text transcription (for audio input)
 */
export async function transcribeAudio(audioBuffer, language = 'en') {
  try {
    // Note: OpenAI Whisper API expects a file-like object
    // In production, you'd pass the actual audio file
    const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language,
    });

    return transcription.text;
  } catch (error) {
    logger.error('OpenAI transcription error', {
      error: error.message,
    });
    throw error;
  }
}

export default {
  chatCompletion,
  generateEmbedding,
  transcribeAudio,
  SYSTEM_PROMPT,
  TOOLS,
};

