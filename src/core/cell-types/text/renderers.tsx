import React from 'react';
import type { CellRenderContext, HtmlCellRenderer } from '../types';

export const textCellRenderer: HtmlCellRenderer<string> = {
  renderHtml: undefined,
  renderReact: (context: CellRenderContext<string>) => {
    const { displayValue } = context;
    return (
      <div style={{
        width: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        color: '#000000'
      }}>
        {displayValue}
      </div>
    );
  }
};
