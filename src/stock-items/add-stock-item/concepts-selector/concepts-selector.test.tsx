import React from 'react';
import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FieldValues, useForm } from 'react-hook-form';
import { useConfig } from '@openmrs/esm-framework';
import { useConcepts } from '../../../stock-lookups/stock-lookups.resource';
import ConceptsSelector from './concepts-selector.component';

vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useConcepts: vi.fn(),
}));

const mockUseConcepts = vi.mocked(useConcepts);
const mockUseConfig = vi.mocked(useConfig);

const conceptSetUuid = 'concept-set-uuid';
const gloves = { uuid: 'gloves-uuid', display: 'Gloves', conceptClass: { name: 'Medical supply' } };
const syringe = { uuid: 'syringe-uuid', display: 'Syringe', conceptClass: { name: 'Medical supply' } };
const diagnosis = { uuid: 'diagnosis-uuid', display: 'Glove allergy', conceptClass: { name: 'Diagnosis' } };

const mockResults = (results: Array<object>, isLoading = false) =>
  mockUseConcepts.mockReturnValue({ items: { results }, isLoading } as ReturnType<typeof useConcepts>);

function ConceptsSelectorWrapper({
  defaultConceptUuid = '',
  initialConceptName,
  onConceptUuidChange,
}: {
  defaultConceptUuid?: string;
  initialConceptName?: string;
  onConceptUuidChange?: Mock;
}) {
  const methods = useForm<FieldValues>({ defaultValues: { conceptUuid: defaultConceptUuid } });
  return (
    <ConceptsSelector
      name="conceptUuid"
      controllerName="conceptUuid"
      control={methods.control}
      title="Please Specify"
      placeholder="Choose an item"
      initialConceptName={initialConceptName}
      onConceptUuidChange={onConceptUuidChange}
    />
  );
}

describe('ConceptsSelector', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ nonDrugItemsConceptSetUUID: '' });
    mockResults([]);
  });

  it('does not search until something is typed', () => {
    render(<ConceptsSelectorWrapper />);

    expect(mockUseConcepts).toHaveBeenLastCalledWith(expect.objectContaining({ q: '' }), false);
  });

  it('searches the server within the configured concept set', async () => {
    const user = userEvent.setup();
    mockUseConfig.mockReturnValue({ nonDrugItemsConceptSetUUID: conceptSetUuid });
    render(<ConceptsSelectorWrapper />);

    await user.type(screen.getByRole('combobox'), 'syringe');

    expect(mockUseConcepts).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'syringe', memberOf: conceptSetUuid }),
      true,
    );
  });

  it('keeps every result from the configured concept set, whatever its class', async () => {
    const user = userEvent.setup();
    mockUseConfig.mockReturnValue({ nonDrugItemsConceptSetUUID: conceptSetUuid });
    mockResults([gloves, diagnosis]);
    render(<ConceptsSelectorWrapper />);

    await user.type(screen.getByRole('combobox'), 'glove');

    expect(screen.getByRole('option', { name: 'Gloves' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Glove allergy' })).toBeInTheDocument();
  });

  it('only keeps Medical supply concepts when no concept set is configured', async () => {
    const user = userEvent.setup();
    mockResults([gloves, diagnosis]);
    render(<ConceptsSelectorWrapper />);

    await user.type(screen.getByRole('combobox'), 'glove');

    const lastFilter = mockUseConcepts.mock.lastCall[0];
    expect(lastFilter).toMatchObject({ q: 'glove' });
    expect(lastFilter).not.toHaveProperty('memberOf');
    expect(screen.getByRole('option', { name: 'Gloves' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Glove allergy' })).not.toBeInTheDocument();
  });

  it('keeps the field usable and shows a searching indicator while loading', () => {
    mockResults([], true);
    render(<ConceptsSelectorWrapper />);

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByText('Searching...').length).toBeGreaterThan(0);
  });

  it('calls onConceptUuidChange and keeps the selection when later results do not include it', async () => {
    const user = userEvent.setup();
    const onConceptUuidChange = vi.fn();
    mockResults([gloves]);
    render(<ConceptsSelectorWrapper onConceptUuidChange={onConceptUuidChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'glove');
    await user.click(screen.getByRole('option', { name: 'Gloves' }));

    expect(onConceptUuidChange).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'gloves-uuid' }));

    mockResults([syringe]);
    await user.click(input);

    expect(input).toHaveValue('Gloves');
  });

  it('displays the saved concept when editing', () => {
    render(<ConceptsSelectorWrapper defaultConceptUuid="syringe-uuid" initialConceptName="Syringe" />);

    expect(screen.getByRole('combobox')).toHaveValue('Syringe');
  });

  it('clears the selection', async () => {
    const user = userEvent.setup();
    render(<ConceptsSelectorWrapper defaultConceptUuid="syringe-uuid" initialConceptName="Syringe" />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Syringe');

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(input).toHaveValue('');
  });
});
