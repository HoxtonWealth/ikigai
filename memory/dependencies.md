# Dependencies & API Quirks

## OpenRouter
- Endpoint: https://openrouter.ai/api/v1/chat/completions
- Auth: Bearer token in Authorization header
- Required headers: HTTP-Referer, X-Title
- Model: anthropic/claude-sonnet-4

## ElevenLabs
- Endpoint: https://api.elevenlabs.io/v1/text-to-speech/{voice_id}
- Auth: xi-api-key header
- Returns: audio/mpeg stream
- Model: eleven_multilingual_v2
- Free tier: 10,000 characters/month
- Rate limit: ~2-3 concurrent requests max — use semaphore to cap concurrency

## OpenRouter — LLM guardrails
- Always set `max_tokens` (400 coaching, 2000 synthesis) to prevent runaway generation
- Always set `frequency_penalty: 0.3` to reduce repetition loops
- Synthesis response may be wrapped in markdown code blocks — parse with tryExtractJSON()

## Web Speech API
- Use webkitSpeechRecognition (Chrome/Edge) with SpeechRecognition fallback
- Must check typeof window !== 'undefined' (SSR safety)
- continuous: true with auto-restart on silence timeout — accumulatedRef preserves text across restarts
- Not supported in Firefox — text fallback required
- event.results resets on each new recognition session — always prepend accumulated text

## html2canvas
- Used for generating shareable PNG from the off-screen ShareableCard component
- Use HTML/CSS circles (not SVG) for best compatibility — html2canvas can be finicky with SVGs
- scale: 2 for crisp output on retina displays
