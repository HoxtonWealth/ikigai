'use client';

type VoiceRecorderProps = {
  isListening: boolean;
  isSupported: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
};

export function VoiceRecorder({
  isListening,
  isSupported,
  disabled,
  onStart,
  onStop,
}: VoiceRecorderProps) {
  if (!isSupported) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={isListening ? onStop : onStart}
        disabled={disabled}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
          isListening
            ? 'bg-red-500 text-white scale-110 animate-mic-pulse'
            : disabled
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-violet-500 text-white hover:bg-violet-600 hover:scale-105 active:scale-95'
        }`}
        aria-label={isListening ? 'Appuyez pour terminer' : 'Appuyez pour parler'}
      >
        {isListening ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        )}
      </button>
      {isListening && (
        <span className="text-[10px] text-red-500 font-medium">Appuyez pour terminer</span>
      )}
    </div>
  );
}
