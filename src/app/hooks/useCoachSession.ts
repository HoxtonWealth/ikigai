'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, Phase, CoachingPhase, SessionState, IkigaiSynthesis } from '../lib/types';
import { useAudioPlayer } from './useAudioPlayer';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { saveSession, clearSavedSession, saveSynthesisBackup, SavedSession } from '../lib/sessionPersistence';

const MAX_TTS_CONCURRENT = 2;

function createSemaphore(max: number) {
  let count = 0;
  const queue: (() => void)[] = [];
  return {
    acquire: () => new Promise<void>(resolve => {
      if (count < max) { count++; resolve(); }
      else queue.push(() => { count++; resolve(); });
    }),
    release: () => {
      count--;
      const next = queue.shift();
      if (next) next();
    },
  };
}

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

// Pending request type for retry support
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
    error: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  // Store pending request for retry
  const pendingRef = useRef<PendingRequest | null>(null);

  const onAudioEnded = useCallback(() => {
    setState((prev) => ({ ...prev, isCoachSpeaking: false }));
  }, []);

  const { enqueue: enqueueAudio, seal: sealAudio, stop: stopAudio, isPlaying, unlock: unlockAudio } = useAudioPlayer(onAudioEnded);

  const ttsSentence = useCallback(
    async (sentence: string): Promise<ArrayBuffer | null> => {
      // Retry TTS once
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
      const sem = createSemaphore(MAX_TTS_CONCURRENT);

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

          const ttsPromise = (async () => {
            await sem.acquire();
            try {
              return await ttsSentence(sentence);
            } finally {
              sem.release();
            }
          })();
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

      // Persist after successful coach response
      saveSession(
        [...updatedMessages, { role: 'assistant', content: finalText }],
        resolvedPhase,
        resolvedCount,
      );

      // Clear pending — request succeeded
      pendingRef.current = null;
    },
    [ttsSentence, enqueueAudio, sealAudio]
  );

  // Core request function — used by sendMessage, retry, and resumeSession
  const fireRequest = useCallback(
    async (pending: PendingRequest) => {
      pendingRef.current = pending;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const requestBody = JSON.stringify({
          messages: pending.updatedMessages.filter((m) => m.role !== 'system'),
          phase: pending.phaseForApi,
        });
        const requestHeaders = { 'Content-Type': 'application/json' };

        let chatRes: Response;

        if (pending.phaseForApi === 'synthesis') {
          // Synthesis: non-streaming — retries make sense
          chatRes = await fetchWithRetry(
            '/api/chat',
            { method: 'POST', headers: requestHeaders, body: requestBody },
            { retries: 2, delay: 2000 },
          );
        } else {
          // Streaming: fail fast with 45s abort instead of 3x60s retry loop
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 45000);
          try {
            chatRes = await fetch('/api/chat', {
              method: 'POST',
              headers: requestHeaders,
              body: requestBody,
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timeout);
          }
        }

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

          // Store synthesis in sessionStorage + localStorage backup before clearing session
          sessionStorage.setItem('ikigai-synthesis', JSON.stringify(synthesis));
          saveSynthesisBackup(response, synthesis);

          setState((prev) => ({
            ...prev,
            phase: 'results',
            isLoading: false,
            synthesis,
            messages: [...pending.updatedMessages, { role: 'assistant' as const, content: response }],
          }));

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

      // Save user message right away (in case crash before coach responds)
      // Use nextPhase (not current.phase) so resume picks up the correct prompt
      const phaseToSave = newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase ? nextPhase : current.phase;
      saveSession(updatedMessages, phaseToSave, newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase ? 0 : newPhaseCount);

      const shouldTransition = newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase;
      await fireRequest({ updatedMessages, phaseForApi, shouldTransition, nextPhase, newPhaseCount });
    },
    [fireRequest]
  );

  // Retry last failed request
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

  // Resume from saved session
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
        const nextPhase = saved.phase;
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
    clearSavedSession();
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
    resumeSession,
    retry,
    setUserSpeaking,
    reset,
    unlockAudio,
  };
}
