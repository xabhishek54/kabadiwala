import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { RecyclerDashboardPage } from '../features/recyclerMode/RecyclerDashboardPage';
import '../i18n';

describe('RecyclerDashboardPage Component', () => {
  it('renders the compact recycler dashboard hub', () => {
    render(
      <MemoryRouter>
        <RecyclerDashboardPage />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/Recycler Dashboard/i);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText('Buying Rates')).toBeInTheDocument();
    expect(screen.getByText('Incoming Waste')).toBeInTheDocument();
  });

  it('renders the queue only on the incoming waste route', () => {
    render(
      <MemoryRouter initialEntries={['/recycler/queue']}>
        <RecyclerDashboardPage />
      </MemoryRouter>
    );

    const queueMatches = screen.getAllByText(/Incoming E-Waste Queue/i);
    expect(queueMatches.length).toBeGreaterThan(0);
  });
});
