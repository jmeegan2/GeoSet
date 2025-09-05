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
import { Fragment, useCallback, memo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import { styled, t } from '@superset-ui/core';

import { EmptyState } from 'src/components/EmptyState';
import EditableTitle from 'src/components/EditableTitle';
import { setEditMode } from 'src/dashboard/actions/dashboardState';
import DashboardComponent from 'src/dashboard/containers/DashboardComponent';
import AnchorLink from 'src/dashboard/components/AnchorLink';
import {
  DragDroppable,
  Droppable,
} from 'src/dashboard/components/dnd/DragDroppable';
import { componentShape } from 'src/dashboard/util/propShapes';
import { TAB_TYPE } from 'src/dashboard/util/componentTypes';

export const RENDER_TAB = 'RENDER_TAB';
export const RENDER_TAB_CONTENT = 'RENDER_TAB_CONTENT';

const propTypes = {
  dashboardId: PropTypes.number.isRequired,
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  renderType: PropTypes.oneOf([RENDER_TAB, RENDER_TAB_CONTENT]).isRequired,
  onDropOnTab: PropTypes.func,
  onDropPositionChange: PropTypes.func,
  onDragTab: PropTypes.func,
  onHoverTab: PropTypes.func,
  editMode: PropTypes.bool.isRequired,
  embeddedMode: PropTypes.bool,

  // grid related
  availableColumnCount: PropTypes.number,
  columnWidth: PropTypes.number,
  onResizeStart: PropTypes.func,
  onResize: PropTypes.func,
  onResizeStop: PropTypes.func,

  // redux
  handleComponentDrop: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
  setDirectPathToChild: PropTypes.func.isRequired,
};

const defaultProps = {
  availableColumnCount: 0,
  columnWidth: 0,
  onDropOnTab() {},
  onDropPositionChange() {},
  onDragTab() {},
  onHoverTab() {},
  onResizeStart() {},
  onResize() {},
  onResizeStop() {},
};

const TabTitleContainer = styled.div`
  ${({ isHighlighted, theme: { gridUnit, colors } }) => `
    padding: ${gridUnit}px ${gridUnit * 2}px;
    margin: ${-gridUnit}px ${gridUnit * -2}px;
    transition: box-shadow 0.2s ease-in-out;
    ${
      isHighlighted && `box-shadow: 0 0 ${gridUnit}px ${colors.primary.light1};`
    }
  `}
`;

const TitleDropIndicator = styled.div`
  &.drop-indicator {
    position: absolute;
    top: 0;
    border-radius: 4px;
  }
`;

const renderDraggableContent = dropProps =>
  dropProps.dropIndicatorProps && <div {...dropProps.dropIndicatorProps} />;

const Tab = props => {
  const dispatch = useDispatch();
  const canEdit = useSelector(state => state.dashboardInfo.dash_edit_perm);
  const tabRef = useRef(null);
  
  // Check if this tab should be hidden from screen readers
  const shouldHideFromScreenReader = props.component.meta.text?.includes("Wildfire Map");

  /**
   * Remove accessibility attributes from elements
   */
  const removeAriaAttributes = useCallback((element) => {
    if (!element) return;

    // Get all attributes
    const attributes = Array.from(element.attributes || []);
    
    // Remove aria attributes except aria-hidden
    attributes.forEach(attr => {
      if (attr.name.startsWith('aria-') && attr.name !== 'aria-hidden') {
        element.removeAttribute(attr.name);
      }
    });

    // Remove role, tabindex, title attributes
    ['role', 'tabindex', 'title'].forEach(attr => {
      if (element.hasAttribute(attr)) {
        element.removeAttribute(attr);
      }
    });

    // Recursively process all child elements
    Array.from(element.children).forEach(child => {
      removeAriaAttributes(child);
    });
  }, []);

  // Effect to handle screen reader hiding
  useEffect(() => {
    if (shouldHideFromScreenReader && tabRef.current) {
      // Set aria-hidden on the entire tab
      tabRef.current.setAttribute('aria-hidden', 'true');
      
      // Remove all other accessibility attributes
      removeAriaAttributes(tabRef.current);
      
      // Set up MutationObserver to handle dynamic content
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // Handle newly added nodes
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              removeAriaAttributes(node);
            }
          });
          
          // Handle attribute changes
          if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
            const target = mutation.target;
            const attrName = mutation.attributeName;
            
            // Re-remove aria attributes if they're added back (except aria-hidden on tab root)
            if (attrName && attrName.startsWith('aria-') && 
                !(target === tabRef.current && attrName === 'aria-hidden')) {
              if (attrName !== 'aria-hidden') {
                target.removeAttribute(attrName);
              }
            }
            
            // Re-remove role, tabindex, title if they're added back
            if (['role', 'tabindex', 'title'].includes(attrName)) {
              target.removeAttribute(attrName);
            }
          }
        });
      });

      observer.observe(tabRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-expanded', 
                         'aria-selected', 'aria-controls', 'aria-live', 'aria-atomic', 
                         'aria-relevant', 'aria-busy', 'aria-disabled', 'aria-required',
                         'aria-invalid', 'aria-pressed', 'aria-checked', 'role', 'tabindex', 'title']
      });

      // Cleanup
      return () => observer.disconnect();
    }
  }, [shouldHideFromScreenReader, removeAriaAttributes]);

  // Re-run cleanup after each render
  useEffect(() => {
    if (shouldHideFromScreenReader && tabRef.current) {
      const timeoutId = setTimeout(() => {
        removeAriaAttributes(tabRef.current);
        tabRef.current.setAttribute('aria-hidden', 'true');
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  });

  const handleChangeTab = useCallback(
    ({ pathToTabIndex }) => {
      props.setDirectPathToChild(pathToTabIndex);
    },
    [props.setDirectPathToChild],
  );

  const handleChangeText = useCallback(
    nextTabText => {
      const { updateComponents, component } = props;
      if (nextTabText && nextTabText !== component.meta.text) {
        updateComponents({
          [component.id]: {
            ...component,
            meta: {
              ...component.meta,
              text: nextTabText,
            },
          },
        });
      }
    },
    [props.updateComponents, props.component],
  );

  const handleDrop = useCallback(
    dropResult => {
      props.handleComponentDrop(dropResult);
      props.onDropOnTab(dropResult);
    },
    [props.handleComponentDrop, props.onDropOnTab],
  );

  const handleHoverTab = useCallback(() => {
    props.onHoverTab?.();
  }, [props.onHoverTab]);

  const handleTopDropTargetDrop = useCallback(
    dropResult => {
      if (dropResult) {
        props.handleComponentDrop({
          ...dropResult,
          destination: {
            ...dropResult.destination,
            // force appending as the first child if top drop target
            index: 0,
          },
        });
      }
    },
    [props.handleComponentDrop],
  );

  const shouldDropToChild = useCallback(item => item.type !== TAB_TYPE, []);

  const renderTabContent = useCallback(() => {
    const {
      component: tabComponent,
      depth,
      availableColumnCount,
      columnWidth,
      onResizeStart,
      onResize,
      onResizeStop,
      editMode,
      isComponentVisible,
      dashboardId,
    } = props;

    const shouldDisplayEmptyState = tabComponent.children.length === 0;
    return (
      <div className="dashboard-component-tabs-content">
        {/* Make top of tab droppable */}
        {editMode && (
          <Droppable
            component={tabComponent}
            orientation="column"
            index={0}
            depth={depth}
            onDrop={
              tabComponent.children.length === 0
                ? handleTopDropTargetDrop
                : handleDrop
            }
            editMode
            className={classNames({
              'empty-droptarget': true,
              'empty-droptarget--full': tabComponent.children.length === 0,
            })}
            dropToChild={tabComponent.children.length === 0}
          >
            {renderDraggableContent}
          </Droppable>
        )}
        {shouldDisplayEmptyState && (
          <EmptyState
            title={
              editMode
                ? t('Drag and drop components to this tab')
                : t('There are no components added to this tab')
            }
            description={
              canEdit &&
              (editMode ? (
                <span>
                  {t('You can')}{' '}
                  <a
                    href={`/chart/add?dashboard_id=${dashboardId}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t('create a new chart')}
                  </a>{' '}
                  {t('or use existing ones from the panel on the right')}
                </span>
              ) : (
                <span>
                  {t('You can add the components in the')}{' '}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() => dispatch(setEditMode(true))}
                  >
                    {t('edit mode')}
                  </span>
                </span>
              ))
            }
            image="chart.svg"
          />
        )}
        {tabComponent.children.map((componentId, componentIndex) => (
          <Fragment key={componentId}>
            <DashboardComponent
              id={componentId}
              parentId={tabComponent.id}
              depth={depth} // see isValidChild.js for why tabs don't increment child depth
              index={componentIndex}
              onDrop={handleDrop}
              onHover={handleHoverTab}
              availableColumnCount={availableColumnCount}
              columnWidth={columnWidth}
              onResizeStart={onResizeStart}
              onResize={onResize}
              onResizeStop={onResizeStop}
              isComponentVisible={isComponentVisible}
              onChangeTab={handleChangeTab}
            />
            {/* Make bottom of tab droppable */}
            {editMode && (
              <Droppable
                component={tabComponent}
                orientation="column"
                index={componentIndex + 1}
                depth={depth}
                onDrop={handleDrop}
                editMode
                className="empty-droptarget"
              >
                {renderDraggableContent}
              </Droppable>
            )}
          </Fragment>
        ))}
      </div>
    );
  }, [
    dispatch,
    props.component,
    props.depth,
    props.availableColumnCount,
    props.columnWidth,
    props.onResizeStart,
    props.onResize,
    props.onResizeStop,
    props.editMode,
    props.isComponentVisible,
    props.dashboardId,
    props.handleComponentDrop,
    props.onDropOnTab,
    props.setDirectPathToChild,
    props.updateComponents,
    handleHoverTab,
    canEdit,
    handleChangeTab,
    handleChangeText,
    handleDrop,
    handleTopDropTargetDrop,
    shouldDropToChild,
  ]);

  const renderTabChild = useCallback(
    ({ dropIndicatorProps, dragSourceRef, draggingTabOnTab }) => {
      const {
        component,
        index,
        editMode,
        isFocused,
        isHighlighted,
        dashboardId,
        embeddedMode,
      } = props;
      return (
        <TabTitleContainer
          isHighlighted={isHighlighted}
          className="dragdroppable-tab"
          ref={dragSourceRef}
        >
          <EditableTitle
            title={component.meta.text}
            defaultTitle={component.meta.defaultText}
            placeholder={component.meta.placeholder}
            canEdit={editMode && isFocused}
            onSaveTitle={handleChangeText}
            showTooltip={false}
            editing={editMode && isFocused}
          />
          {!editMode && !embeddedMode && (
            <AnchorLink
              id={component.id}
              dashboardId={dashboardId}
              placement={index >= 5 ? 'left' : 'right'}
            />
          )}

          {dropIndicatorProps && !draggingTabOnTab && (
            <TitleDropIndicator
              className={dropIndicatorProps.className}
              data-test="title-drop-indicator"
            />
          )}
        </TabTitleContainer>
      );
    },
    [
      props.component,
      props.index,
      props.editMode,
      props.isFocused,
      props.isHighlighted,
      props.dashboardId,
      handleChangeText,
    ],
  );

  const renderTab = useCallback(() => {
    const {
      component,
      parentComponent,
      index,
      depth,
      editMode,
      onDropPositionChange,
      onDragTab,
    } = props;

    return (
      <DragDroppable
        component={component}
        parentComponent={parentComponent}
        orientation="column"
        index={index}
        depth={depth}
        onDrop={handleDrop}
        onHover={handleHoverTab}
        onDropIndicatorChange={onDropPositionChange}
        onDragTab={onDragTab}
        editMode={editMode}
        dropToChild={shouldDropToChild}
      >
        {renderTabChild}
      </DragDroppable>
    );
  }, [
    props.component,
    props.parentComponent,
    props.index,
    props.depth,
    props.editMode,
    handleDrop,
    handleHoverTab,
    shouldDropToChild,
    renderTabChild,
  ]);

  const tabContent = props.renderType === RENDER_TAB ? renderTab() : renderTabContent();

  // Wrap with screen reader blocking if needed
  if (shouldHideFromScreenReader) {
    return (
      <div 
        ref={tabRef}
        aria-hidden="true"
        style={{ 
          speak: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none'
        }}
      >
        {tabContent}
      </div>
    );
  }

  return tabContent;
};

Tab.propTypes = propTypes;
Tab.defaultProps = defaultProps;

export default memo(Tab);