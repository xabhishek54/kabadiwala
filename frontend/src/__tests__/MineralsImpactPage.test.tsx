import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MineralsImpactPage } from '../features/minerals/MineralsImpactPage';
import '../i18n';

describe('MineralsImpactPage Component', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders transaction-derived mineral estimates as estimates', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      unit: 'grams',
      district: 'Pune',
      total_e_waste_processed_kg: 12.5,
      estimate_basis: 'Theoretical material-composition factors; not measured recovery.',
      mineral_estimates: { copper: 2500 },
    }), { status: 200 })));

    render(
      <MemoryRouter>
        <MineralsImpactPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Critical Minerals Dashboard/i)).toBeInTheDocument();
    expect(await screen.findByText('2.50 kg')).toBeInTheDocument();
    expect(await screen.findByText('Estimated')).toBeInTheDocument();
    expect(screen.queryByText(/Traceable/i)).not.toBeInTheDocument();
  });

  it('shows an explicit empty state when no completed transactions exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      unit: 'grams',
      district: 'Pune',
      total_e_waste_processed_kg: 0,
      estimate_basis: 'Theoretical material-composition factors; not measured recovery.',
      mineral_estimates: { copper: 0 },
    }), { status: 200 })));

    render(
      <MemoryRouter>
        <MineralsImpactPage />
      </MemoryRouter>
    );
    expect(await screen.findByText(/No paid or completed transactions/i)).toBeInTheDocument();
  });
});
