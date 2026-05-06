'use client';

import { useMemo } from 'react';

interface HeatmapProps {
  data: Array<{ timestamp: number; duration: number; budgetStatus: string }>;
}

export function APIHeatmap({ data }: HeatmapProps) {
  const cells = useMemo(() => {
    const now = Date.now();
    const buckets = 48; // 48 x 30s buckets = last 24 minutes
    const bucketSize = 30_000;
    const grid = Array.from({ length: buckets }, (_, i) => ({
      slot: i,
      calls: 0,
      maxDuration: 0,
      status: 'empty' as string,
      from: new Date(now - (buckets - i) * bucketSize).toLocaleTimeString(),
    }));

    for (const d of data) {
      const age = now - d.timestamp;
      const slot = Math.floor((buckets * bucketSize - age) / bucketSize);
      if (slot >= 0 && slot < buckets) {
        grid[slot].calls++;
        grid[slot].maxDuration = Math.max(grid[slot].maxDuration, d.duration);
        if (d.budgetStatus === 'critical') grid[slot].status = 'critical';
        else if (d.budgetStatus === 'warning' && grid[slot].status !== 'critical') grid[slot].status = 'warning';
        else if (grid[slot].status === 'empty') grid[slot].status = 'good';
      }
    }
    return grid;
  }, [data]);

  const colorMap: Record<string, string> = {
    empty:    'rgba(255,255,255,0.03)',
    good:     'rgba(0,255,136,0.4)',
    warning:  'rgba(255,204,0,0.5)',
    critical: 'rgba(255,45,85,0.6)',
  };

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(48, 1fr)',
        gap: 2,
        marginBottom: 6,
      }}>
        {cells.map((cell, i) => (
          <div
            key={i}
            title={cell.calls > 0 ? `${cell.from}: ${cell.calls} calls, max ${cell.maxDuration}ms` : cell.from}
            style={{
              height: 20,
              borderRadius: 2,
              background: colorMap[cell.status],
              transition: 'background 0.3s ease',
              cursor: cell.calls > 0 ? 'pointer' : 'default',
            }}
            onMouseEnter={e => {
              if (cell.calls > 0) {
                (e.currentTarget as HTMLElement).style.opacity = '0.7';
              }
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          />
        ))}
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-dim)',
      }}>
        <span>24 min ago</span>
        <span>now</span>
      </div>
    </div>
  );
}
