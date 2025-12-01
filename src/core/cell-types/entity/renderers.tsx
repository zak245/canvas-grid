import React from 'react';
import { User } from 'lucide-react';
import type { CellRenderContext, HtmlCellRenderer, EntityTypeOptions } from '../../types';

interface EntityValue {
    id: string;
    name: string;
    avatar?: string;
    subtitle?: string;
}

export const entityCellRenderer: HtmlCellRenderer<EntityValue> = {
  renderHtml: (context: CellRenderContext<EntityValue>) => {
    const { value, options } = context;
    const opts = options as EntityTypeOptions;
    
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '8px';
    el.style.width = '100%';
    
    if (!value) return el;

    // Avatar
    if (opts?.showImage !== false) {
        const avatar = document.createElement('div');
        const size = opts?.imageSize || 24;
        avatar.style.width = `${size}px`;
        avatar.style.height = `${size}px`;
        avatar.style.borderRadius = opts?.imageShape === 'square' ? '4px' : '50%';
        avatar.style.backgroundColor = '#e5e7eb';
        avatar.style.display = 'flex';
        avatar.style.alignItems = 'center';
        avatar.style.justifyContent = 'center';
        avatar.style.overflow = 'hidden';
        avatar.style.flexShrink = '0';

        if (value.avatar) {
            const img = document.createElement('img');
            img.src = value.avatar;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            avatar.appendChild(img);
        } else {
            avatar.textContent = value.name.charAt(0).toUpperCase();
            avatar.style.fontSize = '12px';
            avatar.style.fontWeight = '600';
            avatar.style.color = '#6b7280';
        }
        el.appendChild(avatar);
    }

    // Text
    const textCol = document.createElement('div');
    textCol.style.display = 'flex';
    textCol.style.flexDirection = 'column';
    textCol.style.overflow = 'hidden';
    
    const name = document.createElement('span');
    name.textContent = value.name;
    name.style.overflow = 'hidden';
    name.style.textOverflow = 'ellipsis';
    name.style.whiteSpace = 'nowrap';
    name.style.fontWeight = '500';
    textCol.appendChild(name);

    if (opts?.showSubtitle && value.subtitle) {
        const sub = document.createElement('span');
        sub.textContent = value.subtitle;
        sub.style.fontSize = '11px';
        sub.style.color = '#9ca3af';
        sub.style.overflow = 'hidden';
        sub.style.textOverflow = 'ellipsis';
        sub.style.whiteSpace = 'nowrap';
        textCol.appendChild(sub);
    }

    el.appendChild(textCol);
    return el;
  },

  renderReact: (context: CellRenderContext<EntityValue>) => {
    const { value, options } = context;
    const opts = options as EntityTypeOptions;
    
    if (!value) return null;

    const size = opts?.imageSize || 24;
    const rounded = opts?.imageShape === 'square' ? 'rounded-sm' : 'rounded-full';

    return (
      <div className="flex items-center gap-2 w-full overflow-hidden">
        {opts?.showImage !== false && (
            <div 
                className={`flex-shrink-0 bg-gray-200 flex items-center justify-center overflow-hidden ${rounded}`}
                style={{ width: size, height: size }}
            >
                {value.avatar ? (
                    <img src={value.avatar} alt={value.name} className="w-full h-full object-cover" />
                ) : (
                    <User size={size * 0.6} className="text-gray-400" />
                )}
            </div>
        )}
        
        <div className="flex flex-col overflow-hidden min-w-0">
            <span className="truncate font-medium text-gray-700 dark:text-gray-200 leading-tight">
                {value.name}
            </span>
            {opts?.showSubtitle && value.subtitle && (
                <span className="truncate text-xs text-gray-500 leading-tight">
                    {value.subtitle}
                </span>
            )}
        </div>
      </div>
    );
  }
};

