# Architectural Decisions

## 001 — No database
**Decision:** No Supabase, no persistence. One-time sessions only.
**Why:** Keep scope tiny for v1. Can add later.

## 002 — ElevenLabs for TTS
**Decision:** Use ElevenLabs over browser speechSynthesis.
**Why:** Voice quality is critical for the "coach" experience.

## 003 — Web Speech API for STT
**Decision:** Use browser-native speech recognition, no paid STT service.
**Why:** Free, good enough for English. Text fallback covers unsupported browsers.

## 004 — Phase-based system prompts
**Decision:** The AI system prompt changes per Ikigai circle.
**Why:** Keeps the AI focused on one domain at a time. Frontend controls transitions.
