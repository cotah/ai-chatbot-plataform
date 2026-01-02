/**
 * BTRIX RAG Service
 * Retrieval-Augmented Generation using vector database
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { logRAGRequest, logRAGError, metricsCollector } from './observability.service.js';

// Initialize clients
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// RAG Configuration
const RAG_CONFIG = {
  maxChunks: 8,              // Maximum number of chunks to retrieve
  minSimilarity: 0.55,       // Minimum similarity threshold (0-1) - anti-hallucination
  maxContextChars: 12000,    // Maximum context size in characters
  version: '1.0.1',          // Brain version to use
};

/**
 * Classify user intent from query
 * Returns tags to filter knowledge chunks
 */
function classifyIntent(query) {
  const lowerQuery = query.toLowerCase();
  const tags = [];
  
  // Pricing intent
  if (lowerQuery.match(/price|cost|quanto custa|how much|pricing|€|euro|dollar|payment|pay/)) {
    tags.push('pricing');
  }
  
  // Agents intent
  if (lowerQuery.match(/agent|agente|sales|marketing|finance|inventory|social media|design|video/)) {
    tags.push('agents');
  }
  
  // Support intent
  if (lowerQuery.match(/support|help|ajuda|suporte|contact|contato|24\/7|assistance/)) {
    tags.push('support');
  }
  
  // Limits intent
  if (lowerQuery.match(/not|don't|cannot|can't|limit|restriction|não|nao faz|doesn't/)) {
    tags.push('limits');
  }
  
  // Enterprise intent
  if (lowerQuery.match(/enterprise|custom|large|big company|grande empresa|personalizado/)) {
    tags.push('enterprise');
  }
  
  // Roadmap intent
  if (lowerQuery.match(/future|roadmap|coming|next|quando|when|plan|planejamento/)) {
    tags.push('roadmap');
  }
  
  // Packs intent
  if (lowerQuery.match(/pack|essential|pro|plano|plan|package/)) {
    tags.push('packs');
  }
  
  logger.info('Intent classified', {
    query: query.substring(0, 50),
    tags: tags.length > 0 ? tags : ['none'],
  });
  
  return tags.length > 0 ? tags : null;
}

/**
 * Generate embedding for query
 */
async function generateQueryEmbedding(query) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    logger.error('Error generating query embedding', { error: error.message });
    throw error;
  }
}

/**
 * Search for relevant chunks in vector database
 */
async function searchChunks(embedding, options = {}) {
  const {
    maxChunks = RAG_CONFIG.maxChunks,
    brainId = 'btrix-core',
    source = null,
    tags = null,
  } = options;
  
  try {
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      p_brain_id: brainId,
      p_query_embedding: embedding,
      p_match_count: maxChunks,
      p_source: source,
      p_tags: tags,
    });
    
    if (error) {
      logger.error('Error searching chunks', { error: error.message });
      throw error;
    }
    
    logger.info('Chunks retrieved', {
      count: data?.length || 0,
      brainId,
      maxChunks,
      tags: tags || 'none',
    });
    
    return data || [];
  } catch (error) {
    logger.error('Error in searchChunks', { error: error.message });
    throw error;
  }
}

/**
 * Build context from chunks with character limit
 */
function buildContext(chunks, maxChars = RAG_CONFIG.maxContextChars) {
  if (!chunks || chunks.length === 0) {
    return {
      context: '',
      chunksUsed: 0,
      totalChars: 0,
      sources: [],
    };
  }
  
  const contextParts = [];
  let totalChars = 0;
  const sources = new Set();
  let chunksUsed = 0;
  
  for (const chunk of chunks) {
    const chunkText = `[Source: ${chunk.source} - ${chunk.title || 'Untitled'}]\n${chunk.content}\n`;
    const chunkLength = chunkText.length;
    
    // Stop if adding this chunk would exceed limit
    if (totalChars + chunkLength > maxChars) {
      logger.info('Context limit reached', {
        chunksUsed,
        totalChars,
        maxChars,
      });
      break;
    }
    
    contextParts.push(chunkText);
    totalChars += chunkLength;
    sources.add(chunk.source);
    chunksUsed++;
  }
  
  return {
    context: contextParts.join('\n---\n\n'),
    chunksUsed,
    totalChars,
    sources: Array.from(sources),
    chunks: chunks.slice(0, chunksUsed).map(c => ({
      source: c.source,
      title: c.title,
      similarity: c.similarity,
      tokenCount: c.metadata?.token_count || 0,
    })),
  };
}

/**
 * Retrieve relevant context for a query (main RAG function)
 */
export async function retrieveBrainContext(query, options = {}) {
  const startTime = Date.now();
  let retrievalStartTime;
  
  try {
    logger.info('RAG retrieval started', { query: query.substring(0, 100) });
    
    // Step 1: Classify intent and extract tags
    const intentTags = classifyIntent(query);
    
    // Step 2: Generate embedding for query
    retrievalStartTime = Date.now();
    const embedding = await generateQueryEmbedding(query);
    
    // Step 3: Search for relevant chunks with tags filter
    const chunks = await searchChunks(embedding, {
      ...options,
      tags: intentTags,
    });
    const retrievalTime = Date.now() - retrievalStartTime;
    
    // Step 4: Check similarity threshold (anti-hallucination)
    const topSimilarity = chunks.length > 0 ? chunks[0].similarity : 0;
    const belowThreshold = topSimilarity < RAG_CONFIG.minSimilarity;
    
    if (belowThreshold) {
      logger.warn('Top chunk below similarity threshold', {
        topSimilarity,
        threshold: RAG_CONFIG.minSimilarity,
        query: query.substring(0, 50),
      });
      
      const totalTime = Date.now() - startTime;
      
      // Log for observability
      const logData = {
        query,
        language: options.language,
        intentTags,
        topSimilarity,
        belowThreshold: true,
        chunkIds: [],
        retrievalTime,
        totalTime,
        conversationId: options.conversationId,
        userId: options.userId,
      };
      logRAGRequest(logData);
      metricsCollector.recordRequest(logData);
      
      return {
        context: '',
        chunksUsed: 0,
        totalChars: 0,
        sources: [],
        chunks: [],
        belowThreshold: true,
        topSimilarity,
        intentTags,
      };
    }
    
    // Step 5: Build context with character limit
    const result = buildContext(chunks, options.maxContextChars);
    
    const totalTime = Date.now() - startTime;
    
    logger.info('RAG retrieval complete', {
      chunksRetrieved: chunks.length,
      chunksUsed: result.chunksUsed,
      totalChars: result.totalChars,
      sources: result.sources,
      topSimilarity,
      intentTags,
    });
    
    // Log for observability
    const chunkIds = result.chunks?.map(c => c.id) || [];
    const logData = {
      query,
      language: options.language,
      intentTags,
      topSimilarity,
      belowThreshold: false,
      chunkIds,
      retrievalTime,
      totalTime,
      conversationId: options.conversationId,
      userId: options.userId,
    };
    logRAGRequest(logData);
    metricsCollector.recordRequest(logData);
    
    return {
      ...result,
      belowThreshold: false,
      topSimilarity,
      intentTags,
    };
  } catch (error) {
    logger.error('Error in retrieveBrainContext', {
      error: error.message,
      query: query.substring(0, 100),
    });
    
    // Log error for observability
    logRAGError(error, {
      query,
      intentTags: null,
      conversationId: options.conversationId,
    });
    
    // Return empty context on error (graceful degradation)
    return {
      context: '',
      chunksUsed: 0,
      totalChars: 0,
      sources: [],
      chunks: [],
      error: error.message,
    };
  }
}

/**
 * Get system prompt with RAG context
 */
export async function getSystemPromptWithContext(query, sessionLanguage = 'en') {
  // Base system prompt (behavior rules)
  const basePrompt = `You are BTRIX, an AI assistant for the BTRIX business operating system.

## Core Principles

1. **Always tell the truth** - Use only information from the provided context
2. **Qualify, don't sell** - Understand needs and recommend the right solution
3. **Guide toward demo** - For qualified leads, suggest scheduling a demo
4. **Protect the operation** - Don't promise what BTRIX doesn't do
5. **Be human, not robotic** - Use natural language and show empathy

## Important Rules

- If the context doesn't contain the answer, say "I don't have that specific information in my knowledge base. Would you like to schedule a demo where we can discuss your specific needs?"
- Never invent prices, features, or promises
- Never promise 24/7 human support (it's AI 24/7 + human business hours)
- Never promise guaranteed results
- Filter out bad-fit clients politely

## Tone

Professional, calm, confident, and helpful without being pushy.`;

  // Retrieve relevant context
  const ragResult = await retrieveBrainContext(query, {
    maxChunks: 6,
  });
  
  // Combine base prompt with context
  let fullPrompt = basePrompt;
  
  // Check if below threshold (anti-hallucination)
  if (ragResult.belowThreshold) {
    // Intelligent fallback with guided options
    const fallbackMessages = {
      en: {
        message: "I may not have enough information to answer precisely. To help you better, could you clarify what you're looking for?",
        options: [
          "💰 Pricing & Plans",
          "🤖 AI Agents",
          "📞 Support & Contact",
          "🏢 Enterprise Solutions"
        ]
      },
      'pt-BR': {
        message: "Pode ser que eu não tenha informação suficiente para responder com precisão. Para te ajudar melhor, você poderia esclarecer o que procura?",
        options: [
          "💰 Preços e Planos",
          "🤖 Agentes AI",
          "📞 Suporte e Contato",
          "🏢 Soluções Enterprise"
        ]
      },
      es: {
        message: "Puede ser que no tenga suficiente información para responder con precisión. Para ayudarte mejor, ¿podrías aclarar lo que buscas?",
        options: [
          "💰 Precios y Planes",
          "🤖 Agentes AI",
          "📞 Soporte y Contacto",
          "🏢 Soluciones Enterprise"
        ]
      }
    };
    
    const fallback = fallbackMessages[sessionLanguage] || fallbackMessages.en;
    const optionsText = fallback.options.join('\n');
    
    fullPrompt += `\n\n## IMPORTANT - Low Confidence Warning\n\nThe top relevant chunk has similarity ${ragResult.topSimilarity?.toFixed(2)} which is below the threshold (0.55).\n\nYou MUST respond with:\n\n"${fallback.message}\n\n${optionsText}"\n\nDO NOT attempt to answer the question. DO NOT invent information. Guide the user to clarify their intent.`;
  } else if (ragResult.context) {
    fullPrompt += `\n\n## Relevant Knowledge\n\nUse the following information to answer the user's question:\n\n${ragResult.context}`;
  } else {
    fullPrompt += `\n\n## Note\n\nNo specific knowledge was retrieved for this query. Provide a helpful general response and offer to schedule a demo for detailed information.`;
  }
  
  // Add language instructions
  const languageInstructions = {
    en: 'Respond in English.',
    'pt-BR': 'Responda em Português (Brasil).',
    es: 'Responde en Español.',
  };
  
  fullPrompt += `\n\n## Language\n\n${languageInstructions[sessionLanguage] || languageInstructions.en}`;
  
  return {
    prompt: fullPrompt,
    metadata: {
      chunksUsed: ragResult.chunksUsed,
      totalChars: ragResult.totalChars,
      sources: ragResult.sources,
      chunks: ragResult.chunks,
    },
  };
}

/**
 * Test RAG retrieval (for debugging)
 */
export async function testRetrieval(query) {
  console.log(`\n=== Testing RAG Retrieval ===`);
  console.log(`Query: ${query}\n`);
  
  const result = await retrieveBrainContext(query);
  
  console.log(`Chunks retrieved: ${result.chunksUsed}`);
  console.log(`Total characters: ${result.totalChars}`);
  console.log(`Sources: ${result.sources.join(', ')}`);
  console.log(`\nContext preview:`);
  console.log(result.context.substring(0, 500) + '...\n');
  
  if (result.chunks) {
    console.log(`Chunk details:`);
    result.chunks.forEach((chunk, i) => {
      console.log(`  ${i + 1}. ${chunk.source} - ${chunk.section} (similarity: ${chunk.similarity.toFixed(3)})`);
    });
  }
  
  return result;
}

export default {
  retrieveBrainContext,
  getSystemPromptWithContext,
  testRetrieval,
  RAG_CONFIG,
};
