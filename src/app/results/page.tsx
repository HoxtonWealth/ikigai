'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IkigaiSynthesis } from '../lib/types';
import { IkigaiDiagram } from '../components/IkigaiDiagram';
import { clearSavedSession } from '../lib/sessionPersistence';

export default function ResultsPage() {
  const router = useRouter();
  const [synthesis, setSynthesis] = useState<IkigaiSynthesis | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('ikigai-synthesis');
    if (stored) {
      try {
        setSynthesis(JSON.parse(stored));
      } catch {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const handleStartOver = () => {
    sessionStorage.removeItem('ikigai-synthesis');
    clearSavedSession();
    router.push('/');
  };

  if (!synthesis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Chargement de vos résultats...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-[#2D2A26] mb-2">
          Votre Ikigai
        </h1>
        <p className="text-center text-[#6B6560] mb-8">
          Voici ce que nous avons découvert ensemble
        </p>

        {/* Diagram */}
        <IkigaiDiagram synthesis={synthesis} />

        {/* Ikigai Statement */}
        <div className="mt-8 p-6 rounded-2xl bg-violet-50 border border-violet-100 text-center">
          <p className="text-lg sm:text-xl font-semibold text-violet-800 leading-relaxed">
            {synthesis.ikigaiStatement}
          </p>
        </div>

        {/* Full Synthesis */}
        <div className="mt-8 space-y-4">
          {synthesis.fullSynthesis.split('\n\n').map((paragraph, i) => (
            <p key={i} className="text-[#4B4540] leading-relaxed text-sm sm:text-base">
              {paragraph}
            </p>
          ))}
        </div>

        {/* Themes breakdown */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            { label: 'Ce que vous Aimez', themes: synthesis.love, color: 'bg-rose-50 border-rose-100' },
            { label: 'Vos Talents', themes: synthesis.goodAt, color: 'bg-amber-50 border-amber-100' },
            { label: 'Ce dont le Monde a Besoin', themes: synthesis.worldNeeds, color: 'bg-emerald-50 border-emerald-100' },
            { label: 'Ce pour quoi on vous Paie', themes: synthesis.paidFor, color: 'bg-violet-50 border-violet-100' },
          ].map((section) => (
            <div key={section.label} className={`p-4 rounded-xl border ${section.color}`}>
              <h3 className="text-xs font-semibold text-[#2D2A26] mb-2">{section.label}</h3>
              <ul className="space-y-1">
                {section.themes.map((theme, i) => (
                  <li key={i} className="text-xs text-[#6B6560]">
                    {theme}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-10 text-center pb-8">
          <button
            onClick={handleStartOver}
            className="px-8 py-3 rounded-full bg-violet-500 text-white font-semibold hover:bg-violet-600 active:scale-95 transition-all"
          >
            Recommencer
          </button>
        </div>
      </div>
    </main>
  );
}
