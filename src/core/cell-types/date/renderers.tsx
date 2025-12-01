import React from 'react';
import { Calendar } from 'lucide-react';
import type { CellRenderContext, HtmlCellRenderer, DateTypeOptions } from '../../types';

export const dateCellRenderer: HtmlCellRenderer<Date> = {
  renderHtml: (context: CellRenderContext<Date>) => {
    const { displayValue } = context;
    
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '6px';
    el.style.width = '100%';
    
    // Icon
    const icon = document.createElement('span');
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    icon.style.color = '#9ca3af';
    icon.style.display = 'flex';
    
    const text = document.createElement('span');
    text.textContent = displayValue;
    text.style.overflow = 'hidden';
    text.style.textOverflow = 'ellipsis';
    text.style.whiteSpace = 'nowrap';
    
    el.appendChild(icon);
    el.appendChild(text);
    return el;
  },

  renderReact: (context: CellRenderContext<Date>) => {
    const { displayValue, value } = context;
    if (!value) return null;

    return (
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 w-full">
        <Calendar size={14} className="text-gray-400" />
        <span className="truncate">{displayValue}</span>
      </div>
    );
  }
};

