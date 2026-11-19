import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type FieldValues, useForm } from 'react-hook-form';
import { useConfig } from '@openmrs/esm-framework';
import { type Concept } from '../../../core/api/types/concept/Concept';
import { useConcept } from '../../../stock-lookups/stock-lookups.resource';
import StockItemCategorySelector from './stock-item-category-selector.component';

vi.mock('../../../stock-lookups/stock-lookups.resource', () => ({
  useConcept: vi.fn(),
}));

const mockUseConcept = vi.mocked(useConcept);
const mockUseConfig = vi.mocked(useConfig);

const drugCategory: Partial<Concept> = { uuid: 'cat-drugs', display: 'Drugs' };
const nonDrugCategory: Partial<Concept> = { uuid: 'cat-non-drugs', display: 'Non Drugs' };
const allCategories = [drugCategory, nonDrugCategory] as Concept[];

function CategorySelectorWrapper({ defaultCategoryUuid = '' }: { defaultCategoryUuid?: string }) {
  const methods = useForm<FieldValues>({ defaultValues: { categoryUuid: defaultCategoryUuid } });

  return (
    <StockItemCategorySelector
      name="categoryUuid"
      controllerName="categoryUuid"
      control={methods.control}
      title="Category"
      placeholder="Choose a category"
    />
  );
}

beforeEach(() => {
  mockUseConfig.mockReturnValue({ stockItemCategoryUUID: 'category-concept-uuid' });
  mockUseConcept.mockReturnValue({
    items: { answers: allCategories },
    isLoading: false,
  } as ReturnType<typeof useConcept>);
});

describe('StockItemCategorySelector', () => {
  it('renders the combobox with categories', async () => {
    const user = userEvent.setup();
    render(<CategorySelectorWrapper />);

    expect(screen.getByText('Category')).toBeInTheDocument();
    const input = screen.getByRole('combobox');
    await user.click(input);

    expect(screen.getByText('Drugs')).toBeInTheDocument();
    expect(screen.getByText('Non Drugs')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mockUseConcept.mockReturnValue({
      items: { answers: [] },
      isLoading: true,
    } as ReturnType<typeof useConcept>);

    render(<CategorySelectorWrapper />);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('lists every category, as on the RefApp whose answers are Medication and Non-drug', async () => {
    const user = userEvent.setup();
    mockUseConcept.mockReturnValue({
      items: {
        answers: [
          { uuid: 'medication', display: 'Medication' },
          { uuid: 'non-drug', display: 'Non-drug' },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useConcept>);
    render(<CategorySelectorWrapper />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getByText('Medication')).toBeInTheDocument();
    expect(screen.getByText('Non-drug')).toBeInTheDocument();
  });

  it('shows the saved category', () => {
    render(<CategorySelectorWrapper defaultCategoryUuid="cat-drugs" />);

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('Drugs');
  });

  it('shows no category when the saved one is not an answer of the category concept', () => {
    // e.g. a category that has since been removed from the concept's answers
    render(<CategorySelectorWrapper defaultCategoryUuid="cat-retired" />);

    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});
