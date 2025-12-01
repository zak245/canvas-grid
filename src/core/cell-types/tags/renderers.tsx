import React from 'react';
import type { CellRenderContext, HtmlCellRenderer, TagsTypeOptions } from '../../types';

import { getTagColor } from './definition';

export const tagsCellRenderer: HtmlCellRenderer<string[]> = {
  renderHtml: (context: CellRenderContext<string[]>) => {
    const { value, options } = context;
    const opts = options as TagsTypeOptions;
    const tags = Array.isArray(value) ? value : [];
    
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '4px';
    el.style.overflow = 'hidden';
    
    if (tags.length === 0) return el;
    
    tags.forEach(tag => {
        const color = getTagColor(tag, opts);
        
        const badge = document.createElement('span');
        badge.textContent = tag;
        badge.style.padding = '2px 6px';
        badge.style.borderRadius = '4px';
        badge.style.fontSize = '11px';
        badge.style.fontWeight = '500';
        badge.style.backgroundColor = color.bg;
        badge.style.color = color.text;
        badge.style.whiteSpace = 'nowrap';
        
        el.appendChild(badge);
    });
    
    return el;
  },

  renderReact: (context: CellRenderContext<string[]>) => {
    const { value, options } = context;
    const opts = options as TagsTypeOptions;
    const tags = Array.isArray(value) ? value : [];

    if (tags.length === 0) return null;

    return (
      <div className="flex items-center gap-1 overflow-hidden w-full">
        {tags.map((tag, i) => {
            const color = getTagColor(tag, opts);
            
            return (
                <span 
                    key={i}
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium whitespace-nowrap"
                    style={{ backgroundColor: color.bg, color: color.text }}
                >
                    {tag}
                </span>
            );
        })}
      </div>
    );
  }
};

