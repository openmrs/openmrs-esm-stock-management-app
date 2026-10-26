import React, { Suspense } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useReactToPrint } from 'react-to-print';
import { type FetchResponse, getDefaultsFromConfigSchema, openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import TransactionsStockcardPrintPreviewModal from './transactions-print-stockcard-preview.modal';

vi.mock('react-to-print', () => ({
  useReactToPrint: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockUseReactToPrint = vi.mocked(useReactToPrint);
const mockHandlePrint = vi.fn();
const mockOnClose = vi.fn();

const columns = [
  { key: 'patientName', header: 'Patient Name' },
  { key: 'date', header: 'Date' },
  { key: 'location', header: 'Location' },
  { key: 'transaction', header: 'Transaction' },
  { key: 'balance', header: 'Balance' },
  { key: 'totalout', header: 'OUT' },
  { key: 'batch', header: 'Batch' },
];

const transactions = [
  {
    uuid: 'transaction-1',
    dateCreated: '2026-10-21T08:00:00.000+0000',
    partyName: 'Main Pharmacy',
    isPatientTransaction: true,
    quantity: -2,
    packagingUomName: 'Tablet',
    packagingUomFactor: 10,
    stockBatchNo: 'BATCH-001',
    patientUuid: 'patient-1',
    balance: '80 Tablet',
  },
];

const renderModal = () =>
  render(
    <Suspense fallback={null}>
      <TransactionsStockcardPrintPreviewModal
        onClose={mockOnClose}
        title="Amoxicillin 500mg"
        columns={columns}
        data={transactions}
      />
    </Suspense>,
  );

describe('TransactionsStockcardPrintPreviewModal', () => {
  beforeEach(() => {
    mockUseConfig.mockImplementation((options) => {
      if (options?.externalModuleName) {
        throw new Promise(() => {});
      }
      return getDefaultsFromConfigSchema(configSchema) as ConfigObject;
    });
    mockOpenmrsFetch.mockResolvedValue({ data: { uuid: 'patient-1', display: 'John Doe' } } as FetchResponse);
    mockUseReactToPrint.mockReturnValue(mockHandlePrint);
  });

  it('renders the title, item name and patient dispensing rows', async () => {
    renderModal();

    expect(screen.getByRole('heading', { name: /print stock card/i })).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 500 Mg')).toBeInTheDocument();
    columns.forEach(({ header }) => expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument());
    expect(
      await screen.findByRole('row', { name: /john doe .* main pharmacy patient dispense 80 tablet 20 batch-001/i }),
    ).toBeInTheDocument();
  });

  it('renders the header without a logo when none is configured', () => {
    renderModal();

    expect(screen.queryByRole('img', { name: /logo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/stock card/i, { selector: 'p' })).toBeInTheDocument();
  });

  it('prints only the card content when Print is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /print/i }));

    expect(mockHandlePrint).toHaveBeenCalled();
    const { content } = mockUseReactToPrint.mock.calls.at(-1)[0];
    const printed = content() as HTMLElement;
    expect(printed).toHaveTextContent('Amoxicillin 500 Mg');
    expect(printed).not.toHaveTextContent(/cancel/i);
  });

  it('shows an error with a Close button when the preview fails to render', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <TransactionsStockcardPrintPreviewModal
        onClose={mockOnClose}
        title="Amoxicillin 500mg"
        columns={null}
        data={transactions}
      />,
    );

    expect(screen.getByText(/unable to load the print preview/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /close/i }).at(-1));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
