# Migration Session: PureWeb to Interlucent

**Session Date:** 2026-03-17
**Goal:** Migrate StreamingApp.tsx from PureWeb to Interlucent streaming provider
**Scope:** ONLY change stream provider - ALL features remain identical

---

## Migration Overview

### What Changes
| Component | PureWeb | Interlucent |
|-----------|---------|-------------|
| SDK | `@pureweb/platform-sdk` | `@interlucent/admission-sdk` + CDN web component |
| Video Component | `<VideoStream>` from SDK | `<InterlucientStream>` custom component |
| Connection Hook | `useStreamConnection` | `useInterlucientConnection` |
| Message Format | Plain strings: `"type:data"` | JSON objects: `{ type, tool, ... }` |
| Message Bus | `useMessageBus` | `useInterlucientMessageBus` |

### What Does NOT Change
- All UI components (ControlPanel, UnifiedSidebar, etc.)
- All modals (QuestionModal, PhaseSuccess, etc.)
- Screen flow logic (starter → loading → cinematic/training)
- Training state management
- Quiz/questions system
- Session persistence
- LTI authentication
- Theme system
- All feature hooks (useTrainingState, useToolSelection, etc.)

---

## Key Files

### Existing Interlucent Implementation (Already Done)
- `app/features/streaming/components/InterlucientStream.tsx` - React wrapper for `<pixel-stream>`
- `app/hooks/useInterlucientConnection.ts` - Token/connection management
- `app/features/messaging/hooks/useInterlucientMessageBus.ts` - JSON message conversion

### Files to Migrate
- `app/components/StreamingApp.tsx` - Main streaming app (1056 lines)

### PureWeb-Specific Files (Will be replaced)
- `app/hooks/useStreamConnection.ts` - PureWeb connection logic
- `app/features/messaging/hooks/useMessageBus.ts` - String message format

---

## Message Format Conversion

### Web → UE5 Messages
| Type | PureWeb (String) | Interlucent (JSON) |
|------|------------------|-------------------|
| Tool Select | `tool_select:XRay` | `{ type: "tool_select", tool: "XRay" }` |
| Training Control | `training_control:start` | `{ type: "training_control", action: "start" }` |
| Camera Control | `camera_control:IsometricNE` | `{ type: "camera_control", preset: "IsometricNE" }` |
| Explosion Level | `explosion_control:50` | `{ type: "explosion_control", level: 50 }` |
| Pipe Select | `pipe_select:100mm` | `{ type: "pipe_select", pipeType: "100mm" }` |

### UE5 → Web Messages
Incoming messages from UE5 are parsed back to string format by `useInterlucientMessageBus.jsonToString()` so all existing `parseMessage()` logic continues to work unchanged.

---

## Implementation Progress

### Completed
- [x] Read all documentation
- [x] Understand existing Interlucent components
- [x] Created session.md for tracking
- [x] Analyzed StreamingApp.tsx PureWeb dependencies

### Completed
- [x] Plan migration approach - **DECIDED: Create parallel files**
- [x] Create useTrainingMessagesCompositeInterlucent.ts
- [x] Create StreamingAppInterlucent.tsx
- [x] Update page.tsx to use env flag for provider switching
- [x] Update useTrainingPersistence and useSessionSelection to use `isConnected: boolean`
- [x] TypeScript compilation passes with no errors

### Pending
- [ ] Manual testing with Interlucent provider

---

## Analysis: StreamingApp.tsx PureWeb Dependencies

### Direct PureWeb Imports (lines 4-6)
```typescript
import { StreamerStatus } from "@pureweb/platform-sdk";
import { VideoStream } from "@pureweb/platform-sdk-react";
```

### PureWeb Hooks Used
1. **useStreamConnection** (line 166-176) - Returns:
   - `emitter` (InputEmitter) - For sending messages
   - `messageSubject` (Subject<string>) - For receiving messages
   - `videoStream` (MediaStream) - For video display
   - `audioStream` (MediaStream) - For audio
   - `streamerStatus` (StreamerStatus) - Connection state
   - `isConnected`, `connectionStatus`, etc.

2. **useTrainingMessagesComposite** (line 297-390) - Uses:
   - `stream.emitter` - PureWeb InputEmitter
   - `stream.messageSubject` - RxJS Subject

### PureWeb Components
1. **VideoStream** (line 980-988) - PureWeb's video component

### Key Integration Points
1. `stream.emitter` passed to `useTrainingMessagesComposite`
2. `stream.messageSubject` passed to `useTrainingMessagesComposite`
3. `StreamerStatus.Connected` used for connection checks
4. `VideoStream` component for rendering video

### Migration Strategy
The key insight is that `useTrainingMessagesComposite` uses `useMessageBus` internally, which expects:
- `InputEmitter` for sending (PureWeb)
- `Subject<string>` for receiving (PureWeb)

For Interlucent, we need to either:
1. Create an adapter that provides the same interface
2. Create a new `useTrainingMessagesCompositeInterlucent` that uses `useInterlucientMessageBus`

**Recommended: Option 2** - Create a parallel composite hook that uses Interlucent message bus

---

## Implementation Details (2026-03-17)

### Files Created

1. **`app/hooks/useTrainingMessagesCompositeInterlucent.ts`**
   - Interlucent version of `useTrainingMessagesComposite`
   - Uses `useInterlucientMessageBus` instead of `useMessageBus`
   - Same interface as PureWeb version - all feature hooks work unchanged

2. **`app/components/StreamingAppInterlucent.tsx`**
   - Interlucent version of `StreamingApp.tsx`
   - Uses `InterlucientStream` instead of `VideoStream`
   - Uses `useInterlucientConnection` instead of `useStreamConnection`
   - All UI components and logic remain IDENTICAL

### Files Modified

1. **`app/page.tsx`**
   - Added provider switching logic based on `NEXT_PUBLIC_STREAMING_PROVIDER` env var
   - Dynamically imports either `StreamingApp` (PureWeb) or `StreamingAppInterlucent` (Interlucent)

2. **`app/hooks/useTrainingPersistence.ts`**
   - Changed `streamerStatus: StreamerStatus` to `isConnected: boolean`
   - Works with both PureWeb and Interlucent now

3. **`app/hooks/useSessionSelection.ts`**
   - Changed `streamerStatus: StreamerStatus` to `isConnected: boolean`
   - Works with both PureWeb and Interlucent now

4. **`app/components/StreamingApp.tsx`**
   - Updated to use new `isConnected` interface for persistence/session hooks

### How to Switch Providers

Set the environment variable:
```bash
# Use PureWeb (default)
NEXT_PUBLIC_STREAMING_PROVIDER=pureweb

# Use Interlucent
NEXT_PUBLIC_STREAMING_PROVIDER=interlucent
```

### Key Architectural Decisions

1. **Parallel Files, Not Modified Files**
   - Created new files rather than modifying existing ones
   - Keeps PureWeb implementation intact and working
   - Easy to switch back if needed

2. **Same Interface for Feature Hooks**
   - `useInterlucientMessageBus` has same return type as `useMessageBus`
   - All feature hooks (camera, explosion, layers, etc.) work unchanged
   - No changes needed to any feature hooks

3. **Boolean `isConnected` Instead of `StreamerStatus`**
   - Persistence and session hooks now use simple boolean
   - Works for both PureWeb (`stream.isConnected`) and Interlucent (`stream.isConnected`)
   - Simpler and more portable interface

---

## Key Technical Decisions

### Decision 1: How to Structure Migration
**Options:**
1. Create new `StreamingAppInterlucent.tsx` and use env flag to switch
2. Modify `StreamingApp.tsx` to conditionally use either provider
3. Replace PureWeb entirely in `StreamingApp.tsx`

**Recommended:** Option 1 - Keep both implementations until Interlucent is fully tested

### Decision 2: Message Bus Integration
The `useInterlucientMessageBus` already handles:
- Converting string format → JSON for sending
- Converting JSON → string format for receiving
- Same `ParsedMessage` type output as PureWeb's `useMessageBus`

This means `useTrainingMessagesComposite` and other consumers need minimal changes.

---

## Architecture Comparison

### PureWeb Architecture
```
StreamingApp.tsx
├── useStreamConnection (PureWeb SDK)
│   ├── emitter (InputEmitter)
│   └── messageSubject (Subject<string>)
├── useTrainingMessagesComposite
│   └── useMessageBus (string format)
├── <VideoStream> from @pureweb/platform-sdk-react
└── All UI components
```

### Interlucent Architecture
```
StreamingApp.tsx (migrated)
├── useInterlucientConnection (token + <pixel-stream>)
│   ├── status callbacks
│   └── ref to InterlucientStream
├── useTrainingMessagesComposite (adapted)
│   └── useInterlucientMessageBus (JSON format)
├── <InterlucientStream> custom component
└── All UI components (UNCHANGED)
```

---

## Testing Checklist

After migration, verify:
- [ ] Stream connects successfully
- [ ] Video displays correctly
- [ ] Mouse/keyboard input works
- [ ] Tool selection works
- [ ] Training start/pause/resume works
- [ ] Quiz questions appear
- [ ] Phase transitions work
- [ ] Camera controls work
- [ ] Explosion controls work
- [ ] Waypoint controls work
- [ ] Layer controls work
- [ ] Settings (FPS, audio, graphics) work
- [ ] Session persistence works
- [ ] Training completion works

---

## Notes

### Critical Rules (from PUREWEB_TO_INTERLUCENT_MIGRATION.md)
1. Keep BOTH implementations during transition
2. Only streaming platform changes - everything else stays EXACTLY the same
3. Use `NEXT_PUBLIC_STREAMING_PROVIDER` env variable to switch
4. Test thoroughly before production switch
5. Keep PureWeb available for 2+ weeks after switch

### Known Issue
UE5 must have JSON parser for UIInteraction messages. This is documented in `docs/UE5_INTERLUCENT_MESSAGE_PROOF.md`. If UE5 is not responding, it may need the handler updated.

---

*Last Updated: 2026-03-17*
