/* eslint-disable jest-dom/prefer-in-document */
/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
// eslint-disable-next-line import/no-extraneous-dependencies
import { fireEvent, render, screen } from '@testing-library/react';
import SpotReportBuilder from '../src/SpotReportBuilder/SpotReportBuilder';
import { SPOT_REPORT_REQUEST_EVENT } from '../src/utils/spotReportSelection';

const props = {
  defaultEventName: 'Tropical Storm — Demo',
  defaultStatus: 'Ongoing',
  defaultLocation: 'Bay and Gulf counties, FL',
  defaultSituation: 'Shelters opened for residents.',
  defaultProgramImpacts: '',
  defaultSources: 'Local authority • 10:42 EDT • DEMO-001',
  height: 600,
  width: 1200,
};

const originalFetch = global.fetch;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockResolvedValue({
    json: async () => ({ result: { counties: [] } }),
    ok: true,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  fetchMock.mockReset();
  global.fetch = originalFetch;
});

test('renders editable report fields and defaults', () => {
  render(<SpotReportBuilder {...props} />);

  expect(screen.queryByDisplayValue(props.defaultEventName)).not.toBeNull();
  expect(screen.queryByDisplayValue(props.defaultLocation)).not.toBeNull();
  expect(screen.queryByDisplayValue(props.defaultSituation)).not.toBeNull();
  expect(screen.queryByText('SPOT Report Builder')).not.toBeNull();
});

test('clears the report and copies edited text', async () => {
  Object.assign(navigator, {
    clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
  });
  render(<SpotReportBuilder {...props} />);

  const eventName = screen.getByDisplayValue(props.defaultEventName);
  fireEvent.change(eventName, { target: { value: 'Updated event' } });
  fireEvent.click(screen.getByRole('button', { name: 'Copy Report Text' }));

  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining('Event name / type: Updated event'),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Clear draft' }));
  expect(screen.queryByDisplayValue(props.defaultEventName)).toBeNull();
});

test('asks before replacing an edited draft with new alerts', async () => {
  render(<SpotReportBuilder {...props} />);

  fireEvent.change(screen.getByDisplayValue(props.defaultEventName), {
    target: { value: 'My edited event' },
  });

  window.dispatchEvent(
    new CustomEvent(SPOT_REPORT_REQUEST_EVENT, {
      detail: {
        rows: [{ headline: 'New alert', location_name: 'New location' }],
      },
    }),
  );

  expect((await screen.findAllByText('Replace current draft?')).length).toBe(2);
  expect(screen.getByDisplayValue('My edited event')).toBeTruthy();

  fireEvent.click(await screen.findByRole('button', { name: 'Replace draft' }));

  expect(screen.queryByDisplayValue('My edited event')).toBeNull();
  expect(screen.getByDisplayValue('New location')).toBeTruthy();
});

test('prefills from selected alert rows', () => {
  render(<SpotReportBuilder {...props} />);

  window.dispatchEvent(
    new CustomEvent(SPOT_REPORT_REQUEST_EVENT, {
      detail: {
        rows: [
          {
            headline: 'Flood warning issued',
            location_name: 'Bay County, FL',
            Time: '1791895056636',
            'Source URL ': 'https://example.test/source/DEMO-001',
            Source: 'Local authority',
            alert_id: 'DEMO-001',
          },
          {
            headline: 'Road closure reported',
            location_name: 'San Clemente, CA',
            Time: '1791895056636',
            'Source URL ': 'https://example.test/source/DEMO-002',
            Source: 'Local media',
            alert_id: 'DEMO-002',
          },
        ],
      },
    }),
  );

  expect(
    screen.queryByDisplayValue(/Bay County, FL[\s\S]*Flood warning issued/),
  ).not.toBeNull();
  expect(
    screen.queryByDisplayValue('Bay County, FL; San Clemente, CA'),
  ).not.toBeNull();
  expect(
    screen.queryByDisplayValue(/Alert 1[\s\S]*Local authority[\s\S]*DEMO-001/),
  ).not.toBeNull();
  expect(screen.getByText(/Prefilled from 2 selected alerts/)).toBeTruthy();
});

test('includes agentic context in the situation summary', () => {
  render(<SpotReportBuilder {...props} />);

  window.dispatchEvent(
    new CustomEvent(SPOT_REPORT_REQUEST_EVENT, {
      detail: {
        rows: [
          {
            headline: 'Flood warning issued',
            location_name: 'Bay County, FL',
            agentic_context: JSON.stringify({
              emergency_response: 'Shelters opened',
              property_damage: 'Several homes damaged',
            }),
          },
        ],
      },
    }),
  );

  expect(
    screen.queryByDisplayValue(/Emergency response: Shelters opened/),
  ).not.toBeNull();
});

test('includes Python-style agentic context in the situation summary', () => {
  render(<SpotReportBuilder {...props} />);

  window.dispatchEvent(
    new CustomEvent(SPOT_REPORT_REQUEST_EVENT, {
      detail: {
        rows: [
          {
            headline: 'Power outage reported',
            agentic_context:
              "{'status': 'Outage ongoing', 'primary_cause': 'Cause under investigation'}",
          },
        ],
      },
    }),
  );

  expect(
    screen.queryByDisplayValue(
      /Status: Outage ongoing[\s\S]*Primary cause: Cause under investigation/,
    ),
  ).not.toBeNull();
});

test('adds county-level ACF program context for selected alerts', async () => {
  render(<SpotReportBuilder {...props} />);

  fetchMock.mockResolvedValueOnce({
    json: async () => ({
      result: {
        counties: [
          {
            alert_id: 'alert-1',
            county_name: 'Bay',
            location_count: 12,
            state_code: '12',
          },
        ],
      },
    }),
    ok: true,
  });
  window.dispatchEvent(
    new CustomEvent(SPOT_REPORT_REQUEST_EVENT, {
      detail: {
        rows: [{ alert_id: 'alert-1', location_name: 'Bay County, FL, USA' }],
      },
    }),
  );
  expect(
    await screen.findByDisplayValue(
      'Alert 1 — Bay County, Florida: There are 12 ACF program locations.',
    ),
  ).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/geoset_map/acf_program_counts/?alert_ids=alert-1',
  );
});
