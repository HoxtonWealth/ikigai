'use client';

import { forwardRef } from 'react';
import { IkigaiSynthesis } from '../lib/types';

const CIRCLES = [
  { label: 'Amour', color: '#F87171', bg: 'rgba(248,113,113,0.15)', x: 270, y: 340, themes: 'love' as const },
  { label: 'Talents', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', x: 530, y: 340, themes: 'goodAt' as const },
  { label: 'Le Monde', color: '#34D399', bg: 'rgba(52,211,153,0.15)', x: 270, y: 560, themes: 'worldNeeds' as const },
  { label: 'Carriere', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', x: 530, y: 560, themes: 'paidFor' as const },
];

const CIRCLE_R = 210;

export const ShareableCard = forwardRef<HTMLDivElement, { synthesis: IkigaiSynthesis }>(
  function ShareableCard({ synthesis }, ref) {
    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: 1080,
          height: 1350,
          background: 'linear-gradient(160deg, #FAF5FF 0%, #FFF7ED 40%, #FAF5FF 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <div
          style={{
            textAlign: 'center',
            paddingTop: 70,
            paddingBottom: 10,
          }}
        >
          <div style={{ fontSize: 52, fontWeight: 700, color: '#2D2A26', letterSpacing: '-0.5px' }}>
            Mon Ikigai
          </div>
          <div style={{ fontSize: 22, color: '#8B8580', marginTop: 8 }}>
            Ma raison d&apos;etre
          </div>
        </div>

        {/* Diagram area — positioned circles using absolute within a relative container */}
        <div
          style={{
            position: 'relative',
            width: 800,
            height: 600,
            margin: '10px auto 0',
          }}
        >
          {/* Circles */}
          {CIRCLES.map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: c.x - CIRCLE_R,
                top: c.y - CIRCLE_R - 100,
                width: CIRCLE_R * 2,
                height: CIRCLE_R * 2,
                borderRadius: '50%',
                background: c.bg,
                border: `3px solid ${c.color}40`,
              }}
            />
          ))}

          {/* Circle labels */}
          {CIRCLES.map((c, i) => {
            const lx = i % 2 === 0 ? c.x - 135 : c.x + 135;
            const ly = i < 2 ? c.y - 155 : c.y + 125;
            return (
              <div
                key={`label-${i}`}
                style={{
                  position: 'absolute',
                  left: lx - 80,
                  top: ly - 100,
                  width: 160,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                  color: c.color,
                }}
              >
                {c.label}
              </div>
            );
          })}

          {/* Themes in each circle */}
          {CIRCLES.map((c, i) => {
            const themes = synthesis[c.themes] || [];
            const tx = i % 2 === 0 ? c.x - 105 : c.x + 105;
            const ty = i < 2 ? c.y - 95 : c.y + 20;
            return themes.slice(0, 3).map((theme, j) => (
              <div
                key={`theme-${i}-${j}`}
                style={{
                  position: 'absolute',
                  left: tx - 100,
                  top: ty + j * 32 - 100,
                  width: 200,
                  textAlign: 'center',
                  fontSize: 18,
                  color: '#4B4540',
                  lineHeight: 1.4,
                }}
              >
                {theme.length > 30 ? theme.slice(0, 28) + '...' : theme}
              </div>
            ));
          })}

          {/* Center IKIGAI label */}
          <div
            style={{
              position: 'absolute',
              left: 400 - 55,
              top: 350 - 55 - 100,
              width: 110,
              height: 110,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2D2A26' }}>IKIGAI</div>
            <div style={{ fontSize: 16, color: '#6B6560' }}>&#10022;</div>
          </div>
        </div>

        {/* Ikigai Statement */}
        <div
          style={{
            margin: '20px 80px 0',
            padding: '32px 40px',
            background: 'rgba(139,92,246,0.08)',
            borderRadius: 24,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: '#5B21B6',
              lineHeight: 1.5,
            }}
          >
            {synthesis.ikigaiStatement}
          </div>
        </div>

        {/* Footer branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 20,
            color: '#A8A29E',
          }}
        >
          Decouvre ton Ikigai
        </div>
      </div>
    );
  }
);
