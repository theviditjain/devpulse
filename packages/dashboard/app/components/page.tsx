'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState, useEffect } from 'react';

function HotspotRow({ hotspot, index, maxCount }: { hotspot: any; index: number; maxCount: number }) {
  const [hovered, setHovered] = useState(false);
  const pct = (hotspot.renderCount / maxCount) * 100;
  const color =
    hotspot.budgetStatus === 'critical' ? 'var(--critical)' :
    hotspot.budgetStatus === 'warning'  ? 'var(--warning)'  :
    'var(--good)';

  return (
    <div
      className="animate-in"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        animationDelay: `${index * 60}ms`,
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-dim)',
        background: hovered ? 'var(--bg-hover)' : 'transparent',
        transition: 'background 0.15s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        {/* Rank */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-dim)',
          width: 20,
          paddingTop: 2,
          flexShrink: 0,
        }}>
          {String(index + 1).padStart(2, '0')}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              {'<'}{hotspot.displayName}{'>'}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              padding: '1px 7px',
              borderRadius: 99,
              background: hotspot.budgetStatus === 'critical' ? 'var(--critical-dim)' : 'var(--warning-dim)',
              color,
              border: `1px solid ${color}30`,
              letterSpacing: '0.08em',
            }}>
              {hotspot.budgetStatus.toUpperCase()}
            </span>
          </div>

          {/* Path breadcrumb */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-dim)',
            marginBottom: 10,
          }}>
            {hotspot.path.map((p: string, i: number) => (
              <span key={i}>
                <span style={{ color: i === hotspot.path.length - 1 ? color : 'var(--text-dim)' }}>{p}</span>
                {i < hotspot.path.length - 1 && <span style={{ margin: '0 4px', opacity: 0.3 }}>→</span>}
              </span>
            ))}
          </div>

          {/* Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: 1, height: 4,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: color,
                borderRadius: 2,
                boxShadow: `0 0 8px ${color}`,
                transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 300,
              color,
              lineHeight: 1,
              textShadow: `0 0 12px ${color}`,
            }}>
              {hotspot.renderCount}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              marginTop: 3,
            }}>
              RENDERS
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 22,
              fontWeight: 300,
              color: 'var(--text-secondary)',
              lineHeight: 1,
            }}>
              {hotspot.avgRenderTimeMs}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-dim)',
              letterSpacing: '0.1em',
              marginTop: 3,
            }}>
              AVG MS
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip hint on hover */}
      {hovered && hotspot.budgetStatus === 'critical' && (
        <div style={{
          marginTop: 10,
          marginLeft: 36,
          padding: '8px 12px',
          background: 'var(--critical-dim)',
          border: '1px solid rgba(255,45,85,0.2)',
          borderRadius: 6,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--critical)',
          animation: 'fadeIn 0.15s ease',
        }}>
          💡 Consider wrapping with React.memo() or optimizing parent state to reduce renders
        </div>
      )}
    </div>
  );
}

function ComponentTreeViz({ hotspots }: { hotspots: any[] }) {
  if (hotspots.length === 0) return null;

  // Build a simple visual tree from paths
  const nodes = new Map<string, { name: string; count: number; isHot: boolean; color: string }>();

  hotspots.forEach(h => {
    h.path.forEach((name: string, i: number) => {
      if (!nodes.has(name)) {
        const isHot = name === h.displayName;
        nodes.set(name, {
          name,
          count: isHot ? h.renderCount : 0,
          isHot,
          color: isHot
            ? (h.budgetStatus === 'critical' ? 'var(--critical)' : 'var(--warning)')
            : 'var(--text-dim)',
        });
      }
    });
  });

  return (
    <div style={{
      padding: '20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
    }}>
      {Array.from(nodes.values()).map((node, i) => (
        <div
          key={node.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: `1px solid ${node.isHot ? node.color : 'var(--border-dim)'}`,
            background: node.isHot ? `${node.color}15` : 'var(--bg-hover)',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: node.isHot ? node.color : 'var(--text-secondary)',
            boxShadow: node.isHot ? `0 0 12px ${node.color}40` : 'none',
            transition: 'all 0.3s ease',
            animation: `fadeInUp 0.4s ${i * 50}ms both`,
          }}>
            {'<'}{node.name}{'>'}
            {node.count > 0 && (
              <span style={{
                marginLeft: 8,
                fontSize: 10,
                opacity: 0.8,
              }}>
                ×{node.count}
              </span>
            )}
          </div>
          {i < nodes.size - 1 && (
            <span style={{ color: 'var(--border-mid)', fontSize: 12 }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ComponentsPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const hotspots = snapshot.renders.hotspots;
  const maxCount = Math.max(...hotspots.map(h => h.renderCount), 1);

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Profiler
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 20 }}>
          Component Renders
        </h1>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Tracked Components', value: snapshot.renders.totalComponents },
          { label: 'Total Renders', value: snapshot.renders.totalRenders.toLocaleString(), color: 'var(--accent-bright)' },
          { label: 'Hotspots', value: hotspots.length, color: hotspots.length > 0 ? 'var(--critical)' : 'var(--good)' },
        ].map((s, i) => (
          <div key={s.label} className="card animate-in" style={{ animationDelay: `${i * 50}ms`, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 300, color: s.color ?? 'var(--text-primary)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Component tree visualization */}
      <div className="card animate-in" style={{ animationDelay: '150ms', marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)' }}>
          <span className="card-title">Component Tree</span>
        </div>
        <ComponentTreeViz hotspots={hotspots} />
      </div>

      {/* Hotspots list */}
      <div className="card animate-in" style={{ animationDelay: '200ms', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="card-title">Render Hotspots</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-dim)' }}>
            THRESHOLD: 20 RENDERS
          </span>
        </div>

        {hotspots.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
            ✓ No render hotspots detected
          </div>
        ) : (
          hotspots.map((h, i) => (
            <HotspotRow key={h.displayName} hotspot={h} index={i} maxCount={maxCount} />
          ))
        )}
      </div>
    </AppShell>
  );
}
