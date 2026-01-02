/**
 * BTRIX RAG Service
 * Retrieval-Augmented Generation using vector database
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import config from '../config/index.js';
import logger from '../utils/logger.js';

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
  minSimilarity: 0.7,        // Minimum similarity threshold (0-1)
  maxContextChars: 12000,    // Maximum context size in characters
  version: '1.0.0',          // Brain version to use
};

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
  } = options;
  
  try {
    const { data, error } = await supabase.rpc('match_knowledge_chunks', {
      p_brain_id: brainId,
      p_query_embedding: embedding,
      p_match_count: maxChunks,
      p_source: source,
    });
    
    if (error) {
      logger.error('Error searching chunks', { error: error.message });
      throw error;
    }
    
    logger.info('Chunks retrieved', {
      count: data?.length || 0,
      brainId,
      maxChunks,
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
  try {
    logger.info('RAG retrieval started', { query: query.substring(0, 100) });
    
    // Step 1: Generate embedding for query
    const embedding = await generateQueryEmbedding(query);
    
    // Step 2: Search for relevant chunks
    const chunks = await searchChunks(embedding, options);
    
    // Step 3: Build context with character limit
    const result = buildContext(chunks, options.maxContextChars);
    
    logger.info('RAG retrieval complete', {
      chunksRetrieved: chunks.length,
      chunksUsed: result.chunksUsed,
      totalChars: result.totalChars,
      sources: result.sources,
    });
    
    return result;
  } catch (error) {
    logger.error('Error in retrieveBrainContext', {
      error: error.message,
      query: query.substring(0, 100),
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
    minSimilarity: 0.7,
  });
  
  // Combine base prompt with context
  let fullPrompt = basePrompt;
  
  if (ragResult.context) {
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
