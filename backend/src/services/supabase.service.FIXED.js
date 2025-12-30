/**
 * Supabase Service - VERSÃO CORRIGIDA
 * Handles Supabase client and database operations
 */

import { createClient } from '@supabase/supabase-js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let supabaseClient = null;

/**
 * Initialize Supabase client
 */
export function initSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      logger.warn('Supabase credentials not configured');
      return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    logger.info('Supabase client initialized');
    return supabaseClient;
  } catch (error) {
    logger.error('Failed to initialize Supabase', { error: error.message });
    return null;
  }
}

/**
 * Get Supabase client instance
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    return initSupabase();
  }
  return supabaseClient;
}

/**
 * ========================================
 * USER PROFILES
 * ========================================
 */

/**
 * Criar ou atualizar perfil do usuário
 */
export async function upsertUserProfile(profileData) {
  try {
    const client = getSupabaseClient();
    if (!client) {
      logger.debug('Supabase not configured, skipping user profile upsert');
      return null;
    }

    const { data, error } = await client
      .from('user_profiles')
      .upsert(profileData, {
        onConflict: 'session_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('User profile saved to Supabase', {
      sessionId: profileData.session_id,
    });

    return data;
  } catch (error) {
    logger.error('Failed to upsert user profile in Supabase', {
      error: error.message,
      sessionId: profileData.session_id,
    });
    return null;
  }
}

/**
 * Buscar perfil do usuário por session_id
 */
export async function getUserProfile(sessionId) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get user profile from Supabase', {
      error: error.message,
      sessionId,
    });
    return null;
  }
}

/**
 * ========================================
 * CONVERSATIONS
 * ========================================
 */

/**
 * Create conversation
 */
export async function createConversation(conversationData) {
  try {
    const client = getSupabaseClient();
    if (!client) {
      logger.debug('Supabase not configured, skipping conversation creation');
      return null;
    }

    const { data, error } = await client
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('Conversation created in Supabase', {
      conversationId: conversationData.id,
    });

    return data;
  } catch (error) {
    logger.error('Failed to create conversation in Supabase', {
      error: error.message,
      conversationId: conversationData.id,
    });
    return null;
  }
}

/**
 * Buscar conversas de um usuário
 */
export async function getConversationsBySession(sessionId) {
  try {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Failed to get conversations from Supabase', {
      error: error.message,
      sessionId,
    });
    return [];
  }
}

/**
 * ========================================
 * MESSAGES
 * ========================================
 */

/**
 * Save message to Supabase (async, non-blocking)
 */
export async function saveMessage(messageData) {
  try {
    const client = getSupabaseClient();
    if (!client) {
      logger.debug('Supabase not configured, skipping message save');
      return null;
    }

    const { data, error } = await client
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.debug('Message saved to Supabase', {
      conversationId: messageData.conversation_id,
      role: messageData.role,
    });

    return data;
  } catch (error) {
    logger.error('Failed to save message to Supabase', {
      error: error.message,
      conversationId: messageData.conversation_id,
    });
    return null;
  }
}

/**
 * Buscar mensagens de uma conversa
 */
export async function getMessagesByConversation(conversationId) {
  try {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error('Failed to get messages from Supabase', {
      error: error.message,
      conversationId,
    });
    return [];
  }
}

/**
 * ========================================
 * LEGACY FUNCTIONS (manter compatibilidade)
 * ========================================
 */

/**
 * Get client by email or phone (legacy)
 */
export async function getClientByIdentifier(identifier, type = 'email') {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const column = type === 'email' ? 'email' : 'phone';
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .eq(column, identifier)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to get client from Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Create or update client (legacy - usa user_profiles)
 */
export async function upsertClient(clientData) {
  // Redireciona para upsertUserProfile
  return upsertUserProfile(clientData);
}

/**
 * ========================================
 * EXPORTS
 * ========================================
 */

export default {
  initSupabase,
  getSupabaseClient,
  upsertUserProfile,
  getUserProfile,
  createConversation,
  getConversationsBySession,
  saveMessage,
  getMessagesByConversation,
  // Legacy
  getClientByIdentifier,
  upsertClient,
};
