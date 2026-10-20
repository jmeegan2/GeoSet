/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
import { ControlPanelConfig } from '@superset-ui/chart-controls';
import { t } from '@superset-ui/core';

const textControl = (label: string, defaultValue = '') => ({
  type: 'TextControl',
  label: t(label),
  default: defaultValue,
  renderTrigger: true,
});

const textAreaControl = (label: string) => ({
  type: 'TextAreaControl',
  label: t(label),
  default: '',
  renderTrigger: true,
});

const controlPanel: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Report defaults'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'default_event_name',
            config: textControl('Event name / type'),
          },
        ],
        [{ name: 'default_status', config: textControl('Status', 'Ongoing') }],
        [{ name: 'default_location', config: textControl('Location') }],
        [
          {
            name: 'default_situation',
            config: textAreaControl('Situation summary'),
          },
        ],
        [
          {
            name: 'default_program_impacts',
            config: textAreaControl('Potential program impacts'),
          },
        ],
        [
          {
            name: 'default_sources',
            config: textAreaControl('Sources / references'),
          },
        ],
      ],
    },
  ],
};

export default controlPanel;
