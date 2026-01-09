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
import { useState, useEffect, ReactNode } from 'react';
import { DraggableTag } from './DraggableTag';
import Select from './Select';
import { SelectProps, SelectValue } from './types';

export type DraggableSelectProps = Omit<SelectProps, 'ref' | 'mode'> & {
  value?: SelectValue;
  onChange?: (value: SelectValue, options: any) => void;
  mode?: 'single' | 'multiple';
};

interface CustomTagProps {
  label: ReactNode;
  value: string;
  onClose?: () => void;
}

export const DraggableSelect = (props: DraggableSelectProps) => {
  const { value, onChange, options, ...restProps } = props;

  const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);

  // Keep local state in sync if parent updates 'value'
  useEffect(() => {
    if (Array.isArray(value)) {
      setSelectedItems(value as (string | number)[]);
    } else if (value !== undefined && value !== null) {
      setSelectedItems([value as string | number]);
    } else {
      setSelectedItems([]);
    }
  }, [value]);

  // Helper to update both local state and call onChange
  const updateItems = (newItems: (string | number)[]) => {
    setSelectedItems(newItems);
    onChange?.(newItems, []);
  };

  // Reorder the selectedItems array when a tag is dragged
  const moveTag = (dragIndex: number, hoverIndex: number) => {
    const updatedItems = [...selectedItems];
    const [removed] = updatedItems.splice(dragIndex, 1);
    updatedItems.splice(hoverIndex, 0, removed);

    updateItems(updatedItems);
  };

  // Remove a tag
  const handleRemove = (valueToRemove: string | number) => {
    const filteredItems = selectedItems.filter(item => item !== valueToRemove);
    updateItems(filteredItems);
  };

  const tagRender = (tagProps: CustomTagProps) => {
    const { label, value: tagValue, onClose } = tagProps;
    const index = selectedItems.indexOf(tagValue);

    return (
      <DraggableTag
        key={String(tagValue)}
        label={label}
        value={String(tagValue)}
        index={index}
        moveTag={moveTag}
        onRemove={val => {
          if (onClose) {
            onClose();
          }
          handleRemove(val);
        }}
      />
    );
  };

  return (
    <Select
      mode="multiple"
      value={selectedItems}
      onChange={vals => updateItems(vals as (string | number)[])}
      options={options}
      tagRender={tagRender}
      {...restProps}
    />
  );
};

export default DraggableSelect;
