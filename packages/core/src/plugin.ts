/**
 * withDevPulse — Next.js config wrapper. The user's entire integration is:
 *
 *   // next.config.js
 *   const { withDevPulse } = require('@devpulse/core')
 *   module.exports = withDevPulse({ ... your existing config ... })
 *
 * What it does:
 *   1. Only activates in development (NODE_ENV === 'development')
 *   2. Injects the client-side collector script via Webpack entry points
 *   3. Adds the WebpackBundlePlugin to track bundle sizes
 *   4. Starts the DevPulseServer (WebSocket) on first compilation
 *   5. Registers a global `__DEVPULSE__` on window for the collectors
 *
 * Zero production footprint — all injection is guarded by NODE_ENV checks.
 *
 * Interview angle: Next.js config wrapping is a standard extension pattern
 * (used by next-pwa, next-auth, @next/bundle-analyzer). Webpack entry injection
 * lets us run code before the user's app without modifying their source.
 */

import { DevPulseEngine } from './engine';
import { DevPulseServer } from './server';
import { WebpackBundlePlugin } from './collectors/BundleCollector';
import { DEFAULT_CONFIG, type DevPulseConfig } from './config';

let engineInstance: DevPulseEngine | null = null;
let serverInstance: DevPulseServer | null = null;
let serverStarted = false;

export function withDevPulse(
  nextConfig: Record<string, unknown> = {},
  devPulseConfig: Partial<DevPulseConfig> = {}
): Record<string, unknown> {
  // Never activate in production
  if (process.env.NODE_ENV !== 'development') {
    return nextConfig;
  }

  const config = { ...DEFAULT_CONFIG, ...devPulseConfig };

  // Initialize the engine singleton
  if (!engineInstance) {
    engineInstance = DevPulseEngine.getInstance(config);
    engineInstance.start();
  }

  return {
    ...nextConfig,

    webpack(webpackConfig: any, options: { dev: boolean; isServer: boolean; webpack: any }) {
      const { dev, isServer } = options;

      // Only inject on client-side dev builds
      if (dev && !isServer) {
        // 1. Add the bundle tracker plugin
        webpackConfig.plugins.push(
          new WebpackBundlePlugin({
            onBundle: (route, sizeBytes, chunkName, dependencies) => {
              engineInstance!.bundleCollector.registerBundle(
                route,
                sizeBytes,
                chunkName,
                dependencies
              );
            },
          })
        );

        // 2. Inject the client collector entry point
        // This runs before the user's app and sets up fetch/XHR interception
        const originalEntry = webpackConfig.entry;
        webpackConfig.entry = async () => {
          const entries = await (typeof originalEntry === 'function'
            ? originalEntry()
            : Promise.resolve(originalEntry));

          // Inject our client script into the main entry
          const clientScript = require.resolve('./client-init');
          if (entries['main.js']) {
            if (!entries['main.js'].import.includes(clientScript)) {
              entries['main.js'].import.unshift(clientScript);
            }
          }

          return entries;
        };

        // 3. Start the WebSocket server on first compilation
        if (!serverStarted) {
          serverStarted = true;
          if (!serverInstance) {
            serverInstance = new DevPulseServer({ engine: engineInstance! });
          }
          serverInstance.start().catch((err: Error) => {
            console.warn('[DevPulse] Could not start WS server:', err.message);
            console.warn('[DevPulse] Is port', config.wsPort, 'already in use?');
          });
        }
      }

      // Call the user's existing webpack config if they have one
      if (typeof nextConfig.webpack === 'function') {
        return (nextConfig.webpack as Function)(webpackConfig, options);
      }

      return webpackConfig;
    },
  };
}

/**
 * Load user's devpulse.config.js if it exists.
 * Falls back to defaults if the file isn't found.
 *
 * Usage: const config = await loadDevPulseConfig()
 */
export async function loadDevPulseConfig(
  cwd = process.cwd()
): Promise<Partial<DevPulseConfig>> {
  const path = await import('path');
  const fs = await import('fs');

  const configPath = path.join(cwd, 'devpulse.config.js');

  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    // Clear require cache so hot-reloading the config works
    delete require.cache[require.resolve(configPath)];
    const userConfig = require(configPath);
    return userConfig.default ?? userConfig;
  } catch (err) {
    console.warn('[DevPulse] Failed to load devpulse.config.js:', err);
    return {};
  }
}
