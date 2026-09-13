import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { PriceBoardPage } from '../features/priceBoard/PriceBoardPage';
import '../i18n';

describe('PriceBoardPage Component', () => {
  it('renders title and price board header', () => {
    render(
      <BrowserRouter>
        <PriceBoardPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/पुणे/i)).toBeInTheDocument();
  });
});
