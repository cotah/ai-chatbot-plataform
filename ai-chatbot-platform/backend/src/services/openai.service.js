/**
 * OpenAI Service
 * Handles chat completions, embeddings, and function calling
 */

import OpenAI from 'openai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

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
  
  return `You are a professional, warm, and helpful AI assistant for a hospitality business. You are a MULTILINGUAL ASSISTANT capable of communicating in multiple languages.

${languageInstructions}

Your role is to assist customers with:

1. **General Information**: Answer questions about business hours, location, services, policies, and FAQs. Be concise, professional, and warm.

2. **Reservations**: Help customers make reservations by collecting:
   - Name
   - Phone number
   - Email address
   - Date and time
   - Number of guests
   
   Once you have all information, use the create_reservation tool.

3. **Orders**: Help customers place pickup orders. When ready, use the create_order tool to initiate payment.

4. **Menu**: When customers ask about the menu, inform them that the menu is available via video content and provide a YouTube channel or playlist link. Explain that each item is presented in a short video format.

5. **Video Support**: Offer "Video Assistance" when:
   - The customer requests it
   - The conversation becomes complex
   - You need to show something visually
   
   Use the create_video_session tool when appropriate.

6. **Human Handoff**: If the customer explicitly requests to speak with a human, or if you're unable to help, provide a WhatsApp link for direct contact.

**Important Guidelines**:
- Be conversational and natural
- Ask clarifying questions when needed
- Confirm important details before taking actions
- If you don't know something, admit it and offer alternatives
- Always confirm reservations and orders before finalizing
- Use tools only when you have complete information
- NEVER mix languages in your responses - respond ONLY in the session language
- If the user asks to change language, comply only if the language is allowed by the system configuration

**Tone**: Professional, warm, concise, and helpful.`;
}

/**
 * System prompt template (legacy - use getSystemPrompt instead)
 */
export const SYSTEM_PROMPT = getSystemPrompt('en');

/**
 * Tool definitions for function calling
 */
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_reservation',
      description: 'Create a reservation for a customer. Use this when you have collected all required information: name, phone, email, date, time, and number of guests.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Customer full name',
          },
          phone: {
            type: 'string',
            description: 'Customer phone number',
          },
          email: {
            type: 'string',
            description: 'Customer email address',
          },
          date: {
            type: 'string',
            description: 'Reservation date in ISO 8601 format (YYYY-MM-DD)',
          },
          time: {
            type: 'string',
            description: 'Reservation time in HH:MM format (24-hour)',
          },
          guests: {
            type: 'number',
            description: 'Number of guests',
          },
          notes: {
            type: 'string',
            description: 'Additional notes or special requests',
          },
        },
        required: ['name', 'phone', 'email', 'date', 'time', 'guests'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Create a pickup order with payment. Use this when the customer is ready to place an order and you have all item details.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Array of order items',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Item name',
                },
                quantity: {
                  type: 'number',
                  description: 'Item quantity',
                },
                price: {
                  type: 'number',
                  description: 'Item price in the currency unit',
                },
              },
              required: ['name', 'quantity', 'price'],
            },
          },
          customerName: {
            type: 'string',
            description: 'Customer full name',
          },
          customerPhone: {
            type: 'string',
            description: 'Customer phone number',
          },
          customerEmail: {
            type: 'string',
            description: 'Customer email address',
          },
          notes: {
            type: 'string',
            description: 'Special instructions or notes',
          },
        },
        required: ['items', 'customerName', 'customerPhone', 'customerEmail'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_menu_link',
      description: 'Get the YouTube channel or playlist link for the menu. Use this when customer asks about menu items.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Menu category if specified (e.g., "appetizers", "main courses", "desserts")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_video_session',
      description: 'Create a video avatar session for visual assistance. Use this when customer requests video help or when visual demonstration would be helpful.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for video session (e.g., "customer requested", "complex explanation needed")',
          },
          conversationContext: {
            type: 'string',
            description: 'Brief context of the conversation to help the video avatar',
          },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'provide_whatsapp_link',
      description: 'Provide WhatsApp contact link for human support. Use this when customer explicitly requests human help or when you cannot assist further.',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: 'Reason for WhatsApp handoff (e.g., "customer requested human", "complex issue")',
          },
          message: {
            type: 'string',
            description: 'Pre-filled message for WhatsApp',
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

