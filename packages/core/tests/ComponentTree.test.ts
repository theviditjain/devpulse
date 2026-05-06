import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentTree } from '../src/structures/ComponentTree';
import type { RenderEvent } from '../src/structures/ComponentTree';

function makeEvent(overrides: Partial<RenderEvent> & { componentId: string }): RenderEvent {
  return {
    displayName: overrides.componentId,
    parentId: null,
    durationMs: 10,
    timestamp: Date.now(),
    phase: 'update',
    ...overrides,
  };
}

describe('ComponentTree', () => {
  let tree: ComponentTree;

  beforeEach(() => {
    tree = new ComponentTree();
  });

  describe('addRender — basic', () => {
    it('starts empty', () => {
      expect(tree.size).toBe(0);
    });

    it('adds a root component', () => {
      tree.addRender(makeEvent({ componentId: 'App', parentId: null }));
      expect(tree.size).toBe(1);
      expect(tree.getRoots()[0].displayName).toBe('App');
    });

    it('increments renderCount on repeated renders', () => {
      tree.addRender(makeEvent({ componentId: 'App' }));
      tree.addRender(makeEvent({ componentId: 'App' }));
      tree.addRender(makeEvent({ componentId: 'App' }));
      expect(tree.getNode('App')?.renderCount).toBe(3);
    });

    it('accumulates totalRenderTimeMs', () => {
      tree.addRender(makeEvent({ componentId: 'App', durationMs: 10 }));
      tree.addRender(makeEvent({ componentId: 'App', durationMs: 20 }));
      expect(tree.getNode('App')?.totalRenderTimeMs).toBe(30);
    });
  });

  describe('parent-child relationships', () => {
    beforeEach(() => {
      // App → Dashboard → UserCard
      tree.addRender(makeEvent({ componentId: 'App', parentId: null }));
      tree.addRender(makeEvent({ componentId: 'Dashboard', parentId: 'App' }));
      tree.addRender(makeEvent({ componentId: 'UserCard', parentId: 'Dashboard' }));
    });

    it('attaches children to parent nodes', () => {
      const app = tree.getNode('App')!;
      expect(app.children).toHaveLength(1);
      expect(app.children[0].displayName).toBe('Dashboard');
    });

    it('builds a 3-level hierarchy', () => {
      const dashboard = tree.getNode('Dashboard')!;
      expect(dashboard.children[0].displayName).toBe('UserCard');
    });

    it('only App is a root (no parentId)', () => {
      expect(tree.getRoots()).toHaveLength(1);
      expect(tree.getRoots()[0].displayName).toBe('App');
    });

    it('does not add duplicate children on re-render', () => {
      // Render Dashboard 5 more times — should not add duplicate children
      for (let i = 0; i < 5; i++) {
        tree.addRender(makeEvent({ componentId: 'Dashboard', parentId: 'App' }));
      }
      const app = tree.getNode('App')!;
      expect(app.children).toHaveLength(1);
    });
  });

  describe('findHotspots', () => {
    beforeEach(() => {
      tree.addRender(makeEvent({ componentId: 'App', parentId: null }));
      tree.addRender(makeEvent({ componentId: 'Dashboard', parentId: 'App' }));

      // UserCard renders 50 times — hotspot
      for (let i = 0; i < 50; i++) {
        tree.addRender(makeEvent({ componentId: 'UserCard', parentId: 'Dashboard', durationMs: 5 }));
      }

      // PostList renders 5 times — not a hotspot at threshold 20
      for (let i = 0; i < 5; i++) {
        tree.addRender(makeEvent({ componentId: 'PostList', parentId: 'App' }));
      }
    });

    it('finds components above the render threshold', () => {
      const hotspots = tree.findHotspots(20);
      const names = hotspots.map(h => h.node.displayName);
      expect(names).toContain('UserCard');
      expect(names).not.toContain('App');
      expect(names).not.toContain('PostList');
    });

    it('calculates avgRenderTimeMs correctly', () => {
      const hotspots = tree.findHotspots(20);
      const userCard = hotspots.find(h => h.node.displayName === 'UserCard');
      expect(userCard?.avgRenderTimeMs).toBe(5);
    });

    it('returns empty array when no hotspots', () => {
      const fresh = new ComponentTree();
      fresh.addRender(makeEvent({ componentId: 'App' }));
      expect(fresh.findHotspots(20)).toHaveLength(0);
    });

    it('sorts hotspots by render count descending', () => {
      // Add another hotspot with fewer renders
      for (let i = 0; i < 25; i++) {
        tree.addRender(makeEvent({ componentId: 'Header', parentId: 'App' }));
      }
      const hotspots = tree.findHotspots(20);
      expect(hotspots[0].node.displayName).toBe('UserCard'); // 50 renders > 25
    });

    it('includes ancestor path in result', () => {
      const hotspots = tree.findHotspots(20);
      const userCard = hotspots.find(h => h.node.displayName === 'UserCard');
      expect(userCard?.path).toEqual(['App', 'Dashboard', 'UserCard']);
    });
  });

  describe('getPath', () => {
    it('returns the full ancestor chain', () => {
      tree.addRender(makeEvent({ componentId: 'App', parentId: null }));
      tree.addRender(makeEvent({ componentId: 'Page', parentId: 'App' }));
      tree.addRender(makeEvent({ componentId: 'Card', parentId: 'Page' }));

      expect(tree.getPath('Card')).toEqual(['App', 'Page', 'Card']);
    });

    it('returns empty array for unknown component', () => {
      expect(tree.getPath('Unknown')).toEqual([]);
    });
  });

  describe('getAllSorted', () => {
    it('returns all components sorted by render count', () => {
      tree.addRender(makeEvent({ componentId: 'A' }));
      for (let i = 0; i < 10; i++) tree.addRender(makeEvent({ componentId: 'B' }));
      for (let i = 0; i < 5; i++) tree.addRender(makeEvent({ componentId: 'C' }));

      const sorted = tree.getAllSorted();
      expect(sorted[0].displayName).toBe('B');
      expect(sorted[1].displayName).toBe('C');
      expect(sorted[2].displayName).toBe('A');
    });
  });

  describe('clear', () => {
    it('resets the tree', () => {
      tree.addRender(makeEvent({ componentId: 'App' }));
      tree.clear();
      expect(tree.size).toBe(0);
      expect(tree.getRoots()).toHaveLength(0);
    });
  });
});
