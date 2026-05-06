// ─── Week 1: Data Structures ────────────────────────────────────────────────
export { MinHeap } from './structures/MinHeap';
export { ComponentTree } from './structures/ComponentTree';
export { CircularBuffer } from './structures/CircularBuffer';
export { BundleTrie } from './structures/BundleTrie';

// ─── Week 2: Config + Budget System ─────────────────────────────────────────
export {
  DEFAULT_CONFIG,
  getAPIBudgetStatus,
  getBundleBudgetStatus,
  getRenderBudgetStatus,
} from './config';

// ─── Week 2: Collectors ──────────────────────────────────────────────────────
export { APICollector } from './collectors/APICollector';
export { RenderCollector } from './collectors/RenderCollector';
export { BundleCollector, WebpackBundlePlugin } from './collectors/BundleCollector';

// ─── Week 2: Engine + Server ─────────────────────────────────────────────────
export { DevPulseEngine } from './engine';
export { DevPulseServer } from './server';

// ─── Week 2: Next.js Plugin ──────────────────────────────────────────────────
export { withDevPulse, loadDevPulseConfig } from './plugin';

// ─── Types ───────────────────────────────────────────────────────────────────
export type { HeapItem } from './structures/MinHeap';
export type { ComponentNode, RenderEvent, HotspotResult } from './structures/ComponentTree';
export type { TimelineEvent, TimelineEventType } from './structures/CircularBuffer';
export type { RouteBundle, BundleSummary } from './structures/BundleTrie';
export type { DevPulseConfig, BudgetStatus } from './config';
export type { APICall } from './collectors/APICollector';
export type { ProfilerOnRenderCallback, RenderRecord } from './collectors/RenderCollector';
export type { BundleEntry } from './collectors/BundleCollector';
export type {
  PerformanceSnapshot,
  Recommendation,
  BudgetViolation,
  APISnapshot,
  RenderSnapshot,
  BundleSnapshot,
} from './engine';

// ─── Week 5: OpenTelemetry ───────────────────────────────────────────────────
export { OtelExporter } from './otel';
export type { OtlpSpan, OtlpMetricDataPoint } from './otel';

