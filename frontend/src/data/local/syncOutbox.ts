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

    const userStr = localStorage.getItem('kabadiwala_user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    const collectorId = localStorage.getItem('kabadiwala_collector_id') || userObj?.id || 'col-demo-101';
    const payloadItems = unsyncedItems.map((item) => ({
      client_uuid: item.client_uuid,
      entity_type: item.entity_type,
      action: item.action,
      payload: item.payload,
      client_timestamp: item.created_at,
    }));

    const result = await pushSyncOutbox(collectorId, payloadItems);

    if (result && Array.isArray(result.results)) {
      for (const [index, res] of result.results.entries()) {
        if (res.status === 'synced') {
          const outboxItem = unsyncedItems[index];
          if (outboxItem?.id !== undefined && outboxItem.client_uuid === res.client_uuid) {
            await db.syncOutbox.update(outboxItem.id, { synced: true });
          }
        }
      }
    }

    // Pull delta updates after push
    try {
      const district = window.localStorage?.getItem('kabadiwala_district') || 'Pune';
      const delta = await pullSyncData(district);
      if (delta && delta.prices && delta.prices.length > 0) {
        for (const p of delta.prices) {
          const price = Number(p.buying_price);
          if (!Number.isFinite(price) || price <= 0) continue;
          await db.priceCache.put({
            category: p.material_category,
            sub_category: p.sub_category,
            district,
            current_price: price,
            market_range_low: Math.round(price * 0.9),
            market_range_high: Math.round(price * 1.1),
            informal_reference_price: Math.round(price * 0.85),
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
    const successfulItems = Array.isArray(result?.results)
      ? result.results.filter((item: { status: string }) => item.status === 'synced').length
      : 0;
    return {
      processed: successfulItems,
      success: successfulItems === unsyncedItems.length,
    };
  } catch (error) {
    console.warn('Background sync push failed, will retry on next online event:', error);
    isSyncing = false;
    return { processed: 0, success: false };
  }
}

// Auto-trigger sync on online event & visibility change & module initialization
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushSyncOutbox();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      flushSyncOutbox();
    }
  });
  // Initial flush on startup
  setTimeout(() => {
    flushSyncOutbox();
  }, 1000);
}
