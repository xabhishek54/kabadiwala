import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecyclerDashboardPage } from '../features/recyclerMode/RecyclerDashboardPage';
import '../i18n';

describe('RecyclerDashboardPage Component', () => {
  it('renders recycler portal header and incoming queue', async () => {
    render(
      <MemoryRouter>
        <RecyclerDashboardPage />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/EcoRecycle India/i);
    expect(matches.length).toBeGreaterThan(0);

    const queueMatches = screen.getAllByText(/Incoming E-Waste Queue/i);
    expect(queueMatches.length).toBeGreaterThan(0);
  });
});
