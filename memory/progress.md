# Progress

## Current Phase: Deployment
## Current Task: Story 3.6 — Vercel deployment

## Completed
- [x] Architecture document
- [x] CLAUDE.md + .claude/ setup
- [x] Memory files created
- [x] Session templates created
- [x] Epics & stories defined (16 stories across 3 epics)
- [x] Git repo initialized and pushed to GitHub (HoxtonWealth/ikigai)

## Epic 1 — Scaffold & API Routes (DONE)
- [x] Story 1.1 — Initialize Next.js 14 project (App Router, TypeScript, Tailwind)
- [x] Story 1.2 — OpenRouter chat API route (/api/chat)
- [x] Story 1.3 — ElevenLabs TTS API route (/api/tts)
- [x] Story 1.4 — AI coach prompts system (phase-specific prompts)
- [x] Story 1.5 — TypeScript types (Message, Phase, SessionState, IkigaiSynthesis)

## Epic 2 — Voice Chat UI (DONE)
- [x] Story 2.1 — Speech recognition hook (useSpeechRecognition)
- [x] Story 2.2 — Audio player hook (useAudioPlayer)
- [x] Story 2.3 — Coach session state machine (useCoachSession)
- [x] Story 2.4 — Coaching session screen (/session + components)
- [x] Story 2.5 — Text input fallback (always-visible, hides mic when unsupported)

## Epic 3 — Welcome, Results & Polish (DONE except deploy)
- [x] Story 3.1 — Welcome screen (Ikigai preview SVG, mic permission, Begin button)
- [x] Story 3.2 — Ikigai diagram component (4 overlapping circles with themes)
- [x] Story 3.3 — Results screen (diagram, synthesis, themes grid, Start Over)
- [x] Story 3.4 — Synthesizing transition screen (built into /session)
- [x] Story 3.5 — Design polish & mobile (warm palette, scrollbar, mic pulse)
- [ ] Story 3.6 — Vercel deployment

## Ad Hoc Improvements
- [x] Cross-referencing instructions in phase prompts (good_at, world_needs, paid_for now reference earlier answers)
- [x] Welcome page redesign v2 — scrollable 5-section layout + dedicated mic permission screen (two-state UI)
- [x] Onboarding tooltip on /session — one-time overlay with SVG mic icon and updated instructions
- [x] Coach self-introduction — love prompt introduces itself and explains 4-circle method on first message
- [x] Phase transition context — good_at, world_needs, paid_for prompts explain the new circle when transitioning
- [x] Session resilience — auto-retry, sessionStorage persistence, resume screen, error banners, audio stuck detection, mic watchdog
- [x] Share feature — "Partager mon Ikigai" button generates PNG card (1080x1350) with diagram + statement, Web Share API / download fallback
- [x] Mic permission errors — browser/device-specific French guidance for in-app browsers, blocked permissions, missing hardware, etc.
- [x] Talents vs Skills split — good_at prompt now distinguishes innate talents from acquired skills (prompts.ts)
- [x] Richer synthesis with suggestions — synthesis prompt returns careers, projects, experiences; optional type in types.ts; "Pistes à explorer" section on results page with graceful fallback
- [x] Reflection warm-up — 4 reflection cards on welcome page between "Vos premiers pas" and CTA to help users think before the session
- [x] Gradium TTS — replaced ElevenLabs with Gradium (gradium.ts, route.ts Content-Type → audio/wav, all docs updated)

## Bug Fix Batch (2026-04-02) — 9 fixes from production log analysis
- [x] TTS rate limiting — semaphore caps concurrent ElevenLabs calls to 2 (useCoachSession.ts)
- [x] AI repetition loop — max_tokens: 400/2000 + frequency_penalty: 0.3 (openrouter.ts)
- [x] First message too long — stricter prompt: "3 phrases MAXIMUM" (prompts.ts)
- [x] Chat 504 timeout UX — 45s AbortController for streaming, no retries (useCoachSession.ts)
- [x] Synthesis JSON parse failure — tryExtractJSON, localStorage backup, raw text fallback (results/page.tsx)
- [x] Synthesis lost on close/refresh — save during synthesizing, localStorage backup, beforeunload warning, recovery screen (sessionPersistence.ts + session/page.tsx + useCoachSession.ts)
- [x] Mic auto-activates while typing — inputMode tracking, voice/text mode switching (session/page.tsx)
- [x] Orphaned text on mode switch — mic click clears text, text focus transfers transcript (session/page.tsx)
- [x] Transcript lost on speech silence restart — accumulatedRef preserves text across auto-restarts (useSpeechRecognition.ts)

## Blockers
None
