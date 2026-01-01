/**
 * Chat Routes
 * Main chat endpoint with OpenAI integration
 */

import express from 'express';
import { chatCompletion } from '../services/openai.service.js';
import { handleToolCall } from '../services/tool-handlers.js';
import { webhookNewConversation, webhookError } from '../services/webhook.service.js';
import { appendCRMData, formatCRMData } from '../services/google-sheets.service.js';
import { createConversation, saveMessage, upsertClient, upsertUserProfile } from '../services/supabase.service.js';
import { updateSession } from '../middleware/auth.js';
import { chatRateLimiter } from '../middleware/rateLimiter.js';
import { validateChatMessage } from '../middleware/validator.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  getSessionLanguage,
  checkLanguageChangeRequest,
  isLanguageAllowed,
  normalizeLanguageCode,
} from '../services/language.service.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// In-memory conversation storage (use Redis in production)
const conversations = new Map();

const sanitizeChatBody = (req, res, next) => {
  // remove campos nulos/undefined que quebram validação
  if ('languageOverride' in (req.body || {}) && req.body.languageOverride == null) {
    delete req.body.languageOverride;
  }
  if ('conversationId' in (req.body || {}) && req.body.conversationId == null) {
    delete req.body.conversationId;
  }
  next();
};

router.post('/language', chatRateLimiter, async (req, res, next) => {
  try {
    const { languageOverride } = req.body;
    const sessionId = req.sessionId;
    const session = req.session;

    if (!languageOverride) {
      return res.status(400).json({
        error: 'languageOverride is required',
      });
    }

    const requestedLanguage = normalizeLanguageCode(languageOverride);

    // Validate language is allowed
    if (!isLanguageAllowed(requestedLanguage)) {
      return res.status(400).json({
        error: 'Language not allowed',
        message: `Language ${requestedLanguage} is not allowed in the current configuration`,
      });
    }

    // Update session language
    const oldLanguage = session.metadata?.language;
    updateSession(sessionId, {
      language: requestedLanguage,
    });

    const languageNames = {
      en: 'English',
      'pt-BR': 'Portuguese (Brazil)',
      es: 'Spanish',
    };

    res.json({
      success: true,
      language: requestedLanguage,
      languageChanged: true,
      message: `Language changed to ${languageNames[requestedLanguage] || requestedLanguage}`,
      systemMessage: true,
    });
  } catch (error) {
    logger.error('Language change error', {
      error: error.message,
      sessionId: req.sessionId,
    });
    next(error);
  }
});

router.post('/', chatRateLimiter, sanitizeChatBody, validateChatMessage, async (req, res, next) => {
  try {
    const { message, conversationId: providedId, languageOverride } = req.body;
    const sessionId = req.sessionId;
    const session = req.session;

    // Reject empty message without language override
    if (!message || !message.trim()) {
      if (!languageOverride) {
        return res.status(400).json({
          error: 'Message is required',
          message: 'Please provide a message or language override',
        });
      }
    }

    // Handle language-only requests (empty message with languageOverride)
    if ((!message || !message.trim()) && languageOverride) {
      // Call language change endpoint logic directly
      const requestedLanguage = normalizeLanguageCode(languageOverride);
      
      if (!isLanguageAllowed(requestedLanguage)) {
        return res.status(400).json({
          error: 'Language not allowed',
          message: `Language ${requestedLanguage} is not allowed in the current configuration`,
        });
      }

      await updateSession(sessionId, {
        language: requestedLanguage,
      });

      const languageNames = {
        en: 'English',
        'pt-BR': 'Portuguese (Brazil)',
        es: 'Spanish',
      };

      return res.json({
        success: true,
        language: requestedLanguage,
        languageChanged: true,
        message: `Language changed to ${languageNames[requestedLanguage] || requestedLanguage}`,
        systemMessage: true,
      });
    }

    // Determine session language
    let sessionLanguage;
    let languageChanged = false;

    // Check for explicit language change request in message
    const languageChangeRequest = checkLanguageChangeRequest(message);
    const requestedLanguage = languageOverride
      ? normalizeLanguageCode(languageOverride)
      : languageChangeRequest;

    // Get or set session language
    sessionLanguage = getSessionLanguage(session, message, requestedLanguage);

    // Check if language changed
    if (session.metadata?.language && session.metadata.language !== sessionLanguage) {
      languageChanged = true;
      logger.info('Session language changed', {
        sessionId,
        oldLanguage: session.metadata.language,
        newLanguage: sessionLanguage,
      });
    }

    // Update session with language
    updateSession(sessionId, {
      language: sessionLanguage,
      lastConversationId: session.metadata?.lastConversationId,
      messageCount: session.metadata?.messageCount || 0,
    });

    // Get or create conversation
    let conversationId = null;
    
    // Priority 1: Use provided conversationId if valid format
    if (providedId) {
      if (conversations.has(providedId)) {
        // Conversation exists in memory
        conversationId = providedId;
      } else {
        // Valid format but not in memory - recreate it
        conversationId = providedId;
        conversations.set(conversationId, {
          id: conversationId,
          sessionId,
          messages: [],
          createdAt: new Date(),
          lastActivity: new Date(),
        });
        logger.info('Recreated conversation from provided ID', {
          conversationId,
          sessionId,
        });
      }
    }
    
    // Priority 2: Check session for conversationId
    if (!conversationId && session.metadata?.conversationId) {
      if (conversations.has(session.metadata.conversationId)) {
        conversationId = session.metadata.conversationId;
      }
    }
    
    // Priority 3: Create new conversation
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversations.set(conversationId, {
        id: conversationId,
        sessionId,
        messages: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      });

      // Update session with conversation ID
      await updateSession(sessionId, { conversationId });

      // STEP 1: Create user_profile FIRST (to satisfy foreign key)
      try {
        await upsertUserProfile({
          session_id: sessionId,
          language: sessionLanguage,
          last_interaction: new Date().toISOString(),
        });
        logger.info('User profile created before conversation', { sessionId });
      } catch (err) {
        logger.error('Failed to create user profile', { error: err.message });
      }

      // STEP 2: Create conversation in Supabase (AFTER user_profile exists)
      try {
        await createConversation({
          id: conversationId,
          session_id: sessionId,
          language: sessionLanguage,
          intent: 'support',
          created_at: new Date().toISOString(),
        });
        logger.info('Conversation created in Supabase', { conversationId });
      } catch (err) {
        logger.error('Failed to create conversation in Supabase', { error: err.message });
      }

      // Trigger new conversation webhook
      await webhookNewConversation(sessionId, { conversationId }).catch((err) => {
        logger.error('Failed to send new conversation webhook', { error: err.message });
      });
    }

    const conversation = conversations.get(conversationId);
    conversation.lastActivity = new Date();

    // Add user message
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    conversation.messages.push(userMessage);

    // STEP 3: Save user message to Supabase (AFTER conversation exists)
    // Note: We don't await here to avoid blocking the response
    saveMessage({
      conversation_id: conversationId,
      session_id: sessionId,
      role: 'user',
      content: message,
      created_at: userMessage.timestamp,
    }).catch((err) => {
      logger.error('Failed to save user message to Supabase', { error: err.message });
    });

    // Get AI response with session language
    const completion = await chatCompletion(conversation.messages, conversationId, sessionLanguage);

    // Add assistant message
    conversation.messages.push(completion.message);

    // Handle tool calls
    let toolResults = [];
    let finalMessage = completion.message.content;
    let userProfileData = {};
    
    if (completion.message.tool_calls && completion.message.tool_calls.length > 0) {
      // Execute tool calls
      const toolCallPromises = completion.message.tool_calls.map(async (toolCall) => {
        try {
          const result = await handleToolCall(
            {
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: toolCall.function.arguments,
            },
            sessionId
          );
          
          // Extract user data from tool calls
          const args = typeof toolCall.function.arguments === 'string' 
            ? JSON.parse(toolCall.function.arguments) 
            : toolCall.function.arguments;
          
          if (args.name) userProfileData.name = args.name;
          if (args.email) userProfileData.email = args.email;
          if (args.phone) userProfileData.phone = args.phone;
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify(result),
          };
        } catch (error) {
          logger.error('Tool call execution failed', {
            tool: toolCall.function.name,
            error: error.message,
            sessionId,
          });
          
          return {
            tool_call_id: toolCall.id,
            role: 'tool',
            name: toolCall.function.name,
            content: JSON.stringify({
              success: false,
              error: error.message,
            }),
          };
        }
      });

      const toolResponses = await Promise.all(toolCallPromises);
      
      // Add tool responses to conversation
      conversation.messages.push(...toolResponses);
      
      // Get final AI response after tool execution (with session language)
      const finalCompletion = await chatCompletion(conversation.messages, conversationId, sessionLanguage);
      const assistantMessage = finalCompletion.message;
      conversation.messages.push(assistantMessage);
      finalMessage = assistantMessage.content;

      // Save assistant message to Supabase (async, non-blocking)
      saveMessage({
        conversation_id: conversationId,
        session_id: sessionId,
        role: 'assistant',
        content: finalMessage,
        created_at: new Date().toISOString(),
      }).catch((err) => {
        logger.error('Failed to save assistant message to Supabase', { error: err.message });
      });
      
      // Save user profile if we captured user data
      if (Object.keys(userProfileData).length > 0) {
        upsertUserProfile({
          session_id: sessionId,
          ...userProfileData,
          language: sessionLanguage,
          last_interaction: new Date().toISOString(),
        }).catch((err) => {
          logger.error('Failed to save user profile to Supabase', { error: err.message });
        });
      }
      
      // Format tool results for frontend
      toolResults = completion.message.tool_calls.map((toolCall) => ({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      }));
    }

    // Update session metadata
    updateSession(sessionId, {
      lastConversationId: conversationId,
      messageCount: conversation.messages.length,
    });

    // Update client data if we have email/phone (async, non-blocking)
    if (message && (session.metadata?.email || session.metadata?.phone)) {
      const clientData = {
        email: session.metadata.email,
        phone: session.metadata.phone,
        preferred_language: sessionLanguage,
        updated_at: new Date().toISOString(),
      };
      
      upsertClient(clientData).catch((err) => {
        logger.error('Failed to upsert client in Supabase', { error: err.message });
      });
    }

    // Log conversation for CRM (non-intrusive)
    await appendCRMData(
      formatCRMData('support', {
        name: req.session?.metadata?.name || '',
        email: req.session?.metadata?.email || '',
        phone: req.session?.metadata?.phone || '',
        notes: `Conversation: ${message.substring(0, 100)}...`,
      })
    ).catch((err) => {
      logger.error('Failed to log conversation to CRM', { error: err.message });
    });

    // Prepare response with language info
    const response = {
      conversationId,
      message: finalMessage,
      toolCalls: toolResults,
      usage: completion.usage,
      language: sessionLanguage,
      languageMode: config.language.mode,
      allowedLanguages: config.language.mode === 'allowed' ? config.language.allowedLanguages : null,
    };

    // Add language change notification if applicable
    if (languageChanged) {
      response.languageChanged = true;
    }

    res.json(response);
  } catch (error) {
    logger.error('Chat endpoint error', {
      error: error.message,
      stack: error.stack,
      sessionId: req.sessionId,
    });

    // Send error webhook
    await webhookError({
      type: 'chat_error',
      message: error.message,
      context: { sessionId: req.sessionId },
      sessionId: req.sessionId,
    }).catch((err) => {
      logger.error('Failed to send error webhook', { error: err.message });
    });

    next(error);
  }
});

export default router;

