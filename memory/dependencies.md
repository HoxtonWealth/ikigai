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

## Web Speech API
- Use webkitSpeechRecognition (Chrome/Edge) with SpeechRecognition fallback
- Must check typeof window !== 'undefined' (SSR safety)
- continuous: false for single utterance capture
- Not supported in Firefox — text fallback required
