/**
 * CircularBuffer — a fixed-size ring buffer for the event timeline.
 *
 * Why a circular buffer?
 *   - O(1) insertion always — no memory allocation after initialization.
 *   - Bounded memory — older events are automatically overwritten.
 *     No GC pressure from shifting large arrays.
 *   - Perfect for streaming telemetry data where you only care about
 *     the last N events (last 1000 API calls, renders, errors).
 *
 * Interview angle: used in OS kernel event logs, network packet capture,
 * audio processing. The modular index arithmetic is a classic CS pattern.
 *
 * Mental model: imagine a clock face. The "hand" moves clockwise.
 * When it reaches 12 again, it overwrites the oldest event.
 */

export type TimelineEventType = 'api' | 'render' | 'error' | 'navigation' | 'custom';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  name: string;
  durationMs?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  isError?: boolean;
}

export class CircularBuffer<T extends TimelineEvent> {
  private readonly buffer: (T | undefined)[];
  private head = 0;   // next write position
  private _size = 0;  // actual number of items (capped at capacity)
  readonly capacity: number;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity).fill(undefined);
  }

  /**
   * Add a new event to the buffer. Overwrites the oldest if full.
   * O(1)
   */
  add(event: T): void {
    this.buffer[this.head] = event;
    this.head = (this.head + 1) % this.capacity;
    if (this._size < this.capacity) this._size++;
  }

  /**
   * Get the N most recent events, newest first.
   * O(n)
   */
  getRecent(n?: number): T[] {
    const count = Math.min(n ?? this._size, this._size);
    const result: T[] = [];

    // Start from the most recently written slot and go backwards
    let idx = (this.head - 1 + this.capacity) % this.capacity;

    for (let i = 0; i < count; i++) {
      const item = this.buffer[idx];
      if (item !== undefined) result.push(item);
      idx = (idx - 1 + this.capacity) % this.capacity;
    }

    return result;
  }

  /**
   * Get all events in chronological order (oldest first).
   * O(n)
   */
  toChronological(): T[] {
    return this.getRecent().reverse();
  }

  /**
   * Filter events by type. Returns newest-first.
   * O(n)
   */
  filterByType(type: TimelineEventType): T[] {
    return this.getRecent().filter(e => e.type === type);
  }

  /**
   * Filter events within a time range. Returns newest-first.
   * O(n)
   */
  filterByTimeRange(fromMs: number, toMs: number): T[] {
    return this.getRecent().filter(
      e => e.timestamp >= fromMs && e.timestamp <= toMs
    );
  }

  /**
   * Count events by type — useful for the overview stats.
   * O(n)
   */
  countByType(): Record<TimelineEventType, number> {
    const counts: Record<TimelineEventType, number> = {
      api: 0,
      render: 0,
      error: 0,
      navigation: 0,
      custom: 0,
    };

    const all = this.getRecent();
    for (const event of all) {
      counts[event.type]++;
    }

    return counts;
  }

  get size(): number {
    return this._size;
  }

  get isFull(): boolean {
    return this._size === this.capacity;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this._size = 0;
  }
}
