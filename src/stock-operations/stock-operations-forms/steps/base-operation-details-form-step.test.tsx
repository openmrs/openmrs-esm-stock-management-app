import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import dayjs from 'dayjs';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { OpenmrsDatePicker, useConfig } from '@openmrs/esm-framework';
import { requisitionOperationTypeMock } from '@mocks';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { operationFromString } from '../../../core/api/types/stockOperation/StockOperationType';
import { getStockOperationFormSchema, type StockOperationItemDtoSchema } from '../../validation-schema';
import useParties from '../hooks/useParties';
import BaseOperationDetailsFormStep from './base-operation-details-form-step';

vi.mock('../hooks/useParties', () => ({ default: vi.fn() }));
vi.mock('../hooks/useOperationTypePermisions', () => ({ default: vi.fn(() => ({})) }));
vi.mock('../input-components/users-selector.component', () => ({ default: () => null }));
vi.mock('../input-components/stock-operation-reason-selector.component', () => ({ default: () => null }));

const stockOperationType = {
  ...requisitionOperationTypeMock,
  hasSource: true,
  hasDestination: true,
} as unknown as StockOperationType;

function setupStep(tag: string, { onNext }: { onNext?: () => void } = {}) {
  vi.mocked(useParties).mockReturnValue({
    sourceTags: [tag],
    destinationTags: [tag],
    sourceParties: [{ uuid: 'source-party-uuid' }],
    destinationParties: [{ uuid: 'destination-party-uuid' }],
    isLoading: false,
    error: undefined,
  } as never);

  let form: UseFormReturn<StockOperationItemDtoSchema>;
  const Wrapper = () => {
    form = useForm<StockOperationItemDtoSchema>({
      mode: 'all',
      resolver: zodResolver(getStockOperationFormSchema(operationFromString(stockOperationType.operationType))),
    });
    return (
      <FormProvider {...form}>
        <BaseOperationDetailsFormStep stockOperationType={stockOperationType} onNext={onNext} />
      </FormProvider>
    );
  };
  render(<Wrapper />);
  return form;
}

describe('BaseOperationDetailsFormStep', () => {
  beforeEach(() => {
    vi.mocked(useConfig).mockReturnValue({ mainStoreLocationTag: 'Central Store' });
  });

  it('prefills the source and destination when the only allowed tag is the configured main store tag', () => {
    const form = setupStep('Central Store');

    expect(form.getValues('sourceUuid')).toBe('source-party-uuid');
    expect(form.getValues('destinationUuid')).toBe('destination-party-uuid');
  });

  it('does not prefill the source and destination for any other tag', () => {
    const form = setupStep('Main Store');

    expect(form.getValues('sourceUuid')).toBeUndefined();
    expect(form.getValues('destinationUuid')).toBeUndefined();
  });

  describe('operation date', () => {
    it('does not let the picker choose a date after today', () => {
      setupStep('Main Store');

      expect(vi.mocked(OpenmrsDatePicker).mock.lastCall[0]).toEqual(
        expect.objectContaining({ maxDate: dayjs().startOf('day').toDate() }),
      );
    });

    it('marks a future date as invalid on the field and stays on the details step', async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      setupStep('Main Store', { onNext });

      fireEvent.change(screen.getByLabelText('Operation Date'), {
        target: { value: dayjs().add(1, 'day').format('YYYY-MM-DD') },
      });

      expect(await screen.findByText('Operation date must not be in the future')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /next/i }));
      expect(onNext).not.toHaveBeenCalled();
    });

    it('accepts today', async () => {
      const form = setupStep('Main Store');

      fireEvent.change(screen.getByLabelText('Operation Date'), {
        target: { value: dayjs().format('YYYY-MM-DD') },
      });

      await waitFor(() => expect(form.getValues('operationDate')).toEqual(dayjs().startOf('day').toDate()));
      expect(screen.queryByText('Operation date must not be in the future')).not.toBeInTheDocument();
    });
  });
});
