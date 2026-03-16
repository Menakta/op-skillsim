# OP SkillSim - UE5 Message Protocol (Interlucent)

**Version:** 2.0 (JSON Format)
**Date:** 2026-03-14
**Platform:** Interlucent Pixel Streaming

---

## Overview

Messages are sent as **JSON objects** via Interlucent's `sendUIInteraction()` method.
UE5 receives these in the **UIInteraction handler** as JSON strings that need to be parsed.

---

## Message Format

All messages have a `type` field that identifies the message type, plus additional fields based on the type.

```json
{
  "type": "message_type",
  "field1": "value1",
  "field2": 123
}
```

---

# WEB → UE5 MESSAGES

## 1. Training Control

Control training session state.

| Message | JSON Format |
|---------|-------------|
| Start training | `{ "type": "training_control", "action": "start" }` |
| Pause training | `{ "type": "training_control", "action": "pause" }` |
| Resume training | `{ "type": "training_control", "action": "resume" }` |
| Reset training | `{ "type": "training_control", "action": "reset" }` |
| Test mode | `{ "type": "training_control", "action": "test" }` |

### Resume from Phase

Resume training from a specific phase (0-7).

```json
{ "type": "start_from_task", "phaseIndex": 3 }
```

---

## 2. Tool Selection

Select active tool.

| Tool | JSON Format |
|------|-------------|
| XRay Scanner | `{ "type": "tool_select", "tool": "XRay" }` |
| Shovel | `{ "type": "tool_select", "tool": "Shovel" }` |
| Measuring Tape | `{ "type": "tool_select", "tool": "Measuring" }` |
| Pipe Connection | `{ "type": "tool_select", "tool": "PipeConnection" }` |
| Glue | `{ "type": "tool_select", "tool": "Glue" }` |
| Pressure Tester | `{ "type": "tool_select", "tool": "PressureTester" }` |
| Cutting | `{ "type": "tool_select", "tool": "Cutting" }` |
| None | `{ "type": "tool_select", "tool": "None" }` |

---

## 3. Pipe Selection

Select pipe type for connection tasks.

```json
{ "type": "pipe_select", "pipeType": "100mm" }
{ "type": "pipe_select", "pipeType": "150mm" }
{ "type": "pipe_select", "pipeType": "y-junction" }
{ "type": "pipe_select", "pipeType": "elbow" }
```

---

## 4. Task Start

Start a specific task, optionally with pipe type.

```json
// Without pipe type
{ "type": "task_start", "tool": "XRay" }

// With pipe type
{ "type": "task_start", "tool": "PipeConnection", "pipeType": "100mm" }
```

---

## 5. Pressure Testing

### Select Test Plug

```json
{ "type": "test_plug_select", "plugType": "AirPlug" }
{ "type": "test_plug_select", "plugType": "WaterPlug" }
{ "type": "test_plug_select", "plugType": "AccessCap" }
```

### Start Pressure Test

```json
{ "type": "pressure_test_start", "testType": "air_test" }
{ "type": "pressure_test_start", "testType": "water_test" }
{ "type": "pressure_test_start", "testType": "player_closed_q6" }
```

---

## 6. Question/Answer

### Submit Answer

```json
{
  "type": "question_answer",
  "questionId": "Q1",
  "tryCount": 2,
  "isCorrect": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| questionId | string | "Q1" through "Q6" |
| tryCount | number | Attempt number (1, 2, 3...) |
| isCorrect | boolean | Whether answer was correct |

### Request Hint

```json
{ "type": "question_hint", "questionId": "Q1" }
```

### Close Question

```json
{ "type": "question_close", "questionId": "Q1" }
```

---

## 7. Camera Control

### Set Camera Perspective

```json
{ "type": "camera_control", "preset": "IsometricNE" }
{ "type": "camera_control", "preset": "Front" }
{ "type": "camera_control", "preset": "Back" }
{ "type": "camera_control", "preset": "Left" }
{ "type": "camera_control", "preset": "Right" }
{ "type": "camera_control", "preset": "Top" }
{ "type": "camera_control", "preset": "Bottom" }
{ "type": "camera_control", "preset": "IsometricNE" }
{ "type": "camera_control", "preset": "IsometricSE" }
{ "type": "camera_control", "preset": "IsometricSW" }
{ "type": "camera_control", "preset": "IsometricNW" }
```

### Camera Actions

```json
{ "type": "camera_control", "preset": "orbit_start" }
{ "type": "camera_control", "preset": "orbit_stop" }
{ "type": "camera_control", "preset": "reset" }
```

---

## 8. Explosion Control

Control exploded view of model.

### Set Explosion Level (0-100)

```json
{ "type": "explosion_control", "level": 50 }
{ "type": "explosion_control", "level": 0 }
{ "type": "explosion_control", "level": 100 }
```

### Explosion Actions

```json
{ "type": "explosion_control", "action": "explode" }
{ "type": "explosion_control", "action": "assemble" }
```

---

## 9. Waypoint Control

### List Waypoints

```json
{ "type": "waypoint_control", "action": "list" }
```

### Activate Waypoint

```json
{ "type": "waypoint_control", "action": "activate", "index": 0 }
{ "type": "waypoint_control", "action": "activate", "index": 3 }
```

### Deactivate Waypoint

```json
{ "type": "waypoint_control", "action": "deactivate" }
```

---

## 10. Layer Control

### List Layers

```json
{ "type": "layer_control", "action": "list" }
```

### Toggle Layer

```json
{ "type": "layer_control", "action": "toggle", "index": 0 }
```

### Isolate Layer

```json
{ "type": "layer_control", "action": "isolate", "index": 2 }
```

### Show/Hide by Name

```json
{ "type": "layer_control", "action": "show", "name": "Pipes" }
{ "type": "layer_control", "action": "hide", "name": "Ground" }
```

---

## 11. Hierarchical Layer Control

### List Groups

```json
{ "type": "hierarchical_control", "action": "list" }
```

### Toggle Main Group

```json
{ "type": "hierarchical_control", "action": "toggle_main", "groupName": "Plumbing" }
```

### Toggle Child Group

```json
{ "type": "hierarchical_control", "action": "toggle_child", "parentName": "Plumbing", "childIndex": 0 }
```

### Show/Hide All

```json
{ "type": "hierarchical_control", "action": "show_all" }
{ "type": "hierarchical_control", "action": "hide_all" }
```

---

## 12. Settings Control

### Resolution

```json
{ "type": "settings_control", "setting": "resolution", "width": 1920, "height": 1080 }
{ "type": "settings_control", "setting": "resolution", "width": 2560, "height": 1440 }
```

### Graphics Quality

```json
{ "type": "settings_control", "setting": "graphics_quality", "quality": "Low" }
{ "type": "settings_control", "setting": "graphics_quality", "quality": "Medium" }
{ "type": "settings_control", "setting": "graphics_quality", "quality": "High" }
{ "type": "settings_control", "setting": "graphics_quality", "quality": "Epic" }
```

### Audio Volume

```json
{ "type": "settings_control", "setting": "audio_volume", "group": "Master", "volume": 0.8 }
{ "type": "settings_control", "setting": "audio_volume", "group": "Ambient", "volume": 0.5 }
{ "type": "settings_control", "setting": "audio_volume", "group": "SFX", "volume": 1.0 }
```

| Volume | Range |
|--------|-------|
| volume | 0.0 to 1.0 |

### Bandwidth

```json
{ "type": "settings_control", "setting": "bandwidth", "option": "Auto" }
{ "type": "settings_control", "setting": "bandwidth", "option": "Low Quality" }
{ "type": "settings_control", "setting": "bandwidth", "option": "Medium Quality" }
{ "type": "settings_control", "setting": "bandwidth", "option": "High Quality" }
```

### FPS Tracking

```json
{ "type": "settings_control", "setting": "fps_tracking", "enabled": true }
{ "type": "settings_control", "setting": "fps_tracking", "enabled": false }
```

---

## 13. Application Control

```json
{ "type": "application_control", "action": "quit" }
```

---

# UE5 → WEB MESSAGES

UE5 should send messages in the same JSON format. The web app will parse them.

## 1. Training Progress

Send periodically during training.

```json
{
  "type": "training_progress",
  "progress": 50,
  "taskName": "Connect Y-Junction",
  "phase": "phase3",
  "currentTask": 3,
  "totalTasks": 8,
  "isActive": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| progress | number | 0-100 percentage |
| taskName | string | Current task display name |
| phase | string | Current phase identifier |
| currentTask | number | Current task index |
| totalTasks | number | Total tasks in session |
| isActive | boolean | Whether training is active |

---

## 2. Tool Change

When tool changes in UE5.

```json
{ "type": "tool_change", "toolName": "XRay" }
```

---

## 3. Task Events

### Task Started

```json
{ "type": "task_start", "toolName": "PipeConnection" }
```

### Task Completed

```json
{ "type": "task_completed", "taskId": "connect_y_junction" }
```

### Task Complete (Phase Done)

```json
{ "type": "task_complete" }
```

---

## 4. Question Request

Request web to show a question modal.

```json
{ "type": "question_request", "questionId": "Q1" }
```

| Question ID | Topic |
|-------------|-------|
| Q1 | Scanning |
| Q2 | Trench Depth |
| Q3 | Trench Width |
| Q4 | Pipe Slope |
| Q5 | Pressure |
| Q6 | PSI Level |

---

## 5. Pressure Test Result

```json
{
  "type": "pressure_test_result",
  "passed": true,
  "pressure": 20,
  "testType": "air_test"
}
```

---

## 6. Explosion Update

```json
{
  "type": "explosion_update",
  "value": 50,
  "isAnimating": false
}
```

---

## 7. Camera Update

```json
{
  "type": "camera_update",
  "mode": "Manual",
  "perspective": "IsometricNE",
  "distance": 1500,
  "isTransitioning": false
}
```

| Mode | Description |
|------|-------------|
| Manual | User-controlled |
| Orbit | Auto-orbiting |

---

## 8. Waypoint List

```json
{
  "type": "waypoint_list",
  "count": 3,
  "waypoints": [
    { "index": 0, "name": "Start Point" },
    { "index": 1, "name": "Excavation" },
    { "index": 2, "name": "Connection" }
  ]
}
```

---

## 9. Waypoint Update

```json
{
  "type": "waypoint_update",
  "activeIndex": 1,
  "name": "Excavation",
  "isActive": true,
  "progress": 75
}
```

---

## 10. Layer List

```json
{
  "type": "layer_list",
  "count": 3,
  "layers": [
    { "index": 0, "name": "Ground", "visible": true, "actorCount": 5 },
    { "index": 1, "name": "Pipes", "visible": true, "actorCount": 12 },
    { "index": 2, "name": "Tools", "visible": false, "actorCount": 8 }
  ]
}
```

---

## 11. Hierarchical List

```json
{
  "type": "hierarchical_list",
  "count": 4,
  "groups": [
    { "name": "Plumbing", "visible": true, "isChild": false, "actorCount": 20 },
    { "name": "Pipes", "visible": true, "isChild": true, "actorCount": 12, "parentName": "Plumbing", "childIndex": 0 },
    { "name": "Fittings", "visible": true, "isChild": true, "actorCount": 8, "parentName": "Plumbing", "childIndex": 1 }
  ]
}
```

---

## 12. FPS Update

```json
{ "type": "fps_update", "fps": 62.4 }
```

---

## 13. Setting Applied

Confirmation that a setting was applied.

```json
{
  "type": "setting_applied",
  "settingType": "resolution",
  "value": "1920x1080",
  "success": true
}
```

---

## 14. Error

```json
{
  "type": "error",
  "code": "CONNECTION_LOST",
  "details": "WebRTC connection dropped"
}
```

---

# UE5 IMPLEMENTATION

## Receiving Messages (C++)

```cpp
void AMyPixelStreamingHandler::HandleUIInteraction(const FString& JsonString)
{
    // Log incoming message
    UE_LOG(LogPixelStreaming, Log, TEXT("UIInteraction: %s"), *JsonString);

    // Parse JSON
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(JsonString);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject))
    {
        UE_LOG(LogPixelStreaming, Warning, TEXT("Failed to parse JSON: %s"), *JsonString);
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
    if (Type == TEXT("tool_select"))
    {
        FString Tool;
        JsonObject->TryGetStringField(TEXT("tool"), Tool);
        OnToolSelect(Tool);
    }
    else if (Type == TEXT("training_control"))
    {
        FString Action;
        JsonObject->TryGetStringField(TEXT("action"), Action);
        OnTrainingControl(Action);
    }
    else if (Type == TEXT("camera_control"))
    {
        FString Preset;
        JsonObject->TryGetStringField(TEXT("preset"), Preset);
        OnCameraControl(Preset);
    }
    else if (Type == TEXT("explosion_control"))
    {
        double Level;
        if (JsonObject->TryGetNumberField(TEXT("level"), Level))
        {
            OnExplosionLevel(Level);
        }
        else
        {
            FString Action;
            JsonObject->TryGetStringField(TEXT("action"), Action);
            OnExplosionAction(Action);
        }
    }
    else if (Type == TEXT("question_answer"))
    {
        FString QuestionId;
        int32 TryCount;
        bool bIsCorrect;
        JsonObject->TryGetStringField(TEXT("questionId"), QuestionId);
        JsonObject->TryGetNumberField(TEXT("tryCount"), TryCount);
        JsonObject->TryGetBoolField(TEXT("isCorrect"), bIsCorrect);
        OnQuestionAnswer(QuestionId, TryCount, bIsCorrect);
    }
    // ... handle other types
}
```

## Sending Messages (C++)

```cpp
void AMyPixelStreamingHandler::SendTrainingProgress(float Progress, const FString& TaskName, const FString& Phase)
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
    IPixelStreamingModule& Module = IPixelStreamingModule::Get();
    Module.SendResponse(OutputString);
}

void AMyPixelStreamingHandler::SendQuestionRequest(const FString& QuestionId)
{
    TSharedPtr<FJsonObject> Json = MakeShareable(new FJsonObject());
    Json->SetStringField(TEXT("type"), TEXT("question_request"));
    Json->SetStringField(TEXT("questionId"), QuestionId);

    FString OutputString;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
    FJsonSerializer::Serialize(Json.ToSharedRef(), Writer);

    IPixelStreamingModule& Module = IPixelStreamingModule::Get();
    Module.SendResponse(OutputString);
}
```

---

# QUICK REFERENCE TABLE

## Web → UE5

| Category | Type | Key Fields |
|----------|------|------------|
| Training | `training_control` | action |
| Training | `start_from_task` | phaseIndex |
| Tools | `tool_select` | tool |
| Pipes | `pipe_select` | pipeType |
| Tasks | `task_start` | tool, pipeType? |
| Pressure | `test_plug_select` | plugType |
| Pressure | `pressure_test_start` | testType |
| Questions | `question_answer` | questionId, tryCount, isCorrect |
| Questions | `question_hint` | questionId |
| Questions | `question_close` | questionId |
| Camera | `camera_control` | preset |
| Explosion | `explosion_control` | level OR action |
| Waypoints | `waypoint_control` | action, index? |
| Layers | `layer_control` | action, index?, name? |
| Layers | `hierarchical_control` | action, groupName?, parentName?, childIndex? |
| Settings | `settings_control` | setting, (various) |
| App | `application_control` | action |

## UE5 → Web

| Category | Type | Key Fields |
|----------|------|------------|
| Training | `training_progress` | progress, taskName, phase, currentTask, totalTasks, isActive |
| Tools | `tool_change` | toolName |
| Tasks | `task_start` | toolName |
| Tasks | `task_completed` | taskId |
| Tasks | `task_complete` | (none) |
| Questions | `question_request` | questionId |
| Pressure | `pressure_test_result` | passed, pressure, testType |
| Explosion | `explosion_update` | value, isAnimating |
| Camera | `camera_update` | mode, perspective, distance, isTransitioning |
| Waypoints | `waypoint_list` | count, waypoints[] |
| Waypoints | `waypoint_update` | activeIndex, name, isActive, progress |
| Layers | `layer_list` | count, layers[] |
| Layers | `hierarchical_list` | count, groups[] |
| Settings | `fps_update` | fps |
| Settings | `setting_applied` | settingType, value, success |
| Error | `error` | code, details |

---

*Document generated: 2026-03-14*
