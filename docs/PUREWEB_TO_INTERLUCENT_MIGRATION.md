# PureWeb to Interlucent Migration Document

This document provides a comprehensive list of all changes required to migrate the OP-SkillSim application from PureWeb SDK to Interlucent Pixel Streaming.

---

## ⚠️ CRITICAL RULES - READ FIRST ⚠️

### Rule 1: Keep Both Implementations

**DO NOT DELETE PureWeb implementation until Interlucent is fully tested and working in production.**

- Keep `StreamingApp.tsx` (PureWeb) alongside `InterlucientStreamingApp.tsx` (Interlucent)
- Keep all PureWeb hooks, API routes, and packages installed
- Use environment variable `NEXT_PUBLIC_STREAMING_PROVIDER` to switch between them
- Only remove PureWeb code after minimum 2 weeks of stable Interlucent production use

### Rule 2: Streaming Platform Change ONLY

**This migration ONLY changes the streaming platform. Everything else remains EXACTLY the same:**

| Component | Change? | Notes |
|-----------|---------|-------|
| **Authentication Flow** | ❌ NO CHANGE | JWT, cookies, session validation - all unchanged |
| **LTI Connection** | ❌ NO CHANGE | LTI 1.3 launch, iQualify/Canvas integration - unchanged |
| **Role-Based Access Control** | ❌ NO CHANGE | Student/Teacher/Admin roles, middleware - unchanged |
| **Database Schema** | ❌ NO CHANGE | Supabase tables, training_sessions, quiz_responses - unchanged |
| **Training Logic** | ❌ NO CHANGE | useTrainingState, useToolSelection, phases - unchanged |
| **Question Flow** | ❌ NO CHANGE | useQuestionFlow, quiz submission - unchanged |
| **Session Management** | ❌ NO CHANGE | useSessionSelection, resume, persistence - unchanged |
| **UI Components** | ❌ NO CHANGE | Sidebar, modals, controls, walkthroughs - unchanged |
| **Admin Dashboard** | ❌ NO CHANGE | All admin features - unchanged |
| **API Routes (non-streaming)** | ❌ NO CHANGE | /api/auth/*, /api/training/*, /api/quiz/* - unchanged |
| **Streaming Platform** | ✅ CHANGE | PureWeb SDK → Interlucent pixel-stream |
| **Stream API Routes** | ✅ CHANGE | PureWeb routes → Interlucent token route |
| **Message Format** | ✅ CHANGE | String format → JSON format (requires UE5 update) |

### Rule 3: Parallel Operation

The application must support **running both streaming platforms** during transition:

```typescript
// app/page.tsx - Feature flag approach
const streamingProvider = process.env.NEXT_PUBLIC_STREAMING_PROVIDER || 'pureweb'

export default function Home() {
  if (streamingProvider === 'interlucent') {
    return <InterlucientStreamingApp />
  }
  return <StreamingApp />  // PureWeb - default fallback
}
```

### Rule 4: Testing Requirements

Before switching to Interlucent in production:

1. ✅ All 6 training phases work correctly
2. ✅ All 6 quiz questions work correctly
3. ✅ Session resume works
4. ✅ LTI launch works
5. ✅ Admin/Teacher access works
6. ✅ Auto-save and persistence work
7. ✅ Idle detection works
8. ✅ All modals and UI components work
9. ✅ Stream reconnection works
10. ✅ Works on corporate networks (with force-relay)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Comparison](#architecture-comparison)
3. [Files to Modify](#files-to-modify)
4. [Files to Delete](#files-to-delete)
5. [Files to Keep (Interlucent)](#files-to-keep-interlucent)
6. [Package Changes](#package-changes)
7. [Environment Variables](#environment-variables)
8. [Message Format Changes](#message-format-changes)
9. [Component Migration Details](#component-migration-details)
10. [Hook Migration Details](#hook-migration-details)
11. [API Route Changes](#api-route-changes)
12. [UE5 Blueprint Changes Required](#ue5-blueprint-changes-required)
13. [Network Configuration](#network-configuration)
14. [Testing Checklist](#testing-checklist)
15. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### Migration Scope

| Metric | PureWeb (Current) | Interlucent (Target) | Change |
|--------|-------------------|----------------------|--------|
| SDK Initialization Code | ~500 lines | ~50 lines | -90% |
| Warm Pool Code | ~290 lines | 0 (built-in) | -100% |
| Message Bus Code | ~200 lines | ~80 lines | -60% |
| API Routes | 6 routes | 1 route | -83% |
| Total Streaming Code | ~1,500 lines | ~200 lines | -87% |

### Key Benefits

- **Simpler Architecture**: Single admission token replaces multi-step authentication
- **Built-in Features**: Reconnection, warm pool, status tracking all built-in
- **Better DX**: Declarative configuration via HTML attributes
- **Less Maintenance**: No custom warm pool management
- **Modern Standards**: Native Web Components, JSON messaging, DOM events

### Risk Assessment

| Risk | Mitigation |
|------|------------|
| UE5 message format change | Coordinate with UE5 team before migration |
| Network configuration | `force-relay` attribute bypasses firewall issues |
| Feature parity | InterlucientStreamingApp.tsx already working |
| Rollback needed | Keep PureWeb code in separate branch |

---

## Architecture Comparison

### PureWeb Architecture (Current)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           StreamingApp.tsx                               │
│                              (1056 lines)                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │ useStreamConnection│  │  useMessageBus   │  │ useTrainingMessages  │   │
│  │    (473 lines)     │  │   (200 lines)    │  │   Composite          │   │
│  │                    │  │                  │  │                      │   │
│  │ - PlatformNext     │  │ - String format  │  │ - Training state     │   │
│  │ - Model selection  │  │ - RxJS Subject   │  │ - Tool selection     │   │
│  │ - ICE extraction   │  │ - Manual parsing │  │ - Question flow      │   │
│  │ - Retry logic      │  │                  │  │                      │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘   │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │    warmPool.ts    │  │ 6 API Routes     │  │  <VideoStream>       │   │
│  │   (290 lines)     │  │  (~400 lines)    │  │  (PureWeb React)     │   │
│  │                   │  │                  │  │                      │   │
│  │ - Pool management │  │ - warm-claim     │  │ - Manual audio merge │   │
│  │ - TTL tracking    │  │ - warm-init      │  │ - Autoplay handling  │   │
│  │ - Replenishment   │  │ - credentials    │  │ - Resolution control │   │
│  └──────────────────┘  │ - agent-token    │  └──────────────────────┘   │
│                        │ - create         │                              │
│                        │ - interlucent-*  │                              │
│                        └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Interlucent Architecture (Target)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      InterlucientStreamingApp.tsx                        │
│                           (~600 lines)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │useInterlucientConnect│  │     useInterlucientMessageBus            │ │
│  │    (295 lines)       │  │          (187 lines)                     │ │
│  │                      │  │                                          │ │
│  │ - Token fetch        │  │ - JSON format                            │ │
│  │ - Status tracking    │  │ - DOM events                             │ │
│  │ - Auto-reconnect     │  │ - sendUIInteraction                      │ │
│  └──────────────────────┘  └──────────────────────────────────────────┘ │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │ 1 API Route          │  │        <pixel-stream>                    │ │
│  │ interlucent-token    │  │      (Web Component)                     │ │
│  │   (~80 lines)        │  │                                          │ │
│  │                      │  │ - Built-in reconnection                  │ │
│  │ - AdmissionClient    │  │ - Built-in autoplay                      │ │
│  │ - Token signing      │  │ - Built-in status UI                     │ │
│  └──────────────────────┘  │ - swift-job-request                      │ │
│                            │ - force-relay                            │ │
│                            └──────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

### Critical Path (Changes Required)

> ⚠️ **Note**: We are NOT replacing files. We are adding feature flag support to switch between implementations.

| File | Current State | Required Changes | Priority |
|------|---------------|------------------|----------|
| `app/page.tsx` | Imports `StreamingApp` only | Add feature flag to choose between PureWeb/Interlucent | P0 |
| `app/components/InterlucientStreamingApp.tsx` | Basic test implementation | Add all features from StreamingApp (copy, don't move) | P0 |
| `.env.local` / `.env.production` | PureWeb env vars | ADD Interlucent vars (keep PureWeb vars too) | P1 |

### Files to Keep Unchanged (PureWeb Fallback)

| File | Status | Notes |
|------|--------|-------|
| `app/components/StreamingApp.tsx` | ✅ KEEP | Primary PureWeb implementation - fallback |
| `app/hooks/useStreamConnection.ts` | ✅ KEEP | PureWeb connection hook |
| `app/features/messaging/hooks/useMessageBus.ts` | ✅ KEEP | PureWeb message bus (string format) |
| `app/lib/warmPool.ts` | ✅ KEEP | PureWeb warm pool |
| `app/api/stream/warm-*` | ✅ KEEP | PureWeb API routes |
| `package.json` | ✅ KEEP BOTH | Keep PureWeb AND Interlucent packages |

### Feature Integration (Add to InterlucientStreamingApp)

| Feature | Source File | Integration Notes |
|---------|-------------|-------------------|
| Screen Flow | `useScreenFlow.ts` | Already imported, needs connection |
| Modal Manager | `useModalManager.ts` | Already imported, needs connection |
| Training Messages | `useTrainingMessagesComposite.ts` | Needs message bus adapter |
| Session Info | `useSessionInfo.ts` | Copy integration pattern |
| Session Selection | `useSessionSelection.ts` | Copy integration pattern |
| Training Persistence | `useTrainingPersistence.ts` | Copy integration pattern |
| Settings | `useSettings.ts` | Copy integration pattern |
| Idle Detection | `useIdleDetection.ts` | Copy integration pattern |
| Redux Sync | `useReduxSync.ts` | Copy integration pattern |

### UI Components to Integrate

| Component | Current Location | Notes |
|-----------|------------------|-------|
| `UnifiedSidebar` | `ControlPanel/UnifiedSidebar.tsx` | Add to InterlucientStreamingApp |
| `ControlPanel` | `ControlPanel/index.tsx` | Add (toolbar) |
| `ModalContainer` | `ModalContainer.tsx` | Add all modals |
| `MessageLog` | `MessageLog.tsx` | Add for debugging |
| `CinematicTimer` | `features/cinematic` | Add |
| `CinematicWalkthrough` | `features/walkthrough` | Add |
| `TrainingModeWalkthrough` | `features/walkthrough` | Add |
| `LoadingScreen` | `features/onboarding` | Replace with Interlucent status |
| `StarterScreen` | `features/onboarding` | Keep or replace |
| `SessionSelectionScreen` | `features/onboarding` | Keep |
| `SettingsDebugPanel` | `features/settings` | Add |

---

## Files to Delete (ONLY AFTER INTERLUCENT IS STABLE IN PRODUCTION)

> ⚠️ **WARNING**: Do NOT delete these files until:
> 1. Interlucent has been running in production for at least 2 weeks
> 2. All features have been verified working
> 3. No rollback has been needed
> 4. Team has agreed PureWeb is no longer needed

### PureWeb-Specific Files (Keep During Transition)

```
app/
├── hooks/
│   └── useStreamConnection.ts          # 473 lines - PureWeb connection
│                                        # KEEP - needed for PureWeb fallback
│
├── lib/
│   └── warmPool.ts                     # 290 lines - Custom warm pool
│                                        # KEEP - needed for PureWeb fallback
│
├── api/stream/
│   ├── warm-claim/route.ts             # Warm pool claim - KEEP
│   ├── warm-init/route.ts              # Warm pool init - KEEP
│   ├── credentials/route.ts            # PureWeb credentials - KEEP
│   ├── agent-token/route.ts            # PureWeb agent token - KEEP
│   └── create/route.ts                 # PureWeb stream creation - KEEP
│
└── components/
    └── StreamingApp.tsx                # 1056 lines - PureWeb main component
                                        # KEEP - primary fallback during transition
```

### Total Lines to Delete (Eventually): ~2,500 lines

### Deletion Checklist (Before Removing PureWeb Code)

- [ ] Interlucent running in production for 2+ weeks
- [ ] Zero rollbacks needed
- [ ] All LTI integrations verified (iQualify, Canvas, etc.)
- [ ] All user roles tested (Student, Teacher, Admin)
- [ ] Performance metrics acceptable
- [ ] No network/firewall issues reported
- [ ] Team sign-off obtained
- [ ] Git tag created for last PureWeb version

---

## Files to Keep (Interlucent)

### Already Implemented and Working

```
app/
├── components/
│   └── InterlucientStreamingApp.tsx    # 575 lines - Main component
│
├── features/streaming/components/
│   └── InterlucientStream.tsx          # 277 lines - React wrapper
│
├── hooks/
│   └── useInterlucientConnection.ts    # 295 lines - Connection hook
│
├── features/messaging/hooks/
│   └── useInterlucientMessageBus.ts    # 187 lines - Message bus
│
├── api/stream/
│   └── interlucent-token/route.ts      # 80 lines - Token generation
│
├── types/
│   └── interlucent.types.ts            # Type definitions
│
├── interlucent-minimal/
│   └── page.tsx                        # Minimal test page
│
└── interlucent-test/
    └── page.tsx                        # Full test page
```

---

## Package Changes

### Current State (Keep Both During Transition)

> ⚠️ **DO NOT uninstall PureWeb packages** until Interlucent is stable in production.

```json
// package.json - KEEP BOTH during transition
{
  "dependencies": {
    // PureWeb - KEEP for fallback
    "@pureweb/platform-sdk": "^5.0.5",
    "@pureweb/platform-sdk-react": "^5.0.5",

    // Interlucent - Already installed
    "@interlucent/admission-sdk": "^1.0.2"
  }
}
```

### Packages to Remove (ONLY AFTER INTERLUCENT STABLE)

```bash
# ONLY run this after 2+ weeks of stable Interlucent production:
npm uninstall @pureweb/platform-sdk @pureweb/platform-sdk-react @pureweb/platform-admin-sdk
```

### Packages Already Installed for Interlucent

```json
{
  "@interlucent/admission-sdk": "^1.0.2"
}
// Note: pixel-stream web component loaded via CDN in InterlucientStream.tsx
// CDN URL: https://cdn.interlucent.ai/dev/pixel-stream/0.0.73/pixel-stream.iife.min.js
```

---

## Environment Variables

### Variables to Remove

```env
# .env.local / .env.production - REMOVE these:

NEXT_PUBLIC_PUREWEB_PROJECT_ID=94adc3ba-7020-49f0-9a7c-bb8f1531536a
NEXT_PUBLIC_PUREWEB_MODEL_ID=26c1dfea-9845-46bb-861d-fb90a22b28df
PUREWEB_PROJECT_CLIENT_ID=your_client_id
PUREWEB_PROJECT_CLIENT_SECRET=your_client_secret
WARM_POOL_ADMIN_SECRET=your_admin_secret
```

### Variables to Keep/Add

```env
# .env.local / .env.production - KEEP/ADD these:

# Interlucent Configuration
INTERLUCENT_SECRET_KEY=sk-il-proj-w43wgQ-4XnhU3w53nxxohZcT0hDJq62DgH07zWWOOL38Q23OUE
NEXT_PUBLIC_INTERLUCENT_APP_ID=d2d2uQ
NEXT_PUBLIC_INTERLUCENT_APP_VERSION=dmo

# Streaming Provider Selection
NEXT_PUBLIC_STREAMING_PROVIDER=interlucent

# Optional: Publishable token (bypasses SDK for testing)
# INTERLUCENT_PUBLISHABLE_TOKEN=eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
```

### Environment Variable Mapping

| PureWeb Variable | Interlucent Equivalent | Notes |
|------------------|------------------------|-------|
| `PUREWEB_PROJECT_ID` | `INTERLUCENT_APP_ID` | Different naming |
| `PUREWEB_MODEL_ID` | `INTERLUCENT_APP_VERSION` | Version instead of model |
| `PUREWEB_CLIENT_ID` | Not needed | Single secret key |
| `PUREWEB_CLIENT_SECRET` | `INTERLUCENT_SECRET_KEY` | Ed25519 signing key |

---

## Message Format Changes

### Overview

PureWeb uses **colon-separated strings**: `"type:data:more_data"`
Interlucent uses **JSON objects**: `{ type: 'type', data: 'value' }`

### Message Mapping Table

| Message Type | PureWeb Format | Interlucent Format |
|--------------|----------------|-------------------|
| Training Start | `"training_control:start"` | `{ type: 'training_control', action: 'start' }` |
| Training Pause | `"training_control:pause"` | `{ type: 'training_control', action: 'pause' }` |
| Training Resume | `"training_control:resume"` | `{ type: 'training_control', action: 'resume' }` |
| Training Reset | `"training_control:reset"` | `{ type: 'training_control', action: 'reset' }` |
| Tool Select | `"tool_select:XRay"` | `{ type: 'tool_select', tool: 'XRay' }` |
| Pipe Select | `"pipe_select:100mm"` | `{ type: 'pipe_select', pipeType: '100mm' }` |
| Camera Control | `"camera_control:IsometricNE"` | `{ type: 'camera_control', preset: 'IsometricNE' }` |
| Camera Mode | `"camera_mode:Orbit"` | `{ type: 'camera_mode', mode: 'Orbit' }` |
| Explosion Control | `"explosion_control:50"` | `{ type: 'explosion_control', level: 50 }` |
| Layer Toggle | `"layer_toggle:Pipes:true"` | `{ type: 'layer_toggle', layerId: 'Pipes', visible: true }` |
| Waypoint Activate | `"waypoint_activate:0"` | `{ type: 'waypoint_activate', index: 0 }` |
| Question Answer | `"question_answer:Q1:1:true"` | `{ type: 'question_answer', questionId: 'Q1', tryCount: 1, isCorrect: true }` |
| Settings Audio | `"settings:audio:0.8"` | `{ type: 'settings', setting: 'audio', value: 0.8 }` |
| Settings Graphics | `"settings:graphics:high"` | `{ type: 'settings', setting: 'graphics', value: 'high' }` |

### Incoming Messages (UE5 → Web)

| Message Type | PureWeb Format | Interlucent Format |
|--------------|----------------|-------------------|
| Training Progress | `"training_progress:50:TaskName:phase1:3:8:true"` | `{ type: 'training_progress', progress: 50, taskName: 'TaskName', phase: 'phase1', currentTask: 3, totalTasks: 8, isActive: true }` |
| Question Request | `"question_request:Q1"` | `{ type: 'question_request', questionId: 'Q1' }` |
| Task Completed | `"task_completed:XRAY_MAIN:1"` | `{ type: 'task_completed', taskId: 'XRAY_MAIN', nextTaskIndex: 1 }` |
| Training Complete | `"training_complete"` | `{ type: 'training_complete' }` |
| Waypoint List | `"waypoint_list:WP1,WP2,WP3"` | `{ type: 'waypoint_list', waypoints: ['WP1', 'WP2', 'WP3'] }` |
| Layer List | `"layer_list:Pipes,Walls,Floor"` | `{ type: 'layer_list', layers: ['Pipes', 'Walls', 'Floor'] }` |
| Camera Update | `"camera_update:Front:Manual"` | `{ type: 'camera_update', perspective: 'Front', mode: 'Manual' }` |
| Pressure Test | `"pressure_test_result:pass"` | `{ type: 'pressure_test_result', result: 'pass' }` |
| Settings Applied | `"setting_applied:audio:0.8:true"` | `{ type: 'setting_applied', setting: 'audio', value: 0.8, success: true }` |
| FPS Update | `"fps_update:60"` | `{ type: 'fps_update', fps: 60 }` |

### Code Changes Required

#### Current PureWeb Sending (useMessageBus.ts)

```typescript
// Current implementation
const sendMessage = useCallback((type: string, data?: string) => {
  const message = data ? `${type}:${data}` : type
  emitter?.EmitUIInteraction(message)
}, [emitter])

// Usage
sendMessage('training_control', 'start')
sendMessage('tool_select', 'XRay')
sendMessage('question_answer', 'Q1:1:true')
```

#### New Interlucent Sending (useInterlucientMessageBus.ts)

```typescript
// New implementation
const sendMessage = useCallback((type: string, data?: Record<string, unknown>) => {
  const message = { type, ...data }
  streamRef.current?.sendUIInteraction(message)
}, [streamRef])

// Usage
sendMessage('training_control', { action: 'start' })
sendMessage('tool_select', { tool: 'XRay' })
sendMessage('question_answer', { questionId: 'Q1', tryCount: 1, isCorrect: true })
```

#### Current PureWeb Receiving

```typescript
// Current implementation
messageSubject.subscribe((raw: string) => {
  const [type, ...dataParts] = raw.split(':')
  const data = dataParts.join(':')
  // Manual parsing for each message type
})
```

#### New Interlucent Receiving

```typescript
// New implementation
streamRef.current?.addEventListener('ue-command-response', (event) => {
  const data = event.detail // Already parsed JSON
  switch (data.type) {
    case 'training_progress':
      handleTrainingProgress(data)
      break
    // ...
  }
})
```

---

## Component Migration Details

### StreamingApp.tsx → InterlucientStreamingApp.tsx

#### Features to Port

| Feature | Lines in StreamingApp | Status in Interlucent | Action |
|---------|----------------------|----------------------|--------|
| Theme Context | 5 lines | ❌ Missing | Add |
| Stream Quality | 20 lines | ❌ Missing | Add |
| Questions Context | 5 lines | ❌ Missing | Add |
| Modal Manager | 10 lines | ✅ Basic | Enhance |
| Screen Flow | 15 lines | ✅ Basic | Enhance |
| Stream Connection | 50 lines | ✅ Different | Keep Interlucent |
| Audio Handler | 70 lines | ✅ Built-in | Remove (Interlucent handles) |
| Session Info | 20 lines | ❌ Missing | Add |
| Explosion Controls | 10 lines | ❌ Missing | Add |
| Training Pause | 10 lines | ❌ Missing | Add |
| Walkthrough States | 30 lines | ❌ Missing | Add |
| Sidebar Controls | 20 lines | ❌ Missing | Add |
| Training Messages | 100 lines | ✅ Basic | Enhance callbacks |
| Redux Sync | 5 lines | ❌ Missing | Add |
| Settings Hook | 30 lines | ❌ Missing | Add |
| Training Persistence | 30 lines | ❌ Missing | Add |
| Session Selection | 50 lines | ❌ Missing | Add |
| Idle Detection | 10 lines | ❌ Missing | Add |
| Action Handlers | 200 lines | ❌ Missing | Add |
| Loading Status | 30 lines | ✅ Different | Adapt for Interlucent |
| UnifiedSidebar | 100 lines | ❌ Missing | Add |
| CinematicTimer | 10 lines | ❌ Missing | Add |
| Walkthroughs | 30 lines | ❌ Missing | Add |
| ControlPanel | 10 lines | ❌ Missing | Add |
| MessageLog | 20 lines | ❌ Missing | Add |
| ModalContainer | 30 lines | ❌ Missing | Add |
| SettingsDebugPanel | 5 lines | ❌ Missing | Add |

#### Estimated Additional Code

- **To Add**: ~600 lines (feature integration)
- **To Remove**: Audio handling, manual status (built into Interlucent)
- **Net Change**: InterlucientStreamingApp grows from ~575 to ~1000 lines

### VideoStream → pixel-stream

| PureWeb VideoStream | Interlucent pixel-stream | Notes |
|---------------------|--------------------------|-------|
| `VideoRef={videoRef}` | N/A | Handled internally |
| `Emitter={stream.emitter}` | `onMessage` callback | Different pattern |
| `Stream={stream.videoStream}` | N/A | Handled internally |
| `UseNativeTouchEvents={true}` | Default behavior | Built-in |
| `UsePointerLock={false}` | Not needed | Different approach |
| `Resolution={resolution}` | `resolution` attribute | Same concept |

---

## Hook Migration Details

### useStreamConnection.ts → useInterlucientConnection.ts

| PureWeb Hook Feature | Interlucent Equivalent | Status |
|----------------------|------------------------|--------|
| `platformRef` | Not needed | ✅ Simpler |
| `initializePlatform()` | `fetchToken()` | ✅ Done |
| `preWarm()` | `swift-job-request` attribute | ✅ Built-in |
| `streamerStatus` | `status` (from component) | ✅ Done |
| `connectionStatus` | `status` (mapped) | ✅ Done |
| `emitter` | `streamRef.sendUIInteraction` | ✅ Done |
| `messageSubject` | `ue-command-response` event | ✅ Done |
| `videoStream` | N/A (handled by component) | ✅ Simpler |
| `audioStream` | N/A (handled by component) | ✅ Simpler |
| `retryCount` | `reconnect-attempts` attribute | ✅ Built-in |
| `reconnectStream()` | `reconnectMode="recover"` | ✅ Built-in |
| `isReconnecting` | `status === 'recovering'` | ✅ Done |
| `availableModels` | Not needed | ✅ Simpler |
| `modelDefinition` | `app-id` + `app-version` | ✅ Simpler |

### useMessageBus.ts → useInterlucientMessageBus.ts

| PureWeb Feature | Interlucent Equivalent | Status |
|-----------------|------------------------|--------|
| `emitter` parameter | `streamRef` parameter | ✅ Done |
| `messageSubject` parameter | Event listener | ✅ Done |
| `sendMessage(type, data)` | `sendMessage(type, payload)` | ✅ Done |
| String format | JSON format | ✅ Done |
| RxJS subscription | `addEventListener` | ✅ Done |
| Manual parsing | `event.detail` | ✅ Done |
| `isConnected` | `dataChannelOpen` | ✅ Done |
| `messageLog` | `messageLog` | ✅ Done |
| `lastMessage` | `lastMessage` | ✅ Done |

---

## API Route Changes

### Routes to Delete

| Route | Purpose | Replacement |
|-------|---------|-------------|
| `/api/stream/warm-claim` | Claim from warm pool | `swift-job-request` attribute |
| `/api/stream/warm-init` | Initialize warm pool | Not needed |
| `/api/stream/credentials` | Get PureWeb credentials | Not needed |
| `/api/stream/agent-token` | Create agent token | `interlucent-token` |
| `/api/stream/create` | Create stream session | Not needed |

### Routes to Keep

| Route | Purpose | Notes |
|-------|---------|-------|
| `/api/stream/interlucent-token` | Generate admission token | Already implemented |

### Token Generation Comparison

#### PureWeb (Multiple Steps)

```typescript
// 1. Create admin client
const admin = new PlatformAdmin({ clientId, clientSecret })

// 2. Create environment
const environment = await admin.createAgentEnvironment(projectId, modelId)

// 3. Create agent token
const agent = await admin.createAgentToken(projectId, environment.id)

// Returns: { environmentId, agentToken }
```

#### Interlucent (Single Step)

```typescript
// 1. Create client and sign token
const client = await AdmissionClient.create(secretKey)
const token = await client
  .createToken()
  .withApplication(appId)
  .withVersion(appVersion)
  .withQueueWaitTolerance(60)
  .withSwiftJobRequest(true)
  .expiresIn(600)
  .sign()

// Returns: token (single JWT string)
```

---

## UE5 Blueprint Changes Required

### Overview

The UE5 application must be updated to:
1. **Send** JSON objects instead of colon-separated strings
2. **Receive** JSON objects instead of colon-separated strings

### Sending Messages (UE5 → Web)

#### Current UE5 Code (Pseudo-Blueprint)

```
// Training Progress
SendString("training_progress:" + Progress + ":" + TaskName + ":" + Phase)

// Question Request
SendString("question_request:" + QuestionId)

// Task Completed
SendString("task_completed:" + TaskId + ":" + NextTaskIndex)
```

#### New UE5 Code

```
// Training Progress
SendJson({
  "type": "training_progress",
  "progress": Progress,
  "taskName": TaskName,
  "phase": Phase,
  "currentTask": CurrentTask,
  "totalTasks": TotalTasks,
  "isActive": IsActive
})

// Question Request
SendJson({
  "type": "question_request",
  "questionId": QuestionId
})

// Task Completed
SendJson({
  "type": "task_completed",
  "taskId": TaskId,
  "nextTaskIndex": NextTaskIndex
})
```

### Receiving Messages (Web → UE5)

#### Current UE5 Parsing

```
// Parse "tool_select:XRay"
String Message = GetReceivedMessage()
Array Parts = Message.Split(":")
String Type = Parts[0]
String Data = Parts[1]

If Type == "tool_select":
    SelectTool(Data)
```

#### New UE5 Parsing

```
// Parse { "type": "tool_select", "tool": "XRay" }
JsonObject Message = ParseJson(GetReceivedMessage())
String Type = Message.Get("type")

If Type == "tool_select":
    String Tool = Message.Get("tool")
    SelectTool(Tool)
```

### Recommended Approach

1. **Create a compatibility layer** in UE5 that can handle both formats during transition
2. **Test with Interlucent test page** (`/interlucent-test`) before switching main app
3. **Deploy UE5 changes first**, then switch web app

---

## Network Configuration

### Domains to Whitelist

| Domain | Port | Protocol | Purpose |
|--------|------|----------|---------|
| `api.interlucent.ai` | 443 | HTTPS/WSS | API & Signaling |
| `stun.cloudflare.com` | 3478 | UDP | STUN (NAT traversal) |
| `*.turn.cloudflare.com` | 3478, 443 | UDP/TLS | TURN Relay |
| Peer IPs | 49152-65535 | UDP | WebRTC Media |

### Firewall Bypass

If UDP is blocked by enterprise firewall:

```html
<pixel-stream force-relay></pixel-stream>
```

This forces all traffic through TURN over TLS (port 443), bypassing DPI firewalls.

### Domains to Remove from Whitelist (After Migration)

- `*.pureweb.io`
- PureWeb STUN/TURN servers

---

## Testing Checklist

### Pre-Migration Testing

- [ ] `/interlucent-minimal` page loads and streams
- [ ] `/interlucent-test` page loads with full controls
- [ ] Token generation works (`/api/stream/interlucent-token`)
- [ ] `force-relay` attribute works on corporate network
- [ ] Transport shows "RELAY" in debug panel

### Post-Migration Testing

#### Connection & Streaming

- [ ] Stream connects within 60 seconds
- [ ] Video displays correctly
- [ ] Audio plays (check browser autoplay)
- [ ] Reconnection works after network drop
- [ ] `swift-job-request` reduces cold start time

#### Training Flow

- [ ] Cinematic mode works (timer, walkthroughs)
- [ ] Training mode starts correctly
- [ ] Tool selection works (all 6 tools)
- [ ] Pipe selection works
- [ ] Pressure test works
- [ ] Question modals appear
- [ ] Question answers submit correctly
- [ ] Phase completion shows success modal
- [ ] Training complete modal appears

#### UI Components

- [ ] UnifiedSidebar works in both modes
- [ ] Camera controls work
- [ ] Layer controls work
- [ ] Explosion controls work
- [ ] Waypoint controls work
- [ ] Settings panel works
- [ ] Theme toggle works

#### Session Management

- [ ] LTI login works
- [ ] Session resume works
- [ ] Session selection works (multiple sessions)
- [ ] Idle detection works
- [ ] Session expiry warning works
- [ ] Quit training works
- [ ] Session complete redirect works

#### Persistence

- [ ] Auto-save works (every 5 seconds)
- [ ] Quiz answers persist
- [ ] Training state restores on resume
- [ ] Cinematic timer persists

#### Admin

- [ ] Admin can access training
- [ ] Teacher can access training
- [ ] Results export works

---

## Rollback Plan

> ⚠️ **This is why we keep both implementations!** Rollback is instant.

### Instant Rollback (< 5 minutes)

If Interlucent fails in production, rollback is a single environment variable change:

```bash
# 1. Change environment variable
NEXT_PUBLIC_STREAMING_PROVIDER=pureweb   # or just remove the variable

# 2. Redeploy (or restart server)
# That's it! PureWeb takes over immediately.
```

### Why This Works

- PureWeb code is NOT deleted
- PureWeb packages are NOT uninstalled
- PureWeb API routes are still functional
- Only the entry point changes based on env variable

### Feature Flag Implementation

```typescript
// app/page.tsx - REQUIRED IMPLEMENTATION
const streamingProvider = process.env.NEXT_PUBLIC_STREAMING_PROVIDER || 'pureweb'

export default function Home() {
  // Default to PureWeb for safety
  if (streamingProvider === 'interlucent') {
    return <InterlucientStreamingApp />
  }
  return <StreamingApp />  // PureWeb fallback (default)
}
```

### Gradual Rollout Strategy

| Phase | Environment | Provider | Duration |
|-------|-------------|----------|----------|
| 1 | Development | Interlucent | Until stable |
| 2 | Staging | Interlucent | 1 week testing |
| 3 | Production | PureWeb (default) | Ongoing |
| 4 | Production | Interlucent (opt-in) | 1 week |
| 5 | Production | Interlucent (default) | 2 weeks monitoring |
| 6 | Production | Interlucent only | After sign-off |

### Do NOT Delete PureWeb Code Until

- [ ] Interlucent running in production for 2+ weeks
- [ ] Zero rollbacks needed during that period
- [ ] All edge cases tested (LTI, different browsers, networks)
- [ ] Written approval from project stakeholders
- [ ] Git tag created marking "last PureWeb version"

---

## Migration Timeline

| Phase | Task | Duration | Dependencies |
|-------|------|----------|--------------|
| 1 | Update InterlucientStreamingApp with all features | 1-2 days | None |
| 2 | Test all features on `/interlucent-test` | 0.5 day | Phase 1 |
| 3 | Update UE5 to JSON message format | 1-2 days | UE5 team |
| 4 | Integration testing (Web + UE5) | 1 day | Phase 2, 3 |
| 5 | Switch main entry point | 10 min | Phase 4 |
| 6 | Deploy to staging | 1 hour | Phase 5 |
| 7 | QA testing | 1 day | Phase 6 |
| 8 | Deploy to production | 1 hour | Phase 7 |
| 9 | Monitor for issues | 1 week | Phase 8 |
| 10 | Remove PureWeb code | 2 hours | Phase 9 |

**Total Estimated Time**: 1-2 weeks (including UE5 changes and testing)

---

## Summary

### ⚠️ Key Principles (Do Not Forget)

1. **KEEP BOTH IMPLEMENTATIONS** - PureWeb and Interlucent must coexist during transition
2. **STREAMING ONLY** - Only the streaming platform changes, nothing else
3. **NO AUTH CHANGES** - Authentication, LTI, RBAC all remain exactly the same
4. **NO DB CHANGES** - Database schema unchanged
5. **FEATURE FLAG** - Use `NEXT_PUBLIC_STREAMING_PROVIDER` to switch
6. **TEST THOROUGHLY** - All features must work before production switch
7. **2 WEEK MINIMUM** - Keep PureWeb available for at least 2 weeks after switch

### What Changes (Streaming Platform Only)

| Change | From | To |
|--------|------|-----|
| Entry Point | `StreamingApp` | `InterlucientStreamingApp` (via env flag) |
| Stream Component | `<VideoStream>` (PureWeb React) | `<pixel-stream>` (Web Component) |
| Connection Hook | `useStreamConnection` | `useInterlucientConnection` |
| Message Bus | `useMessageBus` (strings) | `useInterlucientMessageBus` (JSON) |
| Token API | Multiple PureWeb routes | Single `/api/stream/interlucent-token` |
| Message Format | `"type:data"` strings | `{ type, data }` JSON |

### What Stays EXACTLY the Same

| Component | Status |
|-----------|--------|
| Authentication (JWT, cookies) | ❌ NO CHANGE |
| LTI 1.3 Integration | ❌ NO CHANGE |
| Role-Based Access Control | ❌ NO CHANGE |
| Supabase Database Schema | ❌ NO CHANGE |
| Training Logic (all hooks) | ❌ NO CHANGE |
| Question Flow | ❌ NO CHANGE |
| Session Management | ❌ NO CHANGE |
| UI Components (sidebar, modals) | ❌ NO CHANGE |
| Admin Dashboard | ❌ NO CHANGE |
| Non-streaming API Routes | ❌ NO CHANGE |
| Redux Store | ❌ NO CHANGE |
| Theme System | ❌ NO CHANGE |
| Walkthroughs | ❌ NO CHANGE |
| Settings System | ❌ NO CHANGE |
| Idle Detection | ❌ NO CHANGE |
| PDF Export | ❌ NO CHANGE |

### Benefits After Migration

- **87% less streaming code** to maintain
- **Built-in reconnection** and recovery
- **Built-in warm pool** (`swift-job-request`)
- **Better error handling** with clear status events
- **Simpler debugging** with CSS status attributes
- **Modern standards** (Web Components, JSON, DOM events)
- **Better firewall compatibility** (`force-relay` attribute)

### Rollback Procedure

If Interlucent fails in production:

```bash
# 1. Change environment variable
NEXT_PUBLIC_STREAMING_PROVIDER=pureweb

# 2. Redeploy
# That's it - PureWeb code is still there and will take over
```

---

## Appendix: Quick Reference Card

### Environment Variable to Switch Streaming Platform

```env
# Use Interlucent
NEXT_PUBLIC_STREAMING_PROVIDER=interlucent

# Use PureWeb (default/fallback)
NEXT_PUBLIC_STREAMING_PROVIDER=pureweb
```

### Test Pages

| Page | Purpose |
|------|---------|
| `/interlucent-minimal` | Basic Interlucent stream test |
| `/interlucent-test` | Full Interlucent with controls |
| `/` | Main app (uses env variable to select) |

### Key Files

| Purpose | PureWeb | Interlucent |
|---------|---------|-------------|
| Main Component | `StreamingApp.tsx` | `InterlucientStreamingApp.tsx` |
| Connection Hook | `useStreamConnection.ts` | `useInterlucientConnection.ts` |
| Message Bus | `useMessageBus.ts` | `useInterlucientMessageBus.ts` |
| Stream Component | `<VideoStream>` | `<InterlucientStream>` |
| Token API | Multiple routes | `/api/stream/interlucent-token` |

---

*Document Version: 1.1*
*Last Updated: 2026-03-14*
*Author: Claude Code*

**REMEMBER: This migration changes ONLY the streaming platform. Authentication, LTI, RBAC, database, and all other systems remain EXACTLY the same.**
