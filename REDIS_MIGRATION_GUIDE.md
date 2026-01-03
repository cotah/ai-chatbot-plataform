# Redis Session State Migration Guide

**Version:** 1.0.0  
**Date:** 2026-01-03  
**Priority:** P0 (Critical)

---

## 📊 OVERVIEW

This guide documents the migration from in-memory session state storage (Map) to Redis-backed persistent storage.

**Problem Solved:**
- ❌ Session state lost on server restart
- ❌ State not shared across multiple instances
- ❌ No TTL management
- ❌ No fallback for Redis unavailability

**Solution:**
- ✅ Redis-backed session state storage
- ✅ Automatic TTL refresh on every message
- ✅ Graceful fallback if Redis unavailable
- ✅ PII masking in logs
- ✅ Support for multiple instances

---

## 🔧 TECHNICAL CHANGES

### Files Created
1. **`backend/src/services/sessionState.store.js`** - Redis session state storage
2. **`backend/test_redis_persistence.js`** - Persistence tests

### Files Modified
3. **`backend/src/routes/chat.routes.js`** - Integrated Redis session store
4. **`backend/.env.example`** - Added SESSION_STATE_TTL_SECONDS

### Key Features

#### 1. Redis Session Store Service
**File:** `backend/src/services/sessionState.store.js`

**Functions:**
- `getOrInitSessionState(sessionId)` - Get or initialize session state
- `updateSessionState(sessionId, state)` - Update state with TTL refresh
- `getSessionState(sessionId)` - Get state from Redis
- `setSessionState(sessionId, state)` - Set state in Redis
- `sessionStateExists(sessionId)` - Check if state exists
- `handleRedisUnavailable(sessionId)` - Graceful fallback
- `maskPII(data)` - Mask PII for logging

**Configuration:**
```javascript
SESSION_STATE_TTL = process.env.SESSION_STATE_TTL_SECONDS || 3600; // 1 hour default
SESSION_STATE_PREFIX = 'state:';
```

**Redis Key Format:**
```
state:{sessionId}
```

**Example:**
```
state:abc123def456
```

#### 2. TTL Management
- **Default TTL:** 3600 seconds (1 hour)
- **Configurable:** via `SESSION_STATE_TTL_SECONDS` env var
- **Auto-refresh:** TTL refreshed on every `getSessionState()` call
- **Recommended:** 1800-3600 seconds (30-60 minutes)

#### 3. PII Masking
**Masked Fields:**
- `email`: `jo***@example.com`
- `phone`: `***7890`
- `name`: `J***`

**Example Log:**
```javascript
logger.debug('Session state saved to Redis', {
  sessionId: 'abc123',
  currentState: 'BOOK_EMAIL',
  dataKeys: ['name', 'email'],
  maskedData: { name: 'J***', email: 'jo***@example.com' },
  ttl: 3600,
});
```

#### 4. Graceful Fallback
**If Redis is unavailable:**
1. Log warning
2. Return initial state (WELCOME)
3. Continue conversation with in-memory state
4. Send welcome message to user

**Example:**
```javascript
const result = handleRedisUnavailable(sessionId);
// result.state = { current: 'WELCOME', data: {}, ... }
// result.message = "Hi — I'm BTRIX. ..."
// result.redisAvailable = false
```

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-Deployment

#### 1. Environment Variables
Add to Render environment variables:

```bash
# Redis URL (REQUIRED)
REDIS_URL=redis://your-redis-host:6379

# Session State TTL (Optional, default: 3600)
SESSION_STATE_TTL_SECONDS=3600
```

**Where to find Redis URL:**
- Database: `ai-chatbot-database`
- Check Render dashboard for Redis connection string

#### 2. Redis Verification
Verify Redis is accessible:

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

#### 3. Code Review
- [x] `sessionState.store.js` created
- [x] `chat.routes.js` updated (removed Map, added Redis)
- [x] `.env.example` updated
- [x] Tests created (`test_redis_persistence.js`)

### Deployment Steps

#### Step 1: Commit and Push
```bash
cd ai-chatbot-plataform
git add -A
git commit -m "feat: migrate session state to Redis"
git push origin main
```

#### Step 2: Add Environment Variables in Render
1. Go to Render Dashboard
2. Select `ai-chatbot-platform` service
3. Go to "Environment" tab
4. Add:
   - `REDIS_URL` = `redis://your-redis-host:6379`
   - `SESSION_STATE_TTL_SECONDS` = `3600`
5. Save changes

#### Step 3: Deploy
- Render will auto-deploy from GitHub
- Wait 2-5 minutes for deployment

#### Step 4: Verify Deployment
Check logs for:
```
✅ Redis client connected
✅ Redis client ready
```

If you see errors:
```
❌ Redis client error
```
→ Check `REDIS_URL` is correct

### Post-Deployment

#### 1. Smoke Test (5 minutes)
Test conversation flow:

1. **Start conversation:**
   - User: "Hi"
   - Bot: Should show welcome message

2. **Start booking:**
   - User: "book"
   - Bot: Should ask for name

3. **Provide name:**
   - User: "John"
   - Bot: Should ask for email

4. **Check Redis:**
   ```bash
   redis-cli -u $REDIS_URL
   > KEYS state:*
   # Should show: state:{sessionId}
   
   > GET state:{sessionId}
   # Should show JSON with current state
   ```

5. **Simulate server restart:**
   - Restart Render service
   - Send another message with same sessionId
   - Bot should continue from BOOK_EMAIL (not restart from WELCOME)

#### 2. Monitor Logs (First 24h)
Watch for:

**Good signs:**
```
✅ Session state retrieved from Redis
✅ Session state saved to Redis
✅ Session state TTL refreshed
```

**Warning signs:**
```
⚠️  Redis unavailable, returning null state
⚠️  Failed to save session state to Redis
⚠️  Redis unavailable, degrading gracefully
```

**Error signs:**
```
❌ Failed to get session state from Redis
❌ Redis client error
```

#### 3. Metrics to Track
- **Redis availability:** Should be > 99.9%
- **State save success rate:** Should be > 99%
- **Fallback activation rate:** Should be < 1%
- **Average state size:** ~500-2000 bytes

---

## 🧪 TESTING

### Automated Tests

#### Run Redis Persistence Tests
```bash
cd backend
node test_redis_persistence.js
```

**Expected Output:**
```
🧪 REDIS PERSISTENCE TESTS
================================================================================
✅ Redis is available

📋 Test 1: Save and retrieve session state
  ✅ Initial state: WELCOME
  ✅ Transitioned to: MENU
  ✅ State retrieved correctly: MENU
✅ PASSED

📋 Test 2: Booking flow persistence
  ✅ Booking flow progressed to: BOOK_PHONE
  ✅ Data saved: name=John Doe, email=john@example.com
  ✅ Booking flow state persisted correctly
✅ PASSED

[... 4 more tests ...]

📊 TEST SUMMARY
================================================================================
Total Tests: 6
Passed: 6 ✅
Failed: 0 ❌
Success Rate: 100.0%
```

### Manual Tests

#### Test 1: State Persistence Across Restart

1. **Start conversation:**
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -H "x-session-id: test-session-123" \
     -d '{"message": "book"}'
   ```
   
   **Expected:** Bot asks for name

2. **Provide name:**
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -H "x-session-id: test-session-123" \
     -d '{"message": "John"}'
   ```
   
   **Expected:** Bot asks for email

3. **Restart server:**
   ```bash
   # Stop server (Ctrl+C)
   # Start server again
   npm start
   ```

4. **Continue conversation:**
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "Content-Type: application/json" \
     -H "x-session-id: test-session-123" \
     -d '{"message": "john@example.com"}'
   ```
   
   **Expected:** Bot asks for phone (NOT name again)
   **NOT:** Bot should NOT restart from WELCOME

#### Test 2: Multiple Instances (if applicable)

1. **Start two instances:**
   ```bash
   # Terminal 1
   PORT=3001 npm start
   
   # Terminal 2
   PORT=3002 npm start
   ```

2. **Send alternating requests:**
   ```bash
   # Request 1 to instance 1
   curl -X POST http://localhost:3001/api/chat \
     -H "x-session-id: test-123" \
     -d '{"message": "book"}'
   
   # Request 2 to instance 2
   curl -X POST http://localhost:3002/api/chat \
     -H "x-session-id: test-123" \
     -d '{"message": "John"}'
   
   # Request 3 to instance 1
   curl -X POST http://localhost:3001/api/chat \
     -H "x-session-id: test-123" \
     -d '{"message": "john@example.com"}'
   ```
   
   **Expected:** Conversation flows correctly across instances

#### Test 3: Redis Unavailable Fallback

1. **Stop Redis:**
   ```bash
   # Stop Redis server
   redis-cli shutdown
   ```

2. **Send message:**
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "x-session-id: test-456" \
     -d '{"message": "Hi"}'
   ```
   
   **Expected:** Bot sends welcome message (graceful fallback)
   **NOT:** Bot should NOT crash or return 500 error

3. **Check logs:**
   ```
   ⚠️  Redis unavailable, returning null state
   ⚠️  Redis unavailable, degrading gracefully
   ```

4. **Restart Redis:**
   ```bash
   redis-server
   ```

5. **Send another message:**
   ```bash
   curl -X POST http://localhost:3001/api/chat \
     -H "x-session-id: test-456" \
     -d '{"message": "book"}'
   ```
   
   **Expected:** Bot works normally again

---

## 🔍 MONITORING

### Redis Metrics

#### Check Redis Connection
```bash
redis-cli -u $REDIS_URL
> INFO
```

**Look for:**
- `connected_clients`: Should be > 0
- `used_memory_human`: Should be reasonable (< 100MB for typical usage)
- `evicted_keys`: Should be 0 (if not, increase memory)

#### Check Session States
```bash
redis-cli -u $REDIS_URL
> KEYS state:*
# Shows all session state keys

> GET state:{sessionId}
# Shows specific session state

> TTL state:{sessionId}
# Shows remaining TTL in seconds
```

### Application Logs

#### Search for Redis-related logs
```bash
# Successful operations
grep "Session state saved to Redis" logs.txt
grep "Session state retrieved from Redis" logs.txt

# Warnings
grep "Redis unavailable" logs.txt
grep "Failed to save session state" logs.txt

# Errors
grep "Redis client error" logs.txt
grep "Failed to get session state" logs.txt
```

### Alerts to Set Up

1. **Redis unavailable:** Alert if > 5 warnings in 5 minutes
2. **State save failures:** Alert if > 10 failures in 10 minutes
3. **Redis memory:** Alert if > 80% of max memory
4. **Redis connection errors:** Alert on any connection error

---

## 🛠️ TROUBLESHOOTING

### Issue 1: Redis Connection Failed

**Symptoms:**
```
❌ Redis client error: ECONNREFUSED
```

**Solutions:**
1. Check `REDIS_URL` is correct
2. Verify Redis is running: `redis-cli ping`
3. Check firewall/network rules
4. Verify Redis is accessible from backend

### Issue 2: State Not Persisting

**Symptoms:**
- Conversation restarts after server restart
- State lost between messages

**Solutions:**
1. Check Redis is running
2. Verify `SESSION_STATE_TTL_SECONDS` is set
3. Check logs for "Failed to save session state"
4. Run `test_redis_persistence.js` to diagnose

### Issue 3: TTL Expiring Too Quickly

**Symptoms:**
- Users lose state mid-conversation
- "No state found in Redis" warnings

**Solutions:**
1. Increase `SESSION_STATE_TTL_SECONDS` (e.g., 3600 → 7200)
2. Check Redis memory (may be evicting keys)
3. Verify TTL refresh is working: check logs for "Session state retrieved"

### Issue 4: PII Visible in Logs

**Symptoms:**
- Full email/phone visible in logs

**Solutions:**
1. Verify `maskPII()` function is called
2. Check log level is not DEBUG in production
3. Update logging to use masked data

### Issue 5: Multiple Instances Not Syncing

**Symptoms:**
- State inconsistent across instances
- Conversation breaks when load-balanced

**Solutions:**
1. Verify all instances use same `REDIS_URL`
2. Check Redis is accessible from all instances
3. Verify session ID is consistent across requests

---

## 🔄 ROLLBACK PLAN

If critical issues occur:

### Step 1: Identify Issue
- Check Render logs for errors
- Test conversation flow manually
- Check Redis availability

### Step 2: Quick Fix
**If Redis connection issues:**
```bash
# In Render dashboard
# Check REDIS_URL is correct
# Restart service
```

**If state corruption:**
```bash
# Clear all session states
redis-cli -u $REDIS_URL
> DEL state:*
```

### Step 3: Full Rollback
```bash
cd ai-chatbot-plataform
git revert HEAD
git push origin main
```

**Impact:** Render will auto-deploy previous version (in-memory state)

---

## 📚 REFERENCES

### Code Files
- `backend/src/services/sessionState.store.js` - Redis session store
- `backend/src/services/redis.service.js` - Redis client
- `backend/src/routes/chat.routes.js` - Integration
- `backend/test_redis_persistence.js` - Tests

### Documentation
- [Redis Documentation](https://redis.io/docs/)
- [ioredis Documentation](https://github.com/redis/ioredis)
- [Render Redis Guide](https://render.com/docs/redis)

### Environment Variables
- `REDIS_URL` - Redis connection string
- `SESSION_STATE_TTL_SECONDS` - State TTL in seconds

---

## ✅ SIGN-OFF

**Status:** ✅ **READY FOR DEPLOYMENT**

**Confidence Level:** 🟢 **HIGH**
- Redis session store implemented
- TTL management working
- Graceful fallback in place
- PII masking implemented
- Tests passing

**Risk Level:** 🟡 **LOW-MEDIUM**
- Requires Redis to be available
- Need to monitor Redis memory usage
- Need to set up alerts

**Recommendation:** ✅ **DEPLOY TO PRODUCTION**

---

**Guide Version:** 1.0.0  
**Last Updated:** 2026-01-03  
**Author:** Manus AI
