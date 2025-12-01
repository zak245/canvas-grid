import React from 'react';
import type { CellRenderContext, HtmlCellRenderer, NumberTypeOptions } from '../types';

export const numberCellRenderer: HtmlCellRenderer<number> = {
  renderHtml: (context: CellRenderContext<number>) => {
    const { displayValue, options } = context;
    const opts = options as NumberTypeOptions;
    
    const el = document.createElement('div');
    el.textContent = displayValue;
    el.style.width = '100%';
    el.style.textAlign = 'right';
    el.style.fontVariantNumeric = 'tabular-nums';
    
    if (opts?.format === 'currency') {
      el.style.color = '#059669'; // emerald-600
    }
    
    return el;
  },

  renderReact: (context: CellRenderContext<number>) => {
    const { displayValue, options, value } = context;
    const opts = options as NumberTypeOptions;
    
    const isCurrency = opts?.format === 'currency';
    const isPercent = opts?.format === 'percent';
    const isNegative = typeof value === 'number' && value < 0;

    return (
      <div 
        className={`w-full text-right font-mono tabular-nums ${
          isCurrency ? 'text-emerald-600 dark:text-emerald-400' : ''
        } ${
          isPercent ? 'text-blue-600 dark:text-blue-400' : ''
        } ${
          isNegative ? 'text-red-500' : ''
        }`}
      >
        {displayValue}
      </div>
    );
  }
};

