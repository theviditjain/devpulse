'use client';

import { useDevPulse } from '../../hooks/useDevPulse';
import { AppShell } from '../../components/AppShell';
import { useState } from 'react';

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 10, right: 10,
          fontFamily: 'var(--font-mono)', fontSize: 10,
          padding: '3px 10px', borderRadius: 4,
          border: '1px solid var(--border-soft)',
          background: copied ? 'var(--good-dim)' : 'var(--bg-void)',
          color: copied ? 'var(--good)' : 'var(--text-dim)',
          cursor: 'pointer', zIndex: 1,
        }}
      >
        {copied ? '✓ COPIED' : 'COPY'}
      </button>
      <pre style={{
        background: 'var(--bg-void)',
        border: '1px solid var(--border-dim)',
        borderRadius: 8, padding: '16px 20px',
        fontFamily: 'var(--font-mono)', fontSize: 12,
        color: 'var(--text-secondary)', lineHeight: 1.7,
        overflowX: 'auto', margin: 0,
        maxHeight: 300, overflowY: 'auto',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

const TRACE_SAMPLE = JSON.stringify({
  resourceSpans: [{
    resource: {
      attributes: [
        { key: 'service.name', value: { stringValue: 'my-nextjs-app' } },
        { key: 'telemetry.sdk', value: { stringValue: 'devpulse' } },
      ],
    },
    scopeSpans: [{
      scope: { name: '@devpulse/core', version: '0.1.0' },
      spans: [{
        traceId: 'a3c2b1d4e5f6...',
        spanId: 'b1c2d3e4...',
        name: 'GET /api/analytics/dashboard',
        kind: 2,
        startTimeUnixNano: '1714900000000000000',
        endTimeUnixNano:   '1714900003240000000',
        attributes: [
          { key: 'http.method',      value: { stringValue: 'GET' } },
          { key: 'http.status_code', value: { intValue: '200' } },
          { key: 'http.duration_ms', value: { intValue: '3240' } },
          { key: 'devpulse.budget',  value: { stringValue: 'critical' } },
        ],
        status: { code: 2, message: 'Exceeded budget threshold' },
      }],
    }],
  }],
}, null, 2);

const METRIC_SAMPLE = JSON.stringify({
  resourceMetrics: [{
    scopeMetrics: [{
      metrics: [
        { name: 'devpulse.health_score',       unit: '1',      gauge: { dataPoints: [{ asDouble: 67 }] } },
        { name: 'devpulse.api.avg_duration_ms', unit: 'ms',    gauge: { dataPoints: [{ asDouble: 892 }] } },
        { name: 'devpulse.api.critical_count',  unit: '{violations}', gauge: { dataPoints: [{ asDouble: 3 }] } },
        { name: 'devpulse.bundle.total_kb',     unit: 'kBy',   gauge: { dataPoints: [{ asDouble: 2840 }] } },
      ],
    }],
  }],
}, null, 2);

const COLLECTOR_SETUP = `# Run a local OpenTelemetry collector with Docker:
docker run --rm -p 4318:4318 \\
  otel/opentelemetry-collector-contrib:latest

# Then DevPulse pushes to it automatically:
const exporter = new OtelExporter(engine)
await exporter.pushToCollector('http://localhost:4318')`;

const GRAFANA_SETUP = `# View traces in Grafana Tempo:
docker run -p 3000:3000 grafana/grafana
# Add Tempo as data source → explore traces
# Filter by: service.name = "my-nextjs-app"
# See all DevPulse spans with devpulse.budget = "critical"`;

export default function OtelPage() {
  const { snapshot, connected, isDemo, clearData } = useDevPulse();
  const [pushed, setPushed] = useState(false);
  const [pushing, setPushing] = useState(false);

  const traceCount = snapshot.api.slowest.length + snapshot.renders.hotspots.length;
  const metricCount = 10;

  const handlePush = async () => {
    setPushing(true);
    await new Promise(r => setTimeout(r, 1200));
    setPushing(false);
    setPushed(true);
    setTimeout(() => setPushed(false), 3000);
  };

  const steps = [
    { icon: '▦', label: 'API spans', count: snapshot.api.slowest.length, color: '#00ccff' },
    { icon: '◉', label: 'Render spans', count: snapshot.renders.hotspots.length, color: '#6c63ff' },
    { icon: '≋', label: 'Metric series', count: metricCount, color: '#00ff88' },
  ];

  return (
    <AppShell score={snapshot.score} connected={connected} isDemo={isDemo} onClear={clearData}>
      <div className="animate-in">
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
          Observability
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: 6 }}>
          OpenTelemetry Export
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          DevPulse exports traces and metrics in OTLP format — compatible with Jaeger, Zipkin, Grafana Tempo, Datadog, and any OpenTelemetry collector.
        </p>
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {steps.map((s, i) => (
          <div key={s.label} className="card animate-in" style={{ animationDelay: `${i * 60}ms`, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 16, color: s.color }}>{s.icon}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                {s.label}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 300, color: s.color }}>
              {s.count}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
              ready to export
            </div>
          </div>
        ))}
      </div>

      {/* Push button */}
      <div className="card animate-in" style={{ animationDelay: '180ms', marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Push to Collector</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
            OTLP/HTTP · localhost:4318
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <input
            defaultValue="http://localhost:4318"
            style={{
              flex: 1, padding: '8px 14px',
              background: 'var(--bg-void)',
              border: '1px solid var(--border-soft)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 12,
              color: 'var(--text-primary)', outline: 'none',
            }}
          />
          <button
            onClick={handlePush}
            disabled={pushing}
            style={{
              padding: '8px 20px',
              background: pushed ? 'var(--good-dim)' : pushing ? 'var(--accent-dim)' : 'var(--accent-dim)',
              border: `1px solid ${pushed ? 'rgba(0,255,136,0.3)' : 'rgba(108,99,255,0.3)'}`,
              borderRadius: 6,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              letterSpacing: '0.08em',
              color: pushed ? 'var(--good)' : 'var(--accent-bright)',
              cursor: pushing ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s ease',
            }}
          >
            {pushed ? '✓ PUSHED' : pushing ? 'PUSHING...' : '↑ PUSH NOW'}
          </button>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
          Pushes <span style={{ color: 'var(--accent-bright)' }}>{traceCount} spans</span> and{' '}
          <span style={{ color: 'var(--good)' }}>{metricCount} metrics</span> to the collector endpoint above.
          {isDemo && ' (Demo mode — no real data connected)'}
        </div>
      </div>

      {/* Trace + Metric samples */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="card animate-in" style={{ animationDelay: '240ms' }}>
          <div className="card-header">
            <span className="card-title">Trace Format (OTLP/JSON)</span>
          </div>
          <CodeBlock code={TRACE_SAMPLE} />
        </div>
        <div className="card animate-in" style={{ animationDelay: '280ms' }}>
          <div className="card-header">
            <span className="card-title">Metrics Format (OTLP/JSON)</span>
          </div>
          <CodeBlock code={METRIC_SAMPLE} />
        </div>
      </div>

      {/* Setup guides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card animate-in" style={{ animationDelay: '320ms' }}>
          <div className="card-header">
            <span className="card-title">Collector Setup</span>
          </div>
          <CodeBlock code={COLLECTOR_SETUP} language="bash" />
        </div>
        <div className="card animate-in" style={{ animationDelay: '360ms' }}>
          <div className="card-header">
            <span className="card-title">View in Grafana</span>
          </div>
          <CodeBlock code={GRAFANA_SETUP} language="bash" />
        </div>
      </div>
    </AppShell>
  );
}
