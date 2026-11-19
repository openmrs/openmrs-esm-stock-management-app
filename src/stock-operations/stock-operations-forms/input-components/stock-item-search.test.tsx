import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { type StockItemDTO } from '../../../core/api/types/stockItem/StockItem';
import { useStockItems } from '../../../stock-items/stock-items.resource';
import StockItemSearch from './stock-item-search.component';

vi.mock('../../../stock-items/stock-items.resource', () => ({ useStockItems: vi.fn() }));

const item = (n: number) => ({ uuid: `item-${n}`, drugName: `Paracetamol ${n}00mg` } as StockItemDTO);

// Serves the result of whatever search the hook asks for
const mockSearch = (results: (q: string) => { results?: StockItemDTO[]; totalCount?: number; isLoading?: boolean }) =>
  vi.mocked(useStockItems).mockImplementation((filter) => {
    const { isLoading = false, ...items } = results(filter?.q ?? '');
    return { items, isLoading, error: null } as never;
  });

describe('StockItemSearch', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ useItemCommonNameAsDisplay: false });
  });

  it('shows that it is searching while the results load', async () => {
    const user = userEvent.setup();
    mockSearch(() => ({ isLoading: true }));
    render(<StockItemSearch />);

    await user.type(screen.getByRole('searchbox'), 'para');

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('says so when no item matches', async () => {
    const user = userEvent.setup();
    mockSearch(() => ({ results: [], totalCount: 0 }));
    render(<StockItemSearch />);

    await user.type(screen.getByRole('searchbox'), 'zzqq');

    expect(screen.getByText('No items match "zzqq"')).toBeInTheDocument();
  });

  it('shows the first five results and how many items match in all', async () => {
    const user = userEvent.setup();
    mockSearch((q) => (q ? { results: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(item), totalCount: 23 } : {}));
    render(<StockItemSearch />);

    await user.type(screen.getByRole('searchbox'), 'para');

    expect(screen.getByText('Paracetamol 100mg')).toBeInTheDocument();
    expect(screen.getByText('Paracetamol 500mg')).toBeInTheDocument();
    expect(screen.queryByText('Paracetamol 600mg')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 5 of 23 items. Keep typing to narrow the search.')).toBeInTheDocument();
  });

  it("doesn't show a count when every match is shown", async () => {
    const user = userEvent.setup();
    mockSearch(() => ({ results: [item(1), item(2)], totalCount: 2 }));
    render(<StockItemSearch />);

    await user.type(screen.getByRole('searchbox'), 'para');

    expect(screen.getByText('Paracetamol 200mg')).toBeInTheDocument();
    expect(screen.queryByText(/^Showing/)).not.toBeInTheDocument();
  });

  it("doesn't show an earlier search's results as the results of the new one", async () => {
    const user = userEvent.setup();
    // Results come back only for "para", as if the newer search hadn't loaded yet
    mockSearch((q) => (q === 'para' ? { results: [item(1)], totalCount: 1 } : { isLoading: q !== 'para' && q !== '' }));
    render(<StockItemSearch />);

    await user.type(screen.getByRole('searchbox'), 'para');
    expect(await screen.findByText('Paracetamol 100mg')).toBeInTheDocument();

    // The search box keeps focus, so this makes the search "parax"
    await user.keyboard('x');

    expect(await screen.findByText('Searching...')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('parax');
    expect(screen.queryByText('Paracetamol 100mg')).not.toBeInTheDocument();
  });
});
