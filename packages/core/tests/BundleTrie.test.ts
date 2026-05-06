import { describe, it, expect, beforeEach } from 'vitest';
import { BundleTrie } from '../src/structures/BundleTrie';

describe('BundleTrie', () => {
  let trie: BundleTrie;

  beforeEach(() => {
    trie = new BundleTrie();
  });

  describe('addRoute + getRouteSize', () => {
    it('registers a route and retrieves its size', () => {
      trie.addRoute('/dashboard', 300_000);
      expect(trie.getRouteSize('/dashboard')).toBe(300_000);
    });

    it('returns 0 for unregistered routes', () => {
      expect(trie.getRouteSize('/nonexistent')).toBe(0);
    });

    it('supports deeply nested routes', () => {
      trie.addRoute('/dashboard/settings/profile', 120_000);
      expect(trie.getRouteSize('/dashboard/settings/profile')).toBe(120_000);
    });

    it('can update a route size', () => {
      trie.addRoute('/home', 100_000);
      trie.addRoute('/home', 250_000); // overwrite
      expect(trie.getRouteSize('/home')).toBe(250_000);
    });

    it('stores chunkName and dependencies metadata', () => {
      trie.addRoute('/editor', 800_000, {
        chunkName: 'editor-chunk',
        dependencies: ['monaco-editor'],
      });
      // Size is accessible
      expect(trie.getRouteSize('/editor')).toBe(800_000);
    });
  });

  describe('getTotalSize — prefix aggregation', () => {
    beforeEach(() => {
      trie.addRoute('/dashboard', 200_000);
      trie.addRoute('/dashboard/settings', 150_000);
      trie.addRoute('/dashboard/settings/profile', 80_000);
      trie.addRoute('/home', 100_000);
    });

    it('total size of /dashboard includes all children', () => {
      // 200k + 150k + 80k = 430k
      expect(trie.getTotalSize('/dashboard')).toBe(430_000);
    });

    it('total size of /dashboard/settings includes its subtree', () => {
      // 150k + 80k = 230k
      expect(trie.getTotalSize('/dashboard/settings')).toBe(230_000);
    });

    it('leaf route total equals its own size', () => {
      expect(trie.getTotalSize('/dashboard/settings/profile')).toBe(80_000);
    });

    it('getTotalBundleSize sums all routes', () => {
      // 200+150+80+100 = 530k
      expect(trie.getTotalBundleSize()).toBe(530_000);
    });

    it('returns 0 for non-existent prefix', () => {
      expect(trie.getTotalSize('/nonexistent')).toBe(0);
    });
  });

  describe('getAllRoutes', () => {
    beforeEach(() => {
      trie.addRoute('/home', 100_000);
      trie.addRoute('/dashboard', 300_000);
      trie.addRoute('/about', 50_000);
    });

    it('returns all registered routes', () => {
      const routes = trie.getAllRoutes();
      expect(routes).toHaveLength(3);
    });

    it('sorts by own size descending', () => {
      const routes = trie.getAllRoutes();
      expect(routes[0].path).toBe('/dashboard');
      expect(routes[1].path).toBe('/home');
      expect(routes[2].path).toBe('/about');
    });

    it('each route has correct ownSizeBytes', () => {
      const home = trie.getAllRoutes().find(r => r.path === '/home');
      expect(home?.ownSizeBytes).toBe(100_000);
    });
  });

  describe('getLargest', () => {
    it('returns top N routes by own size', () => {
      trie.addRoute('/a', 100_000);
      trie.addRoute('/b', 500_000);
      trie.addRoute('/c', 200_000);
      trie.addRoute('/d', 350_000);

      const top2 = trie.getLargest(2);
      expect(top2).toHaveLength(2);
      expect(top2[0].path).toBe('/b');
      expect(top2[1].path).toBe('/d');
    });
  });

  describe('getChildren', () => {
    beforeEach(() => {
      trie.addRoute('/dashboard', 200_000);
      trie.addRoute('/dashboard/analytics', 150_000);
      trie.addRoute('/dashboard/settings', 100_000);
      trie.addRoute('/dashboard/settings/profile', 80_000);
    });

    it('returns direct children with their subtree sizes', () => {
      const children = trie.getChildren('/dashboard');
      expect(children).toHaveLength(2);

      const settings = children.find(c => c.path === '/dashboard/settings');
      expect(settings?.ownSizeBytes).toBe(100_000);
      expect(settings?.totalSizeBytes).toBe(180_000); // 100k + 80k child
    });

    it('sorts children by total size descending', () => {
      const children = trie.getChildren('/dashboard');
      expect(children[0].totalSizeBytes).toBeGreaterThanOrEqual(
        children[1].totalSizeBytes
      );
    });

    it('returns empty for leaf routes', () => {
      expect(trie.getChildren('/dashboard/analytics')).toHaveLength(0);
    });
  });

  describe('routeCount', () => {
    it('counts only routes with addRoute called', () => {
      trie.addRoute('/a', 1);
      trie.addRoute('/a/b', 2);
      trie.addRoute('/c', 3);
      expect(trie.routeCount).toBe(3);
    });
  });

  describe('clear', () => {
    it('removes all routes', () => {
      trie.addRoute('/home', 100_000);
      trie.clear();
      expect(trie.routeCount).toBe(0);
      expect(trie.getTotalBundleSize()).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('handles root path /', () => {
      trie.addRoute('/home', 100_000);
      expect(trie.getTotalSize('/')).toBe(100_000);
    });

    it('handles multiple sibling routes without cross-contamination', () => {
      trie.addRoute('/blog', 200_000);
      trie.addRoute('/shop', 300_000);
      expect(trie.getTotalSize('/blog')).toBe(200_000);
      expect(trie.getTotalSize('/shop')).toBe(300_000);
    });
  });
});
