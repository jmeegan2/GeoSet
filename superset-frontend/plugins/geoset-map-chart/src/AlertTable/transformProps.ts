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
import { ChartProps, DataRecord } from '@superset-ui/core';

export default function transformProps(chartProps: ChartProps) {
  const { height, queriesData, rawFormData, width } = chartProps;
  const queryData = queriesData[0];
  const data: DataRecord[] = queryData?.data || [];
  const columns = queryData?.colnames || Object.keys(data[0] || {});
  const buttonText =
    typeof rawFormData.button_text === 'string' ? rawFormData.button_text : '';
  const color = rawFormData.header_color;
  const headerColor =
    color &&
    typeof color === 'object' &&
    'r' in color &&
    'g' in color &&
    'b' in color
      ? {
          r: Number(color.r),
          g: Number(color.g),
          b: Number(color.b),
          a: 'a' in color ? Number(color.a) : 1,
        }
      : undefined;
  const buttonColorValue = rawFormData.button_color;
  const buttonColor =
    buttonColorValue &&
    typeof buttonColorValue === 'object' &&
    'r' in buttonColorValue &&
    'g' in buttonColorValue &&
    'b' in buttonColorValue
      ? {
          r: Number(buttonColorValue.r),
          g: Number(buttonColorValue.g),
          b: Number(buttonColorValue.b),
          a: 'a' in buttonColorValue ? Number(buttonColorValue.a) : 1,
        }
      : undefined;

  return { buttonColor, buttonText, columns, data, headerColor, height, width };
}
