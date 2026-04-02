'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachSession } from '../hooks/useCoachSession';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { loadSession, clearSavedSession, SavedSession } from '../lib/sessionPersistence';
import { ProgressBar } from '../components/ProgressBar';
import { CoachBubble } from '../components/CoachBubble';
import { UserBubble } from '../components/UserBubble';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { TranscriptDisplay } from '../components/TranscriptDisplay';

// Map phase to user-friendly French labels
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
    error,
    sendMessage,
    startSession,
    resumeSession,
    retry,
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
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wasCoachSpeaking = useRef(false);

  // Saved session for resume prompt
  const [savedSession, setSavedSession] = useState<SavedSession | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  // Mic watchdog state
  const [showMicHint, setShowMicHint] = useState(false);
  const micHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for saved session on mount
  useEffect(() => {
    setSavedSession(loadSession());
    setCheckedStorage(true);
  }, []);

  // Mic watchdog — if listening but no transcript for 10s, show hint
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

  // Warn user before closing tab during synthesis
  useEffect(() => {
    if (phase === 'synthesizing') {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [phase]);

  const handleStart = useCallback(() => {
    unlockAudio();
    setHasStarted(true);
    setSavedSession(null);
    setShowOnboarding(true);
    startSession();
  }, [unlockAudio, startSession]);

  // Resume handler
  const handleResume = useCallback(() => {
    if (!savedSession) return;
    unlockAudio();
    setHasStarted(true);
    const toResume = savedSession;
    setSavedSession(null);
    resumeSession(toResume);
  }, [savedSession, unlockAudio, resumeSession]);

  // Fresh start from resume screen
  const handleFreshStart = useCallback(() => {
    clearSavedSession();
    setSavedSession(null);
  }, []);

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, error]);

  // Auto-activate mic when coach finishes speaking — only if user is in voice mode
  useEffect(() => {
    if (wasCoachSpeaking.current && !isCoachSpeaking && !isLoading && isSupported && inputMode === 'voice') {
      const timer = setTimeout(() => {
        resetTranscript();
        startListening();
        setUserSpeaking(true);
      }, 400);
      return () => clearTimeout(timer);
    }
    wasCoachSpeaking.current = isCoachSpeaking;
  }, [isCoachSpeaking, isLoading, isSupported, inputMode, resetTranscript, startListening, setUserSpeaking]);

  // Navigate to results when synthesis is ready (data already stored by fireRequest)
  useEffect(() => {
    if (phase === 'results' && synthesis) {
      if (isListening) stopListening();
      const timer = setTimeout(() => {
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
    setTextInput('');
    setInputMode('voice');
    resetTranscript();
    startListening();
    setUserSpeaking(true);
  }, [resetTranscript, startListening, setUserSpeaking]);

  // Switch to text mode when the text field is focused while mic is active
  const handleTextFocus = useCallback(() => {
    if (isListening) {
      const currentTranscript = (transcriptRef.current ?? '').trim();
      stopListening();
      setUserSpeaking(false);
      resetTranscript();
      if (currentTranscript) {
        setTextInput(currentTranscript);
      }
    }
    setInputMode('text');
  }, [isListening, transcriptRef, stopListening, setUserSpeaking, resetTranscript]);

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

  // Resume screen — shown when saved session exists and user hasn't started
  if (!hasStarted && savedSession) {
    const isSynthesisRecovery = savedSession.phase === 'synthesizing';
    const phaseLabel = isSynthesisRecovery
      ? 'Synthèse en cours'
      : PHASE_LABELS[savedSession.phase] || savedSession.phase;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center text-3xl">
            🧘
          </div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
            {isSynthesisRecovery
              ? 'Votre synthèse a été interrompue'
              : 'Vous aviez une session en cours'}
          </h2>
          <p className="text-gray-500 mb-2 leading-relaxed">
            {isSynthesisRecovery
              ? 'Vos réponses sont intactes — on peut relancer la synthèse.'
              : <>Vous en étiez à &laquo;&nbsp;{phaseLabel}&nbsp;&raquo;.</>}
          </p>
          <p className="text-sm text-[#8B8580] mb-8">
            Vos réponses sont sauvegardées sur votre appareil.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleResume}
              className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
            >
              {isSynthesisRecovery ? 'Relancer la synthèse' : 'Reprendre'}
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

  // Synthesizing screen — with error fallback
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
              <p className="text-xs text-[#8B8580] mt-4">Merci de ne pas fermer cette page</p>
              <div className="mt-6 flex justify-center gap-2">
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

          {/* First-message error */}
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

          {/* Inline error banner — replaces loading dots */}
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

          {/* Mic watchdog hint */}
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
                onFocus={handleTextFocus}
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
