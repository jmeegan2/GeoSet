/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
import { ChartProps } from '@superset-ui/core';

export default function transformProps({
  height,
  rawFormData,
  width,
}: ChartProps) {
  return {
    defaultEventName: String(rawFormData.default_event_name || ''),
    defaultStatus: String(rawFormData.default_status || 'Ongoing'),
    defaultLocation: String(rawFormData.default_location || ''),
    defaultSituation: String(rawFormData.default_situation || ''),
    defaultProgramImpacts: String(rawFormData.default_program_impacts || ''),
    defaultSources: String(rawFormData.default_sources || ''),
    height,
    width,
  };
}
