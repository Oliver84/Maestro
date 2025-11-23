# Testing Guide for Maestro Enhancements

## 🧪 Quick Test Checklist

### 1. Toast Notifications ✅
**How to Test:**
1. Press `Space` to fire a cue
   - **Expected**: Green toast saying "GO: [Cue Name]"
2. Press `↓` to select next cue
   - **Expected**: Amber toast saying "Next cue selected"
3. Press `↑` to select previous cue
   - **Expected**: Amber toast saying "Previous cue selected"
4. Press `Esc` to panic
   - **Expected**: Red toast saying "PANIC - All audio stopped"

**Status**: Should see toast notifications in top-right corner

---

### 2. Keyboard Shortcuts Overlay ✅
**How to Test:**
1. Press `?` (Shift + /)
   - **Expected**: Modal overlay appears showing all shortcuts
2. Press `Esc` or click X to close
   - **Expected**: Modal disappears

**Status**: Should see beautiful shortcuts reference

---

### 3. Performance Overlay ✅
**How to Test:**
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - **Expected**: Performance metrics panel appears in top-left
2. Observe metrics updating in real-time:
   - FPS (should be ~60)
   - Memory usage (if available)
   - Audio latency (should be <30ms)
   - OSC connection status
   - Cache statistics
3. Press `Cmd+Shift+P` again to hide

**Status**: Should see live performance data

---

### 4. Audio Pre-buffering ⚡
**How to Test:**
1. Add a cue with an audio file
2. Select the cue (click or arrow keys)
   - **Expected**: Console log "Preloading: [file path]"
   - **Expected**: Console log "Preloaded successfully: [file path]"
3. Fire the cue with Space
   - **Expected**: Audio starts instantly (<10ms)
   - **Expected**: No delay or loading time

**Check Console:**
```
[Audio Engine] Preloading: media://...
[Audio Engine] Preloaded successfully: media://...
```

**Status**: Audio should start immediately

---

### 5. Waveform Caching 🎵
**How to Test:**
1. Fire a cue with audio
   - **Expected**: Waveform generates (first time)
   - **Expected**: Console log "Generated points: 300"
2. Navigate away and back to the same cue
   - **Expected**: Console log "Using cached waveform"
   - **Expected**: Instant waveform display (no regeneration)

**Check Console:**
```
First view: [WaveformVisualizer] Generated points: 300
Second view: [WaveformVisualizer] Using cached waveform
```

**Status**: Waveforms should load instantly on repeat views

---

### 6. Time Display & Seeking 🕐
**How to Test:**
1. Fire a cue with audio
2. Look at the Active Cue Display
   - **Expected**: See elapsed time (e.g., "0:15")
   - **Expected**: See remaining time (e.g., "-2:45")
   - **Expected**: See full waveform with progress
3. Click anywhere on the waveform
   - **Expected**: Audio seeks to that position
   - **Expected**: Time updates immediately

**Status**: Should see MM:SS format for both elapsed and remaining

---

### 7. READY Indicator 🟢
**How to Test:**
1. Select any cue
2. Look at the GO button
   - **Expected**: See pulsing green dot
   - **Expected**: See "READY" badge in top-left
   - **Expected**: Badge has glassmorphism effect

**Status**: Visual confirmation that cue is ready to fire

---

### 8. Cache Statistics 📊
**How to Test:**
1. Open Performance Overlay (`Cmd+Shift+P`)
2. Add and select multiple cues
3. Watch cache stats update:
   - **Preloaded**: Number of pre-buffered audio files
   - **Buffers**: Number of cached audio buffers
   - **Waveforms**: Number of cached waveform data
   - **Playing**: Number of currently playing sounds

**Status**: Should see numbers increment as you use the app

---

## 🎯 Advanced Testing

### Test Pre-buffering Performance
1. Create a show with 10+ cues with audio
2. Navigate through cues with arrow keys
3. Fire each cue with Space
4. **Expected**: Every cue starts instantly (no loading delay)

### Test Cache Cleanup
1. Add 60+ cues with audio (exceeds MAX_CACHE_SIZE of 50)
2. Navigate through all cues
3. Check Performance Overlay
4. **Expected**: Cache size stays at ~50 (oldest removed)

### Test Waveform Caching
1. Fire a cue with audio
2. Wait for waveform to generate
3. Navigate to different cue
4. Navigate back to first cue
5. **Expected**: Waveform appears instantly (cached)

### Test Toast Notifications
1. Rapidly press Space, ↑, ↓, Esc
2. **Expected**: Multiple toasts stack vertically
3. **Expected**: Each toast auto-dismisses after duration
4. **Expected**: Can manually dismiss with X button

---

## 🐛 Known Issues to Watch For

### Potential Issues:
1. **Memory Growth**: Monitor memory usage over long sessions
   - Check Performance Overlay
   - Should stay under 250MB for typical shows

2. **Cache Misses**: If you see repeated "Generating waveform" logs
   - Check if file paths are consistent
   - Verify cache isn't being cleared prematurely

3. **Pre-buffer Failures**: If audio doesn't start instantly
   - Check console for "Failed to preload audio" errors
   - Verify file paths are correct

---

## ✅ Success Criteria

### All Features Working:
- [ ] Toast notifications appear on all actions
- [ ] Keyboard shortcuts overlay opens with `?`
- [ ] Performance overlay opens with `Cmd+Shift+P`
- [ ] Audio starts instantly when pre-buffered
- [ ] Waveforms load instantly when cached
- [ ] Time display shows elapsed and remaining
- [ ] Seeking works on waveform click
- [ ] READY indicator pulses on GO button
- [ ] Cache statistics update in real-time
- [ ] No console errors

### Performance Targets:
- [ ] FPS stays at 60 (check overlay)
- [ ] Audio latency < 30ms (check overlay)
- [ ] Memory usage < 250MB (check overlay)
- [ ] Audio start latency < 10ms (pre-buffered)
- [ ] Waveform cache hit rate > 80%

---

## 🎬 Demo Scenario

**Complete User Flow:**
1. Open Maestro
2. Press `?` to see shortcuts → Close
3. Press `Cmd+Shift+P` to see performance → Leave open
4. Add a cue with audio
5. Select the cue (watch "Preloading" in console)
6. Press Space to fire (watch toast, instant playback)
7. Watch waveform and time display update
8. Click on waveform to seek
9. Press ↓ to select next cue (watch toast)
10. Press Esc to panic (watch toast)
11. Check Performance Overlay for cache stats

**Expected Result**: Everything works smoothly with visual feedback at every step!

---

## 📝 Console Commands for Testing

### Check Cache Stats:
```javascript
// Open browser console and run:
window.AudioEngine = await import('./src/services/AudioEngine.ts');
AudioEngine.AudioEngine.getCacheStats();
```

### Clear Caches:
```javascript
AudioEngine.AudioEngine.clearCaches();
```

### Manual Pre-buffer:
```javascript
await AudioEngine.AudioEngine.preloadAudio('/path/to/audio.mp3');
```

---

**Happy Testing! 🚀**

If you encounter any issues, check:
1. Browser console for errors
2. Performance Overlay for metrics
3. Network tab for failed requests
4. React DevTools for component state
