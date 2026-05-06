'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState } from 'react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontFamily: 'var(--font-mono)', fontSize: 9,
        letterSpacing: '0.15em', textTransform: 'uppercase',
        color: 'var(--text-dim)', marginBottom: 12,
        paddingBottom: 8, borderBottom: '1px solid var(--border-dim)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, description, defaultOn = false }: {
  label: string; description: string; defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', borderBottom: '1px solid var(--border-dim)',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
          {description}
        </div>
      </div>
      <div
        onClick={() => setOn(o => !o)}
        style={{
          width: 44, height: 24, borderRadius: 12,
          background: on ? 'var(--accent)' : 'var(--bg-hover)',
          border: `1px solid ${on ? 'var(--accent)' : 'var(--border-mid)'}`,
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          boxShadow: on ? '0 0 12px var(--accent-glow)' : 'none',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2, left: on ? 22 : 2,
          width: 18, height: 18,
          borderRadius: '50%',
          background: on ? 'white' : 'var(--text-dim)',
          transition: 'left 0.2s ease',
        }} />
      </div>
    </div>
  );
}

function BeforeAfterPanel({ snapshot }: { snapshot: any }) {
  const [beforeSnap, setBeforeSnap] = useState<any>(null);
  const [afterSnap, setAfterSnap] = useState<any>(null);
  const [phase, setPhase] = useState<'idle' | 'before' | 'after' | 'compare'>('idle');

  const takeSnapshot = (type: 'before' | 'after') => {
    const snap = {
      score: snapshot.score,
      apiAvg: snapshot.api.avgDurationMs,
      criticalCount: snapshot.api.criticalCount + snapshot.bundles.criticalCount,
      hotspots: snapshot.renders.hotspots.length,
      totalSizeKb: snapshot.bundles.totalSizeKb,
      timestamp: Date.now(),
    };
    if (type === 'before') {
      setBeforeSnap(snap);
      setPhase('before');
    } else {
      setAfterSnap(snap);
      setPhase('compare');
    }
  };

  const delta = (after: number, before: number, lowerIsBetter = true) => {
    const diff = after - before;
    const improved = lowerIsBetter ? diff < 0 : diff > 0;
    const color = improved ? 'var(--good)' : diff === 0 ? 'var(--text-dim)' : 'var(--critical)';
    const prefix = diff > 0 ? '+' : '';
    return { diff, color, label: `${prefix}${Math.round(diff)}`, improved };
  };

  return (
    <div className="card animate-in" style={{ animationDelay: '100ms' }}>
      <div className="card-header">
        <span className="card-title">Before / After Comparison</span>
        {phase === 'compare' && (
          <button
            onClick={() => { setBeforeSnap(null); setAfterSnap(null); setPhase('idle'); }}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10,
              padding: '3px 10px', borderRadius: 4,
              border: '1px solid var(--border-soft)',
              background: 'transparent', color: 'var(--text-dim)',
              cursor: 'pointer',
            }}
          >
            RESET
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)', marginBottom: 16 }}>
            Snapshot the current state, make changes to your app, then snapshot again to compare
          </div>
          <button
            onClick={() => takeSnapshot('before')}
            style={{
              padding: '10px 24px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: 8,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              letterSpacing: '0.08em',
              color: 'var(--accent-bright)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            📸 SNAPSHOT BEFORE
          </button>
        </div>
      )}

      {phase === 'before' && beforeSnap && (
        <div>
          <div style={{
            padding: '10px 14px', marginBottom: 16,
            background: 'var(--good-dim)',
            border: '1px solid rgba(0,255,136,0.2)',
            borderRadius: 6,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            color: 'var(--good)',
          }}>
            ✓ Before snapshot taken at {new Date(beforeSnap.timestamp).toLocaleTimeString()}. Now optimize your app, then snapshot after.
          </div>
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => takeSnapshot('after')}
              style={{
                padding: '10px 24px',
                background: 'var(--warning-dim)',
                border: '1px solid rgba(255,204,0,0.3)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)', fontSize: 12,
                letterSpacing: '0.08em',
                color: 'var(--warning)',
                cursor: 'pointer',
              }}
            >
              📸 SNAPSHOT AFTER
            </button>
          </div>
        </div>
      )}

      {phase === 'compare' && beforeSnap && afterSnap && (() => {
        const scoreD = delta(afterSnap.score, beforeSnap.score, false);
        const apiD = delta(afterSnap.apiAvg, beforeSnap.apiAvg);
        const critD = delta(afterSnap.criticalCount, beforeSnap.criticalCount);
        const hotD = delta(afterSnap.hotspots, beforeSnap.hotspots);
        const bundleD = delta(afterSnap.totalSizeKb, beforeSnap.totalSizeKb);

        const rows = [
          { label: 'Health Score', before: beforeSnap.score, after: afterSnap.score, d: scoreD, unit: '' },
          { label: 'API Avg', before: beforeSnap.apiAvg, after: afterSnap.apiAvg, d: apiD, unit: 'ms' },
          { label: 'Critical Issues', before: beforeSnap.criticalCount, after: afterSnap.criticalCount, d: critD, unit: '' },
          { label: 'Render Hotspots', before: beforeSnap.hotspots, after: afterSnap.hotspots, d: hotD, unit: '' },
          { label: 'Bundle Total', before: beforeSnap.totalSizeKb, after: afterSnap.totalSizeKb, d: bundleD, unit: 'KB' },
        ];

        return (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              <thead>
                <tr>
                  {['Metric', 'Before', 'After', 'Delta'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Metric' ? 'left' : 'right', padding: '6px 12px', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-dim)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label}>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-dim)' }}>{row.label}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-dim)', borderBottom: '1px solid var(--border-dim)' }}>{Math.round(row.before)}{row.unit}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-dim)' }}>{Math.round(row.after)}{row.unit}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: row.d.color, fontWeight: 600, borderBottom: '1px solid var(--border-dim)', textShadow: `0 0 8px ${row.d.color}` }}>
                      {row.d.label}{row.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Summary */}
            <div style={{
              marginTop: 16, padding: '12px 14px',
              background: scoreD.improved ? 'var(--good-dim)' : 'var(--warning-dim)',
              border: `1px solid ${scoreD.improved ? 'rgba(0,255,136,0.2)' : 'rgba(255,204,0,0.2)'}`,
              borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: scoreD.improved ? 'var(--good)' : 'var(--warning)',
            }}>
              {scoreD.improved
                ? `✓ Score improved by ${Math.abs(Math.round(scoreD.diff))} points (${Math.round(beforeSnap.score)} → ${Math.round(afterSnap.score)})`
                : `⚠ Score changed by ${scoreD.label} points`}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ExportPanel({ snapshot }: { snapshot: any }) {
  const [exported, setExported] = useState(false);

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      score: snapshot.score,
      scoreBreakdown: snapshot.scoreBreakdown,
      api: snapshot.api,
      renders: snapshot.renders,
      bundles: snapshot.bundles,
      recommendations: snapshot.recommendations,
      budgetViolations: snapshot.budgetViolations,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devpulse-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handleHTMLExport = () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>DevPulse Report — ${new Date().toLocaleDateString()}</title>
  <style>
    body { font-family: 'Courier New', monospace; background: #050508; color: #f0f0ff; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 28px; font-weight: 300; margin-bottom: 4px; }
    .score { font-size: 64px; font-weight: 200; color: ${snapshot.score >= 80 ? '#00ff88' : snapshot.score >= 60 ? '#ffcc00' : '#ff2d55'}; }
    .section { margin: 32px 0; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px; }
    .label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #44445a; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 10px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; }
    th { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #44445a; }
    .critical { color: #ff2d55; }
    .warning { color: #ffcc00; }
    .good { color: #00ff88; }
    .rec { padding: 12px 14px; border-radius: 6px; margin: 8px 0; border-left: 3px solid; }
    .rec.critical { border-color: #ff2d55; background: rgba(255,45,85,0.08); }
    .rec.warning  { border-color: #ffcc00; background: rgba(255,204,0,0.08); }
  </style>
</head>
<body>
  <div class="label">DevPulse Performance Report</div>
  <h1>Generated ${new Date().toLocaleString()}</h1>
  <div class="score">${Math.round(snapshot.score)}<span style="font-size:24px;color:#44445a">/100</span></div>

  <div class="section">
    <div class="label">API Performance</div>
    <table>
      <tr><th>Endpoint</th><th>Method</th><th>Duration</th><th>Status</th></tr>
      ${snapshot.api.slowest.map((c: any) => `
      <tr>
        <td>${c.url}</td>
        <td>${c.method}</td>
        <td class="${c.budgetStatus}">${c.duration >= 1000 ? (c.duration/1000).toFixed(2)+'s' : c.duration+'ms'}</td>
        <td class="${c.budgetStatus}">${c.budgetStatus.toUpperCase()}</td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <div class="label">Render Hotspots</div>
    <table>
      <tr><th>Component</th><th>Renders</th><th>Avg Time</th><th>Status</th></tr>
      ${snapshot.renders.hotspots.map((h: any) => `
      <tr>
        <td>&lt;${h.displayName}&gt;</td>
        <td class="${h.budgetStatus}">${h.renderCount}</td>
        <td>${h.avgRenderTimeMs}ms</td>
        <td class="${h.budgetStatus}">${h.budgetStatus.toUpperCase()}</td>
      </tr>`).join('')}
    </table>
  </div>

  <div class="section">
    <div class="label">Recommendations</div>
    ${snapshot.recommendations.map((r: any) => `
    <div class="rec ${r.severity}">
      <strong>${r.message}</strong><br>
      <small>${r.detail}</small>
    </div>`).join('')}
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devpulse-report-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card animate-in" style={{ animationDelay: '200ms' }}>
      <div className="card-header">
        <span className="card-title">Export Report</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
        Export a snapshot of the current performance state. JSON for programmatic use, HTML for sharing with your team.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleExport}
          style={{
            flex: 1, padding: '10px 0',
            background: exported ? 'var(--good-dim)' : 'var(--accent-dim)',
            border: `1px solid ${exported ? 'rgba(0,255,136,0.3)' : 'rgba(108,99,255,0.3)'}`,
            borderRadius: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '0.08em',
            color: exported ? 'var(--good)' : 'var(--accent-bright)',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          {exported ? '✓ DOWNLOADED' : '↓ EXPORT JSON'}
        </button>
        <button
          onClick={handleHTMLExport}
          style={{
            flex: 1, padding: '10px 0',
            background: 'rgba(255,107,107,0.08)',
            border: '1px solid rgba(255,107,107,0.2)',
            borderRadius: 8,
            fontFamily: 'var(--font-mono)', fontSize: 11,
            letterSpacing: '0.08em',
            color: '#ff6b6b',
            cursor: 'pointer', transition: 'all 0.2s ease',
          }}
        >
          ↓ EXPORT HTML
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Config
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          Settings
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <BeforeAfterPanel snapshot={snapshot} />
        <ExportPanel snapshot={snapshot} />
      </div>

      <div className="card animate-in" style={{ animationDelay: '300ms' }}>
        <div className="card-header" style={{ marginBottom: 0 }}>
          <span className="card-title">Preferences</span>
        </div>
        <Toggle label="Demo Mode" description="Show simulated data when no app is connected" defaultOn={isDemo} />
        <Toggle label="Auto-scroll Timeline" description="Keep timeline scrolled to latest event" defaultOn={true} />
        <Toggle label="Sound Alerts" description="Play a sound when a critical violation is detected" defaultOn={false} />
        <Toggle label="Compact Mode" description="Reduce padding for more data density" defaultOn={false} />
        <Toggle label="Show Timestamps" description="Display absolute timestamps in timeline" defaultOn={true} />
      </div>
    </AppShell>
  );
}
