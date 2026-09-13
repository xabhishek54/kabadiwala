import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VerifyPage } from '../features/verify/VerifyPage';
import '../i18n';

describe('VerifyPage Component', () => {
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
});
