# Ikigai Coach — Epics & Stories

> **Reference:** architecture.md for technical details
> **Format:** Each story has Given/When/Then acceptance criteria
> **Rule:** One story = one Claude Code session

---

## Epic 1 — Project Scaffold & API Routes

**Goal:** Working Next.js app with backend API routes that can talk to OpenRouter and ElevenLabs.

### Story 1.1 — Initialize Next.js Project
**As a** developer
**I want** a clean Next.js 14 project with TypeScript and Tailwind
**So that** I have the foundation to build on

**Acceptance Criteria:**
- **Given** the repo has CLAUDE.md, memory/, .claude/, _bmad-output/ already
- **When** I run the Next.js initializer
- **Then** it creates src/app/ structure without overwriting existing files
- **And** `npm run dev` starts without errors
- **And** `npm run build` succeeds
- **And** tailwind classes work in the default page

### Story 1.2 — OpenRouter Chat API Route
**As a** user talking to the coach
**I want** my messages sent to an AI model
**So that** I get thoughtful coaching responses

**Acceptance Criteria:**
- **Given** a POST request to `/api/chat` with `{ messages, phase }`
- **When** the route handler processes it
- **Then** it prepends the correct system prompt for the given phase
- **And** sends the messages to OpenRouter (anthropic/claude-sonnet-4)
- **And** returns `{ response: "AI text" }` with status 200
- **And** returns `{ error: "message" }` with status 500 on failure
- **And** the OPENROUTER_API_KEY is never exposed to the client

### Story 1.3 — ElevenLabs TTS API Route
**As a** user listening to the coach
**I want** the AI's text response converted to natural speech
**So that** it feels like talking to a real person

**Acceptance Criteria:**
- **Given** a POST request to `/api/tts` with `{ text }`
- **When** the route handler processes it
- **Then** it sends the text to ElevenLabs with the configured voice ID
- **And** returns the audio as `audio/mpeg` content type
- **And** returns an error response if ElevenLabs fails
- **And** the ELEVENLABS_API_KEY is never exposed to the client

### Story 1.4 — AI Coach Prompts System
**As a** developer
**I want** phase-specific system prompts for the AI coach
**So that** the coach stays focused on one Ikigai circle at a time

**Acceptance Criteria:**
- **Given** the function `getSystemPrompt(phase)`
- **When** called with "love"
- **Then** it returns a prompt focused on passions, interests, joy
- **When** called with "good_at"
- **Then** it returns a prompt focused on skills, talents, strengths
- **When** called with "world_needs"
- **Then** it returns a prompt focused on contribution, problems to solve
- **When** called with "paid_for"
- **Then** it returns a prompt focused on career, income, market value
- **When** called with "synthesis"
- **Then** it returns a prompt that analyzes the full conversation and produces the Ikigai summary
- **And** every prompt instructs the AI to ask ONE question at a time
- **And** every prompt sets a warm, curious, non-judgmental tone

### Story 1.5 — TypeScript Types
**As a** developer
**I want** shared TypeScript types
**So that** all components use consistent data structures

**Acceptance Criteria:**
- **Given** the types file at `src/app/lib/types.ts`
- **Then** it exports: `Message`, `Phase`, `SessionState`, `IkigaiSynthesis`
- **And** types match the architecture doc section 8

---

## Epic 2 — Voice Chat UI (The Core Experience)

**Goal:** User can have a spoken conversation with the AI coach through a voice-first interface.

### Story 2.1 — Speech Recognition Hook
**As a** user
**I want** to speak into my microphone and have my words captured as text
**So that** I can talk to the coach naturally

**Acceptance Criteria:**
- **Given** the hook `useSpeechRecognition()`
- **When** the user clicks the mic button and speaks
- **Then** the speech is converted to text
- **And** the text is returned via the hook's state
- **And** the hook reports `isListening` state correctly
- **And** if the browser doesn't support Web Speech API, `isSupported` returns false
- **And** no errors on server-side rendering (SSR-safe)

### Story 2.2 — Audio Player Hook
**As a** user
**I want** to hear the coach's voice
**So that** it feels like a real conversation

**Acceptance Criteria:**
- **Given** the hook `useAudioPlayer()`
- **When** called with an audio blob from `/api/tts`
- **Then** it plays the audio through the browser
- **And** it reports `isPlaying` state
- **And** it fires `onEnded` callback when audio finishes
- **And** it can be stopped/interrupted

### Story 2.3 — Coach Session State Machine
**As a** developer
**I want** a single hook that manages the entire coaching session
**So that** the UI components stay simple

**Acceptance Criteria:**
- **Given** the hook `useCoachSession()`
- **Then** it manages: phase, messages, isCoachSpeaking, isUserSpeaking, isLoading
- **When** the user sends a message (text or voice)
- **Then** it adds the message to history, calls `/api/chat`, gets response
- **Then** it sends response to `/api/tts`, plays audio
- **When** audio ends, it enables mic for user's turn
- **When** message count for a phase reaches ~5
- **Then** it transitions to the next phase
- **When** all 4 circles are done
- **Then** it transitions to "synthesizing" phase and calls `/api/chat` with synthesis prompt
- **And** it stores the synthesis result in state

### Story 2.4 — Coaching Session Screen
**As a** user
**I want** a clean conversational interface to talk with the coach
**So that** I can focus on the conversation without distractions

**Acceptance Criteria:**
- **Given** I navigate to `/session`
- **Then** I see: a progress bar showing which circle we're on, the conversation area, a mic button, and a text input fallback
- **When** the coach is speaking, the mic button is disabled
- **When** the coach finishes speaking, the mic button activates
- **When** I click the mic and speak, my words appear as text
- **When** my message is sent, I see a loading state while the AI responds
- **And** the page is mobile-responsive (works at 375px)
- **And** the UI components used: VoiceRecorder, CoachBubble, UserBubble, ProgressBar

### Story 2.5 — Text Input Fallback
**As a** user on Firefox or a browser without speech support
**I want** to type my responses instead of speaking
**So that** I can still complete the Ikigai session

**Acceptance Criteria:**
- **Given** the browser does not support Web Speech API
- **When** I'm on the `/session` page
- **Then** the mic button is hidden or shows "not supported" state
- **And** a text input field is always visible and functional
- **When** I type a message and press Enter/Send
- **Then** it works identically to a voice message

---

## Epic 3 — Welcome, Results & Polish

**Goal:** Complete the app with entry and exit screens, the Ikigai visual, and deployment.

### Story 3.1 — Welcome Screen
**As a** user arriving at the app
**I want** to understand what Ikigai is and what this app does
**So that** I feel ready to begin

**Acceptance Criteria:**
- **Given** I navigate to `/` (home page)
- **Then** I see: app title, short explanation of Ikigai, a visual of the 4 circles, a "Begin Your Journey" button
- **When** I click "Begin Your Journey"
- **Then** the browser asks for microphone permission
- **And** I'm navigated to `/session`
- **And** the page is mobile-responsive

### Story 3.2 — Ikigai Diagram Component
**As a** user viewing my results
**I want** a visual Ikigai diagram showing my themes
**So that** I can see how my answers connect

**Acceptance Criteria:**
- **Given** the component `IkigaiDiagram`
- **When** rendered with synthesis data (themes per circle)
- **Then** it shows 4 overlapping circles labeled: Love, Good At, World Needs, Paid For
- **And** each circle contains the user's themes for that area
- **And** the center overlap shows the Ikigai statement
- **And** it renders well on mobile (375px)

### Story 3.3 — Results Screen
**As a** user who completed the coaching session
**I want** to see my Ikigai synthesis
**So that** I have a clear takeaway

**Acceptance Criteria:**
- **Given** the coaching session is complete and synthesis data exists
- **When** I'm navigated to `/results`
- **Then** I see: the IkigaiDiagram with my themes, a written synthesis (3-4 paragraphs), a "Your Ikigai might be..." statement, a "Start Over" button
- **When** I click "Start Over"
- **Then** all session state is cleared and I go back to `/`
- **And** the page is mobile-responsive

### Story 3.4 — Synthesizing Transition Screen
**As a** user who just finished the 4 circles
**I want** a calm loading screen while the AI processes my Ikigai
**So that** the transition feels intentional, not broken

**Acceptance Criteria:**
- **Given** the coaching session transitions to "synthesizing" phase
- **When** the synthesis API call is in progress
- **Then** I see a calming screen with a message like "Reflecting on everything you shared..."
- **And** a subtle animation (spinner, breathing dots, or similar)
- **When** synthesis is complete
- **Then** I'm automatically navigated to `/results`

### Story 3.5 — Design Polish & Mobile
**As a** user
**I want** the app to look warm and professional
**So that** the experience feels trustworthy

**Acceptance Criteria:**
- **Given** all screens are built
- **Then** the color palette is warm (soft yellows, creams, gentle purples)
- **And** typography is clean (Inter or similar)
- **And** transitions between screens are smooth
- **And** the mic button has a subtle pulse animation when active
- **And** all screens work at 375px, 768px, and 1024px widths

### Story 3.6 — Vercel Deployment
**As a** developer
**I want** the app deployed and accessible via a public URL
**So that** anyone can use it

**Acceptance Criteria:**
- **Given** the code is pushed to GitHub
- **When** I connect the repo to Vercel
- **Then** the build succeeds
- **And** environment variables are set in Vercel dashboard
- **And** `/api/chat` and `/api/tts` work in production
- **And** voice features work on the deployed URL (HTTPS required for mic access)

---

## Summary

| Epic | Stories | Sessions Needed |
|------|---------|----------------|
| Epic 1 — Scaffold & API | 1.1, 1.2, 1.3, 1.4, 1.5 | 1 session (all together) |
| Epic 2 — Voice Chat UI | 2.1, 2.2, 2.3, 2.4, 2.5 | 2 sessions (hooks + UI) |
| Epic 3 — Welcome, Results, Deploy | 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 | 2 sessions (screens + polish/deploy) |
| **Total** | **16 stories** | **~5 sessions** |
