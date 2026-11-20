import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import StockReports from './stock-reports.component';
import { launchWorkspace2, userHasAccess } from '@openmrs/esm-framework';
import { useGetReports } from '../stock-reports.resource';
import { TASK_STOCKMANAGEMENT_REPORTS_MUTATE } from '../../constants';

// 1. Mock the ESM framework dependencies using Vitest's vi.mock
vi.mock('@openmrs/esm-framework', async () => {
  const actual = await vi.importActual<any>('@openmrs/esm-framework');
  return {
    ...actual,
    launchWorkspace2: vi.fn(),
    userHasAccess: vi.fn(),
    useSession: vi.fn().mockReturnValue({ user: {} }),
    isDesktop: true,
    restBaseUrl: '/ws/rest/v1',
  };
});

// 2. Mock the API resource hook
vi.mock('../stock-reports.resource', () => ({
  useGetReports: vi.fn(),
}));

// 3. Mock the mutate handler util
vi.mock('../../utils', () => ({
  useHandleMutate: vi.fn().mockReturnValue(vi.fn()),
}));

describe('StockReports Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse batchJob parameters and call launchWorkspace2 when Copy button is clicked', () => {
    // Grant both view and create permissions
    (userHasAccess as Mock).mockReturnValue(true);

    const mockReport = {
      uuid: 'test-uuid-1234',
      batchJobType: 'Report',
      status: 'Completed',
      description: 'Expiry Forecast Report',
      dateCreated: '2026-11-12T10:00:00.000Z',
      endTime: '2026-11-12T10:05:00.000Z',
      expiration: '2026-12-12T10:00:00.000Z',
      parameters:
        'param.report=STOCK_EXPIRY_FORECAST_REPORT\r\nparam.Location.value=loc-uuid-5678\r\nparam.Location.display=Main Pharmacy\r\nparam.Location.description=Location\r\n',
    };

    (useGetReports as Mock).mockReturnValue({
      reports: [mockReport],
      isLoading: false,
      currentPage: 1,
      pageSizes: [10],
      totalItems: 1,
      goTo: vi.fn(),
      currentPageSize: 10,
      setPageSize: vi.fn(),
    });

    render(<StockReports />);

    // Query using Testing Library's recommended screen queries (fully ESLint compliant)
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toBeEnabled();

    // Trigger the clone action
    fireEvent.click(copyButton);

    // Assert the workspace was launched with the correct parameters mapped into the model
    expect(launchWorkspace2).toHaveBeenCalledTimes(1);
    expect(launchWorkspace2).toHaveBeenCalledWith('stock-reports-form-workspace', {
      model: expect.objectContaining({
        reportSystemName: 'STOCK_EXPIRY_FORECAST_REPORT',
        reportName: 'Expiry Forecast Report',
        locationUuid: 'loc-uuid-5678',
        location: 'Main Pharmacy',
      }),
    });
  });

  it('should disable the Copy button if user lacks create permissions', () => {
    // Mock user having VIEW permission but NOT CREATE permission
    (userHasAccess as Mock).mockImplementation((privilege: string) => privilege !== TASK_STOCKMANAGEMENT_REPORTS_MUTATE);

    const mockReport = {
      uuid: 'test-uuid-1234',
      batchJobType: 'Report',
      status: 'Completed',
      description: 'Expiry Forecast Report',
      dateCreated: '2026-11-12T10:00:00.000Z',
      parameters: 'param.report=STOCK_EXPIRY_FORECAST_REPORT\r\n',
    };

    (useGetReports as Mock).mockReturnValue({
      reports: [mockReport],
      isLoading: false,
      currentPage: 1,
      pageSizes: [10],
      totalItems: 1,
    });

    render(<StockReports />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeInTheDocument();
    expect(copyButton).toBeDisabled();
  });
});
