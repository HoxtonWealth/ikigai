'use client';

import { Phase } from '../lib/types';

const CIRCLES = [
  { phase: 'love', label: 'Amour', color: 'bg-rose-400' },
  { phase: 'good_at', label: 'Talents', color: 'bg-amber-400' },
  { phase: 'world_needs', label: 'Le Monde', color: 'bg-emerald-400' },
  { phase: 'paid_for', label: 'Carrière', color: 'bg-violet-400' },
] as const;

const PHASE_ORDER = ['love', 'good_at', 'world_needs', 'paid_for'];

export function ProgressBar({ phase }: { phase: Phase }) {
  const currentIdx = PHASE_ORDER.indexOf(phase as string);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 py-3">
      {CIRCLES.map((circle, idx) => {
        const isActive = circle.phase === phase;
        const isDone = currentIdx > idx || phase === 'synthesizing' || phase === 'results';

        return (
          <div key={circle.phase} className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                isActive
                  ? `${circle.color} text-white scale-110 ring-2 ring-offset-2 ring-current`
                  : isDone
                  ? `${circle.color} text-white opacity-80`
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              {isDone && !isActive ? '✓' : idx + 1}
            </div>
            <span
              className={`text-[10px] sm:text-xs transition-colors ${
                isActive ? 'text-[#2D2A26] font-semibold' : 'text-gray-400'
              }`}
            >
              {circle.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
