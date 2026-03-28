'use client';

import { useRouter } from 'next/navigation';

const CIRCLES = [
  { label: 'What you Love', color: '#F87171', x: 140, y: 100 },
  { label: 'What you\'re Good At', color: '#FBBF24', x: 220, y: 100 },
  { label: 'What the World Needs', color: '#34D399', x: 140, y: 175 },
  { label: 'What you can be Paid For', color: '#A78BFA', x: 220, y: 175 },
];

function IkigaiPreview() {
  return (
    <svg viewBox="0 0 360 300" className="w-full max-w-[320px] sm:max-w-[360px] mx-auto">
      {CIRCLES.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={80}
          fill={c.color}
          fillOpacity={0.2}
          stroke={c.color}
          strokeWidth={2}
          strokeOpacity={0.4}
        />
      ))}
      {CIRCLES.map((c, i) => {
        const textX = i % 2 === 0 ? c.x - 50 : c.x + 50;
        const textY = i < 2 ? c.y - 55 : c.y + 65;
        return (
          <text
            key={`label-${i}`}
            x={textX}
            y={textY}
            textAnchor="middle"
            className="text-[11px] font-medium"
            fill="#4B4540"
          >
            {c.label}
          </text>
        );
      })}
      <text
        x="180"
        y="135"
        textAnchor="middle"
        className="text-[13px] font-bold"
        fill="#2D2A26"
      >
        IKIGAI
      </text>
      <text
        x="180"
        y="152"
        textAnchor="middle"
        className="text-[10px]"
        fill="#6B6560"
      >
        Your reason for being
      </text>
    </svg>
  );
}

export default function Home() {
  const router = useRouter();

  const handleBegin = async () => {
    // Request mic permission before navigating
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      // User denied or no mic — text fallback will cover this
    }
    router.push('/session');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2D2A26] mb-2">
          Ikigai Coach
        </h1>
        <p className="text-base sm:text-lg text-[#6B6560] mb-8">
          Discover your reason for being through a guided voice conversation
        </p>

        <IkigaiPreview />

        <p className="text-sm text-[#8B8580] mt-6 mb-8 leading-relaxed px-4">
          Ikigai is the Japanese concept of finding purpose at the intersection of
          what you <strong>love</strong>, what you&apos;re <strong>good at</strong>,
          what the <strong>world needs</strong>, and what you can be{' '}
          <strong>paid for</strong>. This ~20 minute coaching session will help you
          explore each dimension.
        </p>

        <button
          onClick={handleBegin}
          className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
        >
          Begin Your Journey
        </button>

        <p className="text-xs text-[#A8A3A0] mt-4">
          Works best in Chrome with a microphone. Text input available as fallback.
        </p>
      </div>
    </main>
  );
}
