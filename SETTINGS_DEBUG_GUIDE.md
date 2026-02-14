# Settings Debug Guide

Complete guide for testing all `settings_control` features in OP SkillSim.

---

## 🎯 Quick Start

### Method 1: Debug Panel (Recommended)

1. **Start the app** and connect to the stream
2. **Press `Ctrl + Shift + D`** to open the Settings Debug Panel
3. **Click "Run All Tests"** to test everything at once
4. **Check browser console** for detailed logs

### Method 2: Manual Testing via Sidebar

1. Open the **Unified Sidebar** (press `M` key)
2. Navigate to **Settings** and **System** tabs
3. Test each control:
   - Audio sliders (Master, Ambient, SFX)
   - Graphics quality buttons
   - Resolution buttons
   - Network quality buttons
   - FPS toggle

### Method 3: Browser Console Commands

Open browser console (F12) and run:

```javascript
// Test resolution
window.emitUIInteraction('settings_control:resolution:1920:1080')

// Test graphics
window.emitUIInteraction('settings_control:graphics_quality:High')

// Test audio
window.emitUIInteraction('settings_control:audio_volume:Master:0.8')

// Test FPS
window.emitUIInteraction('settings_control:fps_tracking:start')
```

---

## 📋 Feature Checklist

### ✅ Audio Volume (WORKING)
- [x] Master volume (0.0 - 1.0)
- [x] Ambient volume (0.0 - 1.0)
- [x] SFX volume (0.0 - 1.0)
- [x] Audio enable/disable toggle

**Test:**
```
settings_control:audio_volume:Master:0.8
settings_control:audio_volume:Ambient:0.6
settings_control:audio_volume:SFX:0.9
```

**Expected Response:**
```
setting_applied:audio_volume:Master:0.8:success
```

---

### 🖥️ Resolution Control

**Test:**
```
settings_control:resolution:1920:1080  (1080p)
settings_control:resolution:1280:720   (720p)
settings_control:resolution:2560:1440  (1440p)
settings_control:resolution:3840:2160  (4K)
```

**Expected Response:**
```
setting_applied:resolution:1920x1080:true
```

**UI Location:** Sidebar > System tab > Resolution section

---

### 🎮 Graphics Quality

**Test:**
```
settings_control:graphics_quality:Low
settings_control:graphics_quality:Medium
settings_control:graphics_quality:High
settings_control:graphics_quality:Epic
```

**Expected Response:**
```
setting_applied:graphics_quality:High:true
```

**UI Location:** Sidebar > Settings tab > Graphics Quality section

---

### 🌐 Network/Bandwidth Quality

**Test:**
```
settings_control:bandwidth:Auto
settings_control:bandwidth:Low Quality
settings_control:bandwidth:Medium Quality
settings_control:bandwidth:High Quality
```

**Expected Response:**
```
setting_applied:bandwidth:High Quality:true
```

**UI Location:** Sidebar > System tab > Network Quality section

---

### 📊 FPS Tracking

**Test:**
```
settings_control:fps_tracking:start
settings_control:fps_tracking:stop
```

**Expected Responses:**
```
setting_applied:fps_tracking:start:true
fps_update:62.4
fps_update:58.1
...
```

**UI Location:** Sidebar > System tab > Performance > Show FPS toggle

**Note:** When FPS tracking is active, you should receive `fps_update:XX.X` messages every 0.5 seconds.

---

### 📋 Get Options Request

**Test:**
```
settings_control:get_options:request
```

**Expected Response:**
```
settings_options:resolutions:1920x1080,1280x720,2560x1440:graphics:Low,Medium,High,Epic:audio:Master,Ambient,SFX:bandwidth:Auto,Low Quality,Medium Quality,High Quality
```

---

## 🔍 Enhanced Logging

All settings messages are now logged with enhanced detail:

### Outgoing Messages (Web → UE5)
```
📤 [Settings] Sending to UE5: settings_control:resolution:1920:1080
```

### Incoming Messages (UE5 → Web)
```
📥 [Settings] Received from UE5: setting_applied resolution:1920x1080:true
✅ Setting resolution: 1920x1080 APPLIED | Raw: resolution:1920x1080:true
```

### FPS Updates
```
📊 FPS Update: 62.4
```

### Options Response
```
📋 Settings options received: resolutions:1920x1080,1280x720...
📋 Parsed data: {category: 'resolutions', options: [...]}
```

---

## 🐛 Known Issues & Fixes

### Issue #1: Audio Messages Using 'success' Instead of 'true' ✅ FIXED

**Problem:** UE5 sends `success` but documentation says `true`

**Fix Applied:** Message parser now accepts both:
```typescript
success: parts[2] === 'true' || parts[2] === 'success'
```

**Location:** `app/lib/messageTypes.ts:527-548`

---

### Issue #2: Audio Volume Has 4 Parts Instead of 3 ✅ FIXED

**Problem:** Audio messages have format `audio_volume:Group:Value:Status` (4 parts)

**Fix Applied:** Special handling for audio_volume messages:
```typescript
if (settingType === 'audio_volume') {
  const group = parts[1]
  const volumeValue = parts[2]
  const status = parts[3]
  return {
    settingType,
    value: `${group}:${volumeValue}`,
    success: status === 'success' || status === 'true'
  }
}
```

**Location:** `app/lib/messageTypes.ts:532-541`

---

### Issue #3: Audio Not Playing ✅ FIXED

**Problem:** Browser autoplay policy + video element muted

**Fix Applied:**
1. Merge audio tracks from `audioStream` to video element
2. Unmute video element on connection
3. Add user interaction listeners for browsers that block autoplay

**Location:** `app/components/StreamingApp.tsx:162-217`

---

## 🧪 Debug Panel Features

The Settings Debug Panel (`Ctrl + Shift + D`) provides:

1. **Quick Test Buttons** - One-click testing of common settings
2. **Run All Tests** - Comprehensive test suite
3. **Test History** - View all sent messages
4. **Status Indicators** - Visual feedback (Sent/Success/Failed)
5. **Console Integration** - Detailed logs in browser console

---

## 📊 Expected Console Output (Full Test)

When you run all tests, you should see:

```
🧪 Running all settings tests...
📤 [Settings] Sending to UE5: settings_control:resolution:1920:1080
📥 [Settings] Received from UE5: setting_applied resolution:1920x1080:true
✅ Setting resolution: 1920x1080 APPLIED | Raw: resolution:1920x1080:true

📤 [Settings] Sending to UE5: settings_control:graphics_quality:High
📥 [Settings] Received from UE5: setting_applied graphics_quality:High:true
✅ Setting graphics_quality: High APPLIED | Raw: graphics_quality:High:true

📤 [Settings] Sending to UE5: settings_control:audio_volume:Master:0.8
📥 [Settings] Received from UE5: setting_applied audio_volume:Master:0.8:success
✅ Setting audio_volume: Master:0.8 APPLIED | Raw: audio_volume:Master:0.8:success

📤 [Settings] Sending to UE5: settings_control:fps_tracking:start
📥 [Settings] Received from UE5: setting_applied fps_tracking:start:true
✅ Setting fps_tracking: start APPLIED | Raw: fps_tracking:start:true
📊 FPS Update: 62.4
📊 FPS Update: 59.8
...
```

---

## 🚨 Troubleshooting

### No Response from UE5

**Check:**
1. Stream is connected (`stream.isConnected === true`)
2. `emitter` exists and is functional
3. UE5 application is listening for `settings_control` messages
4. Message format exactly matches documentation

**Debug:**
```javascript
// Check connection
console.log('Connected:', stream.isConnected)
console.log('Emitter:', stream.emitter)

// Send test message
window.emitUIInteraction('settings_control:get_options:request')
```

---

### Messages Sent but Not Parsed

**Check browser console for:**
- `📤 [Settings] Sending to UE5:` - Message sent
- `📥 [Settings] Received from UE5:` - Message received
- `❌ Setting X: Y FAILED` - Parse error

**Common causes:**
1. Message format mismatch
2. Parser not handling message type
3. Response timeout

---

### UI Not Updating

**Check:**
1. Settings callbacks are connected: `settingsCallbacks` prop in `UnifiedSidebar`
2. State is updating: Check React DevTools
3. Re-render is triggered: Look for state changes

**Debug:**
```javascript
// Check settings state
console.log(settings.settings)
```

---

## 📝 Implementation Files

### Core Files
- **Message Types:** `app/lib/messageTypes.ts`
- **Settings Hook:** `app/features/settings/hooks/useSettings.ts`
- **Integration:** `app/components/StreamingApp.tsx`
- **UI (Sidebar):** `app/components/ControlPanel/UnifiedSidebar.tsx`

### Debug Tools
- **Debug Panel:** `app/features/settings/components/SettingsDebugPanel.tsx`
- **Debugger Utility:** `app/features/settings/utils/settingsDebugger.ts`

---

## ✅ Summary

**Implemented Features:**
- ✅ Audio volume (Master, Ambient, SFX)
- ✅ Graphics quality (Low, Medium, High, Epic)
- ✅ Resolution (720p, 1080p, 1440p, 4K)
- ✅ Bandwidth (Auto, Low, Medium, High Quality)
- ✅ FPS tracking (start/stop)
- ✅ Get options request
- ✅ Enhanced logging
- ✅ Debug panel
- ✅ Message parser with special handling for audio

**All features are implemented and ready for testing!**

---

## 🎯 Next Steps

1. **Test in UE5:** Verify UE5 application responds to all messages
2. **Verify UI Updates:** Ensure sidebar controls trigger correct messages
3. **Check Responses:** Confirm all `setting_applied` responses are received
4. **Performance Test:** Monitor FPS updates when tracking is enabled
5. **Integration Test:** Test settings during active training session

---

**Last Updated:** 2026-02-13
**Version:** 1.0.0
