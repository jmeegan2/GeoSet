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
import { Button, Form, Input, Modal, Space, Typography } from 'antd';
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

const STATE_NAMES_BY_FIPS: Record<string, string> = {
  '01': 'Alabama',
  '02': 'Alaska',
  '04': 'Arizona',
  '05': 'Arkansas',
  '06': 'California',
  '08': 'Colorado',
  '09': 'Connecticut',
  '10': 'Delaware',
  '11': 'District of Columbia',
  '12': 'Florida',
  '13': 'Georgia',
  '15': 'Hawaii',
  '16': 'Idaho',
  '17': 'Illinois',
  '18': 'Indiana',
  '19': 'Iowa',
  '20': 'Kansas',
  '21': 'Kentucky',
  '22': 'Louisiana',
  '23': 'Maine',
  '24': 'Maryland',
  '25': 'Massachusetts',
  '26': 'Michigan',
  '27': 'Minnesota',
  '28': 'Mississippi',
  '29': 'Missouri',
  '30': 'Montana',
  '31': 'Nebraska',
  '32': 'Nevada',
  '33': 'New Hampshire',
  '34': 'New Jersey',
  '35': 'New Mexico',
  '36': 'New York',
  '37': 'North Carolina',
  '38': 'North Dakota',
  '39': 'Ohio',
  '40': 'Oklahoma',
  '41': 'Oregon',
  '42': 'Pennsylvania',
  '44': 'Rhode Island',
  '45': 'South Carolina',
  '46': 'South Dakota',
  '47': 'Tennessee',
  '48': 'Texas',
  '49': 'Utah',
  '50': 'Vermont',
  '51': 'Virginia',
  '53': 'Washington',
  '54': 'West Virginia',
  '55': 'Wisconsin',
  '56': 'Wyoming',
  '60': 'American Samoa',
  '66': 'Guam',
  '69': 'Northern Mariana Islands',
  '72': 'Puerto Rico',
  '78': 'U.S. Virgin Islands',
};

async function getAcfProgramContext(rows: DataRecord[]): Promise<string> {
  const alertIds = Array.from(
    new Set(rows.map(row => getFirstValue(row, ['alert_id'])).filter(Boolean)),
  );
  if (alertIds.length === 0) {
    return '';
  }

  try {
    const query = new URLSearchParams();
    query.set('alert_ids', alertIds.join(','));
    const response = await fetch(
      `/api/v1/geoset_map/acf_program_counts/?${query.toString()}`,
    );
    if (process.env.NODE_ENV !== 'production') {
      console.info('[GeoSet Spot Report Builder] ACF lookup response', {
        ok: response.ok,
        status: response.status,
      });
    }
    if (!response.ok) {
      return '';
    }
    const data = await response.json();
    const acfData = data?.result as
      | {
          counties?: Array<{
            alert_id: string;
            county_name: string;
            location_count: number;
            state_code: string;
          }>;
        }
      | undefined;
    if (!acfData) {
      return '';
    }
    const counties = acfData.counties || [];
    const alertNumberById = new Map(
      rows.map((row, index) => [getFirstValue(row, ['alert_id']), index + 1]),
    );
    const groupedCounties = new Map<
      string,
      {
        alertNumbers: number[];
        countyName: string;
        locationCount: number;
        stateCode: string;
      }
    >();
    counties.forEach(county => {
      const countyName = /county$/i.test(county.county_name)
        ? county.county_name
        : `${county.county_name} County`;
      const key = `${countyName}|${county.state_code}`;
      const group = groupedCounties.get(key) || {
        alertNumbers: [],
        countyName,
        locationCount: county.location_count,
        stateCode: county.state_code,
      };
      const alertNumber = alertNumberById.get(county.alert_id);
      if (alertNumber && !group.alertNumbers.includes(alertNumber)) {
        group.alertNumbers.push(alertNumber);
      }
      groupedCounties.set(key, group);
    });
    const countyLines = Array.from(groupedCounties.values())
      .sort((a, b) =>
        Math.min(...a.alertNumbers, Number.MAX_SAFE_INTEGER) -
        Math.min(...b.alertNumbers, Number.MAX_SAFE_INTEGER),
      )
      .map(group => {
        const stateName = STATE_NAMES_BY_FIPS[group.stateCode];
        const location = `${group.countyName}${
          stateName ? `, ${stateName}` : ''
        }`;
        const sortedAlertNumbers = group.alertNumbers.sort((a, b) => a - b);
        const alertLabel =
          sortedAlertNumbers.length === 1
            ? `Alert ${sortedAlertNumbers[0]}`
            : `Alerts ${sortedAlertNumbers
                .slice(0, -1)
                .join(', ')} and ${sortedAlertNumbers[
                sortedAlertNumbers.length - 1
              ]}`;
        return `${alertLabel} — ${location}: There ${
          group.locationCount === 1 ? 'is' : 'are'
        } ${group.locationCount} ACF program location${
          group.locationCount === 1 ? '' : 's'
        }.`;
      });
    const context = countyLines.join('\n');
    if (process.env.NODE_ENV !== 'production') {
      console.info(
        '[GeoSet Spot Report Builder] ACF context generated',
        context,
      );
    }
    return context;
  } catch {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[GeoSet Spot Report Builder] ACF lookup failed');
    }
    return '';
  }
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

function getAlertTimestamp(row: DataRecord): string {
  return getFirstValue(row, ['alert_timestamp', 'Time', 'inserted_time']);
}

const AGENTIC_CONTEXT_FIELDS = [
  ['status', 'Status'],
  ['primary_cause', 'Primary cause'],
  ['emergency_response', 'Emergency response'],
  // Deferred for a future detailed-intelligence view:
  // ['property_damage', 'Property damage'],
  // ['casualties', 'Casualties'],
  // ['travel_disruptions', 'Travel disruptions'],
  // ['weather_forecasts', 'Weather and forecasts'],
  // ['start_date_time', 'Start date and time'],
] as const;

function parseAgenticContext(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    // Some PostgreSQL/Superset responses serialize JSONB as a Python-style
    // object literal using single quotes instead of valid JSON.
    const context: Record<string, unknown> = {};
    const entryPattern = /'([^']+)'\s*:\s*'([^']*)'|"([^"]+)"\s*:\s*"([^"]*)"/g;
    for (const match of value.matchAll(entryPattern)) {
      const key = match[1] || match[3];
      const entryValue = match[2] || match[4];
      if (key) {
        context[key] = entryValue;
      }
    }
    return context;
  }
}

function formatAgenticContextValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(formatAgenticContextValue).join('; ');
  }
  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function getAgenticContextSummary(row: DataRecord): string[] {
  const context = parseAgenticContext(row.agentic_context);
  return AGENTIC_CONTEXT_FIELDS.flatMap(([key, label]) => {
    const value = context[key];
    if (value === null || value === undefined || String(value).trim() === '') {
      return [];
    }
    return `${label}: ${formatAgenticContextValue(value)}`;
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
  const alertBlocks = rows
    .map((row, index) => {
      const eventType = getFirstValue(row, ['event', 'Event', 'alert_type']);
      const headline = getFirstValue(row, ['headline', 'situation', 'status']);
      const alertLocation = getFirstValue(row, [
        'location_name',
        'location',
        'estimated_event_location',
      ]);
      const shortLocation = alertLocation.replace(/,\s*USA$/i, '');
      const alertTimestamp = getAlertTimestamp(row);
      const details = [
        `ALERT ${index + 1}${eventType ? ` — ${eventType}` : ''}${
          alertTimestamp ? ` — ${formatReportTimestamp(alertTimestamp)}` : ''
        }`,
        shortLocation ? `Location: ${shortLocation}` : '',
        headline ? `Summary: ${headline}` : '',
        ...getAgenticContextSummary(row),
      ].filter(Boolean);
      return details.join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  const situation = alertBlocks;
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
      const sourceDetails = [sourceAttribution].filter(Boolean).join(' • ');
      return [`Alert ${index + 1}`, sourceDetails, sourceUrl]
        .filter(Boolean)
        .join('\n');
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
    async (rows: DataRecord[], onComplete: () => void) => {
      try {
        form.setFieldsValue(valuesFromSelectedAlerts(rows));
        setSelectedAlertCount(rows.length);
        isDirtyRef.current = false;
        setCopied(false);
        const acfContext = await getAcfProgramContext(rows);
        if (process.env.NODE_ENV !== 'production') {
          console.info(
            '[GeoSet Spot Report Builder] Setting ACF context',
            acfContext,
          );
        }
        form.setFieldsValue({ programImpacts: acfContext });
      } finally {
        onComplete();
      }
    },
    [form],
  );

  useEffect(() => {
    const unsubscribe = subscribeToSpotReportRequest((rows, onComplete) => {
      if (rows.length === 0) {
        setSelectedAlertCount(0);
        onComplete();
        return;
      }

      if (!isDirtyRef.current) {
        importSelectedAlerts(rows, onComplete);
        return;
      }

      Modal.confirm({
        cancelText: t('Keep draft'),
        centered: true,
        content: t(
          'Importing these alerts will replace the current report fields.',
        ),
        okText: t('Replace draft'),
        onCancel: onComplete,
        onOk: () => importSelectedAlerts(rows, onComplete),
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
            <Input placeholder={t('e.g. Ongoing, Monitoring, or Resolved')} />
          </Form.Item>
          <Form.Item label={t('Location')} name="location">
            <Input />
          </Form.Item>
        </div>

        <Typography.Title level={4}>
          {t('2. Impact / Situation Summary')}
        </Typography.Title>
        <Form.Item label={t('Situation summary')} name="situation">
          <Input.TextArea autoSize={{ minRows: 4, maxRows: 20 }} />
        </Form.Item>

        <div>
          <Typography.Title level={4}>
            {t('3. ACF Program Context')}
          </Typography.Title>
          <Form.Item
            label={t('Potential program impacts (optional)')}
            name="programImpacts"
          >
            <Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} />
          </Form.Item>
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
