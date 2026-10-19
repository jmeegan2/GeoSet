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
  buildQueryContext,
  getColumnLabel,
  QueryFormColumn,
  QueryFormData,
} from '@superset-ui/core';

type AlertTableFormData = QueryFormData & {
  all_columns?: QueryFormColumn[];
  extended_columns?: QueryFormColumn[];
  row_id_column?: string;
  badge_value_column?: string;
};

export default function buildQuery(formData: AlertTableFormData) {
  const reportColumns = [
    'headline',
    'location_name',
    'alert_timestamp',
    'source_url',
    'source_attribution',
    'alert_id',
    'event_id',
  ];
  const columns = [
    ...(formData.row_id_column ? [formData.row_id_column] : []),
    ...(formData.badge_value_column ? [formData.badge_value_column] : []),
    ...(formData.all_columns || []),
    ...(formData.extended_columns || []),
    ...reportColumns,
  ].filter(
    (column, index, allColumns) =>
      allColumns.findIndex(
        existing => getColumnLabel(existing) === getColumnLabel(column),
      ) === index,
  );

  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns,
      groupby: [],
      metrics: [],
      is_timeseries: false,
    },
  ]);
}
