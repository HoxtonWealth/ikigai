'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import { IkigaiSynthesis } from '../lib/types';
import { IkigaiDiagram } from '../components/IkigaiDiagram';
import { ShareableCard } from '../components/ShareableCard';
import { clearSavedSession } from '../lib/sessionPersistence';

export default function ResultsPage() {
  const router = useRouter();
  const [synthesis, setSynthesis] = useState<IkigaiSynthesis | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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

  const handleShare = useCallback(async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      });

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) return;

      const file = new File([blob], 'mon-ikigai.png', { type: 'image/png' });

      // Try native share if available and supports files
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mon-ikigai.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // User cancelled share sheet — not an error
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('[Share] Failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  if (!synthesis) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Chargement de vos résultats...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] py-8 px-4">
      {/* Off-screen card for html2canvas */}
      <ShareableCard ref={cardRef} synthesis={synthesis} />

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

        {/* Share button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleShare}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
          >
            {isGenerating ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
                </svg>
                Création de l&apos;image...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                Partager mon Ikigai
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="mt-6 text-center pb-8">
          <button
            onClick={handleStartOver}
            className="px-8 py-3 rounded-full text-gray-500 text-sm hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Recommencer
          </button>
        </div>
      </div>
    </main>
  );
}
