# Mistakes & Lessons Learned

## 001 — TTS rate limiting from concurrent calls (2026-04-01)
**What:** Streaming pipeline fired one TTS call per sentence concurrently. With 5-14 sentences per response, ElevenLabs rate-limited and rejected half the requests (500s). First coach message was worst — 7/14 TTS calls failed, making the intro unintelligible.
**Fix:** Added a semaphore in `useCoachSession.ts` capping concurrent TTS fetches to 2 (`MAX_TTS_CONCURRENT`).
**Lesson:** Always limit concurrency when calling external APIs in parallel. ElevenLabs can't handle more than ~2-3 concurrent requests.

## 002 — Chat timeout causing 3-minute dead air (2026-04-01)
**What:** `fetchWithRetry` retried streaming `/api/chat` requests 2x on 504 timeout. Each attempt waited ~60s (Vercel timeout), totaling ~3 minutes of bouncing dots before showing an error.
**Fix:** Streaming requests now use plain `fetch` with a 45s `AbortController` — no retries. `fetchWithRetry` is only used for synthesis (non-streaming).
**Lesson:** Don't retry streaming requests — fail fast and let the user retry manually.

## 003 — Synthesis lost on JSON parse failure (2026-04-01)
**What:** `results/page.tsx` did `router.push('/')` on JSON parse error. If the AI returned markdown-wrapped JSON or malformed output, 20 minutes of conversation was silently lost.
**Fix:** Added `tryExtractJSON()` to parse markdown code blocks and raw JSON objects, localStorage backup via `saveSynthesisBackup()`, and raw text fallback display.
**Lesson:** Never silently redirect on parse failure. Always try to salvage and display what you have.

## 004 — Synthesis lost on tab close / page refresh (2026-04-01)
**What:** `saveSession()` skipped the 'synthesizing' phase, so refreshing during synthesis lost all conversation data. sessionStorage is tab-scoped, so closing the tab also lost everything.
**Fix:** Removed the 'synthesizing' skip from `saveSession()`. Added localStorage backup for synthesis results. Added `beforeunload` warning. Resume screen now detects synthesizing phase and offers "Relancer la synthèse".
**Lesson:** Save state at every critical transition, especially before expensive operations.

## 005 — AI repetition loop (2026-04-01)
**What:** OpenRouter calls had no `max_tokens` or `frequency_penalty`. The AI occasionally got stuck repeating the same phrase hundreds of times, wasting tokens and producing garbage output.
**Fix:** Added `max_tokens: 400` (coaching) / `2000` (synthesis) and `frequency_penalty: 0.3` in `openrouter.ts`.
**Lesson:** Always set max_tokens and frequency_penalty on LLM calls. Two lines of code prevent runaway generation.

## 006 — Mic auto-activating while user is typing (2026-04-01)
**What:** After coach finished speaking, mic auto-activated regardless of whether the user was typing in the text field. This caused the mic to pick up noise alongside typing.
**Fix:** Added `inputMode` state ('voice' | 'text') to `session/page.tsx`. Auto-activation only fires when `inputMode === 'voice'`. Focusing the text field switches to text mode and transfers any active transcript.
**Lesson:** When two input modes coexist, track which one is active and don't override the user's choice.

## 007 — Transcript lost on speech silence restart (2026-04-01)
**What:** Web Speech API's `event.results` resets when recognition restarts after a silence timeout. The `onresult` handler rebuilt the transcript from scratch, losing everything the user said before the pause.
**Fix:** Added `accumulatedRef` in `useSpeechRecognition.ts` that saves finalized text before auto-restart. `onresult` prepends accumulated text to new results. Reset only on explicit `startListening`/`resetTranscript`.
**Lesson:** Web Speech API `event.results` does NOT carry over across restarts — always accumulate manually.
