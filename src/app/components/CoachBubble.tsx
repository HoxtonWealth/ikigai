'use client';

export function CoachBubble({ text, isLatest }: { text: string; isLatest?: boolean }) {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[75%]">
        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 text-sm">
          🧘
        </div>
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm sm:text-base leading-relaxed ${
            isLatest
              ? 'bg-white shadow-sm border border-violet-100'
              : 'bg-white/60 border border-gray-100'
          }`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}
