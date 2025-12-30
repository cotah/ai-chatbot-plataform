/**
 * PATCH PARA chat.routes.js
 * 
 * Este arquivo mostra as mudanças que precisam ser feitas
 * no arquivo backend/src/routes/chat.routes.js
 * 
 * INSTRUÇÕES:
 * 1. Adicione os imports no topo do arquivo
 * 2. Adicione a lógica de salvar perfil e conversa
 */

// ========================================
// 1. ADICIONAR IMPORTS (no topo do arquivo, linha ~10)
// ========================================

// ADICIONAR esta linha junto com os outros imports:
import { upsertUserProfile, createConversation, saveMessage } from '../services/supabase.service.js';


// ========================================
// 2. ADICIONAR LÓGICA DE SALVAR PERFIL
// ========================================

// LOCALIZAR esta seção (por volta da linha 165):
/*
    // Update session with language
    updateSession(sessionId, {
      language: sessionLanguage,
      lastConversationId: session.metadata?.lastConversationId,
      messageCount: session.metadata?.messageCount || 0,
    });
*/

// ADICIONAR LOGO APÓS:

    // Criar ou atualizar perfil do usuário no Supabase
    // (isso cria o registro necessário para salvar conversas e mensagens)
    upsertUserProfile({
      session_id: sessionId,
      name: session.metadata?.name || null,
      email: session.metadata?.email || null,
      phone: session.metadata?.phone || null,
      language: sessionLanguage,
    }).catch((err) => {
      logger.error('Failed to upsert user profile', { error: err.message });
    });


// ========================================
// 3. MODIFICAR CRIAÇÃO DE CONVERSA
// ========================================

// LOCALIZAR esta seção (por volta da linha 211-221):
/*
      // Create conversation in Supabase (async, non-blocking)
      if (session.metadata?.clientId) {
        createConversation({
          id: conversationId,
          client_id: session.metadata.clientId,
          language: sessionLanguage,
          created_at: new Date().toISOString(),
        }).catch((err) => {
          logger.error('Failed to create conversation in Supabase', { error: err.message });
        });
      }
*/

// SUBSTITUIR POR:

      // Create conversation in Supabase (async, non-blocking)
      // SEMPRE cria, não precisa de clientId
      createConversation({
        id: conversationId,
        session_id: sessionId,
        intent: 'chat',
        status: 'active',
        created_at: new Date().toISOString(),
      }).catch((err) => {
        logger.error('Failed to create conversation in Supabase', { error: err.message });
      });


// ========================================
// 4. MODIFICAR SALVAMENTO DE MENSAGENS
// ========================================

// LOCALIZAR esta seção (por volta da linha 240-248):
/*
    // Save user message to Supabase (async, non-blocking)
    if (session.metadata?.clientId) {
      saveMessage({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        created_at: userMessage.timestamp,
      });
    }
*/

// SUBSTITUIR POR:

    // Save user message to Supabase (async, non-blocking)
    // SEMPRE salva, não precisa de clientId
    saveMessage({
      conversation_id: conversationId,
      session_id: sessionId,
      role: 'user',
      content: message,
      created_at: userMessage.timestamp,
    }).catch((err) => {
      logger.error('Failed to save user message', { error: err.message });
    });


// LOCALIZAR esta seção (por volta da linha 310-318):
/*
      // Save assistant message to Supabase (async, non-blocking)
      if (session.metadata?.clientId) {
        saveMessage({
          conversation_id: conversationId,
          role: 'assistant',
          content: finalMessage,
          created_at: new Date().toISOString(),
        });
      }
*/

// SUBSTITUIR POR:

      // Save assistant message to Supabase (async, non-blocking)
      // SEMPRE salva, não precisa de clientId
      saveMessage({
        conversation_id: conversationId,
        session_id: sessionId,
        role: 'assistant',
        content: finalMessage,
        created_at: new Date().toISOString(),
      }).catch((err) => {
        logger.error('Failed to save assistant message', { error: err.message });
      });


// ========================================
// RESUMO DAS MUDANÇAS
// ========================================

/*
ANTES:
- Só salvava se existisse clientId
- clientId nunca era criado
- Nada era salvo no Supabase

DEPOIS:
- SEMPRE salva perfil, conversa e mensagens
- Usa session_id como identificador
- Tudo é salvo no Supabase automaticamente
*/
