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
  expect(screen.queryByDisplayValue(props.defaultEventName)).toBeNull();
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
    screen.queryByDisplayValue(/Alert 1[\s\S]*Summary: Flood warning issued/),
  ).not.toBeNull();
  expect(
    screen.queryByDisplayValue('Bay County, FL; San Clemente, CA'),
  ).not.toBeNull();
  expect(
    screen.queryByDisplayValue(
      /Alert 1 • Local authority • https:\/\/example\.test\/source\/DEMO-001 • .*/,
    ),
  ).not.toBeNull();
  expect(screen.getByText(/Prefilled from 2 selected alerts/)).toBeTruthy();
});
