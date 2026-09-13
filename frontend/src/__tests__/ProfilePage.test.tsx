import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from '../features/profile/ProfilePage';
import '../i18n';

describe('ProfilePage Component', () => {
  it('renders account structure and shop feriwala team section', () => {
    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/Account Structure/i);
    expect(matches.length).toBeGreaterThan(0);

    const badgeMatches = screen.getAllByText(/Authorized Collection Agent/i);
    expect(badgeMatches.length).toBeGreaterThan(0);
  });
});
