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

  const { play: playAudio, stop: stopAudio, isPlaying, unlock: unlockAudio } = useAudioPlayer(onAudioEnded);

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
        // Call chat API
        const chatRes = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages.filter((m) => m.role !== 'system'),
            phase: phaseForApi,
          }),
        });

        if (!chatRes.ok) throw new Error('Chat API failed');

        const { response } = await chatRes.json();

        // Handle synthesis phase
        if (phaseForApi === 'synthesis') {
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

        const assistantMessage: Message = { role: 'assistant', content: response };

        // Update state with phase transition if needed
        const shouldTransition = newPhaseCount >= MESSAGES_PER_PHASE && nextPhase !== current.phase;
        setState((prev) => ({
          ...prev,
          messages: [...updatedMessages, assistantMessage],
          isLoading: false,
          isCoachSpeaking: true,
          phase: shouldTransition ? nextPhase : prev.phase,
          currentPhaseMessages: shouldTransition ? 0 : newPhaseCount,
        }));

        // Play TTS
        try {
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: response }),
          });

          if (ttsRes.ok) {
            const audioData = await ttsRes.arrayBuffer();
            console.log('[CoachSession] TTS audio received, size:', audioData.byteLength);
            await playAudio(audioData);
          } else {
            console.error('[CoachSession] TTS failed:', ttsRes.status, await ttsRes.text());
            setState((prev) => ({ ...prev, isCoachSpeaking: false }));
          }
        } catch (err) {
          console.error('[CoachSession] TTS error:', err);
          setState((prev) => ({ ...prev, isCoachSpeaking: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [playAudio]
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

      const { response } = await chatRes.json();
      const assistantMessage: Message = { role: 'assistant', content: response };

      setState((prev) => ({
        ...prev,
        messages: [assistantMessage],
        isLoading: false,
        isCoachSpeaking: true,
      }));

      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: response }),
        });

        if (ttsRes.ok) {
          const audioData = await ttsRes.arrayBuffer();
          console.log('[CoachSession] Start TTS audio received, size:', audioData.byteLength);
          await playAudio(audioData);
        } else {
          console.error('[CoachSession] Start TTS failed:', ttsRes.status, await ttsRes.text());
          setState((prev) => ({ ...prev, isCoachSpeaking: false }));
        }
      } catch (err) {
        console.error('[CoachSession] Start TTS error:', err);
        setState((prev) => ({ ...prev, isCoachSpeaking: false }));
      }
    } catch (err) {
      console.error('[CoachSession] Start session error:', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [playAudio]);

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
