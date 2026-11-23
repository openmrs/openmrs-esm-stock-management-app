import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { formatDate, parseDate } from '@openmrs/esm-framework';
import StockReportStatus from './stock-report-status.component';
import { type BatchJob, BatchJobStatusCancelled } from '../../core/api/types/BatchJob';

vi.mock('@openmrs/esm-framework', async () => {
  const actual = await vi.importActual<any>('@openmrs/esm-framework');
  return {
    ...actual,
    formatDate: vi.fn(() => 'Mocked formatted date'),
    parseDate: vi.fn((dateStr: string) => new Date(dateStr)),
  };
});

const mockFormatDate = vi.mocked(formatDate);
const mockParseDate = vi.mocked(parseDate);

const createCancelledJob = (overrides?: Partial<BatchJob> | { cancelledDate?: any }): BatchJob => ({
  uuid: 'job-1234',
  status: BatchJobStatusCancelled,
  cancelReason: 'Reason for cancellation',
  ...overrides,
});

describe('StockReportStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders cancelled status and reason without crashing when cancelledDate is undefined', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: undefined })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
    expect(mockFormatDate).not.toHaveBeenCalled();
  });

  it('renders cancelled status and reason without crashing when cancelledDate is null', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: null })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
    expect(mockFormatDate).not.toHaveBeenCalled();
  });

  it('renders cancelled status, formatted date, and reason when cancelledDate is present', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: '2024-10-08T12:00:00.000Z' })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText('Mocked formatted date')).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
    expect(mockParseDate).toHaveBeenCalledWith('2024-10-08T12:00:00.000Z');
    expect(mockFormatDate).toHaveBeenCalledWith(expect.any(Date), {
      time: true,
      mode: 'standard',
    });
  });
});
