'use client';

import { useState, useCallback, useRef } from 'react';
import { Message, Phase, CoachingPhase, SessionState, IkigaiSynthesis } from '../lib/types';
import { useAudioPlayer } from './useAudioPlayer';

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

        try {
          const parsed: SSEEvent = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          if (parsed.done) {
            lastFullText = parsed.full;
          } else if (parsed.sentence) {
            onSentence(parsed.sentence);
          }
        } catch {
          continue;
        }
      }
    }
  }

  onDone(lastFullText);
}

export function useCoachSession() {
  const [state, setState] = useState<SessionState>({
    phase: 'love',
    messages: [],
    currentPhaseMessages: 0,
    isCoachSpeaking: false,
    isUserSpeaking: false,
    isLoading: false,
    synthesis: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const onAudioEnded = useCallback(() => {
    setState((prev) => ({ ...prev, isCoachSpeaking: false }));
  }, []);

  const { enqueue: enqueueAudio, seal: sealAudio, stop: stopAudio, isPlaying, unlock: unlockAudio } = useAudioPlayer(onAudioEnded);

  // Fire TTS for a sentence and enqueue audio when ready
  const ttsSentence = useCallback(
    async (sentence: string): Promise<ArrayBuffer | null> => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence }),
        });
        if (!res.ok) return null;
        return res.arrayBuffer();
      } catch {
        return null;
      }
    },
    []
  );

  // Stream a coaching response: display text progressively, TTS per sentence
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
        // onSentence — fire TTS immediately, update display
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

          // Fire TTS now (runs in parallel), but enqueue in order via chain
          const ttsPromise = ttsSentence(sentence);
          audioChain = audioChain.then(async () => {
            const audioData = await ttsPromise;
            if (audioData) enqueueAudio(audioData);
          });
        },
        // onDone
        (fullText) => {
          finalText = fullText || displayedText;
        },
      );

      // Wait for all TTS to complete and enqueue, then seal
      await audioChain;
      sealAudio();

      // Final state with authoritative text + phase transition
      setState((prev) => ({
        ...prev,
        messages: [
          ...updatedMessages,
          { role: 'assistant' as const, content: finalText },
        ],
        phase: shouldTransition ? nextPhase : prev.phase,
        currentPhaseMessages: shouldTransition ? 0 : newPhaseCount,
      }));
    },
    [ttsSentence, enqueueAudio, sealAudio]
  );

  const sendMessage = useCallback(
    async (userText: string) => {
      const current = stateRef.current;
      if (current.isLoading || current.isCoachSpeaking) return;

      const userMessage: Message = { role: 'user', content: userText };
      const updatedMessages = [...current.messages, userMessage];
      const newPhaseCount = current.currentPhaseMessages + 1;

      // Check if we should transition phases
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

      setState((prev) => ({
        ...prev,
        messages: updatedMessages,
        isLoading: true,
        isUserSpeaking: false,
        currentPhaseMessages: newPhaseCount,
      }));

      try {
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.filter((m) => m.role !== 'system'),
            phase: phaseForApi,
          }),
        });

        if (!chatRes.ok) throw new Error('Chat API failed');

        // Synthesis: non-streaming JSON response
        if (phaseForApi === 'synthesis') {
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
            messages: [...updatedMessages, { role: 'assistant' as const, content: response }],
          }));
          return;
        }

        // Coaching: streaming SSE response
        const shouldTransition = newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase;
        await streamCoachResponse(chatRes, updatedMessages, shouldTransition, nextPhase, newPhaseCount);
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [streamCoachResponse]
  );

  const startSession = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [], phase: 'love' }),
      });

      if (!chatRes.ok) throw new Error('Chat API failed');

      await streamCoachResponse(chatRes, [], false, 'love', 0);
    } catch (err) {
      console.error('[CoachSession] Start session error:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [streamCoachResponse]);

  const setUserSpeaking = useCallback((speaking: boolean) => {
    setState((prev) => ({ ...prev, isUserSpeaking: speaking }));
  }, []);

  const reset = useCallback(() => {
    stopAudio();
    setState({
      phase: 'love',
      messages: [],
      currentPhaseMessages: 0,
      isCoachSpeaking: false,
      isUserSpeaking: false,
      isLoading: false,
      synthesis: null,
    });
  }, [stopAudio]);

  return {
    ...state,
    isPlaying,
    sendMessage,
    startSession,
    setUserSpeaking,
    reset,
    unlockAudio,
  };
}
