# 🤖 OpenAI Models Configuration

## Modelos Suportados

Este projeto suporta os seguintes modelos de IA:

### 1. **gpt-4.1-mini** ⭐ (Recomendado)
- **Custo:** Baixo
- **Velocidade:** Rápida
- **Qualidade:** Excelente para a maioria dos casos
- **Uso recomendado:** Produção, chatbots, atendimento ao cliente

### 2. **gpt-4.1-nano**
- **Custo:** Muito baixo
- **Velocidade:** Muito rápida
- **Qualidade:** Boa para tarefas simples
- **Uso recomendado:** Testes, desenvolvimento, tarefas básicas

### 3. **gemini-2.5-flash**
- **Custo:** Baixo
- **Velocidade:** Rápida
- **Qualidade:** Excelente
- **Uso recomendado:** Alternativa ao GPT-4.1-mini

---

## Configuração

### No arquivo `.env`:

```env
# Modelo padrão (recomendado)
OPENAI_MODEL=gpt-4.1-mini

# Ou para custo mais baixo
OPENAI_MODEL=gpt-4.1-nano

# Ou para usar Gemini
OPENAI_MODEL=gemini-2.5-flash
```

### Padrão do Sistema

Se você **não** configurar `OPENAI_MODEL` no `.env`, o sistema usará automaticamente:

```
gpt-4.1-mini
```

---

## Comparação de Modelos

| Modelo | Custo | Velocidade | Qualidade | Recomendado para |
|--------|-------|------------|-----------|------------------|
| gpt-4.1-mini | 💰 | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Produção |
| gpt-4.1-nano | 💰 | ⚡⚡⚡⚡ | ⭐⭐⭐⭐ | Desenvolvimento |
| gemini-2.5-flash | 💰 | ⚡⚡⚡ | ⭐⭐⭐⭐⭐ | Alternativa |

---

## Custos Estimados (por 1000 tokens)

### gpt-4.1-mini
- **Input:** ~$0.15
- **Output:** ~$0.60
- **Média por conversa:** ~$0.01 - $0.03

### gpt-4.1-nano
- **Input:** ~$0.05
- **Output:** ~$0.20
- **Média por conversa:** ~$0.003 - $0.01

### gemini-2.5-flash
- **Input:** ~$0.10
- **Output:** ~$0.40
- **Média por conversa:** ~$0.008 - $0.02

---

## Mudando o Modelo

### Opção 1: Variável de Ambiente

```bash
# No .env
OPENAI_MODEL=gpt-4.1-mini
```

### Opção 2: Variável de Sistema

```bash
export OPENAI_MODEL=gpt-4.1-mini
npm start
```

### Opção 3: Inline

```bash
OPENAI_MODEL=gpt-4.1-mini npm start
```

---

## Testando Diferentes Modelos

```bash
# Testar com gpt-4.1-mini
OPENAI_MODEL=gpt-4.1-mini npm start

# Testar com gpt-4.1-nano
OPENAI_MODEL=gpt-4.1-nano npm start

# Testar com gemini-2.5-flash
OPENAI_MODEL=gemini-2.5-flash npm start
```

---

## Recomendações por Caso de Uso

### 🏢 Produção (Alto Volume)
```env
OPENAI_MODEL=gpt-4.1-mini
```
Melhor equilíbrio entre custo e qualidade.

### 🧪 Desenvolvimento/Testes
```env
OPENAI_MODEL=gpt-4.1-nano
```
Custo muito baixo para testes frequentes.

### 🌟 Máxima Qualidade
```env
OPENAI_MODEL=gpt-4.1-mini
```
Melhor qualidade de resposta.

### 💰 Mínimo Custo
```env
OPENAI_MODEL=gpt-4.1-nano
```
Custo mais baixo possível.

---

## Troubleshooting

### Erro: "Unsupported model"

**Causa:** Modelo não suportado pelo sistema.

**Solução:** Use apenas:
- `gpt-4.1-mini`
- `gpt-4.1-nano`
- `gemini-2.5-flash`

### Erro: "Invalid API key"

**Causa:** API key inválida ou não configurada.

**Solução:**
```env
OPENAI_API_KEY=sk-proj-your-real-api-key
```

### Modelo muito lento

**Solução:** Use `gpt-4.1-nano` para respostas mais rápidas.

### Respostas de baixa qualidade

**Solução:** Use `gpt-4.1-mini` para melhor qualidade.

---

## Monitoramento de Custos

Para monitorar seus custos:

1. Acesse: https://platform.openai.com/usage
2. Veja uso por modelo
3. Configure limites de gasto
4. Receba alertas de custo

---

## Dicas de Otimização

### 1. Use o modelo certo para cada tarefa
- Tarefas simples → `gpt-4.1-nano`
- Tarefas complexas → `gpt-4.1-mini`

### 2. Otimize os prompts
- Seja específico
- Evite repetições
- Use system messages eficientes

### 3. Configure max_tokens
```env
OPENAI_MAX_TOKENS=2000  # Ajuste conforme necessário
```

### 4. Monitore o uso
- Revise logs regularmente
- Identifique conversas longas
- Otimize fluxos custosos

---

## Suporte

Para mais informações sobre modelos:
- 📖 [OpenAI Models Documentation](https://platform.openai.com/docs/models)
- 💰 [OpenAI Pricing](https://openai.com/pricing)
- 🤖 [Gemini Documentation](https://ai.google.dev/gemini-api/docs)

---

**Configuração Atual:** `gpt-4.1-mini` ✅
