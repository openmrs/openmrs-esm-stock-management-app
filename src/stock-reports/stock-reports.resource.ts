import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type ReportType } from './ReportType';
import { useState } from 'react';

export function useReportTypes() {
  const apiUrl = `${restBaseUrl}/stockmanagement/report?v=default`;
  const { data, error, isLoading } = useSWR<{ data: { results: ReportType[] } }, Error>(apiUrl, openmrsFetch);
  return {
    reportTypes: data?.data?.results ?? [],
    isLoading,
    error,
  };
}
export function useGetReports(enabled = true) {
  const pageSizes = [10, 20, 30, 40, 50];
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const apiUrl = `${restBaseUrl}/stockmanagement/batchjob?batchJobType=Report&v=default&limit=${currentPageSize}&startIndex=${
    currentPage - 1
  }&totalCount=true`;

  const { data, error, isLoading, mutate } = useSWR<{ data: { results?: any[]; totalCount?: number } }, Error>(
    enabled ? apiUrl : null,
    openmrsFetch,
    {
      refreshInterval: 15000,
      dedupingInterval: 10000,
    },
  );

  const goTo = (page: number) => setCurrentPage(page);
  const setPageSize = (pageSize: number) => {
    setCurrentPageSize(pageSize);
    setCurrentPage(1);
  };
  const reports = data?.data?.results ?? [];

  return {
    reports,
    isLoading,
    error,
    totalItems: data?.data?.totalCount ?? reports.length,
    currentPage,
    currentPageSize,
    goTo,
    pageSizes,
    setPageSize,
    mutate,
  };
}
