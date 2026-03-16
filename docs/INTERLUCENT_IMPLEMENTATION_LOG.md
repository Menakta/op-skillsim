# Interlucent Implementation Log

This document tracks all changes made during the PureWeb to Interlucent migration, issues encountered, and their solutions.

---

## Session Date: 2026-03-14

### Overview

Implementing Interlucent pixel streaming as a parallel streaming platform to PureWeb. The goal is to keep both implementations working side-by-side until Interlucent is fully tested.

---

## Changes Implemented

### 1. CDN Version Update (0.0.66 → 0.0.73)

**Files Modified:**
- `app/features/streaming/components/InterlucientStream.tsx`
- `app/interlucent-minimal/page.tsx`
- `app/types/interlucent.types.ts`
- `docs/INTERLUCENT_MIGRATION.md`

**Reason:** Interlucent support recommended v0.0.73 which includes:
- Fixed `isAdmitted` property (was accidentally made private)
- New `force-relay` attribute for bypassing DPI firewalls

### 2. Force Relay Attribute (force-turn → force-relay)

**Files Modified:**
- `app/features/streaming/components/InterlucientStream.tsx`
- `app/components/InterlucientStreamingApp.tsx`
- `app/interlucent-minimal/page.tsx`
- `app/types/interlucent.types.ts`

**Change:**
```typescript
// Before
forceTurn={true}
ps.setAttribute('force-turn', '')

// After
forceRelay={true}
ps.setAttribute('force-relay', '')
```

**Reason:** The `force-relay` attribute forces all WebRTC traffic through TURN relay over TLS (port 443), bypassing enterprise firewalls that perform deep packet inspection and kill UDP streams after ~6 seconds.

### 3. Transport Selected Event Listener

**Files Modified:**
- `app/features/streaming/components/InterlucientStream.tsx`
- `app/types/interlucent.types.ts`

**Added:**
- `onTransportSelected` callback prop
- `transport-selected` event listener
- `TransportSelectedDetail` interface

**Purpose:** Allows debugging whether connection is using RELAY (TURN) or DIRECT (P2P).

### 4. Queue/Tolerance Settings Optimization

**Files Modified:**
- `app/api/stream/interlucent-token/route.ts`
- `app/components/InterlucientStreamingApp.tsx`
- `app/interlucent-minimal/page.tsx`

**Changes:**
| Setting | Before | After |
|---------|--------|-------|
| `queueWaitTolerance` | 120s | 60s |
| `rendezvousTolerance` | 60s | 30s |
| `flexiblePresenceAllowance` | 300s | 120s |
| `lingerTolerance` | 60s | 30s |
| `webrtcNegotiationTolerance` | 30s | 15s |

**Reason:** Faster failure detection, but GPU cold start time is server-side and cannot be reduced by client settings.

### 5. Message Format Changes

**Files Modified:**
- `app/features/streaming/components/InterlucientStream.tsx`
- `app/features/messaging/hooks/useInterlucientMessageBus.ts`
- `app/types/interlucent.types.ts`

**Problem:** Interlucent `pixel-stream` only has `sendUIInteraction(json)` - no raw string method.

**Solution:** Wrap string message in JSON envelope:
```typescript
// Before (attempting complex structure)
sendUIInteraction({
  type: 'tool_select',
  data: 'XRay',
  _rawMessage: 'tool_select:XRay'
})

// After (simple envelope)
sendUIInteraction({
  message: 'tool_select:XRay'
})
```

**UE5 Requirement:** Extract `message` field from incoming JSON.

### 6. Mode Transition Controls

**Files Modified:**
- `app/components/InterlucientStreamingApp.tsx`

**Added:**
- `CinematicTimer` component
- "Start Training" button
- Mode toggle controls
- Training control handlers (`handleSkipToTraining`, `handlePauseTraining`, `handleResumeTraining`)

---

## Issues Encountered

### Issue 1: 6-Second Stream Interruption

**Symptom:**
- Stream connects successfully
- Video plays for ~6 seconds
- Connection drops
- `isAdmitted` stays `false`

**Root Cause:** Enterprise firewall/DPI blocking sustained UDP traffic after initial handshake.

**Solution:** Use `force-relay` attribute to force TURN over TLS (port 443).

**Status:** ✅ RESOLVED

---

### Issue 2: Messages Not Reaching UE5

**Symptom:**
Console shows messages being sent:
```
📤 Sending to UE (Interlucent): tool_select:XRay
📤 Sent to UE5 (Interlucent): {message: 'tool_select:XRay'}
```
But UE5 does not respond or change state.

**Current Implementation:**
```typescript
// InterlucientStream.tsx - sendStringMessage()
elementRef.current.sendUIInteraction({
  message: message  // e.g., "tool_select:XRay"
})
```

**Possible Causes:**
1. **UE5 not listening for UIInteraction messages** - May need different message channel
2. **Wrong message format** - UE5 might expect different JSON structure
3. **Data channel not actually open** - Despite `dataChannelOpen` state being true
4. **Interlucent routing issue** - Message might not reach UE5 process

**Investigation Needed:**
1. Check Interlucent documentation for correct message sending API
2. Verify UE5 Pixel Streaming plugin is configured to receive messages
3. Check if `sendCommand()` should be used instead of `sendUIInteraction()`
4. Test with Interlucent's built-in controls to see if any messages work

**Update (Session 1):**
Based on official Interlucent documentation, the correct format is:
```typescript
// Per Interlucent docs example:
// ps.sendUIInteraction({ action: 'setColor', color: '#FF5500' })

const descriptor = {
  action: action,   // e.g., 'tool_select'
  data: data,       // e.g., 'XRay'
  raw: message,     // Full string: 'tool_select:XRay'
}
```

**Key Documentation Points:**
1. `sendUIInteraction(descriptor)` - Sends JSON that UE receives as UIInteraction
2. `sendCommand(command)` - For UE 5.4+ with built-in command router
3. **Must wait for `data-channel-open` event** before sending messages
4. Messages sent before data channel is ready are **silently dropped**

**UE5 Handler Required:**
```cpp
// UE5 must have a UIInteraction handler that processes:
// { "action": "tool_select", "data": "XRay", "raw": "tool_select:XRay" }
```

**Status:** ❌ NOT WORKING

---

### Issue 2b: Root Cause Identified - Message Format Incompatibility

**Core Problem:**
- **PureWeb** sends UIInteraction as **plain string**: `"tool_select:XRay"`
- **Interlucent** sends UIInteraction as **JSON object**: `{ action: 'tool_select', data: 'XRay' }`

**Current UE5 Setup (PureWeb):**
```cpp
// UE5 receives string directly
void OnUIInteraction(const FString& Message)
{
    // Message = "tool_select:XRay"
    ParseAndHandle(Message);
}
```

**Interlucent Sends:**
```cpp
// UE5 receives JSON
void OnUIInteraction(const FString& JsonString)
{
    // JsonString = "{\"action\":\"tool_select\",\"data\":\"XRay\",\"raw\":\"tool_select:XRay\"}"
    // Need to parse JSON first, then extract the string
}
```

**Solutions:**

**Option A: Update UE5 to Handle JSON (Recommended)**
```cpp
void OnUIInteraction(const FString& Input)
{
    // Try to parse as JSON first
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Input);

    if (FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        // It's JSON - extract the "raw" field
        FString RawMessage;
        if (JsonObject->TryGetStringField("raw", RawMessage))
        {
            ProcessStringMessage(RawMessage);  // e.g., "tool_select:XRay"
        }
    }
    else
    {
        // It's a plain string (PureWeb format)
        ProcessStringMessage(Input);
    }
}
```

**Option B: Use Console Command Instead**
Interlucent's `sendCommand()` can send console commands:
```javascript
ps.sendCommand({ Console: 'MyGame.ToolSelect XRay' })
```
But this requires UE5 to have console commands registered.

**Option C: Contact Interlucent Support**
Ask if there's a way to send raw strings instead of JSON.

**Recommended Next Step:** Update UE5 to parse JSON and extract the `raw` field

---

### Issue 2c: Still No Response - Possible Causes

**Date:** 2026-03-14

Messages are being sent but UE5 is not responding at all. Possible causes:

| # | Possible Cause | How to Verify |
|---|----------------|---------------|
| 1 | **UE5 not built for Interlucent** | Check if UE5 project has Interlucent Pixel Streaming plugin enabled |
| 2 | **UE5 has no UIInteraction handler** | Check UE5 Blueprint/C++ for `OnPixelStreamingInputEvent` or similar |
| 3 | **Data channel not actually connected** | Even though `data-channel-open` fired, UE5 side may not be ready |
| 4 | **Wrong UE5 build deployed** | Interlucent may be streaming a different UE5 build than expected |
| 5 | **Interlucent app misconfigured** | App ID `d2d2uQ` may point to wrong or demo app |
| 6 | **Messages going to wrong handler** | `sendUIInteraction` vs `sendCommand` - try both |

**Simple Diagnosis:**

1. **Does UE5 respond to ANY input?**
   - Try clicking/moving in the stream
   - If mouse/keyboard works, data channel is connected
   - If not, connection issue

2. **Is this the same UE5 app as PureWeb?**
   - Check Interlucent console for app configuration
   - Verify same UE5 project is deployed to both platforms

3. **Does UE5 log anything?**
   - Check Interlucent console for UE5 logs
   - Look for "UIInteraction" or "Pixel Streaming" messages

**Quick Test - Try sendCommand:**
```javascript
// In browser console while connected:
document.querySelector('pixel-stream').sendCommand({ Console: 'stat fps' })
```
If this shows FPS stats in UE5, the data channel works but UIInteraction handler is missing.

**Most Likely Cause:**
The UE5 application deployed to Interlucent does not have a Pixel Streaming UIInteraction handler configured. This is a UE5-side issue, not a web issue.

---

### Issue 3: GPU Wait Time

**Symptom:** Long wait times (30-90 seconds) for GPU availability.

**Cause:** Cold start - no pre-warmed GPU instances.

**Partial Solution:** `swift-job-request` attribute starts GPU request during token exchange.

**Status:** ⚠️ PARTIALLY RESOLVED (server-side limitation)

---

## Next Steps

### Immediate Priority: Fix Message Passing

1. **Check Interlucent Pixel Streaming documentation** for correct message API
2. **Verify message format** - What structure does UE5 expect?
3. **Test sendCommand() vs sendUIInteraction()** - Different channels?
4. **Add more debugging** - Log actual WebRTC data channel state
5. **Contact Interlucent support** if needed

### UE5 Changes Required

For messages to work, UE5 must:

1. **Listen for UIInteraction messages** on the Pixel Streaming data channel
2. **Parse JSON** and extract the `message` field
3. **Process string** as before (e.g., `"tool_select:XRay"`)

Example UE5 handler:
```cpp
void HandleUIInteraction(const FString& JsonString)
{
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

    if (FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        FString Message;
        if (JsonObject->TryGetStringField("message", Message))
        {
            // Process Message as string (e.g., "tool_select:XRay")
            ProcessStringMessage(Message);
        }
    }
}
```

---

### Issue 4: FPS Button Not Working in Sidebar

**Symptom:** FPS button in UnifiedSidebar does nothing when clicked in `/interlucent-test` page.

**Root Cause:** InterlucientStreamingApp had placeholder empty callback functions:
```typescript
settingsCallbacks={{
  setShowFpsOverlay: () => {},  // Empty - did nothing
  // ... other empty callbacks
}}
```

**Solution:** Integrated the existing `useSettings` hook from `app/features/settings`:
```typescript
// Import useSettings hook
import { useSettings } from '../features/settings'

// Initialize settings with message bus
const settings = useSettings(messageBus.sendRawMessage, { debug: true })

// Subscribe to settings messages (fps_update, setting_applied)
useEffect(() => {
  const unsubscribe = messageBus.onMessage((message) => {
    settings.handleSettingsMessage(message)
  })
  return unsubscribe
}, [messageBus, settings])

// Connect to sidebar with real callbacks
settingsState={{
  showFpsOverlay: settings.settings.showFpsOverlay,
  currentFps: settings.settings.currentFps,
  // ... all other settings
}}
settingsCallbacks={{
  setShowFpsOverlay: settings.setShowFpsOverlay,
  // ... all other callbacks
}}
```

**How FPS Works:**
1. User clicks FPS button → `setShowFpsOverlay(true)` called
2. Hook sends `fps_tracking:start` message to UE5 via `sendRawMessage`
3. UE5 responds with `fps_update:60.5` messages
4. Hook processes via `handleSettingsMessage` → updates `currentFps` state
5. Sidebar displays the FPS value

**Note:** This will only show real FPS when UE5 is properly responding to messages. Currently, messages are being sent but UE5 is not responding (see Issue 2).

**Status:** ✅ UI FIXED (but depends on UE5 message handling - Issue 2)

---

### Issue 5: Message Format Testing Panel Added

**Date:** 2026-03-14

**Problem:** We're sending JSON but don't know which format UE5 expects.

**Solution:** Added a debug panel to `/interlucent-test` page that tests different message formats:

| Format | JSON Sent | When to Use |
|--------|-----------|-------------|
| Descriptor | `{ "Descriptor": "tool_select:XRay" }` | Standard Pixel Streaming |
| Command | `{ "Cmd": "tool_select", "Data": "XRay" }` | UE 5.4+ command router |
| Raw | `{ "message": "tool_select:XRay" }` | Simple wrapper |

**How to Test:**
1. Go to `/interlucent-test` and connect to stream
2. Click each format button in the debug panel (top-left)
3. Watch browser console for sent message
4. Check if UE5 responds (tool changes, FPS updates, etc.)
5. Whichever format works → update `sendStringMessage()` to use that format

**Added Methods:**
```typescript
// InterlucientStreamRef now has:
sendStringMessageAlt(message: string, format: 'descriptor' | 'command' | 'raw')
```

**Current Default:** `{ "Descriptor": "tool_select:XRay" }`

**Status:** 🧪 TESTING REQUIRED

---

## Files Summary

### Modified Files
| File | Changes |
|------|---------|
| `InterlucientStream.tsx` | CDN v0.0.73, force-relay, transport-selected, sendStringMessage |
| `useInterlucientMessageBus.ts` | extractStringMessage(), message format handling |
| `InterlucientStreamingApp.tsx` | Mode controls, CinematicTimer, training handlers, useSettings integration |
| `interlucent.types.ts` | TransportSelectedDetail, forceRelay, documentation |
| `interlucent-minimal/page.tsx` | CDN update, force-relay, transport-selected |
| `interlucent-token/route.ts` | Tolerance settings |
| `INTERLUCENT_MIGRATION.md` | CDN references |
| `PUREWEB_TO_INTERLUCENT_MIGRATION.md` | Created - full migration guide |

### New Files
| File | Purpose |
|------|---------|
| `PUREWEB_TO_INTERLUCENT_MIGRATION.md` | Comprehensive migration documentation |
| `INTERLUCENT_IMPLEMENTATION_LOG.md` | This file - implementation log |

---

## Configuration Reference

### Environment Variables (Interlucent)
```env
INTERLUCENT_SECRET_KEY=sk-il-proj-w43wgQ-...
NEXT_PUBLIC_INTERLUCENT_APP_ID=d2d2uQ
NEXT_PUBLIC_INTERLUCENT_APP_VERSION=dmo
NEXT_PUBLIC_STREAMING_PROVIDER=interlucent
```

### CDN URL
```
https://cdn.interlucent.ai/dev/pixel-stream/0.0.73/pixel-stream.iife.min.js
```

### Test Pages
- `/interlucent-minimal` - Basic test page
- `/interlucent-test` - Full test with controls

---

## Key Principles (Do Not Forget)

1. **KEEP BOTH IMPLEMENTATIONS** - PureWeb and Interlucent side-by-side
2. **STREAMING ONLY** - Only streaming platform changes, auth/LTI/RBAC unchanged
3. **TEST THOROUGHLY** - All features must work before production switch
4. **2 WEEK MINIMUM** - Keep PureWeb available after switch

---

*Last Updated: 2026-03-14*
