import { describe, it, expect, beforeEach } from 'vitest';
import { CircularBuffer } from '../src/structures/CircularBuffer';
import type { TimelineEvent } from '../src/structures/CircularBuffer';

function makeEvent(id: string, type: TimelineEvent['type'] = 'api', durationMs = 100): TimelineEvent {
  return {
    id,
    type,
    name: `event-${id}`,
    durationMs,
    timestamp: Date.now() + parseInt(id, 10),
    metadata: {},
  };
}

describe('CircularBuffer', () => {
  let buf: CircularBuffer<TimelineEvent>;

  beforeEach(() => {
    buf = new CircularBuffer<TimelineEvent>(5);
  });

  describe('basic operations', () => {
    it('starts empty', () => {
      expect(buf.size).toBe(0);
      expect(buf.isFull).toBe(false);
      expect(buf.getRecent()).toEqual([]);
    });

    it('adds items and tracks size', () => {
      buf.add(makeEvent('1'));
      buf.add(makeEvent('2'));
      expect(buf.size).toBe(2);
    });

    it('reports isFull correctly', () => {
      for (let i = 0; i < 5; i++) buf.add(makeEvent(String(i)));
      expect(buf.isFull).toBe(true);
    });

    it('getRecent returns newest first', () => {
      buf.add(makeEvent('1'));
      buf.add(makeEvent('2'));
      buf.add(makeEvent('3'));

      const recent = buf.getRecent();
      expect(recent[0].id).toBe('3');
      expect(recent[1].id).toBe('2');
      expect(recent[2].id).toBe('1');
    });

    it('getRecent(n) limits results', () => {
      for (let i = 1; i <= 5; i++) buf.add(makeEvent(String(i)));
      expect(buf.getRecent(2)).toHaveLength(2);
    });
  });

  describe('ring / wrap-around behaviour', () => {
    it('overwrites oldest when full', () => {
      // Fill to capacity (5), then add one more
      for (let i = 1; i <= 5; i++) buf.add(makeEvent(String(i)));
      buf.add(makeEvent('6')); // overwrites '1'

      const all = buf.getRecent();
      expect(all).toHaveLength(5);
      const ids = all.map(e => e.id);
      expect(ids).not.toContain('1'); // evicted
      expect(ids).toContain('6');     // newest
    });

    it('keeps the last N items across multiple wraps', () => {
      for (let i = 1; i <= 12; i++) buf.add(makeEvent(String(i)));
      const all = buf.getRecent();
      expect(all).toHaveLength(5);
      const ids = all.map(e => e.id);
      expect(ids).toEqual(['12', '11', '10', '9', '8']);
    });

    it('size is capped at capacity', () => {
      for (let i = 0; i < 100; i++) buf.add(makeEvent(String(i)));
      expect(buf.size).toBe(5);
    });
  });

  describe('filterByType', () => {
    beforeEach(() => {
      buf.add(makeEvent('1', 'api'));
      buf.add(makeEvent('2', 'render'));
      buf.add(makeEvent('3', 'api'));
      buf.add(makeEvent('4', 'error'));
      buf.add(makeEvent('5', 'render'));
    });

    it('filters by api', () => {
      const apis = buf.filterByType('api');
      expect(apis).toHaveLength(2);
      expect(apis.every(e => e.type === 'api')).toBe(true);
    });

    it('filters by render', () => {
      expect(buf.filterByType('render')).toHaveLength(2);
    });

    it('returns empty for type not present', () => {
      expect(buf.filterByType('navigation')).toHaveLength(0);
    });
  });

  describe('countByType', () => {
    it('counts each type correctly', () => {
      buf.add(makeEvent('1', 'api'));
      buf.add(makeEvent('2', 'api'));
      buf.add(makeEvent('3', 'render'));
      buf.add(makeEvent('4', 'error'));

      const counts = buf.countByType();
      expect(counts.api).toBe(2);
      expect(counts.render).toBe(1);
      expect(counts.error).toBe(1);
      expect(counts.navigation).toBe(0);
    });
  });

  describe('toChronological', () => {
    it('returns oldest-first order', () => {
      buf.add(makeEvent('1'));
      buf.add(makeEvent('2'));
      buf.add(makeEvent('3'));

      const chron = buf.toChronological();
      expect(chron[0].id).toBe('1');
      expect(chron[chron.length - 1].id).toBe('3');
    });
  });

  describe('filterByTimeRange', () => {
    it('returns only events within range', () => {
      const now = 1000;
      const buf2 = new CircularBuffer<TimelineEvent>(10);
      buf2.add({ id: 'a', type: 'api', name: 'a', timestamp: 900 });
      buf2.add({ id: 'b', type: 'api', name: 'b', timestamp: 1000 });
      buf2.add({ id: 'c', type: 'api', name: 'c', timestamp: 1100 });
      buf2.add({ id: 'd', type: 'api', name: 'd', timestamp: 1200 });

      const inRange = buf2.filterByTimeRange(1000, 1100);
      expect(inRange).toHaveLength(2);
      expect(inRange.map(e => e.id).sort()).toEqual(['b', 'c']);
    });
  });

  describe('clear', () => {
    it('resets the buffer', () => {
      buf.add(makeEvent('1'));
      buf.add(makeEvent('2'));
      buf.clear();
      expect(buf.size).toBe(0);
      expect(buf.getRecent()).toEqual([]);
    });
  });

  describe('large capacity', () => {
    it('handles 1000-slot buffer without error', () => {
      const large = new CircularBuffer<TimelineEvent>(1000);
      for (let i = 0; i < 2500; i++) {
        large.add(makeEvent(String(i)));
      }
      expect(large.size).toBe(1000);
      expect(large.getRecent(10)).toHaveLength(10);
    });
  });
});
