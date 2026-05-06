'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface APICall {
  id: string;
  url: string;
  method: string;
  status: number | null;
  duration: number;
  timestamp: number;
  budgetStatus: 'good' | 'warning' | 'critical';
  isError: boolean;
}

export interface ComponentHotspot {
  displayName: string;
  renderCount: number;
  avgRenderTimeMs: number;
  path: string[];
  budgetStatus: string;
}

export interface BundleEntry {
  route: string;
  sizeKb: number;
  budgetStatus: string;
}

export interface TimelineEvent {
  id: string;
  type: 'api' | 'render' | 'error' | 'navigation' | 'custom';
  name: string;
  durationMs?: number;
  timestamp: number;
  isError?: boolean;
}

export interface Recommendation {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'api' | 'render' | 'bundle';
  message: string;
  detail: string;
}

export interface BudgetViolation {
  category: 'api' | 'render' | 'bundle';
  name: string;
  actual: string;
  budget: string;
  status: 'warning' | 'critical';
}

export interface PerformanceSnapshot {
  timestamp: number;
  score: number;
  scoreBreakdown: {
    apiScore: number;
    renderScore: number;
    bundleScore: number;
  };
  api: {
    totalCalls: number;
    avgDurationMs: number;
    criticalCount: number;
    warningCount: number;
    slowest: APICall[];
  };
  renders: {
    totalComponents: number;
    totalRenders: number;
    hotspots: ComponentHotspot[];
  };
  bundles: {
    totalRoutes: number;
    totalSizeKb: number;
    criticalCount: number;
    warningCount: number;
    largest: BundleEntry[];
  };
  timeline: TimelineEvent[];
  recommendations: Recommendation[];
  budgetViolations: BudgetViolation[];
}

const DEMO_SNAPSHOT: PerformanceSnapshot = {
  timestamp: Date.now(),
  score: 67,
  scoreBreakdown: { apiScore: 55, renderScore: 72, bundleScore: 80 },
  api: {
    totalCalls: 247,
    avgDurationMs: 892,
    criticalCount: 3,
    warningCount: 5,
    slowest: [
      { id: '1', url: '/api/analytics/dashboard', method: 'GET', status: 200, duration: 3240, timestamp: Date.now() - 2000, budgetStatus: 'critical', isError: false },
      { id: '2', url: '/api/users/batch', method: 'POST', status: 200, duration: 2180, timestamp: Date.now() - 5000, budgetStatus: 'critical', isError: false },
      { id: '3', url: '/api/posts/feed', method: 'GET', status: 200, duration: 1450, timestamp: Date.now() - 8000, budgetStatus: 'warning', isError: false },
      { id: '4', url: '/api/search', method: 'GET', status: 200, duration: 980, timestamp: Date.now() - 12000, budgetStatus: 'warning', isError: false },
      { id: '5', url: '/api/auth/refresh', method: 'POST', status: 200, duration: 320, timestamp: Date.now() - 15000, budgetStatus: 'good', isError: false },
      { id: '6', url: '/api/notifications', method: 'GET', status: 200, duration: 145, timestamp: Date.now() - 20000, budgetStatus: 'good', isError: false },
    ],
  },
  renders: {
    totalComponents: 24,
    totalRenders: 1847,
    hotspots: [
      { displayName: 'UserCard', renderCount: 87, avgRenderTimeMs: 12, path: ['App', 'Dashboard', 'UserList', 'UserCard'], budgetStatus: 'critical' },
      { displayName: 'FeedItem', renderCount: 54, avgRenderTimeMs: 8, path: ['App', 'Feed', 'FeedItem'], budgetStatus: 'critical' },
      { displayName: 'SearchBar', renderCount: 31, avgRenderTimeMs: 4, path: ['App', 'Header', 'SearchBar'], budgetStatus: 'warning' },
      { displayName: 'Sidebar', renderCount: 22, avgRenderTimeMs: 6, path: ['App', 'Layout', 'Sidebar'], budgetStatus: 'warning' },
    ],
  },
  bundles: {
    totalRoutes: 8,
    totalSizeKb: 2840,
    criticalCount: 2,
    warningCount: 3,
    largest: [
      { route: '/editor', sizeKb: 1240, budgetStatus: 'critical' },
      { route: '/analytics', sizeKb: 890, budgetStatus: 'critical' },
      { route: '/dashboard', sizeKb: 420, budgetStatus: 'warning' },
      { route: '/settings', sizeKb: 180, budgetStatus: 'good' },
      { route: '/home', sizeKb: 110, budgetStatus: 'good' },
    ],
  },
  timeline: Array.from({ length: 20 }, (_, i) => ({
    id: String(i),
    type: ['api', 'render', 'api', 'api', 'render'][i % 5] as any,
    name: ['/api/users', 'UserCard', '/api/posts', '/api/auth', 'FeedItem'][i % 5],
    durationMs: Math.floor(Math.random() * 3000) + 50,
    timestamp: Date.now() - i * 1200,
    isError: i === 7,
  })),
  recommendations: [
    { id: 'r1', severity: 'critical', category: 'api', message: 'GET /api/analytics/dashboard is critically slow', detail: 'Last response took 3240ms. Budget is 2000ms. Consider caching or moving computation server-side.' },
    { id: 'r2', severity: 'critical', category: 'render', message: '<UserCard> has rendered 87 times', detail: 'Path: App → Dashboard → UserList → UserCard. Wrap with React.memo() to prevent unnecessary re-renders.' },
    { id: 'r3', severity: 'critical', category: 'bundle', message: 'Route /editor has an oversized bundle (1240KB)', detail: 'Consider dynamic imports: const Editor = dynamic(() => import("./Editor"), { ssr: false })' },
    { id: 'r4', severity: 'warning', category: 'api', message: 'POST /api/users/batch is approaching slow threshold', detail: 'Last response took 2180ms. Consider batching optimization.' },
    { id: 'r5', severity: 'warning', category: 'render', message: '<FeedItem> is re-rendering frequently (54×)', detail: 'Average render time: 8ms. Check parent state changes.' },
  ],
  budgetViolations: [],
};

export function useDevPulse(wsUrl = 'ws://localhost:3001') {
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>(DEMO_SNAPSHOT);
  const [connected, setConnected] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setIsDemo(false);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'snapshot') {
            setSnapshot(msg.data);
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        setIsDemo(true);
        // Reconnect after 3s
        reconnectRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (SSR) — stay in demo mode
    }
  }, [wsUrl]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  // In demo mode, animate the score slightly to show it's "live"
  useEffect(() => {
    if (!isDemo) return;
    const id = setInterval(() => {
      setSnapshot(prev => ({
        ...prev,
        timestamp: Date.now(),
        score: Math.max(50, Math.min(85, prev.score + (Math.random() - 0.5) * 3)),
        api: {
          ...prev.api,
          totalCalls: prev.api.totalCalls + Math.floor(Math.random() * 3),
          avgDurationMs: Math.max(200, prev.api.avgDurationMs + (Math.random() - 0.5) * 50),
        },
      }));
    }, 2000);
    return () => clearInterval(id);
  }, [isDemo]);

  const clearData = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'clear', timestamp: Date.now() }));
  }, []);

  return { snapshot, connected, isDemo, clearData };
}
