# Backend Structure

## Folder Organization

```
backend/
├── src/
│   ├── config/
│   │   └── index.js              # Centralized configuration
│   ├── middleware/
│   │   ├── auth.js                # Session management
│   │   ├── rateLimiter.js        # Rate limiting
│   │   ├── validator.js          # Input validation
│   │   └── errorHandler.js       # Error handling
│   ├── routes/
│   │   ├── chat.routes.js         # Main chat endpoint
│   │   ├── audio.routes.js       # Speech-to-text
│   │   ├── reservations.routes.js # Reservation creation
│   │   ├── orders.routes.js       # Order & payment
│   │   ├── video.routes.js       # Video avatar sessions
│   │   └── health.routes.js       # Health check
│   ├── services/
│   │   ├── openai.service.js      # OpenAI integration
│   │   ├── google-calendar.service.js # Calendar events
│   │   ├── google-sheets.service.js   # CRM data
│   │   ├── stripe.service.js      # Payment processing
│   │   ├── heygen.service.js      # Video avatar
│   │   ├── webhook.service.js     # n8n webhooks
│   │   └── tool-handlers.js       # OpenAI tool execution
│   ├── utils/
│   │   └── logger.js              # Winston logger
│   └── server.js                  # Express app entry point
├── package.json
├── .env.example
├── .gitignore
├── README.md
├── ARCHITECTURE.md
├── DEPLOYMENT.md
├── SECURITY.md
├── N8N_WEBHOOKS.md
└── STRUCTURE.md
```

## Key Components

### Configuration (`src/config/`)
- Centralized environment variable management
- Validation of required variables
- Default values for optional settings

### Middleware (`src/middleware/`)
- **auth.js**: Session management (in-memory, upgrade to Redis for production)
- **rateLimiter.js**: Multiple rate limiters (general, chat, payment)
- **validator.js**: Input validation using express-validator
- **errorHandler.js**: Global error handling and custom error classes

### Routes (`src/routes/`)
- **chat.routes.js**: Main conversational AI endpoint with tool calling
- **audio.routes.js**: Speech-to-text transcription
- **reservations.routes.js**: Create reservations in Google Calendar
- **orders.routes.js**: Create orders and process payments
- **video.routes.js**: Manage HeyGen video avatar sessions
- **health.routes.js**: System health check

### Services (`src/services/`)
- **openai.service.js**: 
  - Chat completions with function calling
  - System prompt and tool definitions
  - Speech-to-text transcription
  - Embeddings (for future knowledge base)
  
- **google-calendar.service.js**:
  - Create reservation events
  - Check availability (optional)
  
- **google-sheets.service.js**:
  - Append CRM data
  - Format data by intent type
  - Initialize sheet headers
  
- **stripe.service.js**:
  - Create payment intents
  - Confirm payments
  - Cancel payment intents
  - Webhook signature verification
  
- **heygen.service.js**:
  - Create video avatar sessions
  - End sessions
  - Get session status
  - Send messages to sessions
  
- **webhook.service.js**:
  - Dispatch webhooks to n8n
  - Retry logic with exponential backoff
  - Event-specific webhook functions
  
- **tool-handlers.js**:
  - Execute OpenAI function calls
  - Handle reservations, orders, menu, video, WhatsApp

### Utils (`src/utils/`)
- **logger.js**: Winston logger with structured logging

## API Endpoints

### Chat
- `POST /api/chat` - Main chat endpoint
- `POST /api/chat/audio` - Speech-to-text

### Reservations
- `POST /api/reservations` - Create reservation

### Orders
- `POST /api/orders/create` - Create order with payment intent
- `POST /api/orders/confirm` - Confirm payment

### Video
- `POST /api/video/session` - Create video session
- `DELETE /api/video/session/:sessionId` - End video session

### Health
- `GET /api/health` - Health check

## Data Flow

### Conversation Flow
1. User sends message → Frontend
2. Frontend → `POST /api/chat`
3. Backend → OpenAI API
4. OpenAI returns response + tool calls (if any)
5. Backend executes tool calls
6. Backend → OpenAI again with tool results
7. Backend → Frontend with final response

### Reservation Flow
1. AI decides to create reservation
2. Tool call → `handleCreateReservation`
3. Create Google Calendar event
4. Append to Google Sheets (CRM)
5. Trigger n8n webhook
6. Return confirmation to AI
7. AI responds to user

### Order Flow
1. AI decides to create order
2. Tool call → `handleCreateOrder`
3. Create Stripe Payment Intent
4. Return payment details to frontend
5. Frontend handles payment
6. Frontend → `POST /api/orders/confirm`
7. Confirm payment with Stripe
8. Append to Google Sheets
9. Trigger n8n webhook
10. Return confirmation

## Security Features

- Environment variables for all secrets
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Session management
- Error handling without exposing sensitive data

## Logging

- Structured JSON logging in production
- Human-readable in development
- Separate error log file
- Request/response logging
- External API call logging

## Webhooks

All important events trigger n8n webhooks:
- `conversation.started`
- `reservation.created`
- `order.paid`
- `video.started`
- `whatsapp.fallback`
- `error.occurred`

See `N8N_WEBHOOKS.md` for detailed schemas.

## Next Steps

1. Set up environment variables
2. Configure Google services
3. Set up Stripe
4. Configure HeyGen
5. Set up n8n workflows
6. Test all endpoints
7. Deploy to production

