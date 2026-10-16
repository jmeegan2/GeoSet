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
import { ChartMetadata, ChartPlugin, t } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

const thumbnail = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#fff"/>
    <rect x="24" y="40" width="464" height="56" rx="4" fill="#e9eff4"/>
    <rect x="44" y="60" width="16" height="16" rx="2" fill="#fff" stroke="#607d8b" stroke-width="2"/>
    <g fill="#607d8b">
      <rect x="82" y="60" width="112" height="12" rx="3"/>
      <rect x="218" y="60" width="100" height="12" rx="3"/>
      <rect x="340" y="60" width="112" height="12" rx="3"/>
    </g>
    <g fill="#fff" stroke="#d8e0e6" stroke-width="2">
      <rect x="24" y="96" width="464" height="72"/>
      <rect x="24" y="168" width="464" height="72"/>
      <rect x="24" y="240" width="464" height="72"/>
      <rect x="24" y="312" width="464" height="72"/>
      <rect x="24" y="384" width="464" height="72"/>
    </g>
    <g fill="#fff" stroke="#607d8b" stroke-width="2">
      <rect x="44" y="124" width="16" height="16" rx="2"/>
      <rect x="44" y="196" width="16" height="16" rx="2"/>
      <rect x="44" y="268" width="16" height="16" rx="2"/>
      <rect x="44" y="340" width="16" height="16" rx="2"/>
      <rect x="44" y="412" width="16" height="16" rx="2"/>
    </g>
    <g fill="#455a64">
      <rect x="82" y="122" width="98" height="12" rx="3"/>
      <rect x="218" y="122" width="88" height="12" rx="3"/>
      <rect x="340" y="122" width="120" height="12" rx="3"/>
      <rect x="82" y="194" width="120" height="12" rx="3"/>
      <rect x="218" y="194" width="72" height="12" rx="3"/>
      <rect x="340" y="194" width="98" height="12" rx="3"/>
      <rect x="82" y="266" width="86" height="12" rx="3"/>
      <rect x="218" y="266" width="112" height="12" rx="3"/>
      <rect x="340" y="266" width="78" height="12" rx="3"/>
      <rect x="82" y="338" width="108" height="12" rx="3"/>
      <rect x="218" y="338" width="92" height="12" rx="3"/>
      <rect x="340" y="338" width="116" height="12" rx="3"/>
      <rect x="82" y="410" width="76" height="12" rx="3"/>
      <rect x="218" y="410" width="120" height="12" rx="3"/>
      <rect x="340" y="410" width="86" height="12" rx="3"/>
    </g>
  </svg>
`)}`;

const metadata = new ChartMetadata({
  category: t('Table'),
  description: t(
    'Display alert records in a table with row selection for SPOT reporting.',
  ),
  name: t('Alert Feed Table'),
  thumbnail,
  tags: [t('geoset'), t('Alert'), t('Table'), t('Report')],
});

export default class GeoSetAlertTableChartPlugin extends ChartPlugin {
  constructor() {
    super({
      loadChart: () => import('./AlertTable'),
      controlPanel,
      metadata,
      buildQuery,
      transformProps,
    });
  }
}
