import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import StockOperationStepper, { type Step } from './stock-operation-stepper.component';

const steps: Array<Step> = [
  { title: 'Details', component: <p>Details step</p> },
  { title: 'Items', component: <p>Items step</p> },
  { title: 'Submit', component: <p>Submit step</p>, disabled: true },
];

describe('StockOperationStepper', () => {
  it('lets keyboard users move between enabled steps', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StockOperationStepper steps={steps} selectedIndex={0} onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Details' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Items' })).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(1);

    await user.keyboard(' ');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('keeps disabled steps out of the tab order', () => {
    render(<StockOperationStepper steps={steps} selectedIndex={0} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('tabindex', '-1');
  });

  it('marks the selected step as the current step', () => {
    render(<StockOperationStepper steps={steps} selectedIndex={1} onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Items' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: 'Details' })).not.toHaveAttribute('aria-current');
  });
});
