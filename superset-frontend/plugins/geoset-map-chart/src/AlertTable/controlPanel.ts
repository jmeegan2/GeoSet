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
import { ControlPanelConfig, sharedControls } from '@superset-ui/chart-controls';
import { t, validateNonEmpty } from '@superset-ui/core';

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
        [{ name: 'all_columns', config: columnsControl }],
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
            name: 'button_text',
            config: {
              type: 'TextControl',
              label: t('Button text'),
              description: t('Text displayed on the table action button.'),
              default: '',
              renderTrigger: true,
              validators: [validateNonEmpty],
            },
          },
        ],
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
            name: 'button_color',
            config: {
              type: 'ColorPickerControl',
              label: t('Button color'),
              description: t(
                'Set a background color for the table action button. Leave unset to use the default color.',
              ),
              default: null,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default controlPanel;
