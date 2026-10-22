/* eslint-disable theme-colors/no-literal-colors */
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { t, DataRecord } from '@superset-ui/core';
import { Button, Input, Space, Typography } from 'antd';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { publishSpotReportRequest } from '../utils/spotReportSelection';

export interface AlertTableProps {
  data: DataRecord[];
  columns: string[];
  columnAliases?: Record<string, string[]>;
  severityColumns: string[];
  badgeConfiguration: boolean;
  badgeColumn?: string;
  badgeValueColumn?: string;
  badgeDataType?: 'text' | 'number';
  badgeRules: string;
  extendedColumns: string[];
  rowIdColumn: string;
  buttonText?: string;
  headerColor?: { r: number; g: number; b: number; a?: number };
  headerTextColor?: { r: number; g: number; b: number; a?: number };
  buttonColor?: { r: number; g: number; b: number; a?: number };
  height: number;
  width: number;
}

const DEFAULT_HEADER_COLOR = '#f5f5f5';

function getHeaderColor(color?: AlertTableProps['headerColor']): string {
  if (!color) {
    return DEFAULT_HEADER_COLOR;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
}

function getButtonColor(
  color?: AlertTableProps['buttonColor'],
): string | undefined {
  if (!color) {
    return undefined;
  }
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a ?? 1})`;
}

function getButtonTextColor(
  color?: AlertTableProps['buttonColor'],
): string | undefined {
  if (!color) {
    return undefined;
  }
  const luminance =
    (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return luminance > 0.5 ? '#000' : '#fff';
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getRowKey(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return `string:${value}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `number:${value}`;
  }
  return undefined;
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }
  if (left === null || left === undefined || left === '') {
    return 1;
  }
  if (right === null || right === undefined || right === '') {
    return -1;
  }
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }
  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function getSeverityBadge(value: unknown):
  | {
      label: string;
      backgroundColor: string;
      borderColor: string;
      color: string;
    }
  | undefined {
  let severity: 'low' | 'medium' | 'high' | 'severe' | undefined;
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLocaleLowerCase();
    if (
      normalizedValue === 'low' ||
      normalizedValue === 'medium' ||
      normalizedValue === 'high' ||
      normalizedValue === 'severe' ||
      normalizedValue === 'critical'
    ) {
      severity = normalizedValue === 'critical' ? 'severe' : normalizedValue;
    }
  }
  if (!severity) {
    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string' && value.trim() !== ''
          ? Number(value)
          : NaN;
    if (
      !Number.isFinite(numericValue) ||
      numericValue < 1 ||
      numericValue > 10
    ) {
      return undefined;
    }
    severity =
      numericValue <= 3
        ? 'low'
        : numericValue <= 6
          ? 'medium'
          : numericValue <= 8
            ? 'high'
            : 'severe';
  }

  if (severity === 'low') {
    return {
      label: t('Low'),
      backgroundColor: '#e6f4ff',
      borderColor: '#91caff',
      color: '#0958d9',
    };
  }
  if (severity === 'medium') {
    return {
      label: t('Medium'),
      backgroundColor: '#fffbe6',
      borderColor: '#ffe58f',
      color: '#ad6800',
    };
  }
  if (severity === 'high') {
    return {
      label: t('High'),
      backgroundColor: '#fff7e6',
      borderColor: '#ffd591',
      color: '#d46b08',
    };
  }
  return {
    label: t('Severe'),
    backgroundColor: '#fff1f0',
    borderColor: '#ffa39e',
    color: '#a8071a',
  };
}

interface BadgeRule {
  sourceValue: string;
  label: string;
  backgroundColor: string;
  textColor: string;
}

function parseBadgeRules(
  value: string,
  dataType: 'text' | 'number',
): {
  rules: BadgeRule[];
  invalidLines: number[];
} {
  const rules: BadgeRule[] = [];
  const invalidLines: number[] = [];
  value.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) {
      return;
    }
    const [sourceValue, label, backgroundColor, ...extra] = line
      .split('|')
      .map(part => part.trim());
    if (
      !sourceValue ||
      !label ||
      !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(backgroundColor || '') ||
      extra.length > 0 ||
      (dataType === 'number' && !Number.isFinite(Number(sourceValue)))
    ) {
      invalidLines.push(index + 1);
      return;
    }
    const hexColor =
      backgroundColor.length === 4
        ? `#${backgroundColor[1]}${backgroundColor[1]}${backgroundColor[2]}${backgroundColor[2]}${backgroundColor[3]}${backgroundColor[3]}`
        : backgroundColor;
    const red = parseInt(hexColor.slice(1, 3), 16);
    const green = parseInt(hexColor.slice(3, 5), 16);
    const blue = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    rules.push({
      sourceValue:
        dataType === 'number'
          ? String(Number(sourceValue))
          : sourceValue.toLocaleLowerCase(),
      label,
      backgroundColor: hexColor,
      textColor: brightness >= 150 ? '#000' : '#fff',
    });
  });
  return { rules, invalidLines };
}

export default function AlertTable({
  data,
  columns,
  columnAliases = {},
  severityColumns,
  badgeConfiguration,
  badgeColumn = '',
  badgeValueColumn = '',
  badgeDataType = 'text',
  badgeRules: badgeRulesText,
  extendedColumns,
  rowIdColumn,
  buttonText = t('Create SPOT Report'),
  headerColor,
  headerTextColor,
  buttonColor,
  height,
  width,
}: AlertTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [spotReportProcessing, setSpotReportProcessing] = useState(false);
  const [sortBy, setSortBy] = useState<{
    column: string;
    descending: boolean;
  } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const tableHeaderColor = getHeaderColor(headerColor);
  const tableHeaderTextColor = headerTextColor
    ? `rgba(${headerTextColor.r}, ${headerTextColor.g}, ${headerTextColor.b}, ${headerTextColor.a ?? 1})`
    : undefined;
  const tableButtonColor = getButtonColor(buttonColor);
  const tableButtonTextColor = getButtonTextColor(buttonColor);
  const { rules: configuredBadgeRules, invalidLines: invalidBadgeRuleLines } =
    useMemo(
      () => parseBadgeRules(badgeRulesText, badgeDataType),
      [badgeRulesText, badgeDataType],
    );
  const badgeConfigurationIsIncomplete =
    badgeConfiguration && (!badgeColumn || !badgeValueColumn);

  useEffect(() => {
    setSelectedRows(new Set());
    setExpandedRows(new Set());
  }, [data]);

  const rowsWithKeys = useMemo(
    () =>
      data.map((row, index) => ({
        row,
        index,
        key: getRowKey(rowIdColumn ? row[rowIdColumn] : undefined),
      })),
    [data, rowIdColumn],
  );
  const rowIds = rowsWithKeys.map(item => item.key);
  const hasMissingRowId = !rowIdColumn || rowIds.some(key => !key);
  const hasDuplicateRowId =
    !hasMissingRowId && new Set(rowIds).size !== rowIds.length;
  const rowIdentityIsValid = !hasMissingRowId && !hasDuplicateRowId;

  const visibleRows = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase();
    const filteredRows = rowsWithKeys.filter(({ row }) =>
      !search
        ? true
        : [...columns, ...extendedColumns].some(column =>
            displayValue(row[column]).toLocaleLowerCase().includes(search),
          ),
    );
    if (!sortBy) {
      return filteredRows;
    }
    return [...filteredRows].sort((left, right) => {
      const comparison = compareValues(
        left.row[sortBy.column],
        right.row[sortBy.column],
      );
      return comparison === 0
        ? left.index - right.index
        : sortBy.descending
          ? -comparison
          : comparison;
    });
  }, [columns, extendedColumns, rowsWithKeys, searchText, sortBy]);
  const visibleRowKeys = visibleRows
    .map(item => item.key)
    .filter((key): key is string => Boolean(key));
  const allVisibleRowsSelected =
    visibleRowKeys.length > 0 &&
    visibleRowKeys.every(key => selectedRows.has(key));
  const someVisibleRowsSelected = visibleRowKeys.some(key =>
    selectedRows.has(key),
  );

  const selectedData = useMemo(
    () =>
      rowsWithKeys
        .filter(({ key }) => key && selectedRows.has(key))
        .map(({ row }) => row),
    [rowsWithKeys, selectedRows],
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        someVisibleRowsSelected && !allVisibleRowsSelected;
    }
  }, [allVisibleRowsSelected, someVisibleRowsSelected]);

  const toggleRow = (rowKey: string) => {
    setSelectedRows(previous => {
      const next = new Set(previous);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const toggleAllRows = () => {
    setSelectedRows(previous => {
      const next = new Set(previous);
      if (allVisibleRowsSelected) {
        visibleRowKeys.forEach(key => next.delete(key));
      } else {
        visibleRowKeys.forEach(key => next.add(key));
      }
      return next;
    });
  };

  const toggleExpandedRow = (rowKey: string) => {
    setExpandedRows(previous => {
      const next = new Set(previous);
      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }
      return next;
    });
  };

  const toggleSort = (column: string) => {
    setSortBy(previous => ({
      column,
      descending: previous?.column === column ? !previous.descending : false,
    }));
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height,
        width,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          borderBottom: '1px solid #d9d9d9',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '12px 16px',
        }}
      >
        <div style={{ alignItems: 'center', display: 'flex', gap: 16 }}>
          <label
            htmlFor="alert-table-select-all"
            style={{ alignItems: 'center', display: 'flex', gap: 8 }}
          >
            <input
              aria-label={t('Select all visible rows')}
              checked={allVisibleRowsSelected}
              disabled={!rowIdentityIsValid || visibleRowKeys.length === 0}
              id="alert-table-select-all"
              onChange={toggleAllRows}
              ref={selectAllRef}
              type="checkbox"
            />
            {t('Select all visible')}
          </label>
          <Typography.Text aria-live="polite" type="secondary">
            {t('%(count)s selected', { count: selectedRows.size })}
          </Typography.Text>
        </div>
        <Button
          disabled={
            !rowIdentityIsValid ||
            selectedRows.size === 0 ||
            spotReportProcessing
          }
          onClick={() => {
            setSpotReportProcessing(true);
            publishSpotReportRequest(selectedData, () =>
              setSpotReportProcessing(false),
            );
          }}
          loading={spotReportProcessing}
          title={
            spotReportProcessing
              ? t('Preparing the SPOT report.')
              : t('Create a SPOT report from the selected alerts.')
          }
          style={
            tableButtonColor &&
            rowIdentityIsValid &&
            selectedRows.size > 0 &&
            !spotReportProcessing
              ? {
                  backgroundColor: tableButtonColor,
                  borderColor: tableButtonColor,
                  color: tableButtonTextColor,
                }
              : undefined
          }
          type="primary"
        >
          {buttonText}
        </Button>
      </div>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          padding: '8px 16px 12px',
        }}
      >
        <Typography.Text type="secondary">
          {t('%(visible)s of %(total)s alerts', {
            visible: visibleRows.length,
            total: data.length,
          })}
        </Typography.Text>
        <Space direction="horizontal" size={4}>
          {t('Search')}
          <Input
            aria-label={t('Search %(count)s records', { count: data.length })}
            placeholder={t('%(count)s records...', { count: data.length })}
            value={searchText}
            onChange={event => setSearchText(event.target.value)}
          />
        </Space>
      </div>
      {!rowIdentityIsValid && (
        <div
          role="alert"
          style={{
            background: '#fff2f0',
            color: '#a8071a',
            padding: '8px 12px',
          }}
        >
          {hasDuplicateRowId
            ? t(
                'The selected row identifier contains duplicate values. Choose a column with a unique value for each alert.',
              )
            : t(
                'Choose a row identifier column with a non-empty value for every alert before selecting rows.',
              )}
        </div>
      )}
      {badgeConfiguration && invalidBadgeRuleLines.length > 0 && (
        <div
          role="alert"
          style={{
            background: '#fff2f0',
            color: '#a8071a',
            padding: '8px 12px',
          }}
        >
          {t(
            'Badge rules on lines %(lines)s are invalid. Use source value | badge text | hex color.',
            { lines: invalidBadgeRuleLines.join(', ') },
          )}
        </div>
      )}
      {badgeConfigurationIsIncomplete && (
        <div
          role="alert"
          style={{
            background: '#fffbe6',
            color: '#ad6800',
            padding: '8px 12px',
          }}
        >
          {t(
            'Choose both a table column to badge and a badge data column in Badge Configuration.',
          )}
        </div>
      )}
      {badgeConfiguration &&
        badgeRulesText.trim() === '' &&
        configuredBadgeRules.length === 0 && (
          <div
            role="alert"
            style={{
              background: '#fffbe6',
              color: '#ad6800',
              padding: '8px 12px',
            }}
          >
            {t(
              'Badge configuration is enabled, but no valid badge rules are set.',
            )}
          </div>
        )}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            borderCollapse: 'collapse',
            minWidth: '100%',
            textAlign: 'left',
            whiteSpace: 'nowrap',
          }}
        >
          <thead>
            <tr>
              <th
                aria-label={t('Row selection')}
                style={{
                  background: tableHeaderColor,
                  color: tableHeaderTextColor,
                  borderBottom: '2px solid #d9d9d9',
                  borderRight: '2px solid #d9d9d9',
                  padding: '8px 12px',
                  position: 'sticky',
                  top: 0,
                  width: 40,
                }}
              />
              {columns.map((column, columnIndex) => (
                <th
                  key={column}
                  scope="col"
                  aria-sort={
                    sortBy?.column !== column
                      ? 'none'
                      : sortBy.descending
                        ? 'descending'
                        : 'ascending'
                  }
                  style={{
                    background: tableHeaderColor,
                    color: tableHeaderTextColor,
                    borderBottom: '2px solid #d9d9d9',
                    borderRight:
                      columnIndex === columns.length - 1
                        ? undefined
                        : '2px solid #d9d9d9',
                    padding: '8px 12px',
                    position: 'sticky',
                    top: 0,
                  }}
                >
                  <button
                    onClick={() => toggleSort(column)}
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: 'inherit',
                      cursor: 'pointer',
                      font: 'inherit',
                      padding: 0,
                    }}
                    type="button"
                  >
                    {column}
                    {sortBy?.column === column
                      ? sortBy.descending
                        ? ' ↓'
                        : ' ↑'
                      : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(
              ({ row, index: rowIndex, key }, visibleRowIndex) => {
                const rowKey = key || `invalid-row-${rowIndex}`;
                const isSelected = key ? selectedRows.has(key) : false;
                const isExpanded = expandedRows.has(rowKey);
                return (
                  <Fragment key={rowKey}>
                    <tr>
                      <td
                        style={{
                          borderBottom: '1px solid #eee',
                          borderRight: '2px solid #d9d9d9',
                          background: isSelected ? '#e6f4ff' : undefined,
                          padding: '8px 12px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <input
                          aria-label={t('Select row %(rowNumber)s', {
                            rowNumber: visibleRowIndex + 1,
                          })}
                          checked={isSelected}
                          disabled={!rowIdentityIsValid || !key}
                          onChange={() => key && toggleRow(key)}
                          type="checkbox"
                        />
                        {extendedColumns.length > 0 && (
                          <button
                            aria-expanded={isExpanded}
                            aria-label={
                              isExpanded
                                ? t(
                                    'Hide extended data for row %(rowNumber)s',
                                    {
                                      rowNumber: visibleRowIndex + 1,
                                    },
                                  )
                                : t(
                                    'Show extended data for row %(rowNumber)s',
                                    {
                                      rowNumber: visibleRowIndex + 1,
                                    },
                                  )
                            }
                            onClick={() => toggleExpandedRow(rowKey)}
                            style={{
                              background: 'transparent',
                              border: 0,
                              cursor: 'pointer',
                              fontSize: 14,
                              marginLeft: 8,
                              padding: 0,
                            }}
                            type="button"
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                        )}
                      </td>
                      {columns.map((column, columnIndex) => {
                        const columnNames = [
                          column,
                          ...(columnAliases[column] || []),
                        ].map(name => name.trim().toLocaleLowerCase());
                        const isSelectedSeverityColumn = (
                          selectedColumn: string,
                        ) =>
                          columnNames.includes(
                            selectedColumn.trim().toLocaleLowerCase(),
                          );
                        const isConfiguredBadgeColumn =
                          badgeConfiguration &&
                          columnNames.includes(
                            badgeColumn.trim().toLocaleLowerCase(),
                          );
                        const sourceValue = displayValue(
                          row[badgeValueColumn],
                        ).trim();
                        const normalizedSourceValue =
                          badgeDataType === 'number' && sourceValue
                            ? String(Number(sourceValue))
                            : sourceValue.toLocaleLowerCase();
                        const configuredRule =
                          badgeConfiguration && isConfiguredBadgeColumn
                            ? configuredBadgeRules.find(
                                rule =>
                                  rule.sourceValue === normalizedSourceValue,
                              )
                            : undefined;
                        const hasConfiguredRulesForColumn =
                          isConfiguredBadgeColumn;
                        const isSeverityColumn = severityColumns.some(
                          isSelectedSeverityColumn,
                        );
                        const badge =
                          configuredRule ||
                          (hasConfiguredRulesForColumn || !isSeverityColumn
                            ? undefined
                            : getSeverityBadge(row[column]));
                        return (
                          <td
                            key={column}
                            style={{
                              borderBottom: '1px solid #eee',
                              borderRight:
                                columnIndex === columns.length - 1
                                  ? undefined
                                  : '2px solid #d9d9d9',
                              background: isSelected ? '#e6f4ff' : undefined,
                              padding: '8px 12px',
                            }}
                          >
                            {badge ? (
                              <span
                                style={{
                                  backgroundColor: badge.backgroundColor,
                                  border: `1px solid ${
                                    'borderColor' in badge
                                      ? badge.borderColor
                                      : badge.backgroundColor
                                  }`,
                                  borderRadius: 2,
                                  color:
                                    'textColor' in badge
                                      ? badge.textColor
                                      : badge.color,
                                  display: 'inline-block',
                                  fontWeight: 500,
                                  lineHeight: '20px',
                                  padding: '0 8px',
                                  textAlign: 'center',
                                }}
                              >
                                {badge.label}
                              </span>
                            ) : (
                              displayValue(row[column])
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && extendedColumns.length > 0 && (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          style={{
                            background: '#fafafa',
                            borderBottom: '1px solid #eee',
                            padding: '12px 20px',
                          }}
                        >
                          <dl
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'max-content 1fr',
                              gap: '8px 16px',
                              margin: 0,
                            }}
                          >
                            {extendedColumns.map(column => (
                              <div
                                key={column}
                                style={{
                                  display: 'contents',
                                }}
                              >
                                <dt style={{ fontWeight: 600 }}>{column}</dt>
                                <dd style={{ margin: 0 }}>
                                  {displayValue(row[column])}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              },
            )}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(columns.length + 1, 1)}
                  style={{ padding: 16, textAlign: 'center' }}
                >
                  {searchText
                    ? t('No alerts match your search')
                    : t('No alerts found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
