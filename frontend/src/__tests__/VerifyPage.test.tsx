import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VerifyPage } from '../features/verify/VerifyPage';
import '../i18n';

describe('VerifyPage Component', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders public verification portal header and search form', () => {
    render(
      <MemoryRouter initialEntries={['/verify']}>
        <Routes>
          <Route path="/verify" element={<VerifyPage />} />
        </Routes>
      </MemoryRouter>
    );

    const titleMatches = screen.getAllByText(/Public Verification Portal/i);
    expect(titleMatches.length).toBeGreaterThan(0);
  });

  it('does not report a record as verified when the lookup service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(
      <MemoryRouter initialEntries={['/verify']}>
        <Routes>
          <Route path="/verify" element={<VerifyPage />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter Lot ID/), {
      target: { value: 'test-badge' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    expect(await screen.findByText(/Verification is unavailable right now/)).toBeInTheDocument();
    expect(screen.queryByText(/Authorized Collection Agent — EcoRecycle India/)).not.toBeInTheDocument();
  });
});
