/**
 * DevPulseEngine — the central orchestrator.
 *
 * Holds all data structures and collectors as a singleton.
 * The WebSocket server reads from this to build snapshots.
 * The withDevPulse() Next.js plugin initializes this on startup.
 *
 * Why a single engine?
 *   All collectors share the same CircularBuffer (timeline).
 *   A single snapshot captures the complete picture: API calls,
 *   render stats, and bundle sizes — all consistent at the same moment.
 *
 * Interview angle: singleton pattern for shared mutable state,
 * why we avoid multiple instances (divergent timelines).
 */

import { MinHeap } from '../structures/MinHeap';
import { ComponentTree } from '../structures/ComponentTree';
import { CircularBuffer } from '../structures/CircularBuffer';
import { BundleTrie } from '../structures/BundleTrie';
import { APICollector } from '../collectors/APICollector';
import { RenderCollector } from '../collectors/RenderCollector';
import { BundleCollector } from '../collectors/BundleCollector';
import {
  DEFAULT_CONFIG,
  getAPIBudgetStatus,
  getRenderBudgetStatus,
  getBundleBudgetStatus,
  type DevPulseConfig,
} from '../config';
import type { APICall } from '../collectors/APICollector';
import type { TimelineEvent } from '../structures/CircularBuffer';

export interface PerformanceSnapshot {
  timestamp: number;
  score: number;                    // 0–100 overall health score
  scoreBreakdown: ScoreBreakdown;
  api: APISnapshot;
  renders: RenderSnapshot;
  bundles: BundleSnapshot;
  timeline: TimelineEvent[];
  recommendations: Recommendation[];
  budgetViolations: BudgetViolation[];
}

export interface ScoreBreakdown {
  apiScore: number;
  renderScore: number;
  bundleScore: number;
}

export interface APISnapshot {
  totalCalls: number;
  avgDurationMs: number;
  criticalCount: number;
  warningCount: number;
  slowest: APICall[];
}

export interface RenderSnapshot {
  totalComponents: number;
  totalRenders: number;
  hotspots: Array<{
    displayName: string;
    renderCount: number;
    avgRenderTimeMs: number;
    path: string[];
    budgetStatus: string;
  }>;
}

export interface BundleSnapshot {
  totalRoutes: number;
  totalSizeKb: number;
  criticalCount: number;
  warningCount: number;
  largest: Array<{
    route: string;
    sizeKb: number;
    budgetStatus: string;
  }>;
}

export interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'api' | 'render' | 'bundle';
  message: string;
  detail: string;
}

export interface BudgetViolation {
  category: 'api' | 'render' | 'bundle';
  name: string;
  actual: string;
  budget: string;
  status: 'warning' | 'critical';
}

export class DevPulseEngine {
  private static instance: DevPulseEngine | null = null;

  readonly config: DevPulseConfig;

  // Data structures
  readonly apiHeap: MinHeap<APICall>;
  readonly componentTree: ComponentTree;
  readonly timeline: CircularBuffer<TimelineEvent>;
  readonly bundleTrie: BundleTrie;

  // Collectors
  readonly apiCollector: APICollector;
  readonly renderCollector: RenderCollector;
  readonly bundleCollector: BundleCollector;

  private constructor(config: Partial<DevPulseConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Init data structures
    this.apiHeap = new MinHeap<APICall>(100);
    this.componentTree = new ComponentTree();
    this.timeline = new CircularBuffer<TimelineEvent>(1000);
    this.bundleTrie = new BundleTrie();

    // Init collectors — all share the same timeline
    this.apiCollector = new APICollector(this.apiHeap, this.timeline, this.config);
    this.renderCollector = new RenderCollector(this.componentTree, this.timeline, this.config);
    this.bundleCollector = new BundleCollector(this.bundleTrie, this.timeline, this.config);
  }

  static getInstance(config?: Partial<DevPulseConfig>): DevPulseEngine {
    if (!DevPulseEngine.instance) {
      DevPulseEngine.instance = new DevPulseEngine(config);
    }
    return DevPulseEngine.instance;
  }

  static resetInstance(): void {
    DevPulseEngine.instance = null;
  }

  start(): void {
    this.apiCollector.start();
    this.renderCollector.start();
    console.log('[DevPulse] Engine started. Monitoring active.');
  }

  stop(): void {
    this.apiCollector.stop();
    this.renderCollector.stop();
    console.log('[DevPulse] Engine stopped.');
  }

  /**
   * Build a complete point-in-time snapshot of all metrics.
   * This is what the WebSocket server sends to the dashboard every second.
   */
  buildSnapshot(): PerformanceSnapshot {
    const apiStats = this.apiCollector.getStats();
    const slowestAPIs = this.apiCollector.getSlowestCalls(10);
    const hotspots = this.renderCollector.getHotspots();
    const bundleStats = this.bundleCollector.getStats();
    const largestBundles = this.bundleCollector.getLargestBundles(10);
    const recentEvents = this.timeline.getRecent(100);

    // ─── Score calculation ───────────────────────────────────────────────────
    // API score: penalise for critical/warning calls as % of total
    const apiScore = this.calcAPIScore(apiStats);
    // Render score: penalise for hotspot components
    const renderScore = this.calcRenderScore(hotspots.length);
    // Bundle score: penalise for oversized routes
    const bundleScore = this.calcBundleScore(bundleStats.criticalCount, bundleStats.warningCount);

    // Weighted average: API 40%, Render 35%, Bundle 25%
    const score = Math.round(apiScore * 0.4 + renderScore * 0.35 + bundleScore * 0.25);

    const recommendations = this.generateRecommendations(slowestAPIs, hotspots, largestBundles);
    const budgetViolations = this.collectViolations(slowestAPIs, hotspots, largestBundles);

    return {
      timestamp: Date.now(),
      score,
      scoreBreakdown: { apiScore, renderScore, bundleScore },
      api: {
        totalCalls: apiStats.totalCalls,
        avgDurationMs: apiStats.avgDurationMs,
        criticalCount: apiStats.criticalCount,
        warningCount: apiStats.warningCount,
        slowest: slowestAPIs,
      },
      renders: {
        totalComponents: this.componentTree.size,
        totalRenders: this.renderCollector.totalRenders,
        hotspots: hotspots.map(h => ({
          displayName: h.node.displayName,
          renderCount: h.node.renderCount,
          avgRenderTimeMs: Math.round(h.avgRenderTimeMs),
          path: h.path,
          budgetStatus: h.budgetStatus,
        })),
      },
      bundles: {
        totalRoutes: bundleStats.totalRoutes,
        totalSizeKb: bundleStats.totalSizeKb,
        criticalCount: bundleStats.criticalCount,
        warningCount: bundleStats.warningCount,
        largest: largestBundles.map(b => ({
          route: b.route,
          sizeKb: b.sizeKb,
          budgetStatus: b.budgetStatus,
        })),
      },
      timeline: recentEvents,
      recommendations,
      budgetViolations,
    };
  }

  // ─── Score helpers ───────────────────────────────────────────────────────────

  private calcAPIScore(stats: ReturnType<APICollector['getStats']>): number {
    if (stats.totalCalls === 0) return 100;
    const violationRate =
      (stats.criticalCount * 2 + stats.warningCount) / stats.totalCalls;
    return Math.max(0, Math.round(100 - violationRate * 100));
  }

  private calcRenderScore(hotspotCount: number): number {
    return Math.max(0, 100 - hotspotCount * 15);
  }

  private calcBundleScore(critical: number, warning: number): number {
    return Math.max(0, 100 - critical * 20 - warning * 10);
  }

  // ─── Recommendations engine ──────────────────────────────────────────────────

  private generateRecommendations(
    slowestAPIs: APICall[],
    hotspots: ReturnType<RenderCollector['getHotspots']>,
    largestBundles: ReturnType<BundleCollector['getLargestBundles']>
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    // API recommendations
    for (const call of slowestAPIs) {
      if (call.budgetStatus === 'critical') {
        recs.push({
          id: `api-critical-${call.url}`,
          severity: 'critical',
          category: 'api',
          message: `${call.method} ${call.url} is critically slow`,
          detail: `Last response took ${call.duration}ms. Budget is ${this.config.apiCriticalMs}ms. Consider caching, pagination, or moving heavy computation server-side.`,
        });
      } else if (call.budgetStatus === 'warning') {
        recs.push({
          id: `api-warning-${call.url}`,
          severity: 'warning',
          category: 'api',
          message: `${call.method} ${call.url} is approaching the slow threshold`,
          detail: `Last response took ${call.duration}ms. Budget is ${this.config.apiWarningMs}ms.`,
        });
      }
    }

    // Render recommendations
    for (const hotspot of hotspots) {
      if (hotspot.node.renderCount >= this.config.renderCriticalCount) {
        recs.push({
          id: `render-critical-${hotspot.node.id}`,
          severity: 'critical',
          category: 'render',
          message: `<${hotspot.node.displayName}> has rendered ${hotspot.node.renderCount} times`,
          detail: `Path: ${hotspot.path.join(' → ')}. Consider wrapping with React.memo(), useMemo(), or useCallback() to prevent unnecessary re-renders.`,
        });
      } else {
        recs.push({
          id: `render-warning-${hotspot.node.id}`,
          severity: 'warning',
          category: 'render',
          message: `<${hotspot.node.displayName}> is re-rendering frequently (${hotspot.node.renderCount}×)`,
          detail: `Average render time: ${Math.round(hotspot.avgRenderTimeMs)}ms. Check if parent state changes are causing unnecessary child renders.`,
        });
      }
    }

    // Bundle recommendations
    for (const bundle of largestBundles) {
      if (bundle.budgetStatus === 'critical') {
        recs.push({
          id: `bundle-critical-${bundle.route}`,
          severity: 'critical',
          category: 'bundle',
          message: `Route ${bundle.route} has an oversized bundle (${bundle.sizeKb}KB)`,
          detail: `Budget is ${this.config.bundleCriticalKb}KB. Consider dynamic imports: const Chart = dynamic(() => import('./Chart'), { ssr: false })`,
        });
      } else if (bundle.budgetStatus === 'warning') {
        recs.push({
          id: `bundle-warning-${bundle.route}`,
          severity: 'warning',
          category: 'bundle',
          message: `Route ${bundle.route} bundle is large (${bundle.sizeKb}KB)`,
          detail: `Budget is ${this.config.bundleWarningKb}KB. Review imports — are large dependencies (lodash, moment, d3) being fully imported?`,
        });
      }
    }

    // Sort: critical first, then warning, then info
    return recs.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  private collectViolations(
    slowestAPIs: APICall[],
    hotspots: ReturnType<RenderCollector['getHotspots']>,
    largestBundles: ReturnType<BundleCollector['getLargestBundles']>
  ): BudgetViolation[] {
    const violations: BudgetViolation[] = [];

    for (const call of slowestAPIs) {
      if (call.budgetStatus !== 'good') {
        const budget =
          call.budgetStatus === 'critical'
            ? `${this.config.apiCriticalMs}ms`
            : `${this.config.apiWarningMs}ms`;
        violations.push({
          category: 'api',
          name: `${call.method} ${call.url}`,
          actual: `${call.duration}ms`,
          budget,
          status: call.budgetStatus,
        });
      }
    }

    for (const hotspot of hotspots) {
      violations.push({
        category: 'render',
        name: `<${hotspot.node.displayName}>`,
        actual: `${hotspot.node.renderCount} renders`,
        budget: `${this.config.renderWarningCount} renders`,
        status: hotspot.budgetStatus as 'warning' | 'critical',
      });
    }

    for (const bundle of largestBundles) {
      if (bundle.budgetStatus !== 'good') {
        const budget =
          bundle.budgetStatus === 'critical'
            ? `${this.config.bundleCriticalKb}KB`
            : `${this.config.bundleWarningKb}KB`;
        violations.push({
          category: 'bundle',
          name: bundle.route,
          actual: `${bundle.sizeKb}KB`,
          budget,
          status: bundle.budgetStatus,
        });
      }
    }

    return violations;
  }
}
