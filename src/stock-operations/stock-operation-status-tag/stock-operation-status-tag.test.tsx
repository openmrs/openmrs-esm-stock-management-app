import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StockOperationStatusTag from './stock-operation-status-tag.component';

vi.mock('@carbon/react', () => ({
  Tag: ({ children, type }: { children: React.ReactNode; type: string }) => (
    <span data-tag-type={type}>{children}</span>
  ),
}));

describe('StockOperationStatusTag', () => {
  it.each([
    ['NEW', 'New', 'gray'],
    ['SUBMITTED', 'Submitted', 'blue'],
    ['DISPATCHED', 'Dispatched', 'cyan'],
    ['RETURNED', 'Returned', 'magenta'],
    ['COMPLETED', 'Completed', 'green'],
    ['CANCELLED', 'Cancelled', 'warm-gray'],
    ['REJECTED', 'Rejected', 'red'],
  ])('shows %s as a sentence case "%s" Tag coloured %s', (status, label, colour) => {
    render(<StockOperationStatusTag status={status} />);

    expect(screen.getByText(label)).toHaveAttribute('data-tag-type', colour);
    expect(screen.queryByText(status)).not.toBeInTheDocument();
  });

  it('falls back to the raw value in a gray Tag for an unknown status', () => {
    render(<StockOperationStatusTag status="SOMETHING_NEW" />);

    expect(screen.getByText('SOMETHING_NEW')).toHaveAttribute('data-tag-type', 'gray');
  });

  it.each([[undefined], [null], ['']])('renders nothing when the status is %p', (status) => {
    const { container } = render(<StockOperationStatusTag status={status} />);

    expect(container).toBeEmptyDOMElement();
  });
});
