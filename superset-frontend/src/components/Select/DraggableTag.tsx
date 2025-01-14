import { DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { StyledTag } from './CustomTag';
import { CustomCloseIcon } from '../Tags/Tag';
import { DraggableTagProps, DraggableTagInterface } from './types';

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
      // Prevent the click from opening the Select dropdown
      onMouseDown={e => e.stopPropagation()}
      style={{ display: 'inline-block' }}
    >
      <StyledTag
        closable
        closeIcon={CustomCloseIcon}
        {...props}
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
