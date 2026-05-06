'use client';

import { useEffect, useRef, useState } from 'react';

interface ScoreHistoryProps {
  currentScore: number;
}

export function ScoreHistory({ currentScore }: ScoreHistoryProps) {
  const [history, setHistory] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setHistory(prev => {
      const next = [...prev, currentScore].slice(-60);
      return next;
    });
  }, [currentScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const min = Math.max(0, Math.min(...history) - 5);
    const max = Math.min(100, Math.max(...history) + 5);
    const range = max - min || 1;

    const points = history.map((v, i) => ({
      x: (i / (history.length - 1)) * W,
      y: H - ((v - min) / range) * H,
    }));

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const lastScore = history[history.length - 1];
    const color = lastScore >= 80 ? '0,255,136' : lastScore >= 60 ? '255,204,0' : '255,45,85';
    grad.addColorStop(0, `rgba(${color},0.15)`);
    grad.addColorStop(1, `rgba(${color},0)`);

    ctx.beginPath();
    ctx.moveTo(points[0].x, H);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = `rgba(${color},0.8)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Current dot
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${color})`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgb(${color})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [history]);

  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.1em', color: 'var(--text-dim)',
        textTransform: 'uppercase', marginBottom: 8,
      }}>
        Score History (last 60s)
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={48}
        style={{ width: '100%', height: 48, display: 'block' }}
      />
    </div>
  );
}
