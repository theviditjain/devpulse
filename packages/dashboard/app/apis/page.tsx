'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState, useEffect } from 'react';
import type { APICall } from '../../hooks/useDevPulse';

type SortKey = 'duration' | 'url' | 'method' | 'status';
type SortDir = 'asc' | 'desc';

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET:    '#00ccff',
    POST:   '#00ff88',
    PUT:    '#ffcc00',
    DELETE: '#ff2d55',
    PATCH:  '#ff6b6b',
  };
  const color = colors[method] ?? 'var(--text-secondary)';
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 4,
      background: `${color}15`,
      color,
      border: `1px solid ${color}30`,
      letterSpacing: '0.04em',
    }}>
      {method}
    </span>
  );
}

function DurationCell({ duration, status }: { duration: number; status: string }) {
  const color =
    status === 'critical' ? 'var(--critical)' :
    status === 'warning'  ? 'var(--warning)'  :
    'var(--good)';

  const display = duration >= 1000
    ? `${(duration / 1000).toFixed(2)}s`
    : `${duration}ms`;

  return (
    <div>
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color,
        textShadow: status !== 'good' ? `0 0 8px ${color}` : 'none',
      }}>
        {display}
      </span>
      {status !== 'good' && (
        <span style={{
          marginLeft: 8,
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 99,
          background: status === 'critical' ? 'var(--critical-dim)' : 'var(--warning-dim)',
          color,
          border: `1px solid ${color}30`,
        }}>
          {status.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function MiniSparkline({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct > 80 ? 'var(--critical)' :
    pct > 50 ? 'var(--warning)'  :
    'var(--good)';

  return (
    <div style={{
      width: 80, height: 4,
      background: 'rgba(255,255,255,0.04)',
      borderRadius: 2, overflow: 'hidden',
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: color,
        borderRadius: 2,
        boxShadow: `0 0 6px ${color}`,
        transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
}

export default function APIsPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const [sortKey, setSortKey] = useState<SortKey>('duration');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const calls = [...snapshot.api.slowest];

  const filtered = filter === 'all' ? calls : calls.filter(c => c.budgetStatus === filter);

  const sorted = filtered.sort((a, b) => {
    let diff = 0;
    if (sortKey === 'duration') diff = a.duration - b.duration;
    else if (sortKey === 'url') diff = a.url.localeCompare(b.url);
    else if (sortKey === 'method') diff = a.method.localeCompare(b.method);
    else if (sortKey === 'status') diff = (a.status ?? 0) - (b.status ?? 0);
    return sortDir === 'desc' ? -diff : diff;
  });

  const maxDuration = Math.max(...calls.map(c => c.duration), 1);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const stats = [
    { label: 'Total Calls', value: snapshot.api.totalCalls.toLocaleString(), color: 'var(--text-primary)' },
    { label: 'Avg Duration', value: `${snapshot.api.avgDurationMs}ms`, color: snapshot.api.avgDurationMs > 800 ? 'var(--warning)' : 'var(--good)' },
    { label: 'Critical', value: snapshot.api.criticalCount, color: 'var(--critical)' },
    { label: 'Warning', value: snapshot.api.warningCount, color: 'var(--warning)' },
  ];

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Monitor
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          API Monitor
        </h1>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={s.label} className="card animate-in" style={{ animationDelay: `${i * 50}ms`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 300, color: s.color, textShadow: `0 0 12px ${s.color}40` }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'critical', 'warning', 'good'] as const).map(f => {
          const colors = {
            all:      { active: 'var(--accent)',    bg: 'var(--accent-dim)',    border: 'rgba(108,99,255,0.3)' },
            critical: { active: 'var(--critical)',  bg: 'var(--critical-dim)',  border: 'rgba(255,45,85,0.3)'  },
            warning:  { active: 'var(--warning)',   bg: 'var(--warning-dim)',   border: 'rgba(255,204,0,0.3)'  },
            good:     { active: 'var(--good)',      bg: 'var(--good-dim)',      border: 'rgba(0,255,136,0.3)'  },
          };
          const c = colors[f];
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '5px 14px',
                borderRadius: 6,
                border: `1px solid ${isActive ? c.border : 'var(--border-dim)'}`,
                background: isActive ? c.bg : 'transparent',
                color: isActive ? c.active : 'var(--text-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="card animate-in" style={{ animationDelay: '200ms', padding: 0, overflow: 'hidden' }}>
        <table className="data-table" style={{ margin: 0 }}>
          <thead>
            <tr>
              {[
                { key: 'url', label: 'Endpoint' },
                { key: 'method', label: 'Method' },
                { key: 'status', label: 'Status' },
                { key: 'duration', label: 'Duration' },
              ].map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key as SortKey)}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                    color: sortKey === col.key ? 'var(--accent-bright)' : 'var(--text-dim)',
                    padding: '12px 16px',
                  }}
                >
                  {col.label} {sortKey === col.key ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
              ))}
              <th style={{ padding: '12px 16px' }}>Bar</th>
              <th style={{ padding: '12px 16px' }}>Time</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((call, i) => (
              <tr key={call.id} className="animate-in" style={{ animationDelay: `${200 + i * 30}ms` }}>
                <td style={{ color: 'var(--text-primary)', fontWeight: 500, padding: '12px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {call.url}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <MethodBadge method={call.method} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    color: call.status && call.status < 400 ? 'var(--good)' : 'var(--critical)',
                  }}>
                    {call.status ?? '—'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <DurationCell duration={call.duration} status={call.budgetStatus} />
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <MiniSparkline value={call.duration} max={maxDuration} />
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                  {new Date(call.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div style={{
            padding: 40, textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 12,
            color: 'var(--text-dim)',
          }}>
            No API calls match this filter
          </div>
        )}
      </div>
    </AppShell>
  );
}
