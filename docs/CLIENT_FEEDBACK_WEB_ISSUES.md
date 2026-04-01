# Client Feedback - Web Application Issues

**Document Version:** 1.0
**Date:** 2026-03-30
**Project:** OP-Skillsim Plumbing Training Simulator

This document details issues identified in the web application that require fixes on the Next.js/React side. Each issue includes root cause analysis, affected files with line numbers, and recommended fixes.

---

## Table of Contents

1. [P0-01: Session Drops During Training (CRITICAL)](#p0-01-session-drops-during-training-critical)
2. [P1-05: No Session Resume Option](#p1-05-no-session-resume-option)
3. [P1-06: Pause Doesn't Actually Pause](#p1-06-pause-doesnt-actually-pause)
4. [P1-07: CMS Results Not Displayed for Standalone](#p1-07-cms-results-not-displayed-for-standalone)
5. [P1-08: Tooltips Don't Appear via iQualify (LTI)](#p1-08-tooltips-dont-appear-via-iqualify-lti)
6. [P1-09/P1-12: Scene Not Reset When Training Starts](#p1-09p1-12-scene-not-reset-when-training-starts)
7. [P1-10: Sound Controls Don't Work](#p1-10-sound-controls-dont-work)

---

## P0-01: Session Drops During Training (CRITICAL)

### Priority: P0 - Critical
### Type: Bug/Session Handling Issue

### Description
During testing, the session occasionally drops while training is in progress. The learner is unexpectedly logged out and sees the login screen, even though the user did not choose to exit. This happens mid-gameplay and near the final stage before air pressure testing.

### Root Causes

#### 1. JWT Token Expires After 1 Hour (Not 2 Hours as Documented)

**File:** `app/lib/sessions/SessionManager.ts`
**Lines:** 36-37

```typescript
const SESSION_DURATION_MS = 1 * 60 * 60 * 1000 // Comment says "2 hours" but code is 1 hour!
const SESSION_DURATION_STR = '2h' // INCORRECT - should be '1h' to match actual duration
```

**Impact:** Users completing the full 6-phase training sequence often exceed 1 hour, causing unexpected logout near Q6 (pressure test).

#### 2. Aggressive Idle Detection (5 Minutes)

**File:** `app/features/idle/hooks/useIdleDetection.ts`
**Line:** 31

```typescript
const DEFAULT_IDLE_TIMEOUT = 5 * 60 * 1000 // 5 minutes - too aggressive
```

**Impact:** During pressure test animations or when reading instructions, users may not interact for 5+ minutes, triggering idle logout.

#### 3. No Token Refresh During Active Training

**File:** `app/lib/sessions/SessionManager.ts`
**Lines:** 591-622

The `refreshSession()` method exists but is never called during active training sessions.

```typescript
async refreshSession(token: string): Promise<SessionResult> {
  // Method exists but never invoked proactively
}
```

#### 4. Stream Disconnection Ends User Session

**File:** `app/hooks/useStreamConnection.ts`
**Lines:** 399-430

```typescript
if (
  wasConnectedRef.current &&
  (streamerStatus === StreamerStatus.Disconnected ||
   streamerStatus === StreamerStatus.Closed ||
   streamerStatus === StreamerStatus.Completed ||
   streamerStatus === StreamerStatus.Withdrawn)
) {
  console.log('🔌 Stream disconnected with status:', streamerStatus)
  onSessionEnd?.(reason) // Ends session even for temporary disconnects
}
```

**Impact:** Temporary network issues or PureWeb hiccups end the user's session entirely.

#### 5. Session Expiry Check Only Every 30 Seconds

**File:** `app/hooks/useSessionInfo.ts`
**Line:** 118

```typescript
const interval = setInterval(checkExpiry, 30000) // 30 seconds
```

**Impact:** Session can expire and user can initiate actions that fail before the check runs.

### Recommended Fixes

1. **Increase session duration to 3-4 hours:**
   ```typescript
   // app/lib/sessions/SessionManager.ts:36
   const SESSION_DURATION_MS = 3 * 60 * 60 * 1000 // 3 hours
   const SESSION_DURATION_STR = '3h'
   ```

2. **Increase idle timeout to 15-20 minutes:**
   ```typescript
   // app/features/idle/hooks/useIdleDetection.ts:31
   const DEFAULT_IDLE_TIMEOUT = 15 * 60 * 1000 // 15 minutes
   ```

3. **Add proactive token refresh in training state hook:**
   ```typescript
   // app/features/training/hooks/useTrainingState.ts
   // Add refresh call every 30 minutes during active training
   useEffect(() => {
     if (state.isActive) {
       const refreshInterval = setInterval(() => {
         sessionService.refreshToken()
       }, 30 * 60 * 1000)
       return () => clearInterval(refreshInterval)
     }
   }, [state.isActive])
   ```

4. **Add session extension button to expiry modal:**
   ```typescript
   // app/features/feedback/components/SessionExpiryModal.tsx
   // Add "Extend Session" button that calls refreshSession()
   ```

5. **Handle temporary stream disconnects with retry before ending session:**
   ```typescript
   // app/hooks/useStreamConnection.ts:399-430
   // Use reconnectStream() before calling onSessionEnd()
   ```

---

## P1-05: No Session Resume Option

### Priority: P1 - Major
### Type: Behaviour Change

### Description
If the learner exits the training or closes the browser tab, there is no clear way to return to the same session. The system does not offer a resume or continue option.

### Root Causes

#### 1. Resume Flow Only Available for LTI Students

**File:** `app/hooks/useSessionSelection.ts`
**Lines:** 127-131

```typescript
const handleStartStream = useCallback(async () => {
  if (!isLtiSession || userRole !== 'student') {
    goToLoadingForCinematic()  // BYPASSES session selection entirely
    return
  }
  // Only LTI students with role='student' reach session selection
```

**Impact:** Non-LTI users (demo, test, standalone registrations) never see the session selection screen.

#### 2. Sessions Only Checked After User Clicks Start

**File:** `app/hooks/useSessionSelection.ts`
**Lines:** 126-153

```typescript
// Sessions are only fetched when stream is ready AND user clicks Start
if (result.success && result.data.length > 0) {
  setActiveSessions(result.data as ActiveSession[])
  goToSessionSelection()
}
```

**Impact:** No proactive "Welcome back" prompt when user returns to the app.

#### 3. Session Tracking Lost on Page Refresh

**File:** `app/hooks/useSessionSelection.ts`
**Lines:** 117-120

```typescript
const hasResumedSessionRef = useRef<string | null>(null)
const hasAttemptedRestoreRef = useRef(false)
// In-memory only - lost on refresh
```

### Recommended Fixes

1. **Remove LTI-only gate for session selection:**
   ```typescript
   // app/hooks/useSessionSelection.ts:127-131
   const handleStartStream = useCallback(async () => {
     // Remove this condition:
     // if (!isLtiSession || userRole !== 'student') { ... }

     // Check for active sessions for ALL users
     const result = await trainingSessionService.getActiveSessions()
     // ...
   })
   ```

2. **Add proactive session check on app load:**
   ```typescript
   // app/components/StreamingApp.tsx
   useEffect(() => {
     const checkExistingSessions = async () => {
       const result = await trainingSessionService.getActiveSessions()
       if (result.success && result.data.length > 0) {
         setShowWelcomeBackPrompt(true)
       }
     }
     checkExistingSessions()
   }, [])
   ```

3. **Store last session ID in localStorage for quick access:**
   ```typescript
   // When session is selected/created
   localStorage.setItem('lastTrainingSessionId', sessionId)

   // On return, auto-select if available
   const lastSessionId = localStorage.getItem('lastTrainingSessionId')
   ```

---

## P1-06: Pause Doesn't Actually Pause

### Priority: P1 - Major
### Type: Bug/Behaviour Issue

### Description
The pause option is present in the interface but selecting it does not actually pause the training. Gameplay continues running in the background.

### Root Causes

#### 1. Message Format May Not Match UE5 Expectations

**File:** `app/lib/messageTypes.ts`
**Lines:** 578-582

```typescript
export function createMessage(type: string, data?: string): string {
  if (data === undefined || data === '') {
    return type
  }
  return `${type}:${data}`  // Sends: "training_control:pause"
}
```

**Note:** UE5 may expect JSON format: `{ "type": "training_control", "action": "pause" }`

#### 2. 'resume' Not in Type Definition

**File:** `app/lib/messageTypes.ts`
**Line:** 128

```typescript
export type TrainingControlAction = 'start' | 'pause' | 'reset' | 'test'
// Missing: 'resume'
```

**File:** `app/features/training/hooks/useTrainingState.ts`
**Lines:** 323-340

```typescript
const pauseTraining = useCallback(() => {
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'pause')
  setState(prev => ({ ...prev, isActive: false }))
}, [messageBus])

const resumeTraining = useCallback(() => {
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'resume') // 'resume' not in type!
  setState(prev => ({ ...prev, isActive: true }))
}, [messageBus])
```

#### 3. Local State Desynced from Training State

**File:** `app/components/StreamingApp.tsx`
**Lines:** 268, 685-691

```typescript
const [isTrainingPaused, setIsTrainingPaused] = useState(false) // Separate state
// vs
training.state.isActive // Different state in training hook
```

### Recommended Fixes

1. **Add 'resume' to TrainingControlAction type:**
   ```typescript
   // app/lib/messageTypes.ts:128
   export type TrainingControlAction = 'start' | 'pause' | 'resume' | 'reset' | 'test'
   ```

2. **Verify message format with UE5 team** - confirm whether colon format or JSON is expected.

3. **Synchronize pause state:**
   ```typescript
   // Use single source of truth
   const isPaused = !training.state.isActive
   // Remove separate isTrainingPaused state
   ```

4. **Add confirmation from UE5:**
   ```typescript
   // Listen for 'training_paused' and 'training_resumed' messages from UE5
   // to confirm pause/resume was received
   ```

---

## P1-07: CMS Results Not Displayed for Standalone

### Priority: P1 - Major
### Type: Bug/Integration Issue

### Description
After completing training, the CMS does not display any result when the session is accessed through the standalone application. Results work for LMS but not standalone.

### Root Causes

#### 1. isLti Hardcoded to False for Standalone Logins

**File:** `app/api/auth/simple-login/route.ts`
**Lines:** 249, 318

```typescript
const token = await new SignJWT({
  sessionId,
  userId: profile.id,
  email: profile.email,
  role: profile.role,
  sessionType: profile.role === 'student' ? 'lti' : profile.role,
  isLti: false,  // HARDCODED FALSE for all standalone logins
  // ...
})
```

#### 2. Quiz Responses Skipped for Non-LTI Sessions

**File:** `app/api/quiz/response/route.ts`
**Lines:** 164-173

```typescript
// 2. Skip save for non-LTI sessions (demo mode)
if (!session.isLti) {
  logger.info({ sessionId: session.sessionId }, 'Demo mode: Skipping quiz response save')
  return NextResponse.json({
    success: true,
    response: null,
    demo: true,
    message: 'Demo mode: Quiz response not saved',  // DATA NEVER SAVED
  })
}
```

#### 3. Training Session Returns Mock Instead of Database Record

**File:** `app/api/training/session/route.ts`
**Lines:** 67-86

```typescript
if (!session.isLti) {
  logger.info({ sessionId: session.sessionId }, 'Demo mode: Returning mock training session')
  return NextResponse.json({
    success: true,
    session: {
      id: `demo_${session.sessionId}`,  // MOCK ID - never written to database
      // ...
    },
    isNew: true,
    demo: true,
  })
}
```

#### 4. Completion Fails to Find Non-Existent Session

**File:** `app/api/training/complete/route.ts`
**Lines:** 100-101

```typescript
// Queries for session that was never created
// Returns: "No training session found"
```

### Data Flow Comparison

| Step | LMS (isLti=true) | Standalone (isLti=false) |
|------|------------------|--------------------------|
| Login | `isLti: true` | `isLti: false` |
| POST /api/training/session | Creates DB record | Returns mock only |
| POST /api/quiz/response | Saves to DB | **SKIPPED** |
| POST /api/training/complete | Updates DB record | Fails - no record |
| CMS Result Display | Has data | No data |

### Recommended Fixes

**Option A: Enable data saving for standalone students**

```typescript
// app/api/auth/simple-login/route.ts:249
const token = await new SignJWT({
  // ...
  isLti: profile.role === 'student',  // true for students, false for admin/teacher
})
```

**Option B: Create separate flag for data persistence**

```typescript
// Add new flag: saveResults: true
// Check this instead of isLti for data operations
```

**Option C: Remove isLti checks from data saving APIs**

```typescript
// app/api/quiz/response/route.ts - Remove lines 164-173
// app/api/training/session/route.ts - Remove lines 67-86
// Always create real database records
```

---

## P1-08: Tooltips Don't Appear via iQualify (LTI)

### Priority: P1 - Major
### Type: Bug/Behaviour Issue

### Description
When training is accessed through iQualify, the onboarding tooltips do not appear. Tooltips work in standalone but not via LTI launch.

### Root Causes

#### 1. Early Return Skips State Initialization for LTI

**File:** `app/features/walkthrough/useWalkthrough.ts`
**Lines:** 75-96

```typescript
// For LTI sessions, always clear the walkthrough completed state
useEffect(() => {
  if (typeof window !== 'undefined' && isLtiSession) {
    localStorage.removeItem(WALKTHROUGH_COMPLETED_KEY)  // Clears flag (correct)
  }
}, [isLtiSession])

// Check if walkthrough was already completed (only for non-LTI sessions)
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (isLtiSession) {
      return  // EARLY RETURN - never initializes isComplete to false!
    }
    const completed = localStorage.getItem(WALKTHROUGH_COMPLETED_KEY)
    if (completed === 'true') {
      setIsComplete(true)
      setIsLoading(false)
    }
  }
}, [isLtiSession])
```

**Impact:** `isComplete` state is never explicitly set to `false` for LTI sessions.

#### 2. Same Issue in Training Walkthrough

**File:** `app/features/walkthrough/useTrainingWalkthrough.ts`
**Lines:** 75-96

Identical logic with the same bug.

#### 3. Walkthrough Hidden When isComplete is Truthy/Undefined

**File:** `app/features/walkthrough/Walkthrough.tsx`
**Lines:** 197-200

```typescript
// Don't render if complete
if (isComplete) {
  return null  // Returns null if isComplete is true OR undefined
}
```

### Logic Chain

1. LTI Launch → `isLtiSession = true`
2. First useEffect clears localStorage (correct)
3. Second useEffect returns early → `isComplete` never set to `false`
4. `isComplete` remains in initial/undefined state
5. Walkthrough component returns `null`
6. No tooltips displayed

### Recommended Fixes

```typescript
// app/features/walkthrough/useWalkthrough.ts
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (isLtiSession) {
      // FIX: Explicitly set isComplete to false for LTI sessions
      setIsComplete(false)
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

Apply the same fix to `useTrainingWalkthrough.ts`.

---

## P1-09/P1-12: Scene Not Reset When Training Starts

### Priority: P1 - Major
### Type: Behaviour Change/State Management

### Description
During cinematic/onboarding, the learner can adjust the exploded view. If they don't restore it manually, training starts with the house in an exploded/altered state. The exploded-view slider can also become stuck.

### Root Causes

#### 1. startTraining() Does Not Reset Scene State

**File:** `app/features/training/hooks/useTrainingState.ts`
**Lines:** 286-321

```typescript
const startTraining = useCallback(async () => {
  console.log('Training started')

  // ... session setup ...

  setState(prev => ({
    ...prev,
    mode: 'training',
    // ... other state updates
  }))

  messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
  // ^ Only sends 'start' - NO SCENE RESET!

  eventBus.emit('training:started', { taskIndex: 0 })
}, [messageBus])
```

**Missing:** Should send explosion reset, camera reset, and layer reset before 'start'.

#### 2. No resetExplosion Function in Explosion Control Hook

**File:** `app/features/explosion/hooks/useExplosionControl.ts`

```typescript
export interface UseExplosionControlReturn {
  state: ExplosionStateData
  setExplosionLevel: (level: number) => void
  explodeBuilding: () => void
  assembleBuilding: () => void
  // Missing: resetExplosion() function
}
```

#### 3. onEnterTrainingMode Only Hides UI, Doesn't Reset State

**File:** `app/components/StreamingApp.tsx`
**Line:** 497

```typescript
onEnterTrainingMode: () => setShowExplosionControls(false),
// Only HIDES the controls - doesn't reset explosion value!
```

#### 4. skipToTraining Doesn't Reset Scene

**File:** `app/hooks/useSessionSelection.ts`
**Lines:** 325-346

```typescript
skipToTraining: async (options?: { delayTrainingStart?: boolean }) => {
  // ... existing code ...
  goToTraining()
  onEnterTrainingMode() // Only hides explosion controls

  if (!delayTrainingStart) {
    startTraining() // Calls startTraining WITHOUT scene reset
  }
}
```

### Recommended Fixes

1. **Add scene reset to startTraining():**
   ```typescript
   // app/features/training/hooks/useTrainingState.ts
   const startTraining = useCallback(async () => {
     // 1. Reset explosion to 0% (assemble)
     messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, '0')

     // 2. Reset camera to default perspective
     messageBus.sendMessage(WEB_TO_UE_MESSAGES.CAMERA_CONTROL, 'reset')

     // 3. Reset layers to default visibility
     messageBus.sendMessage(WEB_TO_UE_MESSAGES.HIERARCHICAL_CONTROL, 'show_all')

     // 4. Small delay to ensure UE5 processes resets
     await new Promise(resolve => setTimeout(resolve, 100))

     // 5. Then start training
     messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
     // ... rest of function
   }, [messageBus])
   ```

2. **Add resetExplosion to explosion control hook:**
   ```typescript
   // app/features/explosion/hooks/useExplosionControl.ts
   const resetExplosion = useCallback(() => {
     messageBus.sendMessage(WEB_TO_UE_MESSAGES.EXPLOSION_CONTROL, '0')
     setState(initialState)
   }, [messageBus])

   return {
     // ... existing returns
     resetExplosion,
   }
   ```

3. **Update onEnterTrainingMode to reset state:**
   ```typescript
   // app/components/StreamingApp.tsx
   onEnterTrainingMode: () => {
     setShowExplosionControls(false)
     training.explosionControl.resetExplosion?.()
   },
   ```

---

## P1-10: Sound Controls Don't Work

### Priority: P1 - Major
### Type: Bug/Behaviour Issue

### Description
Turning off sound from the left-hand menu does not mute the audio. Ambient sound continues playing even when all sound sliders are set to minimum or the sound toggle is turned off.

### Root Causes

#### 1. Race Condition in setAudioEnabled

**File:** `app/features/settings/hooks/useSettings.ts`
**Lines:** 149-162

```typescript
const setAudioEnabled = useCallback((enabled: boolean) => {
  setSettings(prev => ({ ...prev, audioEnabled: enabled }))  // First setState

  if (!enabled) {
    sendMessage(createAudioVolumeMessage('Master', 0))
  } else {
    setSettings(prev => {  // Second nested setState - causes race condition
      sendMessage(createAudioVolumeMessage('Master', prev.masterVolume))
      return prev  // Returns old state
    })
  }
}, [sendMessage])
```

**Issue:** Nested `setSettings` calls cause state synchronization problems.

#### 2. Ambient Volume Has No audioEnabled Check

**File:** `app/features/settings/hooks/useSettings.ts`
**Lines:** 173-177

```typescript
const setAmbientVolume = useCallback((volume: number) => {
  const clampedVolume = Math.max(0, Math.min(1, volume))
  setSettings(prev => ({ ...prev, ambientVolume: clampedVolume }))
  sendMessage(createAudioVolumeMessage('Ambient', clampedVolume))  // ALWAYS SENDS!
}, [sendMessage])
```

**Compare to Master Volume (correct implementation):**
```typescript
const setMasterVolume = useCallback((volume: number) => {
  // ...
  if (settings.audioEnabled) {  // Has check!
    sendMessage(createAudioVolumeMessage('Master', clampedVolume))
  }
}, [sendMessage, settings.audioEnabled])
```

#### 3. SFX Volume Also Missing audioEnabled Check

**File:** `app/features/settings/hooks/useSettings.ts`
**Lines:** 179-183

```typescript
const setSfxVolume = useCallback((volume: number) => {
  const clampedVolume = Math.max(0, Math.min(1, volume))
  setSettings(prev => ({ ...prev, sfxVolume: clampedVolume }))
  sendMessage(createAudioVolumeMessage('SFX', clampedVolume))  // ALWAYS SENDS!
}, [sendMessage])
```

### Recommended Fixes

1. **Fix race condition in setAudioEnabled:**
   ```typescript
   const setAudioEnabled = useCallback((enabled: boolean) => {
     setSettings(prev => {
       const newState = { ...prev, audioEnabled: enabled }

       if (!enabled) {
         // Mute all audio groups
         sendMessage(createAudioVolumeMessage('Master', 0))
         sendMessage(createAudioVolumeMessage('Ambient', 0))
         sendMessage(createAudioVolumeMessage('SFX', 0))
       } else {
         // Restore all audio group volumes
         sendMessage(createAudioVolumeMessage('Master', prev.masterVolume))
         sendMessage(createAudioVolumeMessage('Ambient', prev.ambientVolume))
         sendMessage(createAudioVolumeMessage('SFX', prev.sfxVolume))
       }

       return newState
     })
   }, [sendMessage])
   ```

2. **Add audioEnabled check to Ambient and SFX:**
   ```typescript
   const setAmbientVolume = useCallback((volume: number) => {
     const clampedVolume = Math.max(0, Math.min(1, volume))
     setSettings(prev => ({ ...prev, ambientVolume: clampedVolume }))

     if (settings.audioEnabled) {  // Add this check
       sendMessage(createAudioVolumeMessage('Ambient', clampedVolume))
     }
   }, [sendMessage, settings.audioEnabled])

   const setSfxVolume = useCallback((volume: number) => {
     const clampedVolume = Math.max(0, Math.min(1, volume))
     setSettings(prev => ({ ...prev, sfxVolume: clampedVolume }))

     if (settings.audioEnabled) {  // Add this check
       sendMessage(createAudioVolumeMessage('SFX', clampedVolume))
     }
   }, [sendMessage, settings.audioEnabled])
   ```

---

## Summary: Files Requiring Changes

| File | Issues | Priority |
|------|--------|----------|
| `app/lib/sessions/SessionManager.ts` | P0-01 | Critical |
| `app/features/idle/hooks/useIdleDetection.ts` | P0-01 | Critical |
| `app/hooks/useStreamConnection.ts` | P0-01 | Critical |
| `app/hooks/useSessionInfo.ts` | P0-01 | Critical |
| `app/hooks/useSessionSelection.ts` | P1-05 | Major |
| `app/lib/messageTypes.ts` | P1-06 | Major |
| `app/features/training/hooks/useTrainingState.ts` | P1-06, P1-09/12 | Major |
| `app/components/StreamingApp.tsx` | P1-06, P1-09/12 | Major |
| `app/api/auth/simple-login/route.ts` | P1-07 | Major |
| `app/api/quiz/response/route.ts` | P1-07 | Major |
| `app/api/training/session/route.ts` | P1-07 | Major |
| `app/features/walkthrough/useWalkthrough.ts` | P1-08 | Major |
| `app/features/walkthrough/useTrainingWalkthrough.ts` | P1-08 | Major |
| `app/features/explosion/hooks/useExplosionControl.ts` | P1-09/12 | Major |
| `app/features/settings/hooks/useSettings.ts` | P1-10 | Major |

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Sessions persist for 3+ hours without unexpected logout
- [ ] Idle timeout doesn't trigger during pressure test animations
- [ ] Non-LTI users can resume previous sessions
- [ ] Pause actually pauses training in UE5
- [ ] Standalone session results appear in CMS
- [ ] Tooltips appear when launched via iQualify
- [ ] Training always starts with scene in default (assembled) state
- [ ] Sound toggle mutes all audio including ambient
- [ ] Volume sliders have no effect when audio is disabled
