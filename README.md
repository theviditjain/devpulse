# DevPulse 🔍

> Live performance monitoring dashboard for Next.js apps in development.
> Intercepts API calls, tracks React renders, analyzes bundle sizes — all in real time.

[![Tests](https://img.shields.io/badge/tests-86%20passing-00ff88?style=flat-square&labelColor=0a0a0f)](./packages/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-6c63ff?style=flat-square&labelColor=0a0a0f)](./tsconfig.base.json)
[![License](https://img.shields.io/badge/license-MIT-8888aa?style=flat-square&labelColor=0a0a0f)](./LICENSE)

---

## What it does

When building a Next.js app you never know:
- Which API call is taking 3 seconds vs 300ms
- Which React component is re-rendering 87 times unnecessarily
- Which route's JS bundle is 1.2MB when it should be 200KB

DevPulse tells you — **live, as you code**.

---

## Quick Start

```bash
npm install @devpulse/core
npx devpulse init
```

```js
// next.config.js
const { withDevPulse } = require('@devpulse/core')
module.exports = withDevPulse({})
```

```bash
npx devpulse dev
# Dashboard → http://localhost:3001
```

---

## Dashboard Pages

| Page | Description |
|---|---|
| **Overview** | Score gauge, API heatmap, score history, recommendations |
| **API Monitor** | Sortable table, p50/p95 latency, filter by status |
| **Components** | Render hotspot list, component tree visualization |
| **Bundles** | Treemap + route breakdown, drill-down by prefix |
| **Timeline** | Live event stream, filterable, pauseable |
| **Snapshots** | Before/After comparison with delta metrics |
| **OpenTelemetry** | Export traces + metrics in OTLP format |
| **Budget Rules** | Configure warning/critical thresholds with sliders |
| **Settings** | Export JSON/HTML reports, preferences |

---

## Core Data Structures

Every part of DevPulse is built on a purpose-chosen data structure:

### MinHeap — API call tracker
```
O(log n) insert. Bounded at 100 entries.
Always surfacing the N slowest calls without sorting.
Interview: why min-heap of size K finds top-K largest efficiently.
```

### ComponentTree — Render hierarchy
```
N-ary tree mirroring React's component tree.
DFS to find hotspots in O(n). Parent-child causation preserved.
Interview: why tree over flat map — because "why is X re-rendering"
often leads to its parent.
```

### CircularBuffer — Event timeline
```
Fixed 1000-slot ring buffer. O(1) insert, zero GC pressure.
Same pattern used in OS kernel event logs, audio processing.
Interview: modular index arithmetic, bounded streaming data.
```

### BundleTrie — Route bundle sizes
```
Prefix tree on route segments. O(depth) insert and lookup.
DFS aggregation: getTotalSize('/dashboard') sums all sub-routes.
Interview: same concept as IP routing tables, autocomplete engines.
```

---

## Performance Budget

```js
// devpulse.config.js
module.exports = {
  apiWarningMs:        800,   // yellow above this
  apiCriticalMs:       2000,  // red above this
  bundleWarningKb:     300,
  bundleCriticalKb:    800,
  renderWarningCount:  20,
  renderCriticalCount: 50,
};
```

---

## CLI

```bash
npx devpulse init          # scaffold devpulse.config.js
npx devpulse dev           # start WS server + open dashboard
npx devpulse report --html # generate devpulse-report.json + .html
```

---

## OpenTelemetry

DevPulse exports traces and metrics in OTLP JSON format:

```ts
import { OtelExporter } from '@devpulse/core'
const exporter = new OtelExporter(engine)

// Export OTLP JSON
const traces  = exporter.exportTraces()
const metrics = exporter.exportMetrics()

// Push to any OTEL collector (Jaeger, Tempo, Datadog...)
await exporter.pushToCollector('http://localhost:4318')
```

---

## Architecture

```
Your Next.js App (localhost:3000)
  ↓ withDevPulse() injects collectors at build time
  ↓ fetch interceptor  → MinHeap + CircularBuffer
  ↓ React Profiler API → ComponentTree
  ↓ Webpack plugin     → BundleTrie
  ↓ WebSocket push every 1s
DevPulse Dashboard (localhost:3001)
  ↓ Score gauge · API heatmap · Component tree
  ↓ Bundle treemap · Timeline · Snapshot comparison
  ↓ OTLP export · Budget rules · HTML report
```

---

## Monorepo

```
devpulse/
├── packages/
│   ├── core/        ← NPM package: data structures + collectors + WS server
│   ├── dashboard/   ← Next.js 14 dashboard UI (9 pages)
│   └── cli/         ← npx devpulse commands
├── examples/
│   └── demo-app/    ← Example app with intentional perf issues
└── README.md
```

---

## Tech Stack

**Core:** TypeScript · WebSocket (`ws`) · Vitest  
**Dashboard:** Next.js 14 · Tailwind CSS · Canvas API · Geist fonts  
**Infra:** Turborepo · npm workspaces  
**Observability:** OpenTelemetry OTLP/JSON

---

Built by [Vidit Jain](https://github.com/theviditjain) — 3rd year BTech, 2025
