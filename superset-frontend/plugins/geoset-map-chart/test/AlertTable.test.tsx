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
      headerColor={{ r: 30, g: 100, b: 180, a: 1 }}
      height={400}
      width={600}
    />,
  );

  expect(
    screen.getByRole('button', { name: 'Export selected' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'title' })).toHaveStyle({
    background: 'rgba(30, 100, 180, 1)',
  });
});
