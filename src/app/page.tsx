'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkInAppBrowser, checkMediaDevicesAvailable, interpretMicError, MicErrorInfo } from './lib/micErrors';

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

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

const IKIGAI_CARDS = [
  {
    title: 'Ce que vous aimez',
    desc: 'Vos passions, ce qui vous fait vibrer',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
  {
    title: 'Vos talents',
    desc: 'Ce dans quoi vous excellez naturellement',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  {
    title: 'Besoins du monde',
    desc: 'Ce qui vous touche et que vous voulez changer',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  {
    title: 'Ce qu\u2019on vous paie',
    desc: 'Vos comp\u00e9tences monnayables',
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
  },
];

const STEPS = [
  {
    title: 'Le coach vous pose une question',
    desc: 'Vous entendez la voix du coach qui vous guide \u00e0 travers chaque cercle de l\u2019Ikigai',
  },
  {
    title: 'Vous r\u00e9pondez \u00e0 voix haute',
    desc: 'Le micro s\u2019active automatiquement apr\u00e8s chaque question. Parlez naturellement, puis appuyez sur le bouton pour envoyer. Vous pouvez aussi taper.',
  },
  {
    title: 'Le coach s\u2019adapte \u00e0 vous',
    desc: 'Il pose des questions de relance bas\u00e9es sur vos r\u00e9ponses, puis passe au cercle suivant',
  },
  {
    title: 'Votre Ikigai se r\u00e9v\u00e8le',
    desc: 'Apr\u00e8s les 4 cercles (~20 min), l\u2019IA synth\u00e9tise vos r\u00e9ponses en un diagramme Ikigai personnalis\u00e9',
  },
];

const WALKTHROUGH = [
  {
    title: 'Cliquez \u00ab Commencer \u00bb',
    desc: 'Votre navigateur demandera acc\u00e8s au micro \u2014 acceptez pour l\u2019exp\u00e9rience vocale, ou refusez pour taper vos r\u00e9ponses',
  },
  {
    title: 'Le coach se pr\u00e9sente',
    desc: 'Il vous accueille, vous explique la m\u00e9thode des 4 cercles et comment la session va se d\u00e9rouler',
  },
  {
    title: 'Le micro s\u2019active tout seul',
    desc: 'Apr\u00e8s chaque question du coach, le micro d\u00e9marre automatiquement. Parlez, puis appuyez sur le bouton rouge pour envoyer votre r\u00e9ponse',
  },
  {
    title: 'Laissez-vous guider',
    desc: 'Le coach encha\u00eene les questions naturellement. La barre en haut montre votre progression \u00e0 travers les 4 cercles',
  },
];

export default function Home() {
  const router = useRouter();
  const [showMicSetup, setShowMicSetup] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [micError, setMicError] = useState<MicErrorInfo | null>(null);

  // Detect in-app browser or missing mediaDevices on mount
  useEffect(() => {
    if (!showMicSetup) return;
    const inApp = checkInAppBrowser();
    if (inApp) {
      setMicError(inApp);
      return;
    }
    const noMedia = checkMediaDevicesAvailable();
    if (noMedia) {
      setMicError(noMedia);
    }
  }, [showMicSetup]);

  const handleRequestMic = useCallback(async () => {
    setMicError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicGranted(true);
      setTimeout(() => router.push('/session'), 1000);
    } catch (err) {
      setMicError(interpretMicError(err));
    }
  }, [router]);

  // State 2: Mic permission screen
  if (showMicSetup) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-[var(--background)]">
        <div className="max-w-sm w-full text-center">
          {micGranted ? (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-[#2D2A26] mb-2">
                Micro activ&eacute; !
              </h2>
              <p className="text-sm text-[#6B6560]">Lancement de la session...</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-violet-100 flex items-center justify-center">
                <MicIcon className="w-10 h-10 text-violet-500" />
              </div>
              <h2 className="text-2xl font-semibold text-[#2D2A26] mb-3">
                Autoriser le microphone
              </h2>
              <p className="text-sm text-[#6B6560] leading-relaxed mb-8">
                Pour que le coach puisse vous entendre, votre navigateur a besoin
                d&apos;acc&eacute;der &agrave; votre micro.
              </p>

              <div className="space-y-3">
                <button
                  onClick={handleRequestMic}
                  disabled={!!micError && !micError.canRetry}
                  className="w-full px-6 py-4 rounded-full bg-violet-500 text-white text-base font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Autoriser le micro
                </button>
                <button
                  onClick={() => router.push('/session')}
                  className="w-full px-6 py-4 rounded-full border border-gray-200 text-[#6B6560] text-base font-medium hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Continuer sans micro
                </button>
              </div>

              {micError && (
                <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4 text-left">
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    {micError.title}
                  </p>
                  <p className="text-sm text-amber-800 leading-relaxed mb-3">
                    {micError.message}
                  </p>
                  {micError.steps && (
                    <ol className="text-sm text-amber-800 leading-relaxed mb-3 list-decimal list-inside space-y-1">
                      {micError.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                  <div className="flex flex-col gap-2">
                    {micError.canRetry && (
                      <button
                        onClick={handleRequestMic}
                        className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                      >
                        R&eacute;essayer le micro &rarr;
                      </button>
                    )}
                    <button
                      onClick={() => router.push('/session')}
                      className="text-sm font-semibold text-[#6B6560] hover:text-[#4B4540]"
                    >
                      Continuer avec le clavier &rarr;
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setShowMicSetup(false); setMicError(null); }}
                className="mt-6 text-sm text-[#8B8580] hover:text-[#6B6560]"
              >
                &larr; Retour
              </button>
            </>
          )}
        </div>
      </main>
    );
  }

  // State 1: Informational sections
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="max-w-md mx-auto px-6 sm:px-8">
        {/* Section 1: Hero */}
        <section className="flex flex-col items-center text-center pt-12 pb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#2D2A26] mb-2">
            Coach Ikigai
          </h1>
          <p className="text-base sm:text-lg text-[#6B6560] mb-8">
            Une conversation vocale guid&eacute;e par l&apos;IA pour trouver votre raison d&apos;&ecirc;tre
          </p>
          <IkigaiPreview />
        </section>

        {/* Section 2: L'Ikigai, c'est quoi ? */}
        <section className="border-t border-gray-100 py-10">
          <h2 className="text-xl font-semibold text-[#2D2A26] mb-4">
            L&apos;Ikigai, c&apos;est quoi ?
          </h2>
          <p className="text-sm text-[#6B6560] leading-relaxed mb-6">
            Ikigai (生き甲斐) est un concept japonais qui signifie
            {' '}&laquo;&nbsp;ce qui donne un sens &agrave; la vie&nbsp;&raquo;.
            Il se trouve &agrave; l&apos;intersection de quatre dimensions fondamentales.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {IKIGAI_CARDS.map((card) => (
              <div
                key={card.title}
                className={`${card.bg} ${card.border} border rounded-xl p-3`}
              >
                <p className={`text-sm font-semibold ${card.text}`}>{card.title}</p>
                <p className="text-xs text-[#6B6560] mt-1">{card.desc}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-[#6B6560] leading-relaxed">
            Quand ces quatre cercles se rejoignent, vous trouvez votre Ikigai
            — un alignement profond entre ce qui vous anime, ce que vous savez
            faire, ce dont le monde a besoin, et ce qui peut vous faire vivre.
          </p>
        </section>

        {/* Section 3: Comment ça marche */}
        <section className="border-t border-gray-100 py-10">
          <h2 className="text-xl font-semibold text-[#2D2A26] mb-6">
            Comment &ccedil;a marche
          </h2>

          <div className="space-y-5">
            {STEPS.map((step, i) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#2D2A26]">{step.title}</p>
                  <p className="text-sm text-[#6B6560] mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl bg-violet-50 border border-violet-100 p-4">
            <p className="text-sm text-violet-800 leading-relaxed">
              <span className="font-semibold">Bon &agrave; savoir :</span>{' '}
              Trouvez un endroit calme. Il n&apos;y a pas de bonne ou mauvaise
              r&eacute;ponse — c&apos;est une conversation, pas un test. Rien
              n&apos;est enregistr&eacute;.
            </p>
          </div>
        </section>

        {/* Section 4: Vos premiers pas */}
        <section className="border-t border-gray-100 py-10">
          <h2 className="text-xl font-semibold text-[#2D2A26] mb-6">
            Vos premiers pas
          </h2>

          <div className="relative pl-8">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-violet-200" />

            <div className="space-y-6">
              {WALKTHROUGH.map((item, i) => (
                <div key={i} className="relative">
                  {/* Purple dot */}
                  <div className="absolute -left-8 top-1 w-[15px] h-[15px] rounded-full bg-violet-400 border-2 border-white" />
                  <p className="text-sm font-semibold text-[#2D2A26]">{item.title}</p>
                  <p className="text-sm text-[#6B6560] mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Reflection warm-up */}
        <section className="border-t border-gray-100 py-10">
          <h2 className="text-xl font-semibold text-[#2D2A26] mb-2">
            Prenez un moment pour y r&eacute;fl&eacute;chir
          </h2>
          <p className="text-sm text-[#6B6560] mb-6 leading-relaxed">
            Avant de commencer, laissez ces questions infuser doucement...
          </p>

          <div className="space-y-3">
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
              <p className="text-sm font-semibold text-rose-700 mb-1">
                💜 Qu&apos;est-ce qui vous fait vibrer ?
              </p>
              <p className="text-xs text-[#6B6560] leading-relaxed">
                Une activit&eacute; o&ugrave; vous perdez la notion du temps, un sujet dont vous pourriez parler pendant des heures...
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <p className="text-sm font-semibold text-amber-700 mb-1">
                🧡 Dans quoi &ecirc;tes-vous dou&eacute;(e) ?
              </p>
              <p className="text-xs text-[#6B6560] leading-relaxed">
                Ce que les autres remarquent chez vous, ce qui vous vient naturellement mais semble difficile pour d&apos;autres...
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
              <p className="text-sm font-semibold text-emerald-700 mb-1">
                💚 Quel probl&egrave;me dans le monde vous touche profond&eacute;ment ?
              </p>
              <p className="text-xs text-[#6B6560] leading-relaxed">
                Une cause qui vous tient &agrave; c&oelig;ur, une injustice qui vous r&eacute;volte, un besoin que vous aimeriez combler...
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 border border-violet-100 p-4">
              <p className="text-sm font-semibold text-violet-700 mb-1">
                💙 Comment aimeriez-vous gagner votre vie id&eacute;alement ?
              </p>
              <p className="text-xs text-[#6B6560] leading-relaxed">
                Si vous pouviez choisir librement, quel type de travail vous ferait vous lever chaque matin avec enthousiasme ?
              </p>
            </div>
          </div>
        </section>

        {/* Section 6: CTA */}
        <section className="border-t border-gray-100 py-10 text-center pb-16">
          <button
            onClick={() => setShowMicSetup(true)}
            className="px-8 py-4 rounded-full bg-violet-500 text-white text-lg font-semibold hover:bg-violet-600 active:scale-95 transition-all shadow-lg shadow-violet-200"
          >
            Commencer votre voyage
          </button>
          <p className="text-sm text-[#8B8580] mt-4">
            ~20 minutes &middot; gratuit &middot; rien n&apos;est conserv&eacute;
          </p>
          <p className="text-xs text-[#A8A3A0] mt-2">
            Fonctionne mieux sur Chrome avec micro. Saisie texte disponible.
          </p>
        </section>
      </div>
    </main>
  );
}
