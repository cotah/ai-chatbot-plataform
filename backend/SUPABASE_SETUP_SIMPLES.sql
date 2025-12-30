-- ========================================
-- SETUP SUPABASE - VERSÃO SIMPLES
-- ========================================
-- Cole este código no SQL Editor do Supabase
-- Execute tudo de uma vez

-- ========================================
-- 1. LIMPAR TUDO (começar do zero)
-- ========================================

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- ========================================
-- 2. CRIAR TABELAS
-- ========================================

-- Tabela: user_profiles
-- Guarda informações do usuário (nome, email, telefone)
CREATE TABLE user_profiles (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  name TEXT,
  email TEXT,
  phone TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: conversations
-- Guarda cada conversa
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  intent TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: messages
-- Guarda cada mensagem da conversa
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 3. CRIAR ÍNDICES (para buscar rápido)
-- ========================================

-- Buscar perfil por session_id
CREATE INDEX idx_user_profiles_session ON user_profiles(session_id);

-- Buscar perfil por email
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- Buscar conversas por session_id
CREATE INDEX idx_conversations_session ON conversations(session_id);

-- Buscar mensagens por conversation_id
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

-- Buscar mensagens por session_id
CREATE INDEX idx_messages_session ON messages(session_id);

-- Buscar mensagens por data
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ========================================
-- 4. CRIAR FOREIGN KEYS (relações)
-- ========================================

-- Mensagens pertencem a uma conversa
ALTER TABLE messages 
  ADD CONSTRAINT fk_messages_conversation 
  FOREIGN KEY (conversation_id) 
  REFERENCES conversations(id) 
  ON DELETE CASCADE;

-- Conversas pertencem a um usuário
ALTER TABLE conversations 
  ADD CONSTRAINT fk_conversations_user 
  FOREIGN KEY (session_id) 
  REFERENCES user_profiles(session_id) 
  ON DELETE CASCADE;

-- ========================================
-- 5. DESABILITAR RLS (Row Level Security)
-- ========================================
-- Isso permite que o backend acesse os dados
-- usando a SERVICE_ROLE_KEY

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. FUNÇÃO PARA ATUALIZAR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger em conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 7. VERIFICAR SE FUNCIONOU
-- ========================================

-- Você deve ver 3 tabelas vazias
SELECT 'user_profiles' as tabela, COUNT(*) as registros FROM user_profiles
UNION ALL
SELECT 'conversations', COUNT(*) FROM conversations
UNION ALL
SELECT 'messages', COUNT(*) FROM messages;

-- ========================================
-- FIM DO SETUP
-- ========================================
-- Agora suas tabelas estão prontas!
-- Próximo passo: configurar o backend
