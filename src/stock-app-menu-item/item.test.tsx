import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockManagementAppMenuLink from './item.component';

describe('StockManagementAppMenuLink', () => {
  beforeEach(() => {
    window.spaBase = '/openmrs/spa';
    window.getOpenmrsSpaBase = () => '/openmrs/spa/';
  });

  it('renders a translated link to the stock management app', () => {
    render(<StockManagementAppMenuLink />);

    const link = screen.getByRole('link', { name: 'Stock management' });
    expect(link).toHaveAttribute('href', '/openmrs/spa/stock-management');
  });
});
