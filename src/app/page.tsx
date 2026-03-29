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
    desc: 'Appuyez sur le micro, parlez naturellement. Vos mots sont transcrits automatiquement. Vous pouvez aussi taper.',
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
    desc: 'Votre navigateur demandera l\u2019acc\u00e8s au micro. Acceptez pour la voix, refusez pour utiliser la saisie texte.',
  },
  {
    title: 'Appuyez \u00ab D\u00e9marrer la conversation \u00bb',
    desc: 'Le coach se pr\u00e9sente et vous pose sa premi\u00e8re question.',
  },
  {
    title: 'Maintenez le bouton micro',
    desc: 'Parlez tant que vous maintenez le bouton. Rel\u00e2chez pour envoyer votre r\u00e9ponse.',
  },
  {
    title: 'Laissez-vous guider',
    desc: 'Le coach poursuit naturellement. La barre de progression indique dans quel cercle vous \u00eates.',
  },
];

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

        {/* Section 5: CTA */}
        <section className="border-t border-gray-100 py-10 text-center pb-16">
          <button
            onClick={handleBegin}
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
