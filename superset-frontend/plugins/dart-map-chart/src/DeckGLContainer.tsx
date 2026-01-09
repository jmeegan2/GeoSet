/* eslint-disable react/jsx-sort-default-props */
/* eslint-disable react/sort-prop-types */
/* eslint-disable react/jsx-handler-names */
/* eslint-disable react/forbid-prop-types */
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
import {
  forwardRef,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StaticMap, MapRef } from 'react-map-gl';
import DeckGL from '@deck.gl/react';

import { JsonObject, JsonValue, styled } from '@superset-ui/core';
import mapboxgl from 'mapbox-gl';
import Tooltip, { TooltipProps } from './components/Tooltip';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Viewport } from './utils/fitViewport';
import { LayerState } from './types';

const TICK = 250; // milliseconds

export type DeckGLContainerProps = {
  viewport: Viewport;
  setControlValue?: (control: string, value: JsonValue) => void;
  mapStyle?: string;
  mapboxApiAccessToken: string;
  children?: ReactNode;
  width: number;
  height: number;
  layerStates: LayerState[];
};

export const StaticMapStyledWrapper = styled(StaticMap)`
  .mapboxgl-ctrl-logo {
    display: none !important;
  }
`;

export const DeckGLContainer = memo(
  forwardRef((props: DeckGLContainerProps, ref) => {
    console.log('[DeckGLContainer] === RENDER START ===');
    console.log('[DeckGLContainer] Props received:', {
      viewport: props.viewport,
      layerStatesCount: props.layerStates?.length,
      layerStatesDetail: props.layerStates?.map((ls, i) => ({
        index: i,
        hasLayer: !!ls?.layer,
        layerId: ls?.layer?.id,
        layerType: ls?.layer?.constructor?.name,
        hasOptions: !!ls?.options,
        options: ls?.options,
      })),
      width: props.width,
      height: props.height,
      mapStyle: props.mapStyle,
      hasMapboxToken: !!props.mapboxApiAccessToken,
    });

    const mapRef = useRef<MapRef>(null);
    const [tooltip, setTooltip] = useState<TooltipProps['tooltip']>(null);
    const [lastUpdate, setLastUpdate] = useState<number | null>(null);

    console.log('[DeckGLContainer] Initializing viewState from props.viewport');
    const [viewState, setViewState] = useState(() => props.viewport);

    console.log('[DeckGLContainer] Initializing layerStates...');
    const [layerStates, setLayerStates] = useState(() => {
      console.log('[DeckGLContainer] layerStates initializer called');
      if (!props.layerStates) {
        console.error('[DeckGLContainer] props.layerStates is undefined/null!');
        return [];
      }
      return props.layerStates.map((ls, index) => {
        console.log(`[DeckGLContainer] Processing layerState[${index}]:`, {
          hasLayerState: !!ls,
          hasLayer: !!ls?.layer,
          hasOptions: !!ls?.options,
        });

        if (!ls || !ls.layer) {
          console.error(`[DeckGLContainer] Invalid layerState at index ${index}:`, ls);
          return null;
        }

        const { layer, options } = ls;
        console.log(`[DeckGLContainer] Layer[${index}] details:`, {
          id: layer.id,
          type: layer.constructor?.name,
          hasClone: typeof layer.clone === 'function',
        });

        const currZoom = mapRef.current?.getMap()?.getZoom() ?? 0;

        // Check zoom-based visibility
        const zoomVisible =
          (!options?.minZoom || currZoom >= options.minZoom) &&
          (!options?.maxZoom || currZoom <= options.maxZoom);

        // Respect user-toggled visibility from options (undefined = visible)
        const userVisible = options?.userVisible !== false;
        const isVisible = zoomVisible && userVisible;

        console.log(`[DeckGLContainer] Layer[${index}] visibility:`, {
          currZoom,
          minZoom: options?.minZoom,
          maxZoom: options?.maxZoom,
          zoomVisible,
          userVisible,
          isVisible,
        });

        try {
          const clonedLayer = layer.clone({ visible: isVisible });
          console.log(`[DeckGLContainer] Layer[${index}] cloned successfully`);
          return {
            id: layer.id,
            layer: clonedLayer,
            options,
          };
        } catch (err) {
          console.error(`[DeckGLContainer] Failed to clone layer[${index}]:`, err);
          return {
            id: layer.id,
            layer,
            options,
          };
        }
      }).filter(Boolean);
    });

    useImperativeHandle(ref, () => ({ setTooltip }), []);

    const tick = useCallback(() => {
      // Rate limiting updating viewport controls as it triggers lots of renders
      if (lastUpdate && Date.now() - lastUpdate > TICK) {
        const setCV = props.setControlValue;
        if (setCV) {
          setCV('viewport', viewState);
        }
        setLastUpdate(null);
      }
    }, [lastUpdate, props.setControlValue, viewState]);

    useEffect(() => {
      const timer = setInterval(tick, TICK);
      return () => clearInterval(timer);
    }, [tick]);

    // Sync viewport from props when it changes
    useEffect(() => {
      setViewState(props.viewport);
    }, [props.viewport]);

    // Force DeckGL resize when container dimensions change
    useEffect(() => {
      requestAnimationFrame(() => {
        setViewState(prev => ({ ...prev }));
      });
    }, [props.width, props.height]);

    const onViewStateChange = useCallback(
      ({ viewState }: { viewState: JsonObject }) => {
        setViewState(viewState as Viewport);
        setLastUpdate(Date.now());
      },
      [],
    );

    const getLayerObjects = useCallback(
      () => {
        console.log('[DeckGLContainer] getLayerObjects called, layerStates count:', layerStates?.length);
        if (!layerStates || layerStates.length === 0) {
          console.warn('[DeckGLContainer] getLayerObjects: No layerStates available');
          return [];
        }
        const layers = layerStates.map((layerState, i) => {
          if (!layerState?.layer) {
            console.error(`[DeckGLContainer] getLayerObjects: Invalid layerState at index ${i}`);
            return null;
          }
          return layerState.layer;
        }).filter(Boolean);
        console.log('[DeckGLContainer] getLayerObjects returning:', layers.map(l => ({
          id: l?.id,
          type: l?.constructor?.name,
          visible: l?.props?.visible
        })));
        return layers;
    }, [layerStates]);

    useEffect(() => {
      console.log('[DeckGLContainer] useEffect[props.layerStates] triggered');
      console.log('[DeckGLContainer] props.layerStates:', props.layerStates?.length, 'items');

      if (!props.layerStates) {
        console.error('[DeckGLContainer] useEffect: props.layerStates is undefined!');
        return;
      }

      try {
        const newLayerStates = props.layerStates.map((ls, index) => {
          console.log(`[DeckGLContainer] useEffect processing layer[${index}]`);

          if (!ls || !ls.layer) {
            console.error(`[DeckGLContainer] useEffect: Invalid layerState at index ${index}`);
            return null;
          }

          const { layer, options } = ls;
          const currZoom = mapRef.current?.getMap()?.getZoom() ?? 0;

          // Check zoom-based visibility
          const zoomVisible =
            (!options?.minZoom || currZoom >= options.minZoom) &&
            (!options?.maxZoom || currZoom <= options.maxZoom);

          // Respect user-toggled visibility from options (undefined = visible)
          const userVisible = options?.userVisible !== false;
          const isVisible = zoomVisible && userVisible;

          console.log(`[DeckGLContainer] useEffect layer[${index}]:`, {
            id: layer.id,
            isVisible,
            currZoom,
          });

          try {
            return {
              id: layer.id,
              layer: layer.clone({ visible: isVisible }),
              options,
            };
          } catch (cloneErr) {
            console.error(`[DeckGLContainer] useEffect: Failed to clone layer[${index}]:`, cloneErr);
            return { id: layer.id, layer, options };
          }
        }).filter(Boolean);

        console.log('[DeckGLContainer] useEffect: Setting new layerStates, count:', newLayerStates.length);
        setLayerStates(newLayerStates);
      } catch (err) {
        console.error('[DeckGLContainer] useEffect[props.layerStates] error:', err);
      }
    }, [props.layerStates]);

    const handleMapLoad = useCallback(event => {
      console.log('[DeckGLContainer] handleMapLoad called');
      const map = event.target;
      console.log('[DeckGLContainer] Map object:', map ? 'exists' : 'null');

      try {
        const scaleControl = new mapboxgl.ScaleControl({
          maxWidth: 120,
          unit: 'imperial',
        });
        map.addControl(scaleControl, 'top-right');
        console.log('[DeckGLContainer] Scale control added');
      } catch (err) {
        console.error('[DeckGLContainer] Failed to add scale control:', err);
      }

      const updateLayerVisibility = () => {
        const currZoom = map.getZoom();
        setLayerStates(prevLayerStates =>
          prevLayerStates.map(ls => {
            const { layer, options } = ls;

            // Check zoom-based visibility
            const zoomVisible =
              (!options.minZoom || currZoom >= options.minZoom) &&
              (!options.maxZoom || currZoom <= options.maxZoom);

            // Respect user-toggled visibility from options (undefined = visible)
            const userVisible = options.userVisible !== false;
            const isVisible = zoomVisible && userVisible;

            return {
              id: layer.id,
              layer: layer.clone({ visible: isVisible }),
              options,
            };
          }),
        );
      };

      // Calculate initial visibility based on current zoom
      updateLayerVisibility();

      // Update visibility on zoom level change
      map.on('zoom', updateLayerVisibility);
    }, []);

    const { children = null, height, width } = props;

    // Clear tooltip when mouse leaves the map container
    const handleMouseLeave = useCallback(() => {
      setTooltip(null);
    }, []);

    console.log('[DeckGLContainer] === RENDER JSX ===');
    console.log('[DeckGLContainer] Render state:', {
      viewState,
      layerStatesCount: layerStates?.length,
      width,
      height,
      hasChildren: !!children,
      tooltip: tooltip ? 'present' : 'null',
    });

    const layersForDeck = getLayerObjects();
    console.log('[DeckGLContainer] Layers to pass to DeckGL:', layersForDeck?.length);

    return (
      <div
        style={{ position: 'relative', width, height, overflow: 'hidden' }}
        onMouseLeave={handleMouseLeave}
      >
        <DeckGL
          controller
          width={width}
          height={height}
          layers={layersForDeck}
          viewState={viewState}
          onViewStateChange={onViewStateChange}
          onError={(error: Error) => {
            console.error('[DeckGL] Error:', error);
            console.error('[DeckGL] Error stack:', error?.stack);
          }}
          debug
        >
          <StaticMapStyledWrapper
            ref={mapRef}
            preserveDrawingBuffer
            mapStyle={props.mapStyle ?? 'light'}
            mapboxApiAccessToken={props.mapboxApiAccessToken}
            onLoad={handleMapLoad}
          />
        </DeckGL>
        {children}
        <Tooltip
          tooltip={tooltip}
          containerWidth={width}
          containerHeight={height}
        />
      </div>
    );
  }),
);

export const DeckGLContainerStyledWrapper = styled(DeckGLContainer)`
  .deckgl-tooltip > div {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

export type DeckGLContainerHandle = typeof DeckGLContainer & {
  setTooltip: (tooltip: ReactNode) => void;
};
