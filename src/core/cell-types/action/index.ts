import { actionCellDefinition } from './definition';
import { actionCellRenderer } from './canvas';
import type { CellType, CellRenderContext, ActionTypeOptions } from '../types';
import React from 'react';

export const actionCellType: CellType<null> = {
  ...actionCellDefinition,
  ...actionCellRenderer,

  // ===== Interactivity =====

  onHitTest(context: CellRenderContext<null>, x: number, y: number) {
    const { x: cellX, y: cellY, width, height, options } = context;
    const typeOptions = options as ActionTypeOptions | undefined;
    const buttons = typeOptions?.buttons ?? [];
    
    if (buttons.length === 0) return null;

    const iconSize = 20;
    const gap = 4;
    const totalWidth = buttons.length * iconSize + (buttons.length - 1) * gap;
    
    // Layout logic matches canvas.ts
    const startX = cellX + (width - totalWidth) / 2;
    const startY = cellY + (height - iconSize) / 2;

    let currentX = startX;
    
    for (const button of buttons) {
        // Check bounds
        // Added padding/tolerance of 2px
        if (x >= currentX - 2 && x <= currentX + iconSize + 2 &&
            y >= startY - 2 && y <= startY + iconSize + 2) {
            
            if (button.disabled) return null;
            
            return {
                action: button.id,
                payload: {
                    id: button.id,
                    rowIndex: context.rowIndex,
                    columnId: context.columnId
                }
            };
        }
        currentX += iconSize + gap;
    }

    return null;
  },

  // ===== HTML Rendering =====

  renderHtml(context: CellRenderContext<null>): string {
    const { options } = context;
    const typeOptions = options as ActionTypeOptions | undefined;
    const buttons = typeOptions?.buttons ?? [];
    
    if (buttons.length === 0) return '';

    const iconSize = 20;
    const gap = 4;
    
    let html = `<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; gap: ${gap}px;">`;
    
    for (const button of buttons) {
        const disabled = button.disabled ? 'opacity: 0.3; cursor: not-allowed;' : 'cursor: pointer;';
        const iconChar = getIconEmoji(button.icon); // Need to expose this helper or duplicate
        
        html += `<div 
            data-action="${button.id}"
            title="${button.tooltip || ''}"
            style="font-size: 16px; width: ${iconSize}px; height: ${iconSize}px; display: flex; align-items: center; justify-content: center; ${disabled}">
            ${iconChar}
        </div>`;
    }
    
    html += '</div>';
    return html;
  },

  renderReact(context: CellRenderContext<null>): any {
    const { options } = context;
    const typeOptions = options as ActionTypeOptions | undefined;
    const buttons = typeOptions?.buttons ?? [];
    
    if (buttons.length === 0) return null;

    const iconSize = 20;
    const gap = 4;

    return React.createElement(
        'div',
        {
            style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                gap: `${gap}px`
            }
        },
        buttons.map(button => {
            const disabledStyle = button.disabled ? { opacity: 0.3, cursor: 'not-allowed' } : { cursor: 'pointer' };
            const iconChar = getIconEmoji(button.icon);
            
            return React.createElement(
                'div',
                {
                    key: button.id,
                    'data-action': button.id,
                    title: button.tooltip || '',
                    style: {
                        fontSize: '16px',
                        width: `${iconSize}px`,
                        height: `${iconSize}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...disabledStyle
                    },
                    onClick: (e: React.MouseEvent) => {
                        if (button.disabled) return;
                        e.stopPropagation();
                        // We can rely on data-action bubbling OR explicit handler?
                        // MouseHandler listens to container. React events bubble to container?
                        // React uses synthetic events.
                        // If we use onClick here, we stop propagation?
                        // MouseHandler attaches to the container ref. 
                        // If we don't stop prop, it bubbles to document?
                        // Actually, InputController attaches to container using vanilla listeners.
                        // React events bubble through React tree, then to document (React 17+ attaches to root).
                        // If ReactRenderer container is the root, the click will bubble to it.
                        // But vanilla listeners on that container will catch it.
                        // So we don't need explicit onClick handler if data-action is set and we trust EventNormalizer.
                        // However, React optimization might bypass DOM attributes?
                        // No, attributes are rendered.
                        // So we just render the attributes.
                    }
                },
                iconChar
            );
        })
    );
  }
};

// Helper reused from definition.ts (need to export it from there or duplicate)
function getIconEmoji(icon: string): string {
  const emojis: Record<string, string> = {
    mail: '✉️',
    phone: '📞',
    link: '🔗',
    edit: '✏️',
    trash: '🗑️',
    copy: '📋',
    download: '⬇️',
    more: '⋯',
    sparkles: '✨',
    play: '▶️',
    ai: '🤖'
  };
  return emojis[icon] ?? '•';
}
