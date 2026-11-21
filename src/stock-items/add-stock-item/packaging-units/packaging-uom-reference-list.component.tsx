import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
} from '@carbon/react';
import { Edit, TrashCan } from '@carbon/react/icons';
import { ErrorState, restBaseUrl, showModal } from '@openmrs/esm-framework';
import { type StockItemPackagingUomReference } from '../../../core/api/types/stockItem/StockItemPackagingUomReference';
import { useStockItemPackagingUomReferences } from '../../stock-items.resource';
import { useHandleMutate } from '../../../utils';
import styles from './packaging-units.scss';

interface PackagingUomReferenceListProps {
  /** A persisted packaging UOM UUID — references cannot be listed before it exists. */
  packagingUomUuid: string;
  packagingUomLabel: string;
  canMutate: boolean;
}

/**
 * Lists the source references of one persisted packaging UOM, with add / edit / void
 * actions. Voided rows appear only when "show voided" is enabled and are read-only.
 */
const PackagingUomReferenceList: React.FC<PackagingUomReferenceListProps> = ({
  packagingUomUuid,
  packagingUomLabel,
  canMutate,
}) => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();
  const [showVoided, setShowVoided] = useState(false);

  const { items, isLoading, error } = useStockItemPackagingUomReferences({
    stockItemPackagingUomUuid: packagingUomUuid,
    includeAll: showVoided || null,
  });

  const refresh = useCallback(() => {
    // the prefix-matching handleMutate also revalidates this list's own key and the
    // per-unit count keys elsewhere in the section
    handleMutate(`${restBaseUrl}/stockmanagement/stockitempackaginguomreference`);
  }, [handleMutate]);

  const openAddModal = useCallback(() => {
    const dispose = showModal('packaging-uom-reference-form-modal', {
      closeModal: () => dispose(),
      packagingUomUuid,
      packagingUomLabel,
      onSaved: refresh,
    });
  }, [packagingUomUuid, packagingUomLabel, refresh]);

  const openEditModal = useCallback(
    (reference: StockItemPackagingUomReference) => {
      const dispose = showModal('packaging-uom-reference-form-modal', {
        closeModal: () => dispose(),
        reference,
        packagingUomLabel,
        onSaved: refresh,
      });
    },
    [packagingUomLabel, refresh],
  );

  const openVoidModal = useCallback(
    (reference: StockItemPackagingUomReference) => {
      const dispose = showModal('packaging-uom-reference-void-modal', {
        closeModal: () => dispose(),
        reference,
        onVoided: refresh,
      });
    },
    [refresh],
  );

  const headers = [
    { key: 'referenceCode', header: t('referenceCodeLabel', 'Reference code') },
    { key: 'name', header: t('nameLabel', 'Name') },
    { key: 'stockSourceName', header: t('stockSource', 'Stock source') },
    { key: 'status', header: t('status', 'Status') },
    { key: 'actions', header: t('action', 'Actions') },
  ];

  if (isLoading) {
    return <div className={styles.referenceListLoading}>{t('loading', 'Loading...')}</div>;
  }

  if (error) {
    return (
      <ErrorState
        headerTitle={t('errorFetchingPackagingUomReferences', 'Error fetching packaging UOM references')}
        error={error}
      />
    );
  }

  return (
    <div className={styles.referenceList}>
      <div className={styles.referenceListToolbar}>
        {canMutate ? (
          <Button kind="secondary" size="sm" onClick={openAddModal}>
            {t('addReference', '+ Add reference')}
          </Button>
        ) : null}
        <Checkbox
          id={`show-voided-references-${packagingUomUuid}`}
          labelText={t('showVoided', 'Show voided')}
          checked={showVoided}
          onChange={(_, value) => setShowVoided(value.checked)}
        />
      </div>
      {items.length === 0 ? (
        <div className={styles.referenceListEmpty}>
          {t('noPackagingUomReferences', 'No references found. Add a reference code to this packaging unit.')}
        </div>
      ) : (
        <DataTable
          rows={items.map((item, idx) => ({ ...item, id: item.uuid || `ref-${idx}` }))}
          headers={headers}
          isSortable={false}
          useZebraStyles
        >
          {({ headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader key={header.key} {...getHeaderProps({ header, isSortable: false })}>
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((reference) => {
                    const isVoided = reference.voided;
                    return (
                      <TableRow key={reference.uuid || `ref-${items.indexOf(reference)}`}>
                        <TableCell>
                          <strong className={styles.referenceCodeCell}>{reference.referenceCode}</strong>
                        </TableCell>
                        <TableCell>{reference.name ?? '—'}</TableCell>
                        <TableCell>{reference.stockSourceName}</TableCell>
                        <TableCell>
                          <Tag type={isVoided ? 'gray' : 'green'} size="sm">
                            {isVoided ? t('voided', 'Voided') : t('active', 'Active')}
                          </Tag>
                        </TableCell>
                        <TableCell>
                          {isVoided ? (
                            <span className={styles.referenceReadOnly}>{t('readOnly', 'Read only')}</span>
                          ) : canMutate ? (
                            <div className={styles.referenceActions}>
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={Edit}
                                iconDescription={t('edit', 'Edit')}
                                hasIconOnly
                                onClick={() => openEditModal(reference)}
                              />
                              <Button
                                kind="ghost"
                                size="sm"
                                renderIcon={TrashCan}
                                iconDescription={t('voidReferenceAction', 'Void reference')}
                                hasIconOnly
                                onClick={() => openVoidModal(reference)}
                              />
                            </div>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DataTable>
      )}
    </div>
  );
};

export default PackagingUomReferenceList;
