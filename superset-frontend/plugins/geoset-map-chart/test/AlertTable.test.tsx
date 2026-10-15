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
  { title: 'Flood warning', status: 'Active' },
  { title: 'Road closure', status: 'Monitoring' },
];

test('selects individual rows and all rows', () => {
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={data}
      extendedColumns={[]}
      height={400}
      width={600}
    />,
  );

  const firstRow = screen.getByRole('checkbox', { name: 'Select row 1' });
  const secondRow = screen.getByRole('checkbox', { name: 'Select row 2' });
  const selectAll = screen.getByRole('checkbox', { name: 'Select all rows' });

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
      extendedColumns={[]}
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
      extendedColumns={[]}
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
    { title: 'Flood warning', status: 'Active', description: 'River rising' },
  ];
  render(
    <AlertTable
      buttonText="Create report"
      columns={['title', 'status']}
      data={rowsWithExtraData}
      extendedColumns={['description']}
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
