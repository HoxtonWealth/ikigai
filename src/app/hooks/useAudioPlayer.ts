'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

type UseAudioPlayerReturn = {
  isPlaying: boolean;
  play: (audioData: ArrayBuffer) => Promise<void>;
  enqueue: (audioData: ArrayBuffer) => void;
  stop: () => void;
  unlock: () => void;
};

export function useAudioPlayer(onEnded?: () => void): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const onEndedRef = useRef(onEnded);
  const queueRef = useRef<ArrayBuffer[]>([]);
  const playingRef = useRef(false);
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

  // Unlock audio playback — call this during a user gesture
  const unlock = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
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
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.volume = 0;
    audio.play().then(() => {
      audio.pause();
      audio.volume = 1;
      audio.currentTime = 0;
    }).catch(() => {
      // Ignore
    });
  }, []);

  // Play next chunk from queue, or fire onEnded when empty
  const playNextRef = useRef<() => void>();
  playNextRef.current = () => {
    const next = queueRef.current.shift();
    if (!next) {
      setIsPlaying(false);
      playingRef.current = false;
      onEndedRef.current?.();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
    }

    const blob = new Blob([next], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    urlRef.current = url;

    audio.onended = () => {
      playingRef.current = false;
      playNextRef.current?.();
    };
    audio.onerror = () => {
      playingRef.current = false;
      playNextRef.current?.();
    };

    audio.src = url;
    playingRef.current = true;
    setIsPlaying(true);

    audio.play().catch(() => {
      playingRef.current = false;
      playNextRef.current?.();
    });
  };

  // Enqueue audio for sequential playback
  const enqueue = useCallback((audioData: ArrayBuffer) => {
    queueRef.current.push(audioData);
    if (!playingRef.current) {
      playNextRef.current?.();
    }
  }, []);

  // Direct play — clears queue, plays immediately (used for non-streaming)
  const play = useCallback(
    async (audioData: ArrayBuffer) => {
      queueRef.current = [];
      const audio = audioRef.current;
      if (!audio) return;

      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }

      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      audio.onended = () => {
        setIsPlaying(false);
        playingRef.current = false;
        onEndedRef.current?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        playingRef.current = false;
      };

      audio.src = url;
      setIsPlaying(true);
      playingRef.current = true;

      try {
        await audio.play();
      } catch (err) {
        console.error('[AudioPlayer] play() failed:', err);
        setIsPlaying(false);
        playingRef.current = false;
      }
    },
    []
  );

  const stop = useCallback(() => {
    queueRef.current = [];
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    playingRef.current = false;
  }, []);

  return { isPlaying, play, enqueue, stop, unlock };
}
