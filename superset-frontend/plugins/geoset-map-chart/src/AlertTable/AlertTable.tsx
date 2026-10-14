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
import { useEffect, useRef, useState } from 'react';

export interface AlertTableProps {
  data: DataRecord[];
  columns: string[];
  buttonText: string;
  headerColor?: { r: number; g: number; b: number; a?: number };
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
  buttonText,
  headerColor,
  height,
  width,
}: AlertTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const allRowsSelected = data.length > 0 && selectedRows.size === data.length;
  const tableHeaderColor = getHeaderColor(headerColor);

  useEffect(() => {
    setSelectedRows(new Set());
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
                  borderBottom: '1px solid #d9d9d9',
                  padding: '8px 12px',
                  position: 'sticky',
                  top: 0,
                  width: 40,
                }}
              />
              {columns.map(column => (
                <th
                  key={column}
                  scope="col"
                  style={{
                    background: tableHeaderColor,
                    borderBottom: '1px solid #d9d9d9',
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
              <tr key={rowIndex}>
                <td
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '8px 12px',
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
                </td>
                {columns.map(column => (
                  <td
                    key={column}
                    style={{
                      borderBottom: '1px solid #eee',
                      padding: '8px 12px',
                    }}
                  >
                    {displayValue(row[column])}
                  </td>
                ))}
              </tr>
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
