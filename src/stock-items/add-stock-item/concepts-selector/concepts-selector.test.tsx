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
const supplyClassUuid = 'supply-class-uuid';
const gloves = { uuid: 'gloves-uuid', display: 'Gloves' };
const syringe = { uuid: 'syringe-uuid', display: 'Syringe' };
const diagnosis = { uuid: 'diagnosis-uuid', display: 'Glove allergy' };

const mockResults = (results: Array<object>, isLoading = false) =>
  mockUseConcepts.mockReturnValue({ items: { results }, isLoading } as ReturnType<typeof useConcepts>);

function ConceptsSelectorWrapper({
  defaultConceptUuid = '',
  initialConceptName,
  onConceptUuidChange,
  readOnly,
}: {
  defaultConceptUuid?: string;
  initialConceptName?: string;
  onConceptUuidChange?: Mock;
  readOnly?: boolean;
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
      readOnly={readOnly}
    />
  );
}

describe('ConceptsSelector', () => {
  beforeEach(() => {
    mockUseConfig.mockReturnValue({ nonDrugItemsConceptSetUUID: '', nonDrugItemsConceptClassUUID: supplyClassUuid });
    mockResults([]);
  });

  it('does not search until something is typed', () => {
    render(<ConceptsSelectorWrapper />);

    expect(mockUseConcepts).toHaveBeenLastCalledWith(expect.objectContaining({ name: '' }), false);
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

  it('searches by name within the configured class on the server when no concept set is configured', async () => {
    const user = userEvent.setup();
    mockResults([gloves, syringe]);
    render(<ConceptsSelectorWrapper />);

    await user.type(screen.getByRole('combobox'), 'test');

    // q ignores class, but the name search filters by class on the server
    const lastFilter = mockUseConcepts.mock.lastCall[0];
    expect(lastFilter).toMatchObject({ name: 'test', searchType: 'fuzzy', class: supplyClassUuid });
    expect(lastFilter).not.toHaveProperty('q');
    expect(lastFilter).not.toHaveProperty('memberOf');
    // The server has already filtered by class, so every result is listed
    expect(screen.getByRole('option', { name: 'Gloves' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Syringe' })).toBeInTheDocument();
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
    const { rerender } = render(<ConceptsSelectorWrapper onConceptUuidChange={onConceptUuidChange} />);

    const input = screen.getByRole('combobox');
    await user.type(input, 'glove');
    await user.click(screen.getByRole('option', { name: 'Gloves' }));

    expect(onConceptUuidChange).toHaveBeenCalledWith(expect.objectContaining({ uuid: 'gloves-uuid' }));

    // A later search that doesn't return the selected concept
    mockResults([syringe]);
    rerender(<ConceptsSelectorWrapper onConceptUuidChange={onConceptUuidChange} />);
    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(screen.getByRole('option', { name: 'Syringe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Gloves' })).toBeInTheDocument();
    expect(input).toHaveValue('Gloves');
  });

  it('displays the saved concept when editing', () => {
    render(<ConceptsSelectorWrapper defaultConceptUuid="syringe-uuid" initialConceptName="Syringe" />);

    expect(screen.getByRole('combobox')).toHaveValue('Syringe');
  });

  it("is read-only and doesn't search when the saved concept can't be changed", () => {
    render(<ConceptsSelectorWrapper defaultConceptUuid="syringe-uuid" initialConceptName="Syringe" readOnly />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Syringe');
    expect(input).toBeDisabled();
    expect(mockUseConcepts).toHaveBeenLastCalledWith(expect.anything(), false);
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
