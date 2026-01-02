# 🚀 BTRIX GO-LIVE CHECKLIST

Checklist completo para deploy em produção do sistema BTRIX com RAG, Guardrails e Versionamento.

---

## ✅ PRÉ-DEPLOY

### 1. Ambiente e Configuração

- [ ] **Servidor de produção** provisionado e acessível
- [ ] **Node.js 22+** instalado
- [ ] **PM2** ou gerenciador de processos instalado
- [ ] **Supabase** configurado e acessível
- [ ] **OpenAI API** key válida e com créditos

### 2. Variáveis de Ambiente

Criar arquivo `.env` no backend com:

```bash
# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=2000

# Supabase
SUPABASE_URL=https://hxdjqnboqqxpwpscvyhq.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Brain Version (CRITICAL)
BRAIN_VERSION=1.0.2

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

- [ ] Todas as variáveis configuradas
- [ ] `BRAIN_VERSION` correto (1.0.2)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN` correto

### 3. Knowledge Base

- [ ] **Brain v1.0.2** ingerido no Supabase
- [ ] **177 chunks** confirmados
- [ ] **brain_id** = `btrix-brain:1.0.2`
- [ ] Verificar no Supabase Table Editor:
  ```sql
  SELECT brain_id, COUNT(*) 
  FROM knowledge_chunks 
  WHERE brain_id = 'btrix-brain:1.0.2'
  GROUP BY brain_id;
  ```
  **Esperado:** 177 chunks

### 4. Código

- [ ] **Último commit** do `main` branch
- [ ] **Dependências** instaladas (`npm install`)
- [ ] **Build** realizado (se aplicável)
- [ ] **Testes** passando localmente

---

## 🧪 SMOKE TESTS (PRÉ-DEPLOY)

Executar smoke tests localmente antes de deploy:

```bash
cd backend
node smoke_tests.js
```

- [ ] **7/7 smoke tests** passando
- [ ] **Pricing** tests OK
- [ ] **Agents** tests OK
- [ ] **Support** test OK
- [ ] **Enterprise** test OK
- [ ] **Limits** test OK
- [ ] **Database** connectivity OK
- [ ] **Environment** variables OK

**Se algum teste falhar, NÃO FAZER DEPLOY!**

---

## 📦 DEPLOY

### 1. Upload do Código

```bash
# Via Git
git clone https://github.com/cotah/ai-chatbot-plataform.git
cd ai-chatbot-plataform/backend
git checkout main

# Ou via SCP/SFTP
scp -r backend/ user@server:/path/to/app/
```

- [ ] Código transferido para servidor
- [ ] `.env` criado no servidor
- [ ] Permissões corretas

### 2. Instalação

```bash
cd /path/to/app/backend
npm install --production
```

- [ ] Dependências instaladas sem erros

### 3. Iniciar Servidor

```bash
# Com PM2 (recomendado)
pm2 start src/server.js --name btrix-backend --env production

# Ou com Node
NODE_ENV=production node src/server.js
```

- [ ] Servidor iniciado sem erros
- [ ] Porta 3000 (ou configurada) acessível
- [ ] Logs sem erros críticos

### 4. Verificar Logs

```bash
# PM2
pm2 logs btrix-backend

# Ou
tail -f logs/app.log
```

**Procurar por:**
- [ ] `✓ Brain ID: btrix-brain:1.0.2`
- [ ] `✓ Server listening on port 3000`
- [ ] `✓ RAG service initialized`
- [ ] Sem erros de conexão Supabase
- [ ] Sem erros de OpenAI API

---

## 🧪 SMOKE TESTS (PÓS-DEPLOY)

Executar smoke tests no servidor de produção:

```bash
cd /path/to/app/backend
node smoke_tests.js
```

- [ ] **7/7 smoke tests** passando em produção
- [ ] **Latência** aceitável (< 3s por query)
- [ ] **Logs** sendo gerados corretamente

---

## 🔍 VALIDAÇÃO MANUAL

### 1. Teste de Pricing

**Query:** "How much does BTRIX PRO cost?"

**Esperado:**
- ✅ Resposta: "€2,200 setup + €550/month"
- ✅ Sem violações de guardrails
- ✅ Similarity > 0.60

- [ ] Teste de pricing OK

### 2. Teste de Agents

**Query:** "What AI agents are available?"

**Esperado:**
- ✅ Lista de agentes (Sales, Marketing, Finance, etc.)
- ✅ Sem fallback
- ✅ Similarity > 0.55

- [ ] Teste de agents OK

### 3. Teste de Fallback

**Query:** "Can BTRIX make me coffee?"

**Esperado:**
- ✅ Fallback inteligente com quick replies
- ✅ Não inventa resposta
- ✅ Below threshold logged

- [ ] Teste de fallback OK

### 4. Teste de Guardrails

**Query:** "If I get 3 agents, how much would that cost?"

**Esperado:**
- ✅ Bot NÃO responde "€600"
- ✅ Fallback forçado
- ✅ Violação logada

- [ ] Teste de guardrails OK

---

## 📊 MÉTRICAS E MONITORAMENTO

### 1. Dashboard

Acessar: `https://seu-dominio.com/dashboard`

- [ ] Dashboard acessível
- [ ] Métricas sendo coletadas
- [ ] Taxa de fallback visível
- [ ] Similarity média por intent visível

### 2. Logs

Verificar estrutura dos logs:

```bash
tail -f logs/rag_requests.log
```

**Esperado:**
```json
{
  "query": "How much...",
  "language": "en",
  "intentTags": ["pricing"],
  "topSimilarity": 0.78,
  "belowThreshold": false,
  "chunkIds": ["chunk_1", "chunk_2"],
  "retrievalTime": 250,
  "totalTime": 1200
}
```

- [ ] Logs estruturados OK
- [ ] Todos os campos presentes
- [ ] Timestamps corretos

### 3. Alertas (Opcional)

Configurar alertas para:
- [ ] Taxa de fallback > 30%
- [ ] Violações de guardrails > 5/dia
- [ ] Latência média > 3s
- [ ] Erros de API > 10/hora

---

## 🔄 PÓS-DEPLOY

### 1. Monitoramento Inicial (Primeiras 24h)

- [ ] Verificar logs a cada 2h
- [ ] Monitorar taxa de fallback
- [ ] Monitorar violações de guardrails
- [ ] Verificar latência média
- [ ] Coletar feedback de usuários iniciais

### 2. Backup e Rollback

- [ ] Backup do `.env` atual
- [ ] Versão anterior disponível para rollback
- [ ] Script de rollback testado:
  ```bash
  cd btrix-brain/scripts
  ./rollback.sh 1.0.1
  ```

### 3. Documentação

- [ ] URL de produção documentada
- [ ] Credenciais de acesso documentadas
- [ ] Processo de rollback documentado
- [ ] Contatos de emergência documentados

---

## ⚠️ CRITÉRIOS DE ROLLBACK

**Fazer rollback imediatamente se:**

- ❌ Taxa de fallback > 50% (nas primeiras 24h)
- ❌ Violações de guardrails > 20/dia
- ❌ Erros de API > 50/hora
- ❌ Latência média > 5s
- ❌ Smoke tests falhando em produção

**Processo de rollback:**
```bash
# 1. Rollback do Brain
cd btrix-brain/scripts
./rollback.sh 1.0.1

# 2. Restart do backend
pm2 restart btrix-backend

# 3. Verificar logs
pm2 logs btrix-backend

# 4. Executar smoke tests
cd backend
node smoke_tests.js
```

---

## ✅ GO-LIVE APROVADO

Assinar abaixo quando todos os itens estiverem completos:

- [ ] **Pré-deploy** completo
- [ ] **Smoke tests pré-deploy** passando (7/7)
- [ ] **Deploy** realizado sem erros
- [ ] **Smoke tests pós-deploy** passando (7/7)
- [ ] **Validação manual** OK (4/4 testes)
- [ ] **Métricas e monitoramento** funcionando
- [ ] **Backup e rollback** preparados

**Responsável:** ___________________  
**Data:** ___________________  
**Hora:** ___________________  

**Status:** 🟢 GO-LIVE APROVADO

---

## 📞 CONTATOS DE EMERGÊNCIA

- **DevOps:** ___________________ (telefone/email)
- **Backend:** ___________________ (telefone/email)
- **Product:** ___________________ (telefone/email)

---

## 📝 NOTAS

Adicionar observações relevantes sobre o deploy:

```
[Espaço para notas]
```

---

**Última atualização:** 2026-01-02  
**Versão do checklist:** 1.0
