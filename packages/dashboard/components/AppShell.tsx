'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  {
    section: 'Monitor',
    items: [
      { href: '/',           label: 'Overview',    icon: '◈' },
      { href: '/apis',       label: 'API Monitor', icon: '⟶' },
      { href: '/components', label: 'Components',  icon: '◉' },
      { href: '/bundles',    label: 'Bundles',     icon: '▦' },
      { href: '/timeline',   label: 'Timeline',    icon: '≋' },
    ],
  },
  {
    section: 'Analyze',
    items: [
      { href: '/snapshots', label: 'Snapshots',    icon: '📸' },
      { href: '/otel',      label: 'OpenTelemetry',icon: '◎' },
    ],
  },
  {
    section: 'Config',
    items: [
      { href: '/budget',   label: 'Budget Rules', icon: '⚖' },
      { href: '/settings', label: 'Settings',     icon: '⚙' },
    ],
  },
];

interface AppShellProps {
  children: React.ReactNode;
  score?: number;
  connected?: boolean;
  isDemo?: boolean;
  onClear?: () => void;
  criticalCount?: number;
}

export function AppShell({ children, score = 100, connected = false, isDemo = true, onClear, criticalCount = 0 }: AppShellProps) {
  const pathname = usePathname();

  const scoreColor =
    score >= 80 ? 'var(--good)' :
    score >= 60 ? 'var(--warning)' :
    'var(--critical)';

  return (
    <div className="app-shell">
      <div className="scanline" />

      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-dot" />
          DEVPULSE
        </div>
        <span className="header-target">localhost:3000</span>
        <div className="header-spacer" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          <span style={{ color: 'var(--text-dim)' }}>SCORE</span>
          <span style={{ color: scoreColor, fontWeight: 700, fontSize: 16, textShadow: `0 0 12px ${scoreColor}` }}>
            {Math.round(score)}
          </span>
        </div>

        <div className="header-status">
          <div className="status-indicator" style={{
            background: connected ? 'var(--good)' : isDemo ? 'var(--warning)' : 'var(--critical)',
          }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            {connected ? 'LIVE' : isDemo ? 'DEMO' : 'CONNECTING'}
          </span>
        </div>

        {onClear && (
          <button
            onClick={onClear}
            style={{
              background: 'none', border: '1px solid var(--border-soft)',
              color: 'var(--text-secondary)', padding: '4px 12px',
              borderRadius: 6, fontFamily: 'var(--font-mono)', fontSize: 11,
              cursor: 'pointer', letterSpacing: '0.06em', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--critical)'; (e.target as HTMLElement).style.color = 'var(--critical)'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-soft)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)'; }}
          >
            CLEAR
          </button>
        )}
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {items.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              const showBadge = href === '/' && criticalCount > 0;
              return (
                <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <span style={{ fontSize: 13, opacity: isActive ? 1 : 0.5 }}>{icon}</span>
                  <span>{label}</span>
                  {showBadge && <span className="nav-badge">{criticalCount}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-dim)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', padding: '0 10px' }}>
            v0.1.0 · WEEK 5
          </div>
        </div>
      </nav>

      <main className="main-content">{children}</main>
    </div>
  );
}
