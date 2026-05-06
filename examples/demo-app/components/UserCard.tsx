'use client';

import { useState, useEffect } from 'react';

// BAD: This component re-renders on every parent tick because:
// 1. It receives a new object reference as prop every render
// 2. It has an internal state that triggers on every render
// DevPulse will flag this as a CRITICAL hotspot
export function BrokenUserCard({ user }: { user: { name: string; email: string } }) {
  const [count, setCount] = useState(0);

  // Bad: useEffect with no proper deps causes re-renders
  useEffect(() => {
    setCount(c => c + 1);
  });

  return (
    <div style={{
      padding: '12px 16px',
      border: '1px solid #ff2d5530',
      borderRadius: 8,
      background: '#ff2d5508',
      marginBottom: 8,
      fontFamily: 'monospace',
      fontSize: 13,
    }}>
      <div style={{ color: '#ff2d55', fontSize: 10, marginBottom: 4 }}>
        ⚠ BROKEN — re-rendered {count} times
      </div>
      <div style={{ color: '#f0f0ff' }}>{user.name}</div>
      <div style={{ color: '#44445a', fontSize: 12 }}>{user.email}</div>
    </div>
  );
}

// GOOD: Wrapped with proper memoization
// DevPulse will show this as GOOD — minimal re-renders
import { memo } from 'react';

export const FixedUserCard = memo(function FixedUserCard({
  user,
}: {
  user: { name: string; email: string };
}) {
  return (
    <div style={{
      padding: '12px 16px',
      border: '1px solid #00ff8830',
      borderRadius: 8,
      background: '#00ff8808',
      marginBottom: 8,
      fontFamily: 'monospace',
      fontSize: 13,
    }}>
      <div style={{ color: '#00ff88', fontSize: 10, marginBottom: 4 }}>
        ✓ OPTIMIZED — memo() applied
      </div>
      <div style={{ color: '#f0f0ff' }}>{user.name}</div>
      <div style={{ color: '#44445a', fontSize: 12 }}>{user.email}</div>
    </div>
  );
});
