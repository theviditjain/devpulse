/**
 * ComponentTree — an N-ary tree that mirrors React's component hierarchy.
 *
 * Why a tree (not a flat map)?
 *   - React components form a parent-child tree. When <Dashboard> re-renders,
 *     it causes all children to re-render. Knowing the parent-child relationship
 *     is the key to diagnosing *why* a component is hot.
 *   - DFS lets us find all hotspots in one pass — O(n) where n = component count.
 *   - A flat hash map loses the causation chain.
 *
 * Interview angle: DFS traversal, tree construction from streaming events,
 * why parent-child structure matters for React performance debugging.
 */

export interface ComponentNode {
  id: string;
  displayName: string;
  parentId: string | null;
  children: ComponentNode[];
  renderCount: number;
  totalRenderTimeMs: number;
  lastRenderedAt: number;
  selfTimeMs: number; // time excluding children
}

export interface RenderEvent {
  componentId: string;
  displayName: string;
  parentId: string | null;
  durationMs: number;
  timestamp: number;
  phase: 'mount' | 'update';
}

export interface HotspotResult {
  node: ComponentNode;
  avgRenderTimeMs: number;
  path: string[]; // ancestor names from root → node
}

export class ComponentTree {
  private nodeMap = new Map<string, ComponentNode>();
  private roots: ComponentNode[] = []; // top-level components (no parent)

  /**
   * Record a render event. Creates the node if it doesn't exist yet,
   * attaches it to its parent, and updates metrics.
   * O(1) amortized (hash map lookup + tree pointer update)
   */
  addRender(event: RenderEvent): void {
    let node = this.nodeMap.get(event.componentId);

    if (!node) {
      node = {
        id: event.componentId,
        displayName: event.displayName,
        parentId: event.parentId,
        children: [],
        renderCount: 0,
        totalRenderTimeMs: 0,
        lastRenderedAt: 0,
        selfTimeMs: 0,
      };
      this.nodeMap.set(event.componentId, node);

      // Attach to parent or mark as root
      if (event.parentId) {
        const parent = this.nodeMap.get(event.parentId);
        if (parent && !parent.children.find(c => c.id === event.componentId)) {
          parent.children.push(node);
        }
      } else {
        if (!this.roots.find(r => r.id === event.componentId)) {
          this.roots.push(node);
        }
      }
    }

    node.renderCount++;
    node.totalRenderTimeMs += event.durationMs;
    node.lastRenderedAt = event.timestamp;
  }

  /**
   * DFS to find all components exceeding a render count threshold.
   * Returns nodes sorted by render count descending.
   * O(n)
   */
  findHotspots(renderThreshold = 20): HotspotResult[] {
    const hotspots: HotspotResult[] = [];

    const dfs = (node: ComponentNode, ancestorPath: string[]): void => {
      const currentPath = [...ancestorPath, node.displayName];

      if (node.renderCount >= renderThreshold) {
        hotspots.push({
          node,
          avgRenderTimeMs:
            node.renderCount > 0
              ? node.totalRenderTimeMs / node.renderCount
              : 0,
          path: currentPath,
        });
      }

      for (const child of node.children) {
        dfs(child, currentPath);
      }
    };

    for (const root of this.roots) {
      dfs(root, []);
    }

    return hotspots.sort((a, b) => b.node.renderCount - a.node.renderCount);
  }

  /**
   * Get a node by component ID.
   * O(1)
   */
  getNode(componentId: string): ComponentNode | undefined {
    return this.nodeMap.get(componentId);
  }

  /**
   * Get all nodes as a flat array, sorted by render count descending.
   * Useful for the dashboard table view.
   */
  getAllSorted(): ComponentNode[] {
    return Array.from(this.nodeMap.values()).sort(
      (a, b) => b.renderCount - a.renderCount
    );
  }

  /**
   * Return the ancestor path from the root down to a given node.
   * O(depth) — typically shallow in React apps.
   */
  getPath(componentId: string): string[] {
    const node = this.nodeMap.get(componentId);
    if (!node) return [];

    const path: string[] = [];
    let current: ComponentNode | undefined = node;

    while (current) {
      path.unshift(current.displayName);
      current = current.parentId
        ? this.nodeMap.get(current.parentId)
        : undefined;
    }

    return path;
  }

  /**
   * Returns the tree roots (for rendering the tree UI).
   */
  getRoots(): ComponentNode[] {
    return this.roots;
  }

  /**
   * Total unique components tracked.
   */
  get size(): number {
    return this.nodeMap.size;
  }

  clear(): void {
    this.nodeMap.clear();
    this.roots = [];
  }

  /**
   * Serialize to plain object for JSON transport over WebSocket.
   */
  toJSON(): { roots: ComponentNode[]; totalComponents: number } {
    return {
      roots: this.roots,
      totalComponents: this.nodeMap.size,
    };
  }
}
