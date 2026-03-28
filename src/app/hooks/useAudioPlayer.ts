'use client';

import { useState, useCallback, useRef } from 'react';

type UseAudioPlayerReturn = {
  isPlaying: boolean;
  play: (audioData: ArrayBuffer) => Promise<void>;
  stop: () => void;
};

export function useAudioPlayer(onEnded?: () => void): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const play = useCallback(
    async (audioData: ArrayBuffer) => {
      cleanup();

      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        cleanup();
        onEnded?.();
      };

      audio.onerror = () => {
        setIsPlaying(false);
        cleanup();
      };

      setIsPlaying(true);
      await audio.play();
    },
    [cleanup, onEnded]
  );

  const stop = useCallback(() => {
    cleanup();
    setIsPlaying(false);
  }, [cleanup]);

  return { isPlaying, play, stop };
}
