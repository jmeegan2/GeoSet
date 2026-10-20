/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
import { DataRecord } from '@superset-ui/core';

export const SPOT_REPORT_REQUEST_EVENT = 'geoset:spot-report-request';

type SpotReportSelectionDetail = {
  rows: DataRecord[];
};

export function publishSpotReportRequest(rows: DataRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent<SpotReportSelectionDetail>(SPOT_REPORT_REQUEST_EVENT, {
      detail: { rows },
    }),
  );
}

export function subscribeToSpotReportRequest(
  callback: (rows: DataRecord[]) => void,
) {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handleSelection = (event: Event) => {
    const { detail } = event as CustomEvent<SpotReportSelectionDetail>;
    callback(Array.isArray(detail?.rows) ? detail.rows : []);
  };
  window.addEventListener(SPOT_REPORT_REQUEST_EVENT, handleSelection);
  return () =>
    window.removeEventListener(SPOT_REPORT_REQUEST_EVENT, handleSelection);
}
