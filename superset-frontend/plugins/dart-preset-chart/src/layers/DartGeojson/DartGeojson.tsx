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
import { memo, useCallback, useMemo, useRef } from 'react';
import { GeoJsonLayer } from 'deck.gl/typed';
import geojsonExtent from '@mapbox/geojson-extent';
import {
  HandlerFunction,
  JsonObject,
  JsonValue,
  QueryFormData,
} from '@superset-ui/core';

import {
  DeckGLContainerHandle,
  DeckGLContainerStyledWrapper,
} from '../../DeckGLContainer';
import { getSvg } from '../../utils/svgs';
import { hexToRGB } from '../../utils/colors';
import { Row } from '../../utilities/flyout'; 
import sandboxedEval from '../../utils/sandbox';
import { commonLayerProps } from '../common';
import TooltipRow from '../../TooltipRow';
import fitViewport, { Viewport } from '../../utils/fitViewport';
import { TooltipProps } from '../../components/Tooltip';

const propertyMap = {
  fillColor: 'fillColor',
  color: 'fillColor',
  fill: 'fillColor',
  'fill-color': 'fillColor',
  strokeColor: 'strokeColor',
  'stroke-color': 'strokeColor',
  'stroke-width': 'strokeWidth',
};

const propertyKeys = [...new Set(Object.values(propertyMap))];

const alterProps = (props: JsonObject, propOverrides: JsonObject) => {
  const newProps: JsonObject = {};
  Object.keys(props).forEach(k => {
    if (k in propertyMap) {
      newProps[propertyMap[k]] = props[k];
    } else {
      newProps[k] = props[k];
    }
  });

  if (typeof props.fillColor === 'string') {
    newProps.fillColor = hexToRGB(props.fillColor);
  }
  if (typeof props.strokeColor === 'string') {
    newProps.strokeColor = hexToRGB(props.strokeColor);
  }

  return {
    ...newProps,
    ...propOverrides,
  };
};
let features: JsonObject[];
const recurseGeoJson = (
  node: JsonObject,
  propOverrides: JsonObject,
  extraProps?: JsonObject,
  flyoutProps?: JsonObject,
) => {
  if (node?.features) {
    node.features.forEach((obj: JsonObject) => {
      recurseGeoJson(obj, propOverrides, node.extraProps || extraProps, node.flyoutProps || flyoutProps);
    });
  }
  if (node?.geometry) {
    const newNode = {
      ...node,
      properties: alterProps(node.properties, propOverrides),
    } as JsonObject;
    if (!newNode.extraProps) {
      newNode.extraProps = extraProps;
    }
    if (!newNode.flyoutProps) {
      newNode.flyoutProps = flyoutProps;
    }
    features.push(newNode);
  }
};

function setTooltipContent(o: JsonObject) {
  function divify(props: Object) {
    const content = Object.keys(props)
      .filter(key => !propertyKeys.includes(key))
      .map((prop, index) => (
        <TooltipRow
          key={`prop-${index}`}
          label={`${prop}: `}
          value={`${props?.[prop]}`}
        />
      ));

    return content.length > 0 ? (
      <div className="deckgl-tooltip">{content}</div>
    ) : null;
  }

  return (
    (o.object?.extraProps && divify(o.object.extraProps)) ||
    (o.object?.properties && divify(o.object.properties)) ||
    null
  );
}

const getFillColor = (feature: JsonObject) => feature?.properties?.fillColor;
const getLineColor = (feature: JsonObject) => feature?.properties?.strokeColor;

export function getLayer(
  formData: QueryFormData,
  payload: JsonObject,
  onAddFilter: HandlerFunction,
  setTooltip: (tooltip: TooltipProps['tooltip']) => void,
  setFlyoutRows: HandlerFunction,
) {
  const fd = formData;
  const fc = fd.fill_color_picker;
  const sc = fd.stroke_color_picker;
  const fillColor = [fc.r, fc.g, fc.b, 255 * fc.a];
  const fillHexColor = `rgb(${fc.r}, ${fc.g}, ${fc.b})`;
  const strokeColor = [sc.r, sc.g, sc.b, 255 * sc.a];
  const propOverrides: JsonObject = {};
  if (fillColor[3] > 0) {
    propOverrides.fillColor = fillColor;
  }
  if (strokeColor[3] > 0) {
    propOverrides.strokeColor = strokeColor;
  }

  features = [];
  recurseGeoJson(payload.data, propOverrides);

  let jsFnMutator;
  if (fd.js_data_mutator) {
    // Applying user defined data mutator if defined
    jsFnMutator = sandboxedEval(fd.js_data_mutator);
    features = jsFnMutator(features);
  }
  let svg: string = getSvg('circle', fillHexColor);
  if (fd.hasOwnProperty('icon_type')) {
    svg = getSvg(fd.icon_type, fillHexColor);
  }

  function onSelect(o: JsonObject) {
    if (o != undefined) {
      const keys =  Object.keys(o)
      const rows = []
      for(let i=0;i<keys.length;i++) {
        const key = keys[i]; 
        const value = Object.values(o)[i]; 
        rows.push(new Row(key, value))
      }
      setFlyoutRows(rows)
    }
  }

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return new GeoJsonLayer({
    id: `geojson-layer-${fd.slice_id}` as const,
    data: features,
    extruded: fd.extruded,
    filled: fd.filled,
    stroked: fd.stroked,
    getFillColor,
    getLineColor,
    pointType: 'icon',
    getLineWidth: fd.line_width || 1,
    getIcon: (d: any) => ({
      url: svgUrl,
      width: 128,
      height: 128,
    }),
    getIconSize: 25,
    pointRadiusScale: 1,
    pointRadiusUnits: 'pixels',
    pointRadiusMinPixels: 5,
    lineWidthUnits: fd.line_width_unit,
    ...commonLayerProps(fd, setTooltip, setTooltipContent, onSelect),
  });
}

export type DeckGLGeoJsonProps = {
  formData: QueryFormData;
  payload: JsonObject;
  setControlValue: (control: string, value: JsonValue) => void;
  viewport: Viewport;
  onAddFilter: HandlerFunction;
  height: number;
  width: number;
};

const DeckGLGeoJson = (props: DeckGLGeoJsonProps) => {
  const containerRef = useRef<DeckGLContainerHandle>();
  const setTooltip = useCallback((tooltip: TooltipProps['tooltip']) => {
    const { current } = containerRef;
    if (current) {
      current.setTooltip(tooltip);
    }
  }, []);
  const setFlyoutRows = useCallback((rows: Row[]) => {
    const { current } = containerRef;
    if (current) {
      current.setFlyoutRows(rows);
      current.openFlyout(true);
    }
  }, []);

  const { formData, payload, setControlValue, onAddFilter, height, width } =
    props;

  const viewport: Viewport = useMemo(() => {
    if (formData.autozoom) {
      const points =
        payload?.data?.features?.reduce?.(
          (acc: [number, number, number, number][], feature: any) => {
            const bounds = geojsonExtent(feature);
            if (bounds) {
              return [...acc, [bounds[0], bounds[1]], [bounds[2], bounds[3]]];
            }

            return acc;
          },
          [],
        ) || [];

      if (points.length) {
        return fitViewport(props.viewport, {
          width,
          height,
          points,
        });
      }
    }
    return props.viewport;
  }, [
    formData.autozoom,
    height,
    payload?.data?.features,
    props.viewport,
    width,
  ]);

  const layer = getLayer(
    formData,
    payload,
    onAddFilter,
    setTooltip,
    setFlyoutRows,
  );

  return (
    <DeckGLContainerStyledWrapper
      ref={containerRef}
      mapboxApiAccessToken={payload.data.mapboxApiKey}
      viewport={viewport}
      layers={[layer]}
      mapStyle={formData.mapbox_style}
      setControlValue={setControlValue}
      height={height}
      width={width}
    />
  );
};

export default memo(DeckGLGeoJson);
