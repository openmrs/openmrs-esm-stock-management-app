import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import {
  TASK_STOCKMANAGEMENT_STOCKOPERATIONS_APPROVE,
  TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE,
} from '../../constants';
import StockOperationTypesSelector from './stock-operation-types-selector.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

describe('StockOperationTypesSelector', () => {
  it('only offers the operation types the user can create', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockImplementation((url: string) =>
      Promise.resolve({
        data: url.includes('/stockmanagement/session')
          ? {
              privileges: [
                { privilege: TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE, operationType: 'receipt' },
                { privilege: TASK_STOCKMANAGEMENT_STOCKOPERATIONS_APPROVE, operationType: 'disposed' },
              ],
            }
          : {
              results: [
                { operationType: 'receipt', name: 'Receipt' },
                { operationType: 'disposed', name: 'Disposal' },
              ],
            },
      } as FetchResponse),
    );

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <StockOperationTypesSelector />
      </SWRConfig>,
    );
    await user.click(await screen.findByText(/Start New/));

    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(screen.queryByText('Disposal')).not.toBeInTheDocument();
  });
});
