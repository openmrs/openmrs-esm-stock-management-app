import React, { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDefaultsFromConfigSchema, useConfig } from '@openmrs/esm-framework';
import { configSchema, type ConfigObject } from '../../../../config-schema';
import PrintableBincardTransactionHeader from './printable-bincard-transaction-header.component';
import PrintableStockcardTransactionHeader from './printable-stockcard-transaction-header.component';

const mockUseConfig = vi.mocked(useConfig<ConfigObject>);

function mockConfig(logo: Partial<ConfigObject['logo']> = {}) {
  const defaults = getDefaultsFromConfigSchema<ConfigObject>(configSchema);

  mockUseConfig.mockImplementation((options) => {
    if (options?.externalModuleName) {
      // The real hook suspends until that module's config loads, which never happens if the module isn't installed
      throw new Promise(() => {});
    }
    return { ...defaults, logo: { ...defaults.logo, ...logo } };
  });
}

describe.each([
  { header: PrintableBincardTransactionHeader, heading: 'Bin card' },
  { header: PrintableStockcardTransactionHeader, heading: 'Stock card' },
])('$heading printable header', ({ header: Header, heading }) => {
  const renderHeader = () =>
    render(
      <Suspense fallback={<p>Suspended</p>}>
        <Header itemName="paracetamol" />
      </Suspense>,
    );

  beforeEach(() => {
    mockConfig();
  });

  it('renders using only the stock management app config', () => {
    renderHeader();

    expect(screen.queryByText('Suspended')).not.toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
    expect(screen.getByText('Paracetamol')).toBeInTheDocument();
  });

  it('shows the configured logo image', () => {
    mockConfig({ src: 'https://example.org/facility-logo.png', alt: 'Facility logo' });
    renderHeader();

    expect(screen.getByRole('img', { name: 'Facility logo' })).toHaveAttribute(
      'src',
      'https://example.org/facility-logo.png',
    );
  });

  it('shows the configured organisation name when no logo image is set', () => {
    mockConfig({ name: 'Kakamega County Referral Hospital' });
    renderHeader();

    expect(screen.getByText('Kakamega County Referral Hospital')).toBeInTheDocument();
  });
});
