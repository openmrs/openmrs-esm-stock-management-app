import React from 'react';
import { Tab, TabListVertical, TabPanel, TabPanels, TabsVertical } from '@carbon/react';
import { type TabItem } from './types';
import styles from './vertical-tabs.scss';

interface VerticalTabsProps {
  tabs: TabItem[];
  title?: string;
  hasContainer?: boolean;
  selectedIndex?: number;
  onChange?: (index: number) => void;
}

const VerticalTabs: React.FC<VerticalTabsProps> = ({ tabs, title, hasContainer, selectedIndex, onChange }) => {
  return (
    <div
      className={`
        ${hasContainer ? styles.tabContainer : ''}
        ${styles.verticalTabs}
      `}
    >
      {title && <p className={styles.heading}>{title}</p>}
      <TabsVertical selectedIndex={selectedIndex} onChange={({ selectedIndex }) => onChange?.(selectedIndex)}>
        <TabListVertical aria-label={title ?? 'navigation'}>
          {tabs.map((tab: TabItem, index: number) => (
            <Tab key={index} disabled={tab.disabled}>
              {tab.name}
            </Tab>
          ))}
        </TabListVertical>
        <TabPanels>
          {tabs.map((tab: TabItem, index: number) => (
            <TabPanel key={index}>{tab.component}</TabPanel>
          ))}
        </TabPanels>
      </TabsVertical>
    </div>
  );
};

export default VerticalTabs;
