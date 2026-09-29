import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerRecycler } from '../data/remote/apiClient';

const registration = {
  name: 'Verified input facility',
  contact_phone: '9111111122',
  authorization_ref_no: 'MPCB-TEST-01',
  facility_lat: 18.52,
  facility_lng: 73.85,
  offered_rates: { PCB: 250 },
  materials_accepted: ['PCB'],
};

describe('registerRecycler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('preserves the backend pending-authorization status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      recycler_id: 'recycler-1',
      authorization_status: 'pending',
    }), { status: 201 })));

    await expect(registerRecycler(registration)).resolves.toMatchObject({
      recycler_id: 'recycler-1',
      authorization_status: 'pending',
    });
  });

  it('rejects registration failures instead of inventing a local recycler account', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ detail: 'service unavailable' }),
      { status: 503 },
    )));

    await expect(registerRecycler(registration)).rejects.toThrow('service unavailable');
  });
});
