import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { launchWorkspace2, userHasAccess } from '@openmrs/esm-framework';
import { TASK_STOCKMANAGEMENT_REPORTS_MUTATE } from '../../constants';
import { ReportParameter } from '../ReportType';
import { useGetReports } from '../stock-reports.resource';
import StockReports from './stock-reports.component';

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

vi.mock('../stock-reports.resource', () => ({
  useGetReports: vi.fn(),
}));

vi.mock('../../utils', () => ({
  useHandleMutate: vi.fn().mockReturnValue(vi.fn()),
}));

// Writes a parameter the way the New Report form saves it
const param = (name: string, value: string, display = value) =>
  `param.${name}.value=${value}\r\nparam.${name}.value.desc=${display}\r\n`;

const mockReports = (report: Record<string, unknown>) =>
  (useGetReports as Mock).mockReturnValue({
    reports: [report],
    isLoading: false,
    currentPage: 1,
    pageSizes: [10],
    totalItems: 1,
    goTo: vi.fn(),
    currentPageSize: 10,
    setPageSize: vi.fn(),
  });

describe('StockReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens New Report with every parameter of the report when Copy is clicked', () => {
    (userHasAccess as Mock).mockReturnValue(true);
    mockReports({
      uuid: 'test-uuid-1234',
      batchJobType: 'Report',
      status: 'Completed',
      description: 'Expiry Forecast Report',
      dateCreated: '2026-11-12T10:00:00.000Z',
      endTime: '2026-11-12T10:05:00.000Z',
      expiration: '2026-12-12T10:00:00.000Z',
      parameters:
        'param.report=STOCK_EXPIRY_FORECAST_REPORT\r\n' +
        param(ReportParameter.Location, 'loc-uuid-5678', 'Main Pharmacy') +
        param(ReportParameter.ChildLocations, 'true', 'Yes') +
        param(ReportParameter.StartDate, '2026-01-01T00:00:00.000Z', '01-Jan-2026') +
        param(ReportParameter.EndDate, '2026-01-31T00:00:00.000Z', '31-Jan-2026') +
        param(ReportParameter.StockItemCategory, 'cat-uuid', 'Drugs') +
        param(ReportParameter.InventoryGroupBy, 'LocationStockItem', 'Location and stock item') +
        param(ReportParameter.StockItem, 'item-uuid', 'Paracetamol') +
        param(ReportParameter.Patient, 'patient-uuid', 'Jane Doe') +
        param(ReportParameter.Limit, '6') +
        param(ReportParameter.MostLeastMoving, 'LeastMoving', 'Least Moving') +
        param(ReportParameter.Fullfillment, 'Full,Partial', 'Full, Partial'),
    });

    render(<StockReports />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toBeEnabled();

    fireEvent.click(copyButton);

    expect(launchWorkspace2).toHaveBeenCalledTimes(1);
    expect(launchWorkspace2).toHaveBeenCalledWith('stock-reports-form-workspace', {
      model: {
        reportSystemName: 'STOCK_EXPIRY_FORECAST_REPORT',
        reportName: 'Expiry Forecast Report',
        locationUuid: 'loc-uuid-5678',
        location: 'Main Pharmacy',
        childLocations: true,
        startDate: new Date('2026-01-01T00:00:00.000Z'),
        endDate: new Date('2026-01-31T00:00:00.000Z'),
        stockItemCategoryConceptUuid: 'cat-uuid',
        stockItemCategory: 'Drugs',
        inventoryGroupBy: 'LocationStockItem',
        inventoryGroupByName: 'Location and stock item',
        stockItemUuid: 'item-uuid',
        stockItemName: 'Paracetamol',
        patientUuid: 'patient-uuid',
        patientName: 'Jane Doe',
        limit: 6,
        mostLeastMoving: 'LeastMoving',
        mostLeastMovingName: 'Least Moving',
        fullFillment: ['Full', 'Partial'],
      },
    });
  });

  it('disables the Copy button for users who cannot create reports', () => {
    // The user can view reports but does not have the create privilege
    (userHasAccess as Mock).mockImplementation((privilege: string) => privilege !== TASK_STOCKMANAGEMENT_REPORTS_MUTATE);
    mockReports({
      uuid: 'test-uuid-1234',
      batchJobType: 'Report',
      status: 'Completed',
      description: 'Expiry Forecast Report',
      dateCreated: '2026-11-12T10:00:00.000Z',
      parameters: 'param.report=STOCK_EXPIRY_FORECAST_REPORT\r\n',
    });

    render(<StockReports />);

    expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
  });
});