import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DevPulseEngine } from '../src/engine';
import { DEFAULT_CONFIG } from '../src/config';

describe('DevPulseEngine', () => {
  let engine: DevPulseEngine;

  beforeEach(() => {
    DevPulseEngine.resetInstance();
    engine = DevPulseEngine.getInstance();
  });

  afterEach(() => {
    engine.stop();
    DevPulseEngine.resetInstance();
  });

  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = DevPulseEngine.getInstance();
      const b = DevPulseEngine.getInstance();
      expect(a).toBe(b);
    });

    it('creates a fresh instance after reset', () => {
      const a = DevPulseEngine.getInstance();
      DevPulseEngine.resetInstance();
      const b = DevPulseEngine.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('buildSnapshot — empty state', () => {
    it('returns a valid snapshot structure', () => {
      const snap = engine.buildSnapshot();
      expect(snap).toHaveProperty('timestamp');
      expect(snap).toHaveProperty('score');
      expect(snap).toHaveProperty('api');
      expect(snap).toHaveProperty('renders');
      expect(snap).toHaveProperty('bundles');
      expect(snap).toHaveProperty('timeline');
      expect(snap).toHaveProperty('recommendations');
      expect(snap).toHaveProperty('budgetViolations');
    });

    it('scores 100 when no data collected', () => {
      const snap = engine.buildSnapshot();
      expect(snap.score).toBe(100);
    });

    it('has zero counts when empty', () => {
      const snap = engine.buildSnapshot();
      expect(snap.api.totalCalls).toBe(0);
      expect(snap.renders.totalComponents).toBe(0);
      expect(snap.bundles.totalRoutes).toBe(0);
    });
  });

  describe('buildSnapshot — with API data', () => {
    beforeEach(() => {
      // Simulate some API calls directly via the heap
      engine.apiHeap.insert({
        id: '1', url: '/api/users', method: 'GET',
        status: 200, duration: 3000, timestamp: Date.now(),
        budgetStatus: 'critical', isError: false,
      });
      engine.apiHeap.insert({
        id: '2', url: '/api/posts', method: 'GET',
        status: 200, duration: 900, timestamp: Date.now(),
        budgetStatus: 'warning', isError: false,
      });
      engine.apiHeap.insert({
        id: '3', url: '/api/health', method: 'GET',
        status: 200, duration: 50, timestamp: Date.now(),
        budgetStatus: 'good', isError: false,
      });
    });

    it('includes slowest calls in snapshot', () => {
      const snap = engine.buildSnapshot();
      expect(snap.api.slowest.length).toBeGreaterThan(0);
    });

    it('generates critical recommendation for slow API', () => {
      const snap = engine.buildSnapshot();
      const criticalRecs = snap.recommendations.filter(
        r => r.severity === 'critical' && r.category === 'api'
      );
      expect(criticalRecs.length).toBeGreaterThan(0);
      expect(criticalRecs[0].message).toContain('/api/users');
    });

    it('includes budget violations', () => {
      const snap = engine.buildSnapshot();
      const apiViolations = snap.budgetViolations.filter(v => v.category === 'api');
      expect(apiViolations.length).toBeGreaterThan(0);
    });

    it('score drops below 100 with violations', () => {
      const snap = engine.buildSnapshot();
      expect(snap.score).toBeLessThan(100);
    });
  });

  describe('buildSnapshot — with render data', () => {
    beforeEach(() => {
      // Simulate a hotspot component
      const event = (count: number) => {
        for (let i = 0; i < count; i++) {
          engine.componentTree.addRender({
            componentId: 'UserCard',
            displayName: 'UserCard',
            parentId: 'App',
            durationMs: 8,
            timestamp: Date.now(),
            phase: 'update',
          });
        }
      };
      // Add App first
      engine.componentTree.addRender({
        componentId: 'App', displayName: 'App', parentId: null,
        durationMs: 2, timestamp: Date.now(), phase: 'mount',
      });
      event(60); // 60 renders → critical (threshold 50)
    });

    it('includes render hotspots', () => {
      const snap = engine.buildSnapshot();
      expect(snap.renders.hotspots.length).toBeGreaterThan(0);
      expect(snap.renders.hotspots[0].displayName).toBe('UserCard');
    });

    it('generates render recommendation', () => {
      const snap = engine.buildSnapshot();
      const renderRecs = snap.recommendations.filter(r => r.category === 'render');
      expect(renderRecs.length).toBeGreaterThan(0);
      expect(renderRecs[0].detail).toContain('React.memo');
    });
  });

  describe('buildSnapshot — with bundle data', () => {
    beforeEach(() => {
      engine.bundleCollector.registerBundle('/editor', 900 * 1024, 'editor-chunk', ['monaco']);
      engine.bundleCollector.registerBundle('/home', 100 * 1024, 'home-chunk', []);
    });

    it('includes bundle stats', () => {
      const snap = engine.buildSnapshot();
      expect(snap.bundles.totalRoutes).toBe(2);
      expect(snap.bundles.criticalCount).toBe(1);
    });

    it('generates bundle recommendation with dynamic import hint', () => {
      const snap = engine.buildSnapshot();
      const bundleRecs = snap.recommendations.filter(r => r.category === 'bundle');
      expect(bundleRecs.length).toBeGreaterThan(0);
      expect(bundleRecs[0].detail).toContain('dynamic');
    });
  });

  describe('score calculation', () => {
    it('score is between 0 and 100', () => {
      // Add lots of violations
      for (let i = 0; i < 20; i++) {
        engine.apiHeap.insert({
          id: String(i), url: `/api/${i}`, method: 'GET',
          status: 200, duration: 5000, timestamp: Date.now(),
          budgetStatus: 'critical', isError: false,
        });
      }
      const snap = engine.buildSnapshot();
      expect(snap.score).toBeGreaterThanOrEqual(0);
      expect(snap.score).toBeLessThanOrEqual(100);
    });
  });
});
