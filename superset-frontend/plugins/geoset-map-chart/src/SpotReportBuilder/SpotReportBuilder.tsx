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
 */
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';
import { DataRecord, t } from '@superset-ui/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribeToSpotReportRequest } from '../utils/spotReportSelection';

export interface SpotReportBuilderProps {
  defaultEventName: string;
  defaultStatus: string;
  defaultLocation: string;
  defaultSituation: string;
  defaultProgramImpacts: string;
  defaultSources: string;
  height: number;
  width: number;
}

type ReportValues = {
  eventName: string;
  status: string;
  location: string;
  situation: string;
  programImpacts: string;
  sources: string;
};

const STATUS_OPTIONS = [
  { value: 'Ongoing', label: t('Ongoing') },
  { value: 'Monitoring', label: t('Monitoring') },
  { value: 'Resolved', label: t('Resolved') },
  { value: 'Draft', label: t('Draft') },
];

function buildReportText(values: ReportValues): string {
  return [
    'SPOT REPORT',
    '',
    'EVENT OVERVIEW',
    `Event name / type: ${values.eventName}`,
    `Status: ${values.status}`,
    `Location: ${values.location}`,
    '',
    'IMPACT / SITUATION',
    values.situation,
    '',
    'ACF PROGRAM CONTEXT',
    values.programImpacts,
    '',
    'SOURCES',
    values.sources,
  ].join('\n');
}

function getFirstValue(row: DataRecord, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value);
    }
  }
  return '';
}

function formatReportTimestamp(value: string): string {
  if (!value) {
    return '';
  }
  const numericValue = Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(
        numericValue < 1_000_000_000_000 ? numericValue * 1000 : numericValue,
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function valuesFromSelectedAlerts(rows: DataRecord[]): Partial<ReportValues> {
  const firstRow = rows[0] || {};
  const eventName = getFirstValue(firstRow, [
    'event',
    'Event',
    'headline',
    'alert_type',
  ]);
  const locations = Array.from(
    new Set(
      rows
        .map(row =>
          getFirstValue(row, [
            'location_name',
            'location',
            'estimated_event_location',
          ]),
        )
        .filter(Boolean),
    ),
  );
  const location = locations.join('; ');
  const situation = rows
    .map((row, index) => {
      const eventType = getFirstValue(row, ['event', 'Event', 'alert_type']);
      const headline = getFirstValue(row, ['headline', 'situation', 'status']);
      const alertLocation = getFirstValue(row, [
        'location_name',
        'location',
        'estimated_event_location',
      ]);
      const details = [
        eventType,
        headline ? `Summary: ${headline}` : '',
        alertLocation ? `Location: ${alertLocation}` : '',
      ].filter(Boolean);
      if (details.length > 0) {
        details.push(`Source ${index + 1}`);
      }
      return details.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  const sources = rows
    .map((row, index) => {
      const sourceAttribution = getFirstValue(row, [
        'source_attribution',
        'Source',
        'source',
      ]);
      const sourceUrl = getFirstValue(row, [
        'source_url',
        'Source URL ',
        'Source URL',
      ]);
      const timestamp = getFirstValue(row, [
        'alert_timestamp',
        'Time',
        'inserted_time',
      ]);
      const sourceDetails = [
        sourceAttribution,
        formatReportTimestamp(timestamp),
      ]
        .filter(Boolean)
        .join(' • ');
      return [
        `Source ${index + 1}`,
        sourceDetails,
        sourceUrl,
      ]
        .filter(Boolean)
        .join(' • ');
    })
    .filter(Boolean)
    .join('\n\n');

  return {
    eventName,
    location,
    situation,
    sources,
  };
}

export default function SpotReportBuilder({
  defaultEventName,
  defaultStatus,
  defaultLocation,
  defaultSituation,
  defaultProgramImpacts,
  defaultSources,
  height,
  width,
}: SpotReportBuilderProps) {
  const [form] = Form.useForm<ReportValues>();
  const [copied, setCopied] = useState(false);
  const isDirtyRef = useRef(false);
  const [selectedAlertCount, setSelectedAlertCount] = useState(0);
  const initialValues: ReportValues = {
    eventName: defaultEventName,
    status: defaultStatus,
    location: defaultLocation,
    situation: defaultSituation,
    programImpacts: defaultProgramImpacts,
    sources: defaultSources,
  };

  const importSelectedAlerts = useCallback(
    (rows: DataRecord[]) => {
      form.setFieldsValue(valuesFromSelectedAlerts(rows));
      setSelectedAlertCount(rows.length);
      isDirtyRef.current = false;
      setCopied(false);
    },
    [form],
  );

  useEffect(() => {
    const unsubscribe = subscribeToSpotReportRequest(rows => {
      if (rows.length === 0) {
        setSelectedAlertCount(0);
        return;
      }

      if (!isDirtyRef.current) {
        importSelectedAlerts(rows);
        return;
      }

      Modal.confirm({
        cancelText: t('Keep draft'),
        centered: true,
        content: t(
          'Importing these alerts will replace the current report fields.',
        ),
        okText: t('Replace draft'),
        onOk: () => importSelectedAlerts(rows),
        title: t('Replace current draft?'),
      });
    });

    return unsubscribe;
  }, [importSelectedAlerts]);

  const copyReport = async () => {
    const reportText = buildReportText(form.getFieldsValue());
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(reportText).then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const clearReport = () => {
    const hasReportContent = Object.values(form.getFieldsValue()).some(
      value => String(value ?? '').trim() !== '',
    );
    const clear = () => {
      form.setFieldsValue({
        eventName: '',
        status: '',
        location: '',
        situation: '',
        programImpacts: '',
        sources: '',
      });
      setSelectedAlertCount(0);
      isDirtyRef.current = false;
      setCopied(false);
    };

    if (!hasReportContent) {
      clear();
      return;
    }

    Modal.confirm({
      cancelText: t('Cancel'),
      centered: true,
      content: t('This will remove the current report fields.'),
      okText: t('Clear draft'),
      onOk: clear,
      title: t('Clear report draft?'),
    });
  };

  return (
    <div
      style={{
        boxSizing: 'border-box',
        height,
        overflow: 'auto',
        padding: 24,
        width,
      }}
    >
      <div style={{ alignItems: 'center', display: 'flex', gap: 12 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {t('SPOT Report Builder')}
        </Typography.Title>
        <span
          style={{
            background: '#e6f4ff',
            borderRadius: 16,
            color: '#0958d9',
            padding: '4px 12px',
          }}
        >
          {t('Draft')}
        </span>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginTop: 4 }}>
        {selectedAlertCount > 0
          ? t(
              'Prefilled from %(count)s selected alerts. Edit before copying.',
              {
                count: selectedAlertCount,
              },
            )
          : t('Select alerts in the alert table or edit the report manually.')}
      </Typography.Paragraph>

      <Form
        form={form}
        initialValues={initialValues}
        layout="vertical"
        onValuesChange={() => {
          setCopied(false);
          isDirtyRef.current = true;
        }}
      >
        <Typography.Title level={4}>{t('1. Event Overview')}</Typography.Title>
        <div
          style={{
            display: 'grid',
            gap: '0 24px',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          <Form.Item label={t('Event name / type')} name="eventName">
            <Input />
          </Form.Item>
          <Form.Item label={t('Status')} name="status">
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item label={t('Location')} name="location">
            <Input />
          </Form.Item>
        </div>

        <div
          style={{
            display: 'grid',
            gap: '0 24px',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          }}
        >
          <div>
            <Typography.Title level={4}>
              {t('2. Impact / Situation')}
            </Typography.Title>
            <Form.Item label={t('Situation summary')} name="situation">
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
          <div>
            <Typography.Title level={4}>
              {t('3. ACF Program Context')}
            </Typography.Title>
            <Form.Item
              label={t('Potential program impacts (optional)')}
              name="programImpacts"
            >
              <Input.TextArea rows={4} />
            </Form.Item>
          </div>
        </div>

        <Typography.Title level={4}>{t('4. Sources')}</Typography.Title>
        <Form.Item label={t('Sources / references')} name="sources">
          <Input.TextArea rows={4} />
        </Form.Item>

        <Space style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button onClick={clearReport}>{t('Clear')}</Button>
          <Button type="primary" onClick={copyReport}>
            {copied ? t('Copied') : t('Copy Report Text')}
          </Button>
        </Space>
      </Form>
    </div>
  );
}
