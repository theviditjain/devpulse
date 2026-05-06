/**
 * RenderCollector — integrates with React's Profiler API to track component renders.
 *
 * How it works:
 *   React's <Profiler> component calls onRender with timing data every time
 *   a component tree renders. We hook into this callback and feed data into
 *   our ComponentTree data structure.
 *
 * Two integration modes:
 *   1. Manual: user wraps components with <DevPulseProfiler id="MyComponent">
 *   2. Automatic: withDevPulse() wraps the entire app tree (Week 2 plugin)
 *
 * The onRenderCallback signature is defined by React:
 *   id          — the Profiler's id prop (component display name)
 *   phase       — 'mount' | 'update'
 *   actualDuration — time spent rendering this component + children
 *   baseDuration   — estimated render time without memoization
 *   startTime   — when React started rendering
 *   commitTime  — when React committed this update
 *
 * Interview angle: React's Profiler API is the same one used by React DevTools.
 * We're building our own consumer of that API, storing results in our tree
 * instead of React DevTools' internal fiber map.
 */

import { ComponentTree } from '../structures/ComponentTree';
import { CircularBuffer } from '../structures/CircularBuffer';
import type { RenderEvent } from '../structures/ComponentTree';
import type { TimelineEvent } from '../structures/CircularBuffer';
import {
  getRenderBudgetStatus,
  type DevPulseConfig,
} from '../config';

// React's ProfilerOnRenderCallback signature
export type ProfilerOnRenderCallback = (
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  baseDuration: number,
  startTime: number,
  commitTime: number
) => void;

export interface RenderRecord {
  componentId: string;
  displayName: string;
  phase: 'mount' | 'update';
  actualDurationMs: number;
  baseDurationMs: number;
  timestamp: number;
  budgetStatus: 'good' | 'warning' | 'critical';
}

export class RenderCollector {
  private tree: ComponentTree;
  private timeline: CircularBuffer<TimelineEvent>;
  private config: DevPulseConfig;

  // Track parent-child relationships via a stack
  // (React calls onRender for each Profiler boundary depth-first)
  private renderCount = 0;
  private active = false;

  constructor(
    tree: ComponentTree,
    timeline: CircularBuffer<TimelineEvent>,
    config: DevPulseConfig
  ) {
    this.tree = tree;
    this.timeline = timeline;
    this.config = config;
  }

  start(): void {
    this.active = true;
  }

  stop(): void {
    this.active = false;
  }

  /**
   * This is the function you pass to React's <Profiler onRender={...}>.
   * Bind it: profiler.onRender = collector.createOnRenderCallback('App')
   *
   * Usage in your app:
   *   import { Profiler } from 'react'
   *   <Profiler id="Dashboard" onRender={devpulse.renderCollector.onRender}>
   *     <Dashboard />
   *   </Profiler>
   */
  createOnRenderCallback(parentId: string | null = null): ProfilerOnRenderCallback {
    return (id, phase, actualDuration, baseDuration, _startTime, commitTime) => {
      if (!this.active) return;
      if (this.config.ignoredComponents.includes(id)) return;

      // Normalize phase — React 18 uses 'nested-update'
      const normalizedPhase: 'mount' | 'update' =
        phase === 'mount' ? 'mount' : 'update';

      const event: RenderEvent = {
        componentId: id,
        displayName: id,
        parentId,
        durationMs: actualDuration,
        timestamp: commitTime,
        phase: normalizedPhase,
      };

      this.tree.addRender(event);
      this.renderCount++;

      const budgetStatus = getRenderBudgetStatus(
        this.tree.getNode(id)?.renderCount ?? 1,
        this.config
      );

      // Push to timeline for the Timeline view
      this.timeline.add({
        id: `render-${id}-${commitTime}`,
        type: 'render',
        name: id,
        durationMs: actualDuration,
        timestamp: commitTime,
        isError: false,
        metadata: {
          componentId: id,
          phase: normalizedPhase,
          actualDurationMs: actualDuration,
          baseDurationMs: baseDuration,
          renderCount: this.tree.getNode(id)?.renderCount,
          budgetStatus,
        },
      });
    };
  }

  /**
   * Convenience: get a flat list of all components with their render stats,
   * enriched with budget status. Used by the dashboard API route.
   */
  getComponentStats() {
    return this.tree.getAllSorted().map(node => ({
      ...node,
      avgRenderTimeMs:
        node.renderCount > 0
          ? Math.round(node.totalRenderTimeMs / node.renderCount)
          : 0,
      budgetStatus: getRenderBudgetStatus(node.renderCount, this.config),
    }));
  }

  getHotspots() {
    return this.tree
      .findHotspots(this.config.renderWarningCount)
      .map(result => ({
        ...result,
        budgetStatus: getRenderBudgetStatus(
          result.node.renderCount,
          this.config
        ),
      }));
  }

  getTree() {
    return this.tree.toJSON();
  }

  get totalRenders(): number {
    return this.renderCount;
  }
}
