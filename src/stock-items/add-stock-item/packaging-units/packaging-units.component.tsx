import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
  Tile,
} from '@carbon/react';
import { Edit, TrashCan, Add } from '@carbon/react/icons';
import { restBaseUrl, showModal, useSession, userHasAccess } from '@openmrs/esm-framework';
import { type StockItemPackagingUOMDTO } from '../../../core/api/types/stockItem/StockItemPackagingUOM';
import { useStockItemPackagingUomReferences } from '../../stock-items.resource';
import { useStockItemPackageUnitsHook } from './packaging-units.resource';
import { useHandleMutate } from '../../../utils';
import { TASK_STOCKMANAGEMENT_STOCKITEMS_MUTATE } from '../../../constants';
import DeletePackagingUnitActionButton from './delete-packaging-unit-action-button.component';
import PackagingUomReferenceList from './packaging-uom-reference-list.component';
import { type PackagingUnitModalSession } from './packaging-unit-form.modal';
import { type CustomTableHeader, type CustomTableRow } from '../../../core/components/table/types';
import { useWorkspaceMaximized } from './use-workspace-maximized.hook';
import styles from './packaging-units.scss';

interface PackagingUnitsProps {
  stockItemUuid: string;
}

const PackagingUnits: React.FC<PackagingUnitsProps> = ({ stockItemUuid }) => {
  const { t } = useTranslation();
  const { user } = useSession();
  const canMutate = userHasAccess(TASK_STOCKMANAGEMENT_STOCKITEMS_MUTATE, user);
  const { items, isLoading, setStockItemUuid, mutate } = useStockItemPackageUnitsHook();
  const handleMutate = useHandleMutate();

  useEffect(() => {
    setStockItemUuid(stockItemUuid);
  }, [stockItemUuid, setStockItemUuid]);

  // Selected unit for the details/reference subview; defaults to the first unit.
  const [selectedUnitUuid, setSelectedUnitUuid] = useState<string | null>(null);
  const selectedUnit = useMemo(
    () => items.find((unit) => unit.uuid === selectedUnitUuid) ?? items[0],
    [items, selectedUnitUuid],
  );

  // Staged packaging-unit modal sessions retained across modal dismissal, keyed by
  // unit uuid or 'new', so unsaved unit values survive dismissing the modal.
  const [stagedSessions, setStagedSessions] = useState<Record<string, PackagingUnitModalSession>>({});

  const retainSession = useCallback((key: string, session: PackagingUnitModalSession) => {
    // only a session with something entered (or a partially persisted unit) is worth keeping
    if (session.packagingUomUuid || session.factor || session.persistedUnitUuid) {
      setStagedSessions((current) => ({ ...current, [key]: session }));
    } else {
      setStagedSessions((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }, []);

  const openUnitModal = useCallback(
    (unit: StockItemPackagingUOMDTO | null) => {
      const key = unit?.uuid ?? 'new';
      const dispose = showModal('packaging-unit-form-modal', {
        closeModal: () => dispose(),
        stockItemUuid,
        unit,
        stagedSession: stagedSessions[key] ?? null,
        onSaved: () => {
          setStagedSessions((current) => {
            const next = { ...current };
            delete next[key];
            return next;
          });
          mutate();
          // the broad stockitem sweep is the app-wide convention (the item payload
          // caches packaging-unit fields); it also revalidates the reference keys,
          // which is accepted collateral rather than something to out-scope here
          handleMutate(`${restBaseUrl}/stockmanagement/stockitem`);
        },
        onDismiss: (session) => retainSession(key, session),
      });
    },
    [stockItemUuid, stagedSessions, mutate, handleMutate, retainSession],
  );

  const tableHeaders = useMemo<CustomTableHeader[]>(
    () => [
      {
        key: 'packaging',
        header: t('packagingUnit', 'Packaging Unit'),
      },
      {
        key: 'quantity',
        header: t('packSize', 'Pack Size'),
      },
      {
        key: 'references',
        header: t('referencesCount', 'References'),
      },
      {
        key: 'action',
        header: t('action', 'Actions'),
      },
    ],
    [t],
  );

  // the two panels sit side by side only while the workspace window is expanded.
  // CAVEAT: the hook treats any fixed-positioned ancestor as "expanded", so if this
  // section is ever reused inside a modal or fixed drawer it will false-positive into
  // the wide two-pane layout
  const [sectionElement, setSectionElement] = useState<HTMLElement | null>(null);
  const workspaceMaximized = useWorkspaceMaximized(sectionElement);

  if (isLoading) return <DataTableSkeleton showHeader={false} rowCount={5} columnCount={5} zebra />;

  return (
    <div ref={setSectionElement} className={styles.packagingUnitsSection}>
      <div className={styles.packagingUnitsHeader}>
        <p className={styles.packagingUnitsHint}>
          {t('packagingUnitsHint', 'Manage pack sizes and their stock-source-specific external reference codes.')}
        </p>
        {canMutate ? (
          <Button renderIcon={Add} kind="primary" onClick={() => openUnitModal(null)}>
            {t('addPackagingUnit', 'Add packaging unit')}
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={styles.packagingUnitsEmpty}>{t('noPackagingUnits', 'No packaging units yet.')}</div>
      ) : (
        <div className={`${styles.packagingUnitsLayout} ${workspaceMaximized ? styles.packagingUnitsLayoutWide : ''}`}>
          <DataTable
            rows={items.map((item, idx) => ({ ...item, id: item.uuid || `item-${idx}` })) as CustomTableRow[]}
            headers={tableHeaders as any}
            isSortable={false}
            useZebraStyles
          >
            {({ headers, getHeaderProps, getTableProps }) => (
              <TableContainer
                className={styles.packagingTableContainer}
                title={t('packagingUnitsCountTitle', 'Packaging units ({{count}})', { count: items.length })}
              >
                <Table {...getTableProps()} className={styles.packingTable}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => {
                        const customHeader = header as CustomTableHeader;
                        return (
                          <TableHeader {...getHeaderProps({ header, isSortable: false })} key={header.key}>
                            {typeof customHeader.header === 'object' &&
                            customHeader.header !== null &&
                            'content' in customHeader.header
                              ? (customHeader.header.content as React.ReactNode)
                              : (customHeader.header as React.ReactNode)}
                          </TableHeader>
                        );
                      })}
                    </TableRow>
                  </TableHead>
                  <TableBody className={styles.packingTableBody}>
                    {items.map((row, index) => {
                      const isSelected = selectedUnit?.uuid === row.uuid;
                      return (
                        <TableRow
                          key={`${index}-${row?.uuid}`}
                          className={isSelected ? styles.selectedRow : undefined}
                          onClick={() => setSelectedUnitUuid(row.uuid)}
                        >
                          <TableCell>
                            <button
                              type="button"
                              className={styles.rowSelectButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedUnitUuid(row.uuid);
                              }}
                            >
                              {row?.packagingUomName}
                            </button>
                            {Number(row?.factor) === 1 ? (
                              <span className={styles.basePackLabel}>{t('basePack', 'Base pack')}</span>
                            ) : null}
                          </TableCell>
                          <TableCell>{row?.factor}</TableCell>
                          <TableCell>
                            <PackagingUnitReferenceCount packagingUomUuid={row.uuid} />
                          </TableCell>
                          <TableCell>
                            {canMutate ? (
                              <div className={styles.referenceActions}>
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  renderIcon={Edit}
                                  iconDescription={t('edit', 'Edit')}
                                  hasIconOnly
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openUnitModal(row);
                                  }}
                                />
                                <DeletePackagingUnitActionButton
                                  row={row}
                                  onDeleted={() => {
                                    // a discarded staged session for a deleted unit is dead state
                                    setStagedSessions((current) => {
                                      const next = { ...current };
                                      delete next[row.uuid];
                                      return next;
                                    });
                                    mutate();
                                    handleMutate(`${restBaseUrl}/stockmanagement/stockitem`);
                                  }}
                                />
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <p className={styles.unitsTableFooter}>
                  {t('selectUnitHint', 'Select a unit to inspect or manage its source-specific references.')}
                </p>
              </TableContainer>
            )}
          </DataTable>

          {selectedUnit ? (
            <Tile className={styles.selectedUnitPanel}>
              <div className={styles.selectedUnitPanelHeader}>
                <span className={styles.selectedUnitName}>
                  {selectedUnit.packagingUomName} — {selectedUnit.factor}
                </span>
              </div>
              <Tabs>
                <TabList aria-label={t('packagingUnitTabs', 'Packaging unit details')}>
                  <Tab>{t('details', 'Details')}</Tab>
                  <Tab>
                    <PackagingUnitReferenceCountLabel packagingUomUuid={selectedUnit.uuid} />
                  </Tab>
                </TabList>
                <TabPanels>
                  <TabPanel className={styles.selectedUnitPanelContent}>
                    <div className={styles.detailRow}>
                      <span>{t('packagingUnit', 'Packaging Unit')}</span>
                      <strong>{selectedUnit.packagingUomName}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>{t('packSize', 'Pack Size')}</span>
                      <strong>{selectedUnit.factor}</strong>
                    </div>
                    <div className={styles.detailRow}>
                      <span>{t('referenceCodesLabel', 'Reference codes')}</span>
                      <PackagingUnitReferenceCount packagingUomUuid={selectedUnit.uuid} />
                    </div>
                    <p className={styles.packagingUnitsHint}>
                      {t(
                        'selectedUnitHint',
                        'Edit the unit with its row action, and manage its source reference codes in the References tab.',
                      )}
                    </p>
                  </TabPanel>
                  <TabPanel className={styles.selectedUnitPanelContent}>
                    <PackagingUomReferenceList
                      packagingUomUuid={selectedUnit.uuid}
                      packagingUomLabel={`${selectedUnit.packagingUomName} — ${selectedUnit.factor}`}
                      canMutate={canMutate}
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Tile>
          ) : null}
        </div>
      )}
    </div>
  );
};

/** Compact reference count for one unit row; fetches that unit's active references. */
const PackagingUnitReferenceCount: React.FC<{ packagingUomUuid: string }> = ({ packagingUomUuid }) => {
  const { items, isLoading } = useStockItemPackagingUomReferences({ stockItemPackagingUomUuid: packagingUomUuid });
  if (isLoading) return <Tag size="sm">…</Tag>;
  return <Tag size="sm">{items.length}</Tag>;
};

const PackagingUnitReferenceCountLabel: React.FC<{ packagingUomUuid: string }> = ({ packagingUomUuid }) => {
  const { t } = useTranslation();
  const { items, isLoading } = useStockItemPackagingUomReferences({ stockItemPackagingUomUuid: packagingUomUuid });
  return (
    <>
      {t('referencesLabel', 'References')} ({isLoading ? '…' : items.length})
    </>
  );
};

export default PackagingUnits;
