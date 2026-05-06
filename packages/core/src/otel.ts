/**
 * OpenTelemetry Compatibility Layer
 *
 * Exports DevPulse's CircularBuffer events in OTLP JSON format.
 * This makes DevPulse compatible with any OpenTelemetry collector
 * (Jaeger, Zipkin, Grafana Tempo, Datadog, etc.)
 *
 * Why this matters for interviews:
 *   OpenTelemetry is the CNCF standard for observability.
 *   Every major company (Google, Microsoft, AWS) uses it.
 *   Showing you know OTEL signals = you think beyond toy projects.
 *
 * Spec: https://opentelemetry.io/docs/specs/otlp/
 *
 * Usage:
 *   const exporter = new OtelExporter(engine)
 *   const traces = exporter.exportTraces()   // OTLP JSON
 *   const metrics = exporter.exportMetrics() // OTLP JSON
 *   await exporter.pushToCollector('http://localhost:4318')
 */

export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number; // 0=internal, 1=server, 2=client, 3=producer, 4=consumer
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue?: string; intValue?: string; boolValue?: boolean } }>;
  status: { code: number; message?: string }; // 0=unset, 1=ok, 2=error
}

export interface OtlpMetricDataPoint {
  attributes: Array<{ key: string; value: { stringValue?: string; doubleValue?: number } }>;
  timeUnixNano: string;
  asDouble?: number;
  asInt?: string;
}

function generateId(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

function msToNano(ms: number): string {
  return String(ms * 1_000_000);
}

export class OtelExporter {
  private engine: any;
  private sessionTraceId: string;

  constructor(engine: any) {
    this.engine = engine;
    this.sessionTraceId = generateId(16);
  }

  /**
   * Export all API calls and render events as OTLP traces.
   * Returns the JSON payload ready to POST to /v1/traces
   */
  exportTraces(): object {
    const snapshot = this.engine.buildSnapshot();
    const spans: OtlpSpan[] = [];

    // API calls → client spans
    for (const call of snapshot.api.slowest) {
      const spanId = generateId(8);
      const startNs = msToNano(call.timestamp);
      const endNs = msToNano(call.timestamp + call.duration);

      spans.push({
        traceId: this.sessionTraceId,
        spanId,
        name: `${call.method} ${call.url}`,
        kind: 2, // CLIENT
        startTimeUnixNano: startNs,
        endTimeUnixNano: endNs,
        attributes: [
          { key: 'http.method',      value: { stringValue: call.method } },
          { key: 'http.url',         value: { stringValue: call.url } },
          { key: 'http.status_code', value: { intValue: String(call.status ?? 0) } },
          { key: 'http.duration_ms', value: { intValue: String(call.duration) } },
          { key: 'devpulse.budget',  value: { stringValue: call.budgetStatus } },
        ],
        status: {
          code: call.isError ? 2 : 1,
          message: call.isError ? `HTTP ${call.status}` : undefined,
        },
      });
    }

    // Render hotspots → internal spans
    for (const hotspot of snapshot.renders.hotspots) {
      const spanId = generateId(8);
      const now = Date.now();

      spans.push({
        traceId: this.sessionTraceId,
        spanId,
        name: `render <${hotspot.displayName}>`,
        kind: 0, // INTERNAL
        startTimeUnixNano: msToNano(now - hotspot.avgRenderTimeMs),
        endTimeUnixNano: msToNano(now),
        attributes: [
          { key: 'react.component',    value: { stringValue: hotspot.displayName } },
          { key: 'react.render_count', value: { intValue: String(hotspot.renderCount) } },
          { key: 'react.avg_duration', value: { intValue: String(hotspot.avgRenderTimeMs) } },
          { key: 'react.path',         value: { stringValue: hotspot.path.join(' > ') } },
          { key: 'devpulse.budget',    value: { stringValue: hotspot.budgetStatus } },
        ],
        status: { code: hotspot.budgetStatus === 'critical' ? 2 : 1 },
      });
    }

    return {
      resourceSpans: [{
        resource: {
          attributes: [
            { key: 'service.name',    value: { stringValue: 'devpulse-monitored-app' } },
            { key: 'service.version', value: { stringValue: '0.1.0' } },
            { key: 'telemetry.sdk',   value: { stringValue: 'devpulse' } },
          ],
        },
        scopeSpans: [{
          scope: { name: '@devpulse/core', version: '0.1.0' },
          spans,
        }],
      }],
    };
  }

  /**
   * Export performance scores and counts as OTLP metrics.
   * Returns the JSON payload ready to POST to /v1/metrics
   */
  exportMetrics(): object {
    const snapshot = this.engine.buildSnapshot();
    const now = msToNano(Date.now());

    const gauge = (name: string, value: number, unit: string, attrs: Record<string, string> = {}) => ({
      name,
      unit,
      gauge: {
        dataPoints: [{
          attributes: Object.entries(attrs).map(([k, v]) => ({
            key: k, value: { stringValue: v },
          })),
          timeUnixNano: now,
          asDouble: value,
        }],
      },
    });

    return {
      resourceMetrics: [{
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: 'devpulse-monitored-app' } },
          ],
        },
        scopeMetrics: [{
          scope: { name: '@devpulse/core' },
          metrics: [
            gauge('devpulse.health_score',        snapshot.score,                    '1'),
            gauge('devpulse.api.score',            snapshot.scoreBreakdown.apiScore,   '1'),
            gauge('devpulse.render.score',         snapshot.scoreBreakdown.renderScore,'1'),
            gauge('devpulse.bundle.score',         snapshot.scoreBreakdown.bundleScore,'1'),
            gauge('devpulse.api.total_calls',      snapshot.api.totalCalls,            '{calls}'),
            gauge('devpulse.api.avg_duration_ms',  snapshot.api.avgDurationMs,         'ms'),
            gauge('devpulse.api.critical_count',   snapshot.api.criticalCount,         '{violations}'),
            gauge('devpulse.render.hotspot_count', snapshot.renders.hotspots.length,   '{components}'),
            gauge('devpulse.bundle.total_kb',      snapshot.bundles.totalSizeKb,       'kBy'),
            gauge('devpulse.bundle.critical_count',snapshot.bundles.criticalCount,     '{violations}'),
          ],
        }],
      }],
    };
  }

  /**
   * Push traces and metrics to a running OpenTelemetry collector.
   * Default endpoint: http://localhost:4318 (OTLP/HTTP standard port)
   */
  async pushToCollector(endpoint = 'http://localhost:4318'): Promise<void> {
    const traces  = this.exportTraces();
    const metrics = this.exportMetrics();

    const post = async (path: string, body: object) => {
      const res = await fetch(`${endpoint}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`OTLP push failed: ${res.status}`);
    };

    await Promise.all([
      post('/v1/traces',  traces),
      post('/v1/metrics', metrics),
    ]);

    console.log('[DevPulse → OTEL] Pushed traces and metrics to', endpoint);
  }

  /**
   * Returns a summary of what would be exported — useful for the UI.
   */
  getSummary() {
    const snapshot = this.engine.buildSnapshot();
    return {
      traceCount: snapshot.api.slowest.length + snapshot.renders.hotspots.length,
      metricCount: 10,
      sessionTraceId: this.sessionTraceId,
      collectorUrl: 'http://localhost:4318',
    };
  }
}
