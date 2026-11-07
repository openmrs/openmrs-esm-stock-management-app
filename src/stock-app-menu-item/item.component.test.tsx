import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import routes from '../routes.json';
import Item from './item.component';

describe('Stock management App Menu item', () => {
  beforeEach(() => {
    window.spaBase = '/openmrs/spa';
    window.getOpenmrsSpaBase = () => '/openmrs/spa/';
  });

  it('is registered in the slot the App Menu renders', () => {
    const extension = routes.extensions.find((e) => e.name === 'stock-management-app-menu-item');

    expect(extension?.slot).toBe('app-menu-slot');
    expect(extension?.meta?.name).toBe('Stock Management');
  });

  it('links to the stock management app with a translated label', () => {
    render(<Item />);

    expect(screen.getByRole('link', { name: 'Stock management' })).toHaveAttribute(
      'href',
      '/openmrs/spa/stock-management',
    );
  });
});
