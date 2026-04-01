# Client Feedback - All Issues (Combined)

**Document Version:** 1.0
**Date:** 2026-03-30
**Project:** OP-Skillsim Plumbing Training Simulator

This document consolidates all client feedback issues for both the **Unreal Engine 5** and **Web Application** sides. Issues are organized by priority and include cross-references between related items.

---

## Table of Contents

### Critical Issues (P0)
1. [P0-01: Session Drops During Training](#p0-01-session-drops-during-training-critical) - **WEB**

### Major Issues (P1)
2. [P1-01: Measurement Tool Has No Real Role](#p1-01-measurement-tool-has-no-real-role) - **UE5**
3. [P1-02: Phase 4 Guidance Indicators Not Clear](#p1-02-phase-4-guidance-indicators-not-clear) - **UE5**
4. [P1-03: Solvent Cement Only Applied to One Component](#p1-03-solvent-cement-only-applied-to-one-component) - **UE5**
5. [P1-04: Air Pressure Gauge Positioning & Test Outcomes](#p1-04-air-pressure-gauge-positioning--test-outcomes) - **UE5**
6. [P1-05: No Session Resume Option](#p1-05-no-session-resume-option) - **WEB**
7. [P1-06: Pause Doesn't Actually Pause](#p1-06-pause-doesnt-actually-pause) - **WEB + UE5**
8. [P1-07: CMS Results Not Displayed for Standalone](#p1-07-cms-results-not-displayed-for-standalone) - **WEB**
9. [P1-08: Tooltips Don't Appear via iQualify (LTI)](#p1-08-tooltips-dont-appear-via-iqualify-lti) - **WEB**
10. [P1-09/P1-12: Scene Not Reset When Training Starts](#p1-09p1-12-scene-not-reset-when-training-starts) - **WEB**
11. [P1-10: Sound Controls Don't Work](#p1-10-sound-controls-dont-work) - **WEB**
12. [P1-11: Mouse Controls Behave Incorrectly](#p1-11-mouse-controls-behave-incorrectly) - **UE5**

### Improvement Issues (P2)
13. [P2-01: X-Ray Inspection Tool UX Issues](#p2-01-x-ray-inspection-tool-ux-issues) - **UE5**
14. [P2-02: Network/Graphics Settings Have No Effect](#p2-02-networkgraphics-settings-have-no-effect) - **UE5**

---

## Issue Summary by Team

### Web Application Team

| ID | Issue | Priority | Effort |
|----|-------|----------|--------|
| P0-01 | Session Drops During Training | Critical | High |
| P1-05 | No Session Resume Option | Major | Medium |
| P1-06 | Pause Doesn't Actually Pause (partial) | Major | Low |
| P1-07 | CMS Results Not Displayed for Standalone | Major | Medium |
| P1-08 | Tooltips Don't Appear via iQualify | Major | Low |
| P1-09/12 | Scene Not Reset When Training Starts | Major | Medium |
| P1-10 | Sound Controls Don't Work | Major | Low |

### Unreal Engine 5 Team

| ID | Issue | Priority | Effort |
|----|-------|----------|--------|
| P1-01 | Measurement Tool Has No Real Role | Major | Medium |
| P1-02 | Phase 4 Guidance Indicators Not Clear | Major | Medium |
| P1-03 | Solvent Cement Only Applied to One Component | Major | Low |
| P1-04 | Air Pressure Gauge Positioning & Test Outcomes | Major | Medium |
| P1-06 | Pause Command Not Handled (partial) | Major | Low |
| P1-11 | Mouse Controls Behave Incorrectly | Major | Medium |
| P2-01 | X-Ray Inspection Tool UX Issues | Improvement | High |
| P2-02 | Network/Graphics Settings Have No Effect | Improvement | Medium |

---

## Message Protocol Reference

The web application sends messages to UE5 using the following format:

```
type:data
```

Example messages:
- `tool_select:Measuring`
- `training_control:pause`
- `settings_control:graphics_quality:High`

**Full protocol documentation:** See `app/lib/messageTypes.ts` in the web codebase.

---

# Critical Issues (P0)

## P0-01: Session Drops During Training (CRITICAL)

**Team:** WEB
**Priority:** P0 - Critical
**Type:** Bug/Session Handling Issue

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
   useEffect(() => {
     if (state.isActive) {
       const refreshInterval = setInterval(() => {
         sessionService.refreshToken()
       }, 30 * 60 * 1000)
       return () => clearInterval(refreshInterval)
     }
   }, [state.isActive])
   ```

4. **Add session extension button to expiry modal**

5. **Handle temporary stream disconnects with retry before ending session**

---

# Major Issues (P1)

## P1-01: Measurement Tool Has No Real Role

**Team:** UE5
**Priority:** P1 - Major
**Type:** Behaviour Change
**Area:** Phase 3 - Component Measurements

### Client Description
The question before measuring is good, but the measurement tool itself doesn't play any real role in the step. The learner can answer the question, select the tape, do a hypothetical measurement, and move on without meaningfully using the measuring tool for a specific learning/teaching purpose.

### Expected Behaviour
The measurement step should require the learner to use the measurement tool to complete a task. The tool should produce a clear measurement result (for example, a visible reading or confirmation), and progress should only be allowed once the measurement action is completed correctly.

### Technical Notes

**Message received from web:**
```
tool_select:Measuring
```

**Required UE5 changes:**

1. **Add measurement interaction requirement:**
   - Require user to click/drag the measuring tape to specific points
   - Display actual measurement value (e.g., "450mm")
   - Validate measurement is within acceptable range before allowing progression

2. **Add visual feedback:**
   - Show measurement lines/guides
   - Display numeric readout on tape or in UI
   - Highlight correct measurement points

3. **Gate progression:**
   - Only send `task_completed` message after valid measurement is performed
   - Consider requiring multiple measurements (trench depth, width, pipe length)

### Learning Outcome
Measurement is a key skill in plumbing. The tool must be required for progression, not just available.

---

## P1-02: Phase 4 Guidance Indicators Not Clear

**Team:** UE5
**Priority:** P1 - Major
**Type:** Behaviour Change/Guidance Improvement
**Area:** Phase 4 - Pipe Assembly

### Client Description
The current guidance indicator is simple static dots placed on the screen next to a fitting. They don't clearly guide the learner on what action is expected next. The dots are visually basic and easy to overlook.

### Expected Behaviour
This phase should include clearer directive guidance:

1. **Animated guidance indicators:**
   - Subtle radiating or blinking markers that draw attention
   - Pulsing glow effects on interaction points

2. **Interactive tooltips:**
   - When learner hovers over or clicks markers, display short instruction
   - Include small audio icon for voice-over guidance

3. **Step-by-step progression:**
   - Clear indication of current step vs completed steps
   - Visual connection between guidance and actual components

### Technical Notes

**Current implementation:** Static dot meshes/sprites at fitting locations.

**Required UE5 changes:**

1. Replace static dots with animated Widget/Material
2. Add interaction detection (hover/click)
3. Implement step tracking

### Design Guidelines
- Indicators should be clean, subtle, and consistent with overall UI design
- Consider colour coding: blue for current step, green for completed, grey for upcoming

---

## P1-03: Solvent Cement Only Applied to One Component

**Team:** UE5
**Priority:** P1 - Major
**Type:** Behaviour Change
**Area:** Phase 5 - Glueing

### Client Description
Currently, the solvent cement is applied only to one component.

### Expected Behaviour
Solvent cement should be applied to both:
- The pipe (male end)
- The fitting (female end)

### Technical Notes

**Message received from web:**
```
tool_select:Glue
task_start:Glue
```

**Required UE5 changes:**

1. **Two-step glue application:**
   - First click: Apply glue to pipe (male)
   - Second click: Apply glue to fitting (female)
   - Visual feedback for each application

2. **Validation:**
   - Only allow connection after both surfaces have glue
   - If user tries to connect without both, show error/reminder

### Industry Standard
Per plumbing best practices, solvent cement must be applied to both mating surfaces for proper joint integrity.

---

## P1-04: Air Pressure Gauge Positioning & Test Outcomes

**Team:** UE5
**Priority:** P1 - Major
**Type:** Behaviour Change/UI Adjustment
**Area:** Phase 6 - Air Pressure Test

### Client Description
1. The air pressure gauge is positioned in the lower right corner where it becomes partially hidden under the web UI settings drawer panel.
2. This step currently allows only a successful outcome - no possibility for failure.

### Expected Behaviour

**Gauge positioning:**
- Reposition gauge so it remains clearly visible and unobstructed
- Consider upper-left or center-right positioning

**Test outcomes:**
- Allow both correct and incorrect outcomes depending on learner's actions
- Provide meaningful feedback if pressure test fails
- Possible failure scenarios:
  - Connections not properly sealed
  - Air plugs not correctly installed
  - Pressure drops too quickly (leak)

### Technical Notes

**Messages involved:**
```
Web → UE5:
test_plug_select:AirPlug
pressure_test_start:air_test

UE5 → Web:
pressure_test_result:true:20:air_test   (success)
pressure_test_result:false:15:air_test  (failure - pressure dropped)
```

**Required UE5 changes:**

1. Reposition gauge widget
2. Implement failure conditions
3. Add guidance indicators (same as Phase 4)
4. Feedback messages for success/failure

### NZ Standard Reference
Per NZS3500, a successful air pressure test requires maintaining 20 PSI for the specified duration.

---

## P1-05: No Session Resume Option

**Team:** WEB
**Priority:** P1 - Major
**Type:** Behaviour Change

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

**Impact:** No proactive "Welcome back" prompt when user returns to the app.

#### 3. Session Tracking Lost on Page Refresh

**File:** `app/hooks/useSessionSelection.ts`
**Lines:** 117-120 (In-memory only - lost on refresh)

### Recommended Fixes

1. **Remove LTI-only gate for session selection**
2. **Add proactive session check on app load**
3. **Store last session ID in localStorage for quick access**

---

## P1-06: Pause Doesn't Actually Pause

**Team:** WEB + UE5
**Priority:** P1 - Major
**Type:** Bug/Behaviour Issue

### Description
The pause option is present in the interface but selecting it does not actually pause the training. Gameplay continues running in the background.

### Root Causes (Web)

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

#### 3. Local State Desynced from Training State

**File:** `app/components/StreamingApp.tsx`
(Separate `isTrainingPaused` state vs `training.state.isActive`)

### Root Causes (UE5)

**Messages sent from web:**
```
training_control:pause
training_control:resume
```

**Required UE5 changes:**

1. **Implement pause handler:**
   - Pause all training activities
   - Stop timers
   - Pause animations
   - Disable user interaction with training elements
   - Keep camera controls active for viewing

2. **Pause state management:**
   - Track paused state in game instance
   - Consider visual indication (slight desaturation, "PAUSED" overlay)

3. **Send confirmation back to web:**
   ```
   training_paused:true
   training_resumed:true
   ```

### Recommended Fixes (Web)

1. Add 'resume' to TrainingControlAction type
2. Verify message format with UE5 team
3. Synchronize pause state (single source of truth)
4. Add confirmation listener from UE5

---

## P1-07: CMS Results Not Displayed for Standalone

**Team:** WEB
**Priority:** P1 - Major
**Type:** Bug/Integration Issue

### Description
After completing training, the CMS does not display any result when the session is accessed through the standalone application. Results work for LMS but not standalone.

### Root Causes

#### 1. isLti Hardcoded to False for Standalone Logins

**File:** `app/api/auth/simple-login/route.ts`
**Lines:** 249, 318

```typescript
const token = await new SignJWT({
  // ...
  isLti: false,  // HARDCODED FALSE for all standalone logins
})
```

#### 2. Quiz Responses Skipped for Non-LTI Sessions

**File:** `app/api/quiz/response/route.ts`
**Lines:** 164-173

```typescript
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

### Data Flow Comparison

| Step | LMS (isLti=true) | Standalone (isLti=false) |
|------|------------------|--------------------------|
| Login | `isLti: true` | `isLti: false` |
| POST /api/training/session | Creates DB record | Returns mock only |
| POST /api/quiz/response | Saves to DB | **SKIPPED** |
| POST /api/training/complete | Updates DB record | Fails - no record |
| CMS Result Display | Has data | No data |

### Recommended Fixes

**Option A:** Enable data saving for standalone students
**Option B:** Create separate flag for data persistence
**Option C:** Remove isLti checks from data saving APIs (always create real records)

---

## P1-08: Tooltips Don't Appear via iQualify (LTI)

**Team:** WEB
**Priority:** P1 - Major
**Type:** Bug/Behaviour Issue

### Description
When training is accessed through iQualify, the onboarding tooltips do not appear. Tooltips work in standalone but not via LTI launch.

### Root Causes

#### 1. Early Return Skips State Initialization for LTI

**File:** `app/features/walkthrough/useWalkthrough.ts`
**Lines:** 75-96

```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (isLtiSession) {
      return  // EARLY RETURN - never initializes isComplete to false!
    }
    // ...
  }
}, [isLtiSession])
```

**Impact:** `isComplete` state is never explicitly set to `false` for LTI sessions.

#### 2. Same Issue in Training Walkthrough

**File:** `app/features/walkthrough/useTrainingWalkthrough.ts`
**Lines:** 75-96 (Identical logic with the same bug)

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

**Team:** WEB
**Priority:** P1 - Major
**Type:** Behaviour Change/State Management

### Description
During cinematic/onboarding, the learner can adjust the exploded view. If they don't restore it manually, training starts with the house in an exploded/altered state. The exploded-view slider can also become stuck.

### Root Causes

#### 1. startTraining() Does Not Reset Scene State

**File:** `app/features/training/hooks/useTrainingState.ts`
**Lines:** 286-321

```typescript
const startTraining = useCallback(async () => {
  // ... session setup ...
  messageBus.sendMessage(WEB_TO_UE_MESSAGES.TRAINING_CONTROL, 'start')
  // ^ Only sends 'start' - NO SCENE RESET!
}, [messageBus])
```

**Missing:** Should send explosion reset, camera reset, and layer reset before 'start'.

#### 2. No resetExplosion Function in Explosion Control Hook

**File:** `app/features/explosion/hooks/useExplosionControl.ts`

#### 3. onEnterTrainingMode Only Hides UI, Doesn't Reset State

**File:** `app/components/StreamingApp.tsx`
**Line:** 497

```typescript
onEnterTrainingMode: () => setShowExplosionControls(false),
// Only HIDES the controls - doesn't reset explosion value!
```

### Recommended Fixes

1. **Add scene reset to startTraining():**
   ```typescript
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
   }, [messageBus])
   ```

2. **Add resetExplosion to explosion control hook**

3. **Update onEnterTrainingMode to reset state**

---

## P1-10: Sound Controls Don't Work

**Team:** WEB
**Priority:** P1 - Major
**Type:** Bug/Behaviour Issue

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
      return prev
    })
  }
}, [sendMessage])
```

#### 2. Ambient Volume Has No audioEnabled Check

**File:** `app/features/settings/hooks/useSettings.ts`
**Lines:** 173-177

```typescript
const setAmbientVolume = useCallback((volume: number) => {
  // ...
  sendMessage(createAudioVolumeMessage('Ambient', clampedVolume))  // ALWAYS SENDS!
}, [sendMessage])
```

#### 3. SFX Volume Also Missing audioEnabled Check

**File:** `app/features/settings/hooks/useSettings.ts`
**Lines:** 179-183

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

2. **Add audioEnabled check to Ambient and SFX volume setters**

---

## P1-11: Mouse Controls Behave Incorrectly

**Team:** UE5
**Priority:** P1 - Major
**Type:** Bug/Behaviour Issue
**Area:** Navigation/Mouse Controls

### Client Description
1. **Right-click + drag** moves the scene in the opposite direction of the mouse movement (moving mouse right shifts scene left).
2. **Mouse wheel scrolling** works correctly for zoom.
3. **Mouse wheel press/drag** causes unpredictable and inconsistent behaviour. The scene moves randomly and can exit the expected viewing area.

### Expected Behaviour
- Right-click + drag should move the scene in the same direction as mouse movement
- Mouse wheel press/drag should be clearly defined or disabled if not required
- Navigation should remain within controlled boundaries

### Technical Notes

This is entirely handled by UE5's camera controller and Pixel Streaming input handling.

**Required UE5 changes:**

1. **Fix right-click drag inversion:**
   ```cpp
   // Current (wrong):
   CameraLocation -= InputDelta;

   // Correct:
   CameraLocation += InputDelta;
   ```

2. **Fix or disable mouse wheel press/drag**

3. **Add camera boundaries:**
   ```cpp
   FVector ClampedLocation = FMath::Clamp(
       NewLocation,
       MinBounds,
       MaxBounds
   );
   ```

4. **Check Pixel Streaming settings**

---

# Improvement Issues (P2)

## P2-01: X-Ray Inspection Tool UX Issues

**Team:** UE5
**Priority:** P2 - Improvement
**Type:** Improvement
**Area:** Phase 2 - Site Inspection (X-Ray)

### Client Description
The X-ray inspection tool currently uses a mix of circular reveal areas and a slider. The circular reveal appears only for a short time with very stiff and limited movement abilities. The slider is not easy to notice and interaction is not intuitive.

### Expected Behaviour
1. Allow learner to control visibility of internal layers independently
2. Provide clear, interactive, responsive slider or control
3. Keep inspection active while learner is using the tool
4. Add visual guidance (blinking/radiating indicators) for relevant inspection areas

### Technical Notes

**Message received from web:**
```
tool_select:XRay
```

**Required UE5 changes:**

1. **Improve circular reveal:**
   - Increase visibility duration (or make persistent while tool active)
   - Smoother movement tracking with mouse
   - Adjustable reveal radius via scroll wheel

2. **Improve slider:**
   - Higher contrast/visibility
   - Larger hit area for easier interaction
   - Visual feedback on hover/drag
   - Label showing percentage or layer name

3. **Layer control:**
   - Independent toggles for different layers (pipes, ground, structure)
   - Gradual fade in/out rather than instant toggle

4. **Guidance indicators**

5. **Timing:**
   - Remove or extend time limit
   - Allow learner to explore at their own pace

---

## P2-02: Network/Graphics Settings Have No Effect

**Team:** UE5
**Priority:** P2 - Improvement
**Type:** Improvement
**Area:** Settings UI Panel - Network/Graphics

### Client Description
Changing network bandwidth and graphics quality settings does not show any visible or measurable impact on performance or visual output. It is unclear whether these settings are active or functioning.

### Technical Notes

**Messages sent from web:**
```
settings_control:graphics_quality:Low
settings_control:graphics_quality:Medium
settings_control:graphics_quality:High
settings_control:graphics_quality:Epic

settings_control:bandwidth:Auto
settings_control:bandwidth:Low Quality
settings_control:bandwidth:Medium Quality
settings_control:bandwidth:High Quality
```

**Required UE5 changes:**

1. **Implement graphics quality handler** using Scalability settings

2. **Implement bandwidth handler** for Pixel Streaming encoder settings

3. **Send confirmation back to web:**
   ```
   setting_applied:graphics_quality:High:true
   setting_applied:bandwidth:Auto:true
   ```

4. **Visual feedback** when setting is applied

### Expected Outcomes

| Setting | Expected Effect |
|---------|-----------------|
| Graphics: Low | Reduced shadows, lower textures, better FPS |
| Graphics: Epic | Full quality, shadows, reflections |
| Bandwidth: Low | Lower resolution stream, reduced latency |
| Bandwidth: High | Full resolution stream, higher quality |

---

# Files Requiring Changes

## Web Application Files

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

## UE5 Components

| Component | Issues | Priority |
|-----------|--------|----------|
| Measurement Tool | P1-01 | Major |
| Guidance System | P1-02 | Major |
| Glue Application | P1-03 | Major |
| Pressure Test | P1-04 | Major |
| Training Controller | P1-06 | Major |
| Camera Controller | P1-11 | Major |
| X-Ray Tool | P2-01 | Improvement |
| Settings Handler | P2-02 | Improvement |

---

# Testing Checklist

## Web Application Tests

- [ ] Sessions persist for 3+ hours without unexpected logout
- [ ] Idle timeout doesn't trigger during pressure test animations
- [ ] Non-LTI users can resume previous sessions
- [ ] Pause sends correct message format to UE5
- [ ] Standalone session results appear in CMS
- [ ] Tooltips appear when launched via iQualify
- [ ] Training always starts with scene in default (assembled) state
- [ ] Sound toggle mutes all audio including ambient
- [ ] Volume sliders have no effect when audio is disabled

## UE5 Tests

- [ ] Measurement tool requires actual measurement before progression
- [ ] Phase 4 has animated guidance indicators with tooltips
- [ ] Glue is applied to both pipe AND fitting
- [ ] Air pressure gauge is visible and not obscured by web UI
- [ ] Pressure test can fail with meaningful feedback
- [ ] Pause command actually pauses all training activity
- [ ] Right-click drag moves camera in correct direction
- [ ] Mouse wheel press has defined or disabled behaviour
- [ ] Camera stays within valid boundaries
- [ ] X-Ray tool has improved controls and longer visibility
- [ ] Graphics quality settings show visible difference
- [ ] Bandwidth settings affect stream quality

---

# Message Protocol Quick Reference

## Web → UE5 Messages

| Message | Format | Example |
|---------|--------|---------|
| Training Control | `training_control:action` | `training_control:pause` |
| Tool Select | `tool_select:ToolName` | `tool_select:Measuring` |
| Pipe Select | `pipe_select:PipeType` | `pipe_select:y-junction` |
| Test Plug | `test_plug_select:PlugType` | `test_plug_select:AirPlug` |
| Pressure Test | `pressure_test_start:TestType` | `pressure_test_start:air_test` |
| Camera Control | `camera_control:Action` | `camera_control:reset` |
| Explosion Control | `explosion_control:Level` | `explosion_control:0` |
| Settings | `settings_control:type:value` | `settings_control:graphics_quality:High` |

## UE5 → Web Messages

| Message | Format | Example |
|---------|--------|---------|
| Training Progress | `training_progress:progress:task:phase:current:total:active` | `training_progress:75:Measuring:3:3:6:true` |
| Task Completed | `task_completed:TaskId` | `task_completed:MEASURING` |
| Pressure Result | `pressure_test_result:passed:pressure:type` | `pressure_test_result:true:20:air_test` |
| Setting Applied | `setting_applied:type:value:success` | `setting_applied:graphics_quality:High:true` |
| Training Paused | `training_paused:true` | `training_paused:true` |
| Training Resumed | `training_resumed:true` | `training_resumed:true` |
