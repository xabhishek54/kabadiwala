import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecyclerDashboardPage } from '../features/recyclerMode/RecyclerDashboardPage';
import '../i18n';

describe('RecyclerDashboardPage Component', () => {
  beforeEach(() => {
    window.localStorage.setItem('kabadiwala_user', JSON.stringify({
      role: 'recycler',
      id: 'recycler-test',
      name: 'Test Recycler',
    }));
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{
      lot_id: 'assigned-lot',
      category: 'PCB',
      sub_category: 'Board',
      weight_kg: 2,
      condition: 'intact',
      estimated_value: 500,
      collector_id: 'collector-test',
      status: 'matched',
      payment_status: 'unpaid',
      recycler_id: 'recycler-test',
    }]), { status: 200 })));
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('loads only the signed-in recycler queue from its scoped endpoint', async () => {
    render(
      <MemoryRouter>
        <RecyclerDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Test Recycler — Portal/i)).toBeInTheDocument();
    expect(await screen.findByText('assigned-lot')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/recyclers/recycler-test/lots'));

    const queueMatches = screen.getAllByText(/Incoming E-Waste Queue/i);
    expect(queueMatches.length).toBeGreaterThan(0);
  });
});
