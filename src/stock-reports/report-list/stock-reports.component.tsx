import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DataTable,
  DataTableSkeleton,
  InlineLoading,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableExpandedRow,
  TableExpandHeader,
  TableExpandRow,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarAction,
  TableToolbarContent,
  TableToolbarMenu,
  TableToolbarSearch,
  Tile,
} from '@carbon/react';
import {
  CheckmarkOutline,
  Copy,
  Download,
  IncompleteCancel,
  MisuseOutline,
  View,
  WarningAltFilled,
} from '@carbon/react/icons';
import { isDesktop, restBaseUrl, userHasAccess, useSession, launchWorkspace2 } from '@openmrs/esm-framework';
import { useGetReports } from '../stock-reports.resource';
import {
  URL_BATCH_JOB_ARTIFACT,
  APP_STOCKMANAGEMENT_REPORTS_VIEW,
  TASK_STOCKMANAGEMENT_REPORTS_MUTATE,
} from '../../constants';
import { formatDisplayDateTime } from '../../core/utils/datetimeUtils';
import {
  BatchJobStatusCancelled,
  BatchJobStatusCompleted,
  BatchJobStatusExpired,
  BatchJobStatusFailed,
  BatchJobStatusPending,
  BatchJobStatusRunning,
  parseParametersToMap,
} from '../../core/api/types/BatchJob';
import { useHandleMutate } from '../../utils';
import { PrivilegedView } from '../../core/components/privileged-view-component/privileged-view.component';
import { ReportParameter } from '../ReportType';
import NewReportActionButton from './new-report-button.component';
import StockReportStatus from './stock-report-status.component';
import StockReportParameters from './stock-report-parameters.component';
import { isPendingReportStale } from './stock-report-status.utils';
import styles from './stock-reports.scss';

const StockReports: React.FC = () => {
  const { t } = useTranslation();
  const handleMutate = useHandleMutate();

  const handleRefresh = () => {
    handleMutate(`${restBaseUrl}/stockmanagement/batchjob?batchJobType=Report&v=default`);
  };
  const { user } = useSession();
  const canViewReports = userHasAccess(APP_STOCKMANAGEMENT_REPORTS_VIEW, user);
  const canCreateReport = userHasAccess(TASK_STOCKMANAGEMENT_REPORTS_MUTATE, user);
  const { reports, isLoading, currentPage, pageSizes, totalItems, goTo, currentPageSize, setPageSize } =
    useGetReports(canViewReports);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!canViewReports) {
      return;
    }

    const intervalId = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(intervalId);
  }, [canViewReports]);

  const tableHeaders = useMemo(
    () => [
      {
        id: 0,
        header: t('report', 'Report'),
        key: 'report',
      },

      {
        id: 1,
        header: t('parameters', 'Parameters'),
        key: 'parameters',
      },
      {
        id: 2,
        header: t('dateRequested', 'Date Requested'),
        key: 'dateRequested',
      },
      {
        id: 3,
        header: t('requestedBy', 'Requested By'),
        key: 'requestedBy',
      },
      {
        id: 4,
        header: t('status', 'Status'),
        key: 'status',
      },
      {
        id: 5,
        header: t('timeTaken', 'Time Taken'),
        key: 'timeTaken',
      },
      {
        id: 8,
        header: t('actions', 'Actions'),
        key: 'actions',
      },
    ],
    [t],
  );

  const onCloneReportClick = useCallback((batchJob: any) => {
    const parsedParams = parseParametersToMap(batchJob.parameters, []);
    if (!parsedParams) return;

    const model = {
      reportSystemName: parsedParams['report']?.value,
      reportName: batchJob.description,
      locationUuid: parsedParams[ReportParameter.Location]?.value,
      location: parsedParams[ReportParameter.Location]?.display,
      childLocations: parsedParams[ReportParameter.ChildLocations]?.value === 'true',
      startDate: parsedParams[ReportParameter.StartDate]?.value
        ? new Date(parsedParams[ReportParameter.StartDate].value)
        : undefined,
      endDate: parsedParams[ReportParameter.EndDate]?.value
        ? new Date(parsedParams[ReportParameter.EndDate].value)
        : undefined,
      date: parsedParams[ReportParameter.Date]?.value ? new Date(parsedParams[ReportParameter.Date].value) : undefined,
      stockItemCategoryConceptUuid: parsedParams[ReportParameter.StockItemCategory]?.value,
      stockItemCategory: parsedParams[ReportParameter.StockItemCategory]?.display,
      stockSourceUuid: parsedParams[ReportParameter.StockSource]?.value,
      stockSource: parsedParams[ReportParameter.StockSource]?.display,
      stockSourceDestinationUuid: parsedParams[ReportParameter.StockSourceDestination]?.value,
      stockSourceDestination: parsedParams[ReportParameter.StockSourceDestination]?.display,
      inventoryGroupBy: parsedParams[ReportParameter.InventoryGroupBy]?.value,
      inventoryGroupByName: parsedParams[ReportParameter.InventoryGroupBy]?.display,
      maxReorderLevelRatio: parsedParams[ReportParameter.MaxReorderLevelRatio]?.value
        ? Number(parsedParams[ReportParameter.MaxReorderLevelRatio].value)
        : undefined,
      stockItemUuid: parsedParams[ReportParameter.StockItem]?.value,
      stockItemName: parsedParams[ReportParameter.StockItem]?.display,
      patientUuid: parsedParams[ReportParameter.Patient]?.value,
      patientName: parsedParams[ReportParameter.Patient]?.display,
      limit: parsedParams[ReportParameter.Limit]?.value ? Number(parsedParams[ReportParameter.Limit].value) : null,
      mostLeastMoving: parsedParams[ReportParameter.MostLeastMoving]?.value,
      mostLeastMovingName: parsedParams[ReportParameter.MostLeastMoving]?.display,
      fullFillment: parsedParams[ReportParameter.Fullfillment]?.value
        ? parsedParams[ReportParameter.Fullfillment].value.split(',')
        : undefined,
    };

    launchWorkspace2('stock-reports-form-workspace', { model });
  }, []);

  const onDownloadReportClick = useCallback((uuid: string, fileExit: string | undefined | null) => {
    if (uuid) {
      window.open(URL_BATCH_JOB_ARTIFACT(uuid, true), '_blank');
    }
  }, []);

  const tableRows = useMemo(() => {
    return reports?.map((batchJob, index) => {
      const isStale = isPendingReportStale(batchJob.status, batchJob.expiration, now);

      return {
        ...batchJob,
        checkbox: 'isBatchJobActive',
        id: batchJob?.uuid,
        key: `key-${batchJob?.uuid}`,
        uuid: `${batchJob?.uuid}`,
        batchJobType: batchJob?.batchJobType,
        dateRequested: formatDisplayDateTime(batchJob.dateCreated),
        parameters: <StockReportParameters model={batchJob} />,
        report: batchJob?.description,
        requestedBy: batchJob?.owners?.map((p, index) => (
          <div key={`${batchJob.uuid}-owner-${index}`}>{`${p.ownerFamilyName} ${p.ownerGivenName}`}</div>
        )),
        status: (
          <div className={styles.reportStatus}>
            {batchJob.status === BatchJobStatusPending && !isStale ? (
              <InlineLoading
                status="active"
                iconDescription={t('loading', 'Loading')}
                description={t('reportQueued', 'Report queued...')}
              />
            ) : null}
            {isStale && (
              <>
                <WarningAltFilled className="report-stale" aria-hidden="true" />
                <span>{t('reportQueuedStale', 'Queued report has not started')}</span>
              </>
            )}
            {batchJob.status === BatchJobStatusRunning && (
              <InlineLoading
                status="active"
                iconDescription={t('loading', 'Loading')}
                description={t('generatingReport', 'Generating report...')}
              />
            )}
            {batchJob.status === BatchJobStatusFailed && (
              <>
                <WarningAltFilled className="report-failed" aria-hidden="true" />
                <span>{t('failed', 'Failed')}</span>
              </>
            )}
            {batchJob.status === BatchJobStatusCancelled && (
              <>
                <MisuseOutline className="report-cancelled" aria-hidden="true" />
                <span>{t('cancelled', 'Cancelled')}</span>
              </>
            )}
            {batchJob.status === BatchJobStatusCompleted && (
              <>
                <CheckmarkOutline className="report-completed" aria-hidden="true" size={16} />
                <span>{t('completed', 'Completed')}</span>
              </>
            )}
            {batchJob.status === BatchJobStatusExpired && (
              <>
                <IncompleteCancel className="report-expired" aria-hidden="true" />
                <span>{t('expired', 'Expired')}</span>
              </>
            )}
          </div>
        ),
        timeTaken: formatDuration(batchJob.dateCreated, batchJob.endTime),
        actions: (
          <div key={`${batchJob?.uuid}-actions`} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {batchJob.outputArtifactViewable && batchJob.batchJobType === 'hide' && (
              <Button
                key={`${batchJob?.uuid}-actions-view`}
                type="button"
                size="sm"
                className="submitButton clear-padding-margin"
                iconDescription={t('edit', 'Edit')}
                kind="ghost"
                renderIcon={View}
                // onClick={(e) => onViewItem(batchJob.uuid, e)}
              />
            )}
            <Button
              type="button"
              size="sm"
              className="submitButton clear-padding-margin"
              iconDescription={t('copy', 'Copy')}
              aria-label={t('copy', 'Copy')}
              hasIconOnly
              kind="ghost"
              renderIcon={Copy}
              onClick={() => onCloneReportClick(batchJob)}
              disabled={!canCreateReport}
            />
            {batchJob?.status === BatchJobStatusCompleted && (batchJob.outputArtifactSize ?? 0) > 0 && (
              <Button
                type="button"
                size="sm"
                className="submitButton clear-padding-margin"
                iconDescription={'Download'}
                kind="ghost"
                renderIcon={Download}
                onClick={() => onDownloadReportClick(batchJob.uuid, batchJob.outputArtifactFileExt)}
              />
            )}
          </div>
        ),
      };
    });
  }, [reports, onDownloadReportClick, t, now, onCloneReportClick, canCreateReport]);

  if (isLoading) {
    return <DataTableSkeleton role="progressbar" />;
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.tableHeader}>{t('stockReportsTableHeader', 'List of reports requested by users.')}</h2>
      <DataTable rows={tableRows} headers={tableHeaders} isSortable useZebraStyles>
        {({ rows, headers, getHeaderProps, getTableProps, getRowProps, onInputChange }) => (
          <TableContainer>
            <TableToolbar
              style={{
                position: 'static',
                overflow: 'visible',
                backgroundColor: 'color',
              }}
            >
              <TableToolbarContent className={styles.toolbarContent}>
                <TableToolbarSearch persistent onChange={onInputChange} />
                <TableToolbarMenu>
                  <TableToolbarAction className={styles.toolbarMenuAction} onClick={handleRefresh}>
                    {t('refresh', 'Refresh')}
                  </TableToolbarAction>
                </TableToolbarMenu>
                {canCreateReport && <NewReportActionButton />}
              </TableToolbarContent>
            </TableToolbar>
            <Table {...getTableProps()}>
              <TableHead>
                <TableRow>
                  <TableExpandHeader />
                  {headers.map((header: any) => (
                    <TableHeader
                      {...getHeaderProps({
                        header,
                        isSortable: header.isSortable,
                      })}
                      className={isDesktop ? styles.desktopHeader : styles.tabletHeader}
                      key={`${header.key}`}
                    >
                      {header.header?.content ?? header.header}
                    </TableHeader>
                  ))}
                  <TableHeader></TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row: any, index) => {
                  return (
                    <React.Fragment key={row.id}>
                      <TableExpandRow
                        className={isDesktop ? styles.desktopRow : styles.tabletRow}
                        {...getRowProps({ row })}
                      >
                        {row.cells.map((cell: any) => (
                          <TableCell key={cell.id}>{cell.value}</TableCell>
                        ))}
                      </TableExpandRow>

                      {row.isExpanded ? (
                        <TableExpandedRow colSpan={headers.length + 2}>
                          <StockReportStatus model={reports.find((report) => report.uuid === row.id)} />
                        </TableExpandedRow>
                      ) : (
                        <TableExpandedRow className={styles.hiddenRow} colSpan={headers.length + 2} />
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
            {!canViewReports ? (
              <PrivilegedView
                title="Can not view stock reports"
                description="You have no permissions to view reports"
              />
            ) : rows.length === 0 ? (
              <div className={styles.tileContainer}>
                <Tile className={styles.tile}>
                  <div className={styles.tileContent}>
                    <p className={styles.content}>{t('noReportsToDisplay', 'No Stock reports to display')}</p>
                    <p className={styles.helper}>{t('checkFilters', 'Check the filters above')}</p>
                  </div>
                </Tile>
              </div>
            ) : null}
          </TableContainer>
        )}
      </DataTable>
      <Pagination
        page={currentPage}
        pageSize={currentPageSize}
        pageSizes={pageSizes}
        totalItems={totalItems}
        onChange={({ pageSize, page }) => {
          if (pageSize !== currentPageSize) {
            setPageSize(pageSize);
          } else if (page !== currentPage) {
            goTo(page);
          }
        }}
        className={styles.paginationOverride}
      />
    </div>
  );
};

const formatDuration = (start: string, end: string) => {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();

  if (!startDate || !endDate) return '';

  const durationInMillis = endDate - startDate;
  const totalSeconds = Math.floor(durationInMillis / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((unit) => String(unit).padStart(2, '0')).join(':');
};

export default StockReports;
