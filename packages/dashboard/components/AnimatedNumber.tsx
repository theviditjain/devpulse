'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  color?: string;
  fontSize?: number;
}

export function AnimatedNumber({
  value,
  duration = 600,
  decimals = 0,
  suffix = '',
  prefix = '',
  color = 'var(--text-primary)',
  fontSize = 32,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>();

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) rafRef.current = requestAnimationFrame(animate);
      else prevRef.current = to;
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, duration]);

  const formatted = display.toFixed(decimals);

  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize,
      fontWeight: 300,
      color,
      textShadow: `0 0 16px ${color}40`,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      display: 'inline-block',
    }}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
