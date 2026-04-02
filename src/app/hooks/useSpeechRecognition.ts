'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/* eslint-disable @typescript-eslint/no-explicit-any */

type UseSpeechRecognitionReturn = {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  transcriptRef: React.RefObject<string>;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
};

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const isStoppingRef = useRef(false);
  // Accumulated finalized text from previous recognition sessions (across auto-restarts)
  const accumulatedRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fr-FR';

      recognition.onresult = (event: any) => {
        let sessionText = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionText += event.results[i][0].transcript;
        }
        const full = accumulatedRef.current
          ? accumulatedRef.current + ' ' + sessionText
          : sessionText;
        transcriptRef.current = full;
        setTranscript(full);
      };

      recognition.onend = () => {
        // With continuous: true, recognition can end unexpectedly (e.g. silence timeout).
        // Restart if we haven't explicitly stopped.
        if (!isStoppingRef.current && recognitionRef.current) {
          // Save finalized text before restarting so it's not lost
          accumulatedRef.current = transcriptRef.current;
          try {
            recognitionRef.current.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
      };

      recognition.onerror = (event: any) => {
        // 'no-speech' is normal — don't stop listening for it
        if (event.error === 'no-speech') return;
        setIsListening(false);
        isStoppingRef.current = false;
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isStoppingRef.current = false;
    accumulatedRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      // Already started — ignore
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    isStoppingRef.current = true;
    recognitionRef.current.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    accumulatedRef.current = '';
    transcriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    transcriptRef,
    startListening,
    stopListening,
    resetTranscript,
  };
}
