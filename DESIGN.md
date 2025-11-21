High Level Design (HLD)

Maestro Show Control

Author: Oliver Acevedo

Date: May 22, 2025

Status: Approved for Development

1. System Architecture

Maestro utilizes the Electron multi-process architecture to ensure audio stability. The critical distinction is that the Audio Engine and Network I/O must not block the UI Thread.

1.1 Process Separation

graph TD
    subgraph "Main Process (Node.js)"
        Main[Electron Main]
        Menu[Native Menus]
        Window[Window Manager]
        OSC[OSC Service (UDP)]
    end

    subgraph "Renderer Process (React)"
        UI[React App]
        Store[Zustand Store]
        Audio[Howler.js Engine]
    end

    subgraph "Hardware"
        X32[X32 Console]
        USB[X-USB Card]
    end

    Main -->|IPC: window-ready| UI
    UI -->|IPC: osc-send| OSC
    OSC -->|UDP: 10023| X32
    
    UI -->|Web Audio API| Audio
    Audio -->|Sink ID Routing| USB


Design Decision:

Audio in Renderer: We will run Howler.js in the Renderer process. While running it in the Main process is possible, keeping it in the Renderer allows for easier visualisations (Waveforms) via the Web Audio AnalyserNode without complex IPC stream serialization.

OSC in Main: Network sockets are best managed in the Node.js Main process to persist connections even if the renderer refreshes/crashes, and to avoid CORS/Browser security sandbox issues.

2. Component Hierarchy (Frontend)

We will use a "Layout-Page-Feature" structure. The application is single-window, so App.tsx acts as the layout controller.

classDiagram
    class App {
        +Header
        +MainWorkspace
    }
    class Header {
        +ConnectionStatus
        +AudioDeviceSelector
        +SettingsModal
    }
    class MainWorkspace {
        +Dashboard (Left)
        +Sidebar (Right)
    }
    class Dashboard {
        +NextCueCard
        +ActiveCueDisplay
        +TransportControls
    }
    class ActiveCueDisplay {
        +AudioWaveform (Canvas)
    }
    class Sidebar {
        +CueList
        +QuickMixer
        +LogConsole
    }
    class CueList {
        +CueRow[] (Virtualized)
    }
    class QuickMixer {
        +FaderStrip[]
    }

    App *-- Header
    App *-- MainWorkspace
    MainWorkspace *-- Dashboard
    MainWorkspace *-- Sidebar
    Dashboard *-- NextCueCard
    Dashboard *-- ActiveCueDisplay
    Dashboard *-- TransportControls
    Sidebar *-- CueList
    Sidebar *-- QuickMixer
    Sidebar *-- LogConsole


3. Data Flow & State Management

We will use Zustand for global state. It provides a simpler mental model than Redux and allows transient state (like fast fader moves) to live outside the React render cycle via subscriptions if needed (optimization).

3.1 The "GO" Trigger Flow

sequenceDiagram
    participant User
    participant UI as React UI
    participant Store as Zustand Store
    participant Audio as Audio Engine
    participant IPC as Electron IPC
    participant X32 as X32 Console

    User->>UI: Presses Spacebar
    UI->>Store: fireSelectedCue()
    
    rect rgb(30, 40, 50)
        Note right of Store: ACTION BEGINS
        Store->>Store: Update activeCueId
        Store->>Store: Advance selectedCueId
    end

    par Audio Trigger
        Store->>Audio: play(file, deviceId)
        Audio-->>User: Sound Output
    and OSC Trigger
        Store->>IPC: send('osc-message', address, args)
        IPC->>X32: UDP Packet
    end


4. Design System (UI/UX)

The interface must be Dark Mode only to prevent screen glow in a dim production booth.

4.1 Color Palette (Tailwind)

Surface / Background: slate-950 (Main), slate-900 (Panels), slate-800 (Borders).

Primary Action (GO): emerald-500 (Normal), emerald-400 (Hover), emerald-600 (Active).

Destructive / Panic: red-900 (Background), red-500 (Text/Icon).

OSC Data: cyan-400.

Audio Data: emerald-400 or violet-400.

4.2 Typography

Headings / Cues: Inter or system sans-serif. Heavy weights (Bold/Black) for legibility.

Data / Logs / Time: JetBrains Mono or Fira Code. Monospace is essential for tabular cue lists and logs.

4.3 Layout Grid

Sidebar Width: Fixed 384px (Tailwind w-96). Ensures cue titles don't wrap aggressively.

Main Content: flex-1 (Takes remaining space).

Touch Targets: All buttons must be min 44px height for easy clicking/tapping.

5. Data Persistence Strategy

We need to save the show.json file.

Format: JSON.

Location: User defined (Save As...).

Auto-save: We will implement a "debounce" saver that writes to a temp file every 30 seconds if changes are made, preventing data loss during a crash.

// Store Interface
interface AppState {
  cues: Cue[];
  settings: AppSettings;
  setAudioDevice: (id: string) => void;
  setX32Ip: (ip: string) => void;
  addCue: (cue: Cue) => void;
  updateCue: (id: string, data: Partial<Cue>) => void;
  reorderCues: (fromIndex: number, toIndex: number) => void; // DnD logic
}
