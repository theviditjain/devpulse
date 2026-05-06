/**
 * DevPulseServer — WebSocket server that broadcasts live snapshots.
 *
 * Architecture:
 *   - Runs as a Node.js process alongside the Next.js dev server
 *   - Every `snapshotIntervalMs` (default 1s), calls engine.buildSnapshot()
 *   - Broadcasts the JSON snapshot to ALL connected dashboard clients
 *   - Clients (the Next.js dashboard) connect via ws://localhost:3001
 *
 * Why WebSocket over polling?
 *   - Server PUSHES updates — no client request needed
 *   - Lower latency, lower overhead for frequent updates
 *   - Dashboard feels live, not laggy
 *   - Same pattern used by Vite HMR, Next.js Fast Refresh
 *
 * Message protocol (simple JSON):
 *   { type: 'snapshot', data: PerformanceSnapshot }
 *   { type: 'ping' }  ← keepalive
 *   { type: 'clear' } ← user clicked "Clear Data" in dashboard
 *
 * Interview angle: WebSocket vs HTTP polling tradeoffs,
 * why we diff snapshots (send only changed fields) to reduce bandwidth.
 */

import { DevPulseEngine } from './engine';
import type { PerformanceSnapshot } from './engine';

// We import ws types only — the actual `ws` package is a peer dep
// installed in the user's Next.js app, not bundled with core.
type WebSocketServer = any;
type WebSocket = any;

export type WSMessageType = 'snapshot' | 'ping' | 'pong' | 'clear' | 'error';

export interface WSMessage {
  type: WSMessageType;
  data?: unknown;
  timestamp: number;
}

export interface ServerOptions {
  port?: number;
  engine: DevPulseEngine;
}

export class DevPulseServer {
  private wss: WebSocketServer | null = null;
  private engine: DevPulseEngine;
  private port: number;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastSnapshot: PerformanceSnapshot | null = null;
  private clientCount = 0;
  private isRunning = false;

  constructor(options: ServerOptions) {
    this.engine = options.engine;
    this.port = options.port ?? options.engine.config.wsPort;
  }

  /**
   * Start the WebSocket server and begin broadcasting snapshots.
   * Returns a promise that resolves when the server is listening.
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    // Dynamically import `ws` so core doesn't bundle it
    // `ws` is available in the user's Next.js app environment
    const { WebSocketServer } = await import('ws' as any);

    this.wss = new WebSocketServer({ port: this.port });
    this.isRunning = true;

    this.wss.on('connection', (ws: WebSocket) => {
      this.clientCount++;
      console.log(`[DevPulse] Dashboard connected (${this.clientCount} client(s))`);

      // Send the current snapshot immediately on connect
      if (this.lastSnapshot) {
        this.sendTo(ws, { type: 'snapshot', data: this.lastSnapshot, timestamp: Date.now() });
      }

      ws.on('message', (raw: Buffer) => {
        try {
          const msg: WSMessage = JSON.parse(raw.toString());
          this.handleClientMessage(msg, ws);
        } catch {
          // Ignore malformed messages
        }
      });

      ws.on('close', () => {
        this.clientCount--;
        console.log(`[DevPulse] Dashboard disconnected (${this.clientCount} client(s))`);
      });

      ws.on('error', (err: Error) => {
        console.warn('[DevPulse] WebSocket error:', err.message);
      });
    });

    this.wss.on('error', (err: Error) => {
      console.error('[DevPulse] Server error:', err.message);
    });

    // Start broadcasting snapshots on the configured interval
    this.startBroadcastLoop();

    console.log(`[DevPulse] Server running on ws://localhost:${this.port}`);
    console.log(`[DevPulse] Open the dashboard at http://localhost:3001`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    await new Promise<void>((resolve) => {
      if (this.wss) {
        this.wss.close(() => resolve());
      } else {
        resolve();
      }
    });

    this.isRunning = false;
    console.log('[DevPulse] Server stopped.');
  }

  get connectedClients(): number {
    return this.clientCount;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private startBroadcastLoop(): void {
    this.intervalId = setInterval(() => {
      if (this.clientCount === 0) return; // no clients → skip work

      const snapshot = this.engine.buildSnapshot();
      this.lastSnapshot = snapshot;
      this.broadcast({ type: 'snapshot', data: snapshot, timestamp: Date.now() });
    }, this.engine.config.snapshotIntervalMs);
  }

  private broadcast(message: WSMessage): void {
    if (!this.wss) return;
    const payload = JSON.stringify(message);

    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload, (err: Error | undefined) => {
          if (err) console.warn('[DevPulse] Send error:', err.message);
        });
      }
    });
  }

  private sendTo(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(message));
    }
  }

  private handleClientMessage(msg: WSMessage, ws: WebSocket): void {
    switch (msg.type) {
      case 'ping':
        this.sendTo(ws, { type: 'pong', timestamp: Date.now() });
        break;

      case 'clear':
        // Dashboard user clicked "Clear Data" — reset all structures
        this.engine.apiHeap.clear();
        this.engine.componentTree.clear();
        this.engine.timeline.clear();
        this.engine.bundleTrie.clear();
        console.log('[DevPulse] Data cleared by dashboard user.');

        // Broadcast a fresh empty snapshot
        const freshSnapshot = this.engine.buildSnapshot();
        this.lastSnapshot = freshSnapshot;
        this.broadcast({ type: 'snapshot', data: freshSnapshot, timestamp: Date.now() });
        break;

      default:
        break;
    }
  }
}
