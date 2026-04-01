# Client Feedback - Resolved Issues (Web Application)

**Document Version:** 2.0
**Date:** 2026-04-01
**Project:** OP-Skillsim Plumbing Training Simulator
**Platform:** Interlucent Pixel Streaming

This document tracks the resolution status of **web application issues** from CLIENT_FEEDBACK_WEB_ISSUES.md. For UE5-side issues, see CLIENT_FEEDBACK_UE5_ISSUES.md.

---

## Summary

| Issue | Description | Status | Notes |
|-------|-------------|--------|-------|
| P0-01 | Session Drops During Training | ✅ FIXED | All 5 root causes addressed - **Awaiting client testing** |
| P1-05 | No Session Resume Option | ✅ FIXED | Session selection + return navigation fixed - **Awaiting client testing** |
| P1-06 | Pause Doesn't Actually Pause | ✅ FIXED | Web controls now disabled when paused - **Awaiting client testing** |
| P1-07 | CMS Results Not Displayed for Standalone | ✅ FIXED | Outsiders now save data like LTI users - **Awaiting client testing** |
| P1-08 | Tooltips Don't Appear via iQualify (LTI) | ✅ FIXED | setIsComplete(false) for LTI sessions - **Awaiting client testing** |
| P1-09/P1-12 | Scene Not Reset When Training Starts | ✅ FIXED | Scene resets to default state before training - **Awaiting client testing** |
| P1-10 | Sound Controls Don't Work | ✅ FIXED | Volume 0 parsing bug fixed - **Awaiting client testing** |

---

## P0-01: Session Drops During Training - ✅ FIXED

### Root Causes Addressed

| Root Cause | Fix Applied | Status |
|------------|-------------|--------|
| 1. JWT Token Duration (was 1 hour) | Extended to 3 hours | ✅ |
| 2. Idle Detection (was 5 minutes) | Increased to 15 minutes | ✅ |
| 3. No Token Refresh During Training | Added 30-minute auto-refresh | ✅ |
| 4. Stream Disconnection Ends Session | Added 2-retry reconnection | ✅ |
| 5. Cookie maxAge mismatch | Aligned with JWT expiry | ✅ |

### Changes Made

#### 1. Session Duration Extended to 3 Hours

**File:** `app/lib/sessions/SessionManager.ts`
```typescript
// Changed from 1 hour to 3 hours
const SESSION_DURATION_MS = 3 * 60 * 60 * 1000 // 3 hours
```

#### 2. Idle Timeout Increased to 15 Minutes

**File:** `app/features/idle/hooks/useIdleDetection.ts`
```typescript
// Changed from 5 minutes to 15 minutes
const DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes
```

**Also removed hardcoded 5-minute override in:**
- `app/components/StreamingApp.tsx`
- `app/components/StreamingAppInterlucent.tsx`

```typescript
// Before - hardcoded override
const { isIdle, resetIdle } = useIdleDetection({
  idleTimeout: 5 * 60 * 1000, // This override removed
  enabled: stream.isConnected,
});

// After - uses hook default (15 minutes)
const { isIdle, resetIdle } = useIdleDetection({
  enabled: stream.isConnected,
});
```

#### 3. Proactive Token Refresh During Active Training

**New File:** `app/api/auth/session/refresh/route.ts`
```typescript
// New API endpoint for token refresh
export async function POST(request: NextRequest) {
  const token = request.cookies.get('session_token')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'No session' }, { status: 401 })
  }
  const newToken = await sessionManager.refreshSession(token)
  // Updates cookie if refreshed successfully
}
```

**File:** `app/features/training/hooks/useTrainingState.ts`
```typescript
// Added auto-refresh every 30 minutes during training
useEffect(() => {
  if (!state.isActive && state.mode !== 'training') return

  const refreshToken = async () => {
    try {
      await fetch('/api/auth/session/refresh', {
        method: 'POST',
        credentials: 'include'
      })
    } catch (error) {
      console.warn('Token refresh failed:', error)
    }
  }

  const refreshInterval = setInterval(refreshToken, 30 * 60 * 1000)
  refreshToken() // Immediate refresh when training starts

  return () => clearInterval(refreshInterval)
}, [state.isActive, state.mode])
```

#### 4. Stream Disconnection Retry Before Ending Session

**File:** `app/hooks/useInterlucientConnection.ts`
```typescript
// Added retry logic - attempts 2 reconnections before ending session
const disconnectRetryCountRef = useRef(0)
const MAX_DISCONNECT_RETRIES = 2

// On disconnect event
if (disconnectRetryCountRef.current < MAX_DISCONNECT_RETRIES) {
  disconnectRetryCountRef.current += 1
  console.log(`🔄 Attempting reconnect (${disconnectRetryCountRef.current}/${MAX_DISCONNECT_RETRIES})`)
  setTimeout(() => reconnectStreamRef.current(), 2000)
  return
}
// Only end session after max retries exceeded
```

**File:** `app/hooks/useStreamConnection.ts` (PureWeb - same fix applied)

#### 5. JWT and Cookie Duration Aligned

**File:** `app/api/auth/simple-login/route.ts`
```typescript
// JWT expiration set to 3 hours
const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000)

// Cookie maxAge matched to JWT
response.cookies.set('session_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 60 * 60 * 3, // 3 hours - matches JWT expiry
})
```

---

## P1-05: No Session Resume Option - ✅ FIXED

### Changes Made

#### 1. Outsiders Now Have Full Data Saving (Like LTI Users)

**File:** `app/api/auth/simple-login/route.ts`
- Approved outsider students get `isLti: true` in JWT token
- `user_sessions` record created during login (same as LTI flow)
- Training progress and quiz responses are saved to database

```typescript
// Approved outsiders treated like LTI students
const token = await new SignJWT({
  sessionId,
  userId: profile.id,
  email: profile.email,
  role: profile.role,
  sessionType: 'lti',
  isLti: true, // Enable data saving for outsiders
  iat: Math.floor(now.getTime() / 1000),
})
```

#### 2. Return Navigation Fixed (returnUrl-based, not isLti-based)

**File:** `app/session-complete/page.tsx`
```typescript
// Before - used isLti flag for button logic
{data.isLti && !data.returnUrl && (
  <button onClick={handleCloseBrowser}>Close & Return to Course</button>
)}

// After - uses returnUrl for navigation
{/* Return to Course (only for users WITH returnUrl from LMS) */}
{data.isLti && data.returnUrl && (
  <button onClick={handleReturnToCourse}>Return to Course</button>
)}

{/* Return to Login (for users WITHOUT returnUrl - outsiders) */}
{!data.returnUrl && !isStaff && (
  <button onClick={handleLogin}>Return to Login</button>
)}
```

**File:** `app/training-results/page.tsx`
```typescript
// Before - complex isLti + returnUrl logic
const handleReturn = useCallback(() => {
  if (isLti && returnUrl) {
    window.location.href = returnUrl
  } else if (isLti) {
    window.close()
  } else {
    window.location.href = '/login'
  }
}, [isLti, returnUrl])

// After - simplified returnUrl-based logic
const handleReturn = useCallback(() => {
  if (returnUrl) {
    window.location.href = returnUrl
  } else {
    window.location.href = '/login'
  }
}, [returnUrl])

// Button text
<button onClick={handleReturn}>
  {returnUrl ? 'Return to Course' : 'Return to Login'}
</button>
```

### User Flow Summary

| User Type | Data Saving | Session Resume | Return Destination |
|-----------|-------------|----------------|-------------------|
| LTI Students | ✅ Yes | ✅ Yes | Course (returnUrl) |
| Outsiders (Approved) | ✅ Yes | ✅ Yes | Login page |
| Teachers/Admins | ❌ No | ❌ No | Login page |

---

## P1-06: Pause Doesn't Actually Pause - ✅ FIXED

### Problem
When training is paused:
- UE5/Stream side would pause correctly
- But web side continued running - session timer kept going, buttons still worked, sidebar controls remained active

### Changes Made

#### 1. Disable Idle Detection When Paused
**File:** `app/components/StreamingAppInterlucent.tsx`
```typescript
// Before - idle detection always enabled when connected
const { isIdle, resetIdle } = useIdleDetection({
  enabled: stream.isConnected,
});

// After - disabled when training is paused
const { isIdle, resetIdle } = useIdleDetection({
  enabled: stream.isConnected && !isTrainingPaused,
});
```

#### 2. Disable Sidebar Controls When Paused
**File:** `app/components/ControlPanel/UnifiedSidebar.tsx`

Added combined disabled state:
```typescript
// Combined disabled state - controls disabled during walkthrough OR when training is paused
const isControlsDisabled = mode === 'training' ? isPaused : controlsLocked
```

Added "Training paused" warning banner in inventory and settings tabs:
```typescript
{isPaused && (
  <div className="p-2 rounded-lg text-xs text-center bg-amber-500/20 text-amber-400">
    Training paused - controls disabled
  </div>
)}
```

Disabled inventory controls (pipes, pressure test) when paused:
```typescript
<div className={!isPipesEnabled || isPaused ? 'opacity-50 pointer-events-none' : ''}>
```

Disabled settings controls when paused in training mode:
```typescript
<div className={isTrainingMode && isPaused ? 'opacity-50 pointer-events-none' : ''}>
```

### Result
When training is paused:
- ✅ UE5/Stream pauses (already working)
- ✅ Idle detection stops (won't kick user for inactivity while paused)
- ✅ Sidebar inventory controls disabled with visual indicator
- ✅ Settings controls disabled with visual indicator
- ✅ Only Pause/Resume and Quit buttons remain active

---

## P1-07: CMS Results Not Displayed for Standalone - ✅ FIXED

### Changes Made

Outsiders now have full data persistence (see P1-05 above). This means:
- Quiz responses are saved to database
- Training sessions are created and updated
- Completion results are visible in CMS/admin

---

## P1-08: Tooltips Don't Appear via iQualify (LTI) - ✅ FIXED

### Changes Made

**File:** `app/features/walkthrough/useWalkthrough.ts`
```typescript
// Before - early return without setting state
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (isLtiSession) {
      return  // BUG: isComplete never set to false
    }
    // ...
  }
}, [isLtiSession])

// After - explicitly set isComplete to false
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (isLtiSession) {
      setIsComplete(false)  // FIX: Explicitly set for LTI
      setIsLoading(false)
      return
    }
    const completed = localStorage.getItem(WALKTHROUGH_COMPLETED_KEY)
    if (completed === 'true') {
      setIsComplete(true)
    }
    setIsLoading(false)
  }
}, [isLtiSession])
```

**File:** `app/features/walkthrough/useTrainingWalkthrough.ts`
- Same fix applied

---

## P1-09/P1-12: Scene Not Reset When Training Starts - ✅ FIXED

### Changes Made

**File:** `app/features/training/hooks/useTrainingState.ts`
```typescript
const startTraining = useCallback(async () => {
  // SCENE RESET: Ensure scene is in default state before training starts

  // 1. Reset explosion to assembled state
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, 'assemble')
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, '0')

  // 2. Reset camera to default perspective
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')

  // 3. Reset layers to show all
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'show_all')

  // 4. Delay for UE5 to process
  await new Promise(resolve => setTimeout(resolve, 200))

  // 5. Then start training
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
}, [messageBus])
```

**File:** `app/features/explosion/hooks/useExplosionControl.ts`
```typescript
// Added resetExplosion function
const resetExplosion = useCallback(() => {
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, '0')
  setState(initialState)
}, [messageBus])
```

### Result
Scene now resets to default assembled state before training starts, regardless of any changes made during cinematic/onboarding mode.

---

## P1-10: Sound Controls Don't Work - ✅ FIXED

### Root Cause

In the `stringToJson` function that converts PureWeb-style string messages to Interlucent JSON format, the volume parsing used a falsy check that incorrectly treated volume `0` (mute) as "no value" and defaulted to `1.0` (full volume).

```typescript
// BUG: 0 is falsy in JavaScript, so 0 || 1.0 evaluates to 1.0
volume: parseFloat(parts[2]) || 1.0
```

### Fix Applied

**File:** `app/features/messaging/hooks/useInterlucientMessageBus.ts`
```typescript
// Before
case 'audio_volume':
  return { type, setting: 'audio_volume', group: parts[1], volume: parseFloat(parts[2]) || 1.0 }

// After
case 'audio_volume': {
  const parsedVolume = parseFloat(parts[2])
  // Use isNaN check instead of || to properly handle volume 0 (mute)
  return { type, setting: 'audio_volume', group: parts[1], volume: isNaN(parsedVolume) ? 1.0 : parsedVolume }
}
```

### Technical Explanation
- `parseFloat("0")` returns `0` (number)
- `0 || 1.0` evaluates to `1.0` because `0` is falsy in JavaScript
- `isNaN(0)` returns `false`, so `isNaN(0) ? 1.0 : 0` correctly returns `0`

---

## Build Fixes

During implementation, TypeScript build errors were encountered and fixed:

### Supabase Type Error

**Files:** `app/api/auth/simple-login/route.ts`, `app/api/auth/verify-otp/route.ts`

**Error:**
```
Argument of type '{ session_id: string; ... }' is not assignable to parameter of type 'never'
```

**Fix:** Added `as any` type cast to Supabase insert calls:
```typescript
const { error: sessionError } = await supabaseAdmin
  .from('user_sessions')
  .insert({
    session_id: sessionId,
    // ... other fields
  } as any)  // Type cast added
```

---

## Files Modified Summary

| File | Issues Addressed |
|------|------------------|
| `app/lib/sessions/SessionManager.ts` | P0-01 (session duration) |
| `app/features/idle/hooks/useIdleDetection.ts` | P0-01 (idle timeout) |
| `app/components/StreamingAppInterlucent.tsx` | P0-01 (removed idle override), P1-06 (pause idle detection) |
| `app/components/StreamingApp.tsx` | P0-01 (removed idle override) |
| `app/api/auth/session/refresh/route.ts` | P0-01 (NEW - token refresh endpoint) |
| `app/features/training/hooks/useTrainingState.ts` | P0-01 (token refresh), P1-09/12 (scene reset) |
| `app/hooks/useInterlucientConnection.ts` | P0-01 (disconnect retry) |
| `app/hooks/useStreamConnection.ts` | P0-01 (disconnect retry) |
| `app/api/auth/simple-login/route.ts` | P0-01 (JWT/cookie), P1-05/P1-07 (outsider data) |
| `app/api/auth/verify-otp/route.ts` | Build fix (Supabase type) |
| `app/session-complete/page.tsx` | P1-05 (return navigation) |
| `app/training-results/page.tsx` | P1-05 (return navigation) |
| `app/lib/messageTypes.ts` | P1-06 (resume type) |
| `app/features/walkthrough/useWalkthrough.ts` | P1-08 (LTI tooltips) |
| `app/features/walkthrough/useTrainingWalkthrough.ts` | P1-08 (LTI tooltips) |
| `app/features/explosion/hooks/useExplosionControl.ts` | P1-09/12 (resetExplosion) |
| `app/features/messaging/hooks/useInterlucientMessageBus.ts` | P1-10 (volume 0 fix) |
| `app/components/ControlPanel/UnifiedSidebar.tsx` | P1-06 (disable controls when paused) |

---

## Commits

1. `fix(P0-01): Resolve session drops during training` - Extended session duration, idle timeout, token refresh, disconnect retry
2. `fix(session): Extend session duration and add retry logic for P0-01`
3. `fix(auth): Fix Supabase TypeScript errors in auth routes`
4. `fix(session): Fix return navigation for standalone users`
5. `fix(audio): Fix mute toggle sending volume 1.0 instead of 0`
6. `fix(pause): Disable web controls when training is paused`

---

## All Web Issues Resolved - Awaiting Client Testing

All web application issues from the client feedback have been implemented and are ready for testing. Each fix requires client verification to confirm the issue is fully resolved in production.

### Testing Required
Please have the client test each issue and provide feedback:
- [ ] P0-01: Session Drops - Verify sessions persist for 3+ hours
- [ ] P1-05: Session Resume - Verify outsiders can resume sessions and see correct return buttons
- [ ] P1-06: Pause - Verify web controls are disabled when training is paused
- [ ] P1-07: CMS Results - Verify outsider training data appears in CMS/admin
- [ ] P1-08: Tooltips - Verify tooltips appear when launched via iQualify (LTI)
- [ ] P1-09/P1-12: Scene Reset - Verify scene resets to default when starting training
- [ ] P1-10: Sound Controls - Verify mute toggle and volume sliders work correctly

See CLIENT_FEEDBACK_UE5_ISSUES.md for UE5-specific issues that require UE5 team action.

---

*Last Updated: 2026-04-01*
