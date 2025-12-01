import React from 'react';
import type { CellRenderContext, HtmlCellRenderer, ProgressTypeOptions } from '../../types';

export const progressCellRenderer: HtmlCellRenderer<number> = {
  renderHtml: (context: CellRenderContext<number>) => {
    const { value, options } = context;
    const opts = options as ProgressTypeOptions;
    const min = opts?.min ?? 0;
    const max = opts?.max ?? 100;
    const val = Math.max(min, Math.min(max, typeof value === 'number' ? value : 0));
    const percent = ((val - min) / (max - min)) * 100;
    const color = opts?.color || '#3b82f6';

    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.gap = '8px';

    const track = document.createElement('div');
    track.style.flex = '1';
    track.style.height = '6px';
    track.style.backgroundColor = '#e5e7eb';
    track.style.borderRadius = '3px';
    track.style.overflow = 'hidden';

    const bar = document.createElement('div');
    bar.style.height = '100%';
    bar.style.width = `${percent}%`;
    bar.style.backgroundColor = color;
    bar.style.borderRadius = '3px';
    
    track.appendChild(bar);
    el.appendChild(track);
    
    if (opts?.showLabel !== false) {
        const label = document.createElement('span');
        label.textContent = `${Math.round(percent)}%`;
        label.style.fontSize = '12px';
        label.style.color = '#6b7280';
        label.style.width = '32px';
        label.style.textAlign = 'right';
        el.appendChild(label);
    }
    
    return el;
  },

  renderReact: (context: CellRenderContext<number>) => {
    const { value, options } = context;
    const opts = options as ProgressTypeOptions;
    const min = opts?.min ?? 0;
    const max = opts?.max ?? 100;
    const val = Math.max(min, Math.min(max, typeof value === 'number' ? value : 0));
    const percent = ((val - min) / (max - min)) * 100;
    const color = opts?.color || '#3b82f6';

    return (
      <div className="flex items-center gap-2 w-full h-full">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${percent}%`, backgroundColor: color }}
            />
        </div>
        {opts?.showLabel !== false && (
            <span className="text-xs text-gray-500 w-8 text-right font-mono">
                {Math.round(percent)}%
            </span>
        )}
      </div>
    );
  }
};

