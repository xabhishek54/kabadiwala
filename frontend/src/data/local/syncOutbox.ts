import { db } from './db';
import { pushSyncOutbox, pullSyncData } from '../remote/apiClient';

let isSyncing = false;

export async function flushSyncOutbox(): Promise<{ processed: number; success: boolean }> {
  if (isSyncing || !navigator.onLine) {
    return { processed: 0, success: false };
  }

  try {
    isSyncing = true;
    const unsyncedItems = await db.syncOutbox.filter((item) => !item.synced).toArray();

    if (unsyncedItems.length === 0) {
      isSyncing = false;
      return { processed: 0, success: true };
    }

    const collectorId = localStorage.getItem('kabadiwala_collector_id') || 'col-demo-101';
    const payloadItems = unsyncedItems.map((item) => ({
      client_uuid: item.client_uuid,
      entity_type: item.entity_type,
      action: item.action,
      payload: item.payload,
      client_timestamp: item.created_at,
    }));

    const result = await pushSyncOutbox(collectorId, payloadItems);

    if (result && result.results) {
      for (const res of result.results) {
        if (res.status === 'synced') {
          await db.syncOutbox.where('client_uuid').equals(res.client_uuid).modify({ synced: true });
        }
      }
    }

    // Pull delta updates after push
    try {
      const delta = await pullSyncData('Pune');
      if (delta && delta.prices && delta.prices.length > 0) {
        for (const p of delta.prices) {
          await db.priceCache.put({
            category: p.material_category,
            sub_category: p.sub_category,
            district: 'Pune',
            current_price: p.buying_price,
            market_range_low: Math.round(p.buying_price * 0.9),
            market_range_high: Math.round(p.buying_price * 1.1),
            informal_reference_price: Math.round(p.buying_price * 0.85),
            trend_direction: 'flat',
            trend_slope: 0.0,
            updated_at: p.observed_at,
          });
        }
      }
    } catch (e) {
      console.warn('Delta pull skipped:', e);
    }

    isSyncing = false;
    return { processed: unsyncedItems.length, success: true };
  } catch (error) {
    console.warn('Background sync push failed, will retry on next online event:', error);
    isSyncing = false;
    return { processed: 0, success: false };
  }
}

// Auto-trigger sync on online event & visibility change
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushSyncOutbox();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushSyncOutbox();
    }
  });
}
