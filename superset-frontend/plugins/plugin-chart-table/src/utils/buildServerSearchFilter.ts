/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to You under the Apache License, Version 2.0 (the
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
import { QueryObjectFilterClause } from '@superset-ui/core';
import { TableChartFormData } from '../types';

export default function buildServerSearchFilter(
  formData: TableChartFormData,
  searchText?: string,
  selectedColumn?: string,
): QueryObjectFilterClause | undefined {
  if (!searchText || !selectedColumn) {
    return undefined;
  }

  const configuredColumn = (formData.all_columns || []).find(
    column =>
      typeof column === 'object' &&
      column !== null &&
      'label' in column &&
      column.label === selectedColumn,
  );
  // Preserve the full adhoc column definition. Virtual-dataset Jinja helpers
  // match filters by their string subject; reducing this to sqlExpression
  // would make filter_values('incident_type') consume an ILIKE search value
  // and incorrectly render it as an IN ('flood%') predicate.
  const searchColumn = configuredColumn || selectedColumn;

  return {
    col: searchColumn,
    op: 'ILIKE' as const,
    val: `%${searchText}%`,
  };
}
