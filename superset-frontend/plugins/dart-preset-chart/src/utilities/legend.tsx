import { useState } from 'react';
import { t } from '@superset-ui/core';
import { getSvg } from '../utils/svgs';

export class Legend {
  name: string;

  icon_type: string;

  fill_color: string;
}

export const DeckLegend = (legends: Record<number, Legend>) => {
  const [showPopup, setShowPopup] = useState(false);

  const SIZE = 18;
  const buttonName = t('Show Layers');
  const names = Object.values(legends);

  const closeDiv = (
    <div
      key="close-legend"
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <button
        type="button"
        style={{
          borderStyle: 'none',
          background: 'none',
        }}
        onClick={() => setShowPopup(false)}
      >
        X
      </button>
    </div>
  );

  const nameComps = names.map(o => {
    // replace option with your component name
    const svg: string = getSvg(o.icon_type, o.fill_color, SIZE, SIZE);
    return (
      <div id={o.name} key={o.name} style={{ display: 'flex' }}>
        <div
          key="icon-legend"
          style={{
            paddingLeft: '5px',
            paddingRight: '5px',
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div key="text-legend" style={{ paddingRight: '5px' }}>{o.name}</div>
      </div>
    );
  });

  return (
    <div key="main-legend">
      <button
        type="button"
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
        }}
        onClick={() => setShowPopup(true)}
      >
        {buttonName}
      </button>
      <div
        id="legends"
        key="legends"
        style={{
          position: 'absolute',
          bottom: '5px',
          left: '5px',
          background: `rgb(255, 255, 255)`,
          minHeight: '70px',
          minWidth: '125px',
          display: showPopup ? 'block' : 'none',
        }}
      >
        {closeDiv}
        {nameComps}
      </div>
    </div>
  );
};
