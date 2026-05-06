'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState, useEffect, useRef } from 'react';
import type { TimelineEvent } from '../../hooks/useDevPulse';

const TYPE_CONFIG = {
  api:        { color: '#00ccff', label: 'API',        icon: '⟶' },
  render:     { color: '#6c63ff', label: 'RENDER',     icon: '◉' },
  error:      { color: '#ff2d55', label: 'ERROR',      icon: '✕' },
  navigation: { color: '#ffcc00', label: 'NAV',        icon: '▸' },
  custom:     { color: '#00ff88', label: 'CUSTOM',     icon: '◈' },
};

function TimelineRow({ event, index }: { event: TimelineEvent; index: number }) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.custom;
  const isError = event.isError;
  const timeStr = new Date(event.timestamp).toLocaleTimeString('en', {
    hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const ms = new Date(event.timestamp).getMilliseconds();

  return (
    <div
      className="animate-in"
      style={{
        animationDelay: `${Math.min(index * 20, 400)}ms`,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 20px',
        borderBottom: '1px solid var(--border-dim)',
        transition: 'background 0.15s ease',
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
    >
      {/* Timestamp */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-dim)',
        width: 80,
        flexShrink: 0,
      }}>
        {timeStr}<span style={{ opacity: 0.4 }}>.{String(ms).padStart(3, '0')}</span>
      </div>

      {/* Type badge */}
      <div style={{
        width: 70,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: isError ? 'var(--critical)' : cfg.color,
          boxShadow: `0 0 6px ${isError ? 'var(--critical)' : cfg.color}`,
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.08em',
          color: isError ? 'var(--critical)' : cfg.color,
        }}>
          {isError ? 'ERROR' : cfg.label}
        </span>
      </div>

      {/* Name */}
      <div style={{
        flex: 1,
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: isError ? 'var(--critical)' : 'var(--text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {event.name}
      </div>

      {/* Duration */}
      {event.durationMs !== undefined && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: event.durationMs > 2000 ? 'var(--critical)' :
                 event.durationMs > 800  ? 'var(--warning)'  :
                 'var(--text-secondary)',
          width: 80,
          textAlign: 'right',
          flexShrink: 0,
        }}>
          {event.durationMs >= 1000
            ? `${(event.durationMs / 1000).toFixed(2)}s`
            : `${event.durationMs}ms`}
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const [filter, setFilter] = useState<'all' | TimelineEvent['type']>('all');
  const [paused, setPaused] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paused) {
      setEvents(snapshot.timeline);
    }
  }, [snapshot.timeline, paused]);

  const filtered = filter === 'all'
    ? events
    : events.filter(e => e.type === filter);

  const counts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Timeline
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          Event Stream
        </h1>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Filter tabs */}
        {(['all', 'api', 'render', 'error', 'navigation'] as const).map(f => {
          const cfg = f === 'all' ? { color: 'var(--accent)', label: 'ALL' } : TYPE_CONFIG[f];
          const isActive = filter === f;
          const count = f === 'all' ? events.length : (counts[f] ?? 0);
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.08em',
                padding: '5px 12px',
                borderRadius: 6,
                border: `1px solid ${isActive ? cfg.color + '50' : 'var(--border-dim)'}`,
                background: isActive ? cfg.color + '15' : 'transparent',
                color: isActive ? cfg.color : 'var(--text-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {cfg.label}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                padding: '0 4px',
                borderRadius: 3,
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--text-dim)',
              }}>
                {count}
              </span>
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Pause button */}
        <button
          onClick={() => setPaused(p => !p)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            padding: '5px 14px',
            borderRadius: 6,
            border: `1px solid ${paused ? 'var(--warning)' : 'var(--border-dim)'}`,
            background: paused ? 'var(--warning-dim)' : 'transparent',
            color: paused ? 'var(--warning)' : 'var(--text-dim)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          {paused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>
      </div>

      {/* Event list */}
      <div className="card animate-in" style={{ animationDelay: '100ms', padding: 0, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '8px 20px',
          borderBottom: '1px solid var(--border-dim)',
          background: 'var(--bg-surface)',
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', width: 80 }}>TIME</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', width: 70 }}>TYPE</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', flex: 1 }}>EVENT</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', width: 80, textAlign: 'right' }}>DURATION</span>
        </div>

        <div style={{ maxHeight: 520, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
              No events yet — start using your app
            </div>
          ) : (
            filtered.map((event, i) => (
              <TimelineRow key={event.id} event={event} index={i} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {paused && (
        <div style={{
          marginTop: 12,
          padding: '8px 14px',
          borderRadius: 6,
          background: 'var(--warning-dim)',
          border: '1px solid rgba(255,204,0,0.2)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--warning)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}>
          ⏸ Stream paused — {events.length} events buffered
        </div>
      )}
    </AppShell>
  );
}
