# Interlucent Pixel Streaming Migration Guide

This document outlines the migration from PureWeb SDK to Interlucent for Pixel Streaming in the OP SkillSim application.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Part 1 — Your First Stream](#part-1--your-first-stream)
- [Part 2 — Configuring Your Stream](#part-2--configuring-your-stream)
- [Part 3 — Building a Custom Overlay](#part-3--building-a-custom-overlay)
- [Part 4 — Driving It from JavaScript](#part-4--driving-it-from-javascript)
- [Part 5 — Listening for Messages from the Game](#part-5--listening-for-messages-from-the-game)
- [Part 6 — Talking to the Game](#part-6--talking-to-the-game)
- [Part 7 — The Full Picture](#part-7--the-full-picture)
- [Quick Reference](#quick-reference)
- [Timing & Resilience](#timing--resilience)
- [SDK Reference](#sdk-reference)
- [Network Whitelisting](#network-whitelisting)
- [PureWeb vs Interlucent: Detailed Comparison](#pureweb-vs-interlucent-detailed-comparison)

---

## Getting Started

### What is Interlucent

Interlucent connects your GPU-rendered applications to end users in the browser via low-latency WebRTC streams. You upload an application, configure how sessions behave, and the platform handles connection setup and media delivery — from server to screen.

The system operates through **admission tokens** — signed JWTs that declare the maximum scope of what a session participant is permitted to do. At connection time, the platform validates, refines, and enforces these constraints.

### Quickstart

The fastest path to a live stream is a single HTML element. Pass an admission token and the component handles the rest.

```html
<!-- quickstart.html -->
<pixel-stream controls></pixel-stream>

<script src="https://cdn.interlucent.ai/dev/pixel-stream/0.0.57/pixel-stream.iife.min.js"></script>
<script>
  const ps = document.querySelector('pixel-stream');
  ps.admissionToken = 'YOUR_TOKEN';
</script>
```

> Ready to go deeper? The Streaming Guide (Parts 1-7 below) walks you through everything from this one-line embed to custom overlays and bidirectional messaging.

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Project** | A container for applications, profiles, and configuration. Each project belongs to an organization and has its own signing keys. |
| **Application** | A versioned binary artifact (game, 3D experience, simulation) uploaded to the platform. Applications are deployed to GPU workers and streamed to browsers. |
| **Session** | A live connection between a browser and a GPU worker. Sessions carry video, audio, and data channels over WebRTC. |
| **Admission Token** | A signed JWT created by your backend that declares what a session is allowed to do — which application to stream, how long to wait, and how resilient the connection should be. |
| **Streaming** | The real-time delivery of video, audio, and input between the browser and the GPU worker. Powered by WebRTC with built-in reconnection and recovery. |
| **`<pixel-stream>`** | Web component that handles all streaming UI and WebRTC connection. |
| **GPU Worker** | Server-side instance running your Unreal Engine application. |

### How It Works

The connection flow follows four steps from your backend to the browser:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   1. CREATE     │     │   2. CONNECT    │     │   3. MATCH      │     │   4. STREAM     │
│   ADMISSION     │────▶│   Browser to    │────▶│   GPU Worker    │────▶│   WebRTC P2P    │
│   TOKEN         │     │   Platform      │     │   Provisioned   │     │   Connection    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
     Backend                 Browser               Platform               Direct P2P
```

| Step | Description |
|------|-------------|
| **1. Create an admission token** | Your backend uses the SDK to sign a token declaring the application, tolerances, and tracking reference. |
| **2. Connect** | The browser passes the admission token to the `<pixel-stream>` component. The platform automatically validates the token, resolves the application version, and establishes a session. |
| **3. Match a GPU worker** | The platform provisions a GPU worker for your session and brokers the WebRTC connection between the browser and the worker. |
| **4. Stream** | Video, audio, and data flow directly between the worker and browser over a peer-to-peer WebRTC connection. The platform monitors session health and enforces tolerance timers. |

> **Tip:** The Swift Job Request flag (`swift-job-request` or `sjr`) submits the GPU worker request during token exchange, shaving one round-trip off the connection flow.

### Interlucent vs PureWeb Comparison

| Aspect | PureWeb | Interlucent |
|--------|---------|-------------|
| **Authentication** | Project ID + Model ID + Agent Token | Single Admission Token (JWT) |
| **Component** | React `<VideoStream>` + custom hooks | Web Component `<pixel-stream>` |
| **Setup Complexity** | ~500 lines of initialization code | ~5 lines |
| **Warm Pool** | Manual implementation required | Built-in (`swift-job-request`) |
| **Message Format** | String-based (`"type:data"`) | JSON objects |
| **Status Tracking** | Manual via `StreamerStatus` enum | CSS attribute + `status-change` event |
| **Reconnection** | Custom implementation | Built-in attributes |

---

## Part 1 — Your First Stream

The fastest way to get a live stream running. Load the component from a CDN, pass an admission token, and let the built-in controls handle the rest. No bundler, no framework — just a script tag and an HTML element.

### Basic Implementation

```html
<!-- minimal.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pixel Stream</title>
  <style>
    body { margin: 0; background: #000; }
    pixel-stream { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <pixel-stream controls></pixel-stream>

  <script src="https://cdn.interlucent.ai/dev/pixel-stream/0.0.57/pixel-stream.iife.min.js"></script>
  <script>
    const ps = document.querySelector('pixel-stream');
    ps.admissionToken = 'YOUR_TOKEN';
  </script>
</body>
</html>
```

### Key Points

| Feature | Description |
|---------|-------------|
| **CDN Script** | `https://cdn.interlucent.ai/dev/pixel-stream/0.0.57/pixel-stream.iife.min.js` |
| **Web Component** | `<pixel-stream>` - Custom HTML element |
| **Controls Attribute** | `controls` - Enables built-in overlay UI |
| **Admission Token** | Set via `ps.admissionToken` property |

### Built-in Features

The `<pixel-stream>` component with `controls` attribute automatically provides:

- **Play button** - Initial interaction to start stream
- **Loading spinner** - Visual feedback while session starts
- **Autoplay handling** - Gracefully handles browser autoplay restrictions

### Token Generation

The `admissionToken` must be generated server-side using the Interlucent SDK and passed to your frontend. See SDK Reference for implementation details.

> **Tip:** Replace `YOUR_TOKEN` with an admission token generated server-side using the SDK.

---

## Migration Mapping: PureWeb → Interlucent

### Current PureWeb Implementation

```typescript
// PureWeb approach
import { PlatformNext, StreamerStatus } from "@pureweb/platform-sdk"
import { VideoStream, useStreamer, useLaunchRequest } from "@pureweb/platform-sdk-react"

// Complex initialization with platform, models, launch requests
const platform = new PlatformNext()
await platform.launchRequestAccess()
const models = await platform.getModels()
// ... queue launch, handle streamer status, etc.
```

### New Interlucent Approach

```typescript
// Interlucent approach - dramatically simpler
const ps = document.querySelector('pixel-stream');
ps.admissionToken = 'YOUR_TOKEN';
// That's it!
```

### Key Differences

| Aspect | PureWeb | Interlucent |
|--------|---------|-------------|
| **Component** | React `<VideoStream>` | Web Component `<pixel-stream>` |
| **Setup** | Multiple SDK imports, hooks, platform init | Single script tag + token |
| **Controls** | Custom implementation required | Built-in with `controls` attribute |
| **Autoplay** | Manual handling in app | Automatic |
| **Authentication** | Project ID, Model ID, Agent Token | Single Admission Token |

---

## Part 2 — Configuring Your Stream

Now that you have a stream running, let's customize it. Every aspect of session behaviour is controlled through HTML attributes. Here's a more deliberate configuration that specifies tolerances, reconnection strategy, and a specific application version.

### Configured Implementation

```html
<!-- configured.html -->
<pixel-stream controls
  api-endpoint="api.interlucent.ai"
  app-id="PFfFuw"
  app-version="MrM"
  reconnect-mode="recover"
  reconnect-attempts="-1"
  reconnect-strategy="exponential-backoff"
  queue-wait-tolerance="45"
  webrtc-negotiation-tolerance="10"
  swift-job-request
></pixel-stream>

<script src="https://cdn.interlucent.ai/dev/pixel-stream/0.0.57/pixel-stream.iife.min.js"></script>
<script>
  const ps = document.querySelector('pixel-stream');
  ps.admissionToken = 'YOUR_TOKEN';
</script>
```

### Configuration Attributes Reference

| Attribute | Description | Default |
|-----------|-------------|---------|
| `api-endpoint` | The Interlucent API host. Only set if using a custom deployment. | `api.interlucent.ai` |
| `app-id` | Your application identifier | Required |
| `app-version` | Specific application version to stream | Latest |
| `reconnect-mode` | Reconnection behavior (see below) | `none` |
| `reconnect-attempts` | Number of reconnection attempts. `-1` for unlimited | `0` |
| `reconnect-strategy` | Strategy for retry timing | — |
| `queue-wait-tolerance` | Seconds to wait for GPU worker availability | — |
| `webrtc-negotiation-tolerance` | Seconds to wait for WebRTC negotiation | — |
| `swift-job-request` | Boolean attribute - sends GPU job request early | `false` |

### Reconnect Modes

| Mode | Behavior |
|------|----------|
| `none` | Do not reconnect |
| `recover` | Attempt to rejoin the same session |
| `always` | Start a new session if recovery fails |

### Performance Optimization

#### `swift-job-request`

Adding this attribute sends the GPU job request during the token exchange rather than waiting for the session WebSocket to open. This saves **200–400 ms on cold starts**.

```html
<!-- Enable swift job request for faster cold starts -->
<pixel-stream controls swift-job-request></pixel-stream>
```

#### `queue-wait-tolerance`

Set this based on your expected fleet utilisation. If a GPU worker doesn't become available within this timeframe (in seconds), the session is considered failed.

```html
<!-- Wait up to 45 seconds for GPU worker -->
<pixel-stream controls queue-wait-tolerance="45"></pixel-stream>
```

### Migration Mapping: Reconnection

| PureWeb | Interlucent |
|---------|-------------|
| Custom retry logic in `useStreamConnection.ts` | `reconnect-mode="recover"` |
| `maxRetries = 3` with 2s delays | `reconnect-attempts="-1"` (unlimited) |
| Manual exponential backoff | `reconnect-strategy="exponential-backoff"` |
| Warm pool for fast startup | `swift-job-request` attribute |

### Current PureWeb Config (for reference)

```typescript
// From useStreamConnection.ts
const retryConfig = {
  maxRetries: 3,
  retryDelay: 2000,  // 2 seconds
}
```

### Equivalent Interlucent Config

```html
<pixel-stream controls
  reconnect-mode="recover"
  reconnect-attempts="3"
  reconnect-strategy="exponential-backoff"
></pixel-stream>
```

---

## Part 3 — Building a Custom Overlay

The default controls are great for prototyping, but most production embeds need branded UI. The component exposes an **overlay slot** that replaces the built-in controls entirely. You drive the UI by reacting to the component's `status` attribute, which stays in sync with the session lifecycle.

> **Note:** All attributes map to JavaScript properties using camelCase. For example, `reconnect-mode` is accessible as `el.reconnectMode` and `queue-wait-tolerance` as `el.queueWaitTolerance`.

### Custom Overlay Implementation

```html
<!-- custom-overlay.html -->
<pixel-stream id="ps">
  <div slot="overlay" class="overlay">

    <!-- Idle: show a branded play button -->
    <div class="state state-idle">
      <h2>Ready to Launch</h2>
      <button onclick="document.getElementById('ps').play()">
        Start Experience
      </button>
    </div>

    <!-- Queued / negotiating: show a loading state -->
    <div class="state state-pending">
      <div class="spinner"></div>
      <p>Preparing your session&hellip;</p>
      <button onclick="document.getElementById('ps').cancel()">
        Cancel
      </button>
    </div>

    <!-- Autoplay blocked: user gesture needed -->
    <div class="state state-ready">
      <button onclick="document.getElementById('ps').play()">
        Resume
      </button>
    </div>

    <!-- Error: offer retry -->
    <div class="state state-error">
      <p>Something went wrong.</p>
      <button onclick="document.getElementById('ps').play()">
        Try Again
      </button>
    </div>

  </div>
</pixel-stream>
```

### Session Lifecycle Status Values

The `<pixel-stream>` element sets a `status` attribute on itself as the session progresses through its lifecycle:

| Status | Description |
|--------|-------------|
| `idle` | Initial state, ready to start |
| `connecting` | Establishing connection |
| `authenticating` | Validating admission token |
| `connected` | Connected to server |
| `queued` | Waiting for GPU worker |
| `rendezvoused` | Matched with GPU worker |
| `negotiating` | WebRTC negotiation in progress |
| `streaming` | Stream is active and playing |
| `ready` | Stream ready but autoplay blocked |
| `failed` | Session failed |
| `ended` | Session ended |

### CSS State Management

Use CSS attribute selectors to show and hide your overlay states:

```css
/* overlay-states.css */

/* Hide all states by default */
.state { display: none; }

/* Show the right state based on the component's status */
pixel-stream[status="idle"]            .state-idle,
pixel-stream[status="connected"]       .state-idle    { display: flex; }

pixel-stream[status="connecting"]      .state-pending,
pixel-stream[status="authenticating"]  .state-pending,
pixel-stream[status="queued"]          .state-pending,
pixel-stream[status="rendezvoused"]    .state-pending,
pixel-stream[status="negotiating"]     .state-pending { display: flex; }

pixel-stream[status="ready"]           .state-ready   { display: flex; }
pixel-stream[status="failed"]          .state-error   { display: flex; }
pixel-stream[status="ended"]           .state-error   { display: flex; }

/* Hide overlay during streaming */
pixel-stream[status="streaming"]       .overlay { display: none; }
```

### Component Methods

| Method | Description |
|--------|-------------|
| `play()` | Start or resume the stream |
| `cancel()` | Cancel a pending connection |
| `stop()` | Stop the current session |

### Important Notes

> **Tip:** When a slotted overlay is present, the component's built-in controls are **fully replaced** and the overlay container remains visible at all times — including during streaming. Your overlay takes responsibility for:
> - Calling `play()`, `cancel()`, and `stop()` at the appropriate times
> - Hiding itself during streaming via CSS (e.g., `pixel-stream[status="streaming"] .overlay { display: none }`)

### Migration Mapping: Overlay States

| PureWeb (Current) | Interlucent Status |
|-------------------|-------------------|
| `StreamerStatus.Disconnected` | `idle` |
| `StreamerStatus.Connecting` | `connecting`, `authenticating` |
| `StreamerStatus.Pending` | `queued`, `rendezvoused` |
| `StreamerStatus.Negotiating` | `negotiating` |
| `StreamerStatus.Connected` | `streaming` |
| `StreamerStatus.Failed` | `failed` |
| Autoplay blocked state | `ready` |

### Current PureWeb Overlay (for reference)

```typescript
// From StreamingApp.tsx - current status handling
const [connectionStatus, setConnectionStatus] = useState<
  'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'
>('initializing');

// Custom loading overlay, error modals, etc.
{connectionStatus === 'connecting' && <LoadingOverlay />}
{connectionStatus === 'failed' && <ErrorModal />}
```

### Equivalent Interlucent Approach

```html
<!-- Status-driven CSS replaces React state management -->
<pixel-stream id="ps">
  <div slot="overlay" class="overlay">
    <div class="state state-idle"><!-- Idle UI --></div>
    <div class="state state-pending"><!-- Loading UI --></div>
    <div class="state state-error"><!-- Error UI --></div>
  </div>
</pixel-stream>

<style>
  /* CSS handles all visibility logic */
  pixel-stream[status="idle"] .state-idle { display: flex; }
  pixel-stream[status="queued"] .state-pending { display: flex; }
  pixel-stream[status="failed"] .state-error { display: flex; }
</style>
```

---

## Part 4 — Driving It from JavaScript

Your overlay looks great — now let's go deeper. For richer integrations — React wrappers, multi-step flows, or analytics — you'll want to drive the component from JavaScript. Every attribute has a corresponding property, and the session lifecycle methods are available directly on the element.

### Programmatic Control

```javascript
// programmatic.js
const ps = document.querySelector('pixel-stream');

// Set the admission token (generated server-side via the SDK)
ps.admissionToken = token;  // token for app PFfFuw, version MrM
ps.reconnectMode = 'recover';
ps.reconnectAttempts = -1; // unlimited

// Start streaming — connects the session and requests a GPU worker.
// The component auto-connects when admissionToken is set, so play()
// just sends the job request. If using no-auto-connect, play()
// starts the session first.
await ps.play();

// Stop gracefully
ps.stop('user-navigated-away');
```

### Read-Only State Properties

You can inspect the component's read-only state at any time:

```javascript
console.log(ps.status);              // 'streaming', 'queued', etc.
console.log(ps.sessionId);           // current session ID
console.log(ps.agentId);             // your agent ID in this session
console.log(ps.isAdmitted);          // true once token exchange succeeds
console.log(ps.failureReason);       // null, or a description of the failure
console.log(ps.streamStartedAt);     // timestamp (ms) when streaming began, or 0
console.log(ps.lastUserInteraction); // timestamp of last user input (seeded at stream start)
```

### Properties Reference

#### Writable Properties

| Property | Type | Description |
|----------|------|-------------|
| `admissionToken` | `string` | Server-generated admission token |
| `reconnectMode` | `'none' \| 'recover' \| 'always'` | Reconnection behavior |
| `reconnectAttempts` | `number` | Number of retry attempts (-1 = unlimited) |
| `reconnectStrategy` | `string` | Retry timing strategy |
| `queueWaitTolerance` | `number` | Seconds to wait for GPU |
| `webrtcNegotiationTolerance` | `number` | Seconds for WebRTC negotiation |

#### Read-Only Properties

| Property | Type | Description |
|----------|------|-------------|
| `status` | `string` | Current session status |
| `sessionId` | `string` | Current session identifier |
| `agentId` | `string` | Your agent ID in this session |
| `isAdmitted` | `boolean` | `true` once token exchange succeeds |
| `failureReason` | `string \| null` | Description of failure, or `null` |
| `streamStartedAt` | `number` | Timestamp (ms) when streaming began, or `0` |
| `lastUserInteraction` | `number` | Timestamp of last user input |

### Methods Reference

| Method | Returns | Description |
|--------|---------|-------------|
| `play()` | `Promise<void>` | Start or resume the stream |
| `cancel()` | `void` | Cancel a pending connection |
| `stop(reason?)` | `void` | Stop the session with optional reason |

### Migration Mapping: JavaScript Control

| PureWeb (Current) | Interlucent |
|-------------------|-------------|
| `platform.launchRequestAccess()` | `ps.admissionToken = token` |
| `queueLaunchRequest()` | `await ps.play()` |
| `streamer.status` | `ps.status` |
| Custom session ID tracking | `ps.sessionId` |
| Manual failure handling | `ps.failureReason` |
| `stream.close()` | `ps.stop('reason')` |

### Current PureWeb Implementation (for reference)

```typescript
// From useStreamConnection.ts
const initializePlatform = async (attempt: number) => {
  const platform = new PlatformNext();
  await platform.launchRequestAccess();
  const models = await platform.getModels();
  // ... complex model selection, ICE server extraction, etc.
};

// From StreamingApp.tsx
const { queueLaunchRequest } = useLaunchRequest(platform, modelDefinition);
const { streamer, emitter, videoStream } = useStreamer(launchRequest, streamerOptions);

// Check status
if (streamer.status === StreamerStatus.Connected) {
  // Stream is ready
}
```

### Equivalent Interlucent Implementation

```typescript
// Much simpler programmatic control
const ps = document.querySelector('pixel-stream') as HTMLElement & {
  admissionToken: string;
  reconnectMode: string;
  reconnectAttempts: number;
  status: string;
  sessionId: string;
  isAdmitted: boolean;
  failureReason: string | null;
  play(): Promise<void>;
  stop(reason?: string): void;
};

// Initialize
ps.admissionToken = await fetchAdmissionToken(); // from your API
ps.reconnectMode = 'recover';
ps.reconnectAttempts = -1;

// Start streaming
await ps.play();

// Check status
if (ps.status === 'streaming') {
  console.log('Stream ready, session:', ps.sessionId);
}

// Stop when done
ps.stop('user-navigated-away');
```

### React Integration Example

```tsx
// components/PixelStreamWrapper.tsx
import { useEffect, useRef, useState } from 'react';

interface PixelStreamElement extends HTMLElement {
  admissionToken: string;
  reconnectMode: string;
  status: string;
  sessionId: string;
  isAdmitted: boolean;
  failureReason: string | null;
  play(): Promise<void>;
  stop(reason?: string): void;
}

export function PixelStreamWrapper({ token }: { token: string }) {
  const ref = useRef<PixelStreamElement>(null);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const ps = ref.current;
    if (!ps) return;

    ps.admissionToken = token;
    ps.reconnectMode = 'recover';

    // Watch for status changes via MutationObserver
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'status') {
          setStatus(ps.status);
        }
      });
    });

    observer.observe(ps, { attributes: true });

    return () => observer.disconnect();
  }, [token]);

  return (
    <pixel-stream ref={ref as any}>
      {/* Custom overlay content */}
    </pixel-stream>
  );
}
```

---

## Part 5 — Listening for Messages from the Game

The Unreal Engine application can send structured messages back to the browser through the WebRTC data channel. These arrive as **DOM events** on the `<pixel-stream>` element. The two most common patterns are command responses and echo tests.

### Command Responses

When UE processes a Command or Response message and sends a reply, it arrives as a `ue-command-response` event. The payload is whatever JSON the UE application serialized.

```javascript
// receiving-responses.js
const ps = document.querySelector('pixel-stream');

ps.addEventListener('ue-command-response', (event) => {
  const data = event.detail;
  console.log('UE responded:', data);

  // Example: the game sends back a configuration result
  // { "status": "ok", "selectedColor": "#FF5500" }
  if (data.status === 'ok') {
    updateUI(data);
  }
});
```

### Lifecycle Events

Beyond game messages, the component dispatches events for every stage of the connection. Here are the most useful ones for building reactive UI.

```javascript
// lifecycle-events.js

// The derived status changed (idle → queued → streaming → …)
ps.addEventListener('status-change', (e) => {
  console.log('Status:', e.detail.newStatus);
  console.log('Previous:', e.detail.oldStatus);
});
```

### Status Values Reference

The `status` property (and the matching HTML attribute) is a single derived value that combines session state, job state, and stream state into one progression. These are all the possible values, in typical order:

| Status | Description |
|--------|-------------|
| `idle` | Initial state. No session has been started yet. |
| `connecting` | The session WebSocket is being opened, or the component is reconnecting after a drop. |
| `authenticating` | The admission token is being exchanged and verified. This is the step between the WebSocket handshake and full session readiness. |
| `connected` | The session WebSocket is authenticated and ready. The built-in overlay shows a play button here. Call `play()` to request a GPU worker, or the built-in controls will do it for you. |
| `queued` | A GPU worker has been requested and the session is waiting for a GPU worker to become available. Duration depends on fleet availability and your `queue-wait-tolerance`. |
| `rendezvoused` | A GPU worker has been matched to this session. The two peers are about to begin WebRTC negotiation. |
| `negotiating` | WebRTC connection negotiation is in progress — connection paths are being tested and the best route is being selected. |
| `streaming` | Video frames are flowing and the data channel is open. This is the main interactive state — the user is seeing and interacting with the application. |
| `ready` | The stream is available but playback was blocked by the browser's autoplay policy. A user gesture is needed — call `play()` from a click handler. |
| `interrupted` | The media pipeline stalled (e.g. network congestion dropped tracks) but the session WebSocket is still alive. The component will attempt recovery automatically. |
| `recovering` | Active media recovery is in progress — re-subscribing to the streamer and re-establishing the connection. |
| `failed` | A terminal state. The session could not be established or recovery was exhausted. Check `failureReason` for details. Calling `play()` automatically clears the error state and starts a new attempt. |
| `ended` | A terminal state. The session concluded gracefully — either the user left, the server shut down, or the linger timeout expired. |

> **Tip:** The typical happy-path progression is: `idle` → `connecting` → `authenticating` → `connected` → `queued` → `rendezvoused` → `negotiating` → `streaming`. The `ready` state only appears when the browser blocks autoplay.

### Migration Mapping: Message Listening

| PureWeb (Current) | Interlucent |
|-------------------|-------------|
| `messageSubject.subscribe((raw) => ...)` | `ps.addEventListener('ue-command-response', ...)` |
| RxJS Subject pattern | Native DOM events |
| Custom message parsing | `event.detail` contains parsed JSON |
| Manual status tracking | `status-change` event with `newStatus`/`oldStatus` |

### Current PureWeb Implementation (for reference)

```typescript
// From useMessageBus.ts - current message receiving
import { Subject } from 'rxjs';

// Subscribe to messages from UE5
messageSubject.subscribe((raw: string) => {
  // Parse "type:data" format manually
  const [type, ...dataParts] = raw.split(':');
  const data = dataParts.join(':');

  // Handle different message types
  switch (type) {
    case 'training_progress':
      handleTrainingProgress(data);
      break;
    case 'question_request':
      handleQuestionRequest(data);
      break;
    // ... etc
  }
});

// From useStreamConnection.ts - status changes
useEffect(() => {
  if (streamer.status === StreamerStatus.Connected) {
    setConnectionStatus('connected');
    onConnected?.(isFirstConnection);
  } else if (streamer.status === StreamerStatus.Failed) {
    setConnectionStatus('failed');
    onError?.(new Error('Stream connection failed'));
  }
}, [streamer.status]);
```

### Equivalent Interlucent Implementation

```typescript
// Simplified event-based message handling
const ps = document.querySelector('pixel-stream');

// Listen for UE5 messages
ps.addEventListener('ue-command-response', (event) => {
  const data = event.detail;

  // Messages arrive as parsed JSON - no manual parsing needed
  // Assuming UE sends: { type: 'training_progress', progress: 50, taskName: '...' }
  switch (data.type) {
    case 'training_progress':
      handleTrainingProgress(data);
      break;
    case 'question_request':
      handleQuestionRequest(data);
      break;
  }
});

// Listen for status changes
ps.addEventListener('status-change', (e) => {
  const { newStatus, oldStatus } = e.detail;

  if (newStatus === 'streaming') {
    onConnected?.();
  } else if (newStatus === 'failed') {
    onError?.(new Error(ps.failureReason || 'Stream connection failed'));
  }
});
```

### React Hook Example for Message Handling

```tsx
// hooks/usePixelStreamMessages.ts
import { useEffect, useCallback } from 'react';

interface UEMessage {
  type: string;
  [key: string]: any;
}

export function usePixelStreamMessages(
  psRef: React.RefObject<HTMLElement>,
  onMessage: (data: UEMessage) => void
) {
  useEffect(() => {
    const ps = psRef.current;
    if (!ps) return;

    const handleResponse = (event: CustomEvent) => {
      onMessage(event.detail);
    };

    ps.addEventListener('ue-command-response', handleResponse as EventListener);
    return () => {
      ps.removeEventListener('ue-command-response', handleResponse as EventListener);
    };
  }, [psRef, onMessage]);
}

// Usage
function StreamingApp() {
  const psRef = useRef<HTMLElement>(null);

  const handleUEMessage = useCallback((data: UEMessage) => {
    switch (data.type) {
      case 'training_progress':
        setProgress(data.progress);
        break;
      case 'question_request':
        setCurrentQuestion(data.questionId);
        break;
    }
  }, []);

  usePixelStreamMessages(psRef, handleUEMessage);

  return <pixel-stream ref={psRef as any} />;
}
```

### Event Types Summary

| Event | `event.detail` | Description |
|-------|----------------|-------------|
| `ue-command-response` | `any` (JSON from UE) | Message received from Unreal Engine |
| `status-change` | `{ newStatus, oldStatus }` | Session status transition |

---

## Part 6 — Talking to the Game

Once the data channel is open, you can send structured messages to the Unreal Engine application. There are several message types, each suited to a different integration pattern.

### UI Interactions

The most common message type. Send a JSON descriptor that UE receives as a `UIInteraction`. Use this for application-level commands like changing colours, selecting options, or triggering animations.

```javascript
// ui-interaction.js

// Wait for the data channel to be ready
ps.addEventListener('data-channel-open', () => {

  // Send a colour change to the game
  ps.sendUIInteraction({
    action: 'setColor',
    target: 'car-body',
    color: '#FF5500'
  });

  // Send a camera angle request
  ps.sendUIInteraction({
    action: 'setCamera',
    preset: 'front-quarter'
  });
});
```

### Commands (UE 5.4+)

For Unreal Engine 5.4 and later, use the Command message type. These are handled by UE's built-in command router and support structured key-value payloads.

```javascript
// Set the viewport resolution
ps.sendCommand({
  'Resolution.Width': 1920,
  'Resolution.Height': 1080
});

// Execute a console command
ps.sendCommand({
  'Console': 'stat fps'
});
```

> **Warning:** Always wait for the `data-channel-open` event before sending messages. Calls made before the data channel is ready will be silently dropped.

### Methods for Sending Messages

| Method | UE Handler | Use Case |
|--------|------------|----------|
| `sendUIInteraction(payload)` | `UIInteraction` | Application-level commands (most common) |
| `sendCommand(payload)` | Command Router (UE 5.4+) | System-level commands, console commands |

### Migration Mapping: Sending Messages

| PureWeb (Current) | Interlucent |
|-------------------|-------------|
| `emitter.EmitUIInteraction(message)` | `ps.sendUIInteraction(payload)` |
| String format: `"type:data"` | JSON object format |
| No built-in command support | `ps.sendCommand()` for UE 5.4+ |
| Manual connection checking | `data-channel-open` event |

### Current PureWeb Implementation (for reference)

```typescript
// From useMessageBus.ts - current message sending
const sendMessage = useCallback((type: string, data?: string) => {
  if (!emitter) {
    console.warn('Cannot send message: emitter not available');
    return;
  }

  // Format: "type:data"
  const message = data ? `${type}:${data}` : type;
  emitter.EmitUIInteraction(message);

  // Log the message
  addToLog('sent', message);
}, [emitter, addToLog]);

// Usage examples from the app:
sendMessage('training_control', 'start');
sendMessage('tool_select', 'XRay');
sendMessage('camera_control', 'IsometricNE');
sendMessage('explosion_control', '50');
sendMessage('question_answer', 'Q1:1:true');
```

### Equivalent Interlucent Implementation

```typescript
// Using sendUIInteraction with JSON payloads
const ps = document.querySelector('pixel-stream');

// Wait for data channel
ps.addEventListener('data-channel-open', () => {
  console.log('Data channel ready - can now send messages');
});

// Training control
ps.sendUIInteraction({
  type: 'training_control',
  action: 'start'
});

// Tool selection
ps.sendUIInteraction({
  type: 'tool_select',
  tool: 'XRay'
});

// Camera control
ps.sendUIInteraction({
  type: 'camera_control',
  preset: 'IsometricNE'
});

// Explosion control
ps.sendUIInteraction({
  type: 'explosion_control',
  level: 50
});

// Question answer
ps.sendUIInteraction({
  type: 'question_answer',
  questionId: 'Q1',
  tryCount: 1,
  isCorrect: true
});
```

### Message Format Comparison

| Action | PureWeb Format | Interlucent Format |
|--------|----------------|-------------------|
| Start training | `"training_control:start"` | `{ type: 'training_control', action: 'start' }` |
| Select tool | `"tool_select:XRay"` | `{ type: 'tool_select', tool: 'XRay' }` |
| Set camera | `"camera_control:Front"` | `{ type: 'camera_control', preset: 'Front' }` |
| Explosion level | `"explosion_control:50"` | `{ type: 'explosion_control', level: 50 }` |
| Answer question | `"question_answer:Q1:1:true"` | `{ type: 'question_answer', questionId: 'Q1', tryCount: 1, isCorrect: true }` |

### React Hook Example for Sending Messages

```tsx
// hooks/usePixelStreamCommands.ts
import { useCallback, useRef, useEffect, useState } from 'react';

interface PixelStreamElement extends HTMLElement {
  sendUIInteraction(payload: Record<string, any>): void;
  sendCommand(payload: Record<string, any>): void;
}

export function usePixelStreamCommands(psRef: React.RefObject<PixelStreamElement>) {
  const [isDataChannelOpen, setIsDataChannelOpen] = useState(false);
  const pendingMessages = useRef<Array<Record<string, any>>>([]);

  useEffect(() => {
    const ps = psRef.current;
    if (!ps) return;

    const handleOpen = () => {
      setIsDataChannelOpen(true);
      // Send any pending messages
      pendingMessages.current.forEach(msg => ps.sendUIInteraction(msg));
      pendingMessages.current = [];
    };

    ps.addEventListener('data-channel-open', handleOpen);
    return () => ps.removeEventListener('data-channel-open', handleOpen);
  }, [psRef]);

  const sendMessage = useCallback((payload: Record<string, any>) => {
    const ps = psRef.current;
    if (!ps) return;

    if (isDataChannelOpen) {
      ps.sendUIInteraction(payload);
    } else {
      // Queue message until data channel opens
      pendingMessages.current.push(payload);
    }
  }, [psRef, isDataChannelOpen]);

  return { sendMessage, isDataChannelOpen };
}

// Usage in component
function StreamingApp() {
  const psRef = useRef<PixelStreamElement>(null);
  const { sendMessage, isDataChannelOpen } = usePixelStreamCommands(psRef);

  const startTraining = () => {
    sendMessage({ type: 'training_control', action: 'start' });
  };

  const selectTool = (tool: string) => {
    sendMessage({ type: 'tool_select', tool });
  };

  return (
    <>
      <pixel-stream ref={psRef as any} />
      <button onClick={startTraining} disabled={!isDataChannelOpen}>
        Start Training
      </button>
    </>
  );
}
```

### Migrating useMessageBus to Interlucent

```typescript
// New useMessageBus hook for Interlucent
import { useCallback, useEffect, useState, useRef } from 'react';

interface ParsedMessage {
  type: string;
  data: any;
  raw: string;
}

export function useMessageBus(psRef: React.RefObject<HTMLElement>) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<ParsedMessage | null>(null);

  useEffect(() => {
    const ps = psRef.current;
    if (!ps) return;

    const handleDataChannelOpen = () => setIsConnected(true);
    const handleStatusChange = (e: CustomEvent) => {
      if (e.detail.newStatus === 'ended' || e.detail.newStatus === 'failed') {
        setIsConnected(false);
      }
    };
    const handleMessage = (e: CustomEvent) => {
      const data = e.detail;
      setLastMessage({
        type: data.type || 'unknown',
        data,
        raw: JSON.stringify(data)
      });
    };

    ps.addEventListener('data-channel-open', handleDataChannelOpen);
    ps.addEventListener('status-change', handleStatusChange as EventListener);
    ps.addEventListener('ue-command-response', handleMessage as EventListener);

    return () => {
      ps.removeEventListener('data-channel-open', handleDataChannelOpen);
      ps.removeEventListener('status-change', handleStatusChange as EventListener);
      ps.removeEventListener('ue-command-response', handleMessage as EventListener);
    };
  }, [psRef]);

  const sendMessage = useCallback((type: string, data?: any) => {
    const ps = psRef.current as any;
    if (!ps || !isConnected) return;

    ps.sendUIInteraction({ type, ...data });
  }, [psRef, isConnected]);

  return { isConnected, lastMessage, sendMessage };
}
```

---

## Part 7 — The Full Picture

You've built up every piece individually — now let's see them working together. Here's a complete example: a CDN-loaded component with a custom overlay, bidirectional messaging, and lifecycle event handling. This pattern works well for product configurators, interactive showcases, and kiosk-style embeds.

### Complete Example

```html
<!-- full-example.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>3D Configurator</title>
  <style>
    body { margin: 0; background: #0a0a0a; font-family: system-ui, sans-serif; }
    pixel-stream { display: block; width: 100vw; height: 100vh; }

    .overlay {
      width: 100%; height: 100%;
      display: grid; place-items: center;
      color: #fff;
    }
    .state { display: none; flex-direction: column; align-items: center; gap: 16px; }
    pixel-stream[status="idle"]      .state-idle,
    pixel-stream[status="connected"] .state-idle     { display: flex; }
    pixel-stream[status="queued"]    .state-pending,
    pixel-stream[status="negotiating"] .state-pending { display: flex; }
    pixel-stream[status="failed"]    .state-error     { display: flex; }

    .sidebar {
      position: fixed; right: 0; top: 0; bottom: 0; width: 280px;
      background: rgba(0,0,0,0.85); padding: 24px;
      display: none; flex-direction: column; gap: 12px; z-index: 10;
    }
    .sidebar.visible { display: flex; }

    .swatch {
      width: 40px; height: 40px; border: 2px solid transparent;
      cursor: pointer; transition: border-color 0.2s;
    }
    .swatch:hover, .swatch.active { border-color: #fff; }
  </style>
</head>
<body>
  <pixel-stream id="ps"
    controls
    swift-job-request
    queue-wait-tolerance="45"
  >
    <div slot="overlay" class="overlay">
      <div class="state state-idle">
        <button onclick="document.getElementById('ps').play()">
          Launch Configurator
        </button>
      </div>
      <div class="state state-pending">
        <p>Starting your session&hellip;</p>
      </div>
      <div class="state state-error">
        <p>Connection failed.</p>
        <button onclick="document.getElementById('ps').play()">
          Retry
        </button>
      </div>
    </div>
  </pixel-stream>

  <div id="sidebar" class="sidebar">
    <h3 style="color:#fff; margin:0;">Colour</h3>
    <div style="display:flex; gap:8px; flex-wrap:wrap;" id="swatches"></div>
    <div id="response-log" style="margin-top:auto; font-size:11px; color:#888;"></div>
  </div>

  <script src="https://cdn.interlucent.ai/dev/pixel-stream/0.0.57/pixel-stream.iife.min.js"></script>
  <script>
    const ps = document.getElementById('ps');
    ps.admissionToken = 'YOUR_TOKEN';

    const sidebar = document.getElementById('sidebar');
    const swatches = document.getElementById('swatches');
    const log = document.getElementById('response-log');

    const COLORS = ['#FF5500', '#0055FF', '#00CC66', '#FFD700', '#CC00FF', '#FFFFFF'];

    // Build colour swatches
    COLORS.forEach(color => {
      const el = document.createElement('div');
      el.className = 'swatch';
      el.style.background = color;
      el.onclick = () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        ps.sendUIInteraction({ action: 'setColor', color });
      };
      swatches.appendChild(el);
    });

    // Show sidebar once streaming begins
    ps.addEventListener('status-change', (e) => {
      sidebar.classList.toggle('visible', e.detail.newStatus === 'streaming');
    });

    // Handle responses from UE
    ps.addEventListener('ue-command-response', (e) => {
      log.textContent = 'UE: ' + JSON.stringify(e.detail);
    });
  </script>
</body>
</html>
```

### Key Patterns in This Example

| Pattern | Implementation |
|---------|----------------|
| **Custom overlay** | `<div slot="overlay">` with CSS state management |
| **Performance optimization** | `swift-job-request` and `queue-wait-tolerance="45"` |
| **Dynamic UI** | Sidebar visible only during streaming via `status-change` event |
| **Bidirectional messaging** | `sendUIInteraction()` for commands, `ue-command-response` for responses |
| **Token-based auth** | `ps.admissionToken = 'YOUR_TOKEN'` |

> **Tip:** For more overlay patterns — branded logos, idle timers, grid layouts, and connection diagnostics — see the `pixel-stream/examples/` directory. Each numbered example is a standalone HTML file you can open directly in a browser.

---

## Quick Reference

### Methods

| Method | Description |
|--------|-------------|
| `startSession()` | Begin the connection flow: opens the session WebSocket and authenticates with the platform. |
| `play()` | Start or resume streaming. Handles all states: requests a GPU worker when connected, starts the session if needed, resumes video if autoplay was blocked, or retries after an error. **Must be called from a user gesture.** |
| `cancel()` | Cancel a pending job request while still queued. |
| `stop(reason?)` | Stop the session gracefully. The GPU worker may linger for reconnection depending on tolerances. |
| `sendUIInteraction(descriptor)` | Send a JSON object to UE as a UIInteraction message. |
| `sendCommand(command)` | Send a JSON object to UE as a Command message (UE 5.4+). |

### Key Events

| Event | Description | `event.detail` |
|-------|-------------|----------------|
| `status-change` | Fired when the derived status changes. | `{ newStatus, oldStatus }` |
| `data-channel-open` | The WebRTC data channel is ready — you can now send messages to UE. | — |
| `ue-command-response` | UE sent a Response or Command message back. | Payload from UE |
| `session-ready` | Session WebSocket authenticated. | `{ sessionId, agentId, participants }` |
| `session-ended` | Session terminated. | `{ reason }` |

### Attributes / Properties

| Attribute | Property | Type | Description |
|-----------|----------|------|-------------|
| `controls` | `controls` | `boolean` | Enable built-in overlay controls |
| `api-endpoint` | `apiEndpoint` | `string` | API host (default: `api.interlucent.ai`) |
| `app-id` | `appId` | `string` | Application identifier |
| `app-version` | `appVersion` | `string` | Specific version to stream |
| `reconnect-mode` | `reconnectMode` | `string` | `'none'` \| `'recover'` \| `'always'` |
| `reconnect-attempts` | `reconnectAttempts` | `number` | Retry attempts (-1 = unlimited) |
| `reconnect-strategy` | `reconnectStrategy` | `string` | Retry timing strategy |
| `queue-wait-tolerance` | `queueWaitTolerance` | `number` | Seconds to wait for GPU |
| `webrtc-negotiation-tolerance` | `webrtcNegotiationTolerance` | `number` | Seconds for WebRTC negotiation |
| `swift-job-request` | `swiftJobRequest` | `boolean` | Send GPU request during token exchange |

### Read-Only Properties

| Property | Type | Description |
|----------|------|-------------|
| `status` | `string` | Current session status |
| `sessionId` | `string` | Current session identifier |
| `agentId` | `string` | Your agent ID in this session |
| `isAdmitted` | `boolean` | `true` once token exchange succeeds |
| `failureReason` | `string \| null` | Description of failure |
| `streamStartedAt` | `number` | Timestamp (ms) when streaming began |
| `lastUserInteraction` | `number` | Timestamp of last user input |

### Status Lifecycle

```
idle → connecting → authenticating → connected → queued → rendezvoused → negotiating → streaming
                                                                                          ↓
                                                                               [ready if autoplay blocked]
                                                                                          ↓
                                                                    interrupted → recovering → streaming
                                                                                          ↓
                                                                               failed | ended
```

---

## Timing & Resilience

Control how sessions behave when things take time or go wrong.

### Overview

Tolerances control how long an agent waits at each phase of the connection lifecycle. All values are in seconds. All are optional — the platform applies defaults when absent.

Tolerances are declared in the admission token's `tol` claim and passed through to the access token without modification. The platform reads them when the agent joins and starts the corresponding timers.

### Fields Reference

| Field | Default | Applies to | Description |
|-------|---------|------------|-------------|
| `rendezvous_tolerance_seconds` | 30 | BA, WA | How long this agent waits for the GPU worker to connect. If the timer fires before the worker arrives, the session ends for this participant. |
| `linger_tolerance_seconds` | 0 | BA, WA | How long this agent stays alone after the other participant leaves normally. 0 = leave immediately. Use this to keep a worker alive between sessions. |
| `flexible_presence_allowance_seconds` | 0 | BA, WA | Reconnection grace period. If this agent disconnects unexpectedly (e.g. a network drop), their seat is held for this many seconds. Unlike linger, this covers unexpected disconnections rather than normal departures. |
| `queue_wait_tolerance_seconds` | 0 | BA | How long the browser waits for GPU availability after requesting a session. |
| `webrtc_negotiation_tolerance_seconds` | 10 | BA | How long the browser waits for WebRTC to connect after rendezvous is satisfied. |

> **Note:** **Linger vs. flexible presence:** `linger_tolerance_seconds` applies when the other participant leaves normally. `flexible_presence_allowance_seconds` (your reconnection grace period) applies when this agent disconnects unexpectedly.

**Legend:** BA = Browser Agent, WA = Worker Agent

### Browser Agent Phase Timeline

Each phase's timer starts when the previous phase completes. The following diagram shows the progression for a browser agent:

```
JOIN ─── [Queue Wait] ─── [Rendezvous] ─── [WebRTC Negotiation] ─── CONNECTED
                                                                        │
                                                                        ├── disconnect ─── [Flexible Presence]
                                                                        │
                                                                        └── alone ──────── [Linger]
```

If a timer fires before its condition is met, the agent is removed from the session with a descriptive reason (e.g. `queue_wait_timeout`, `rendezvous_timeout`, `flexible_presence_allowance_exceeded`).

### Common Patterns

#### Fail Fast

For latency-sensitive applications, keep all tolerances low. A short `rendezvous_tolerance_seconds` (e.g. 10) combined with `webrtc_negotiation_tolerance_seconds: 5` ensures the user gets an error quickly rather than waiting in an uncertain state.

```html
<pixel-stream
  rendezvous-tolerance="10"
  webrtc-negotiation-tolerance="5"
></pixel-stream>
```

#### Survive Disruptions

For resilient sessions, increase `flexible_presence_allowance_seconds` (your reconnection grace period) to survive network hiccups (e.g. 300 seconds = 5 minutes). Pair with `linger_tolerance_seconds: 30` so the worker doesn't immediately exit if the browser briefly drops.

```html
<pixel-stream
  flexible-presence-allowance="300"
  linger-tolerance="30"
  reconnect-mode="recover"
  reconnect-attempts="-1"
></pixel-stream>
```

#### Wait for GPU Availability

When using on-demand GPU workers (not pre-provisioned pools), set `queue_wait_tolerance_seconds` to match your expected provisioning latency. A cold-start worker may take 60–120 seconds to become available.

```html
<pixel-stream
  queue-wait-tolerance="120"
  swift-job-request
></pixel-stream>
```

> **Tip:** Combine `queue_wait_tolerance_seconds` with the `sjr` (Swift Job Request) flag to submit the GPU availability request during token exchange, reducing total wait time by one round-trip.

### Migration Mapping: Tolerances

| PureWeb (Current) | Interlucent |
|-------------------|-------------|
| `RETRY_CONFIG.maxRetries = 3` | `reconnect-attempts="3"` |
| `RETRY_CONFIG.retryDelay = 2000` | `reconnect-strategy="exponential-backoff"` |
| Warm pool TTL (10 min) | `linger-tolerance` on worker |
| Custom timeout handling | `queue-wait-tolerance`, `webrtc-negotiation-tolerance` |
| Manual reconnection in `useStreamConnection` | `reconnect-mode="recover"` + `flexible-presence-allowance` |

### Current PureWeb Retry Config (for reference)

```typescript
// From useStreamConnection.ts
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000,  // 2 seconds between retries
};

// Manual reconnection logic
const reconnectStream = useCallback(async () => {
  if (retryCount >= RETRY_CONFIG.maxRetries) {
    setConnectionStatus('failed');
    return;
  }
  setRetryCount(prev => prev + 1);
  await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
  await initializePlatform(retryCount + 1);
}, [retryCount, initializePlatform]);
```

### Equivalent Interlucent Config

```html
<!-- All retry/tolerance logic is declarative -->
<pixel-stream
  reconnect-mode="recover"
  reconnect-attempts="3"
  reconnect-strategy="exponential-backoff"
  queue-wait-tolerance="45"
  webrtc-negotiation-tolerance="10"
  flexible-presence-allowance="60"
></pixel-stream>
```

---

## SDK Reference

Create admission tokens with the Interlucent SDK or any language that supports Ed25519 signing.

### Installation

```bash
npm install @interlucent/admission-sdk
```

Initialize the client with your project's secret key. The client handles signing and expiration.

```typescript
import { AdmissionClient } from '@interlucent/admission-sdk';

const client = await AdmissionClient.create(
  process.env.INTERLUCENT_SECRET_KEY!
);
```

> **Warning:** The secret key must only be used server-side. Never expose it in client-side code or commit it to version control.

> **Note:** Find your project secret key in Console > Project Settings > API Keys.

### Creating Tokens

#### Minimal Token

The simplest token: specifies the application and a 5-minute expiration. All tolerances use platform defaults.

```typescript
const token = await client
  .createToken()
  .asBrowserAgent()
  .withApplication('PFfFuw')  // your app ID from the Console
  .expiresIn(300)
  .sign();
```

Pass this token to your frontend and set it on the `<pixel-stream>` component's `admission-token` attribute.

#### Production Token

A fully configured token: specific version, 45-second GPU wait, 2-minute reconnect grace, tagged for billing reconciliation.

```typescript
const production = await client
  .createToken()
  .asBrowserAgent()
  .withApplication('PFfFuw')
  .withVersion('MrM')
  .withCustomArgs({ user_id: 'usr_abc', theme: 'dark' })
  .withQueueWaitTolerance(45)
  .withFlexiblePresenceAllowance(120)
  .withRendezvousTolerance(30)
  .withReference('order-789')
  .withSwiftJobRequest()
  .expiresIn(300)
  .sign();
```

#### Low-Latency Token

Fail fast on any delay. Tight tolerance windows ensure the user gets feedback quickly rather than waiting in an uncertain state.

```typescript
const lowLatency = await client
  .createToken()
  .asBrowserAgent()
  .withApplication('PFfFuw')
  .withRendezvousTolerance(10)
  .withWebRtcNegotiationTolerance(5)
  .withSwiftJobRequest()
  .expiresIn(120)
  .sign();
```

#### Resilient Token

Survive network hiccups and GPU churn. Long tolerance windows keep the session alive through transient disruptions.

```typescript
const resilient = await client
  .createToken()
  .asBrowserAgent()
  .withApplication('PFfFuw')
  .withTolerances({
    queue_wait_tolerance_seconds: 120,
    rendezvous_tolerance_seconds: 60,
    flexible_presence_allowance_seconds: 300,
    linger_tolerance_seconds: 30,
    webrtc_negotiation_tolerance_seconds: 15,
  })
  .withSwiftJobRequest()
  .withReference('session-resilient-test')
  .expiresIn(600)
  .sign();
```

### Token Builder Methods Reference

| Method | Description |
|--------|-------------|
| `asBrowserAgent()` | Configure token for browser-side use |
| `withApplication(appId)` | Set the application ID to stream |
| `withVersion(version)` | Pin to a specific application version |
| `withCustomArgs(args)` | Pass custom arguments to the application |
| `withQueueWaitTolerance(seconds)` | How long to wait for GPU availability |
| `withFlexiblePresenceAllowance(seconds)` | Reconnection grace period |
| `withRendezvousTolerance(seconds)` | How long to wait for GPU worker connection |
| `withWebRtcNegotiationTolerance(seconds)` | How long to wait for WebRTC setup |
| `withLingerTolerance(seconds)` | How long to keep session alive when alone |
| `withTolerances(config)` | Set all tolerances at once |
| `withSwiftJobRequest()` | Enable fast GPU request during token exchange |
| `withReference(ref)` | Add tracking reference for billing/analytics |
| `expiresIn(seconds)` | Set token expiration time |
| `sign()` | Sign and return the token string |

### Migration: PureWeb Admin SDK → Interlucent Admission SDK

| PureWeb | Interlucent |
|---------|-------------|
| `PlatformAdmin` class | `AdmissionClient` class |
| `admin.createAgentEnvironment()` | `client.createToken().sign()` |
| Project ID + Client ID + Client Secret | Single Secret Key |
| Environment ID + Agent Token | Single Admission Token (JWT) |
| Server creates environment, returns token | Server signs token, client connects directly |

### Current PureWeb Implementation (for reference)

```typescript
// From warmPool.ts - current token generation
import PlatformAdmin from '@pureweb/platform-admin-sdk';

const admin = new PlatformAdmin({
  clientId: process.env.PUREWEB_PROJECT_CLIENT_ID!,
  clientSecret: process.env.PUREWEB_PROJECT_CLIENT_SECRET!,
});

const environment = await admin.createAgentEnvironment(
  projectId,
  modelId
);

const agent = await admin.createAgentToken(
  projectId,
  environment.id
);

// Returns: { environmentId, agentToken: agent.access_token }
```

### Equivalent Interlucent Implementation

```typescript
// New API route: /api/stream/token
import { AdmissionClient } from '@interlucent/admission-sdk';

const client = await AdmissionClient.create(
  process.env.INTERLUCENT_SECRET_KEY!
);

export async function POST(request: Request) {
  const { userId, sessionType } = await request.json();

  const token = await client
    .createToken()
    .asBrowserAgent()
    .withApplication(process.env.INTERLUCENT_APP_ID!)
    .withCustomArgs({ user_id: userId, session_type: sessionType })
    .withQueueWaitTolerance(45)
    .withFlexiblePresenceAllowance(120)
    .withSwiftJobRequest()
    .withReference(`session-${userId}`)
    .expiresIn(300)
    .sign();

  return Response.json({ token });
}
```

### Environment Variables

```env
# Remove these PureWeb variables
# NEXT_PUBLIC_PUREWEB_PROJECT_ID=...
# NEXT_PUBLIC_PUREWEB_MODEL_ID=...
# PUREWEB_PROJECT_CLIENT_ID=...
# PUREWEB_PROJECT_CLIENT_SECRET=...

# Add these Interlucent variables
INTERLUCENT_SECRET_KEY=your_secret_key_here
INTERLUCENT_APP_ID=PFfFuw
INTERLUCENT_APP_VERSION=MrM  # optional, omit for latest
```

---

## Network Whitelisting

Domains, ports, and protocols that must be allowed for the `<pixel-stream>` component to work through firewalls, proxies, and other network security appliances.

### Overview

The `<pixel-stream>` component establishes three categories of network connections:

| # | Category | Purpose |
|---|----------|---------|
| 1 | **HTTPS** | Token exchange (admission token → access token) |
| 2 | **WebSocket (WSS)** | Signaling and session management |
| 3 | **WebRTC (UDP/TCP)** | Media transport (video, audio, data channels) |

### Gateway API (HTTPS)

| Item | Value |
|------|-------|
| Domain | `api.interlucent.ai` |
| Port | 443 |
| Protocol | HTTPS (TLS 1.2+) |
| Path | `POST /agent/token` |
| Purpose | Exchanges an admission JWT for an access token and ICE server list |

The component calls this endpoint once at startup. The response includes the access token used for all subsequent connections and a set of TURN/STUN credentials.

> **Note:** For environments using a custom API hostname, substitute that hostname wherever `api.interlucent.ai` appears.

### Signaling WebSocket (WSS)

| Item | Value |
|------|-------|
| Domain | `api.interlucent.ai` |
| Port | 443 |
| Protocol | WSS (WebSocket over TLS) |
| Path | `/ws/session` |
| Purpose | WebRTC signaling, heartbeat, session lifecycle |

The WebSocket remains open for the duration of the streaming session. It carries:
- WebRTC signaling messages (SDP offers/answers, ICE candidates)
- Heartbeat pings every 30 seconds (timeout at 90s)
- Session keepalive pings every 25 seconds
- Streamer presence updates

> **Warning:** Network appliances performing deep packet inspection must allow the WebSocket Upgrade handshake on this path and must not terminate idle connections within the heartbeat window.

### STUN (UDP)

| Item | Value |
|------|-------|
| Domain | `stun.cloudflare.com` |
| Port | 3478 |
| Protocol | UDP (STUN) |
| Purpose | NAT traversal — discovers the client's public IP and port mapping |

STUN is a lightweight, unauthenticated protocol. If UDP 3478 is blocked, the component falls back to TURN relay.

### TURN Relay (UDP + TLS)

TURN servers are provisioned dynamically by the Cloudflare Realtime API during the token exchange step. The exact server addresses are not static, but they fall under Cloudflare's realtime infrastructure.

| Item | Value |
|------|-------|
| Domain | `*.turn.cloudflare.com` |
| Ports | 3478 (UDP), 443 (TLS/TCP) |
| Protocol | TURN over UDP; TURNS over TLS |
| Purpose | Media relay when direct peer-to-peer connection fails |

Credentials are short-lived (TTL: 8 hours) and generated server-side. Port 53 (DNS) is automatically filtered from TURN candidates to avoid conflicts with DNS resolution.

> **Tip:** If the network only allows outbound TCP 443 (strict corporate environments), the TURNS (TURN-over-TLS on port 443) path must be open. This is the last-resort relay and is critical for connectivity in restrictive networks.

### WebRTC Media (UDP)

| Item | Value |
|------|-------|
| Ports | 49152–65535 (ephemeral) |
| Protocol | DTLS/SRTP over UDP |
| Purpose | Encrypted video, audio, and data channel transport |

Direct peer-to-peer WebRTC connections use ephemeral UDP ports. If the firewall cannot allow a wide UDP range, ensure TURN relay is reachable so that all media can be tunneled through it.

### Summary Whitelist

| # | Domain | Port(s) | Protocol | Direction |
|---|--------|---------|----------|-----------|
| 1 | `api.interlucent.ai` | 443 | HTTPS | Outbound |
| 2 | `api.interlucent.ai` | 443 | WSS | Outbound |
| 3 | `stun.cloudflare.com` | 3478 | UDP (STUN) | Outbound |
| 4 | `*.turn.cloudflare.com` | 3478, 443 | UDP / TLS (TURN) | Outbound |
| 5 | Peer IP (or TURN relay) | 49152–65535 | UDP (DTLS/SRTP) | Outbound |

### Notes for Network Administrators

#### Minimum Viable Whitelist

Items 1, 2, and 4 (TURNS on port 443). This forces all media through the TURN relay over TLS, which works even in heavily restricted environments. Set the component attribute `force-turn="true"` to enforce relay-only mode.

```html
<pixel-stream force-turn="true"></pixel-stream>
```

#### WebSocket Idle Timeout

Ensure proxy/firewall idle timeouts exceed 30 seconds to avoid dropping the signaling connection between heartbeats.

#### TLS Inspection

If performing TLS interception, the WebSocket upgrade on `/ws/session` and TURNS connections must be allowed. Certificate pinning is not used, so transparent proxies will work if the proxy CA is trusted by the client.

#### HTTP Version Support

The token exchange endpoint supports HTTP/2. WebSocket connections use HTTP/1.1 upgrade.

### Migration Note: Network Changes from PureWeb

| Aspect | PureWeb | Interlucent |
|--------|---------|-------------|
| API Domain | `*.pureweb.io` | `api.interlucent.ai` |
| TURN Provider | PureWeb infrastructure | Cloudflare (`*.turn.cloudflare.com`) |
| STUN Server | PureWeb STUN | `stun.cloudflare.com` |
| ICE Servers | Returned from `platform.agent` | Returned from token exchange |

**Action Required:** Update firewall rules to allow the new Interlucent and Cloudflare domains while removing PureWeb domains.

---

## PureWeb vs Interlucent: Detailed Comparison

A comprehensive comparison of the current PureWeb implementation with Interlucent, including code examples, complexity analysis, and migration effort estimates.

### Overview: Code Reduction

| Metric | PureWeb (Current) | Interlucent | Reduction |
|--------|-------------------|-------------|-----------|
| **SDK Initialization** | ~250 lines | ~10 lines | **96%** |
| **Warm Pool Implementation** | ~290 lines | 0 (built-in) | **100%** |
| **Message Bus Hook** | ~200 lines | ~50 lines | **75%** |
| **Retry/Reconnection Logic** | ~150 lines | 0 (built-in) | **100%** |
| **API Routes** | 5 routes (~400 lines) | 1 route (~30 lines) | **92%** |
| **Total Streaming Code** | ~1,300 lines | ~100 lines | **~92%** |

### 1. SDK Initialization

#### Current PureWeb Implementation

**File:** `app/hooks/useStreamConnection.ts` (473 lines)

```typescript
// PureWeb requires complex multi-step initialization
import {
  PlatformNext,
  ModelDefinition,
  UndefinedModelDefinition,
  DefaultStreamerOptions,
  StreamerStatus,
} from '@pureweb/platform-sdk'
import { useLaunchRequest, useStreamer } from '@pureweb/platform-sdk-react'

// Step 1: Create and initialize platform
const platformRef = useRef<PlatformNext | null>(null)
if (!platformRef.current) {
  platformRef.current = new PlatformNext()
  platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
}

// Step 2: Pre-warm connection (authenticate without launching)
const preWarm = async () => {
  const platform = platformRef.current
  await platform.launchRequestAccess({ projectId, modelId })
  const models = await platform.getModels()
  setAvailableModels(models)

  // Also claim from warm pool
  const response = await fetch('/api/stream/warm-claim', { method: 'POST' })
  warmEnvRef.current = await response.json()
}

// Step 3: Full initialization with retry logic
const initializePlatform = useCallback(async (attempt: number = 1) => {
  // Reset platform on retry
  if (attempt > 1 && platformRef.current) {
    platformRef.current.disconnect()
    platformRef.current = new PlatformNext()
    platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
  }

  await platform.launchRequestAccess({ projectId, modelId })

  // Extract ICE servers manually
  if (platform.agent?.serviceCredentials?.iceServers) {
    streamerOptions.iceServers = platform.agent.serviceCredentials.iceServers
  }

  const models = await platform.getModels()
  setAvailableModels(models)
}, [projectId, modelId])

// Step 4: Model selection (required before launch)
useEffect(() => {
  if (availableModels?.length) {
    const targetModel = availableModels.find(m => m.id === modelId)
    setModelDefinition(targetModel || availableModels[0])
  }
}, [availableModels, modelId])

// Step 5: Use PureWeb hooks for launch and streaming
const launchRequest = useLaunchRequest(platform, modelDefinition)
const {
  streamerStatus,
  emitter,
  videoStream,
  audioStream,
  messageSubject
} = useStreamer(launchRequest, streamerOptions)
```

#### Interlucent Equivalent

```typescript
// Interlucent: Simple token-based initialization
const ps = document.querySelector('pixel-stream');

// Single step: Set token and play
ps.admissionToken = await fetchTokenFromBackend();
await ps.play();

// That's it! No platform init, no model selection, no ICE server extraction
```

**Complexity:** PureWeb requires 5+ steps, multiple hooks, and manual state management. Interlucent reduces this to 2 lines.

---

### 2. Warm Pool / Fast Startup

#### Current PureWeb Implementation

**File:** `app/lib/warmPool.ts` (290 lines)

```typescript
// PureWeb requires custom warm pool implementation
import PlatformAdmin from '@pureweb/platform-admin-sdk'

interface WarmEnvironment {
  id: string
  environmentId: string
  agentToken: string
  createdAt: number
  expiresAt: number
  claimed: boolean
}

const DEFAULT_CONFIG: WarmPoolConfig = {
  minPoolSize: 2,           // Keep 2 environments ready
  maxPoolSize: 5,           // Max 5 environments in pool
  ttlMs: 10 * 60 * 1000,    // 10 minutes TTL
  refreshIntervalMs: 60 * 1000, // Check every minute
}

let pool: WarmEnvironment[] = []
let refreshInterval: NodeJS.Timeout | null = null

// Create pre-warmed environment
async function createWarmEnvironment(): Promise<WarmEnvironment | null> {
  const admin = await getAdmin()
  const environment = await admin.createAgentEnvironment(projectId, modelId)
  const agent = await admin.createAgentToken(projectId, environment.id)

  return {
    id: crypto.randomUUID(),
    environmentId: environment.id,
    agentToken: agent.access_token,
    createdAt: Date.now(),
    expiresAt: Date.now() + config.ttlMs,
    claimed: false,
  }
}

// Claim from pool (FIFO)
export async function claimWarmEnvironment() {
  const available = pool.filter(env => !env.claimed && !isExpired(env))
  if (available.length === 0) return null

  // Claim oldest first (FIFO)
  available.sort((a, b) => a.createdAt - b.createdAt)
  const env = available[0]
  env.claimed = true

  // Trigger background replenishment
  replenishPool()

  return { environmentId: env.environmentId, agentToken: env.agentToken }
}

// Background refresh loop
function startRefreshLoop() {
  refreshInterval = setInterval(async () => {
    // Remove expired, replenish pool
    pool = pool.filter(env => !isExpired(env) && !env.claimed)
    await replenishPool()
  }, config.refreshIntervalMs)
}
```

**Plus 4 API routes:**
- `/api/stream/warm-claim` - Claim from pool
- `/api/stream/warm-init` - Initialize pool
- `/api/stream/credentials` - Get credentials
- `/api/stream/agent-token` - Create tokens

#### Interlucent Equivalent

```html
<!-- Built-in swift job request - no custom implementation needed -->
<pixel-stream
  swift-job-request
  queue-wait-tolerance="45"
></pixel-stream>
```

**Complexity:** PureWeb requires ~290 lines of pool management + 4 API routes. Interlucent has this built-in with a single attribute.

---

### 3. Message Sending/Receiving

#### Current PureWeb Implementation

**File:** `app/features/messaging/hooks/useMessageBus.ts` (200 lines)

```typescript
// PureWeb uses string-based messages with RxJS
import type { InputEmitter } from '@pureweb/platform-sdk'
import type { Subject } from 'rxjs'

export function useMessageBus(
  emitter: InputEmitter | undefined,
  messageSubject: Subject<string> | undefined,
) {
  // SEND: Format as "type:data" string
  const sendMessage = useCallback((type: string, data?: string) => {
    const message = data ? `${type}:${data}` : type
    emitter?.EmitUIInteraction(message)
  }, [emitter])

  // RECEIVE: Parse string messages from RxJS Subject
  useEffect(() => {
    if (!messageSubject) return

    const subscription = messageSubject.subscribe((raw: string) => {
      // Manual parsing: "training_progress:50:TaskName:phase1:3:8:true"
      const [type, ...dataParts] = raw.split(':')
      const parsed = { type, data: dataParts.join(':'), raw }

      // Notify handlers
      messageHandlersRef.current.forEach(handler => handler(parsed))
    })

    return () => subscription.unsubscribe()
  }, [messageSubject])

  return { sendMessage, onMessage: (handler) => { /* subscribe */ } }
}

// Usage: String formatting required
sendMessage('camera_control', 'IsometricNE')
sendMessage('question_answer', 'Q1:1:true')  // Complex nested format
sendMessage('explosion_control', '50')
```

#### Interlucent Equivalent

```typescript
// Interlucent uses JSON objects with native DOM events
const ps = document.querySelector('pixel-stream');

// SEND: JSON objects (no string formatting)
ps.sendUIInteraction({
  type: 'camera_control',
  preset: 'IsometricNE'
});

ps.sendUIInteraction({
  type: 'question_answer',
  questionId: 'Q1',
  tryCount: 1,
  isCorrect: true
});

// RECEIVE: Native DOM events with parsed JSON
ps.addEventListener('ue-command-response', (event) => {
  const data = event.detail; // Already parsed JSON
  console.log(data.type, data.progress);
});
```

**Complexity:** PureWeb requires manual string parsing and RxJS. Interlucent uses native JSON and DOM events.

---

### 4. Retry/Reconnection Logic

#### Current PureWeb Implementation

```typescript
// Manual retry logic in useStreamConnection.ts
const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000,  // 2 seconds
}

const initializePlatform = useCallback(async (attempt: number = 1) => {
  try {
    setConnectionStatus(attempt > 1 ? 'retrying' : 'initializing')

    // Reset platform on retry (required!)
    if (attempt > 1 && platformRef.current) {
      platformRef.current.disconnect()
      platformRef.current = new PlatformNext()
      platformRef.current.initialize({ endpoint: 'https://api.pureweb.io' })
    }

    await platform.launchRequestAccess({ projectId, modelId })
    // ... rest of initialization

  } catch (err) {
    if (attempt < RETRY_CONFIG.maxRetries) {
      setRetryCount(attempt)
      setTimeout(() => {
        initializePlatform(attempt + 1)
      }, RETRY_CONFIG.retryDelay)
    } else {
      setConnectionStatus('failed')
      onError?.(getStreamErrorMessage(err))
    }
  }
}, [projectId, modelId, onError])

// Auto-retry on streamer failure
useEffect(() => {
  if (streamerStatus === StreamerStatus.Failed) {
    if (retryCount < RETRY_CONFIG.maxRetries) {
      setConnectionStatus('retrying')
      setTimeout(() => initializePlatform(retryCount + 1), RETRY_CONFIG.retryDelay)
    }
  }
}, [streamerStatus])

// Manual reconnection method
const reconnectStream = useCallback(async () => {
  setIsReconnecting(true)
  platformRef.current?.disconnect()
  platformRef.current = new PlatformNext()
  await initializePlatform(1)
  setIsReconnecting(false)
}, [initializePlatform])
```

#### Interlucent Equivalent

```html
<!-- All retry logic is declarative -->
<pixel-stream
  reconnect-mode="recover"
  reconnect-attempts="3"
  reconnect-strategy="exponential-backoff"
  flexible-presence-allowance="120"
></pixel-stream>
```

**Complexity:** PureWeb requires ~150 lines of manual retry logic. Interlucent provides this declaratively.

---

### 5. Status Handling

#### Current PureWeb Implementation

```typescript
// Manual status mapping and handling
import { StreamerStatus } from '@pureweb/platform-sdk'

// Track status changes
useEffect(() => {
  switch (streamerStatus) {
    case StreamerStatus.Connected:
      setConnectionStatus('connected')
      if (!wasConnectedRef.current) {
        wasConnectedRef.current = true
        onConnected?.(true)
      } else {
        onConnected?.(false)
      }
      break

    case StreamerStatus.Failed:
      if (retryCount < RETRY_CONFIG.maxRetries) {
        setConnectionStatus('retrying')
        // ... trigger retry
      } else {
        setConnectionStatus('failed')
      }
      break

    case StreamerStatus.Closed:
      onSessionEnd?.('logged_out')
      break

    case StreamerStatus.Withdrawn:
      onSessionEnd?.('kicked')
      break

    case StreamerStatus.Completed:
      onSessionEnd?.('expired')
      break
  }
}, [streamerStatus])

// Custom React state for UI
const [connectionStatus, setConnectionStatus] = useState<
  'initializing' | 'connecting' | 'connected' | 'failed' | 'retrying'
>('initializing')

// Conditional rendering based on status
{connectionStatus === 'connecting' && <LoadingOverlay />}
{connectionStatus === 'failed' && <ErrorModal />}
```

#### Interlucent Equivalent

```css
/* Pure CSS status handling */
pixel-stream[status="idle"] .state-idle { display: flex; }
pixel-stream[status="queued"] .state-pending { display: flex; }
pixel-stream[status="streaming"] .overlay { display: none; }
pixel-stream[status="failed"] .state-error { display: flex; }
```

```javascript
// JavaScript event listener (if needed)
ps.addEventListener('status-change', (e) => {
  console.log(e.detail.newStatus, e.detail.oldStatus);
});
```

**Complexity:** PureWeb requires manual status mapping and React state. Interlucent uses CSS attribute selectors and DOM events.

---

### 6. Video/Audio Handling

#### Current PureWeb Implementation

```typescript
// Manual audio track merging in StreamingApp.tsx
useEffect(() => {
  if (!videoRef.current || !stream.videoStream) return

  const video = videoRef.current
  const currentStream = video.srcObject as MediaStream

  // Merge audio tracks (brittle workaround)
  if (stream.audioStream && currentStream) {
    const audioTracks = stream.audioStream.getAudioTracks()
    if (audioTracks.length > 0 && !currentStream.getAudioTracks().length) {
      currentStream.addTrack(audioTracks[0])
    }
  }

  // Handle browser autoplay policy
  video.muted = false
  video.volume = 1.0
  video.play().catch(() => {
    // Add click handler for browsers that block autoplay
    const enableAudio = () => {
      video.muted = false
      video.play()
    }
    document.addEventListener('click', enableAudio, { once: true })
  })
}, [stream.videoStream, stream.audioStream])

// VideoStream component from SDK
<VideoStream
  VideoRef={videoRef}
  Emitter={stream.emitter}
  Stream={stream.videoStream || undefined}
  UseNativeTouchEvents={true}
  UsePointerLock={false}
  PointerLockRelease={true}
  Resolution={streamResolution}
/>
```

#### Interlucent Equivalent

```html
<!-- Audio/video handling is automatic -->
<pixel-stream controls></pixel-stream>

<!-- Or with custom controls -->
<pixel-stream id="ps">
  <div slot="overlay">
    <!-- Autoplay blocked state handled automatically -->
    <div class="state state-ready">
      <button onclick="document.getElementById('ps').play()">
        Click to Resume
      </button>
    </div>
  </div>
</pixel-stream>
```

**Complexity:** PureWeb requires manual audio merging and autoplay handling. Interlucent handles this automatically.

---

### 7. API Routes Comparison

#### Current PureWeb Routes (5 routes, ~400 lines)

| Route | Purpose | Lines |
|-------|---------|-------|
| `/api/stream/warm-claim` | Claim from warm pool or create fresh | 115 |
| `/api/stream/warm-init` | Initialize/manage warm pool | 92 |
| `/api/stream/credentials` | Get stream credentials | 63 |
| `/api/stream/agent-token` | Create agent token | 61 |
| `/api/stream/create` | Create stream session | 64 |

#### Interlucent Routes (1 route, ~30 lines)

```typescript
// /api/stream/token - Single route for token generation
import { AdmissionClient } from '@interlucent/admission-sdk';

const client = await AdmissionClient.create(process.env.INTERLUCENT_SECRET_KEY!);

export async function POST(request: Request) {
  const { userId } = await request.json();

  const token = await client
    .createToken()
    .asBrowserAgent()
    .withApplication(process.env.INTERLUCENT_APP_ID!)
    .withQueueWaitTolerance(45)
    .withSwiftJobRequest()
    .expiresIn(300)
    .sign();

  return Response.json({ token });
}
```

---

### 8. Environment Variables

#### Current PureWeb

```env
NEXT_PUBLIC_PUREWEB_PROJECT_ID=94adc3ba-7020-49f0-9a7c-bb8f1531536a
NEXT_PUBLIC_PUREWEB_MODEL_ID=26c1dfea-9845-46bb-861d-fb90a22b28df
PUREWEB_PROJECT_CLIENT_ID=your_client_id
PUREWEB_PROJECT_CLIENT_SECRET=your_client_secret
WARM_POOL_ADMIN_SECRET=your_admin_secret
```

#### Interlucent

```env
INTERLUCENT_SECRET_KEY=your_secret_key
INTERLUCENT_APP_ID=PFfFuw
INTERLUCENT_APP_VERSION=MrM  # optional
```

---

### Migration Effort Estimate

| Task | Effort | Notes |
|------|--------|-------|
| Remove PureWeb packages, add Interlucent | 30 min | Package.json updates |
| Create `/api/stream/token` route | 1-2 hours | Single new API route |
| Delete warm pool code | 30 min | Delete warmPool.ts + 4 API routes |
| Replace `useStreamConnection.ts` | 2-3 hours | Simple token fetch + play() |
| Update `useMessageBus.ts` | 2-3 hours | sendUIInteraction + addEventListener |
| Update `StreamingApp.tsx` | 3-4 hours | Replace VideoStream with pixel-stream |
| Update feature hooks | 2-3 hours | Message format changes |
| Testing & QA | 1 day | End-to-end testing |
| **Total (Web App)** | **2-3 days** | Frontend migration |
| **UE5 Blueprint updates** | TBD | Only if JSON format needed |

**Why it's fast:**
- Most work is **deleting code** (warm pool, retry logic, complex initialization)
- Interlucent handles complexity that required custom code before
- Feature hooks stay mostly the same - just message format changes
- `<pixel-stream>` component replaces hundreds of lines

### Key Benefits After Migration

| Benefit | Impact |
|---------|--------|
| **Code Reduction** | ~92% less streaming-related code |
| **Maintenance** | No warm pool management |
| **Reliability** | Built-in reconnection and recovery |
| **Developer Experience** | Declarative configuration |
| **Cold Start** | `swift-job-request` built-in |
| **Debugging** | CSS status attributes, clearer events |

---

## Migration Checklist

Use this checklist when migrating from PureWeb to Interlucent:

- [ ] Remove PureWeb SDK packages (`@pureweb/platform-sdk`, `@pureweb/platform-sdk-react`, `@pureweb/platform-admin-sdk`)
- [ ] Add Interlucent script tag or npm package
- [ ] Replace `<VideoStream>` component with `<pixel-stream>` web component
- [ ] Replace `PlatformNext` initialization with `admissionToken` property
- [ ] Replace `useLaunchRequest` / `useStreamer` hooks with `play()` method
- [ ] Replace `emitter.EmitUIInteraction(string)` with `sendUIInteraction(object)`
- [ ] Replace `messageSubject.subscribe()` with `addEventListener('ue-command-response')`
- [ ] Replace custom status tracking with `status-change` event
- [ ] Update message format from `"type:data"` strings to JSON objects
- [ ] Remove warm pool API endpoints (replaced by `swift-job-request`)
- [ ] Update any UE5 blueprint code to send/receive JSON instead of string format
- [ ] Configure tolerance attributes based on your session requirements
- [ ] Set up admission token generation on your backend

---

*Last updated: 2024*
