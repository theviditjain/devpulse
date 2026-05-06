import { describe, it, expect, beforeEach } from 'vitest';
import { RenderCollector } from '../src/collectors/RenderCollector';
import { ComponentTree } from '../src/structures/ComponentTree';
import { CircularBuffer } from '../src/structures/CircularBuffer';
import { DEFAULT_CONFIG } from '../src/config';
import type { TimelineEvent } from '../src/structures/CircularBuffer';

describe('RenderCollector', () => {
  let collector: RenderCollector;
  let tree: ComponentTree;
  let timeline: CircularBuffer<TimelineEvent>;

  beforeEach(() => {
    tree = new ComponentTree();
    timeline = new CircularBuffer<TimelineEvent>(100);
    collector = new RenderCollector(tree, timeline, DEFAULT_CONFIG);
    collector.start();
  });

  describe('createOnRenderCallback', () => {
    it('records a render event', () => {
      const cb = collector.createOnRenderCallback(null);
      cb('App', 'mount', 12, 15, Date.now(), Date.now());

      expect(tree.getNode('App')).toBeDefined();
      expect(tree.getNode('App')?.renderCount).toBe(1);
    });

    it('increments render count on repeated renders', () => {
      const cb = collector.createOnRenderCallback(null);
      cb('App', 'mount', 5, 6, Date.now(), Date.now());
      cb('App', 'update', 3, 4, Date.now(), Date.now());
      cb('App', 'update', 4, 5, Date.now(), Date.now());

      expect(tree.getNode('App')?.renderCount).toBe(3);
    });

    it('pushes to timeline', () => {
      const cb = collector.createOnRenderCallback(null);
      cb('Dashboard', 'mount', 10, 12, Date.now(), Date.now());

      const renderEvents = timeline.filterByType('render');
      expect(renderEvents.length).toBe(1);
      expect(renderEvents[0].name).toBe('Dashboard');
    });

    it('respects ignoredComponents config', () => {
      const config = { ...DEFAULT_CONFIG, ignoredComponents: ['HotReload', 'DevOverlay'] };
      const col2 = new RenderCollector(tree, timeline, config);
      col2.start();

      const cb = col2.createOnRenderCallback(null);
      cb('HotReload', 'update', 5, 5, Date.now(), Date.now());

      expect(tree.getNode('HotReload')).toBeUndefined();
    });

    it('does not record when stopped', () => {
      collector.stop();
      const cb = collector.createOnRenderCallback(null);
      cb('App', 'mount', 5, 5, Date.now(), Date.now());
      expect(tree.getNode('App')).toBeUndefined();
    });
  });

  describe('getHotspots', () => {
    it('returns components above the warning threshold', () => {
      const cb = collector.createOnRenderCallback(null);
      for (let i = 0; i < 25; i++) {
        cb('UserCard', 'update', 5, 6, Date.now(), Date.now());
      }
      cb('App', 'update', 2, 2, Date.now(), Date.now());

      const hotspots = collector.getHotspots();
      const names = hotspots.map(h => h.node.displayName);
      expect(names).toContain('UserCard');
      expect(names).not.toContain('App');
    });
  });

  describe('getComponentStats', () => {
    it('returns all components with budget status', () => {
      const cb = collector.createOnRenderCallback(null);
      cb('App', 'mount', 5, 5, Date.now(), Date.now());
      cb('App', 'update', 3, 3, Date.now(), Date.now());

      const stats = collector.getComponentStats();
      expect(stats.length).toBe(1);
      expect(stats[0].displayName).toBe('App');
      expect(stats[0]).toHaveProperty('budgetStatus');
      expect(stats[0]).toHaveProperty('avgRenderTimeMs');
    });
  });

  describe('totalRenders', () => {
    it('counts all render callbacks fired', () => {
      const cb = collector.createOnRenderCallback(null);
      cb('A', 'mount', 1, 1, Date.now(), Date.now());
      cb('B', 'mount', 1, 1, Date.now(), Date.now());
      cb('A', 'update', 1, 1, Date.now(), Date.now());

      expect(collector.totalRenders).toBe(3);
    });
  });
});
