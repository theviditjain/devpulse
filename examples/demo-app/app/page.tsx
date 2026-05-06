'use client';

import { useState, useEffect } from 'react';
import { BrokenUserCard, FixedUserCard } from '../components/UserCard';

const USERS = [
  { name: 'Alice Chen', email: 'alice@example.com' },
  { name: 'Bob Kumar', email: 'bob@example.com' },
  { name: 'Carol Smith', email: 'carol@example.com' },
];

export default function DemoPage() {
  const [tick, setTick] = useState(0);
  const [slowResult, setSlowResult] = useState<string>('');
  const [fastResult, setFastResult] = useState<string>('');
  const [slowLoading, setSlowLoading] = useState(false);
  const [fastLoading, setFastLoading] = useState(false);
  const [mode, setMode] = useState<'broken' | 'fixed'>('broken');

  // Tick every 500ms to cause re-renders in BrokenUserCard
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  const callSlowAPI = async () => {
    setSlowLoading(true);
    setSlowResult('');
    const start = Date.now();
    try {
      await fetch('/api/slow');
      setSlowResult(`Done in ${Date.now() - start}ms`);
    } catch {
      setSlowResult('Error');
    }
    setSlowLoading(false);
  };

  const callFastAPI = async () => {
    setFastLoading(true);
    setFastResult('');
    const start = Date.now();
    try {
      await fetch('/api/fast');
      setFastResult(`Done in ${Date.now() - start}ms`);
    } catch {
      setFastResult('Error');
    }
    setFastLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#050508',
      color: '#f0f0ff',
      fontFamily: 'monospace',
      padding: 40,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#44445a', marginBottom: 8 }}>
          DEVPULSE DEMO APP
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 8 }}>
          Performance Test Playground
        </h1>
        <p style={{ fontSize: 13, color: '#8888aa', lineHeight: 1.6 }}>
          This app intentionally demonstrates performance issues that DevPulse detects.
          Open <span style={{ color: '#6c63ff' }}>http://localhost:3001</span> to see them live.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* API Testing */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#44445a', marginBottom: 16 }}>
            API PERFORMANCE
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 8 }}>
              Slow endpoint (3s delay) — DevPulse flags as CRITICAL
            </div>
            <button
              onClick={callSlowAPI}
              disabled={slowLoading}
              style={{
                padding: '8px 16px',
                background: slowLoading ? 'rgba(255,45,85,0.1)' : 'rgba(255,45,85,0.15)',
                border: '1px solid rgba(255,45,85,0.3)',
                borderRadius: 6, color: '#ff2d55',
                fontSize: 12, cursor: slowLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {slowLoading ? 'Calling /api/slow...' : 'Call /api/slow'}
            </button>
            {slowResult && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#ff2d55' }}>
                ⚠ {slowResult} — DevPulse flagged this as CRITICAL
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: '#8888aa', marginBottom: 8 }}>
              Fast endpoint (50ms) — DevPulse shows as GOOD
            </div>
            <button
              onClick={callFastAPI}
              disabled={fastLoading}
              style={{
                padding: '8px 16px',
                background: fastLoading ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.1)',
                border: '1px solid rgba(0,255,136,0.3)',
                borderRadius: 6, color: '#00ff88',
                fontSize: 12, cursor: fastLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'monospace',
              }}
            >
              {fastLoading ? 'Calling /api/fast...' : 'Call /api/fast'}
            </button>
            {fastResult && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#00ff88' }}>
                ✓ {fastResult} — DevPulse shows this as GOOD
              </div>
            )}
          </div>
        </div>

        {/* Component Renders */}
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#44445a', marginBottom: 12 }}>
            COMPONENT RENDERS (tick: {tick})
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['broken', 'fixed'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '5px 14px',
                  background: mode === m
                    ? m === 'broken' ? 'rgba(255,45,85,0.15)' : 'rgba(0,255,136,0.1)'
                    : 'transparent',
                  border: `1px solid ${mode === m
                    ? m === 'broken' ? 'rgba(255,45,85,0.4)' : 'rgba(0,255,136,0.4)'
                    : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 5,
                  color: mode === m
                    ? m === 'broken' ? '#ff2d55' : '#00ff88'
                    : '#44445a',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'monospace',
                  letterSpacing: '0.06em',
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <div>
            {USERS.map(user => (
              mode === 'broken'
                ? <BrokenUserCard key={user.email} user={user} />
                : <FixedUserCard key={user.email} user={user} />
            ))}
          </div>

          <div style={{ marginTop: 12, fontSize: 11, color: '#44445a', lineHeight: 1.6 }}>
            {mode === 'broken'
              ? '⚠ Watch DevPulse — UserCard renders are climbing rapidly'
              : '✓ React.memo() prevents unnecessary re-renders'}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: 32, padding: 20,
        background: 'rgba(108,99,255,0.06)',
        border: '1px solid rgba(108,99,255,0.15)',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 10, letterSpacing: '0.12em', color: '#6c63ff', marginBottom: 12 }}>
          HOW TO USE THIS DEMO
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, fontSize: 12, color: '#8888aa', lineHeight: 1.6 }}>
          <div>
            <div style={{ color: '#f0f0ff', marginBottom: 4 }}>1. Open DevPulse</div>
            Navigate to localhost:3001 to see the monitoring dashboard running alongside this app.
          </div>
          <div>
            <div style={{ color: '#f0f0ff', marginBottom: 4 }}>2. Trigger issues</div>
            Click "Call /api/slow" and switch to "BROKEN" mode to generate violations.
          </div>
          <div>
            <div style={{ color: '#f0f0ff', marginBottom: 4 }}>3. Use Before/After</div>
            In DevPulse Settings, snapshot before fixing, then snapshot after to see the score improve.
          </div>
        </div>
      </div>
    </div>
  );
}
