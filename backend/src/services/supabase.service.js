/**
 * Supabase Service
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
 * Get client by email or phone
 */
export async function getClientByIdentifier(identifier, type = 'email') {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const column = type === 'email' ? 'email' : 'phone';
    const { data, error } = await client
      .from('clients')
      .select('*')
      .eq(column, identifier)
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
    logger.error('Failed to get client from Supabase', {
      error: error.message,
      identifier,
      type,
    });
    return null;
  }
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(profileData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

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
      session_id: profileData.session_id,
    });

    return data;
  } catch (error) {
    logger.error('Failed to upsert user profile in Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Create or update client
 */
export async function upsertClient(clientData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('clients')
      .upsert(clientData, {
        onConflict: 'email',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to upsert client in Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Create conversation
 */
export async function createConversation(conversationData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to create conversation in Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Save message to Supabase
 */
export async function saveMessage(messageData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info('Message saved to Supabase', {
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
 * Create reservation
 */
export async function createReservation(reservationData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('reservations')
      .insert(reservationData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to create reservation in Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Create order
 */
export async function createOrder(orderData) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    logger.error('Failed to create order in Supabase', {
      error: error.message,
    });
    return null;
  }
}

/**
 * Get client plan
 */
export async function getClientPlan(clientId) {
  try {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
      .from('clients')
      .select('plan')
      .eq('id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data?.plan || null;
  } catch (error) {
    logger.error('Failed to get client plan from Supabase', {
      error: error.message,
      clientId,
    });
    return null;
  }
}

export default {
  initSupabase,
  getSupabaseClient,
  getClientByIdentifier,
  upsertClient,
  upsertUserProfile,
  createConversation,
  saveMessage,
  createReservation,
  createOrder,
  getClientPlan,
};

