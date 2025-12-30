# n8n Webhook Schemas

This document describes all webhook events sent to n8n for automation.

## Base Webhook Structure

All webhooks are sent as POST requests to the configured `N8N_WEBHOOK_URL` with the following base structure:

```json
{
  "event": "event.type",
  "timestamp": "2024-01-15T10:30:00.000Z",
  ...eventSpecificData
}
```

## Webhook Events

### 1. conversation.started

Triggered when a new conversation begins.

**Payload:**
```json
{
  "event": "conversation.started",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sessionId": "uuid-session-id",
  "metadata": {
    "conversationId": "conv_1234567890_abc123",
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://example.com"
  }
}
```

**Use Cases:**
- Track new customer interactions
- Initialize customer profile
- Send welcome notifications

---

### 2. reservation.created

Triggered when a reservation is successfully created.

**Payload:**
```json
{
  "event": "reservation.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "reservation": {
    "name": "John Doe",
    "phone": "+1234567890",
    "email": "john@example.com",
    "date": "2024-01-20",
    "time": "19:00",
    "guests": 4,
    "eventId": "google-calendar-event-id",
    "eventLink": "https://calendar.google.com/event?eid=..."
  }
}
```

**Use Cases:**
- Send confirmation SMS
- Send confirmation email
- Update CRM system
- Notify staff
- Create follow-up tasks

---

### 3. order.paid

Triggered when an order payment is confirmed.

**Payload:**
```json
{
  "event": "order.paid",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "order": {
    "paymentIntentId": "pi_1234567890",
    "amount": 45.99,
    "currency": "usd",
    "customerName": "Jane Smith",
    "customerEmail": "jane@example.com",
    "customerPhone": "+1234567890",
    "items": [
      {
        "name": "Pizza Margherita",
        "quantity": 2,
        "price": 15.99
      },
      {
        "name": "Caesar Salad",
        "quantity": 1,
        "price": 14.01
      }
    ],
    "orderId": "order_uuid-123"
  }
}
```

**Use Cases:**
- Send order confirmation
- Notify kitchen/staff
- Update inventory
- Create pickup reminder
- Send receipt

---

### 4. video.started

Triggered when a video avatar session is created.

**Payload:**
```json
{
  "event": "video.started",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "video": {
    "sessionId": "heygen-session-id",
    "sessionUrl": "https://heygen.com/session/...",
    "reason": "Customer requested video assistance"
  }
}
```

**Use Cases:**
- Track video usage
- Monitor session quality
- Follow up after video session
- Analytics

---

### 5. whatsapp.fallback

Triggered when customer is directed to WhatsApp.

**Payload:**
```json
{
  "event": "whatsapp.fallback",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "fallback": {
    "reason": "Customer requested human support",
    "customerMessage": "I need to speak with someone",
    "sessionId": "uuid-session-id"
  }
}
```

**Use Cases:**
- Notify support team
- Create support ticket
- Track handoff reasons
- Follow up

---

### 6. error.occurred

Triggered when an error occurs in the system.

**Payload:**
```json
{
  "event": "error.occurred",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": {
    "type": "reservation_error",
    "message": "Failed to create calendar event",
    "context": {
      "sessionId": "uuid-session-id",
      "customerEmail": "customer@example.com"
    },
    "sessionId": "uuid-session-id"
  }
}
```

**Error Types:**
- `chat_error` - Chat endpoint error
- `reservation_error` - Reservation creation failed
- `order_error` - Order creation failed
- `order_confirmation_error` - Payment confirmation failed
- `video_error` - Video session creation failed

**Use Cases:**
- Alert monitoring system
- Notify technical team
- Log to error tracking service
- Create support ticket

---

## n8n Workflow Examples

### Example 1: Reservation Confirmation Workflow

```javascript
// Trigger: reservation.created
// Actions:
1. Send confirmation email via SendGrid
2. Send SMS via Twilio
3. Add to CRM (HubSpot/Salesforce)
4. Create task in project management tool
5. Notify staff via Slack
```

### Example 2: Order Processing Workflow

```javascript
// Trigger: order.paid
// Actions:
1. Send order confirmation email
2. Create ticket in kitchen management system
3. Update inventory
4. Send pickup reminder (30 min before)
5. Add to analytics dashboard
```

### Example 3: Error Alerting Workflow

```javascript
// Trigger: error.occurred
// Actions:
1. Check error type and severity
2. Send alert to Slack/PagerDuty
3. Log to error tracking (Sentry)
4. Create incident ticket
5. Notify on-call engineer
```

### Example 4: Video Session Analytics

```javascript
// Trigger: video.started
// Actions:
1. Track in analytics (Google Analytics/Mixpanel)
2. Update customer profile
3. Send follow-up survey after session
4. Calculate session metrics
```

---

## Webhook Configuration

### Retry Logic

The webhook service includes automatic retry logic:
- **Retries**: 3 attempts (configurable via `N8N_WEBHOOK_RETRIES`)
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout**: 5 seconds (configurable via `N8N_WEBHOOK_TIMEOUT`)

### Error Handling

If a webhook fails after all retries:
- Error is logged
- Main application flow continues (non-blocking)
- No user-facing error

### Security

- Webhooks are sent to configured `N8N_WEBHOOK_URL`
- Consider adding authentication headers if needed
- Use HTTPS for webhook URLs
- Validate webhook payloads in n8n workflows

---

## Testing Webhooks

### Using n8n Webhook Node

1. Create a new n8n workflow
2. Add a Webhook node
3. Set HTTP Method to POST
4. Copy the webhook URL
5. Add it to `N8N_WEBHOOK_URL` in backend `.env`
6. Test by triggering events in the chatbot

### Manual Testing

```bash
# Test webhook endpoint directly
curl -X POST https://your-n8n-instance.com/webhook/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test.event",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "test": true
  }'
```

---

## Best Practices

1. **Idempotency**: Design workflows to handle duplicate webhooks
2. **Validation**: Validate all webhook payloads in n8n
3. **Error Handling**: Handle webhook failures gracefully
4. **Logging**: Log all webhook events for debugging
5. **Monitoring**: Monitor webhook delivery success rates
6. **Rate Limiting**: Be aware of n8n rate limits
7. **Data Privacy**: Don't log sensitive customer data

---

## Webhook Payload Size

Keep payloads under 1MB for optimal performance. Large payloads (e.g., with many order items) are still supported but may require longer processing time.

