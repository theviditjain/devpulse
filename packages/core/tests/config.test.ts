import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG,
  getAPIBudgetStatus,
  getBundleBudgetStatus,
  getRenderBudgetStatus,
} from '../src/config';

describe('Performance Budget System', () => {
  describe('DEFAULT_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_CONFIG.apiWarningMs).toBe(800);
      expect(DEFAULT_CONFIG.apiCriticalMs).toBe(2000);
      expect(DEFAULT_CONFIG.bundleWarningKb).toBe(300);
      expect(DEFAULT_CONFIG.bundleCriticalKb).toBe(800);
      expect(DEFAULT_CONFIG.renderWarningCount).toBe(20);
      expect(DEFAULT_CONFIG.renderCriticalCount).toBe(50);
    });
  });

  describe('getAPIBudgetStatus', () => {
    it('returns good for fast calls', () => {
      expect(getAPIBudgetStatus(300, DEFAULT_CONFIG)).toBe('good');
      expect(getAPIBudgetStatus(799, DEFAULT_CONFIG)).toBe('good');
    });

    it('returns warning for calls between thresholds', () => {
      expect(getAPIBudgetStatus(800, DEFAULT_CONFIG)).toBe('warning');
      expect(getAPIBudgetStatus(1500, DEFAULT_CONFIG)).toBe('warning');
      expect(getAPIBudgetStatus(1999, DEFAULT_CONFIG)).toBe('warning');
    });

    it('returns critical for calls above critical threshold', () => {
      expect(getAPIBudgetStatus(2000, DEFAULT_CONFIG)).toBe('critical');
      expect(getAPIBudgetStatus(5000, DEFAULT_CONFIG)).toBe('critical');
    });

    it('respects custom config thresholds', () => {
      const custom = { ...DEFAULT_CONFIG, apiWarningMs: 200, apiCriticalMs: 500 };
      expect(getAPIBudgetStatus(199, custom)).toBe('good');
      expect(getAPIBudgetStatus(300, custom)).toBe('warning');
      expect(getAPIBudgetStatus(500, custom)).toBe('critical');
    });
  });

  describe('getBundleBudgetStatus', () => {
    const toBytes = (kb: number) => kb * 1024;

    it('returns good for small bundles', () => {
      expect(getBundleBudgetStatus(toBytes(100), DEFAULT_CONFIG)).toBe('good');
      expect(getBundleBudgetStatus(toBytes(299), DEFAULT_CONFIG)).toBe('good');
    });

    it('returns warning for medium bundles', () => {
      expect(getBundleBudgetStatus(toBytes(300), DEFAULT_CONFIG)).toBe('warning');
      expect(getBundleBudgetStatus(toBytes(500), DEFAULT_CONFIG)).toBe('warning');
    });

    it('returns critical for large bundles', () => {
      expect(getBundleBudgetStatus(toBytes(800), DEFAULT_CONFIG)).toBe('critical');
      expect(getBundleBudgetStatus(toBytes(2000), DEFAULT_CONFIG)).toBe('critical');
    });
  });

  describe('getRenderBudgetStatus', () => {
    it('returns good for low render counts', () => {
      expect(getRenderBudgetStatus(1, DEFAULT_CONFIG)).toBe('good');
      expect(getRenderBudgetStatus(19, DEFAULT_CONFIG)).toBe('good');
    });

    it('returns warning for moderate render counts', () => {
      expect(getRenderBudgetStatus(20, DEFAULT_CONFIG)).toBe('warning');
      expect(getRenderBudgetStatus(49, DEFAULT_CONFIG)).toBe('warning');
    });

    it('returns critical for high render counts', () => {
      expect(getRenderBudgetStatus(50, DEFAULT_CONFIG)).toBe('critical');
      expect(getRenderBudgetStatus(200, DEFAULT_CONFIG)).toBe('critical');
    });
  });
});
