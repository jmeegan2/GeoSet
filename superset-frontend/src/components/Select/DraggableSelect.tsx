import { useState, useEffect } from 'react';
import { CustomTagProps, DraggableSelectProps } from './types';
import Select from './Select';
import { DraggableTag } from './DraggableTag';

export const DraggableSelect = (props: DraggableSelectProps) => {
  const { value, onChange, options, ...restProps } = props;

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Keep local state in sync if parent updates 'value'
  useEffect(() => {
    if (Array.isArray(value)) {
      setSelectedItems(value as string[]);
    }
  }, [value]);

  // Helper to update both local state and call onChange
  const updateItems = (newItems: string[]) => {
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
  const handleRemove = (valueToRemove: string) => {
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
          // antd calls onClose => remove item from its internal logic
          if (onClose) {
            // @ts-ignore
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
      onChange={vals => updateItems(vals as string[])}
      options={options}
      tagRender={tagRender}
      {...restProps}
    />
  );
};
