# Working Patterns

## Cross-referencing in phase prompts
Each phase prompt (except `love` and `synthesis`) includes a "Cross-reference their earlier answers" instruction block. This tells the AI to reference specific things the user said in prior circles. The pattern: place the instruction BEFORE the "Ask about" list so it frames how the AI should approach those questions.

## TTS concurrency semaphore
`useCoachSession.ts` creates a fresh semaphore (`createSemaphore(MAX_TTS_CONCURRENT)`) per coach response. TTS fetches acquire a slot before calling Gradium, release when done. Audio playback is still serialized via `audioChain`. This decouples fetch concurrency from playback order.

## Input mode tracking (voice vs text)
`session/page.tsx` tracks `inputMode: 'voice' | 'text'`. Voice mode: mic auto-activates after coach speaks. Text mode: no auto-activation, user must click mic to switch back. Mode switches: text field focus → text mode (transfers transcript), mic click → voice mode (clears text field). "Last gesture wins."

## Talents vs Skills distinction in good_at prompt
The `good_at` phase prompt explicitly splits exploration into two categories: TALENTS (innate — what comes naturally, childhood abilities, effortless skills) and COMPÉTENCES (acquired — learned through practice, training, work). The coach helps users distinguish between the two with probing questions like "Est-ce que c'est quelque chose qui t'est toujours venu naturellement, ou c'est plutôt une compétence que tu as développée avec le temps ?"

## Optional suggestions in synthesis
The synthesis prompt now includes a `suggestions` field with `careers`, `projects`, and `experiences`. The `IkigaiSynthesis` type has this as optional (`suggestions?`), so old synthesis results without it still work. The results page checks for existence before rendering. Each suggestion must reference the user's actual answers — no generic advice.

## Synthesis dual-storage
Synthesis results are saved to both `sessionStorage` (tab-scoped, fast) and `localStorage` (survives tab close) via `saveSynthesisBackup()`. Results page checks sessionStorage first, then falls back to localStorage backup. Both are cleared on "Recommencer".

## Streaming vs non-streaming request strategy
Streaming requests (coaching phases): plain `fetch` with 45s `AbortController`, no retries — fail fast. Non-streaming requests (synthesis): `fetchWithRetry` with 2 retries and exponential backoff — resilience matters more than speed.
