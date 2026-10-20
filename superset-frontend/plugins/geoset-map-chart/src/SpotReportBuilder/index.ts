/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
import { ChartMetadata, ChartPlugin, t } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

const metadata = new ChartMetadata({
  category: t('Table'),
  description: t('Create and copy a draft SPOT report from a dashboard.'),
  name: t('SPOT Report Builder'),
  thumbnail: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
      <rect width="512" height="512" fill="#fff"/>
      <rect x="24" y="32" width="260" height="28" rx="6" fill="#172554"/>
      <rect x="304" y="32" width="72" height="28" rx="14" fill="#e6f4ff"/>
      <g fill="#d9e2ec"><rect x="24" y="92" width="210" height="56" rx="4"/><rect x="258" y="92" width="230" height="56" rx="4"/><rect x="24" y="178" width="464" height="78" rx="4"/><rect x="24" y="286" width="464" height="78" rx="4"/></g>
      <rect x="386" y="414" width="102" height="34" rx="5" fill="#1677ff"/>
    </svg>
  `)}`,
  tags: [t('geoset'), t('SPOT'), t('Form'), t('Report')],
});

export default class GeoSetSpotReportBuilderChartPlugin extends ChartPlugin {
  constructor() {
    super({
      loadChart: () => import('./SpotReportBuilder'),
      controlPanel,
      metadata,
      buildQuery,
      transformProps,
    });
  }
}
