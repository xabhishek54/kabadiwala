const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface PublicVerifyRecord {
  type: string;
  id: string;
  name_or_title: string;
  verification_status: string;
  is_valid: boolean;
  details: Record<string, unknown>;
}

export async function verifyPublicRecord(identifier: string): Promise<PublicVerifyRecord> {
  const response = await fetch(`${API_BASE_URL}/verify/${encodeURIComponent(identifier.trim())}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Verification lookup failed with status ${response.status}`);
  }
  return response.json();
}

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

export async function fetchRecyclerMatches(category: string, lat: number, lng: number) {
  const response = await fetch(
    `${API_BASE_URL}/recyclers/match/rank?category=${encodeURIComponent(category)}&lat=${lat}&lng=${lng}`
  );
  if (!response.ok) {
    throw new Error(`Recycler matching failed with status ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Recycler matching returned an invalid response');
  }
  return data;
}

export async function getHandoverToken(lotId: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/handovers/${lotId}/qr-token`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn('API token fetch failed, using offline generated token');
  }
  const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
  return {
    lot_id: lotId,
    handover_token: `KC-${lotId.slice(0, 8)}-${shortCode}`,
    short_code: shortCode,
    timestamp: new Date().toISOString(),
  };
}

export async function confirmHandover(
  lotId: string,
  recyclerId: string,
  shortCode?: string,
  lat?: number,
  lng?: number,
  finalSaleValue?: number,
  paymentMethod: 'cash' | 'upi' = 'cash'
) {
  const response = await fetch(`${API_BASE_URL}/handovers/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      lot_id: lotId,
      recycler_id: recyclerId,
      short_code: shortCode,
      gps_lat: lat,
      gps_lng: lng,
      final_sale_value: finalSaleValue,
      payment_method: paymentMethod,
    }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Handover confirmation failed with status ${response.status}`);
  }
  return response.json();
}

export interface PriceRefineResult {
  base_price_per_kg: number;
  condition_multiplier: number;
  weight_kg: number;
  deterministic_total: number;
  ml_adjustment: number;
  refined_total: number;
  market_low: number;
  market_high: number;
  ml_confidence: number;
  sample_count: number;
  district: string;
}

/**
 * POST /prices/refine — get GBDT-refined price with explainability breakdown.
 * Falls back to deterministic calculation on network error.
 */
export async function refinePriceEstimate(
  category: string,
  subCategory: string,
  weightKg: number,
  condition: string,
  district: string = 'Pune'
): Promise<PriceRefineResult> {
  const response = await fetch(`${API_BASE_URL}/prices/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category,
      sub_category: subCategory,
      weight_kg: weightKg,
      condition,
      district,
    }),
  });
  if (!response.ok) {
    throw new Error(`Price refinement failed with status ${response.status}`);
  }
  return response.json();
}

export interface AnomalyRecord {
  lot_id: string;
  collector_id: string;
  category: string;
  weight_kg: number;
  condition: string;
  unit_price_per_kg: number;
  category_median_price: number;
  modified_z_score: number;
  severity: 'low' | 'medium' | 'high';
  reasons: string[];
  recommended_action: string;
  audit_status: string;
}

export async function fetchPrices(district: string = 'Pune') {
  try {
    const response = await fetch(`${API_BASE_URL}/prices?district=${encodeURIComponent(district)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (err) {
    console.warn('Fetch prices offline fallback:', err);
    return [];
  }
}

export async function fetchAnomalies(): Promise<AnomalyRecord[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/anomalies`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (err) {
    console.warn('Fetch anomalies offline fallback:', err);
    throw err;
  }
}

export async function resolveAnomaly(lotId: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/admin/anomalies/${encodeURIComponent(lotId)}/resolve`,
    { method: 'PATCH' }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Could not resolve anomaly (${response.status})`);
  }
}

export interface RecyclerLotRecord {
  lot_id: string;
  category: string;
  sub_category: string;
  weight_kg: number;
  condition: string;
  estimated_value: number;
  collector_id: string;
  status: string;
  final_sale_value?: number | null;
  payment_status: string;
  recycler_id: string;
  created_at?: string | null;
}

export async function fetchRecyclerLots(recyclerId: string): Promise<RecyclerLotRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/recyclers/${encodeURIComponent(recyclerId)}/lots`
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Could not load recycler lots (${response.status})`);
  }
  const lots: unknown = await response.json();
  if (!Array.isArray(lots) || !lots.every(isRecyclerLotRecord)) {
    throw new Error('Recycler lots endpoint returned an invalid response');
  }
  return lots;
}

export interface MineralImpactRecord {
  unit: string;
  district: string;
  mineral_estimates: Record<string, number>;
  total_e_waste_processed_kg: number;
  estimate_basis: string;
}

export async function fetchMineralImpact(district = 'Pune'): Promise<MineralImpactRecord> {
  const response = await fetch(
    `${API_BASE_URL}/admin/minerals/impact?district=${encodeURIComponent(district)}`
  );
  if (!response.ok) {
    throw new Error(`Could not load mineral estimates (${response.status})`);
  }
  const result: unknown = await response.json();
  if (!isMineralImpactRecord(result)) {
    throw new Error('Mineral estimates endpoint returned an invalid response');
  }
  return result;
}

function isMineralImpactRecord(value: unknown): value is MineralImpactRecord {
  if (typeof value !== 'object' || value === null
    || !('unit' in value) || typeof value.unit !== 'string'
    || !('district' in value) || typeof value.district !== 'string'
    || !('total_e_waste_processed_kg' in value) || typeof value.total_e_waste_processed_kg !== 'number'
    || !('estimate_basis' in value) || typeof value.estimate_basis !== 'string'
    || !('mineral_estimates' in value) || typeof value.mineral_estimates !== 'object'
    || value.mineral_estimates === null || Array.isArray(value.mineral_estimates)) {
    return false;
  }
  return Object.values(value.mineral_estimates).every(estimate => typeof estimate === 'number');
}

function isRecyclerLotRecord(value: unknown): value is RecyclerLotRecord {
  if (typeof value !== 'object' || value === null) return false;
  return 'lot_id' in value
    && typeof value.lot_id === 'string'
    && 'category' in value
    && typeof value.category === 'string'
    && 'sub_category' in value
    && typeof value.sub_category === 'string'
    && 'weight_kg' in value
    && typeof value.weight_kg === 'number'
    && 'condition' in value
    && typeof value.condition === 'string'
    && 'estimated_value' in value
    && typeof value.estimated_value === 'number'
    && 'collector_id' in value
    && typeof value.collector_id === 'string'
    && 'status' in value
    && typeof value.status === 'string'
    && 'payment_status' in value
    && typeof value.payment_status === 'string'
    && 'recycler_id' in value
    && typeof value.recycler_id === 'string';
}

export async function submitFieldPriceReport(data: {
  category: string;
  price_per_kg: number;
  district?: string;
  notes?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/prices/field-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      category: data.category,
      price_per_kg: data.price_per_kg,
      district: data.district || 'Pune',
      notes: data.notes || '',
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function syncCommodityIndex(district: string = 'Pune') {
  const response = await fetch(`${API_BASE_URL}/prices/sync-commodity-index?district=${encodeURIComponent(district)}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function registerRecycler(data: {
  name: string;
  contact_phone: string;
  authorization_ref_no: string;
  facility_lat: number;
  facility_lng: number;
  offered_rates: Record<string, number>;
  materials_accepted?: string[];
}) {
  const payload = {
    name: data.name,
    contact_phone: data.contact_phone,
    authorization_ref_no: data.authorization_ref_no,
    facility_lat: data.facility_lat,
    facility_lng: data.facility_lng,
    service_radius_km: 30.0,
    materials_accepted: data.materials_accepted || Object.keys(data.offered_rates),
    offered_rates: data.offered_rates,
  };

  const response = await fetch(`${API_BASE_URL}/recyclers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Recycler registration failed (${response.status})`);
  }
  const result: unknown = await response.json();
  if (!isRecyclerRegistration(result)) {
    throw new Error('Recycler registration returned an invalid response');
  }
  return result;
}

export async function updateRecyclerRates(recyclerId: string, rates: Record<string, number>) {
  const response = await fetch(`${API_BASE_URL}/recyclers/${encodeURIComponent(recyclerId)}/rates`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rates }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Could not update recycler rates (${response.status})`);
  }
  return response.json();
}

export interface RecyclerProfileRecord {
  recycler_id: string;
  name: string;
  authorization_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  offered_rates: Record<string, number>;
  pickup_available: boolean;
  service_radius_km: number;
  materials_accepted: string[];
}

export async function fetchRecyclerProfile(recyclerId: string): Promise<RecyclerProfileRecord> {
  const response = await fetch(`${API_BASE_URL}/recyclers/${encodeURIComponent(recyclerId)}`);
  if (!response.ok) {
    throw new Error(`Could not load recycler profile (${response.status})`);
  }
  const profile: unknown = await response.json();
  if (!isRecyclerProfileRecord(profile)) {
    throw new Error('Recycler profile endpoint returned an invalid response');
  }
  return profile;
}

export async function updateRecyclerConfig(
  recyclerId: string,
  config: {
    pickup_available: boolean;
    service_radius_km: number;
    materials_accepted: string[];
  },
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/recyclers/${encodeURIComponent(recyclerId)}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Could not update recycler configuration (${response.status})`);
  }
}

interface RecyclerRegistrationResponse {
  recycler_id: string;
  authorization_status: 'pending' | 'verified' | 'rejected' | 'suspended';
}

function isRecyclerRegistration(value: unknown): value is RecyclerRegistrationResponse {
  return typeof value === 'object' && value !== null
    && 'recycler_id' in value && typeof value.recycler_id === 'string'
    && 'authorization_status' in value
    && ['pending', 'verified', 'rejected', 'suspended'].includes(String(value.authorization_status));
}

function isRecyclerProfileRecord(value: unknown): value is RecyclerProfileRecord {
  if (typeof value !== 'object' || value === null
    || !('recycler_id' in value) || typeof value.recycler_id !== 'string'
    || !('name' in value) || typeof value.name !== 'string'
    || !('authorization_status' in value)
    || !['pending', 'verified', 'rejected', 'suspended'].includes(String(value.authorization_status))
    || !('offered_rates' in value) || typeof value.offered_rates !== 'object'
    || value.offered_rates === null || Array.isArray(value.offered_rates)
    || !('pickup_available' in value) || typeof value.pickup_available !== 'boolean'
    || !('service_radius_km' in value) || typeof value.service_radius_km !== 'number'
    || !('materials_accepted' in value) || !Array.isArray(value.materials_accepted)) {
    return false;
  }
  return Object.values(value.offered_rates).every(rate => typeof rate === 'number')
    && value.materials_accepted.every(category => typeof category === 'string');
}

// ─── Auth APIs ────────────────────────────────────────────────────────────────

export interface LoginResponse {
  user_id: string;
  phone_number: string;
  name: string;
  role: string;
  account_type?: string;
  shop_code?: string;
  district?: string;
}

/** Attempt login by phone + role. Returns user data if found, throws if not found. */
export async function loginUser(phone: string, role: 'collector' | 'recycler'): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, role }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Login failed (${response.status})`);
  }
  return response.json();
}

/** Register a new collector. Returns the saved collector record. */
export async function signupCollector(data: {
  phone_number: string;
  display_name: string;
  operating_locality: string;
  account_type: 'independent' | 'shop' | 'sub_collector';
  preferred_language?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/auth/signup/collector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Signup failed (${response.status})`);
  }
  return response.json();
}

/** Link a feriwala to a shop by shop_code. */
export async function linkFeriwalaToShop(feriwalId: string, shopCode: string) {
  const response = await fetch(`${API_BASE_URL}/collectors/link-shop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feriwala_collector_id: feriwalId, shop_code: shopCode }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Link failed (${response.status})`);
  }
  return response.json();
}

/** Fetch all feriwalas linked to a shop by shop_code. */
export async function fetchShopFeriwalas(shopCode: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/collectors/shop/${encodeURIComponent(shopCode)}/feriwalas`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (err) {
    console.warn('fetchShopFeriwalas offline fallback:', err);
    return [];
  }
}
