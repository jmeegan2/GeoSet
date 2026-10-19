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
import {
  ChartProps,
  DataRecord,
  getColumnLabel,
  QueryFormColumn,
} from '@superset-ui/core';

export default function transformProps(chartProps: ChartProps) {
  const { height, queriesData, rawFormData, width } = chartProps;
  const queryData = queriesData[0];
  const data: DataRecord[] = queryData?.data || [];
  const visibleColumns = Array.isArray(rawFormData.all_columns)
    ? (rawFormData.all_columns as QueryFormColumn[]).map(getColumnLabel)
    : [];
  const severityColumns = Array.isArray(rawFormData.severity_columns)
    ? rawFormData.severity_columns.filter(
        (column): column is string => typeof column === 'string',
      )
    : [];
  const badgeConfiguration = rawFormData.badge_configuration === true;
  const badgeRules =
    typeof rawFormData.badge_rules === 'string' ? rawFormData.badge_rules : '';
  const rowIdColumn =
    typeof rawFormData.row_id_column === 'string'
      ? rawFormData.row_id_column
      : '';
  const extendedColumns = Array.isArray(rawFormData.extended_columns)
    ? (rawFormData.extended_columns as QueryFormColumn[]).map(getColumnLabel)
    : [];
  const columns =
    visibleColumns.length > 0
      ? visibleColumns
      : queryData?.colnames || Object.keys(data[0] || {});
  const buttonText =
    typeof rawFormData.button_text === 'string' ? rawFormData.button_text : '';
  const color = rawFormData.header_color;
  const headerColor =
    color &&
    typeof color === 'object' &&
    'r' in color &&
    'g' in color &&
    'b' in color
      ? {
          r: Number(color.r),
          g: Number(color.g),
          b: Number(color.b),
          a: 'a' in color ? Number(color.a) : 1,
        }
      : undefined;
  const headerTextColorValue = rawFormData.header_text_color;
  const headerTextColor =
    headerTextColorValue &&
    typeof headerTextColorValue === 'object' &&
    'r' in headerTextColorValue &&
    'g' in headerTextColorValue &&
    'b' in headerTextColorValue
      ? {
          r: Number(headerTextColorValue.r),
          g: Number(headerTextColorValue.g),
          b: Number(headerTextColorValue.b),
          a: 'a' in headerTextColorValue ? Number(headerTextColorValue.a) : 1,
        }
      : undefined;
  const buttonColorValue = rawFormData.button_color;
  const buttonColor =
    buttonColorValue &&
    typeof buttonColorValue === 'object' &&
    'r' in buttonColorValue &&
    'g' in buttonColorValue &&
    'b' in buttonColorValue
      ? {
          r: Number(buttonColorValue.r),
          g: Number(buttonColorValue.g),
          b: Number(buttonColorValue.b),
          a: 'a' in buttonColorValue ? Number(buttonColorValue.a) : 1,
        }
      : undefined;

  return {
    buttonColor,
    buttonText,
    badgeConfiguration,
    badgeRules,
    columns,
    data,
    extendedColumns: extendedColumns.filter(
      column => !columns.includes(column),
    ),
    severityColumns,
    headerColor,
    headerTextColor,
    height,
    rowIdColumn,
    width,
  };
}
