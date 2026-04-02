# Project: Ikigai Coach

## Architecture
Voice-first AI coaching app. Next.js 14 (App Router) on Vercel. OpenRouter for AI chat, Gradium for TTS, Web Speech API for STT. No database, no auth. Tailwind CSS for styling.

## BMAD Artifacts
- Architecture: _bmad-output/planning-artifacts/architecture.md
- Epics & Stories: _bmad-output/planning-artifacts/epics-and-stories.md

## Memory — Read BEFORE every task, update AFTER every session
@import memory/progress.md
@import memory/decisions.md
@import memory/mistakes.md
@import memory/patterns.md
@import memory/dependencies.md

## Absolute Rules
- NEVER add a database or auth — this is a stateless one-session app
- NEVER expose API keys client-side — all external API calls go through /api/ routes
- NEVER change the tech stack (Next.js, OpenRouter, Gradium, Tailwind)
- ALWAYS use App Router (not Pages Router)
- ALWAYS provide a text input fallback for browsers without Web Speech API
- ALWAYS ask ONE question at a time in the AI coach prompts
- ALWAYS keep API route handlers simple — proxy only, no business logic

## Definition of Done
1. Feature works in Chrome with voice
2. Text fallback works for browsers without speech support
3. No API keys exposed in client-side code
4. No TypeScript errors (`npx tsc --noEmit` passes)
5. Mobile-responsive (test at 375px width)
6. Memory files updated

@import .claude/context.md
