/**
 * DevPulse configuration — loaded from devpulse.config.js in the user's project root.
 *
 * Performance Budget System:
 * Every tracked item (API call, render, bundle) is checked against these thresholds.
 * Violations are flagged as 'warning' or 'critical' and surfaced in the dashboard.
 *
 * Interview angle: this is the same concept used in Lighthouse CI, Webpack performance
 * hints, and bundlesize — user-defined budgets that fail the build/alert when crossed.
 */

export interface DevPulseConfig {
  // API thresholds (milliseconds)
  apiWarningMs: number;       // default 800ms  → yellow
  apiCriticalMs: number;      // default 2000ms → red

  // Bundle thresholds (kilobytes)
  bundleWarningKb: number;    // default 300KB  → yellow
  bundleCriticalKb: number;   // default 800KB  → red

  // Render thresholds
  renderWarningMs: number;    // default 16ms   → yellow (1 frame at 60fps)
  renderWarningCount: number; // default 20     → yellow (re-render count)
  renderCriticalCount: number;// default 50     → red

  // WebSocket server port (dashboard listens here)
  wsPort: number;             // default 3001

  // URLs to ignore in API tracking (regex strings)
  ignoredUrls: string[];

  // Component names to ignore in render tracking
  ignoredComponents: string[];

  // How often to broadcast a snapshot (ms)
  snapshotIntervalMs: number; // default 1000
}

export const DEFAULT_CONFIG: DevPulseConfig = {
  apiWarningMs: 800,
  apiCriticalMs: 2000,
  bundleWarningKb: 300,
  bundleCriticalKb: 800,
  renderWarningMs: 16,
  renderWarningCount: 20,
  renderCriticalCount: 50,
  wsPort: 3001,
  ignoredUrls: ['/_next/', '/__nextjs', '/favicon'],
  ignoredComponents: ['ReactDevOverlay', 'HotReload'],
  snapshotIntervalMs: 1000,
};

export type BudgetStatus = 'good' | 'warning' | 'critical';

/**
 * Check an API call duration against the budget thresholds.
 */
export function getAPIBudgetStatus(durationMs: number, config: DevPulseConfig): BudgetStatus {
  if (durationMs >= config.apiCriticalMs) return 'critical';
  if (durationMs >= config.apiWarningMs) return 'warning';
  return 'good';
}

/**
 * Check a bundle size against the budget thresholds.
 */
export function getBundleBudgetStatus(sizeBytes: number, config: DevPulseConfig): BudgetStatus {
  const sizeKb = sizeBytes / 1024;
  if (sizeKb >= config.bundleCriticalKb) return 'critical';
  if (sizeKb >= config.bundleWarningKb) return 'warning';
  return 'good';
}

/**
 * Check a component's render count against the budget thresholds.
 */
export function getRenderBudgetStatus(renderCount: number, config: DevPulseConfig): BudgetStatus {
  if (renderCount >= config.renderCriticalCount) return 'critical';
  if (renderCount >= config.renderWarningCount) return 'warning';
  return 'good';
}
