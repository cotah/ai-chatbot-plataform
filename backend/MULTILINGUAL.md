# Multilingual Support Documentation

## Overview

The chatbot platform supports multilingual conversations with plan-based controls. The system can operate in three modes: `single`, `auto`, and `allowed`, each providing different levels of language flexibility.

## Supported Languages

- **en** - English
- **pt-BR** - Portuguese (Brazil)
- **es** - Spanish

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
# Language Configuration
LANGUAGE_MODE=single
# Options: "single" | "auto" | "allowed"
# - single: Always use DEFAULT_LANGUAGE
# - auto: Detect from first message and lock for session
# - allowed: Detect from first message, fallback to DEFAULT_LANGUAGE if not in ALLOWED_LANGUAGES

DEFAULT_LANGUAGE=en
# Options: "en" | "pt-BR" | "es"

ALLOWED_LANGUAGES=en,pt-BR,es
# Comma-separated list of allowed languages (only used when LANGUAGE_MODE=allowed)
```

## Language Modes

### 1. Single Mode (`LANGUAGE_MODE=single`)

- **Behavior**: Always responds in `DEFAULT_LANGUAGE`
- **Use Case**: Businesses that only serve one language
- **Language Detection**: Disabled
- **Language Override**: Ignored

**Example:**
```env
LANGUAGE_MODE=single
DEFAULT_LANGUAGE=pt-BR
```
All conversations will be in Portuguese, regardless of user input.

### 2. Auto Mode (`LANGUAGE_MODE=auto`)

- **Behavior**: Detects language from first message and locks it for the session
- **Use Case**: Businesses that want automatic language detection
- **Language Detection**: Enabled (from first message)
- **Language Override**: Supported (if user explicitly requests)

**Example:**
```env
LANGUAGE_MODE=auto
DEFAULT_LANGUAGE=en
```
If user starts with "Olá, quero fazer uma reserva", system detects Portuguese and responds in Portuguese for the entire session.

### 3. Allowed Mode (`LANGUAGE_MODE=allowed`)

- **Behavior**: Detects language from first message, but only allows languages in `ALLOWED_LANGUAGES`. Falls back to `DEFAULT_LANGUAGE` if detected language is not allowed.
- **Use Case**: Businesses that want to support specific languages only
- **Language Detection**: Enabled (from first message)
- **Language Override**: Supported (only if language is in allowed list)

**Example:**
```env
LANGUAGE_MODE=allowed
DEFAULT_LANGUAGE=en
ALLOWED_LANGUAGES=en,pt-BR
```
If user starts with Spanish, system falls back to English (default) since Spanish is not in the allowed list.

## Language Detection

The system uses keyword-based detection with pattern matching:

1. **Explicit Language Requests**: Detects keywords like "english", "português", "español"
2. **Pattern Matching**: Analyzes common words and patterns for each language
3. **Fallback**: Defaults to `DEFAULT_LANGUAGE` if detection is uncertain

### Detection Keywords

- **English**: "english", "inglês", "inglés", "en", "speak english"
- **Portuguese**: "português", "portuguese", "pt-br", "falar português"
- **Spanish**: "español", "spanish", "es", "hablar español"

## Session Language Management

### How It Works

1. **First Message**: Language is detected/set based on mode
2. **Session Lock**: Language is stored in session metadata and persists
3. **Language Override**: User can explicitly request language change
4. **Validation**: Override is validated against allowed languages

### Session Storage

Language is stored in session metadata:
```javascript
session.metadata = {
  language: 'pt-BR',
  // ... other metadata
}
```

## API Integration

### Chat Endpoint

**Request:**
```json
POST /api/chat
{
  "message": "Hello, I need help",
  "conversationId": "conv_123",
  "languageOverride": "pt-BR"  // Optional
}
```

**Response:**
```json
{
  "conversationId": "conv_123",
  "message": "Olá! Como posso ajudá-lo?",
  "language": "pt-BR",
  "languageMode": "auto",
  "allowedLanguages": ["en", "pt-BR", "es"],
  "languageChanged": true,  // Only present if language changed
  "toolCalls": [],
  "usage": { ... }
}
```

### Language Override

Users can request language changes in two ways:

1. **Explicit Request in Message**: "Change to Portuguese" or "Falar português"
2. **API Parameter**: Send `languageOverride` in request body

The system validates the override against:
- Current language mode
- Allowed languages list (if mode is `allowed`)

## Frontend Integration

### Language Chip Component

The frontend displays a language indicator chip in the header:

- **Read-only**: Shows current language (EN/PT/ES)
- **Interactive** (Premium): Clickable dropdown to select language

### Premium Feature

Language selection UI is only enabled when:
- `isPremium={true}` prop is passed to `ChatbotWidget`
- Language mode is `auto` or `allowed`

### Usage

```jsx
<ChatbotWidget
  theme={theme}
  isPremium={true}  // Enable language selection
/>
```

When user selects a language:
1. Frontend sends `languageOverride` in API call
2. Backend validates and updates session language
3. All subsequent responses are in the new language

## OpenAI System Prompt

The system prompt is dynamically generated based on session language:

```javascript
// English
"You MUST respond ONLY in English. All your responses, tool calls, and interactions must be in English."

// Portuguese
"You MUST respond ONLY in Portuguese (Brazilian). All your responses, tool calls, and interactions must be in Portuguese (Brazilian). Use Brazilian Portuguese spelling and expressions."

// Spanish
"You MUST respond ONLY in Spanish. All your responses, tool calls, and interactions must be in Spanish."
```

## Important Rules

1. **No Language Mixing**: All assistant responses must be in the session language
2. **Session Persistence**: Language is locked for the entire session
3. **Validation**: Language changes are validated against configuration
4. **Fallback**: Invalid languages fall back to `DEFAULT_LANGUAGE`

## Testing

### Test Single Mode
```bash
# Set in .env
LANGUAGE_MODE=single
DEFAULT_LANGUAGE=pt-BR

# All responses should be in Portuguese
```

### Test Auto Mode
```bash
# Set in .env
LANGUAGE_MODE=auto
DEFAULT_LANGUAGE=en

# Send: "Olá, preciso de ajuda"
# Response should be in Portuguese
```

### Test Allowed Mode
```bash
# Set in .env
LANGUAGE_MODE=allowed
DEFAULT_LANGUAGE=en
ALLOWED_LANGUAGES=en,pt-BR

# Send: "Hola, necesito ayuda" (Spanish)
# Response should be in English (fallback)
```

## Troubleshooting

### Language Not Changing

1. Check `LANGUAGE_MODE` - must be `auto` or `allowed`
2. Verify language is in `ALLOWED_LANGUAGES` (if mode is `allowed`)
3. Check session metadata - language should be stored there
4. Review logs for language detection/validation errors

### Wrong Language Detection

1. Improve keyword detection in `language.service.js`
2. Consider using a proper language detection library
3. Add more language patterns for better accuracy

### Language Mixing

1. Verify system prompt includes language instructions
2. Check that `sessionLanguage` is passed to `chatCompletion`
3. Review OpenAI responses for language compliance

## Future Enhancements

- [ ] Add more languages (French, German, Italian, etc.)
- [ ] Use proper language detection library (e.g., `franc`, `langdetect`)
- [ ] Add language detection confidence scores
- [ ] Support per-conversation language (not just per-session)
- [ ] Add language statistics and analytics

