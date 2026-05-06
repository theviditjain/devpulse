/**
 * BundleCollector — tracks JavaScript bundle sizes per route.
 *
 * Two parts:
 *   1. BundleCollector class — receives bundle data, stores in BundleTrie,
 *      runs budget checks. Lives in the core package.
 *
 *   2. WebpackBundlePlugin (below) — a Webpack plugin that runs during
 *      Next.js builds and sends chunk data to the BundleCollector.
 *      This is what withDevPulse() injects into next.config.js.
 *
 * How Webpack plugins work:
 *   Webpack emits lifecycle hooks during compilation. We tap into
 *   'emit' (after all chunks are built) to read chunk sizes and route mappings.
 *   Next.js maps webpack chunks to routes via its internal manifest files.
 *
 * Interview angle: Webpack plugins are the backbone of tools like
 *   bundle-analyzer, source-map-explorer, and speed-measure-plugin.
 *   We're building a lightweight version of @next/bundle-analyzer.
 */

import { BundleTrie } from '../structures/BundleTrie';
import { CircularBuffer } from '../structures/CircularBuffer';
import type { TimelineEvent } from '../structures/CircularBuffer';
import {
  getBundleBudgetStatus,
  type DevPulseConfig,
  type BudgetStatus,
} from '../config';

export interface BundleEntry {
  route: string;
  sizeBytes: number;
  sizeKb: number;
  chunkName: string;
  dependencies: string[];
  budgetStatus: BudgetStatus;
  timestamp: number;
}

export class BundleCollector {
  private trie: BundleTrie;
  private timeline: CircularBuffer<TimelineEvent>;
  private config: DevPulseConfig;
  private entries = new Map<string, BundleEntry>();

  constructor(
    trie: BundleTrie,
    timeline: CircularBuffer<TimelineEvent>,
    config: DevPulseConfig
  ) {
    this.trie = trie;
    this.timeline = timeline;
    this.config = config;
  }

  /**
   * Register a route's bundle size. Called by the Webpack plugin after each build.
   */
  registerBundle(
    route: string,
    sizeBytes: number,
    chunkName = '',
    dependencies: string[] = []
  ): void {
    const budgetStatus = getBundleBudgetStatus(sizeBytes, this.config);
    const entry: BundleEntry = {
      route,
      sizeBytes,
      sizeKb: Math.round(sizeBytes / 1024),
      chunkName,
      dependencies,
      budgetStatus,
      timestamp: Date.now(),
    };

    this.entries.set(route, entry);
    this.trie.addRoute(route, sizeBytes, { chunkName, dependencies });

    // Log to timeline if it's a violation
    if (budgetStatus !== 'good') {
      this.timeline.add({
        id: `bundle-${route}-${Date.now()}`,
        type: 'navigation',
        name: `Bundle: ${route}`,
        timestamp: Date.now(),
        isError: budgetStatus === 'critical',
        metadata: entry as unknown as Record<string, unknown>,
      });
    }
  }

  getAllBundles(): BundleEntry[] {
    return Array.from(this.entries.values()).sort(
      (a, b) => b.sizeBytes - a.sizeBytes
    );
  }

  getLargestBundles(n = 10): BundleEntry[] {
    return this.getAllBundles().slice(0, n);
  }

  getRouteBreakdown() {
    return this.trie.getAllRoutes();
  }

  getTotalSize(): number {
    return this.trie.getTotalBundleSize();
  }

  getViolations(): BundleEntry[] {
    return this.getAllBundles().filter(b => b.budgetStatus !== 'good');
  }

  getStats() {
    const all = this.getAllBundles();
    return {
      totalRoutes: all.length,
      totalSizeKb: Math.round(this.getTotalSize() / 1024),
      criticalCount: all.filter(b => b.budgetStatus === 'critical').length,
      warningCount: all.filter(b => b.budgetStatus === 'warning').length,
    };
  }
}

// ─── Webpack Plugin ──────────────────────────────────────────────────────────

/**
 * WebpackBundlePlugin — taps into Webpack's emit hook to extract chunk sizes.
 *
 * This is what gets injected by withDevPulse() in next.config.js.
 * It runs on every build (dev hot reload included) and sends data
 * to the BundleCollector via the shared DevPulse engine instance.
 *
 * Usage (internal, called by withDevPulse):
 *   new WebpackBundlePlugin({ onBundle: (route, size, chunk, deps) => ... })
 */
export interface WebpackBundlePluginOptions {
  onBundle: (
    route: string,
    sizeBytes: number,
    chunkName: string,
    dependencies: string[]
  ) => void;
}

export class WebpackBundlePlugin {
  static pluginName = 'DevPulseBundlePlugin';
  private options: WebpackBundlePluginOptions;

  constructor(options: WebpackBundlePluginOptions) {
    this.options = options;
  }

  // Webpack calls apply(compiler) to register the plugin
  apply(compiler: any): void {
    compiler.hooks.emit.tapAsync(
      WebpackBundlePlugin.pluginName,
      (compilation: any, callback: () => void) => {
        try {
          this.processCompilation(compilation);
        } catch (err) {
          // Never crash the build — DevPulse is a dev tool, not a blocker
          console.warn('[DevPulse] Bundle analysis error:', err);
        }
        callback();
      }
    );
  }

  private processCompilation(compilation: any): void {
    const chunks: Map<string, number> = new Map();

    // Walk all emitted assets and sum sizes per chunk
    for (const [filename, asset] of Object.entries(compilation.assets)) {
      const source = asset as any;
      const sizeBytes = source.size ? source.size() : 0;

      // Next.js chunk naming: pages/dashboard-abc123.js → /dashboard
      const route = this.chunkNameToRoute(filename);
      if (!route) continue;

      const existing = chunks.get(route) ?? 0;
      chunks.set(route, existing + sizeBytes);
    }

    // Extract dependencies from modules (top-level node_modules imports)
    const routeDeps = this.extractDependencies(compilation);

    // Report each route
    for (const [route, sizeBytes] of chunks) {
      this.options.onBundle(
        route,
        sizeBytes,
        route,
        routeDeps.get(route) ?? []
      );
    }
  }

  private chunkNameToRoute(filename: string): string | null {
    // Match Next.js page chunks: static/chunks/pages/dashboard-abc.js
    const pagesMatch = filename.match(/pages\/(.+?)(?:-[a-f0-9]+)?\.js$/);
    if (pagesMatch) {
      const page = pagesMatch[1];
      return page === 'index' ? '/' : `/${page}`;
    }

    // Match Next.js app router chunks: app/dashboard/page-abc.js
    const appMatch = filename.match(/app\/(.+?)\/page(?:-[a-f0-9]+)?\.js$/);
    if (appMatch) {
      return `/${appMatch[1]}`;
    }

    return null;
  }

  private extractDependencies(compilation: any): Map<string, string[]> {
    const deps = new Map<string, string[]>();

    try {
      for (const module of compilation.modules) {
        if (!module.resource) continue;
        const match = module.resource.match(/node_modules\/([^/]+)/);
        if (!match) continue;

        const pkgName = match[1];
        // Find which chunk/route this module belongs to
        for (const chunk of module.chunks ?? []) {
          const route = this.chunkNameToRoute(chunk.name ?? '');
          if (!route) continue;
          const existing = deps.get(route) ?? [];
          if (!existing.includes(pkgName)) {
            deps.set(route, [...existing, pkgName]);
          }
        }
      }
    } catch {
      // Module introspection can fail in some Webpack versions — safe to skip
    }

    return deps;
  }
}
