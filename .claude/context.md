# Project Context & Conventions

## Stack Details
- **Next.js 14** — App Router, TypeScript, server components by default
- **Tailwind CSS 4** — utility classes, no CSS modules
- **OpenRouter** — REST API, model: `anthropic/claude-sonnet-4`
- **ElevenLabs** — REST API, model: `eleven_multilingual_v2`
- **Web Speech API** — browser native, `webkitSpeechRecognition`

## Code Conventions
- All components in `src/app/components/` — PascalCase filenames
- All hooks in `src/app/hooks/` — camelCase with `use` prefix
- All lib utilities in `src/app/lib/` — camelCase filenames
- API routes in `src/app/api/[name]/route.ts`
- Use `"use client"` directive only on components that need browser APIs
- Keep server components as default — only mark client when needed

## API Key Safety
- `OPENROUTER_API_KEY` — server-side only, accessed in `/api/chat/route.ts`
- `ELEVENLABS_API_KEY` — server-side only, accessed in `/api/tts/route.ts`
- `ELEVENLABS_VOICE_ID` — server-side only
- Only `NEXT_PUBLIC_*` vars are visible client-side — we use NONE

## Voice Interaction Pattern
1. Coach response arrives as text from `/api/chat`
2. Text sent to `/api/tts` → returns audio blob
3. Audio plays via `<audio>` element
4. On audio end → enable mic
5. User speaks → `webkitSpeechRecognition` → text
6. Text added to messages → sent to `/api/chat`
7. Loop

## Phase System
Phases: welcome → love → good_at → world_needs → paid_for → synthesizing → results
- Each coaching phase gets ~5 message exchanges
- Frontend counts messages per phase and transitions
- System prompt changes per phase (see `lib/prompts.ts`)
