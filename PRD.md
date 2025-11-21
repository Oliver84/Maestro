Product Requirements Document (PRD)

Maestro Show Control

Author: Oliver Acevedo

Date: May 22, 2025

Version: 2.0 (Final Architecture)

Status: Ready for Development

1. Executive Summary

Maestro is a standalone show control and audio playout application for macOS and Windows. It replaces the traditional "QLab + OSC Bridge" setup by integrating audio playback directly into the control application.

Designed for live production (church services), it allows a single operator to trigger backing tracks and lighting/audio console automation (Behringer X32) simultaneously with a single keypress.

2. User Personas

The Tech Director (Oliver): Needs a robust, engineered solution. Wants to route audio specifically to the X32 USB Card to separate tracks from system sounds.

The Volunteer: Needs a "foolproof" interface. They hit Spacebar to go, ESC to panic. They do not need to know how routing works.

3. Hardware Topology

Computer: MacBook Pro (running Maestro).

Control Connection: Ethernet cable to X32 (for OSC commands).

Audio Connection: USB cable to X-USB Expansion Card (for Audio playback).

4. Core Features

4.1 The Cue List

The application manages a linear list of cues. Each cue triggers two actions simultaneously:

Audio Playback: Plays a specific audio file (.wav/.mp3) to the selected USB output.

Console Automation: Sends an OSC command to the X32 (e.g., unmute channel, load snippet).

4.2 Audio Engine

Format Support: WAV, MP3, AAC.

Device Selection: User must be able to select a specific output device (e.g., "Behringer X-USB") independent of the OS default output.

Transport: Play, Stop, Fade Out (Panic).

Buffering: Files must be pre-loaded or streamed efficiently to ensure <10ms start latency.

4.3 X32 Integration (OSC)

Transport: UDP via Port 10023.

Commands: Support for Scenes, Snippets, Faders, and Mutes.

Quick Mixer: A "Sidebar" mixer allowing real-time control of 4-8 user-defined channels (e.g., Vocals, Keys, Tracks) without switching apps.

4.4 User Interface

Dashboard: High-contrast view of "Current" vs "Next" cue.

Waveform View: Visual confirmation that audio is loaded and playing.

Navigation:

Spacebar: GO (Fire Next).

Arrow Up/Down: Select Next (Skip/Pre-select).

ESC: Panic (Fade out audio & Stop).

5. User Flow (Sunday Service)

Setup: Oliver connects USB & Ethernet. Opens Maestro. In Settings, selects "Output: X-USB".

Sound Check: Oliver drags "Song 1.mp3" into Cue 2.

Service Start: Volunteer hits Spacebar on Cue 1.

Action: App sends /action/gosnippet 1 (House Lights/Mutes).

Action: App plays "Pad_Drone.mp3" via USB Ch 1-2.

Transition: Volunteer hits Spacebar on Cue 2.

Action: App crossfades Pad out.

Action: App plays "Song 1.mp3" via USB Ch 1-2.

Action: App sends /ch/01/mix/on 1 (Unmutes Vocal).

6. Non-Functional Requirements

Stability: Audio must not glitch if the UI is resized or clicked.

Persistance: Show files (Cue list + file paths) must be saveable to JSON.