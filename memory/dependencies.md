# Dependencies & API Quirks

## OpenRouter
- Endpoint: https://openrouter.ai/api/v1/chat/completions
- Auth: Bearer token in Authorization header
- Required headers: HTTP-Referer, X-Title
- Model: anthropic/claude-sonnet-4

## Gradium
- Endpoint: https://eu.api.gradium.ai/api/post/speech/tts (POST)
- Alt endpoint: https://us.api.gradium.ai/api/post/speech/tts (US)
- Auth: x-api-key header (NOT Authorization Bearer)
- Content-Type: application/json
- Body: { text, voice_id, output_format: "wav", only_audio: true }
- Returns: raw audio/wav bytes when only_audio is true
- Error format: { error: string, code: number }
- Free tier: 45,000 credits/month (1 char = 1 credit)
- Pricing: XS $13/mo (225k credits), S $43/mo (900k credits)
- French voices: 43 available (40 France + 3 Canadian)
- Voice cloning: instant from 10s audio (5 clones on free, 1000 on paid)
- Max session duration: 300 seconds per API call
- Supports pause tags: <break time="1.5s" /> in text
- French text rewriting rules available (dates, times)

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
