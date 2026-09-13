import Dexie, { type Table } from 'dexie';

export interface LocalMaterial {
  lot_id: string;
  material_category: string;
  sub_category: string;
  description?: string;
  image_ref?: string;
  approx_weight_kg: number;
  condition: 'intact' | 'damaged' | 'stripped';
  condition_confidence?: number;
  condition_ml_used?: boolean;
  source_type: 'household' | 'commercial' | 'mixed_scrap';
  estimated_value: number;
  collector_id: string;
  created_at: string;
}

export interface LocalPriceCache {
  category: string;
  sub_category: string;
  district: string;
  current_price: number;
  market_range_low: number;
  market_range_high: number;
  informal_reference_price: number;
  trend_direction: 'up' | 'flat' | 'down';
  trend_slope: number;
  updated_at: string;
}

export interface LocalRecycler {
  recycler_id: string;
  name: string;
  facility_lat: number;
  facility_lng: number;
  service_radius_km: number;
  materials_accepted: string[];
  authorization_status: 'pending' | 'verified' | 'rejected' | 'suspended';
  authorization_ref_no: string;
  contact_phone: string;
  offered_rates: Record<string, number>;
  pickup_available: boolean;
}

export interface LocalTransaction {
  lot_id: string;
  collector_id: string;
  recycler_id?: string;
  status: 'draft' | 'quoted' | 'matched' | 'handed_over' | 'confirmed' | 'paid' | 'closed';
  quoted_price?: number;
  final_sale_value?: number;
  payment_method: 'cash' | 'upi' | 'pending';
  payment_status: 'unpaid' | 'paid';
  created_at: string;
  updated_at: string;
}

export interface SyncOutboxItem {
  id?: number;
  client_uuid: string;
  entity_type: 'material' | 'transaction' | 'traceability_event' | 'price_observation';
  action: 'upsert' | 'create';
  payload: any;
  created_at: string;
  synced: boolean;
}

export class KabadiwalaDatabase extends Dexie {
  materials!: Table<LocalMaterial, string>;
  priceCache!: Table<LocalPriceCache, string>;
  recyclers!: Table<LocalRecycler, string>;
  transactions!: Table<LocalTransaction, string>;
  syncOutbox!: Table<SyncOutboxItem, number>;

  constructor() {
    super('KabadiwalaConnectDB');
    this.version(1).stores({
      materials: 'lot_id, material_category, collector_id, created_at',
      priceCache: '[category+district], category, district',
      recyclers: 'recycler_id, authorization_status',
      transactions: 'lot_id, collector_id, status, payment_status',
      syncOutbox: '++id, client_uuid, entity_type, synced, created_at',
    });
  }
}

export const db = new KabadiwalaDatabase();

// Seed initial default local price cache so Price Board works completely offline on cold start
export async function seedLocalPriceCache() {
  const count = await db.priceCache.count();
  if (count === 0) {
    const seedPrices: LocalPriceCache[] = [
      { category: 'PCB', sub_category: 'Motherboard High Grade', district: 'Pune', current_price: 260.0, market_range_low: 240.0, market_range_high: 280.0, informal_reference_price: 210.0, trend_direction: 'up', trend_slope: 1.2, updated_at: new Date().toISOString() },
      { category: 'BATTERY', sub_category: 'Lithium-Ion Pack', district: 'Pune', current_price: 90.0, market_range_low: 80.0, market_range_high: 100.0, informal_reference_price: 75.0, trend_direction: 'flat', trend_slope: 0.1, updated_at: new Date().toISOString() },
      { category: 'CABLE', sub_category: 'Copper Heavy Duty', district: 'Pune', current_price: 150.0, market_range_low: 140.0, market_range_high: 170.0, informal_reference_price: 130.0, trend_direction: 'up', trend_slope: 0.8, updated_at: new Date().toISOString() },
      { category: 'LCD_PANEL', sub_category: 'Monitor Screen', district: 'Pune', current_price: 110.0, market_range_low: 95.0, market_range_high: 130.0, informal_reference_price: 90.0, trend_direction: 'flat', trend_slope: 0.0, updated_at: new Date().toISOString() },
      { category: 'CRT', sub_category: 'Television Glass', district: 'Pune', current_price: 40.0, market_range_low: 30.0, market_range_high: 50.0, informal_reference_price: 32.0, trend_direction: 'down', trend_slope: -0.6, updated_at: new Date().toISOString() },
      { category: 'MOTOR_MAGNET', sub_category: 'Copper Stator', district: 'Pune', current_price: 70.0, market_range_low: 60.0, market_range_high: 80.0, informal_reference_price: 58.0, trend_direction: 'flat', trend_slope: 0.2, updated_at: new Date().toISOString() },
      { category: 'MIXED_PLASTIC', sub_category: 'E-Waste Casing', district: 'Pune', current_price: 25.0, market_range_low: 20.0, market_range_high: 30.0, informal_reference_price: 18.0, trend_direction: 'flat', trend_slope: 0.0, updated_at: new Date().toISOString() },
    ];
    await db.priceCache.bulkPut(seedPrices);
  }
}
