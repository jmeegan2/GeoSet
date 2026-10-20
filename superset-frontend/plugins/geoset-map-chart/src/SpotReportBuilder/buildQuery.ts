/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.
 */
import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  return buildQueryContext(formData, baseQueryObject => [
    {
      ...baseQueryObject,
      columns: [
        {
          label: 'SPOT Report Builder',
          sqlExpression: '1',
          expressionType: 'SQL',
        },
      ],
      groupby: [],
      metrics: [],
      row_limit: 1,
    },
  ]);
}
