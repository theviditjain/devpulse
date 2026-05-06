/**
 * client-init.ts — injected into the browser bundle by withDevPulse().
 *
 * This runs BEFORE the user's React app initializes.
 * It sets up the global DevPulse instance that the collectors use.
 *
 * Browser-only — never runs on the server.
 * Guarded by typeof window check everywhere.
 */

import { DevPulseEngine } from './engine';

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Initialize engine with any config passed via __NEXT_DATA__ or defaults
  const engine = DevPulseEngine.getInstance();

  // Start API interception immediately — before any fetches happen
  engine.apiCollector.start();
  engine.renderCollector.start();

  // Expose on window so React components can access the render collector
  // Usage: window.__DEVPULSE__.renderCollector.createOnRenderCallback('MyComponent')
  (window as any).__DEVPULSE__ = engine;

  console.log(
    '%c[DevPulse] Active 🔍',
    'color: #00FF88; font-weight: bold; font-size: 12px',
    '— monitoring API calls and renders'
  );
}
