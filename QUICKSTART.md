# 🚀 Quick Start Guide - AI Chatbot Platform

## Início Rápido em 5 Minutos

### 1️⃣ Instalação (1 min)

```bash
# Clone e instale
git clone <seu-repo>
cd ai-chatbot-platform

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2️⃣ Configuração Mínima (2 min)

#### Backend

```bash
cd backend
```

Crie `.env`:

```env
PORT=3001
OPENAI_API_KEY=sk-proj-...
CORS_ORIGIN=http://localhost:5173
DEFAULT_LANGUAGE=en
LANGUAGE_MODE=auto
ALLOWED_LANGUAGES=en,pt-BR,es
```

> **Nota:** Apenas OPENAI_API_KEY é obrigatório para começar. Todos os outros serviços (Redis, Supabase, etc.) são opcionais e usam fallbacks.

#### Frontend

```bash
cd frontend
```

Crie `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### 3️⃣ Executar (1 min)

#### Opção A: Servidor de Teste (Recomendado para testes)

```bash
# Terminal 1 - Backend de teste (sem OpenAI)
cd backend
node test-local.js
```

#### Opção B: Servidor Completo (Com OpenAI)

```bash
# Terminal 1 - Backend completo
cd backend
npm start
```

#### Frontend

```bash
# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4️⃣ Testar (1 min)

#### Teste Automatizado

```bash
# Em outro terminal
cd ai-chatbot-platform
node test-runner.js
```

Deve mostrar:
```
🎉 ALL TESTS PASSED! 🎉
✅ Chatbot is ready for production!
```

#### Teste Visual

1. Abra http://localhost:5173
2. Clique no botão do chatbot
3. Digite "Hello"
4. Veja a resposta!

#### Interface de Teste

Abra `frontend/test.html` no navegador para testes completos.

---

## 🎯 Próximos Passos

### Personalizar o Chatbot

#### Tema

Edite `frontend/src/demo.jsx`:

```javascript
const theme = {
  primaryColor: "#667eea",      // Cor principal
  secondaryColor: "#764ba2",    // Cor secundária
  borderRadius: "20px",         // Bordas arredondadas
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  textColor: "#1a1a1a",
  assistantMessageColor: "#f0f0f0",
  userMessageColor: "#667eea",
};
```

#### Mensagem de Boas-vindas

Edite `frontend/src/components/ChatbotWidget.jsx`:

```javascript
setMessages([
  {
    id: "welcome",
    role: "assistant",
    content: "Olá! Como posso ajudar você hoje?", // Sua mensagem aqui
    timestamp: new Date(),
  },
]);
```

#### Prompt do Sistema

Edite `backend/src/services/openai.service.js`:

```javascript
const systemMessage = {
  role: 'system',
  content: `Você é um assistente virtual...`, // Seu prompt aqui
};
```

### Adicionar Serviços Opcionais

#### Redis (Sessões Persistentes)

```bash
# Instalar Redis
docker run -d -p 6379:6379 redis

# Adicionar ao .env
REDIS_URL=redis://localhost:6379
```

#### Supabase (Banco de Dados)

1. Crie conta em https://supabase.com
2. Crie novo projeto
3. Execute o SQL em `backend/SUPABASE_SCHEMA.sql`
4. Adicione ao `.env`:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### Stripe (Pagamentos)

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### HeyGen (Avatar de Vídeo)

```env
HEYGEN_API_KEY=...
```

---

## 🧪 Validar Instalação

### Health Check

```bash
curl http://localhost:3001/api/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-29T00:00:00.000Z",
  "environment": "development"
}
```

### Teste de Chat

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session-123" \
  -d '{"message": "Hello"}'
```

Resposta esperada:
```json
{
  "conversationId": "conv_1234567890_abc123",
  "message": "Hi! How can I help you today?",
  "language": "en",
  "languageMode": "auto"
}
```

---

## 🐛 Troubleshooting

### Backend não inicia

**Erro:** `Error: Cannot find module 'express'`

**Solução:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend não conecta ao backend

**Erro:** `Failed to fetch` ou `CORS error`

**Solução:**
1. Verifique se o backend está rodando
2. Verifique `VITE_API_BASE_URL` no `.env.local`
3. Verifique `CORS_ORIGIN` no backend `.env`

### OpenAI API não funciona

**Erro:** `401 Unauthorized`

**Solução:**
1. Verifique se `OPENAI_API_KEY` está correto
2. Verifique se tem créditos na conta OpenAI
3. Use o servidor de teste: `node test-local.js`

### Testes falham

**Erro:** `Connection refused`

**Solução:**
1. Certifique-se que o servidor está rodando
2. Verifique a porta (padrão: 3001)
3. Execute `node test-local.js` primeiro

---

## 📚 Documentação Completa

- [README.md](./README.md) - Documentação principal
- [FIXES_APPLIED.md](./FIXES_APPLIED.md) - Correções aplicadas
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura do sistema
- [backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md) - Deploy em produção

---

## ✅ Checklist de Validação

- [ ] Backend instalado e rodando
- [ ] Frontend instalado e rodando
- [ ] Health check retorna "healthy"
- [ ] Testes automatizados passam 100%
- [ ] Interface web funciona
- [ ] Chat responde mensagens
- [ ] Conversa mantém contexto
- [ ] Troca de idioma funciona

---

## 🎉 Pronto!

Seu chatbot está funcionando! 

**Próximos passos:**
1. Personalize o tema e mensagens
2. Configure serviços opcionais (Redis, Supabase)
3. Faça deploy em produção (Render + Vercel)
4. Monitore logs e métricas

**Precisa de ajuda?**
- 📖 Leia a documentação completa
- 🧪 Use a interface de teste
- 📝 Veja os exemplos no código

---

**Desenvolvido com ❤️ para ser fácil de usar**
