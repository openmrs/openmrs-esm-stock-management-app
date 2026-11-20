import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import {
  TASK_STOCKMANAGEMENT_STOCKOPERATIONS_APPROVE,
  TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE,
} from '../../../constants';
import useFilteredOperationTypesByRoles from './useFilteredOperationTypesByRoles';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const receipt = { uuid: 'receipt-type-uuid', name: 'Receipt' };
const disposal = { uuid: 'disposal-type-uuid', name: 'Disposal' };
const transferOut = { uuid: 'transfer-out-type-uuid', name: 'Transfer Out' };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useFilteredOperationTypesByRoles', () => {
  it("lists the operation types in all of a non-admin user's scopes", async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/stockmanagement/stockoperationtype')) {
        return Promise.resolve({ data: { results: [receipt, disposal, transferOut] } } as FetchResponse);
      }
      if (url.includes('/stockmanagement/session')) {
        return Promise.resolve({
          data: {
            privileges: [
              { privilege: 'Task: stockmanagement.stockoperations.mutate', operationTypeUuid: receipt.uuid },
              { privilege: 'Task: stockmanagement.stockoperations.mutate', operationTypeUuid: disposal.uuid },
            ],
          },
        } as FetchResponse);
      }
      // Only Inventory Administrators can list role scopes.
      return Promise.reject(new Error('403 Forbidden'));
    });

    const { result } = renderHook(() => useFilteredOperationTypesByRoles(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.operationTypes.map((type) => type.name)).toEqual(['Receipt', 'Disposal']);
  });

  it('only counts scopes that grant the requested privilege', async () => {
    mockOpenmrsFetch.mockImplementation((url: string) => {
      if (url.includes('/stockmanagement/stockoperationtype')) {
        return Promise.resolve({ data: { results: [receipt, disposal, transferOut] } } as FetchResponse);
      }
      return Promise.resolve({
        data: {
          privileges: [
            { privilege: TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE, operationTypeUuid: receipt.uuid },
            { privilege: TASK_STOCKMANAGEMENT_STOCKOPERATIONS_APPROVE, operationTypeUuid: disposal.uuid },
          ],
        },
      } as FetchResponse);
    });

    const { result: mutable } = renderHook(
      () => useFilteredOperationTypesByRoles(TASK_STOCKMANAGEMENT_STOCKOPERATIONS_MUTATE),
      { wrapper },
    );
    const { result: viewable } = renderHook(() => useFilteredOperationTypesByRoles(), { wrapper });

    await waitFor(() => expect(mutable.current.isLoading).toBe(false));
    await waitFor(() => expect(viewable.current.isLoading).toBe(false));

    expect(mutable.current.operationTypes.map((type) => type.name)).toEqual(['Receipt']);
    expect(viewable.current.operationTypes.map((type) => type.name)).toEqual(['Receipt', 'Disposal']);
  });
});
