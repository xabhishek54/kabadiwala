const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function pushSyncOutbox(collectorId: string, items: any[]) {
  const response = await fetch(`${API_BASE_URL}/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      collector_id: collectorId,
      items,
    }),
  });

  if (!response.ok) {
    throw new Error(`Sync push failed with status ${response.status}`);
  }

  return response.json();
}

export async function pullSyncData(district: string = 'Pune') {
  const response = await fetch(`${API_BASE_URL}/sync/pull?district=${encodeURIComponent(district)}`);
  if (!response.ok) {
    throw new Error(`Sync pull failed with status ${response.status}`);
  }

  return response.json();
}
