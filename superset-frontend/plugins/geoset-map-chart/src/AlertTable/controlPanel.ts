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
  ControlPanelConfig,
  sharedControls,
} from '@superset-ui/chart-controls';
import {
  getColumnLabel,
  QueryFormColumn,
  t,
  validateNonEmpty,
} from '@superset-ui/core';

const columnsControl = {
  ...sharedControls.groupby,
  label: t('Columns'),
  description: t('Select the columns to display in the alert table.'),
  multi: true,
  freeForm: true,
  allowAll: true,
  default: [],
  validators: [validateNonEmpty],
};

const controlPanel: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Query'),
      expanded: true,
      controlSetRows: [
        ['granularity_sqla'],
        ['time_range'],
        [
          {
            name: 'row_id_column',
            config: {
              type: 'SelectControl',
              label: t('Unique row identifier'),
              description: t(
                'Select a column with a unique, non-empty value for every alert. It is used to preserve row selection when sorting or filtering.',
              ),
              default: null,
              clearable: true,
              choices: [],
              mapStateToProps: ({ datasource }) => ({
                choices:
                  datasource?.columns?.map(
                    (column: {
                      column_name: string;
                      verbose_name?: string;
                    }) => [
                      column.column_name,
                      column.verbose_name || column.column_name,
                    ],
                  ) || [],
              }),
              validators: [validateNonEmpty],
            },
          },
        ],
        [{ name: 'all_columns', config: columnsControl }],
        [
          {
            name: 'extended_columns',
            config: {
              ...columnsControl,
              label: t('Extended data columns'),
              description: t(
                'Select additional fields to show when a table row is expanded.',
              ),
              default: [],
              validators: [],
            },
          },
        ],
        ['adhoc_filters'],
        ['row_limit'],
      ],
    },
    {
      label: t('Options'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'header_color',
            config: {
              type: 'ColorPickerControl',
              label: t('Column header color'),
              description: t(
                'Set a background color for the table column headers. Leave unset to use the default color.',
              ),
              default: null,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'header_text_color',
            config: {
              type: 'ColorPickerControl',
              label: t('Column header text color'),
              description: t(
                'Set the text color for the table column headers. Leave unset to use the default text color.',
              ),
              default: null,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
    {
      label: t('Customize'),
      tabOverride: 'customize',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'badge_configuration',
            config: {
              type: 'CheckboxControl',
              label: t('Need Badge Configuration'),
              description: t(
                'Enable custom badge rules for a selected table column.',
              ),
              default: false,
              rerender: [
                'badge_column',
                'badge_value_column',
                'badge_data_type',
                'badge_rules',
              ],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'badge_column',
            config: {
              type: 'SelectControl',
              label: t('Table column to badge'),
              description: t(
                'Choose the displayed table column where matching values should appear as badges.',
              ),
              default: null,
              clearable: true,
              choices: [],
              mapStateToProps: ({ controls }) => {
                const selectedColumns = controls?.all_columns?.value;
                return {
                  choices: Array.isArray(selectedColumns)
                    ? selectedColumns.map((column: QueryFormColumn) => [
                        getColumnLabel(column),
                        getColumnLabel(column),
                      ])
                    : [],
                };
              },
              visibility: ({ controls }) =>
                Boolean(controls.badge_configuration?.value),
              rerender: ['all_columns'],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'badge_value_column',
            config: {
              type: 'SelectControl',
              label: t('Badge data column'),
              description: t(
                'Choose the data column whose value is used to find a matching badge rule.',
              ),
              default: null,
              clearable: true,
              choices: [],
              mapStateToProps: ({ datasource }) => ({
                choices:
                  datasource?.columns?.map(
                    (column: {
                      column_name: string;
                      verbose_name?: string;
                    }) => [
                      column.column_name,
                      column.verbose_name || column.column_name,
                    ],
                  ) || [],
              }),
              visibility: ({ controls }) =>
                Boolean(controls.badge_configuration?.value),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'badge_data_type',
            config: {
              type: 'SelectControl',
              label: t('Badge data type'),
              description: t(
                'Choose how source values in the badge rules are matched.',
              ),
              default: 'text',
              clearable: false,
              choices: [
                ['text', t('Text')],
                ['number', t('Number')],
              ],
              visibility: ({ controls }) =>
                Boolean(controls.badge_configuration?.value),
              rerender: ['badge_rules'],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'badge_rules',
            config: {
              type: 'TextAreaControl',
              label: t('Badge rules'),
              description: t(
                'Enter one rule per line as: source value | badge text | hex color. Example: Low | Low | #1677ff',
              ),
              default: '',
              height: 120,
              minLines: 4,
              maxLines: 10,
              offerEditInModal: false,
              visibility: ({ controls }) =>
                Boolean(controls.badge_configuration?.value),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'severity_columns',
            config: {
              type: 'SelectControl',
              label: t('Automatic severity columns'),
              description: t(
                'Apply the built-in severity labels and colors to numeric values from 1 to 10 or Low, Medium, High, Severe, or Critical text.',
              ),
              default: [],
              multi: true,
              clearable: true,
              choices: [],
              mapStateToProps: ({ datasource }) => ({
                choices:
                  datasource?.columns?.map(
                    (column: {
                      column_name: string;
                      verbose_name?: string;
                    }) => [
                      column.column_name,
                      column.verbose_name || column.column_name,
                    ],
                  ) || [],
              }),
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default controlPanel;
