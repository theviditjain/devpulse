/**
 * BundleTrie — a prefix tree (trie) for tracking bundle sizes per route.
 *
 * Why a trie?
 *   - Routes share prefixes: /dashboard, /dashboard/settings,
 *     /dashboard/settings/profile. A trie stores these without repetition.
 *   - O(L) lookup/insert where L = path depth (typically ≤ 5 segments).
 *   - DFS aggregation: "total bundle size under /dashboard/*" is one
 *     tree traversal, not a filter over all routes.
 *   - Natural hierarchical grouping mirrors Next.js App Router structure.
 *
 * Interview angle: autocomplete, IP routing tables, and filesystem paths
 * all use tries for the same reason — shared prefixes, O(depth) operations.
 */

export interface TrieNode {
  segment: string;         // e.g. "dashboard"
  fullPath: string;        // e.g. "/dashboard/settings"
  sizeBytes: number;       // bundle size for THIS exact route (0 if not a leaf)
  children: Map<string, TrieNode>;
  isRoute: boolean;        // true if an actual route was registered here
  chunkName?: string;      // webpack/vite chunk name
  dependencies?: string[]; // major deps in this chunk (lodash, d3, etc.)
}

export interface RouteBundle {
  path: string;
  sizeBytes: number;
  chunkName?: string;
  dependencies?: string[];
}

export interface BundleSummary {
  path: string;
  ownSizeBytes: number;    // size of this route only
  totalSizeBytes: number;  // size including all children
  childCount: number;
}

export class BundleTrie {
  private root: TrieNode = {
    segment: '',
    fullPath: '/',
    sizeBytes: 0,
    children: new Map(),
    isRoute: false,
  };

  /**
   * Register a route with its bundle size.
   * O(L) where L = number of path segments.
   *
   * Example: addRoute('/dashboard/settings', 420_000)
   */
  addRoute(path: string, sizeBytes: number, meta?: Partial<Pick<TrieNode, 'chunkName' | 'dependencies'>>): void {
    const segments = this.splitPath(path);
    let node = this.root;
    let currentPath = '';

    for (const segment of segments) {
      currentPath += '/' + segment;

      if (!node.children.has(segment)) {
        node.children.set(segment, {
          segment,
          fullPath: currentPath,
          sizeBytes: 0,
          children: new Map(),
          isRoute: false,
        });
      }

      node = node.children.get(segment)!;
    }

    // Mark the terminal node as a real route
    node.sizeBytes = sizeBytes;
    node.isRoute = true;
    if (meta?.chunkName) node.chunkName = meta.chunkName;
    if (meta?.dependencies) node.dependencies = meta.dependencies;
  }

  /**
   * Get the bundle size for an exact route.
   * O(L)
   */
  getRouteSize(path: string): number {
    const node = this.findNode(path);
    return node?.sizeBytes ?? 0;
  }

  /**
   * Get the total bundle size for a prefix (the route + all sub-routes).
   * This is the key operation for the treemap UI drill-down.
   * O(subtree size)
   *
   * Example: getTotalSize('/dashboard') sums /dashboard, /dashboard/settings,
   *          /dashboard/settings/profile, etc.
   */
  getTotalSize(prefix: string): number {
    const node = prefix === '/' ? this.root : this.findNode(prefix);
    if (!node) return 0;
    return this.dfsSum(node);
  }

  /**
   * Get a summary for every route and its subtree — used for the bundle page table.
   * Sorted by own size descending.
   */
  getAllRoutes(): BundleSummary[] {
    const results: BundleSummary[] = [];
    this.dfsSummary(this.root, results);
    return results
      .filter(r => r.ownSizeBytes > 0)
      .sort((a, b) => b.ownSizeBytes - a.ownSizeBytes);
  }

  /**
   * Find the largest routes (own size) — top offenders.
   */
  getLargest(n = 10): BundleSummary[] {
    return this.getAllRoutes().slice(0, n);
  }

  /**
   * Get direct children of a path with their subtree sizes.
   * Powers the treemap drill-down: click /dashboard → see its children.
   */
  getChildren(path: string): BundleSummary[] {
    const node = path === '/' ? this.root : this.findNode(path);
    if (!node) return [];

    const results: BundleSummary[] = [];
    for (const child of node.children.values()) {
      results.push({
        path: child.fullPath,
        ownSizeBytes: child.sizeBytes,
        totalSizeBytes: this.dfsSum(child),
        childCount: this.countRoutes(child),
      });
    }

    return results.sort((a, b) => b.totalSizeBytes - a.totalSizeBytes);
  }

  /**
   * Total bundle size across all routes.
   */
  getTotalBundleSize(): number {
    return this.dfsSum(this.root);
  }

  /**
   * Number of registered routes.
   */
  get routeCount(): number {
    return this.countRoutes(this.root);
  }

  clear(): void {
    this.root.children.clear();
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private findNode(path: string): TrieNode | null {
    const segments = this.splitPath(path);
    let node = this.root;

    for (const segment of segments) {
      const child = node.children.get(segment);
      if (!child) return null;
      node = child;
    }

    return node;
  }

  private dfsSum(node: TrieNode): number {
    let total = node.sizeBytes;
    for (const child of node.children.values()) {
      total += this.dfsSum(child);
    }
    return total;
  }

  private dfsSummary(node: TrieNode, acc: BundleSummary[]): void {
    if (node.isRoute) {
      acc.push({
        path: node.fullPath || '/',
        ownSizeBytes: node.sizeBytes,
        totalSizeBytes: this.dfsSum(node),
        childCount: this.countRoutes(node),
      });
    }
    for (const child of node.children.values()) {
      this.dfsSummary(child, acc);
    }
  }

  private countRoutes(node: TrieNode): number {
    let count = node.isRoute ? 1 : 0;
    for (const child of node.children.values()) {
      count += this.countRoutes(child);
    }
    return count;
  }

  private splitPath(path: string): string[] {
    return path.split('/').filter(Boolean);
  }
}
