/*
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

import CategoricalScheme from '../../CategoricalScheme';

// TODO: add the colors to the theme while working on SIP https://github.com/apache/superset/issues/20159
const schemes = [
  {
    id: 'acfPrimary',
    label: 'ACF Primary',
    colors: [
      '#bcd9ed',
      '#e2eff7',
      '#336a90',
      '#779cb5',
      '#264a64',
      '#172c3c',
      '#bfb0a3',
      '#8f847a',
      '#eae5df',
      '#475260',
      '#323a45',
      '#80858c',
      '#dde2e8',
      '#21272d',
    ],
  },
  {
    id: 'acfAccent',
    label: 'ACF Accent',
    colors: [
      '#63bab0',
      '#a12854',
      '#e29f4d',
      '#a6d8d2',
      '#407972',
      '#2d544f',
      '#711c3b',
      '#481226',
      '#f9e585',
      '#fcf1bf',
      '#ecbf88',
    ],
  },
  {
    id: 'acfSwatch',
    label: 'ACF Swatch',
    colors: [
      '#711C3B',
      '#A8786E',
      '#F57C01',
      '#711C3B',
      '#A8786E',
      '#5DADA4',
      '#A8C14C',
      '#00DBFF',
      '#0063A6',
      '#744E92',
    ],
  },
].map(s => new CategoricalScheme(s));

export default schemes;
