import { act, renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGetReports } from './stock-reports.resource';

vi.mock('swr', () => ({ default: vi.fn() }));

const mockedUseSWR = vi.mocked(useSWR);

describe('useGetReports', () => {
  beforeEach(() => {
    mockedUseSWR.mockReturnValue({
      data: { data: { results: [], totalCount: 13 } },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as never);
  });

  const lastRequestUrl = () => mockedUseSWR.mock.calls.at(-1)?.[0];

  it('requests the first page and exposes the total count', () => {
    const { result } = renderHook(() => useGetReports());

    expect(lastRequestUrl()).toContain('/stockmanagement/batchjob');
    expect(lastRequestUrl()).toContain('limit=10');
    expect(lastRequestUrl()).toContain('startIndex=0');
    expect(result.current.totalItems).toBe(13);
  });

  it('sends the zero-based page index when paging', () => {
    const { result } = renderHook(() => useGetReports());

    act(() => result.current.goTo(2));

    expect(lastRequestUrl()).toContain('startIndex=1');
    expect(result.current.currentPage).toBe(2);
  });

  it('resets to the first page when the page size changes', () => {
    const { result } = renderHook(() => useGetReports());

    act(() => result.current.goTo(3));
    act(() => result.current.setPageSize(20));

    expect(lastRequestUrl()).toContain('limit=20');
    expect(lastRequestUrl()).toContain('startIndex=0');
    expect(result.current.currentPage).toBe(1);
  });
});
