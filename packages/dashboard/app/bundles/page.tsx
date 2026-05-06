'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState } from 'react';

function BundleBar({ route, sizeKb, budgetStatus, maxKb, index }: {
  route: string; sizeKb: number; budgetStatus: string; maxKb: number; index: number;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = Math.min((sizeKb / maxKb) * 100, 100);
  const color =
    budgetStatus === 'critical' ? 'var(--critical)' :
    budgetStatus === 'warning'  ? 'var(--warning)'  :
    'var(--good)';

  return (
    <div
      className="animate-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 50}ms`,
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-dim)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        {/* Route */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 500,
          color: 'var(--text-primary)',
          minWidth: 200,
        }}>
          {route}
        </div>

        {/* Status badge */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '2px 8px',
          borderRadius: 99,
          background: budgetStatus === 'critical' ? 'var(--critical-dim)' :
                      budgetStatus === 'warning' ? 'var(--warning-dim)' : 'var(--good-dim)',
          color,
          border: `1px solid ${color}30`,
          letterSpacing: '0.08em',
        }}>
          {budgetStatus.toUpperCase()}
        </span>

        <div style={{ flex: 1 }} />

        {/* Size */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 16,
          fontWeight: 300,
          color,
          textShadow: budgetStatus !== 'good' ? `0 0 8px ${color}` : 'none',
        }}>
          {sizeKb.toLocaleString()}
          <span style={{ fontSize: 10, color: 'var(--text-dim)', marginLeft: 2 }}>KB</span>
        </div>
      </div>

      {/* Bar */}
      <div style={{
        height: 6,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 3, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          borderRadius: 3,
          boxShadow: `0 0 10px ${color}`,
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  );
}

function Treemap({ bundles }: { bundles: any[] }) {
  const total = bundles.reduce((s, b) => s + b.sizeKb, 0);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 4,
      padding: 16,
      height: 200,
      alignContent: 'flex-start',
    }}>
      {bundles.map((b, i) => {
        const pct = (b.sizeKb / total) * 100;
        const color =
          b.budgetStatus === 'critical' ? 'var(--critical)' :
          b.budgetStatus === 'warning'  ? 'var(--warning)'  :
          'var(--good)';
        const w = Math.max(pct * 2.5, 60);

        return (
          <div
            key={b.route}
            className="animate-in"
            style={{
              animationDelay: `${i * 40}ms`,
              width: w,
              height: 80,
              borderRadius: 6,
              background: `${color}12`,
              border: `1px solid ${color}30`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              transition: 'all 0.2s ease',
              boxShadow: `0 0 12px ${color}20`,
              overflow: 'hidden',
              padding: '8px 6px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.border = `1px solid ${color}80`;
              (e.currentTarget as HTMLElement).style.background = `${color}20`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.border = `1px solid ${color}30`;
              (e.currentTarget as HTMLElement).style.background = `${color}12`;
            }}
          >
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color,
              letterSpacing: '0.06em',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              paddingHorizontal: 4,
            }}>
              {b.route}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 300,
              color,
              marginTop: 4,
            }}>
              {b.sizeKb}KB
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BundlesPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const bundles = snapshot.bundles.largest;
  const maxKb = Math.max(...bundles.map(b => b.sizeKb), 1);

  const budgetLines = [
    { label: 'Warning threshold', value: 300, color: 'var(--warning)' },
    { label: 'Critical threshold', value: 800, color: 'var(--critical)' },
  ];

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Analyzer
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          Bundle Sizes
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Size', value: `${snapshot.bundles.totalSizeKb.toLocaleString()}KB` },
          { label: 'Routes Tracked', value: snapshot.bundles.totalRoutes },
          { label: 'Critical', value: snapshot.bundles.criticalCount, color: 'var(--critical)' },
          { label: 'Warning', value: snapshot.bundles.warningCount, color: 'var(--warning)' },
        ].map((s, i) => (
          <div key={s.label} className="card animate-in" style={{ animationDelay: `${i * 50}ms`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 300, color: (s as any).color ?? 'var(--text-primary)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Treemap */}
      <div className="card animate-in" style={{ animationDelay: '150ms', marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between' }}>
          <span className="card-title">Bundle Map</span>
          <div style={{ display: 'flex', gap: 16 }}>
            {budgetLines.map(b => (
              <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                <div style={{ width: 12, height: 2, background: b.color, borderRadius: 1 }} />
                {b.label}
              </div>
            ))}
          </div>
        </div>
        <Treemap bundles={bundles} />
      </div>

      {/* Route list */}
      <div className="card animate-in" style={{ animationDelay: '200ms', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Route Breakdown</span>
          <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            <span>WARN &gt;300KB</span>
            <span style={{ color: 'var(--critical)' }}>CRIT &gt;800KB</span>
          </div>
        </div>

        {bundles.map((b, i) => (
          <BundleBar
            key={b.route}
            route={b.route}
            sizeKb={b.sizeKb}
            budgetStatus={b.budgetStatus}
            maxKb={maxKb}
            index={i}
          />
        ))}
      </div>
    </AppShell>
  );
}
