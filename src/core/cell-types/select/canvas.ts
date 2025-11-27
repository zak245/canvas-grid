import { getTagColor, getContrastColor } from './definition';
import type { CanvasCellRenderer, CellRenderContext, SelectTypeOptions } from '../types';

// ============================================================================
// Select Cell Renderer (Canvas)
// ============================================================================

export const selectCellRenderer: CanvasCellRenderer<string | string[]> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string | string[]>): void {
    const { value, x, y, width, height, theme, options } = context;
    const typeOptions = options as SelectTypeOptions | undefined;
    
    if (!value) return;
    
    const values = Array.isArray(value) ? value : [value];
    const selectOptions = typeOptions?.options ?? [];
    
    let currentX = x + 8;
    const tagHeight = 22;
    const tagY = y + (height - tagHeight) / 2;
    const maxWidth = width - 16;
    
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      const option = selectOptions.find(o => o.value === val);
      const label = option?.label ?? val;
      
      // Measure tag width
      ctx.font = `${theme.fontSize - 1}px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(label).width;
      const tagWidth = textWidth + 16;
      
      // Check if we have space
      if (currentX + tagWidth > x + maxWidth) {
        // Draw overflow indicator
        const remaining = values.length - i;
        if (remaining > 0) {
          ctx.fillStyle = '#6b7280';
          ctx.font = `${theme.fontSize - 1}px ${theme.fontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(`+${remaining}`, currentX, y + height / 2);
        }
        break;
      }
      
      // Get color
      const colorIndex = selectOptions.findIndex(o => o.value === val);
      const color = option?.color 
        ? { bg: option.color, text: getContrastColor(option.color) }
        : getTagColor(colorIndex >= 0 ? colorIndex : i);
      
      // Draw tag background
      const radius = 4;
      ctx.fillStyle = color.bg;
      ctx.beginPath();
      ctx.moveTo(currentX + radius, tagY);
      ctx.lineTo(currentX + tagWidth - radius, tagY);
      ctx.quadraticCurveTo(currentX + tagWidth, tagY, currentX + tagWidth, tagY + radius);
      ctx.lineTo(currentX + tagWidth, tagY + tagHeight - radius);
      ctx.quadraticCurveTo(currentX + tagWidth, tagY + tagHeight, currentX + tagWidth - radius, tagY + tagHeight);
      ctx.lineTo(currentX + radius, tagY + tagHeight);
      ctx.quadraticCurveTo(currentX, tagY + tagHeight, currentX, tagY + tagHeight - radius);
      ctx.lineTo(currentX, tagY + radius);
      ctx.quadraticCurveTo(currentX, tagY, currentX + radius, tagY);
      ctx.closePath();
      ctx.fill();
      
      // Draw tag text
      ctx.fillStyle = color.text;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(label, currentX + 8, tagY + tagHeight / 2);
      
      currentX += tagWidth + 4;
    }
  }
};

