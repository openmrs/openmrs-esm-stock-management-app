import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceRepresentation } from '../core/api/api';
import { OperationType } from '../core/api/types/stockOperation/StockOperationType';
import { useStockOperationTypes } from '../stock-lookups/stock-lookups.resource';
import { useStockOperationsByType } from './stock-home-operations.resource';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('../stock-lookups/stock-lookups.resource', () => ({ useStockOperationTypes: vi.fn() }));

const mockedUseSWR = vi.mocked(useSWR);
const mockedUseStockOperationTypes = vi.mocked(useStockOperationTypes);

describe('useStockOperationsByType', () => {
  beforeEach(() => {
    mockedUseStockOperationTypes.mockReturnValue({
      types: {
        results: [
          { uuid: 'stock-issue-uuid', operationType: OperationType.STOCK_ISSUE_OPERATION_TYPE },
          { uuid: 'disposed-uuid', operationType: OperationType.DISPOSED_OPERATION_TYPE },
        ],
      },
      isLoading: false,
      error: undefined,
    } as never);
    mockedUseSWR.mockReturnValue({
      data: { data: { results: [], totalCount: 0 } },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);
  });

  it('filters by operation type and status on the server', () => {
    renderHook(() =>
      useStockOperationsByType(
        { v: ResourceRepresentation.Full, totalCount: true },
        OperationType.STOCK_ISSUE_OPERATION_TYPE,
        'NEW,SUBMITTED',
      ),
    );

    const requestUrl = mockedUseSWR.mock.calls.at(-1)?.[0] as string;

    expect(requestUrl).toContain('/stockmanagement/stockoperation?');
    expect(requestUrl).toContain('operationTypeUuid=stock-issue-uuid');
    expect(requestUrl).toContain('status=NEW%2CSUBMITTED');
  });

  it('uses an all-pages request for disposal counts', () => {
    renderHook(() => useStockOperationsByType({}, OperationType.DISPOSED_OPERATION_TYPE, 'COMPLETED', true));

    const requestKey = mockedUseSWR.mock.calls.at(-1)?.[0] as string;

    expect(requestKey).toMatch(/^all:/);
    expect(requestKey).toContain('operationTypeUuid=disposed-uuid');
    expect(requestKey).toContain('status=COMPLETED');
  });
});
