# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Accounts for:
  - OpenAI
  - Google Cloud (for Calendar & Sheets)
  - Stripe
  - HeyGen (optional)
  - n8n (optional)

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your API keys (at minimum, add OpenAI key to test):

```env
OPENAI_API_KEY=sk-your-key-here
```

### 3. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### 4. Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "ai-chatbot-platform",
  "version": "1.0.0"
}
```

### 5. Test Chat Endpoint

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what are your hours?"
  }'
```

## Full Configuration

### Google Calendar Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project
3. Enable Calendar API
4. Create service account
5. Download JSON key
6. Share calendar with service account email
7. Add to `.env`:
   ```env
   GOOGLE_CALENDAR_ID=your-calendar-id
   GOOGLE_SERVICE_ACCOUNT_KEY=./path/to/key.json
   ```

### Google Sheets Setup

1. Create a Google Sheet
2. Share with service account email
3. Get Sheet ID from URL
4. Add to `.env`:
   ```env
   GOOGLE_SHEETS_ID=your-sheet-id
   ```
5. Initialize headers (run once or manually):
   - Timestamp, Name, Phone, Email, Intent, Notes, Metadata

### Stripe Setup

1. Create Stripe account
2. Get API keys from dashboard
3. Add to `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

### HeyGen Setup (Optional)

1. Create HeyGen account
2. Get API key
3. Add to `.env`:
   ```env
   HEYGEN_API_KEY=your-key
   HEYGEN_AVATAR_ID=your-avatar-id
   ```

### n8n Setup (Optional)

1. Set up n8n instance
2. Create webhook workflow
3. Add to `.env`:
   ```env
   N8N_WEBHOOK_URL=https://your-n8n.com/webhook/chatbot
   ```

## Testing Endpoints

### Chat
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "I want to make a reservation"}'
```

### Reservation (requires Google setup)
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "date": "2024-01-20",
    "time": "19:00",
    "guests": 4
  }'
```

### Order Creation (requires Stripe setup)
```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"name": "Pizza", "quantity": 1, "price": 15.99}],
    "customerName": "Jane Doe",
    "customerPhone": "+1234567890",
    "customerEmail": "jane@example.com"
  }'
```

## Common Issues

### "Missing environment variables"
- Check `.env` file exists
- Verify all required variables are set
- Restart server after changing `.env`

### "Google API error"
- Verify service account has access
- Check calendar/sheet is shared
- Verify API is enabled in Google Cloud

### "Stripe error"
- Use test keys for development
- Verify key format is correct
- Check Stripe dashboard for errors

### "Port already in use"
- Change `PORT` in `.env`
- Or kill process using port 3000

## Next Steps

1. Read `ARCHITECTURE.md` for system overview
2. Read `DEPLOYMENT.md` for production setup
3. Read `SECURITY.md` for security checklist
4. Read `N8N_WEBHOOKS.md` for automation setup
5. Build frontend widget (next phase)

## Development Tips

- Use `npm run dev` for auto-reload
- Check logs in console
- Use Postman/Insomnia for API testing
- Enable debug logging: `LOG_LEVEL=debug`

## Production Checklist

Before deploying:
- [ ] All environment variables set
- [ ] Google services configured
- [ ] Stripe webhook configured
- [ ] n8n workflows set up
- [ ] CORS origin configured
- [ ] Rate limiting tuned
- [ ] Logging configured
- [ ] Error tracking set up
- [ ] Health checks working
- [ ] SSL/HTTPS enabled

