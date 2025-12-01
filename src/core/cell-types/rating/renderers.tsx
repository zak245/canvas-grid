import React from 'react';
import { Star } from 'lucide-react';
import type { CellRenderContext, HtmlCellRenderer, RatingTypeOptions } from '../../types';

export const ratingCellRenderer: HtmlCellRenderer<number> = {
  renderHtml: (context: CellRenderContext<number>) => {
    const { value, options } = context;
    const opts = options as RatingTypeOptions;
    const max = opts?.max || 5;
    const rating = typeof value === 'number' ? value : 0;
    const color = opts?.color || '#f59e0b'; // amber-500

    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '2px';
    
    for (let i = 1; i <= max; i++) {
        const star = document.createElement('span');
        // Basic star character
        star.textContent = '★'; 
        star.style.fontSize = '16px';
        star.style.lineHeight = '1';
        if (i <= rating) {
            star.style.color = color;
        } else {
            star.style.color = '#d1d5db';
        }
        el.appendChild(star);
    }
    
    return el;
  },

  renderReact: (context: CellRenderContext<number>) => {
    const { value, options } = context;
    const opts = options as RatingTypeOptions;
    const max = opts?.max || 5;
    const rating = typeof value === 'number' ? value : 0;
    const color = opts?.color || '#f59e0b';

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
            <Star 
                key={i}
                size={14}
                fill={i < rating ? color : 'transparent'}
                color={i < rating ? color : '#d1d5db'}
                strokeWidth={2}
            />
        ))}
      </div>
    );
  }
};

