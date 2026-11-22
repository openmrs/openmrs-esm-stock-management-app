import React, { Suspense } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { useReactToPrint } from 'react-to-print';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import TransactionsBincardPrintPreviewModal from './transactions-print-bincard-preview.modal';

vi.mock('react-to-print', () => ({
  useReactToPrint: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);
const mockUseReactToPrint = vi.mocked(useReactToPrint);
const mockHandlePrint = vi.fn();
const mockOnClose = vi.fn();

const columns = [
  { key: 'date', header: 'Date' },
  { key: 'location', header: 'Location' },
  { key: 'transaction', header: 'Transaction' },
  { key: 'totalin', header: 'IN' },
  { key: 'totalout', header: 'OUT' },
  { key: 'batch', header: 'Batch' },
  { key: 'balance', header: 'Balance' },
  { key: 'reference', header: 'Reference' },
  { key: 'status', header: 'Status' },
];

const rows = [
  {
    id: 'transaction-1',
    date: '20-Oct-2026',
    location: 'Main Pharmacy',
    transaction: 'Receipt',
    totalin: '100',
    totalout: '',
    batch: 'BATCH-001',
    balance: '100 Tablet',
    reference: 'REC-0001',
    status: 'COMPLETED',
  },
  {
    id: 'transaction-2',
    date: '21-Oct-2026',
    location: 'Main Pharmacy',
    transaction: 'Patient Dispense',
    totalin: '',
    totalout: '20',
    batch: 'BATCH-001',
    balance: '80 Tablet',
    reference: '',
    status: '',
  },
];

const renderModal = () =>
  render(
    <Suspense fallback={null}>
      <TransactionsBincardPrintPreviewModal
        onClose={mockOnClose}
        title="Amoxicillin 500mg"
        columns={columns}
        data={rows}
      />
    </Suspense>,
  );

describe('TransactionsBincardPrintPreviewModal', () => {
  beforeEach(() => {
    mockUseConfig.mockImplementation((options) => {
      if (options?.externalModuleName) {
        throw new Promise(() => {});
      }
      return getDefaultsFromConfigSchema(configSchema) as ConfigObject;
    });
    mockUseReactToPrint.mockReturnValue(mockHandlePrint);
  });

  it('renders the title, item name and transaction rows', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: /print bin card/i })).toBeInTheDocument();
    expect(screen.getByText('Amoxicillin 500 Mg')).toBeInTheDocument();
    columns.forEach(({ header }) => expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument());
    expect(
      screen.getByRole('row', { name: /receipt 100 batch-001 100 tablet rec-0001 completed/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /patient dispense 20 batch-001 80 tablet/i })).toBeInTheDocument();
  });

  it('renders the header without a logo when none is configured', () => {
    renderModal();

    expect(screen.queryByRole('img', { name: /logo/i })).not.toBeInTheDocument();
    expect(screen.getByText(/bin card/i, { selector: 'p' })).toBeInTheDocument();
  });

  it('renders the configured logo', () => {
    mockUseConfig.mockReturnValue({
      ...getDefaultsFromConfigSchema(configSchema),
      logo: { src: '/logo.png', alt: 'Facility logo', name: null },
    } as ConfigObject);

    renderModal();

    expect(screen.getByRole('img', { name: 'Facility logo' })).toHaveAttribute('src', '/logo.png');
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

  it('closes when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows an error with a Close button when the preview fails to render', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <TransactionsBincardPrintPreviewModal
        onClose={mockOnClose}
        title="Amoxicillin 500mg"
        columns={columns}
        data={null}
      />,
    );

    expect(screen.getByText(/unable to load the print preview/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /close/i }).at(-1));
    expect(mockOnClose).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
