# Ikigai Coach — Architecture Document

> **Status:** Final — This is the single source of truth for all architecture decisions.
> **Last updated:** 2026-03-28

---

## 1. Product Overview

A voice-first AI coaching app that guides users through discovering their Ikigai — the Japanese concept of "a reason for being." The coach asks thoughtful questions across 4 life dimensions, listens to spoken answers, and synthesizes a personalized Ikigai summary.

**Duration:** ~20-30 minutes per session
**Interaction:** Voice-first (speak + listen), with text fallback

---

## 2. Tech Stack (Locked)

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router) | Vercel-native, React, API routes |
| Hosting | Vercel | Simple deploy, serverless functions |
| AI Brain | OpenRouter API | Model flexibility, single API |
| AI Model | `anthropic/claude-sonnet-4` | Great at empathetic conversation |
| TTS (coach voice) | ElevenLabs API | Natural-sounding, warm voice |
| STT (user voice) | Web Speech API | Free, built into browsers |
| Styling | Tailwind CSS 4 | Utility-first, fast |
| State | React useState/useReducer | No external state lib needed |

**No database. No auth. No Supabase.** Keep it simple — one-time sessions only.

---

## 3. App Flow (5 Screens)

```
[Welcome] → [Coaching Session] → [Synthesizing...] → [Results] → [Done]
```

### Screen 1: Welcome
- App title, short explanation of Ikigai
- Visual: the 4-circle Ikigai diagram
- "Begin Your Journey" button
- Browser mic permission prompt on click

### Screen 2: Coaching Session (the core)
- Full-screen conversational UI
- Shows which circle we're in (Love / Good At / World Needs / Paid For)
- Progress indicator (4 phases)
- Coach speaks a question → audio plays
- User presses & holds (or clicks) to respond → speech-to-text
- User's answer appears as text → sent to AI → next question
- ~5 questions per circle, but AI adapts (can ask follow-ups)
- Text fallback: type instead of speak

### Screen 3: Synthesizing
- Calm loading screen ("Reflecting on everything you shared...")
- AI processes full conversation → generates Ikigai synthesis

### Screen 4: Results
- Visual Ikigai diagram with user's themes filled in per circle
- Written synthesis: 3-4 paragraphs connecting the dots
- Key insight / "Your Ikigai might be..."

### Screen 5: Done
- "Start Over" button
- Share prompt (copy link or screenshot)

---

## 4. Folder Structure

```
ikigai-coach/
├── CLAUDE.md
├── .claude/
│   ├── context.md
│   ├── session.md
│   └── agents/
├── memory/
│   ├── progress.md
│   ├── decisions.md
│   ├── mistakes.md
│   ├── patterns.md
│   └── dependencies.md
├── _bmad-output/
│   ├── planning-artifacts/
│   │   └── architecture.md          ← this file
│   └── prompts/
│       ├── claude-code-session-template.md
│       └── claude-code-adhoc-template.md
├── src/
│   └── app/
│       ├── layout.tsx
│       ├── page.tsx                  ← Welcome screen
│       ├── session/
│       │   └── page.tsx              ← Coaching session screen
│       ├── results/
│       │   └── page.tsx              ← Results screen
│       ├── api/
│       │   ├── chat/
│       │   │   └── route.ts          ← OpenRouter proxy
│       │   └── tts/
│       │       └── route.ts          ← ElevenLabs proxy
│       ├── components/
│       │   ├── VoiceRecorder.tsx      ← Mic button + Web Speech API
│       │   ├── CoachBubble.tsx        ← Coach message + audio playback
│       │   ├── UserBubble.tsx         ← User message display
│       │   ├── ProgressBar.tsx        ← 4-circle progress
│       │   ├── IkigaiDiagram.tsx      ← SVG/Canvas Ikigai visual
│       │   └── TranscriptDisplay.tsx  ← Live text of conversation
│       ├── hooks/
│       │   ├── useSpeechRecognition.ts  ← Web Speech API hook
│       │   ├── useAudioPlayer.ts        ← Play ElevenLabs audio
│       │   └── useCoachSession.ts       ← Main session state machine
│       └── lib/
│           ├── openrouter.ts          ← OpenRouter client helper
│           ├── elevenlabs.ts          ← ElevenLabs client helper
│           ├── prompts.ts             ← System prompts for the AI coach
│           └── types.ts               ← TypeScript types
├── public/
│   └── images/                       ← Ikigai diagram assets
├── .env.local                        ← API keys (not committed)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── package.json
```

---

## 5. API Routes

### POST /api/chat
**Purpose:** Proxy to OpenRouter. Hides API key server-side.

**Request body:**
```json
{
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "phase": "love" | "good_at" | "world_needs" | "paid_for" | "synthesis"
}
```

**Behavior:**
- Prepends the system prompt from `lib/prompts.ts` based on `phase`
- Sends to OpenRouter (`anthropic/claude-sonnet-4`)
- Returns `{ "response": "AI text" }`
- For `phase: "synthesis"`, the system prompt changes to ask for a full Ikigai analysis

### POST /api/tts
**Purpose:** Proxy to ElevenLabs. Hides API key server-side.

**Request body:**
```json
{
  "text": "The coach's response text",
  "voice_id": "selected-voice-id"
}
```

**Behavior:**
- Sends text to ElevenLabs `/v1/text-to-speech/{voice_id}`
- Returns audio as `audio/mpeg` stream
- Uses model `eleven_multilingual_v2` for natural speech

---

## 6. AI Coach Prompts Strategy

The system prompt changes per phase. Each prompt:
- Sets the coach's personality (warm, curious, non-judgmental)
- Focuses on the current Ikigai circle
- Instructs the AI to ask ONE question at a time
- Tells the AI to dig deeper with follow-ups (not just move on)
- Limits to ~5 exchanges per circle before transitioning

**Phase transitions:** The frontend tracks message count per phase. After ~5 exchanges, it changes the `phase` parameter → new system prompt → AI naturally transitions.

**Synthesis prompt:** Gets the FULL conversation history and produces:
- Themes per circle (bullet points)
- Connections between circles
- "Your Ikigai might be..." statement
- Actionable next steps

---

## 7. Voice Architecture

### Speech-to-Text (User → App)
- **Web Speech API** (`webkitSpeechRecognition`)
- Browser-native, free, no API key
- Works in Chrome, Edge, Safari (partial)
- Fallback: text input field always visible
- `continuous: false` — records one utterance at a time
- User clicks mic → speaks → releases → text captured

### Text-to-Speech (App → User)
- **ElevenLabs API** via `/api/tts` route
- Voice: pick a warm, calm voice from ElevenLabs library
- Audio returned as MP3 → played via `<audio>` element
- Coach speaks each response automatically

### Timing Flow
```
1. Coach question text arrives from /api/chat
2. Text sent to /api/tts → audio returned
3. Audio plays (coach "speaks")
4. When audio ends → mic activates (user's turn)
5. User speaks → text captured
6. Text sent to /api/chat with history → next response
7. Repeat from step 1
```

---

## 8. State Management

Single `useCoachSession` hook manages the entire session:

```typescript
type SessionState = {
  phase: 'welcome' | 'love' | 'good_at' | 'world_needs' | 'paid_for' | 'synthesizing' | 'results';
  messages: Message[];          // full conversation history
  currentPhaseMessages: number; // count for current circle
  isCoachSpeaking: boolean;
  isUserSpeaking: boolean;
  isLoading: boolean;           // waiting for AI response
  synthesis: IkigaiSynthesis | null;
};
```

No external state library. React state + this hook is enough.

---

## 9. Environment Variables

```env
# .env.local (never committed)
OPENROUTER_API_KEY=sk-or-...
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=...          # chosen voice ID
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 10. Design Direction

- **Palette:** Warm, calm — soft yellows, creams, gentle purples
- **Typography:** Clean, rounded — Inter or similar
- **Vibe:** Like talking to a wise friend, not a corporate tool
- **Animations:** Subtle — pulsing mic icon, gentle transitions
- **Mobile-first:** This is a sit-on-the-couch-and-talk app
