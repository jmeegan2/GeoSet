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
import { ReactNode } from 'react';
import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { Tag } from 'antd';
import { styled } from '@superset-ui/core';
import { Icons } from '@superset-ui/core/components/Icons';

export interface DraggableTagProps {
  label: ReactNode;
  value: string;
  index: number;
  moveTag: (dragIndex: number, hoverIndex: number) => void;
  onRemove: (value: string) => void;
}

interface DraggableTagInterface {
  type: string;
  dragIndex: number;
}

const StyledTag = styled(Tag)`
  & .ant-tag-close-icon {
    display: inline-flex;
    align-items: center;
    margin-left: ${({ theme }) => theme.gridUnit}px;
  }

  & .tag-content {
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: grab;
  }
`;

const CustomCloseIcon = <Icons.CloseOutlined iconSize="xs" />;

export const DraggableTag = (props: DraggableTagProps) => {
  const { label, value, index, moveTag, onRemove } = props;

  const [, dragRef] = useDrag({
    item: { type: 'TAG', dragIndex: index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, dropRef] = useDrop({
    accept: 'TAG',
    hover: (item: DraggableTagInterface, monitor: DropTargetMonitor) => {
      if (item.dragIndex !== index) {
        moveTag(item.dragIndex, index);
        // eslint-disable-next-line no-param-reassign
        item.dragIndex = index;
      }
    },
  });

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <span
      ref={dropRef}
      onMouseDown={e => e.stopPropagation()}
      style={{ display: 'inline-block' }}
    >
      <StyledTag
        closable
        closeIcon={CustomCloseIcon}
        className="ant-select-selection-item"
        onClose={e => {
          e.preventDefault();
          onRemove(value);
        }}
      >
        <span className="tag-content" ref={dragRef}>
          {label}
        </span>
      </StyledTag>
    </span>
  );
};
