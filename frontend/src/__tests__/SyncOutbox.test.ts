import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '../data/local/db';
import { flushSyncOutbox } from '../data/local/syncOutbox';

describe('Sync Outbox Manager', () => {
  beforeEach(async () => {
    await db.syncOutbox.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('queues offline item in IndexedDB sync outbox table', async () => {
    await db.syncOutbox.add({
      client_uuid: 'test-uuid-101',
      entity_type: 'material',
      action: 'upsert',
      payload: { material_category: 'PCB', weight_kg: 3.5 },
      created_at: new Date().toISOString(),
      synced: false,
    });

    const unsynced = await db.syncOutbox.filter((item) => !item.synced).toArray();
    expect(unsynced.length).toBe(1);
    expect(unsynced[0].client_uuid).toBe('test-uuid-101');
  });

  it('attempts to flush sync outbox', async () => {
    const res = await flushSyncOutbox();
    expect(res).toBeDefined();
  });

  it('marks only the matching outbox item synced when entity UUIDs are shared', async () => {
    window.localStorage.setItem('kabadiwala_user', JSON.stringify({ id: 'collector-test-1' }));
    const firstId = await db.syncOutbox.add({
      client_uuid: 'shared-lot-id',
      entity_type: 'material',
      action: 'create',
      payload: { lot_id: 'shared-lot-id' },
      created_at: new Date().toISOString(),
      synced: false,
    });
    const secondId = await db.syncOutbox.add({
      client_uuid: 'shared-lot-id',
      entity_type: 'transaction',
      action: 'upsert',
      payload: { lot_id: 'shared-lot-id', status: 'matched' },
      created_at: new Date().toISOString(),
      synced: false,
    });

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const body = url.endsWith('/sync/push')
        ? {
            processed: 1,
            results: [
              { client_uuid: 'shared-lot-id', status: 'synced' },
              { client_uuid: 'shared-lot-id', status: 'rejected', error: 'out of order' },
            ],
          }
        : { prices: [], recyclers: [], server_timestamp: new Date().toISOString() };
      return new Response(JSON.stringify(body), { status: 200 });
    }));

    const result = await flushSyncOutbox();
    expect(result.success).toBe(false);
    expect(await db.syncOutbox.get(firstId)).toMatchObject({ synced: true });
    expect(await db.syncOutbox.get(secondId)).toMatchObject({ synced: false });
  });
});
