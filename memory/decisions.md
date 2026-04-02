# Architectural Decisions

## 001 — No database
**Decision:** No Supabase, no persistence. One-time sessions only.
**Why:** Keep scope tiny for v1. Can add later.

## 002 — ElevenLabs for TTS (superseded by 005)
**Decision:** Use ElevenLabs over browser speechSynthesis.
**Why:** Voice quality is critical for the "coach" experience.

## 003 — Web Speech API for STT
**Decision:** Use browser-native speech recognition, no paid STT service.
**Why:** Free, good enough for English. Text fallback covers unsupported browsers.

## 005 — Switched from ElevenLabs to Gradium for TTS
**Decision:** Replace ElevenLabs with Gradium as the TTS provider.
**Why:** Gradium is a French company (ex-DeepMind/Meta team) with first-class French support (43 French voices vs ElevenLabs treating French as secondary). Plain JSON REST API (no msgpack or special encoding). Free tier: 45k credits (~2 full coaching sessions for testing). Paid tier: $13/month for ~12 sessions. Voice cloning from 10s of audio included. EU servers available (lower latency for French users). Startup grants of $2,000+ available.

## 004 — Phase-based system prompts
**Decision:** The AI system prompt changes per Ikigai circle.
**Why:** Keeps the AI focused on one domain at a time. Frontend controls transitions.
