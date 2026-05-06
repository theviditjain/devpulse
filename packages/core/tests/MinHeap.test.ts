import { describe, it, expect, beforeEach } from 'vitest';
import { MinHeap } from '../src/structures/MinHeap';

interface APICall {
  url: string;
  duration: number;
}

describe('MinHeap', () => {
  let heap: MinHeap<APICall>;

  beforeEach(() => {
    heap = new MinHeap<APICall>(5);
  });

  describe('basic operations', () => {
    it('starts empty', () => {
      expect(heap.size).toBe(0);
      expect(heap.peek()).toBeUndefined();
    });

    it('inserts a single item', () => {
      heap.insert({ url: '/api/users', duration: 300 });
      expect(heap.size).toBe(1);
      expect(heap.peek()?.duration).toBe(300);
    });

    it('peek always returns the minimum duration', () => {
      heap.insert({ url: '/a', duration: 500 });
      heap.insert({ url: '/b', duration: 100 });
      heap.insert({ url: '/c', duration: 800 });
      expect(heap.peek()?.duration).toBe(100);
    });

    it('extractMin removes and returns the minimum', () => {
      heap.insert({ url: '/a', duration: 500 });
      heap.insert({ url: '/b', duration: 100 });
      heap.insert({ url: '/c', duration: 800 });

      const min = heap.extractMin();
      expect(min?.duration).toBe(100);
      expect(heap.size).toBe(2);
      expect(heap.peek()?.duration).toBe(500);
    });

    it('extractMin on empty heap returns undefined', () => {
      expect(heap.extractMin()).toBeUndefined();
    });

    it('extractMin on single-item heap works', () => {
      heap.insert({ url: '/a', duration: 200 });
      expect(heap.extractMin()?.duration).toBe(200);
      expect(heap.size).toBe(0);
    });
  });

  describe('heap ordering', () => {
    it('maintains min-heap property after multiple inserts', () => {
      const durations = [400, 100, 700, 50, 300];
      durations.forEach(d => heap.insert({ url: `/api/${d}`, duration: d }));

      // Extract all items — should come out in ascending order
      const extracted: number[] = [];
      while (heap.size > 0) {
        extracted.push(heap.extractMin()!.duration);
      }
      expect(extracted).toEqual([...extracted].sort((a, b) => a - b));
    });
  });

  describe('bounded size (maxSize enforcement)', () => {
    it('evicts the fastest call when over maxSize, keeping only the slowest', () => {
      // maxSize = 5, insert 6 items
      const items = [100, 200, 300, 400, 500, 50]; // 50 is fastest — should be evicted
      items.forEach(d => heap.insert({ url: `/api/${d}`, duration: d }));

      expect(heap.size).toBe(5);

      // The fastest (50ms) should have been evicted, 100ms is now the min
      expect(heap.peek()?.duration).toBe(100);
    });

    it('keeps only the N slowest calls', () => {
      for (let i = 1; i <= 8; i++) {
        heap.insert({ url: `/api/${i * 100}`, duration: i * 100 });
      }
      // maxSize=5, so we keep durations 400,500,600,700,800
      expect(heap.size).toBe(5);
      expect(heap.peek()?.duration).toBe(400);
    });
  });

  describe('getSlowest', () => {
    beforeEach(() => {
      [300, 100, 800, 50, 500].forEach(d =>
        heap.insert({ url: `/api/${d}`, duration: d })
      );
    });

    it('returns all items sorted slowest-first when no arg given', () => {
      const slowest = heap.getSlowest();
      expect(slowest[0].duration).toBeGreaterThanOrEqual(slowest[1].duration);
    });

    it('returns top N slowest', () => {
      const top2 = heap.getSlowest(2);
      expect(top2).toHaveLength(2);
      expect(top2[0].duration).toBe(800);
      expect(top2[1].duration).toBe(500);
    });

    it('does not modify the heap', () => {
      const sizeBefore = heap.size;
      heap.getSlowest(3);
      expect(heap.size).toBe(sizeBefore);
    });
  });

  describe('clear', () => {
    it('resets the heap', () => {
      heap.insert({ url: '/a', duration: 100 });
      heap.clear();
      expect(heap.size).toBe(0);
      expect(heap.peek()).toBeUndefined();
    });
  });
});
