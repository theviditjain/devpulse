/**
 * MinHeap — used as a bounded max-heap for tracking the N slowest API calls.
 *
 * Why a heap?
 *   - O(log n) insertion (vs O(n log n) re-sorting an array every time)
 *   - O(1) peek at the current worst offender
 *   - Bounded at maxSize: once full, we evict the fastest entry,
 *     keeping only the slowest calls in memory.
 *
 * Interview angle: explain that a min-heap of size K efficiently maintains
 * the "top-K largest" set — the minimum of the heap is the eviction candidate.
 */

export interface HeapItem {
  duration: number;
  [key: string]: unknown;
}

export class MinHeap<T extends HeapItem> {
  private heap: T[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get size(): number {
    return this.heap.length;
  }

  /**
   * Returns the item with the smallest duration (fastest call).
   * O(1) — it's always at index 0.
   */
  peek(): T | undefined {
    return this.heap[0];
  }

  /**
   * Insert a new item. If we exceed maxSize, evict the fastest call
   * (the minimum), keeping only the slowest maxSize calls.
   * O(log n)
   */
  insert(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);

    if (this.heap.length > this.maxSize) {
      this.extractMin(); // evict fastest to keep only slowest
    }
  }

  /**
   * Remove and return the item with the smallest duration.
   * O(log n)
   */
  extractMin(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop();

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.sinkDown(0);
    return min;
  }

  /**
   * Return the N slowest items, sorted slowest-first.
   * We extract all, sort, then re-insert — called infrequently.
   * O(n log n)
   */
  getSlowest(n?: number): T[] {
    const all = [...this.heap].sort((a, b) => b.duration - a.duration);
    return n !== undefined ? all.slice(0, n) : all;
  }

  /**
   * Return all items without modifying the heap.
   */
  toArray(): T[] {
    return [...this.heap];
  }

  clear(): void {
    this.heap = [];
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].duration <= this.heap[index].duration) break;
      this.swap(parentIndex, index);
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;

    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let smallest = index;

      if (left < length && this.heap[left].duration < this.heap[smallest].duration) {
        smallest = left;
      }
      if (right < length && this.heap[right].duration < this.heap[smallest].duration) {
        smallest = right;
      }

      if (smallest === index) break;
      this.swap(index, smallest);
      index = smallest;
    }
  }

  private swap(i: number, j: number): void {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }
}
