'use client';

import { useEffect, useRef } from 'react';

interface ScoreGaugeProps {
  score: number;
  apiScore: number;
  renderScore: number;
  bundleScore: number;
}

export function ScoreGauge({ score, apiScore, renderScore, bundleScore }: ScoreGaugeProps) {
  const prevScore = useRef(score);
  const animRef = useRef<number>();
  const circleRef = useRef<SVGCircleElement>(null);

  const size = 180;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = circumference * 0.25;
  const arcLength = circumference - gap;

  const scoreColor =
    score >= 80 ? '#00ff88' :
    score >= 60 ? '#ffcc00' :
    '#ff2d55';

  const offset = arcLength - (score / 100) * arcLength;

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    const from = arcLength - (prevScore.current / 100) * arcLength;
    const to = offset;
    const start = performance.now();
    const duration = 800;

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * ease;
      circle.style.strokeDashoffset = String(current);
      if (t < 1) animRef.current = requestAnimationFrame(animate);
      else prevScore.current = score;
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [score, offset, arcLength]);

  const subScores = [
    { label: 'API', value: apiScore, color: '#6c63ff' },
    { label: 'RENDER', value: renderScore, color: '#00ccff' },
    { label: 'BUNDLE', value: bundleScore, color: '#ff6b6b' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
      {/* SVG Ring */}
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        {/* Glow layer */}
        <svg
          width={size} height={size}
          style={{ position: 'absolute', inset: 0, filter: `blur(8px) opacity(0.4)` }}
        >
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth + 4}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
        </svg>

        {/* Main ring */}
        <svg width={size} height={size}>
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
          />
          {/* Fill */}
          <circle
            ref={circleRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(135 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke 0.5s ease' }}
          />
        </svg>

        {/* Center content */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          paddingBottom: 16,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 44,
            fontWeight: 300,
            color: scoreColor,
            lineHeight: 1,
            textShadow: `0 0 20px ${scoreColor}`,
            transition: 'color 0.5s ease, text-shadow 0.5s ease',
          }}>
            {Math.round(score)}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.15em',
            color: 'var(--text-dim)',
            marginTop: 4,
          }}>
            HEALTH SCORE
          </div>
        </div>
      </div>

      {/* Sub scores */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
        {subScores.map(({ label, value, color }) => (
          <div key={label}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              color: 'var(--text-dim)', letterSpacing: '0.1em',
              marginBottom: 6,
            }}>
              <span>{label}</span>
              <span style={{ color }}>{Math.round(value)}</span>
            </div>
            <div style={{
              height: 3, borderRadius: 2,
              background: 'rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${value}%`,
                background: color,
                borderRadius: 2,
                boxShadow: `0 0 8px ${color}`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
