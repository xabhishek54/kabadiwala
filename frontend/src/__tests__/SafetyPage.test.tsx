import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { SafetyPage } from '../features/safety/SafetyPage';
import '../i18n';

describe('SafetyPage Component', () => {
  it('renders safety cards and title correctly', () => {
    render(
      <MemoryRouter>
        <SafetyPage />
      </MemoryRouter>
    );

    const matches = screen.getAllByText(/सुरक्षा निर्देश/i);
    expect(matches.length).toBeGreaterThan(0);

    const batteryMatches = screen.getAllByText(/बैटरी/i);
    expect(batteryMatches.length).toBeGreaterThan(0);
  });
});
