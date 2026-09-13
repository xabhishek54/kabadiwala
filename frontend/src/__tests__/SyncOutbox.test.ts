import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../data/local/db';
import { flushSyncOutbox } from '../data/local/syncOutbox';

describe('Sync Outbox Manager', () => {
  beforeEach(async () => {
    await db.syncOutbox.clear();
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
});
