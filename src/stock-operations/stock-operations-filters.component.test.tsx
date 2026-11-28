import React from 'react';
import { vi, describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { StockFilters } from '../constants';
import StockOperationsFilters from './stock-operations-filters.component';

const mockConcept = { answers: [] };

vi.mock('../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(() => ({ items: mockConcept, isLoading: false })),
  getStockOperationTypes: vi.fn(() => Promise.resolve({ data: { results: [] } })),
}));

describe('StockOperationsFilters', () => {
  it('shows readable status labels instead of raw enum values', async () => {
    const user = userEvent.setup();

    render(<StockOperationsFilters filterName={StockFilters.STATUS} onFilterChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.queryByText('SUBMITTED')).not.toBeInTheDocument();
  });
});
