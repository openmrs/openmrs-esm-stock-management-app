import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { useConfig } from '@openmrs/esm-framework';
import { requisitionOperationTypeMock } from '@mocks';
import { type StockOperationType } from '../../../core/api/types/stockOperation/StockOperationType';
import { type StockOperationItemDtoSchema } from '../../validation-schema';
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

function setupStep(tag: string) {
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
    form = useForm<StockOperationItemDtoSchema>();
    return (
      <FormProvider {...form}>
        <BaseOperationDetailsFormStep stockOperationType={stockOperationType} />
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
});
