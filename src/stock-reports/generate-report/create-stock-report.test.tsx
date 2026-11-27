import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import { createBatchJob } from '../../stock-batch/stock-batch.resource';
import { useConcept, useStockTagLocations } from '../../stock-lookups/stock-lookups.resource';
import { ReportParameter } from '../ReportType';
import { useReportTypes } from '../stock-reports.resource';
import CreateReport, { type ReportModel } from './create-stock-report.workspace';

vi.mock('../../stock-batch/stock-batch.resource', () => ({ createBatchJob: vi.fn() }));
vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(),
  useStockTagLocations: vi.fn(),
}));
vi.mock('../stock-reports.resource', () => ({ useReportTypes: vi.fn() }));
vi.mock('../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

type User = ReturnType<typeof userEvent.setup>;

const reportTypes = [
  {
    name: 'Stock Expiry Report',
    systemName: 'STOCK_EXPIRY_REPORT',
    parameters: ['StartDate', 'EndDate', 'Location'],
  },
  {
    name: 'Stock Forecast Report',
    systemName: 'STOCK_FORECAST_REPORT',
    parameters: ['StartDate', 'EndDate', 'Location', 'Limit'],
  },
  {
    name: 'Most Moving Items/Least Moving Items',
    systemName: 'MOST_LEAST_MOVING_STOCK_REPORT',
    parameters: ['StartDate', 'EndDate', 'Location', 'Limit'],
  },
];

const withReportTypes = (types: unknown) =>
  vi.mocked(useReportTypes).mockReturnValue({ reportTypes: types, isLoading: false } as never);

// Pass a model to open the form the way the Copy button does
const renderForm = (model?: ReportModel) => {
  const props = mockWorkspace2Props({});
  render(<CreateReport {...props} {...(model ? { workspaceProps: { model } } : {})} />);
  return props;
};

const selectReport = async (user: User, name: string) => {
  await user.click(screen.getByRole('combobox', { name: 'Report name' }));
  await user.click(screen.getByRole('option', { name }));
  // The report's fields appear once the form has processed the selection
  await screen.findByRole('combobox', { name: 'Location' });
};

const typeDate = (label: string, value: string) => {
  const input = screen.getByRole('textbox', { name: label });
  fireEvent.change(input, { target: { value } });
  // flatpickr commits a typed date on Enter
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
  return input;
};

const fillRequiredFields = async (user: User, reportName: string) => {
  await selectReport(user, reportName);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');
  typeDate('Start date', '01/01/2026');
  typeDate('End date', '31/01/2026');
};

const save = (user: User) => user.click(screen.getByRole('button', { name: /save/i }));

const getParameters = () => vi.mocked(createBatchJob).mock.calls[0][0].parameters as string;

// Dates are saved as the JSON form of a Date, the same way handleSave writes them
const dateParam = (date: Date) => JSON.stringify(date).replaceAll('"', '');

describe('CreateReport', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockItemCategoryUUID: 'category-uuid' });
    withReportTypes(reportTypes);
    vi.mocked(useConcept).mockReturnValue({ items: { answers: [] } } as never);
    vi.mocked(useStockTagLocations).mockReturnValue({
      stockLocations: [{ id: 'location-uuid', name: 'Main Store' }],
    } as never);
    vi.mocked(createBatchJob).mockResolvedValue({ status: 201 } as never);
  });

  describe('saving an incomplete form', () => {
    it('marks the missing fields and says what is missing', async () => {
      const user = userEvent.setup();
      renderForm();
      await selectReport(user, 'Stock Expiry Report');

      await save(user);

      expect(await screen.findByText(/Start Date is required/)).toBeInTheDocument();
      expect(screen.getByText(/End Date is required/)).toBeInTheDocument();
      expect(screen.getByText('Location is required')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Start date' })).toHaveAttribute('data-invalid', 'true');
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'error',
          subtitle: 'Complete the required fields: Start date, End date, Location',
        }),
      );
      expect(createBatchJob).not.toHaveBeenCalled();
    });

    it('marks the report name when no report is chosen', async () => {
      const user = userEvent.setup();
      renderForm();

      await save(user);

      expect(await screen.findByText('Report Name Required')).toBeInTheDocument();
      expect(createBatchJob).not.toHaveBeenCalled();
    });

    it('clears the location error once a location is chosen', async () => {
      const user = userEvent.setup();
      renderForm();
      await selectReport(user, 'Stock Expiry Report');
      await save(user);
      expect(await screen.findByText('Location is required')).toBeInTheDocument();

      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');

      await waitFor(() => expect(screen.queryByText('Location is required')).not.toBeInTheDocument());
    });
  });

  describe('Enter in a date field', () => {
    it('commits the date without submitting a form that is otherwise complete', async () => {
      const user = userEvent.setup();
      const { closeWorkspace } = renderForm();
      await selectReport(user, 'Stock Expiry Report');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');
      typeDate('Start date', '01/01/2026');

      const endDate = screen.getByRole('textbox', { name: 'End date' });
      await user.clear(endDate);
      await user.type(endDate, '31/01/2026{Enter}');

      await waitFor(() => expect(endDate).toHaveValue('31/01/2026'));
      expect(createBatchJob).not.toHaveBeenCalled();
      expect(closeWorkspace).not.toHaveBeenCalled();

      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain('param.EndDate.value.desc=31-Jan-2026');
    });
  });

  describe('Limit', () => {
    it('starts empty and sends what is typed as a number', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillRequiredFields(user, 'Most Moving Items/Least Moving Items');

      const limit = screen.getByRole('spinbutton', { name: 'Limit' });
      expect(limit).toHaveValue(null);

      await user.type(limit, '5');
      expect(limit).toHaveValue(5);

      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain('param.Limit.value=5\r\n');
    });

    it('uses the real default when a typed limit is cleared', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillRequiredFields(user, 'Stock Forecast Report');

      const limit = screen.getByRole('spinbutton', { name: 'Limit' });
      await user.type(limit, '5');
      await user.clear(limit);
      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain('param.Limit.value=4\r\n');
    });

    it('uses the real default when left empty', async () => {
      const user = userEvent.setup();
      renderForm();
      await fillRequiredFields(user, 'Stock Forecast Report');

      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain('param.Limit.value=4\r\n');
    });
  });

  describe('copying a report', () => {
    const startDate = new Date(2026, 0, 1);
    const endDate = new Date(2026, 0, 31);

    it('saves the same parameters as the report it was copied from', async () => {
      const user = userEvent.setup();
      renderForm({
        reportName: 'Stock Forecast Report',
        reportSystemName: 'STOCK_FORECAST_REPORT',
        locationUuid: 'location-uuid',
        location: 'Main Store',
        childLocations: false,
        startDate,
        endDate,
        limit: 6,
      });

      expect(await screen.findByRole('combobox', { name: 'Location' })).toHaveValue('location-uuid');
      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(vi.mocked(createBatchJob).mock.calls[0][0].description).toBe('Stock Forecast Report');
      const parameters = getParameters();
      expect(parameters).toContain('param.report=STOCK_FORECAST_REPORT');
      expect(parameters).toContain(`param.${ReportParameter.Location}.value=location-uuid`);
      expect(parameters).toContain(`param.${ReportParameter.Location}.value.desc=Main Store`);
      expect(parameters).toContain(`param.${ReportParameter.StartDate}.value=${dateParam(startDate)}`);
      expect(parameters).toContain(`param.${ReportParameter.StartDate}.value.desc=01-Jan-2026`);
      expect(parameters).toContain(`param.${ReportParameter.EndDate}.value=${dateParam(endDate)}`);
      expect(parameters).toContain(`param.${ReportParameter.EndDate}.value.desc=31-Jan-2026`);
      expect(parameters).toContain(`param.${ReportParameter.Limit}.value=6`);
    });

    it('shows the copied rank and sends it unchanged', async () => {
      const user = userEvent.setup();
      withReportTypes([
        {
          name: 'Ranked Report',
          systemName: 'RANKED_REPORT',
          parameters: [
            ReportParameter.StartDate,
            ReportParameter.EndDate,
            ReportParameter.Location,
            ReportParameter.MostLeastMoving,
          ],
        },
      ]);
      renderForm({
        reportName: 'Ranked Report',
        reportSystemName: 'RANKED_REPORT',
        locationUuid: 'location-uuid',
        location: 'Main Store',
        childLocations: false,
        startDate,
        endDate,
        mostLeastMoving: 'LeastMoving',
      });

      expect(await screen.findByRole('radio', { name: 'Least Moving' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Most moving' })).not.toBeChecked();
      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain(`param.${ReportParameter.MostLeastMoving}.value=LeastMoving`);
    });

    it('keeps the copied stock source and destination', async () => {
      const user = userEvent.setup();
      withReportTypes([
        {
          name: 'Movement Report',
          systemName: 'MOVEMENT_REPORT',
          parameters: [
            ReportParameter.StartDate,
            ReportParameter.EndDate,
            ReportParameter.Location,
            ReportParameter.StockSource,
            ReportParameter.StockSourceDestination,
          ],
        },
      ]);
      renderForm({
        reportName: 'Movement Report',
        reportSystemName: 'MOVEMENT_REPORT',
        locationUuid: 'location-uuid',
        location: 'Main Store',
        childLocations: false,
        startDate,
        endDate,
        stockSourceUuid: 'source-uuid',
        stockSource: 'Central Warehouse',
        stockSourceDestinationUuid: 'destination-uuid',
        stockSourceDestination: 'Ward Pharmacy',
      });

      await screen.findByRole('combobox', { name: 'Location' });
      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      const parameters = getParameters();
      expect(parameters).toContain(`param.${ReportParameter.StockSource}.value=source-uuid`);
      expect(parameters).toContain(`param.${ReportParameter.StockSource}.value.desc=Central Warehouse`);
      expect(parameters).toContain(`param.${ReportParameter.StockSourceDestination}.value=destination-uuid`);
      expect(parameters).toContain(`param.${ReportParameter.StockSourceDestination}.value.desc=Ward Pharmacy`);
    });
  });

  describe('a new report', () => {
    it('still sends the default grouping when "Inventory by" is left alone', async () => {
      const user = userEvent.setup();
      withReportTypes([
        {
          name: 'Stock Consumption Report',
          systemName: 'STOCK_CONSUMPTION_REPORT',
          parameters: [
            ReportParameter.StartDate,
            ReportParameter.EndDate,
            ReportParameter.Location,
            ReportParameter.InventoryGroupBy,
          ],
        },
      ]);
      renderForm();
      await fillRequiredFields(user, 'Stock Consumption Report');

      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      const parameters = getParameters();
      expect(parameters).toContain(`param.${ReportParameter.InventoryGroupBy}.value=LocationStockItemBatchNo`);
      expect(parameters).toContain(`param.${ReportParameter.InventoryGroupBy}.value.desc=Stock Item Batch Number`);
    });
  });
});