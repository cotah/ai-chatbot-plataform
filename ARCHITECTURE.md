# System Architecture

## Overview

This is a production-ready, modular chatbot platform designed for hospitality and business websites. The system provides AI-powered conversational support with advanced capabilities including reservations, orders, payments, CRM integration, and optional video avatar support.

## Architecture Principles

1. **Security First**: All sensitive operations (API keys, payments) are handled server-side only
2. **Modular Design**: Services are decoupled and independently testable
3. **API-First**: RESTful API design with clear separation of concerns
4. **Webhook-Driven**: All important events trigger n8n webhooks for automation
5. **Scalable**: Stateless backend design allows horizontal scaling
6. **Maintainable**: Clear code organization and comprehensive logging

## System Components

### 1. Frontend (To be implemented)
- React/Next.js chatbot widget
- Embedded via script tag (not iframe)
- Theme customization system
- Speech-to-text integration
- Video modal for HeyGen avatar

### 2. Backend API (Node.js/Express)
- RESTful API endpoints
- Authentication middleware
- Rate limiting
- Request validation
- Error handling
- Logging system

### 3. Core Services

#### 3.1 AI Service (OpenAI)
- Chat completions with function calling
- Embeddings for knowledge base
- System prompt management
- Tool definitions (reservations, orders, etc.)
- Conversation context management

#### 3.2 Reservation Service
- Google Calendar API integration
- Event creation with customer details
- Validation and error handling
- Webhook triggers

#### 3.3 Order Service
- Stripe Payment Intents API
- Order creation and confirmation
- Payment status tracking
- Webhook triggers

#### 3.4 CRM Service
- Google Sheets API integration
- Data capture (name, phone, email, intent, notes)
- Timestamp tracking
- Append-only operations

#### 3.5 Video Avatar Service
- HeyGen LiveAvatar API integration
- Session lifecycle management
- Fallback handling
- Webhook triggers

#### 3.6 Webhook Service (n8n)
- Event dispatcher
- Structured payload formatting
- Retry logic
- Error handling

### 4. External Integrations

- **OpenAI**: Chat completions, embeddings
- **Google Calendar**: Event creation for reservations
- **Google Sheets**: CRM data storage
- **Stripe**: Payment processing
- **HeyGen**: Live video avatar
- **n8n**: Automation webhooks

## Data Flow

### Conversation Flow
```
User → Frontend Widget → Backend API → OpenAI → Tool Execution → Response → Frontend
```

### Reservation Flow
```
User Request → AI Tool Call → Validation → Google Calendar → Google Sheets → n8n Webhook → Confirmation
```

### Order Flow
```
User Request → AI Tool Call → Stripe Payment Intent → Payment → Google Sheets → n8n Webhook → Confirmation
```

### Video Avatar Flow
```
User Request → AI Decision → HeyGen Session Creation → Video Modal → Conversation Continuation
```

## Security Architecture

### Backend Security
- Environment variables for all secrets
- API key validation
- Rate limiting per IP/session
- Input sanitization and validation
- CORS configuration
- Request logging

### Payment Security
- Stripe handled entirely server-side
- Payment Intents (not direct charges)
- Webhook signature verification
- No card data in frontend

### Data Privacy
- No PII in logs
- Secure session management
- GDPR considerations in data storage

## API Endpoints Structure

```
POST   /api/chat              - Main chat endpoint
POST   /api/chat/audio        - Speech-to-text processing
POST   /api/reservations      - Create reservation
POST   /api/orders/create     - Create order with payment intent
POST   /api/orders/confirm    - Confirm payment
POST   /api/video/session     - Create HeyGen video session
POST   /api/webhooks/n8n      - Internal webhook dispatcher
GET    /api/health            - Health check
```

## Environment Variables

```
# OpenAI
OPENAI_API_KEY=

# Google APIs
GOOGLE_CALENDAR_ID=
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_KEY= (JSON string or path)

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# HeyGen
HEYGEN_API_KEY=

# n8n
N8N_WEBHOOK_URL=

# Server
PORT=
NODE_ENV=
CORS_ORIGIN=

# Security
RATE_LIMIT_WINDOW_MS=
RATE_LIMIT_MAX_REQUESTS=
```

## Error Handling Strategy

1. **Validation Errors**: 400 Bad Request with clear messages
2. **Authentication Errors**: 401 Unauthorized
3. **Rate Limit Errors**: 429 Too Many Requests
4. **External API Errors**: 502 Bad Gateway with logging
5. **Internal Errors**: 500 Internal Server Error (no sensitive data exposed)

## Logging Strategy

- Structured logging (JSON format)
- Log levels: error, warn, info, debug
- Request/response logging
- External API call logging
- Webhook delivery logging
- No PII in logs

## Scalability Considerations

- Stateless API design
- Session data in memory or Redis (optional)
- Horizontal scaling ready
- Database-free for MVP (Google Sheets as data store)
- Future: PostgreSQL for production scale

## Deployment Architecture

```
Frontend (CDN/Static Hosting)
    ↓
Backend API (Node.js Server)
    ↓
External APIs (OpenAI, Google, Stripe, HeyGen)
    ↓
n8n (Webhook Receiver)
```

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **AI**: OpenAI API
- **Payments**: Stripe API
- **Calendar**: Google Calendar API
- **CRM**: Google Sheets API
- **Video**: HeyGen LiveAvatar API
- **Automation**: n8n (via webhooks)

