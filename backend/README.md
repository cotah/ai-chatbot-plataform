# AI Chatbot Platform - Backend

Production-ready backend API for the AI chatbot platform.

## Features

- **AI Chat**: OpenAI GPT-4 integration with function calling
- **Reservations**: Google Calendar integration
- **Orders & Payments**: Stripe Payment Intents
- **CRM**: Google Sheets data capture
- **Video Avatar**: HeyGen LiveAvatar integration
- **Automation**: n8n webhook integration
- **Security**: Rate limiting, input validation, secure API key handling
- **Logging**: Structured logging with Winston

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in all required values:

```bash
cp .env.example .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenAI API key
- `GOOGLE_CALENDAR_ID`: Google Calendar ID for reservations
- `GOOGLE_SHEETS_ID`: Google Sheets ID for CRM
- `GOOGLE_SERVICE_ACCOUNT_KEY`: Path to service account JSON or JSON string
- `STRIPE_SECRET_KEY`: Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook secret
- `HEYGEN_API_KEY`: HeyGen API key
- `N8N_WEBHOOK_URL`: n8n webhook URL

### 3. Google Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API and Google Sheets API
4. Create a service account
5. Download the service account key JSON file
6. Share your Google Calendar with the service account email
7. Share your Google Sheet with the service account email
8. Set `GOOGLE_SERVICE_ACCOUNT_KEY` to the path of the JSON file

### 4. Initialize Google Sheets

Run this once to set up sheet headers (or manually add headers):
- Timestamp
- Name
- Phone
- Email
- Intent
- Notes
- Metadata

### 5. Start Server

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

## API Endpoints

### Chat
- `POST /api/chat` - Main chat endpoint

### Reservations
- `POST /api/reservations` - Create reservation

### Orders
- `POST /api/orders/create` - Create order with payment intent
- `POST /api/orders/confirm` - Confirm payment

### Video
- `POST /api/video/session` - Create video avatar session
- `DELETE /api/video/session/:sessionId` - End video session

### Health
- `GET /api/health` - Health check

## Architecture

See `ARCHITECTURE.md` for detailed system architecture documentation.

## Security

- All API keys stored in environment variables
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS protection
- Helmet security headers
- No sensitive data in logs

## Logging

Logs are written to:
- Console (development)
- `logs/combined.log` (production)
- `logs/error.log` (production, errors only)

## Webhooks

All important events trigger n8n webhooks:
- `conversation.started`
- `reservation.created`
- `order.paid`
- `video.started`
- `whatsapp.fallback`
- `error.occurred`

## Error Handling

- Structured error responses
- Error logging
- Webhook notifications for errors
- Graceful degradation

## Next Steps

1. Set up frontend widget
2. Configure n8n workflows
3. Test all integrations
4. Deploy to production

