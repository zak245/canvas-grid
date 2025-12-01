import React from 'react';
import { Check, X, Minus } from 'lucide-react';
import type { CellRenderContext, HtmlCellRenderer } from '../types';

export const booleanCellRenderer: HtmlCellRenderer<boolean> = {
  renderHtml: (context: CellRenderContext<boolean>) => {
    const { value } = context;
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.width = '100%';
    el.style.height = '100%';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    input.disabled = true;
    input.style.accentColor = '#2563eb';
    
    el.appendChild(input);
    return el;
  },

  renderReact: (context: CellRenderContext<boolean>) => {
    const { value } = context;
    
    if (value === true) {
      return (
        <div className="flex items-center justify-center w-full h-full">
            <div className="bg-blue-100 text-blue-600 rounded-md p-0.5">
                <Check size={16} strokeWidth={3} />
            </div>
        </div>
      );
    }
    
    if (value === false) {
      return (
        <div className="flex items-center justify-center w-full h-full">
             <div className="text-gray-300">
                <X size={16} />
            </div>
        </div>
      );
    }

    return (
        <div className="flex items-center justify-center w-full h-full text-gray-300">
            <Minus size={16} />
        </div>
    );
  }
};

