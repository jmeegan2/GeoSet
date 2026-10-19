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
import { fireEvent, render, screen } from '@testing-library/react';
import AlertTable from '../src/AlertTable/AlertTable';

const data = [
  { id: 1, title: 'Flood warning', status: 'Active' },
  { id: 2, title: 'Road closure', status: 'Monitoring' },
];

test('selects individual rows and all rows', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={data}
      severityColumns={[]}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  const firstRow = screen.getByRole('checkbox', { name: 'Select row 1' });
  const secondRow = screen.getByRole('checkbox', { name: 'Select row 2' });
  const selectAll = screen.getByRole('checkbox', {
    name: 'Select all visible rows',
  });

  fireEvent.click(firstRow);
  expect(firstRow).toBeChecked();
  expect(selectAll).toBePartiallyChecked();

  fireEvent.click(selectAll);
  expect(firstRow).toBeChecked();
  expect(secondRow).toBeChecked();
  expect(selectAll).toBeChecked();

  fireEvent.click(selectAll);
  expect(firstRow).not.toBeChecked();
  expect(secondRow).not.toBeChecked();
});

test('keeps the action button disabled until an action is implemented', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={data}
      severityColumns={[]}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  const actionButton = screen.getByRole('button', { name: 'Create report' });
  expect(actionButton).toBeDisabled();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
  expect(actionButton).toBeEnabled();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
  expect(actionButton).toBeDisabled();
});

test('applies a custom column header color and button text', () => {
  render(
    <AlertTable
      buttonText="Export selected"
      columns={['title', 'status']}
      data={data}
      severityColumns={[]}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      headerColor={{ r: 30, g: 100, b: 180, a: 1 }}
      headerTextColor={{ r: 255, g: 255, b: 255, a: 1 }}
      buttonColor={{ r: 30, g: 100, b: 180, a: 1 }}
      height={400}
      width={600}
    />,
  );

  const button = screen.getByRole('button', { name: 'Export selected' });
  expect(button).toBeInTheDocument();
  expect(button).toHaveStyle({
    backgroundColor: 'rgba(30, 100, 180, 1)',
    color: '#fff',
    fontSize: '14px',
    padding: '10px 18px',
  });
  const header = screen.getByRole('columnheader', { name: 'title' });
  expect(header).toHaveStyle({
    background: 'rgba(30, 100, 180, 1)',
    color: 'rgba(255, 255, 255, 1)',
    borderBottom: '2px solid #d9d9d9',
  });
  expect(header).toHaveStyle({ borderRight: '2px solid #d9d9d9' });
  expect(screen.getByRole('cell', { name: 'Flood warning' })).toHaveStyle({
    borderRight: '2px solid #d9d9d9',
  });
});

test('expands a row to show its configured extended data', () => {
  const rowsWithExtraData = [
    { id: 1, title: 'Flood warning', status: 'Active', description: 'River rising' },
  ];
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={rowsWithExtraData}
      severityColumns={[]}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={['description']}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.queryByText('River rising')).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('button', { name: 'Show extended data for row 1' }),
  );
  expect(screen.getByText('description')).toBeInTheDocument();
  expect(screen.getByText('River rising')).toBeInTheDocument();

  fireEvent.click(
    screen.getByRole('button', { name: 'Hide extended data for row 1' }),
  );
  expect(screen.queryByText('River rising')).not.toBeInTheDocument();
});

test('keeps selection on the same alert after sorting and selects only visible rows', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={data}
      severityColumns={[]}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
  const titleSortButton = screen.getByRole('button', { name: 'title' });
  fireEvent.click(titleSortButton);
  fireEvent.click(titleSortButton);

  const secondVisibleRow = screen.getByRole('checkbox', { name: 'Select row 2' });
  expect(secondVisibleRow).toBeChecked();
  expect(screen.getByRole('cell', { name: 'Flood warning' })).toHaveStyle({
    background: '#e6f4ff',
  });

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search alerts' }), {
    target: { value: 'Road closure' },
  });
  expect(screen.getByText('1 of 2 alerts')).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Select all visible rows' }),
  );
  expect(screen.getByText('2 selected')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeChecked();
});

test('formats numeric severity values in each selected column', () => {
  const severityData = [
    { id: 1, severity: 1, alternateSeverity: 3 },
    { id: 2, severity: 4, alternateSeverity: 6 },
    { id: 3, severity: 7, alternateSeverity: 8 },
    { id: 4, severity: 9, alternateSeverity: 10 },
    { id: 5, severity: 11, alternateSeverity: null },
  ];
  render(
    <AlertTable
      buttonText="Create report"
      columns={['severity', 'alternateSeverity']}
      data={severityData}
      severityColumns={['severity', 'alternateSeverity']}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getAllByText('Low')).toHaveLength(2);
  expect(screen.getAllByText('Medium')).toHaveLength(2);
  expect(screen.getAllByText('High')).toHaveLength(2);
  expect(screen.getAllByText('Severe')).toHaveLength(2);
  expect(screen.getByRole('cell', { name: '11' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: '' })).toBeInTheDocument();
  expect(screen.getByText('Low')).toHaveStyle({
    backgroundColor: 'rgb(230, 244, 255)',
    color: 'rgb(9, 88, 217)',
    border: '1px solid #91caff',
  });
  expect(screen.getByText('High')).toHaveStyle({
    backgroundColor: 'rgb(255, 247, 230)',
    color: 'rgb(212, 107, 8)',
    border: '1px solid #ffd591',
  });
});

test('formats text severity labels as badges', () => {
  const severityData = [
    { id: 1, severity: ' Low ' },
    { id: 2, severity: 'medium' },
    { id: 3, severity: 'HIGH' },
    { id: 4, severity: 'Critical' },
    { id: 5, severity: 'Unknown' },
  ];
  render(
    <AlertTable
      buttonText="Create report"
      columns={['severity']}
      data={severityData}
      severityColumns={['severity']}
      badgeConfiguration={false}
      badgeRules=""
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getByText('Low')).toBeInTheDocument();
  expect(screen.getByText('Medium')).toBeInTheDocument();
  expect(screen.getByText('High')).toBeInTheDocument();
  expect(screen.getByText('Severe')).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Unknown' })).toBeInTheDocument();
});

test('applies configured badge labels and colors to matching column values', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['severity_text']}
      data={[
        { id: 1, severity_text: 'Low' },
        { id: 2, severity_text: 'Severe' },
        { id: 3, severity_text: 'Unknown' },
      ]}
      severityColumns={[]}
      badgeConfiguration
      badgeColumn="severity_text"
      badgeValueColumn="severity_text"
      badgeDataType="text"
      badgeRules="Low | Minor | #1677ff\nSevere | Critical | #ff0000"
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getByText('Minor')).toHaveStyle({
    backgroundColor: 'rgb(22, 119, 255)',
    color: 'rgb(255, 255, 255)',
  });
  expect(screen.getByText('Critical')).toHaveStyle({
    backgroundColor: 'rgb(255, 0, 0)',
    color: 'rgb(255, 255, 255)',
  });
  expect(screen.getByRole('cell', { name: 'Unknown' })).toBeInTheDocument();
});

test('matches badge rules when a column has a display label alias', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['Severity']}
      columnAliases={{ Severity: ['severity_text'] }}
      data={[{ id: 1, Severity: 'Medium', severity_text: 'Medium' }]}
      severityColumns={['severity_text']}
      badgeConfiguration
      badgeColumn="Severity"
      badgeValueColumn="severity_text"
      badgeDataType="text"
      badgeRules="Medium | Medium | #faad14"
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getByText('Medium')).toHaveStyle({
    backgroundColor: 'rgb(250, 173, 20)',
  });
});

test('shows an error for invalid configured badge rules', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['severity_text']}
      data={[{ id: 1, severity_text: 'Low' }]}
      severityColumns={[]}
      badgeConfiguration
      badgeColumn="severity_text"
      badgeValueColumn="severity_text"
      badgeDataType="text"
      badgeRules="Low | Minor | blue"
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getAllByRole('alert')[0]).toHaveTextContent(
    'Badge rules on lines 1 are invalid',
  );
});

test('matches numeric configured badge values', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['Severity']}
      data={[{ id: 1, Severity: '7', severity_value: 7 }]}
      severityColumns={[]}
      badgeConfiguration
      badgeColumn="Severity"
      badgeValueColumn="severity_value"
      badgeDataType="number"
      badgeRules="7 | High | #fa8c16"
      extendedColumns={[]}
      rowIdColumn="id"
      height={400}
      width={600}
    />,
  );

  expect(screen.getByText('High')).toHaveStyle({
    backgroundColor: 'rgb(250, 140, 22)',
  });
});
