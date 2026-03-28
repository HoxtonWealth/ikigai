'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type UseAudioPlayerReturn = {
  isPlaying: boolean;
  play: (audioData: ArrayBuffer) => Promise<void>;
  stop: () => void;
  unlock: () => void;
};

export function useAudioPlayer(onEnded?: () => void): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  // Create a persistent audio element once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio();
    audio.setAttribute('playsinline', '');
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Unlock audio playback — call this during a user gesture (e.g. "Begin" button click)
  const unlock = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Use AudioContext to generate a short silent buffer — more reliable than base64 MP3
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      ctx.resume();
    } catch {
      // Ignore
    }
    // Also unlock the HTML audio element itself
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.volume = 1;
      audio.currentTime = 0;
    }).catch(() => {
      // Ignore — we'll try again on next user gesture
    });
  }, []);

  const play = useCallback(
    async (audioData: ArrayBuffer) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Revoke previous URL
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      audio.onended = () => {
        setIsPlaying(false);
        onEndedRef.current?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };

      audio.src = url;
      setIsPlaying(true);

      try {
        await audio.play();
      } catch (err) {
        console.error('[AudioPlayer] play() failed:', err);
        setIsPlaying(false);
      }
    },
    []
  );

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, stop, unlock };
}
