# Interlucent Connection Failure Debug Guide

## Error Pattern
```
WebSocket connection to 'wss://api.interlucent.ai/ws/session' failed
Status: interrupted → failed
Failure reason: reconnect_exhausted
```

## Possible Causes (in order of likelihood)

### 1. **Invalid App ID or Version** ⚠️ MOST LIKELY
**Current Config:**
- App ID: `d2d2uQ`
- App Version: `EXk` (from .env.local) or `nMc` (from .env.development)

**Problem:** The app ID or version might not exist in your Interlucent project.

**Fix:**
1. Log into Interlucent dashboard
2. Verify your application ID and version
3. Update `.env.local` with correct values:
   ```bash
   NEXT_PUBLIC_INTERLUCENT_APP_ID=<your-actual-app-id>
   NEXT_PUBLIC_INTERLUCENT_APP_VERSION=<your-actual-version>
   ```

### 2. **Token Configuration Mismatch**
**Current Setup:** Using `INTERLUCENT_PUBLISHABLE_TOKEN` in `.env.local`

**Problem:** Direct publishable token might be:
- Expired
- Invalid for the app ID
- Missing required permissions

**Fix:**
Try using SDK mode instead:
```bash
# In .env.local, comment out:
# INTERLUCENT_PUBLISHABLE_TOKEN=...

# Keep only:
INTERLUCENT_SECRET_KEY=sk-il-proj-uFH8oA-2O6xmIaYBjNELswKbI3gxWsjLT-E350b9tK-PQjK2J0
```

### 3. **No GPU Workers Available**
**Problem:** Interlucent may have no available GPU workers for your app.

**Check:**
- Interlucent dashboard → Workers
- Are workers running?
- Is auto-scaling enabled?

### 4. **Network/Firewall Issues**
**Problem:** Corporate firewall or network blocking WebSocket connections.

**Test:**
```bash
# Test WebSocket connectivity
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://api.interlucent.ai/ws/session
```

### 5. **Aggressive Reconnect Settings**
**Current Config:**
```tsx
reconnectMode="recover"
reconnectAttempts={3}
queueWaitTolerance={60}
webrtcNegotiationTolerance={15}
```

**Problem:** Too few retry attempts or too short timeouts.

## Quick Diagnostic Steps

### Step 1: Check Token Generation
Add this to your browser console when the error occurs:
```javascript
// Open browser console and run:
fetch('/api/stream/interlucent-token', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

**Expected output:**
```json
{
  "token": "eyJhbGci...",
  "expiresIn": 600,
  "appId": "d2d2uQ",
  "appVersion": "EXk",
  "mode": "direct" // or "sdk"
}
```

### Step 2: Verify Environment Variables
```bash
# Check what's being used:
curl http://localhost:3000/api/stream/interlucent-token
```

### Step 3: Test with Mock Mode
```bash
# In .env.local, temporarily use mock:
INTERLUCENT_USE_MOCK=true
# Comment out:
# INTERLUCENT_PUBLISHABLE_TOKEN=...
# INTERLUCENT_SECRET_KEY=...
```

If mock mode works, the issue is with your Interlucent credentials/config.

## Recommended Fixes

### Fix #1: Increase Retry Tolerance (Quick Fix)
```tsx
// In StreamingAppInterlucent.tsx (line 960-975)
<InterlucientStream
  reconnectMode="recover"
  reconnectAttempts={10}              // ← Increase from 3
  queueWaitTolerance={120}            // ← Increase from 60
  webrtcNegotiationTolerance={30}     // ← Increase from 15
  reconnectStrategy="exponential"     // ← Add exponential backoff
/>
```

### Fix #2: Add Better Error Logging
```tsx
// In useInterlucientConnection.ts, add detailed logging:
const handleError = useCallback(
  (error: string) => {
    console.error('❌ Stream error:', error)
    console.error('🔍 Debug info:', {
      admissionToken: admissionToken?.substring(0, 20) + '...',
      sessionId,
      interlucientStatus,
      failureReason,
      isUsingRelay
    })
    setFailureReason(error)
    onError?.(error)
  },
  [onError, admissionToken, sessionId, interlucientStatus, failureReason, isUsingRelay]
)
```

### Fix #3: Prevent Infinite Retry Loop
```tsx
// In useInterlucientConnection.ts, add max total reconnect limit:
const totalReconnectAttemptsRef = useRef(0)
const MAX_TOTAL_RECONNECTS = 5

const reconnect = useCallback(async () => {
  if (totalReconnectAttemptsRef.current >= MAX_TOTAL_RECONNECTS) {
    console.error('❌ Maximum total reconnection attempts exceeded')
    onSessionEnd?.('disconnected')
    return
  }

  totalReconnectAttemptsRef.current += 1
  // ... rest of reconnect logic
}, [])
```

## Most Likely Solution

**The app version `EXk` or `nMc` probably doesn't exist in Interlucent.**

1. Check your Interlucent dashboard
2. Find the correct app version
3. Update `.env.local`:
   ```bash
   NEXT_PUBLIC_INTERLUCENT_APP_VERSION=<correct-version>
   ```
4. Restart dev server: `npm run dev`

## Emergency Fallback

If nothing works, switch back to PureWeb temporarily:
```bash
# In .env.local:
NEXT_PUBLIC_STREAMING_PROVIDER=pureweb
```
