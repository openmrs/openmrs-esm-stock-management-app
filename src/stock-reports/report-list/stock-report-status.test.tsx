import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockReportStatus from './stock-report-status.component';
import { type BatchJob, BatchJobStatusCancelled } from '../../core/api/types/BatchJob';

const createCancelledJob = (overrides?: Partial<BatchJob> | { cancelledDate?: any }): BatchJob => ({
  uuid: 'job-1234',
  status: BatchJobStatusCancelled,
  cancelReason: 'Reason for cancellation',
  ...overrides,
});

describe('StockReportStatus', () => {
  it('renders cancelled status and reason without crashing when cancelledDate is undefined', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: undefined })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
  });

  it('renders cancelled status and reason without crashing when cancelledDate is null', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: null })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
  });

  it('renders cancelled status, formatted date, and reason when cancelledDate is present', () => {
    render(<StockReportStatus model={createCancelledJob({ cancelledDate: '2026-11-20T10:00:00.000Z' })} />);

    expect(screen.getByText('Cancelled:')).toBeInTheDocument();
    expect(screen.getByText(/20-Nov-2026/)).toBeInTheDocument();
    expect(screen.getByText('Reason for cancellation')).toBeInTheDocument();
  });
});
