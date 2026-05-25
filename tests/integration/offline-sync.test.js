import { describe, it, expect, beforeEach, vi } from 'vitest';

// Setup mutable results so individual tests can override them
let nextUpsertResult = { error: null };
let nextInsertResult = { error: null };

const mockQuery = {
  upsert: vi.fn().mockImplementation(() => {
    return {
      select: vi.fn().mockResolvedValue({ data: [{ id: 'record-123' }], error: null }),
      then: (resolve) => resolve(nextUpsertResult),
    };
  }),
  insert: vi.fn().mockImplementation(() => {
    return {
      select: vi.fn().mockResolvedValue({ data: [{ id: 'record-123' }], error: null }),
      then: (resolve) => resolve(nextInsertResult),
    };
  }),
  update: vi.fn().mockImplementation(() => {
    return {
      match: vi.fn().mockResolvedValue({ error: null }),
      then: (resolve) => resolve({ error: null }),
    };
  }),
  delete: vi.fn().mockImplementation(() => {
    return {
      match: vi.fn().mockResolvedValue({ error: null }),
      then: (resolve) => resolve({ error: null }),
    };
  }),
};

vi.mock('../../js/core/supabase.js', () => {
  return {
    supabase: {
      from: vi.fn().mockImplementation(() => mockQuery),
    },
  };
});

vi.mock('../../js/core/theme.js', () => {
  return {
    showNotification: vi.fn(),
  };
});

import { safeUpsert, safeInsert, safeUpdate, safeDelete, processSyncQueue } from '../../js/core/offline.js';
import { supabase } from '../../js/core/supabase.js';
import { showNotification } from '../../js/core/theme.js';

describe('Offline Caching & Queue Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
    // Reset responses to default success
    nextUpsertResult = { error: null };
    nextInsertResult = { error: null };

    // Default to online
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  describe('Online Operations', () => {
    it('should directly call Supabase upsert when online', async () => {
      const payload = { id: '1', value: 'hello' };
      const res = await safeUpsert('test_table', payload, 'id');

      expect(supabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQuery.upsert).toHaveBeenCalledWith(payload, { onConflict: 'id' });
      expect(res.offline).toBeUndefined();
      expect(res.data[0].id).toBe('record-123');
    });

    it('should directly call Supabase insert when online', async () => {
      const payload = { value: 'world' };
      const res = await safeInsert('test_table', payload);

      expect(supabase.from).toHaveBeenCalledWith('test_table');
      expect(mockQuery.insert).toHaveBeenCalledWith(payload);
      expect(res.offline).toBeUndefined();
    });
  });

  describe('Offline Operations (Caching in localStorage Queue)', () => {
    it('should queue upsert operation in localStorage when offline', async () => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const payload = { id: '999', text: 'offline data' };
      const res = await safeUpsert('brigade_shifts', payload, 'id');

      // Assertions
      expect(res.offline).toBe(true);
      expect(res.data).toBeNull();
      expect(supabase.from).not.toHaveBeenCalled();

      // Verify the queue contains the item
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(1);
      expect(queue[0].table).toBe('brigade_shifts');
      expect(queue[0].action).toBe('upsert');
      expect(queue[0].data).toEqual(payload);
      expect(queue[0].id).toBeDefined();
    });

    it('should queue insert operation in localStorage when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      const payload = { text: 'new offline record' };
      const res = await safeInsert('drawings', payload);

      expect(res.offline).toBe(true);
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(1);
      expect(queue[0].table).toBe('drawings');
      expect(queue[0].action).toBe('insert');
      expect(queue[0].data).toEqual(payload);
    });
  });

  describe('Sync Queue Processing', () => {
    it('should not process sync queue when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });

      // Put item in queue manually
      localStorage.setItem('kiscord_sync_queue', JSON.stringify([
        { id: 'uuid-1', action: 'upsert', table: 'drawings', data: { id: 'x' } }
      ]));

      await processSyncQueue();

      expect(supabase.from).not.toHaveBeenCalled();
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(1); // Remains untouched
    });

    it('should empty queue and perform Supabase ops when online', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });

      // Put item in queue manually
      localStorage.setItem('kiscord_sync_queue', JSON.stringify([
        { id: 'uuid-1', action: 'upsert', table: 'drawings', data: { id: 'x' } }
      ]));

      await processSyncQueue();

      expect(supabase.from).toHaveBeenCalledWith('drawings');
      expect(mockQuery.upsert).toHaveBeenCalledWith({ id: 'x' });
      
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(0); // Emptied successfully!
      expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('Synchronizace dokončena'), 'success');
    });

    it('should keep items in queue if Supabase returns error', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });

      localStorage.setItem('kiscord_sync_queue', JSON.stringify([
        { id: 'uuid-1', action: 'upsert', table: 'drawings', data: { id: 'x' } }
      ]));

      // Mock DB failure
      nextUpsertResult = { error: new Error('Network timeout or DB constraint error') };

      await processSyncQueue();

      // Queue should NOT be emptied due to error
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe('uuid-1');
    });
  });

  describe('Online Event Listener Trigger', () => {
    it('should trigger processSyncQueue when window online event fires', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true });

      localStorage.setItem('kiscord_sync_queue', JSON.stringify([
        { id: 'uuid-1', action: 'insert', table: 'drawings', data: { id: 'y' } }
      ]));

      // Trigger online event manually on window
      window.dispatchEvent(new Event('online'));

      // Sometime listeners trigger asynchronously, let it flush
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(supabase.from).toHaveBeenCalledWith('drawings');
      const queue = JSON.parse(localStorage.getItem('kiscord_sync_queue') || '[]');
      expect(queue.length).toBe(0);
    });
  });
});
