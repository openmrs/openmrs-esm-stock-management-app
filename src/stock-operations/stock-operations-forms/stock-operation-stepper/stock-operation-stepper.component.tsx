import React from 'react';
import { Layer } from '@carbon/react';
import styles from './stepper.scss';

export type Step = {
  title: string;
  subTitle?: string;
  icon?: React.ReactNode;
  component: React.ReactElement;
  disabled?: boolean;
};

type StockOperationStepperProps = {
  steps: Step[];
  title?: string;
  hasContainer?: boolean;
  selectedIndex?: number;
  onChange?: (index: number) => void;
};

const StockOperationStepper: React.FC<StockOperationStepperProps> = ({
  steps,
  hasContainer,
  onChange,
  selectedIndex,
  title,
}) => {
  return (
    <Layer className={styles.layer}>
      <ol className={styles.stepperContainer}>
        {steps.map(({ title, subTitle, icon, disabled }, index) => {
          const active = selectedIndex >= index;
          return (
            <li
              role="button"
              className={`${styles.stepperItem} ${active ? styles.stepperItemActive : ''}`}
              key={index}
              tabIndex={disabled ? -1 : 0}
              onClick={!disabled ? () => onChange?.(index) : undefined}
              onKeyDown={(event) => {
                if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  onChange?.(index);
                }
              }}
              aria-disabled={disabled}
              aria-current={selectedIndex === index ? 'step' : undefined}
            >
              <p className={styles.title}>{title}</p>
            </li>
          );
        })}
      </ol>
      <Layer className={styles.content}>{steps[selectedIndex].component}</Layer>
    </Layer>
  );
};

export default StockOperationStepper;
