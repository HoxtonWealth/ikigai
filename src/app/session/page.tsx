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
  } = useCoachSession();

  const {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStarted = useRef(false);

  // Start session on mount
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startSession();
    }
  }, [startSession]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Navigate to results when synthesis is ready
  useEffect(() => {
    if (phase === 'results' && synthesis) {
      // Small delay so user sees the transition
      const timer = setTimeout(() => {
        // Store synthesis in sessionStorage for results page
        sessionStorage.setItem('ikigai-synthesis', JSON.stringify(synthesis));
        router.push('/results');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, synthesis, router]);

  // When user stops recording, send the transcript
  const handleStopRecording = useCallback(() => {
    stopListening();
    setUserSpeaking(false);
    // Small delay to let final transcript settle
    setTimeout(() => {
      const finalText = transcript.trim();
      if (finalText) {
        sendMessage(finalText);
        resetTranscript();
      }
    }, 300);
  }, [stopListening, setUserSpeaking, transcript, sendMessage, resetTranscript]);

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
      sendMessage(text);
      setTextInput('');
    },
    [textInput, sendMessage]
  );

  const micDisabled = isCoachSpeaking || isLoading;

  // Synthesizing screen
  if (phase === 'synthesizing' || (phase === 'results' && synthesis)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-[var(--background)]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center animate-pulse">
            🧘
          </div>
          <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
            Reflecting on everything you shared...
          </h2>
          <p className="text-gray-500">Discovering the connections between your passions, skills, and purpose</p>
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

          {isLoading && (
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
                    ? 'Coach is speaking...'
                    : isLoading
                    ? 'Thinking...'
                    : 'Type your response...'
                }
                disabled={isCoachSpeaking || isLoading}
                className="flex-1 rounded-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || isCoachSpeaking || isLoading}
                className="px-4 py-3 rounded-full bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Send
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
              Voice not supported in this browser — type your responses instead
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
