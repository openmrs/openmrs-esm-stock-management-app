import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { mockWorkspace2Props } from '@mocks';
import { createBatchJob } from '../../stock-batch/stock-batch.resource';
import { useConcept, useStockTagLocations } from '../../stock-lookups/stock-lookups.resource';
import { useReportTypes } from '../stock-reports.resource';
import CreateReport from './create-stock-report.workspace';

vi.mock('../../stock-batch/stock-batch.resource', () => ({ createBatchJob: vi.fn() }));
vi.mock('../../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(),
  useStockTagLocations: vi.fn(),
}));
vi.mock('../stock-reports.resource', () => ({ useReportTypes: vi.fn() }));
vi.mock('../../utils', () => ({ useHandleMutate: vi.fn(() => vi.fn()) }));

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

const renderForm = () => {
  const props = mockWorkspace2Props({});
  render(<CreateReport {...props} />);
  return props;
};

const selectReport = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
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

const save = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /save/i }));

const getParameters = () => vi.mocked(createBatchJob).mock.calls[0][0].parameters as string;

describe('CreateReport', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ stockItemCategoryUUID: 'category-uuid' });
    vi.mocked(useReportTypes).mockReturnValue({ reportTypes, isLoading: false } as never);
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

  describe('typed dates', () => {
    it('keeps a typed date without needing Enter or a click away', async () => {
      const user = userEvent.setup();
      renderForm();
      await selectReport(user, 'Stock Expiry Report');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');

      fireEvent.change(screen.getByRole('textbox', { name: 'Start date' }), { target: { value: '01/01/2026' } });
      fireEvent.change(screen.getByRole('textbox', { name: 'End date' }), { target: { value: '31/01/2026' } });
      await save(user);

      await waitFor(() => expect(createBatchJob).toHaveBeenCalledTimes(1));
      expect(getParameters()).toContain('param.StartDate.value.desc=01-Jan-2026');
      expect(getParameters()).toContain('param.EndDate.value.desc=31-Jan-2026');
    });

    it.each(['31/12/2999', '31/02/2026'])('marks %s as invalid and does not save it', async (typedDate) => {
      const user = userEvent.setup();
      renderForm();
      await selectReport(user, 'Stock Expiry Report');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');
      fireEvent.change(screen.getByRole('textbox', { name: 'Start date' }), { target: { value: '01/01/2026' } });

      fireEvent.change(screen.getByRole('textbox', { name: 'End date' }), { target: { value: typedDate } });

      expect(
        await screen.findByText('Enter a valid date in the format DD/MM/YYYY that is not in the future'),
      ).toBeInTheDocument();

      await save(user);
      expect(createBatchJob).not.toHaveBeenCalled();
    });
  });

  describe('Limit', () => {
    const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>, reportName: string) => {
      await selectReport(user, reportName);
      await user.selectOptions(screen.getByRole('combobox', { name: 'Location' }), 'Main Store');
      typeDate('Start date', '01/01/2026');
      typeDate('End date', '31/01/2026');
    };

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
});
