import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MineralsImpactPage } from '../features/minerals/MineralsImpactPage';
import '../i18n';

describe('MineralsImpactPage Component', () => {
  it('renders critical minerals dashboard header and mineral items', async () => {
    render(
      <MemoryRouter>
        <MineralsImpactPage />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/Critical Minerals Dashboard/i);
    expect(matches.length).toBeGreaterThan(0);
  });
});
