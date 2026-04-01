# Client Feedback - Unreal Engine 5 Issues

**Document Version:** 1.0
**Date:** 2026-03-30
**Project:** OP-Skillsim Plumbing Training Simulator

This document details issues identified that require fixes on the Unreal Engine 5 side. Each issue includes the client's description, expected behaviour, and technical notes for the UE5 development team.

---

## Table of Contents

1. [P1-01: Measurement Tool Has No Real Role](#p1-01-measurement-tool-has-no-real-role)
2. [P1-02: Phase 4 Guidance Indicators Not Clear](#p1-02-phase-4-guidance-indicators-not-clear)
3. [P1-03: Solvent Cement Only Applied to One Component](#p1-03-solvent-cement-only-applied-to-one-component)
4. [P1-04: Air Pressure Gauge Positioning & Test Outcomes](#p1-04-air-pressure-gauge-positioning--test-outcomes)
5. [P1-06: Pause Command Not Handled (Partial)](#p1-06-pause-command-not-handled-partial)
6. [P1-11: Mouse Controls Behave Incorrectly](#p1-11-mouse-controls-behave-incorrectly)
7. [P2-01: X-Ray Inspection Tool UX Issues](#p2-01-x-ray-inspection-tool-ux-issues)
8. [P2-02: Network/Graphics Settings Have No Effect](#p2-02-networkgraphics-settings-have-no-effect)

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

UE5 should parse these messages and execute the corresponding actions.

**Full protocol documentation:** See `app/lib/messageTypes.ts` in the web codebase.

---

## P1-01: Measurement Tool Has No Real Role

### Priority: P1 - Major
### Type: Behaviour Change
### Area: Phase 3 - Component Measurements

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

### Priority: P1 - Major
### Type: Behaviour Change/Guidance Improvement
### Area: Phase 4 - Pipe Assembly

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

1. **Replace static dots with animated Widget/Material:**
   ```
   - Use Material with panning/pulsing effect
   - Or use UMG Widget with animation
   - Consider particle system for subtle glow
   ```

2. **Add interaction detection:**
   - On hover: Expand indicator, show instruction text
   - On click: Play instruction audio, highlight component

3. **Implement step tracking:**
   - Track which fittings have been correctly placed
   - Update indicators to show completion state

### Design Guidelines
- Indicators should be clean, subtle, and consistent with overall UI design
- Should guide attention without being distracting
- Consider colour coding: blue for current step, green for completed, grey for upcoming

---

## P1-03: Solvent Cement Only Applied to One Component

### Priority: P1 - Major
### Type: Behaviour Change
### Area: Phase 5 - Glueing

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

2. **Animation sequence:**
   - Show brush/applicator moving to each component
   - Display glue material on both surfaces
   - Consider showing primer application if required by NZ standards

3. **Validation:**
   - Only allow connection after both surfaces have glue
   - If user tries to connect without both, show error/reminder

4. **Visual feedback:**
   - Glue texture/material on applied surfaces
   - Different visual states: no glue → glue applied → connected

### Industry Standard
Per plumbing best practices, solvent cement must be applied to both mating surfaces for proper joint integrity.

---

## P1-04: Air Pressure Gauge Positioning & Test Outcomes

### Priority: P1 - Major
### Type: Behaviour Change/UI Adjustment
### Area: Phase 6 - Air Pressure Test

### Client Description
1. The air pressure gauge is positioned in the lower right corner where it becomes partially hidden under the web UI settings drawer panel.
2. This step currently allows only a successful outcome - no possibility for failure.

### Expected Behaviour

**Gauge positioning:**
- Reposition gauge so it remains clearly visible and unobstructed
- Should be easy to read and visually connected to the testing activity
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

1. **Reposition gauge widget:**
   - Move from lower-right to avoid web UI overlap
   - Suggested positions: upper-left, upper-center, or floating near test equipment
   - Ensure gauge is readable at all resolutions

2. **Implement failure conditions:**
   ```
   Failure scenarios to implement:
   - Air plug not inserted: Cannot start test
   - Poor connection: Pressure drops below threshold
   - Wrong plug type: Test fails with specific message
   - Timeout: If pressure not maintained for required duration
   ```

3. **Add guidance indicators:**
   - Same animated markers as Phase 4
   - Highlight: air plug location, pump, gauge
   - Provide instruction on hover/click

4. **Feedback messages:**
   ```
   Success: "Pressure test passed - 20 PSI maintained for 3 minutes"
   Failure: "Pressure test failed - leak detected at [location]"
   ```

### NZ Standard Reference
Per NZS3500, a successful air pressure test requires maintaining 20 PSI for the specified duration.

---

## P1-06: Pause Command Not Handled (Partial)

### Priority: P1 - Major
### Type: Bug/Behaviour Issue
### Area: Training Control

### Client Description
The pause option is present but selecting it does not actually pause the training. Gameplay continues running in the background.

### Technical Notes

**Messages sent from web:**
```
training_control:pause
training_control:resume
```

**Required UE5 changes:**

1. **Implement pause handler:**
   ```cpp
   void HandleTrainingControl(FString Action)
   {
       if (Action == "pause")
       {
           // Pause all training activities
           // Stop timers
           // Pause animations
           // Disable user interaction with training elements
           // Keep camera controls active for viewing
       }
       else if (Action == "resume")
       {
           // Resume all paused activities
           // Restart timers
           // Resume animations
           // Re-enable interactions
       }
   }
   ```

2. **Pause state management:**
   - Track paused state in game instance
   - Pause phase timers
   - Pause any countdown timers
   - Consider visual indication (slight desaturation, "PAUSED" overlay)

3. **Send confirmation back to web:**
   ```
   training_paused:true
   training_resumed:true
   ```

### Note
The web application correctly sends pause/resume messages. The issue is that UE5 doesn't process them.

---

## P1-11: Mouse Controls Behave Incorrectly

### Priority: P1 - Major
### Type: Bug/Behaviour Issue
### Area: Navigation/Mouse Controls

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
   // In camera controller, check for inverted input
   // Current (wrong):
   CameraLocation -= InputDelta;

   // Correct:
   CameraLocation += InputDelta;

   // Or check project settings for Mouse Invert options
   ```

2. **Fix or disable mouse wheel press/drag:**
   ```cpp
   // Option A: Disable middle mouse drag
   if (InputAction == MiddleMouseDrag)
   {
       return; // Ignore
   }

   // Option B: Implement predictable behaviour
   // Use for orbit or define consistent pan behaviour
   ```

3. **Add camera boundaries:**
   ```cpp
   // Clamp camera position to valid bounds
   FVector ClampedLocation = FMath::Clamp(
       NewLocation,
       MinBounds,
       MaxBounds
   );
   ```

4. **Check Pixel Streaming settings:**
   - Verify input mapping in Pixel Streaming config
   - Check for any input scaling/inversion settings

### Testing
- Test with standard mouse
- Test with different DPI settings
- Verify behaviour matches on-screen navigation instructions

---

## P2-01: X-Ray Inspection Tool UX Issues

### Priority: P2 - Improvement
### Type: Improvement
### Area: Phase 2 - Site Inspection (X-Ray)

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
   ```
   Current: Basic UE5 slider with minimal styling
   Required:
   - Higher contrast/visibility
   - Larger hit area for easier interaction
   - Visual feedback on hover/drag
   - Label showing percentage or layer name
   ```

3. **Layer control:**
   - Independent toggles for different layers (pipes, ground, structure)
   - Gradual fade in/out rather than instant toggle
   - Consider radial menu for quick layer access

4. **Guidance indicators:**
   - Highlight inspection points
   - Show "inspect here" prompts
   - Provide instruction text for what to look for

5. **Timing:**
   - Remove or extend time limit
   - Allow learner to explore at their own pace
   - Clear indication of what needs to be found before progression

### Design Goals
- Make site inspection phase clearer and more engaging
- Help learners understand pipe layout before proceeding
- Match UI style of other tools in the application

---

## P2-02: Network/Graphics Settings Have No Effect

### Priority: P2 - Improvement
### Type: Improvement
### Area: Settings UI Panel - Network/Graphics

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

1. **Implement graphics quality handler:**
   ```cpp
   void HandleGraphicsQuality(FString Quality)
   {
       if (Quality == "Low")
       {
           // Reduce shadow quality
           // Lower texture resolution
           // Disable ambient occlusion
           // Reduce particle counts
       }
       else if (Quality == "Epic")
       {
           // Maximum settings
       }

       // Apply scalability settings
       Scalability::SetQualityLevel(QualityLevel);
   }
   ```

2. **Implement bandwidth handler:**
   ```cpp
   void HandleBandwidth(FString Option)
   {
       // Adjust Pixel Streaming encoder settings
       // Lower bandwidth = lower bitrate/resolution
       PixelStreamingSettings->SetEncoderBitrate(Bitrate);
       PixelStreamingSettings->SetFrameRate(TargetFPS);
   }
   ```

3. **Send confirmation back to web:**
   ```
   setting_applied:graphics_quality:High:true
   setting_applied:bandwidth:Auto:true
   ```

4. **Visual feedback:**
   - Brief notification when setting is applied
   - Visible quality difference between Low and Epic
   - FPS counter to show performance impact

### Expected Outcomes

| Setting | Expected Effect |
|---------|-----------------|
| Graphics: Low | Reduced shadows, lower textures, better FPS |
| Graphics: Epic | Full quality, shadows, reflections |
| Bandwidth: Low | Lower resolution stream, reduced latency |
| Bandwidth: High | Full resolution stream, higher quality |

---

## Summary: UE5 Changes Required

| Issue | Component | Priority | Effort |
|-------|-----------|----------|--------|
| P1-01 | Measurement Tool | Major | Medium |
| P1-02 | Guidance System | Major | Medium |
| P1-03 | Glue Application | Major | Low |
| P1-04 | Pressure Test | Major | Medium |
| P1-06 | Pause Handler | Major | Low |
| P1-11 | Camera Controller | Major | Medium |
| P2-01 | X-Ray Tool | Improvement | High |
| P2-02 | Settings Handler | Improvement | Medium |

---

## Message Protocol Quick Reference

### Web → UE5 Messages

| Message | Format | Example |
|---------|--------|---------|
| Training Control | `training_control:action` | `training_control:pause` |
| Tool Select | `tool_select:ToolName` | `tool_select:Measuring` |
| Pipe Select | `pipe_select:PipeType` | `pipe_select:y-junction` |
| Test Plug | `test_plug_select:PlugType` | `test_plug_select:AirPlug` |
| Pressure Test | `pressure_test_start:TestType` | `pressure_test_start:air_test` |
| Camera Control | `camera_control:Action` | `camera_control:reset` |
| Settings | `settings_control:type:value` | `settings_control:graphics_quality:High` |

### UE5 → Web Messages

| Message | Format | Example |
|---------|--------|---------|
| Training Progress | `training_progress:progress:task:phase:current:total:active` | `training_progress:75:Measuring:3:3:6:true` |
| Task Completed | `task_completed:TaskId` | `task_completed:MEASURING` |
| Pressure Result | `pressure_test_result:passed:pressure:type` | `pressure_test_result:true:20:air_test` |
| Setting Applied | `setting_applied:type:value:success` | `setting_applied:graphics_quality:High:true` |

---

## Testing Checklist

After implementing fixes, verify:

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
