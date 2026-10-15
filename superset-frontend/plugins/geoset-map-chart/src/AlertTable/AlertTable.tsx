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
import { Fragment, useEffect, useRef, useState } from 'react';

export interface AlertTableProps {
  data: DataRecord[];
  columns: string[];
  extendedColumns: string[];
  buttonText: string;
  headerColor?: { r: number; g: number; b: number; a?: number };
  headerTextColor?: { r: number; g: number; b: number; a?: number };
  buttonColor?: { r: number; g: number; b: number; a?: number };
  height: number;
  width: number;
}

const DEFAULT_HEADER_COLOR = '#f5f5f5';

function getHeaderColor(
  color?: AlertTableProps['headerColor'],
): string {
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

export default function AlertTable({
  data,
  columns,
  extendedColumns,
  buttonText,
  headerColor,
  headerTextColor,
  buttonColor,
  height,
  width,
}: AlertTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allRowsSelected = data.length > 0 && selectedRows.size === data.length;
  const tableHeaderColor = getHeaderColor(headerColor);
  const tableHeaderTextColor = headerTextColor
    ? `rgba(${headerTextColor.r}, ${headerTextColor.g}, ${headerTextColor.b}, ${headerTextColor.a ?? 1})`
    : undefined;
  const tableButtonColor = getButtonColor(buttonColor);
  const tableButtonTextColor = getButtonTextColor(buttonColor);

  useEffect(() => {
    setSelectedRows(new Set());
    setExpandedRows(new Set());
  }, [data]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedRows.size > 0 && !allRowsSelected;
    }
  }, [allRowsSelected, selectedRows.size]);

  const toggleRow = (rowIndex: number) => {
    setSelectedRows(previous => {
      const next = new Set(previous);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  const toggleAllRows = () => {
    setSelectedRows(allRowsSelected ? new Set() : new Set(data.map((_, i) => i)));
  };

  const toggleExpandedRow = (rowIndex: number) => {
    setExpandedRows(previous => {
      const next = new Set(previous);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
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
          padding: '8px 12px',
        }}
      >
        <label style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
          <input
            aria-label={t('Select all rows')}
            checked={allRowsSelected}
            onChange={toggleAllRows}
            ref={selectAllRef}
            type="checkbox"
          />
          {selectedRows.size > 0
            ? t('%(count)s selected', { count: selectedRows.size })
            : t('Select all')}
        </label>
        <button
          disabled={selectedRows.size === 0}
          title={t('This action button is not connected to an action yet.')}
          type="button"
          style={{
            padding: '10px 18px',
            fontSize: 14,
            ...(tableButtonColor
              ? {
                  backgroundColor: tableButtonColor,
                  borderColor: tableButtonColor,
                  color: tableButtonTextColor,
                }
              : {}),
          }}
        >
          {buttonText}
        </button>
      </div>
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
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <Fragment key={rowIndex}>
                <tr>
                  <td
                    style={{
                      borderBottom: '1px solid #eee',
                      borderRight: '2px solid #d9d9d9',
                      padding: '8px 12px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <input
                      aria-label={t('Select row %(rowNumber)s', {
                        rowNumber: rowIndex + 1,
                      })}
                      checked={selectedRows.has(rowIndex)}
                      onChange={() => toggleRow(rowIndex)}
                      type="checkbox"
                    />
                    {extendedColumns.length > 0 && (
                      <button
                        aria-expanded={expandedRows.has(rowIndex)}
                        aria-label={
                          expandedRows.has(rowIndex)
                            ? t('Hide extended data for row %(rowNumber)s', {
                                rowNumber: rowIndex + 1,
                              })
                            : t('Show extended data for row %(rowNumber)s', {
                                rowNumber: rowIndex + 1,
                              })
                        }
                        onClick={() => toggleExpandedRow(rowIndex)}
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
                        {expandedRows.has(rowIndex) ? '▾' : '▸'}
                      </button>
                    )}
                  </td>
                  {columns.map((column, columnIndex) => (
                    <td
                      key={column}
                      style={{
                        borderBottom: '1px solid #eee',
                        borderRight:
                          columnIndex === columns.length - 1
                            ? undefined
                            : '2px solid #d9d9d9',
                        padding: '8px 12px',
                      }}
                    >
                      {displayValue(row[column])}
                    </td>
                  ))}
                </tr>
                {expandedRows.has(rowIndex) && extendedColumns.length > 0 && (
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
            ))}
            {data.length === 0 && (
              <tr>
                <td
                  colSpan={Math.max(columns.length + 1, 1)}
                  style={{ padding: 16, textAlign: 'center' }}
                >
                  {t('No alerts found')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
