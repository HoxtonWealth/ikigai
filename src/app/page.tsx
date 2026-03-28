'use client';

import { useRouter } from 'next/navigation';

const CIRCLES = [
  { label: 'Ce que vous Aimez', color: '#F87171', x: 140, y: 100 },
  { label: 'Vos Talents', color: '#FBBF24', x: 220, y: 100 },
  { label: 'Ce dont le Monde a Besoin', color: '#34D399', x: 140, y: 175 },
  { label: 'Ce pour quoi on vous Paie', color: '#A78BFA', x: 220, y: 175 },
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
        Votre raison d&apos;être
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
          Coach Ikigai
        </h1>
        <p className="text-base sm:text-lg text-[#6B6560] mb-8">
          Découvrez votre raison d&apos;être à travers une conversation vocale guidée
        </p>

        <IkigaiPreview />

        <p className="text-sm text-[#8B8580] mt-6 mb-8 leading-relaxed px-4">
          L&apos;Ikigai est le concept japonais qui consiste à trouver sa raison d&apos;être
          à l&apos;intersection de ce que vous <strong>aimez</strong>, ce dans quoi vous
          êtes <strong>doué(e)</strong>, ce dont le <strong>monde a besoin</strong>,
          et ce pour quoi vous pouvez être <strong>payé(e)</strong>. Cette session de
          coaching d&apos;environ 20 minutes vous aidera à explorer chaque dimension.
        </p>

        <button
          onClick={handleBegin}
          className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
        >
          Commencer votre voyage
        </button>

        <p className="text-xs text-[#A8A3A0] mt-4">
          Fonctionne mieux sur Chrome avec un microphone. Saisie texte disponible en alternative.
        </p>
      </div>
    </main>
  );
}
