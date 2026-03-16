# Interlucent Message Format Documentation

**Date:** 2026-03-14
**Updated:** 2026-03-14
**Purpose:** Document the JSON message format used between Web and UE5 via Interlucent.

---

## Executive Summary

| Component | Status | Notes |
|-----------|--------|-------|
| WebRTC Connection | ✅ Working | Stream video displays |
| Data Channel | ✅ Open | Mouse/keyboard input works |
| Message Format | ✅ JSON | Native Interlucent format |
| UE5 Handler | ⏳ Pending | Needs JSON parser |

**Web implementation is complete.** UE5 needs a UIInteraction handler that parses JSON messages.

---

## Message Format: PureWeb vs Interlucent

| Platform | Message Format | Example |
|----------|---------------|---------|
| **PureWeb** | Plain string | `emitter.EmitUIInteraction("tool_select:XRay")` |
| **Interlucent** | JSON object | `ps.sendUIInteraction({ type: 'tool_select', tool: 'XRay' })` |

Our web implementation sends **native JSON** that matches Interlucent's expected format:

```javascript
// Tool Selection
ps.sendUIInteraction({ type: 'tool_select', tool: 'XRay' });

// Training Control
ps.sendUIInteraction({ type: 'training_control', action: 'start' });

// Camera Control
ps.sendUIInteraction({ type: 'camera_control', preset: 'IsometricNE' });

// Explosion Control
ps.sendUIInteraction({ type: 'explosion_control', level: 50 });
```

---

## Web Implementation (Complete)

### Console Output When Sending Messages

```
📤 Sending JSON to UE5: { type: "tool_select", tool: "XRay" }
📤 Sending JSON to UE5: { type: "training_control", action: "start" }
📤 Sending JSON to UE5: { type: "explosion_control", level: 50 }
```

### Message Hook Usage

```typescript
// Using sendJson for direct JSON
messageBus.sendJson({ type: 'tool_select', tool: 'XRay' });

// Using sendMessage (auto-converts to JSON)
messageBus.sendMessage('tool_select', 'XRay');
// → Converts to: { type: 'tool_select', tool: 'XRay' }
```

---

## Complete Message Format Reference

### Web → UE5 Messages

| Message Type | JSON Format |
|--------------|-------------|
| Tool Select | `{ type: "tool_select", tool: "XRay" }` |
| Training Control | `{ type: "training_control", action: "start" }` |
| Camera Control | `{ type: "camera_control", preset: "IsometricNE" }` |
| Explosion Control | `{ type: "explosion_control", level: 50 }` |
| Explosion Action | `{ type: "explosion_control", action: "explode" }` |
| Pipe Select | `{ type: "pipe_select", pipeType: "100mm" }` |
| Task Start | `{ type: "task_start", tool: "PipeConnection", pipeType: "100mm" }` |
| Question Answer | `{ type: "question_answer", questionId: "Q1", tryCount: 2, isCorrect: true }` |
| Waypoint Control | `{ type: "waypoint_control", action: "activate", index: 0 }` |
| Layer Control | `{ type: "layer_control", action: "toggle", index: 0 }` |
| Settings | `{ type: "settings_control", setting: "resolution", width: 1920, height: 1080 }` |

### UE5 → Web Messages (Expected Format)

| Message Type | JSON Format |
|--------------|-------------|
| Training Progress | `{ type: "training_progress", progress: 50, taskName: "Task1", phase: "phase1", currentTask: 3, totalTasks: 8, isActive: true }` |
| Tool Change | `{ type: "tool_change", toolName: "XRay" }` |
| Question Request | `{ type: "question_request", questionId: "Q1" }` |
| Explosion Update | `{ type: "explosion_update", value: 50, isAnimating: false }` |
| Camera Update | `{ type: "camera_update", mode: "Manual", perspective: "IsometricNE", distance: 1500, isTransitioning: false }` |

**Note:** UE5 can also send raw strings (e.g., `"training_progress:50:Task1:phase1:3:8:true"`) and we will parse them correctly.

---

## UE5 Implementation Guide

### UIInteraction Handler (Required)

UE5 needs a handler that parses JSON messages:

```cpp
void HandleUIInteraction(const FString& JsonString)
{
    // Debug: Log incoming message
    UE_LOG(LogPixelStreaming, Log, TEXT("UIInteraction: %s"), *JsonString);

    // Parse JSON
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        UE_LOG(LogPixelStreaming, Warning, TEXT("Failed to parse JSON"));
        return;
    }

    // Get message type
    FString Type;
    if (!JsonObject->TryGetStringField(TEXT("type"), Type))
    {
        UE_LOG(LogPixelStreaming, Warning, TEXT("Missing 'type' field"));
        return;
    }

    // Route by type
    if (Type == "tool_select")
    {
        FString Tool;
        JsonObject->TryGetStringField(TEXT("tool"), Tool);
        HandleToolSelect(Tool);  // e.g., "XRay", "Shovel"
    }
    else if (Type == "training_control")
    {
        FString Action;
        JsonObject->TryGetStringField(TEXT("action"), Action);
        HandleTrainingControl(Action);  // "start", "pause", "reset"
    }
    else if (Type == "camera_control")
    {
        FString Preset;
        JsonObject->TryGetStringField(TEXT("preset"), Preset);
        HandleCameraControl(Preset);  // "IsometricNE", "Front", etc.
    }
    else if (Type == "explosion_control")
    {
        double Level;
        if (JsonObject->TryGetNumberField(TEXT("level"), Level))
        {
            HandleExplosionLevel(Level);  // 0-100
        }
        else
        {
            FString Action;
            JsonObject->TryGetStringField(TEXT("action"), Action);
            HandleExplosionAction(Action);  // "explode", "assemble"
        }
    }
    else if (Type == "question_answer")
    {
        FString QuestionId;
        int32 TryCount;
        bool bIsCorrect;
        JsonObject->TryGetStringField(TEXT("questionId"), QuestionId);
        JsonObject->TryGetNumberField(TEXT("tryCount"), TryCount);
        JsonObject->TryGetBoolField(TEXT("isCorrect"), bIsCorrect);
        HandleQuestionAnswer(QuestionId, TryCount, bIsCorrect);
    }
    // ... handle other message types
}
```

### Sending Messages to Web

```cpp
// Structured JSON (preferred)
void SendTrainingProgress(float Progress, const FString& TaskName, const FString& Phase)
{
    TSharedPtr<FJsonObject> Json = MakeShareable(new FJsonObject());
    Json->SetStringField(TEXT("type"), TEXT("training_progress"));
    Json->SetNumberField(TEXT("progress"), Progress);
    Json->SetStringField(TEXT("taskName"), TaskName);
    Json->SetStringField(TEXT("phase"), Phase);
    Json->SetNumberField(TEXT("currentTask"), CurrentTaskIndex);
    Json->SetNumberField(TEXT("totalTasks"), TotalTasks);
    Json->SetBoolField(TEXT("isActive"), bIsActive);

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(Json.ToSharedRef(), Writer);

    // Send via Pixel Streaming
    PixelStreamingModule->SendResponse(OutputString);
}
```

---

## Verification Checklist

| Step | Expected Result |
|------|----------------|
| Mouse/keyboard works? | ✅ Data channel is open |
| Console shows JSON being sent? | ✅ Web is sending correctly |
| UE5 logs show "UIInteraction"? | Handler is bound |
| UE5 parses JSON correctly? | Fields are extracted |

---

## Files Reference

| File | Purpose |
|------|---------|
| `useInterlucientMessageBus.ts` | Sends JSON, converts legacy string format |
| `InterlucientStream.tsx` | React wrapper for `<pixel-stream>` |
| `interlucent.types.ts` | TypeScript types + format documentation |
| `INTERLUCENT_MIGRATION.md` | Full migration guide |

---

*Updated: 2026-03-14*
