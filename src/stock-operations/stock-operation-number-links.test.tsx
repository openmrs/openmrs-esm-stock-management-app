import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { launchWorkspace2 } from '@openmrs/esm-framework';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import { useStockOperationAndItems } from './stock-operations.resource';
import StockOperationReference from './stock-operation-reference.component';
import StockOperationRelatedLink from './stock-operations-forms/stock-operation-related-link.component';

vi.mock('../stock-lookups/stock-lookups.resource', () => ({ useStockOperationTypes: vi.fn() }));
vi.mock('./stock-operations.resource', () => ({ useStockOperationAndItems: vi.fn() }));

const operation = { uuid: 'op-uuid', operationNumber: 'SIS-0007', operationTypeUuid: 'issue-type' };

describe.each([
  ['the transaction reference', () => <StockOperationReference operationUuid="op-uuid" operationNumber="SIS-0007" />],
  [
    'the related operation link',
    () => <StockOperationRelatedLink stockOperationUuid="op-uuid" operationNumber="SIS-0007" />,
  ],
])('The operation number in %s', (_, renderLink) => {
  beforeEach(() => {
    vi.mocked(useStockOperationTypes).mockReturnValue({
      types: { results: [{ uuid: 'issue-type', name: 'Stock Issue' }] },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useStockOperationAndItems).mockReturnValue({ items: operation, isLoading: false, error: null } as never);
    vi.mocked(launchWorkspace2).mockClear();
  });

  it('can be reached with Tab and opens the operation with Enter', async () => {
    const user = userEvent.setup();
    render(renderLink());

    await user.tab();
    expect(screen.getByRole('button', { name: 'SIS-0007' })).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(launchWorkspace2).toHaveBeenCalledWith(
      'stock-operation-form-workspace',
      expect.objectContaining({ stockOperation: operation }),
    );
  });
});
