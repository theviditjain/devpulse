'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState } from 'react';

interface BudgetRule {
  id: string;
  category: 'api' | 'render' | 'bundle';
  label: string;
  description: string;
  warningValue: number;
  criticalValue: number;
  unit: string;
  icon: string;
}

const DEFAULT_RULES: BudgetRule[] = [
  {
    id: 'api-warning',
    category: 'api',
    label: 'API Warning Threshold',
    description: 'Flag API calls slower than this as warnings',
    warningValue: 800,
    criticalValue: 2000,
    unit: 'ms',
    icon: '⟶',
  },
  {
    id: 'bundle-warning',
    category: 'bundle',
    label: 'Bundle Warning Threshold',
    description: 'Flag route bundles larger than this as warnings',
    warningValue: 300,
    criticalValue: 800,
    unit: 'KB',
    icon: '▦',
  },
  {
    id: 'render-warning',
    category: 'render',
    label: 'Render Count Threshold',
    description: 'Flag components that render more than this count',
    warningValue: 20,
    criticalValue: 50,
    unit: 'renders',
    icon: '◉',
  },
  {
    id: 'render-time',
    category: 'render',
    label: 'Render Time Threshold',
    description: 'Flag renders taking longer than one frame (16ms = 60fps)',
    warningValue: 16,
    criticalValue: 50,
    unit: 'ms',
    icon: '◉',
  },
];

const CAT_COLORS = {
  api:    { color: '#00ccff', bg: 'rgba(0,204,255,0.08)',    border: 'rgba(0,204,255,0.2)'    },
  render: { color: '#6c63ff', bg: 'rgba(108,99,255,0.08)',   border: 'rgba(108,99,255,0.2)'   },
  bundle: { color: '#ff6b6b', bg: 'rgba(255,107,107,0.08)',  border: 'rgba(255,107,107,0.2)'  },
};

function SliderInput({ value, min, max, step = 1, onChange, color }: {
  value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; color: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ position: 'relative', paddingTop: 4 }}>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          appearance: 'none',
          height: 4,
          borderRadius: 2,
          outline: 'none',
          cursor: 'pointer',
          background: `linear-gradient(90deg, ${color} ${pct}%, rgba(255,255,255,0.08) ${pct}%)`,
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          appearance: none;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 8px ${color};
          cursor: pointer;
          border: 2px solid var(--bg-void);
        }
      `}</style>
    </div>
  );
}

function RuleCard({ rule, index }: { rule: BudgetRule; index: number }) {
  const [warningVal, setWarningVal] = useState(rule.warningValue);
  const [criticalVal, setCriticalVal] = useState(rule.criticalValue);
  const [saved, setSaved] = useState(false);
  const cat = CAT_COLORS[rule.category];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sliderMax = rule.unit === 'ms' ? (rule.id === 'render-time' ? 100 : 5000) :
                    rule.unit === 'KB' ? 2000 : 100;

  return (
    <div
      className="card animate-in"
      style={{
        animationDelay: `${index * 80}ms`,
        border: `1px solid ${cat.border}`,
        background: cat.bg,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: `${cat.color}15`,
          border: `1px solid ${cat.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, color: cat.color,
          flexShrink: 0,
        }}>
          {rule.icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
            {rule.label}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            {rule.description}
          </div>
        </div>
      </div>

      {/* Warning slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', boxShadow: '0 0 6px var(--warning)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              WARNING
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={warningVal}
              onChange={e => setWarningVal(Number(e.target.value))}
              style={{
                width: 70, padding: '3px 8px',
                background: 'var(--bg-void)',
                border: '1px solid var(--border-soft)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--warning)',
                textAlign: 'right', outline: 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {rule.unit}
            </span>
          </div>
        </div>
        <SliderInput
          value={warningVal} min={0} max={sliderMax}
          step={rule.unit === 'KB' ? 10 : rule.unit === 'ms' && rule.id !== 'render-time' ? 50 : 1}
          onChange={setWarningVal}
          color="var(--warning)"
        />
      </div>

      {/* Critical slider */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--critical)', boxShadow: '0 0 6px var(--critical)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-secondary)', letterSpacing: '0.08em' }}>
              CRITICAL
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="number"
              value={criticalVal}
              onChange={e => setCriticalVal(Number(e.target.value))}
              style={{
                width: 70, padding: '3px 8px',
                background: 'var(--bg-void)',
                border: '1px solid var(--border-soft)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--critical)',
                textAlign: 'right', outline: 'none',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
              {rule.unit}
            </span>
          </div>
        </div>
        <SliderInput
          value={criticalVal} min={warningVal} max={sliderMax}
          step={rule.unit === 'KB' ? 10 : rule.unit === 'ms' && rule.id !== 'render-time' ? 50 : 1}
          onChange={setCriticalVal}
          color="var(--critical)"
        />
      </div>

      {/* Preview */}
      <div style={{
        padding: '10px 12px',
        background: 'var(--bg-void)',
        borderRadius: 6,
        border: '1px solid var(--border-dim)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-dim)',
        marginBottom: 14,
      }}>
        <span style={{ color: 'var(--good)' }}>good</span>
        {' '}{'<'} {warningVal}{rule.unit} ≤{' '}
        <span style={{ color: 'var(--warning)' }}>warning</span>
        {' '}{'<'} {criticalVal}{rule.unit} ≤{' '}
        <span style={{ color: 'var(--critical)' }}>critical</span>
      </div>

      <button
        onClick={handleSave}
        style={{
          width: '100%', padding: '8px 0',
          background: saved ? 'var(--good-dim)' : cat.bg,
          border: `1px solid ${saved ? 'rgba(0,255,136,0.3)' : cat.border}`,
          borderRadius: 6,
          fontFamily: 'var(--font-mono)', fontSize: 11,
          letterSpacing: '0.08em',
          color: saved ? 'var(--good)' : cat.color,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        {saved ? '✓ SAVED' : 'SAVE RULE'}
      </button>
    </div>
  );
}

function ConfigPreview() {
  const config = `// devpulse.config.js
export default {
  apiWarningMs:      800,
  apiCriticalMs:     2000,
  bundleWarningKb:   300,
  bundleCriticalKb:  800,
  renderWarningMs:   16,
  renderWarningCount:  20,
  renderCriticalCount: 50,
  wsPort: 3001,
  ignoredUrls: ['/_next/', '/favicon'],
};`;

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card animate-in" style={{ animationDelay: '400ms' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-title">devpulse.config.js</span>
        <button
          onClick={handleCopy}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10,
            padding: '4px 10px', borderRadius: 4,
            border: '1px solid var(--border-soft)',
            background: copied ? 'var(--good-dim)' : 'transparent',
            color: copied ? 'var(--good)' : 'var(--text-dim)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <pre style={{
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.7,
        overflowX: 'auto',
        margin: 0,
      }}>
        <code>{config}</code>
      </pre>
    </div>
  );
}

export default function BudgetPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Config
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          Budget Rules
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
          Define performance thresholds. Violations are flagged in the dashboard and included in exported reports.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {DEFAULT_RULES.map((rule, i) => (
          <RuleCard key={rule.id} rule={rule} index={i} />
        ))}
      </div>

      <ConfigPreview />
    </AppShell>
  );
}
