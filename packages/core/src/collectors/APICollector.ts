/**
 * APICollector — intercepts window.fetch and XMLHttpRequest globally.
 *
 * How it works:
 *   1. On init, saves the original fetch/XHR references
 *   2. Replaces them with wrapped versions that measure duration
 *   3. Every completed request is logged to the MinHeap (slowest tracking)
 *      AND the CircularBuffer (timeline)
 *   4. Each call is checked against the Performance Budget config
 *
 * Why monkey-patch fetch?
 *   - Works with any HTTP library (axios uses XHR/fetch under the hood)
 *   - Zero changes needed in user's application code
 *   - Same technique used by Datadog RUM, Sentry, New Relic browser agents
 *
 * Interview angle: explain the interceptor pattern, why we save the original
 * reference before patching, and how we restore it on teardown.
 */

import { MinHeap } from '../structures/MinHeap';
import { CircularBuffer } from '../structures/CircularBuffer';
import type { TimelineEvent } from '../structures/CircularBuffer';
import {
  getAPIBudgetStatus,
  type DevPulseConfig,
  type BudgetStatus,
} from '../config';

export interface APICall {
  id: string;
  url: string;
  method: string;
  status: number | null;    // null if request failed with network error
  duration: number;         // milliseconds
  timestamp: number;        // Date.now() at request start
  budgetStatus: BudgetStatus;
  isError: boolean;
}

export class APICollector {
  private heap: MinHeap<APICall>;
  private timeline: CircularBuffer<TimelineEvent>;
  private config: DevPulseConfig;
  private callCount = 0;

  // Store originals so we can restore on teardown
  private originalFetch: typeof window.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private active = false;

  constructor(
    heap: MinHeap<APICall>,
    timeline: CircularBuffer<TimelineEvent>,
    config: DevPulseConfig
  ) {
    this.heap = heap;
    this.timeline = timeline;
    this.config = config;
  }

  /**
   * Start intercepting. Safe to call multiple times — won't double-patch.
   */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.patchFetch();
    this.patchXHR();
  }

  /**
   * Restore original fetch/XHR and stop collecting.
   */
  stop(): void {
    if (!this.active) return;
    this.active = false;

    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.originalXHROpen && this.originalXHRSend) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHROpen = null;
      this.originalXHRSend = null;
    }
  }

  getSlowestCalls(n = 10): APICall[] {
    return this.heap.getSlowest(n);
  }

  getAllCalls(): APICall[] {
    return this.timeline
      .filterByType('api')
      .map(e => e.metadata as unknown as APICall);
  }

  getStats(): {
    totalCalls: number;
    criticalCount: number;
    warningCount: number;
    avgDurationMs: number;
  } {
    const calls = this.heap.toArray();
    const critical = calls.filter(c => c.budgetStatus === 'critical').length;
    const warning = calls.filter(c => c.budgetStatus === 'warning').length;
    const avg =
      calls.length > 0
        ? calls.reduce((sum, c) => sum + c.duration, 0) / calls.length
        : 0;

    return {
      totalCalls: this.callCount,
      criticalCount: critical,
      warningCount: warning,
      avgDurationMs: Math.round(avg),
    };
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private shouldIgnore(url: string): boolean {
    return this.config.ignoredUrls.some(pattern => url.includes(pattern));
  }

  private logCall(call: APICall): void {
    this.callCount++;
    this.heap.insert(call);

    // Also push to the shared timeline for the Timeline view
    this.timeline.add({
      id: call.id,
      type: 'api',
      name: `${call.method} ${call.url}`,
      durationMs: call.duration,
      timestamp: call.timestamp,
      isError: call.isError,
      metadata: call as unknown as Record<string, unknown>,
    });
  }

  private generateId(): string {
    return `api-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  private patchFetch(): void {
    if (typeof window === 'undefined' || !window.fetch) return;

    this.originalFetch = window.fetch.bind(window);
    const self = this;

    window.fetch = async function patchedFetch(
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
          ? input.toString()
          : (input as Request).url;

      if (self.shouldIgnore(url)) {
        return self.originalFetch!(input, init);
      }

      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      const startTime = performance.now();
      const timestamp = Date.now();
      let status: number | null = null;
      let isError = false;

      try {
        const response = await self.originalFetch!(input, init);
        status = response.status;
        isError = !response.ok;
        return response;
      } catch (err) {
        isError = true;
        throw err;
      } finally {
        const duration = Math.round(performance.now() - startTime);
        const call: APICall = {
          id: self.generateId(),
          url,
          method: method.toUpperCase(),
          status,
          duration,
          timestamp,
          budgetStatus: getAPIBudgetStatus(duration, self.config),
          isError,
        };
        self.logCall(call);
      }
    };
  }

  private patchXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') return;

    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ) {
      (this as any)._devpulse = { method, url: url.toString() };
      return self.originalXHROpen!.apply(this, [method, url, ...(rest as [])] as Parameters<typeof XMLHttpRequest.prototype.open>);
    };

    XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const meta = (this as any)._devpulse;
      if (!meta || self.shouldIgnore(meta.url)) {
        return self.originalXHRSend!.call(this, body);
      }

      const startTime = performance.now();
      const timestamp = Date.now();

      this.addEventListener('loadend', () => {
        const duration = Math.round(performance.now() - startTime);
        const call: APICall = {
          id: self.generateId(),
          url: meta.url,
          method: meta.method.toUpperCase(),
          status: this.status || null,
          duration,
          timestamp,
          budgetStatus: getAPIBudgetStatus(duration, self.config),
          isError: this.status >= 400 || this.status === 0,
        };
        self.logCall(call);
      });

      return self.originalXHRSend!.call(this, body);
    };
  }
}
