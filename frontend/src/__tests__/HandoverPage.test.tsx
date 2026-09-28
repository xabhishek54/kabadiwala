import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HandoverPage } from '../features/handover/HandoverPage';
import '../i18n';

describe('HandoverPage Component', () => {
  it('renders loading state when no material in IndexedDB', () => {
    render(
      <MemoryRouter initialEntries={['/handover/test-lot-001']}>
        <Routes>
          <Route path="/handover/:lotId" element={<HandoverPage />} />
        </Routes>
      </MemoryRouter>
    );
    // With no seeded IndexedDB, the page renders its loading state
    expect(screen.getByText(/Loading lot details...|Loading/i)).toBeInTheDocument();
  });
});
