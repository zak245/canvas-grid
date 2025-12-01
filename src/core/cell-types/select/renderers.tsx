import React from 'react';
import type { CellRenderContext, HtmlCellRenderer, SelectTypeOptions, SelectOption } from '../../types';

const getOption = (value: string, options?: SelectOption[]) => {
    return options?.find(o => o.value === value);
};

export const selectCellRenderer: HtmlCellRenderer<string | string[]> = {
  renderHtml: (context: CellRenderContext<string | string[]>) => {
    const { value, options } = context;
    const opts = options as SelectTypeOptions;
    
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '4px';
    el.style.width = '100%';
    el.style.height = '100%';
    
    const values = Array.isArray(value) ? value : (value ? [value] : []);
    
    if (values.length === 0) return el;
    
    values.forEach(val => {
        const option = getOption(val, opts?.options);
        const badge = document.createElement('span');
        badge.textContent = option?.label || val;
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '99px';
        badge.style.fontSize = '12px';
        badge.style.fontWeight = '500';
        
        const color = option?.color || '#e5e7eb';
        badge.style.backgroundColor = `${color}20`; // 20% opacity
        badge.style.color = color === '#e5e7eb' ? '#374151' : color;
        badge.style.border = `1px solid ${color}40`;
        
        el.appendChild(badge);
    });
    
    return el;
  },

  renderReact: (context: CellRenderContext<string | string[]>) => {
    const { value, options } = context;
    const opts = options as SelectTypeOptions;
    const values = Array.isArray(value) ? value : (value ? [value] : []);

    if (values.length === 0) return null;

    return (
      <div className="flex items-center gap-1 w-full h-full overflow-hidden">
        {values.map((val, i) => {
            const option = getOption(val, opts?.options);
            const color = option?.color || '#6b7280';
            
            // We use inline styles for dynamic colors since Tailwind classes might not cover all user colors
            return (
                <span 
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs font-medium border truncate max-w-full"
                    style={{
                        backgroundColor: `${color}15`, // very light bg
                        borderColor: `${color}30`,
                        color: color
                    }}
                >
                    {option?.label || val}
                </span>
            );
        })}
      </div>
    );
  }
};

