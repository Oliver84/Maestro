Technical Specifications: Maestro Show Control

1. Technology Stack

Runtime: Electron (v28+).

Frontend: React 18, Tailwind CSS.

State Management: Zustand (Store for Cues, Active State, Audio Device ID).

Audio Engine: Howler.js (Web Audio API wrapper).

Why: Excellent cross-platform support, HTML5 Audio fallback, spatial support (future proof), and supports "Sink ID" selection for output routing.

OSC Layer: node-osc (UDP).

2. System Architecture

2.1 Hardware Diagram

graph TD
    subgraph MacBook Pro
        App[Maestro App]
        AudioEngine[Web Audio API]
        OSCEngine[UDP Socket]
    end
    
    subgraph X32 Console
        XUSB[X-USB Card]
        Core[X32 Core CPU]
    end
    
    App -->|File Stream| AudioEngine
    AudioEngine -->|USB Cable (Audio)| XUSB
    
    App -->|Command String| OSCEngine
    OSCEngine -->|Ethernet (UDP)| Core


2.2 Data Models

Show File (show.json)

interface ShowFile {
  version: string;
  settings: {
    x32Ip: string;
    audioDeviceId: string; // System ID for "X-USB"
    quickMixChannels: MixerChannel[];
  };
  cues: Cue[];
}

interface Cue {
  id: string;
  sequence: number;
  title: string;
  // Automation
  oscCommand: string; // "/action/gosnippet 1"
  // Audio
  audioFilePath: string; // Absolute path
  audioVolume: number;   // 0.0 - 1.0
  // UI
  color?: string;
}


3. Implementation Details

3.1 Audio Output Routing (The Critical Part)

Electron/Chrome allows selecting the output device via HTMLMediaElement.setSinkId(deviceId).

Steps to Implement:

List Devices: Use navigator.mediaDevices.enumerateDevices() to find devices kind === 'audiooutput'.

Filter: Look for labels containing "X-USB", "X-LIVE", "USB Audio", or "CoreAudio".

Select: Store the deviceId in App State.

Apply: When initializing Howler.js, pass the sink ID (or use vanilla AudioContext destination).

Note: Howler v2.2.4 added html5: true support for sinkId, or you can manually connect the context destination.

3.2 The "Go" Logic (Spacebar)

const fireCue = async (cue) => {
  // 1. Audio
  if (cue.audioFilePath) {
    // Fade out previous if running?
    audioEngine.fade(1.0, 0.0, 500, lastCueId); 
    // Start new
    audioEngine.play(cue.audioFilePath, { deviceId: settings.audioDeviceId });
  }

  // 2. OSC
  if (cue.oscCommand) {
    oscClient.send(cue.oscCommand);
  }
  
  // 3. Update UI
  set({ activeCueId: cue.id });
}


3.3 Panic Logic (ESC)

Audio: audioEngine.fade(currentVol, 0, 300) then stop().

OSC (Optional): You might want to send a "Mute All" snippet to X32, or just kill the audio stream. For MVP, just killing the audio stream is safer than messing with the console state.

3.4 Quick Mixer (OSC Throttling)

Problem: React slider events fire every pixel. Sending 100 OSC packets/sec will choke the X32 UDP buffer.

Solution: Use lodash.throttle or a custom hook to limit OSC sends to one message every ~50ms.

4. Development Phases

Phase 1 (Hello World): Electron boilerplate. Connect to X32 IP. Send one Ping.

Phase 2 (Audio): Build the "Settings" page to select Audio Output. Verify you can play a sound to the X32 USB card.

Phase 3 (Engine): Build the Cue List data structure. Implement Spacebar "Next" logic.

Phase 4 (Quick Mix): Add the fader side-panel.

Phase 5 (Packaging): Build .dmg (Mac) and .exe (Win).