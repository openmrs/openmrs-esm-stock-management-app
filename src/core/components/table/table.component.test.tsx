import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DataList from './table.component';

const columns = [{ key: 'name', header: 'Name' }];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DataList', () => {
  it('renders rows and updates them when data changes without an update depth error', () => {
    const consoleError = vi.spyOn(console, 'error');
    const { rerender } = render(<DataList columns={columns} data={[{ name: 'Aspirin' }, { name: 'Amoxicillin' }]} />);

    expect(screen.getByRole('cell', { name: 'Aspirin' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Amoxicillin' })).toBeInTheDocument();

    rerender(<DataList columns={columns} data={[{ name: 'Paracetamol' }, { name: 'Ibuprofen' }]} />);

    expect(screen.getByRole('cell', { name: 'Paracetamol' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ibuprofen' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Aspirin' })).not.toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Amoxicillin' })).not.toBeInTheDocument();
    expect(consoleError.mock.calls.flat().join(' ')).not.toMatch(/Maximum update depth/i);
  });

  it('stays on a valid page when data shrinks past the current page', async () => {
    const user = userEvent.setup();
    const data = Array.from({ length: 31 }, (_, index) => ({ name: `Item ${index + 1}` }));
    const { rerender } = render(<DataList columns={columns} data={data} />);

    for (let page = 1; page < 4; page++) {
      await user.click(screen.getByRole('button', { name: 'Next page' }));
    }
    expect(screen.getByRole('cell', { name: 'Item 31' })).toBeInTheDocument();

    rerender(<DataList columns={columns} data={data.slice(0, 11)} />);

    expect(screen.getByRole('cell', { name: 'Item 11' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Item 31' })).not.toBeInTheDocument();
  });

  it('handles missing and empty data', () => {
    const { rerender } = render(<DataList columns={columns} data={undefined} />);

    expect(screen.getByText('No data to display')).toBeInTheDocument();

    rerender(<DataList columns={columns} data={[]} />);

    expect(screen.getByText('No data to display')).toBeInTheDocument();
  });
});
