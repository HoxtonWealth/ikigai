'use client';

import { IkigaiSynthesis } from '../lib/types';

const CIRCLES = [
  { label: 'Love', color: '#F87171', x: 140, y: 105, themes: 'love' as const },
  { label: 'Good At', color: '#FBBF24', x: 220, y: 105, themes: 'goodAt' as const },
  { label: 'World Needs', color: '#34D399', x: 140, y: 180, themes: 'worldNeeds' as const },
  { label: 'Paid For', color: '#A78BFA', x: 220, y: 180, themes: 'paidFor' as const },
];

export function IkigaiDiagram({ synthesis }: { synthesis: IkigaiSynthesis }) {
  return (
    <div className="w-full">
      <svg viewBox="0 0 360 310" className="w-full max-w-[400px] mx-auto">
        {/* Background circles */}
        {CIRCLES.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={82}
            fill={c.color}
            fillOpacity={0.15}
            stroke={c.color}
            strokeWidth={2}
            strokeOpacity={0.3}
          />
        ))}

        {/* Circle labels */}
        {CIRCLES.map((c, i) => {
          const textX = i % 2 === 0 ? c.x - 52 : c.x + 52;
          const textY = i < 2 ? c.y - 58 : c.y + 68;
          return (
            <text
              key={`label-${i}`}
              x={textX}
              y={textY}
              textAnchor="middle"
              className="text-[12px] font-bold"
              fill={c.color}
            >
              {c.label}
            </text>
          );
        })}

        {/* Themes in each circle */}
        {CIRCLES.map((c, i) => {
          const themes = synthesis[c.themes] || [];
          const offsetX = i % 2 === 0 ? c.x - 40 : c.x + 40;
          const offsetY = i < 2 ? c.y - 20 : c.y + 10;

          return themes.slice(0, 3).map((theme, j) => (
            <text
              key={`theme-${i}-${j}`}
              x={offsetX}
              y={offsetY + j * 16}
              textAnchor="middle"
              className="text-[9px]"
              fill="#4B4540"
            >
              {theme.length > 25 ? theme.slice(0, 23) + '...' : theme}
            </text>
          ));
        })}

        {/* Center IKIGAI label */}
        <circle cx="180" cy="142" r="28" fill="white" fillOpacity={0.9} />
        <text
          x="180"
          y="139"
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
          className="text-[8px]"
          fill="#6B6560"
        >
          ✦
        </text>
      </svg>
    </div>
  );
}
