'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCoachSession } from '../hooks/useCoachSession';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { ProgressBar } from '../components/ProgressBar';
import { CoachBubble } from '../components/CoachBubble';
import { UserBubble } from '../components/UserBubble';
import { VoiceRecorder } from '../components/VoiceRecorder';
import { TranscriptDisplay } from '../components/TranscriptDisplay';

export default function SessionPage() {
  const router = useRouter();
  const {
    phase,
    messages,
    isCoachSpeaking,
    isLoading,
    synthesis,
    sendMessage,
    startSession,
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

  // User clicks to start — this is the user gesture that unlocks audio
  const handleStart = useCallback(() => {
    unlockAudio();
    setHasStarted(true);
    setShowOnboarding(true);
  }, [unlockAudio]);

  const handleDismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    startSession();
  }, [startSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-activate mic when coach finishes speaking
  useEffect(() => {
    if (wasCoachSpeaking.current && !isCoachSpeaking && !isLoading && isSupported) {
      // Coach just finished speaking — auto-start mic for user's turn
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
      // Stop mic if it's on
      if (isListening) stopListening();
      const timer = setTimeout(() => {
        sessionStorage.setItem('ikigai-synthesis', JSON.stringify(synthesis));
        router.push('/results');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, synthesis, router, isListening, stopListening]);

  // When user clicks stop — use ref to get latest transcript (no stale closure)
  const handleStopRecording = useCallback(() => {
    stopListening();
    setUserSpeaking(false);
    // Small delay to let final transcript settle
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
      // If mic is on, stop it — user chose to type instead
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

  // Pre-start screen — user gesture unlocks audio playback
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

  // Onboarding tooltip — shown once after "Démarrer la conversation"
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
              <span className="text-violet-500 flex-shrink-0">•</span>
              Le micro s&apos;active automatiquement apr&egrave;s chaque question du coach
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">•</span>
              Parlez naturellement, puis appuyez sur le bouton rouge pour envoyer
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">•</span>
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

  // Synthesizing screen
  if (phase === 'synthesizing' || (phase === 'results' && synthesis)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
            🧘
          </div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
            Réflexion sur tout ce que vous avez partagé...
          </h2>
          <p className="text-gray-500">Découverte des connexions entre vos passions, compétences et raison d&apos;être</p>
          <div className="mt-8 flex justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
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
          {/* First-message loading: prominent centered state */}
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

          {messages.length > 0 && isLoading && (
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

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input area */}
      <footer className="border-t border-gray-100 bg-white/80 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          {/* Live transcript */}
          {isListening && <TranscriptDisplay text={transcript} />}

          <div className="flex items-center gap-3">
            {/* Text input (always visible — serves as fallback) */}
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

            {/* Mic button (hidden if unsupported) */}
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
