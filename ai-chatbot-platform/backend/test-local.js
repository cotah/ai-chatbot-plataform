/**
 * Local Test Script
 * Test the chat API locally without external dependencies
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-API-Key', 'X-Client-Key'],
}));

app.options('*', cors({
  origin: config.server.corsOrigin === '*' ? true : config.server.corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID', 'X-API-Key', 'X-Client-Key'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple session middleware
app.use((req, res, next) => {
  const sessionId = req.headers['x-session-id'] || `sess_${Date.now()}`;
  req.sessionId = sessionId;
  req.session = {
    id: sessionId,
    metadata: {},
  };
  res.setHeader('X-Session-ID', sessionId);
  next();
});

// In-memory conversation storage
const conversations = new Map();

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId: providedId, languageOverride } = req.body;
    const sessionId = req.sessionId;

    console.log('📨 Request:', { message, conversationId: providedId, languageOverride, sessionId });

    // Validate message
    if (!message || message.trim().length === 0) {
      if (languageOverride) {
        // Language change only
        return res.json({
          success: true,
          language: languageOverride,
          languageChanged: true,
          message: `Language changed to ${languageOverride}`,
          systemMessage: true,
        });
      }
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message must be at most 2000 characters',
      });
    }

    // Validate conversationId format if provided
    if (providedId && !/^conv_[0-9]+_[a-z0-9]+$/.test(providedId)) {
      return res.status(400).json({
        error: 'Invalid conversation ID format',
      });
    }

    // Get or create conversation
    let conversationId = providedId && conversations.has(providedId) ? providedId : null;
    
    if (!conversationId) {
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      conversations.set(conversationId, {
        id: conversationId,
        sessionId,
        messages: [],
        createdAt: new Date(),
      });
      console.log('✨ New conversation created:', conversationId);
    } else {
      console.log('📝 Existing conversation:', conversationId);
    }

    const conversation = conversations.get(conversationId);
    
    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    // Mock AI response
    const aiResponse = `Echo: ${message} (Conversation: ${conversationId}, Messages: ${conversation.messages.length})`;

    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Response sent:', { conversationId, messageCount: conversation.messages.length });

    res.json({
      conversationId,
      message: aiResponse,
      toolCalls: [],
      language: languageOverride || 'en',
      languageMode: 'auto',
      allowedLanguages: ['en', 'pt-BR', 'es'],
    });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/api/chat\n`);
});
