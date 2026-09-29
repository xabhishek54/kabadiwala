import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '../data/local/db';
import { LotCreationPage } from '../features/lotCreation/LotCreationPage';
import i18n from '../i18n';

describe('LotCreationPage', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.materials, db.transactions, db.syncOutbox, async () => {
      await db.materials.clear();
      await db.transactions.clear();
      await db.syncOutbox.clear();
    });
    window.localStorage.clear();
    window.localStorage.setItem('kabadiwala_user', JSON.stringify({ id: 'collector-lot-test' }));
    window.localStorage.setItem('kabadiwala_district', 'Pune');
    await i18n.changeLanguage('en');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      base_price_per_kg: 260,
      condition_multiplier: 1,
      weight_kg: 1,
      deterministic_total: 260,
      ml_adjustment: 0,
      refined_total: 260,
      market_low: 240,
      market_high: 280,
      ml_confidence: 0,
      sample_count: 0,
      district: 'Pune',
    }), { status: 200 })));
  });

  it('saves a complete lot and a correctly shaped sync item without a photo', async () => {
    render(
      <MemoryRouter initialEntries={['/create-lot']}>
        <Routes>
          <Route path="/create-lot" element={<LotCreationPage />} />
          <Route path="/ledger" element={<div>Ledger</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue without Photo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next \(Enter Weight\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /View Valuation Breakdown/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Save Lot Only/ }));

    await screen.findByText('Ledger');
    const materials = await db.materials.toArray();
    const transactions = await db.transactions.toArray();
    const outbox = await db.syncOutbox.toArray();

    expect(materials).toHaveLength(1);
    expect(materials[0]).toMatchObject({
      material_category: 'PCB',
      approx_weight_kg: 1,
      condition: 'intact',
      source_type: 'household',
      collector_id: 'collector-lot-test',
    });
    expect(transactions[0]).toMatchObject({ status: 'quoted', payment_status: 'unpaid' });
    expect(outbox[0].payload).toMatchObject({
      lot_id: materials[0].lot_id,
      material_category: 'PCB',
      approx_weight_kg: 1,
      sub_category: 'Motherboard',
      estimated_value: 260,
    });
    expect(materials[0].lot_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('keeps the collector on the form when a local database save fails', async () => {
    const addSpy = vi.spyOn(db.materials, 'add').mockRejectedValueOnce(new Error('storage full'));
    render(
      <MemoryRouter initialEntries={['/create-lot']}>
        <Routes>
          <Route path="/create-lot" element={<LotCreationPage />} />
          <Route path="/ledger" element={<div>Ledger</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Continue without Photo/ }));
    fireEvent.click(screen.getByRole('button', { name: /Next \(Enter Weight\)/ }));
    fireEvent.click(screen.getByRole('button', { name: /View Valuation Breakdown/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Save Lot Only/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save this lot');
    expect(screen.queryByText('Ledger')).not.toBeInTheDocument();
    addSpy.mockRestore();
  });
});
