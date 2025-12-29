# Data Layers Documentation

## Overview

The platform uses two data layers:
- **Redis**: Fast, in-memory storage for sessions and caching
- **Supabase**: Persistent PostgreSQL database for customer data and conversations

## Architecture

```
Frontend → Backend API
              ↓
         ┌────┴────┐
         ↓         ↓
      Redis    Supabase
   (Sessions)  (Persistent)
```

## Redis

### Purpose
- Session storage (active user sessions)
- Fast state management
- Cache for frequently accessed data

### Configuration

```env
REDIS_URL=redis://localhost:6379
REDIS_SESSION_TTL=86400  # 24 hours in seconds
```

### Session Data Structure

```javascript
{
  id: "session-uuid",
  createdAt: "2024-01-15T10:30:00.000Z",
  lastActivity: "2024-01-15T10:30:00.000Z",
  metadata: {
    language: "en",
    clientId: "uuid",
    conversationId: "conv_123",
    email: "user@example.com",
    phone: "+1234567890",
    preferredLanguage: "en",
    plan: "premium"
  }
}
```

### Operations

- `getSession(sessionId)` - Retrieve session
- `setSession(sessionId, data, ttl)` - Store session with TTL
- `deleteSession(sessionId)` - Remove session
- `refreshSessionTTL(sessionId, ttl)` - Extend session lifetime

### TTL (Time To Live)

Sessions expire after 24 hours of inactivity. TTL is refreshed on each request.

### Fallback

If Redis is unavailable, the system falls back to in-memory storage (for development).

## Supabase

### Purpose
- Persistent customer data
- Conversation history
- Reservations and orders
- Analytics and reporting

### Configuration

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Database Schema

#### clients
- `id` (UUID) - Primary key
- `name` (TEXT)
- `email` (TEXT, UNIQUE)
- `phone` (TEXT)
- `preferred_language` (TEXT) - Default: 'en'
- `plan` (TEXT) - 'basic' or 'premium'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### conversations
- `id` (TEXT) - Primary key (backend conversation ID)
- `client_id` (UUID) - Foreign key to clients
- `language` (TEXT) - Session language
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### messages
- `id` (UUID) - Primary key
- `conversation_id` (TEXT) - Foreign key to conversations
- `role` (TEXT) - 'user', 'assistant', 'system'
- `content` (TEXT) - Message content
- `created_at` (TIMESTAMPTZ)

#### reservations
- `id` (UUID) - Primary key
- `client_id` (UUID) - Foreign key to clients
- `name` (TEXT)
- `email` (TEXT)
- `phone` (TEXT)
- `datetime` (TIMESTAMPTZ)
- `guests` (INTEGER)
- `notes` (TEXT)
- `google_calendar_event_id` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### orders
- `id` (UUID) - Primary key
- `client_id` (UUID) - Foreign key to clients
- `order_id` (TEXT, UNIQUE) - Backend order ID
- `payment_intent_id` (TEXT)
- `amount` (DECIMAL)
- `currency` (TEXT) - Default: 'usd'
- `status` (TEXT) - 'pending', 'paid', 'cancelled'
- `items` (JSONB) - Order items
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### Operations

#### Client Management
- `getClientByIdentifier(identifier, type)` - Find client by email/phone
- `upsertClient(clientData)` - Create or update client

#### Conversations
- `createConversation(conversationData)` - Create new conversation
- `saveMessage(messageData)` - Save message (async, non-blocking)

#### Business Data
- `createReservation(reservationData)` - Save reservation
- `createOrder(orderData)` - Save order
- `getClientPlan(clientId)` - Get client's plan

### Async Operations

All Supabase write operations are non-blocking:
- Messages are saved asynchronously
- Client updates don't block chat flow
- Failures are logged but don't interrupt conversation

## Integration Flow

### New User Flow

1. User opens chat → New session created in Redis
2. User sends first message → Language detected
3. If email/phone provided → Client created/updated in Supabase
4. Conversation created in Supabase (if client exists)
5. Messages saved to Supabase (async)

### Returning User Flow

1. User opens chat → Session retrieved from Redis
2. If session has clientId → Load client data from Supabase
3. Apply preferred language if allowed
4. Continue conversation

### Language Switching Flow

1. User selects language → `/api/chat/language` endpoint
2. Session language updated in Redis
3. System message returned
4. All subsequent responses in new language

## Plan-Based Language Control

### Basic Plan
- `LANGUAGE_MODE=single`
- Only default language allowed
- Language chip is read-only

### Premium Plan
- `LANGUAGE_MODE=auto` or `allowed`
- Multiple languages supported
- Language chip is interactive
- User can switch languages

### Implementation

```javascript
// Check plan from Supabase
const plan = await getClientPlan(clientId);

// Determine language mode based on plan
if (plan === 'basic') {
  // Force single language mode
} else if (plan === 'premium') {
  // Allow auto/allowed mode
}
```

## Security

### Redis
- No sensitive data in Redis (only session metadata)
- TTL ensures automatic cleanup
- Connection string should be secure

### Supabase
- Use **service role key** (backend only, never expose to frontend)
- Row Level Security (RLS) disabled for service role
- All inputs validated before database operations
- No SQL injection (using Supabase client)

### Best Practices

1. **Never expose secrets**: All keys in environment variables
2. **Validate inputs**: All user input validated before database operations
3. **Error handling**: Failures logged but don't block chat flow
4. **TTL management**: Sessions expire automatically
5. **Connection pooling**: Redis and Supabase handle connections efficiently

## Monitoring

### Redis Health
```javascript
import { isRedisAvailable } from './services/redis.service.js';

const healthy = await isRedisAvailable();
```

### Supabase Health
- Check connection on startup
- Log errors but continue with fallbacks
- Monitor query performance in Supabase dashboard

## Migration Guide

### From In-Memory to Redis

1. Install Redis: `npm install ioredis`
2. Set `REDIS_URL` in environment
3. Sessions automatically migrate to Redis
4. Fallback to memory if Redis unavailable

### Setting Up Supabase

1. Create Supabase project
2. Run `SUPABASE_SCHEMA.sql` in SQL editor
3. Get service role key from project settings
4. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
5. Test connection on server startup

## Troubleshooting

### Redis Connection Failed
- Check `REDIS_URL` is correct
- Verify Redis server is running
- System falls back to in-memory storage

### Supabase Connection Failed
- Check credentials are correct
- Verify network connectivity
- Operations fail gracefully (logged but non-blocking)

### Session Not Persisting
- Check Redis TTL settings
- Verify session is being saved
- Check Redis logs for errors

### Messages Not Saving
- Check Supabase connection
- Verify table schema is correct
- Check error logs (operations are async)

## Performance Considerations

### Redis
- Very fast (in-memory)
- Suitable for high-frequency operations
- TTL prevents memory bloat

### Supabase
- Async operations don't block chat
- Indexes on frequently queried columns
- Connection pooling handled by Supabase client

## Future Enhancements

- [ ] Redis pub/sub for real-time features
- [ ] Supabase real-time subscriptions
- [ ] Message search and analytics
- [ ] Client segmentation and targeting
- [ ] Conversation export and backup

