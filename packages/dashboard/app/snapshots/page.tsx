'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState } from 'react';
import { AnimatedNumber } from '../../components/AnimatedNumber';

interface Snapshot {
  id: string;
  label: string;
  timestamp: number;
  score: number;
  apiAvg: number;
  criticalCount: number;
  hotspots: number;
  bundleKb: number;
  apiCritical: number;
  apiWarning: number;
}

function DeltaBadge({ before, after, lowerIsBetter = true, unit = '' }: {
  before: number; after: number; lowerIsBetter?: boolean; unit?: string;
}) {
  const diff = after - before;
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const neutral = diff === 0;
  const color = neutral ? 'var(--text-dim)' : improved ? 'var(--good)' : 'var(--critical)';
  const bg = neutral ? 'transparent' : improved ? 'var(--good-dim)' : 'var(--critical-dim)';
  const border = neutral ? 'var(--border-dim)' : improved ? 'rgba(0,255,136,0.2)' : 'rgba(255,45,85,0.2)';
  const prefix = diff > 0 ? '+' : '';
  const icon = neutral ? '→' : improved ? '↓' : '↑';

  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 11,
      padding: '2px 8px', borderRadius: 99,
      background: bg, color, border: `1px solid ${border}`,
      display: 'inline-flex', alignItems: 'center', gap: 4,
    }}>
      {icon} {prefix}{Math.round(diff)}{unit}
    </span>
  );
}

export default function SnapshotPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [label, setLabel] = useState('');

  const takeSnapshot = () => {
    const snap: Snapshot = {
      id: Date.now().toString(),
      label: label.trim() || `Snapshot ${snapshots.length + 1}`,
      timestamp: Date.now(),
      score: snapshot.score,
      apiAvg: snapshot.api.avgDurationMs,
      criticalCount: snapshot.api.criticalCount + snapshot.bundles.criticalCount,
      hotspots: snapshot.renders.hotspots.length,
      bundleKb: snapshot.bundles.totalSizeKb,
      apiCritical: snapshot.api.criticalCount,
      apiWarning: snapshot.api.warningCount,
    };
    setSnapshots(prev => [...prev, snap]);
    setLabel('');
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
  };

  const base = snapshots[0];
  const latest = snapshots[snapshots.length - 1];

  const metrics = [
    { key: 'score',        label: 'Health Score',    unit: '',   lowerIsBetter: false },
    { key: 'apiAvg',       label: 'API Avg',          unit: 'ms', lowerIsBetter: true  },
    { key: 'criticalCount',label: 'Critical Issues',  unit: '',   lowerIsBetter: true  },
    { key: 'hotspots',     label: 'Render Hotspots',  unit: '',   lowerIsBetter: true  },
    { key: 'bundleKb',     label: 'Bundle Total',     unit: 'KB', lowerIsBetter: true  },
  ];

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          History
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Snapshot Comparison
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          Capture the current state before and after optimizations to prove your changes worked.
        </p>
      </div>

      {/* Take snapshot */}
      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Capture Snapshot</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            CURRENT SCORE: <span style={{
              color: snapshot.score >= 80 ? 'var(--good)' : snapshot.score >= 60 ? 'var(--warning)' : 'var(--critical)',
              fontWeight: 600,
            }}>
              {Math.round(snapshot.score)}
            </span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && takeSnapshot()}
            placeholder="Label this snapshot (e.g. 'Before memo fix')"
            style={{
              flex: 1, padding: '9px 14px',
              background: 'var(--bg-void)',
              border: '1px solid var(--border-soft)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <button
            onClick={takeSnapshot}
            style={{
              padding: '9px 20px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: '0.08em',
              color: 'var(--accent-bright)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            📸 CAPTURE
          </button>
        </div>
      </div>

      {/* Comparison table */}
      {snapshots.length >= 2 && (
        <div className="card animate-in" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">
              {base.label} → {latest.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
              {Math.round((latest.timestamp - base.timestamp) / 1000)}s elapsed
            </span>
          </div>

          {/* Big score delta */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 40, padding: '24px 0', borderBottom: '1px solid var(--border-dim)',
            marginBottom: 20,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>BEFORE</div>
              <AnimatedNumber value={base.score} color={base.score >= 80 ? 'var(--good)' : base.score >= 60 ? 'var(--warning)' : 'var(--critical)'} fontSize={48} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 28,
                color: latest.score > base.score ? 'var(--good)' : 'var(--critical)',
                textShadow: `0 0 20px ${latest.score > base.score ? 'var(--good)' : 'var(--critical)'}`,
              }}>
                {latest.score > base.score ? '↑' : '↓'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                {latest.score > base.score ? '+' : ''}{Math.round(latest.score - base.score)} pts
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 8 }}>AFTER</div>
              <AnimatedNumber value={latest.score} color={latest.score >= 80 ? 'var(--good)' : latest.score >= 60 ? 'var(--warning)' : 'var(--critical)'} fontSize={48} />
            </div>
          </div>

          {/* Metrics grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            {metrics.map(m => {
              const bVal = (base as any)[m.key];
              const aVal = (latest as any)[m.key];
              return (
                <div key={m.key} style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface)',
                  borderRadius: 8,
                  border: '1px solid var(--border-dim)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 8 }}>
                    {m.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 300, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {Math.round(aVal)}{m.unit}
                  </div>
                  <DeltaBadge before={bVal} after={aVal} lowerIsBetter={m.lowerIsBetter} unit={m.unit} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Snapshot list */}
      {snapshots.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
            No snapshots yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Take a snapshot before you optimize, then take another after to see the diff
          </div>
        </div>
      ) : (
        <div className="card animate-in" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-dim)' }}>
            <span className="card-title">All Snapshots ({snapshots.length})</span>
          </div>
          {snapshots.map((s, i) => {
            const scoreColor = s.score >= 80 ? 'var(--good)' : s.score >= 60 ? 'var(--warning)' : 'var(--critical)';
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 20px',
                borderBottom: i < snapshots.length - 1 ? '1px solid var(--border-dim)' : 'none',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', width: 20 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                    {new Date(s.timestamp).toLocaleTimeString()} · API avg {s.apiAvg}ms · {s.criticalCount} critical
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 300, color: scoreColor, textShadow: `0 0 12px ${scoreColor}` }}>
                  {Math.round(s.score)}
                </div>
                {i > 0 && (
                  <DeltaBadge before={snapshots[0].score} after={s.score} lowerIsBetter={false} />
                )}
                <button
                  onClick={() => deleteSnapshot(s.id)}
                  style={{
                    background: 'none', border: '1px solid var(--border-dim)',
                    borderRadius: 4, padding: '3px 8px',
                    fontFamily: 'var(--font-mono)', fontSize: 10,
                    color: 'var(--text-dim)', cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
