# Session Resilience Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the coaching session bulletproof — auto-retry on failures, persist conversation to sessionStorage, allow resume after refresh/crash, and show warm user-friendly error states instead of silent freezes.

**Architecture:** Add a retry utility for all fetch calls, a sessionStorage persistence layer that saves after every exchange, error/retry state to the session hook, and inline error banners + resume UI in the session page. Add watchdogs for stuck audio and dead mic.

**Tech Stack:** React hooks, sessionStorage, existing Next.js/Tailwind stack. No new dependencies.

---

### Task 1: Increase Vercel function timeout

**Files:**
- Create: `vercel.json`

**Step 1: Create vercel.json**

```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60
    }
  }
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS (json file, no TS impact)

**Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: increase Vercel function timeout to 60s"
```

---

### Task 2: Fetch retry utility

**Files:**
- Create: `src/app/lib/fetchWithRetry.ts`

**Step 1: Create the utility**

```typescript
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  { retries = 2, delay = 2000 }: { retries?: number; delay?: number } = {},
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || !RETRYABLE_STATUSES.has(res.status)) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, delay * (attempt + 1)));
    }
  }

  throw lastError ?? new Error('Request failed');
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/lib/fetchWithRetry.ts
git commit -m "feat: add fetch retry utility with exponential backoff"
```

---

### Task 3: Session persistence utility

**Files:**
- Create: `src/app/lib/sessionPersistence.ts`

**Step 1: Create the utility**

This saves/loads the coaching session to sessionStorage so users don't lose work. Saved data stays on their device only.

```typescript
import { Message, Phase } from './types';

const STORAGE_KEY = 'ikigai-session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export type SavedSession = {
  messages: Message[];
  phase: Phase;
  currentPhaseMessages: number;
  timestamp: number;
};

export function saveSession(
  messages: Message[],
  phase: Phase,
  currentPhaseMessages: number,
): void {
  // Only save if there's actual conversation to preserve
  if (messages.length === 0) return;
  // Don't save terminal states
  if (phase === 'synthesizing' || phase === 'results') return;
  try {
    const data: SavedSession = { messages, phase, currentPhaseMessages, timestamp: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — silently ignore
  }
}

export function loadSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved: SavedSession = JSON.parse(raw);
    if (Date.now() - saved.timestamp > MAX_AGE_MS) {
      clearSavedSession();
      return null;
    }
    if (!saved.messages?.length || !saved.phase) {
      clearSavedSession();
      return null;
    }
    return saved;
  } catch {
    clearSavedSession();
    return null;
  }
}

export function clearSavedSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/lib/sessionPersistence.ts
git commit -m "feat: add session persistence to sessionStorage"
```

---

### Task 4: Add error state, retry, and persistence to useCoachSession

**Files:**
- Modify: `src/app/hooks/useCoachSession.ts`
- Modify: `src/app/lib/types.ts`

This is the core task. We need to:
1. Add `error` field to `SessionState`
2. Use `fetchWithRetry` for all API calls
3. Store pending request params so we can retry
4. Add `retry()` function that re-fires the last failed API call
5. Add `resumeSession()` to restore from saved state and continue
6. Save to sessionStorage after every successful coach response

**Step 1: Add error field to SessionState type**

In `src/app/lib/types.ts`, add `error` to `SessionState`:

```typescript
export type SessionState = {
  phase: Phase;
  messages: Message[];
  currentPhaseMessages: number;
  isCoachSpeaking: boolean;
  isUserSpeaking: boolean;
  isLoading: boolean;
  synthesis: IkigaiSynthesis | null;
  error: 'chat' | 'synthesis' | null;
};
```

**Step 2: Rewrite useCoachSession.ts**

Replace the full file. Key changes annotated with `// NEW`:

```typescript
'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, Phase, CoachingPhase, SessionState, IkigaiSynthesis } from '../lib/types';
import { useAudioPlayer } from './useAudioPlayer';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { saveSession, clearSavedSession, SavedSession } from '../lib/sessionPersistence';

const MESSAGES_PER_PHASE = 5;

const PHASE_ORDER: CoachingPhase[] = ['love', 'good_at', 'world_needs', 'paid_for'];

function getNextPhase(current: CoachingPhase): Phase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx < PHASE_ORDER.length - 1) {
    return PHASE_ORDER[idx + 1];
  }
  return 'synthesizing';
}

type SSEEvent =
  | { sentence: string; done?: never; full?: never; error?: never }
  | { done: true; full: string; sentence?: never; error?: never }
  | { error: string; sentence?: never; done?: never; full?: never };

async function readSSEStream(
  response: Response,
  onSentence: (sentence: string) => void,
  onDone: (fullText: string) => void,
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  let lastFullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });
    const events = sseBuffer.split('\n\n');
    sseBuffer = events.pop() || '';

    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        let parsed: SSEEvent;
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.done) {
          lastFullText = parsed.full;
        } else if (parsed.sentence) {
          onSentence(parsed.sentence);
        }
      }
    }
  }

  onDone(lastFullText);
}

// NEW: Pending request type for retry support
type PendingRequest = {
  updatedMessages: Message[];
  phaseForApi: CoachingPhase | 'synthesis';
  shouldTransition: boolean;
  nextPhase: Phase;
  newPhaseCount: number;
};

export function useCoachSession() {
  const [state, setState] = useState<SessionState>({
    phase: 'love',
    messages: [],
    currentPhaseMessages: 0,
    isCoachSpeaking: false,
    isUserSpeaking: false,
    isLoading: false,
    synthesis: null,
    error: null, // NEW
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // NEW: Store pending request for retry
  const pendingRef = useRef<PendingRequest | null>(null);

  const onAudioEnded = useCallback(() => {
    setState((prev) => ({ ...prev, isCoachSpeaking: false }));
  }, []);

  const { enqueue: enqueueAudio, seal: sealAudio, stop: stopAudio, isPlaying, unlock: unlockAudio } = useAudioPlayer(onAudioEnded);

  const ttsSentence = useCallback(
    async (sentence: string): Promise<ArrayBuffer | null> => {
      // NEW: retry TTS once
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sentence }),
          });
          if (res.ok) return res.arrayBuffer();
        } catch {
          // Network error — retry
        }
        if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
      }
      return null;
    },
    []
  );

  const streamCoachResponse = useCallback(
    async (
      chatRes: Response,
      updatedMessages: Message[],
      shouldTransition: boolean,
      nextPhase: Phase,
      newPhaseCount: number,
    ) => {
      let displayedText = '';
      let audioChain = Promise.resolve();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isCoachSpeaking: true,
      }));

      let finalText = '';

      await readSSEStream(
        chatRes,
        (sentence) => {
          displayedText += (displayedText ? ' ' : '') + sentence;
          const textSnapshot = displayedText;

          setState((prev) => ({
            ...prev,
            messages: [
              ...updatedMessages,
              { role: 'assistant' as const, content: textSnapshot },
            ],
          }));

          const ttsPromise = ttsSentence(sentence);
          audioChain = audioChain.then(async () => {
            const audioData = await ttsPromise;
            if (audioData) enqueueAudio(audioData);
          });
        },
        (fullText) => {
          finalText = fullText || displayedText;
        },
      );

      await audioChain;
      sealAudio();

      const resolvedPhase = shouldTransition ? nextPhase : stateRef.current.phase;
      const resolvedCount = shouldTransition ? 0 : newPhaseCount;

      // Final state
      setState((prev) => ({
        ...prev,
        messages: [
          ...updatedMessages,
          { role: 'assistant' as const, content: finalText },
        ],
        phase: resolvedPhase,
        currentPhaseMessages: resolvedCount,
      }));

      // NEW: Persist after successful coach response
      saveSession(
        [...updatedMessages, { role: 'assistant', content: finalText }],
        resolvedPhase,
        resolvedCount,
      );

      // NEW: Clear pending — request succeeded
      pendingRef.current = null;
    },
    [ttsSentence, enqueueAudio, sealAudio]
  );

  // NEW: Core request function — used by sendMessage, retry, and resumeSession
  const fireRequest = useCallback(
    async (pending: PendingRequest) => {
      pendingRef.current = pending;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // NEW: fetchWithRetry instead of bare fetch
        const chatRes = await fetchWithRetry(
          '/api/chat',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: pending.updatedMessages.filter((m) => m.role !== 'system'),
              phase: pending.phaseForApi,
            }),
          },
          { retries: 2, delay: 2000 },
        );

        if (!chatRes.ok) throw new Error('Chat API failed');

        // Synthesis: non-streaming JSON response
        if (pending.phaseForApi === 'synthesis') {
          const { response } = await chatRes.json();

          let synthesis: IkigaiSynthesis;
          try {
            synthesis = JSON.parse(response);
          } catch {
            synthesis = {
              love: [],
              goodAt: [],
              worldNeeds: [],
              paidFor: [],
              ikigaiStatement: response,
              fullSynthesis: response,
            };
          }

          setState((prev) => ({
            ...prev,
            phase: 'results',
            isLoading: false,
            synthesis,
            messages: [...pending.updatedMessages, { role: 'assistant' as const, content: response }],
          }));

          // NEW: Clear saved session — they made it to results
          clearSavedSession();
          pendingRef.current = null;
          return;
        }

        // Coaching: streaming SSE response
        await streamCoachResponse(
          chatRes,
          pending.updatedMessages,
          pending.shouldTransition,
          pending.nextPhase,
          pending.newPhaseCount,
        );
      } catch {
        // NEW: Set error state instead of silently swallowing
        const errorType = pending.phaseForApi === 'synthesis' ? 'synthesis' : 'chat';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isCoachSpeaking: false,
          error: errorType as 'chat' | 'synthesis',
        }));
      }
    },
    [streamCoachResponse]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      const current = stateRef.current;
      if (current.isLoading || current.isCoachSpeaking) return;

      const userMessage: Message = { role: 'user', content: userText };
      const updatedMessages = [...current.messages, userMessage];
      const newPhaseCount = current.currentPhaseMessages + 1;

      let nextPhase = current.phase;
      let phaseForApi: CoachingPhase | 'synthesis' = current.phase as CoachingPhase;

      if (newPhaseCount >= MESSAGES_PER_PHASE && current.phase !== 'synthesizing' && current.phase !== 'results') {
        nextPhase = getNextPhase(current.phase as CoachingPhase);
        if (nextPhase === 'synthesizing') {
          phaseForApi = 'synthesis';
        } else {
          phaseForApi = nextPhase as CoachingPhase;
        }
      }

      // Show user message immediately
      setState((prev) => ({
        ...prev,
        messages: updatedMessages,
        isUserSpeaking: false,
        currentPhaseMessages: newPhaseCount,
      }));

      // NEW: Save user message right away (in case crash before coach responds)
      saveSession(updatedMessages, current.phase, newPhaseCount);

      const shouldTransition = newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase;
      await fireRequest({ updatedMessages, phaseForApi, shouldTransition, nextPhase, newPhaseCount });
    },
    [fireRequest]
  );

  // NEW: Retry last failed request
  const retry = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;

    // Remove partial assistant message if one exists
    setState((prev) => {
      const msgs = [...prev.messages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
        // Check if this is a partial response (same message count as pending means it was added during streaming)
        if (msgs.length > pending.updatedMessages.length) {
          msgs.pop();
        }
      }
      return { ...prev, messages: msgs, error: null };
    });

    fireRequest(pending);
  }, [fireRequest]);

  const startSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    const pending: PendingRequest = {
      updatedMessages: [],
      phaseForApi: 'love',
      shouldTransition: false,
      nextPhase: 'love',
      newPhaseCount: 0,
    };

    await fireRequest(pending);
  }, [fireRequest]);

  // NEW: Resume from saved session
  const resumeSession = useCallback(
    async (saved: SavedSession) => {
      // Restore saved state
      setState((prev) => ({
        ...prev,
        messages: saved.messages,
        phase: saved.phase,
        currentPhaseMessages: saved.currentPhaseMessages,
      }));

      const lastMessage = saved.messages[saved.messages.length - 1];

      if (lastMessage?.role === 'user') {
        // Last thing was user speaking — coach never responded. Re-fire.
        let phaseForApi: CoachingPhase | 'synthesis' = saved.phase as CoachingPhase;
        let nextPhase = saved.phase;
        const shouldTransition = false; // Phase was already computed when saved

        if (saved.phase === 'synthesizing') {
          phaseForApi = 'synthesis';
        }

        await fireRequest({
          updatedMessages: saved.messages,
          phaseForApi,
          shouldTransition,
          nextPhase,
          newPhaseCount: saved.currentPhaseMessages,
        });
      }
      // If last message was assistant, just show the conversation — mic will auto-activate
      // via the page.tsx effect (wasCoachSpeaking transition). We trigger it by briefly
      // setting isCoachSpeaking true then false.
      if (lastMessage?.role === 'assistant') {
        setState((prev) => ({ ...prev, isCoachSpeaking: true }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, isCoachSpeaking: false }));
        }, 100);
      }
    },
    [fireRequest]
  );

  const setUserSpeaking = useCallback((speaking: boolean) => {
    setState((prev) => ({ ...prev, isUserSpeaking: speaking }));
  }, []);

  const reset = useCallback(() => {
    stopAudio();
    clearSavedSession(); // NEW: clear persistence
    pendingRef.current = null;
    setState({
      phase: 'love',
      messages: [],
      currentPhaseMessages: 0,
      isCoachSpeaking: false,
      isUserSpeaking: false,
      isLoading: false,
      synthesis: null,
      error: null,
    });
  }, [stopAudio]);

  return {
    ...state,
    isPlaying,
    sendMessage,
    startSession,
    resumeSession, // NEW
    retry,          // NEW
    setUserSpeaking,
    reset,
    unlockAudio,
  };
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/app/lib/types.ts src/app/hooks/useCoachSession.ts
git commit -m "feat: add retry, error state, and session persistence to coach session"
```

---

### Task 5: Audio stuck detection

**Files:**
- Modify: `src/app/hooks/useAudioPlayer.ts`

Add a safety timeout: if audio has been "playing" for 30s on a single chunk without `onended` firing, auto-advance to the next chunk. This prevents the UI from locking up.

**Step 1: Add safety timeout to playNextRef**

In `useAudioPlayer.ts`, add a `safetyTimerRef` and wire it into `playNextRef.current`:

Add this ref near the other refs (after line 22):

```typescript
const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

Replace the `playNextRef.current` assignment (lines 75-109) with:

```typescript
playNextRef.current = () => {
  // Clear any existing safety timer
  if (safetyTimerRef.current) {
    clearTimeout(safetyTimerRef.current);
    safetyTimerRef.current = null;
  }

  const next = queueRef.current.shift();
  if (!next) {
    setIsPlaying(false);
    playingRef.current = false;
    if (sealedRef.current) {
      sealedRef.current = false;
      onEndedRef.current?.();
    }
    return;
  }

  const audio = audioRef.current;
  if (!audio) return;

  loadAudio(audio, next);

  audio.onended = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    playingRef.current = false;
    playNextRef.current?.();
  };
  audio.onerror = () => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    playingRef.current = false;
    playNextRef.current?.();
  };

  playingRef.current = true;
  setIsPlaying(true);

  // Safety timeout: if this chunk hasn't ended in 30s, force-advance
  safetyTimerRef.current = setTimeout(() => {
    safetyTimerRef.current = null;
    if (playingRef.current) {
      audio.pause();
      playingRef.current = false;
      playNextRef.current?.();
    }
  }, 30000);

  audio.play().catch(() => {
    if (safetyTimerRef.current) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
    playingRef.current = false;
    playNextRef.current?.();
  });
};
```

Also clean up the safety timer in the `stop` function and in the cleanup effect:

In the `stop` callback, add at the top:

```typescript
if (safetyTimerRef.current) {
  clearTimeout(safetyTimerRef.current);
  safetyTimerRef.current = null;
}
```

In the `useEffect` cleanup (the one that creates the audio element), add:

```typescript
if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/hooks/useAudioPlayer.ts
git commit -m "feat: add 30s safety timeout to audio player to prevent stuck UI"
```

---

### Task 6: Resume screen, error banner, and mic watchdog in session page

**Files:**
- Modify: `src/app/session/page.tsx`

This is the main UI task. Three additions:

1. **Resume screen** — shown instead of "Prêt(e) à commencer ?" when a saved session exists
2. **Error banner** — replaces loading dots when an error occurs
3. **Mic watchdog** — subtle hint if mic captures nothing for 10s

**Step 1: Update the session page**

Replace the full file. Key changes annotated with `// NEW`:

```tsx
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachSession } from '../hooks/useCoachSession';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { loadSession, SavedSession } from '../lib/sessionPersistence';
import { ProgressBar } from '../components/ProgressBar';
import { CoachBubble } from '../components/CoachBubble';
import { UserBubble } from '../components/UserBubble';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { TranscriptDisplay } from '../components/TranscriptDisplay';

// NEW: Map phase to user-friendly French labels
const PHASE_LABELS: Record<string, string> = {
  love: 'Ce que vous aimez',
  good_at: 'Ce dans quoi vous excellez',
  world_needs: 'Ce dont le monde a besoin',
  paid_for: 'Ce pour quoi vous pouvez être payé(e)',
};

export default function SessionPage() {
  const router = useRouter();
  const {
    phase,
    messages,
    isCoachSpeaking,
    isLoading,
    synthesis,
    error,       // NEW
    sendMessage,
    startSession,
    resumeSession, // NEW
    retry,          // NEW
    setUserSpeaking,
    unlockAudio,
  } = useCoachSession();

  const {
    isListening,
    isSupported,
    transcript,
    transcriptRef,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [textInput, setTextInput] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasCoachSpeaking = useRef(false);

  // NEW: Saved session for resume prompt
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  // NEW: Mic watchdog state
  const [showMicHint, setShowMicHint] = useState(false);
  const micHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // NEW: Check for saved session on mount
  useEffect(() => {
    setSavedSession(loadSession());
    setCheckedStorage(true);
  }, []);

  // NEW: Mic watchdog — if listening but no transcript for 10s, show hint
  useEffect(() => {
    if (micHintTimerRef.current) {
      clearTimeout(micHintTimerRef.current);
      micHintTimerRef.current = null;
    }
    setShowMicHint(false);

    if (isListening && !transcript) {
      micHintTimerRef.current = setTimeout(() => {
        setShowMicHint(true);
      }, 10000);
    }

    return () => {
      if (micHintTimerRef.current) clearTimeout(micHintTimerRef.current);
    };
  }, [isListening, transcript]);

  const handleStart = useCallback(() => {
    unlockAudio();
    setHasStarted(true);
    setSavedSession(null); // NEW: clear resume state
    setShowOnboarding(true);
    startSession();
  }, [unlockAudio, startSession]);

  // NEW: Resume handler
  const handleResume = useCallback(() => {
    if (!savedSession) return;
    unlockAudio();
    setHasStarted(true);
    const toResume = savedSession;
    setSavedSession(null);
    resumeSession(toResume);
  }, [savedSession, unlockAudio, resumeSession]);

  // NEW: Fresh start from resume screen
  const handleFreshStart = useCallback(() => {
    setSavedSession(null);
    // handleStart will be called by clicking the normal start button
  }, []);

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, error]); // NEW: also scroll on error

  // Auto-activate mic when coach finishes speaking
  useEffect(() => {
    if (wasCoachSpeaking.current && !isCoachSpeaking && !isLoading && isSupported) {
      const timer = setTimeout(() => {
        resetTranscript();
        startListening();
        setUserSpeaking(true);
      }, 400);
      return () => clearTimeout(timer);
    }
    wasCoachSpeaking.current = isCoachSpeaking;
  }, [isCoachSpeaking, isLoading, isSupported, resetTranscript, startListening, setUserSpeaking]);

  // Navigate to results when synthesis is ready
  useEffect(() => {
    if (phase === 'results' && synthesis) {
      if (isListening) stopListening();
      const timer = setTimeout(() => {
        sessionStorage.setItem('ikigai-synthesis', JSON.stringify(synthesis));
        router.push('/results');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, synthesis, router, isListening, stopListening]);

  const handleStopRecording = useCallback(() => {
    stopListening();
    setUserSpeaking(false);
    setTimeout(() => {
      const finalText = (transcriptRef.current ?? '').trim();
      if (finalText) {
        sendMessage(finalText);
        resetTranscript();
      }
    }, 300);
  }, [stopListening, setUserSpeaking, transcriptRef, sendMessage, resetTranscript]);

  const handleStartRecording = useCallback(() => {
    resetTranscript();
    startListening();
    setUserSpeaking(true);
  }, [resetTranscript, startListening, setUserSpeaking]);

  const handleTextSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = textInput.trim();
      if (!text) return;
      if (isListening) {
        stopListening();
        setUserSpeaking(false);
        resetTranscript();
      }
      sendMessage(text);
      setTextInput('');
    },
    [textInput, sendMessage, isListening, stopListening, setUserSpeaking, resetTranscript]
  );

  const micDisabled = isCoachSpeaking || isLoading;

  // Don't render until we've checked sessionStorage (prevents flash)
  if (!checkedStorage) return null;

  // NEW: Resume screen — shown when saved session exists and user hasn't started
  if (!hasStarted && savedSession) {
    const phaseLabel = PHASE_LABELS[savedSession.phase] || savedSession.phase;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center text-3xl">
            🧘
          </div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
            Vous aviez une session en cours
          </h2>
          <p className="text-gray-500 mb-2 leading-relaxed">
            Vous en étiez à &laquo;&nbsp;{phaseLabel}&nbsp;&raquo;.
          </p>
          <p className="text-sm text-[#8B8580] mb-8">
            Vos réponses sont sauvegardées sur votre appareil.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleResume}
              className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
            >
              Reprendre
            </button>
            <button
              onClick={handleFreshStart}
              className="px-8 py-3 rounded-full text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Recommencer à zéro
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Pre-start screen
  if (!hasStarted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center text-3xl">
            🧘
          </div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
            Prêt(e) à commencer ?
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Votre coach va vous parler et écouter vos réponses. Trouvez un endroit calme et appuyez ci-dessous pour démarrer.
          </p>
          <button
            onClick={handleStart}
            className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
          >
            Démarrer la conversation
          </button>
        </div>
      </div>
    );
  }

  // Onboarding tooltip
  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="max-w-sm w-full mx-4 rounded-2xl bg-white p-6 shadow-xl text-center">
          <svg className="w-8 h-8 mx-auto mb-3 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="22" />
          </svg>
          <h3 className="text-lg font-semibold text-[#2D2A26] mb-4">
            Comment parler au coach
          </h3>
          <ul className="text-sm text-[#6B6560] text-left space-y-2 mb-6">
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">&bull;</span>
              Le micro s&apos;active automatiquement apr&egrave;s chaque question du coach
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">&bull;</span>
              Parlez naturellement, puis appuyez sur le bouton rouge pour envoyer
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">&bull;</span>
              Vous pouvez aussi taper dans le champ texte en bas
            </li>
          </ul>
          <button
            onClick={handleDismissOnboarding}
            className="px-6 py-3 rounded-full bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all"
          >
            Compris !
          </button>
        </div>
      </div>
    );
  }

  // Synthesizing screen — NEW: with timeout fallback
  if (phase === 'synthesizing' || (phase === 'results' && synthesis)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
            🧘
          </div>
          {error === 'synthesis' ? (
            <>
              <h2 className="text-xl font-semibold text-[#2D2A26] mb-3">
                La synthèse prend plus de temps que prévu
              </h2>
              <p className="text-gray-500 mb-6">
                Vos réponses sont sauvegardées sur votre appareil, rien n&apos;est perdu.
              </p>
              <button
                onClick={retry}
                className="px-6 py-3 rounded-full bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all"
              >
                Réessayer
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
                Réflexion sur tout ce que vous avez partagé...
              </h2>
              <p className="text-gray-500">Découverte des connexions entre vos passions, compétences et raison d&apos;être</p>
              <div className="mt-8 flex justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--background)]">
      {/* Header with progress */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-4">
          <ProgressBar phase={phase} />
        </div>
      </header>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto">
          {/* First-message loading */}
          {messages.length === 0 && isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center animate-pulse text-2xl">
                🧘
              </div>
              <p className="text-base font-medium text-[#2D2A26] mb-1">
                Votre coach pr&eacute;pare sa premi&egrave;re question...
              </p>
              <p className="text-sm text-[#8B8580]">Cela prend quelques secondes</p>
              <div className="mt-4 flex justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* NEW: First-message error */}
          {messages.length === 0 && !isLoading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 flex items-center justify-center text-2xl">
                🧘
              </div>
              <p className="text-base font-medium text-[#2D2A26] mb-1">
                Un petit souci de connexion
              </p>
              <p className="text-sm text-[#8B8580] mb-4">Impossible de joindre le coach pour le moment.</p>
              <button
                onClick={retry}
                className="px-6 py-3 rounded-full bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all"
              >
                Réessayer
              </button>
            </div>
          )}

          {messages.map((msg, i) =>
            msg.role === 'assistant' ? (
              <CoachBubble
                key={i}
                text={msg.content}
                isLatest={i === messages.length - 1}
              />
            ) : msg.role === 'user' ? (
              <UserBubble key={i} text={msg.content} />
            ) : null
          )}

          {/* Loading indicator (no error) */}
          {messages.length > 0 && isLoading && !error && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-sm">
                  🧘
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white shadow-sm border border-violet-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-violet-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NEW: Inline error banner — replaces loading dots */}
          {messages.length > 0 && error === 'chat' && !isLoading && (
            <div className="flex justify-start mb-4">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-sm">
                  🧘
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-4 bg-white shadow-sm border border-amber-200">
                  <p className="text-sm font-medium text-[#2D2A26] mb-1">
                    Un petit souci de connexion.
                  </p>
                  <p className="text-xs text-[#8B8580] mb-3">
                    Vos réponses sont sauvegardées sur votre appareil, rien n&apos;est perdu.
                  </p>
                  <button
                    onClick={retry}
                    className="px-4 py-2 rounded-full bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 active:scale-95 transition-all"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="border-t border-gray-100 bg-white/80 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          {/* Live transcript */}
          {isListening && <TranscriptDisplay text={transcript} />}

          {/* NEW: Mic watchdog hint */}
          {showMicHint && isListening && (
            <p className="text-xs text-amber-600 text-center mb-2">
              Le micro ne capte rien — essayez de parler plus fort ou tapez votre réponse ci-dessous
            </p>
          )}

          <div className="flex items-center gap-3">
            <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={
                  isCoachSpeaking
                    ? 'Le coach parle...'
                    : isLoading
                    ? 'Réflexion...'
                    : 'Tapez votre réponse...'
                }
                disabled={isCoachSpeaking || isLoading}
                className="flex-1 rounded-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isCoachSpeaking || isLoading}
                className="px-4 py-3 rounded-full bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Envoyer
              </button>
            </form>

            <VoiceRecorder
              isListening={isListening}
              isSupported={isSupported}
              disabled={micDisabled}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
            />
          </div>

          {!isSupported && (
            <p className="text-xs text-gray-400 text-center mt-2">
              La voix n&apos;est pas supportée dans ce navigateur — tapez vos réponses à la place
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Manual test**

1. Start a session, exchange 2-3 messages, refresh the page → should see "Vous aviez une session en cours" with Reprendre/Recommencer
2. Click Reprendre → conversation restores, coach continues
3. Open DevTools Network tab, block `/api/chat` → send a message → should see error banner after ~10s of retrying
4. Unblock, click Réessayer → coach responds normally
5. Test mic watchdog: start recording but stay silent for 10s → hint appears

**Step 4: Commit**

```bash
git add src/app/session/page.tsx
git commit -m "feat: add resume screen, error banners, and mic watchdog to session UI"
```

---

### Task 7: Clear session on results page

**Files:**
- Modify: `src/app/results/page.tsx`

The session storage for the coaching conversation should be cleared when the user reaches results (already handled in useCoachSession's synthesis path), but also clear it in the handleStartOver function for safety.

**Step 1: Add clearSavedSession to handleStartOver**

At the top of results/page.tsx, add the import:

```typescript
import { clearSavedSession } from '../lib/sessionPersistence';
```

In the `handleStartOver` function (around line 25-28), add `clearSavedSession()`:

```typescript
const handleStartOver = () => {
  sessionStorage.removeItem('ikigai-synthesis');
  clearSavedSession();
  router.push('/');
};
```

**Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/app/results/page.tsx
git commit -m "feat: clear saved session on start over from results"
```

---

## Summary of resilience layers

| Failure | Before | After |
|---------|--------|-------|
| Vercel timeout | Silent death | 60s timeout + auto-retry |
| API 500/network error | Silent freeze | 2 auto-retries → error banner with Réessayer |
| TTS failure | Silent skip (ok) | 1 retry then skip (better) |
| Tab refresh/crash | All work lost | Resume screen: "Reprendre votre session" |
| Audio player stuck | UI locked forever | 30s safety timeout, auto-advance |
| Mic captures nothing | User confused | 10s hint: "speak louder or type" |
| Synthesis fails | Stuck on spinner | Error banner + Réessayer on synthesis screen |
| Start session fails | Blank screen | Error state with Réessayer |
