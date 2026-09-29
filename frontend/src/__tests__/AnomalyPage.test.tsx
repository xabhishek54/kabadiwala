import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AnomalyPage } from '../features/admin/AnomalyPage';
import i18n from '../i18n';

describe('AnomalyPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports service failures instead of displaying fabricated anomalies', async () => {
    await i18n.changeLanguage('en');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<MemoryRouter><AnomalyPage /></MemoryRouter>);

    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
    expect(screen.queryByText(/lot-flagged-/i)).not.toBeInTheDocument();
  });

  it('updates the review state only after the backend confirms it', async () => {
    await i18n.changeLanguage('en');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return new Response('{}', { status: 200 });
      return new Response(JSON.stringify([{
        lot_id: 'real-lot-1',
        collector_id: 'collector-1',
        category: 'PCB',
        weight_kg: 1,
        condition: 'intact',
        unit_price_per_kg: 500,
        category_median_price: 100,
        modified_z_score: 4,
        severity: 'high',
        reasons: ['Price exceeds the category median'],
        recommended_action: 'Review this transaction manually.',
        audit_status: 'open',
      }]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter><AnomalyPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark Reviewed' }));

    await waitFor(() => expect(screen.getByText('Reviewed this session')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/admin/anomalies/real-lot-1/resolve'),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });
});
