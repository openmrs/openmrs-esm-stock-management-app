import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { type FetchResponse, openmrsFetch } from '@openmrs/esm-framework';
import TransactionsBincardPrintPreviewModal from './transactions-print-bincard-preview.modal';
import TransactionsStockcardPrintPreviewModal from './transactions-print-stockcard-preview.modal';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

/**
 * react-to-print copies the content into a hidden iframe appended to document.body and then calls
 * print() on the iframe's window. jsdom has no print dialog, so we replace print() on each appended
 * iframe and record what the iframe holds at the moment printing starts.
 */
function interceptPrinting() {
  const printedDocuments: Array<string> = [];
  const appendChild = document.body.appendChild.bind(document.body);

  vi.spyOn(document.body, 'appendChild').mockImplementation(<T extends Node>(node: T): T => {
    const appended = appendChild(node);
    if (node instanceof HTMLIFrameElement) {
      node.contentWindow.print = () => {
        printedDocuments.push(node.contentDocument.body.textContent ?? '');
      };
    }
    return appended;
  });

  return printedDocuments;
}

describe('Transactions print preview modals', () => {
  let printedDocuments: Array<string>;

  beforeEach(() => {
    printedDocuments = interceptPrinting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Bin card', () => {
    const columns = [
      { key: 'date', header: 'Date' },
      { key: 'location', header: 'Location' },
      { key: 'quantity', header: 'Quantity' },
    ];
    const data = [
      { id: 'tx-1', date: '01/Oct/2026', location: 'Main Pharmacy', quantity: '40 Tablet' },
      { id: 'tx-2', date: '02/Oct/2026', location: 'Outpatient Store', quantity: '-5 Tablet' },
    ];

    it('prints only the bin card content when Print is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <TransactionsBincardPrintPreviewModal
          onClose={onClose}
          title="paracetamol 500mg"
          columns={columns}
          data={data}
          binOrStockCard={1}
        />,
      );

      expect(screen.getByText('Paracetamol 500 Mg')).toBeInTheDocument();
      expect(screen.getByText('Outpatient Store')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /print/i }));

      await waitFor(() => expect(printedDocuments).toHaveLength(1), { timeout: 3000 });

      const printed = printedDocuments[0];
      expect(printed).toContain('Bin card');
      expect(printed).toContain('Paracetamol 500 Mg');
      ['Date', 'Location', 'Quantity'].forEach((header) => expect(printed).toContain(header));
      ['01/Oct/2026', 'Main Pharmacy', '40 Tablet', '02/Oct/2026', 'Outpatient Store', '-5 Tablet'].forEach((cell) =>
        expect(printed).toContain(cell),
      );
      expect(printed).toContain('electronically generated');
      // The modal's own header and footer are not part of the printout
      expect(printed).not.toContain('Print Bin Card');
      expect(printed).not.toContain('Cancel');

      // Printing leaves the preview open
      expect(onClose).not.toHaveBeenCalled();
    });

    it('closes without printing when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <TransactionsBincardPrintPreviewModal
          onClose={onClose}
          title="paracetamol 500mg"
          columns={columns}
          data={data}
          binOrStockCard={1}
        />,
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(printedDocuments).toHaveLength(0);
    });
  });

  describe('Stock card', () => {
    const columns = [
      { key: 'patientName', header: 'Patient Name' },
      { key: 'transaction', header: 'Transaction' },
      { key: 'balance', header: 'Balance' },
      { key: 'totalout', header: 'OUT' },
      { key: 'batch', header: 'Batch' },
    ];
    const data = [
      {
        uuid: 'tx-1',
        dateCreated: '2026-10-01T10:00:00.000+0000',
        partyName: 'Main Pharmacy',
        isPatientTransaction: true,
        patientUuid: 'patient-uuid-1',
        quantity: -3,
        packagingUomName: 'Tablet',
        packagingUomFactor: 10,
        stockBatchNo: 'BATCH-001',
        balance: '37 Tablet',
      },
    ];

    beforeEach(() => {
      mockOpenmrsFetch.mockResolvedValue({ data: { display: 'Jane Wanjiru' } } as FetchResponse);
    });

    it('prints the stock card, including patient names fetched for dispense rows', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(
        <TransactionsStockcardPrintPreviewModal onClose={onClose} title="amoxicillin" columns={columns} data={data} />,
      );

      await screen.findByText('Jane Wanjiru');
      expect(mockOpenmrsFetch).toHaveBeenCalledWith(expect.stringContaining('/patient/patient-uuid-1?v=custom:'));

      await user.click(screen.getByRole('button', { name: /print/i }));

      await waitFor(() => expect(printedDocuments).toHaveLength(1), { timeout: 3000 });

      const printed = printedDocuments[0];
      expect(printed).toContain('Stock card');
      expect(printed).toContain('Amoxicillin');
      ['Patient Name', 'Transaction', 'Balance', 'OUT', 'Batch'].forEach((header) => expect(printed).toContain(header));
      ['Jane Wanjiru', 'Patient Dispense', '37 Tablet', '30', 'BATCH-001'].forEach((cell) =>
        expect(printed).toContain(cell),
      );
      expect(printed).toContain('electronically generated');
      expect(printed).not.toContain('Print Stock Card');
      expect(printed).not.toContain('Cancel');

      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
