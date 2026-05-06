'use client';

import { useDevPulse } from '../hooks/useDevPulse';
import { AppShell } from '../components/AppShell';
import { ScoreGauge } from '../components/ScoreGauge';
import { ScoreHistory } from '../components/ScoreHistory';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { APIHeatmap } from '../components/APIHeatmap';
import { useEffect, useState } from 'react';

function StatCard({ label, value, sub, color, delay = 0, unit = '' }: {
  label: string; value: number; sub?: string;
  color?: string; delay?: number; unit?: string;
}) {
  return (
    <div className="card animate-in" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>
        {label}
      </div>
      <AnimatedNumber value={value} color={color ?? 'var(--text-primary)'} fontSize={32} suffix={unit} />
      {sub && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ rec, index }: { rec: any; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const colors = {
    critical: { color: 'var(--critical)', bg: 'var(--critical-dim)', border: 'rgba(255,45,85,0.2)' },
    warning:  { color: 'var(--warning)',  bg: 'var(--warning-dim)',  border: 'rgba(255,204,0,0.2)'  },
    info:     { color: 'var(--accent)',   bg: 'var(--accent-dim)',   border: 'rgba(108,99,255,0.2)' },
  };
  const cat = colors[rec.severity as keyof typeof colors] ?? colors.info;
  const icons = { api: '⟶', render: '◉', bundle: '▦' };

  return (
    <div
      className="animate-in"
      onClick={() => setExpanded(e => !e)}
      style={{
        animationDelay: `${index * 60}ms`,
        display: 'flex', gap: 14,
        padding: '12px 14px',
        borderRadius: 8,
        border: `1px solid ${cat.border}`,
        background: cat.bg,
        position: 'relative', overflow: 'hidden',
        cursor: 'pointer', transition: 'all 0.15s ease',
      }}
    >
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: cat.color, boxShadow: `0 0 8px ${cat.color}` }} />
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: cat.color, opacity: 0.7, flexShrink: 0, marginTop: 1 }}>
        {icons[rec.category as keyof typeof icons]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: cat.color,
            padding: '1px 6px', border: `1px solid ${cat.border}`, borderRadius: 99,
          }}>
            {rec.severity}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
            {rec.category.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: expanded ? 6 : 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {rec.message}
        </div>
        {expanded && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, animation: 'fadeIn 0.15s ease' }}>
            {rec.detail}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', flexShrink: 0, marginTop: 2 }}>
        {expanded ? '▲' : '▼'}
      </div>
    </div>
  );
}

export default function OverviewPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const totalViolations = snapshot.api.criticalCount + snapshot.bundles.criticalCount;

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData} criticalCount={totalViolations}>
      {/* Page header */}
      <div className="animate-in" style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Overview
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Performance Dashboard
        </h1>
      </div>

      {/* Score + stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card animate-in" style={{ animationDelay: '50ms' }}>
          <div className="card-header">
            <span className="card-title">Health Score</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
              {new Date(snapshot.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <ScoreGauge
            score={snapshot.score}
            apiScore={snapshot.scoreBreakdown.apiScore}
            renderScore={snapshot.scoreBreakdown.renderScore}
            bundleScore={snapshot.scoreBreakdown.bundleScore}
          />
          <div style={{ marginTop: 20 }}>
            <ScoreHistory currentScore={snapshot.score} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 16 }}>
          <StatCard label="Total API Calls" value={snapshot.api.totalCalls} sub={`avg ${snapshot.api.avgDurationMs}ms`} delay={100} />
          <StatCard label="Critical Violations" value={totalViolations} sub="above budget" color={totalViolations > 0 ? 'var(--critical)' : 'var(--good)'} delay={150} />
          <StatCard label="Render Hotspots" value={snapshot.renders.hotspots.length} sub={`${snapshot.renders.totalRenders.toLocaleString()} total renders`} color={snapshot.renders.hotspots.length > 0 ? 'var(--warning)' : 'var(--good)'} delay={200} />
          <StatCard label="Bundle Total" value={snapshot.bundles.totalSizeKb} sub={`${snapshot.bundles.totalRoutes} routes`} color={snapshot.bundles.criticalCount > 0 ? 'var(--critical)' : 'var(--good)'} delay={250} unit="KB" />
        </div>
      </div>

      {/* Heatmap */}
      <div className="card animate-in" style={{ animationDelay: '280ms', marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">API Activity Heatmap</span>
          <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
            {[['good','var(--good)'],['warning','var(--warning)'],['critical','var(--critical)']].map(([label, color]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <APIHeatmap data={snapshot.api.slowest} />
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Slowest APIs */}
        <div className="card animate-in" style={{ animationDelay: '300ms' }}>
          <div className="card-header">
            <span className="card-title">Slowest Endpoints</span>
            <a href="/apis" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--accent-bright)', textDecoration: 'none' }}>
              VIEW ALL →
            </a>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Method</th>
                <th style={{ textAlign: 'right' }}>Duration</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.api.slowest.slice(0, 5).map((call, i) => {
                const color = call.budgetStatus === 'critical' ? 'var(--critical)' : call.budgetStatus === 'warning' ? 'var(--warning)' : 'var(--good)';
                const maxDuration = snapshot.api.slowest[0]?.duration ?? 1;
                return (
                  <tr key={call.id}>
                    <td style={{ color: 'var(--text-primary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {call.url}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                        {call.method}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{ color, fontWeight: 500 }}>
                        {call.duration >= 1000 ? `${(call.duration / 1000).toFixed(2)}s` : `${call.duration}ms`}
                      </span>
                      <div className="duration-bar">
                        <div className="duration-bar-fill" style={{ width: `${(call.duration / maxDuration) * 100}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Recommendations — expandable */}
        <div className="card animate-in" style={{ animationDelay: '350ms' }}>
          <div className="card-header">
            <span className="card-title">Recommendations</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
              {snapshot.recommendations.length} ISSUES · CLICK TO EXPAND
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {snapshot.recommendations.slice(0, 4).map((rec, i) => (
              <RecommendationCard key={rec.id} rec={rec} index={i} />
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
