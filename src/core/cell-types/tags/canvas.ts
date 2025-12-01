import { getTagColor } from './definition';
import type { CanvasCellRenderer, CellRenderContext, TagsTypeOptions } from '../types';

// ============================================================================
// Tags Cell Renderer (Canvas)
// ============================================================================

export const tagsCellRenderer: CanvasCellRenderer<string[]> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string[]>): void {
    const { value, x, y, width, height, theme, options } = context;
    const typeOptions = options as TagsTypeOptions | undefined;
    
    if (!value || !Array.isArray(value) || value.length === 0) return;
    
    const padding = 8;
    const tagHeight = 20;
    const tagPadding = 8;
    const tagGap = 4;
    const maxWidth = width - padding * 2;
    
    let currentX = x + padding;
    const centerY = y + (height - tagHeight) / 2;
    
    for (let i = 0; i < value.length; i++) {
      const tag = value[i];
      const color = getTagColor(tag, typeOptions);
      
      // Measure tag width
      ctx.font = `500 ${theme.fontSize - 2}px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(tag).width;
      const tagWidth = textWidth + tagPadding * 2;
      
      // Check if we have space
      if (currentX + tagWidth > x + maxWidth) {
        const remaining = value.length - i;
        if (remaining > 0) {
          ctx.fillStyle = '#6b7280';
          ctx.font = `${theme.fontSize - 2}px ${theme.fontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(`+${remaining}`, currentX, centerY + tagHeight / 2);
        }
        break;
      }
      
      // Draw tag background (pill shape)
      ctx.fillStyle = color.bg;
      ctx.beginPath();
      if (ctx.roundRect) {
          ctx.roundRect(currentX, centerY, tagWidth, tagHeight, tagHeight / 2);
      } else {
          // Fallback for round rect
          const r = tagHeight / 2;
          ctx.moveTo(currentX + r, centerY);
          ctx.lineTo(currentX + tagWidth - r, centerY);
          ctx.quadraticCurveTo(currentX + tagWidth, centerY, currentX + tagWidth, centerY + r);
          ctx.lineTo(currentX + tagWidth, centerY + tagHeight - r);
          ctx.quadraticCurveTo(currentX + tagWidth, centerY + tagHeight, currentX + tagWidth - r, centerY + tagHeight);
          ctx.lineTo(currentX + r, centerY + tagHeight);
          ctx.quadraticCurveTo(currentX, centerY + tagHeight, currentX, centerY + tagHeight - r);
          ctx.lineTo(currentX, centerY + r);
          ctx.quadraticCurveTo(currentX, centerY, currentX + r, centerY);
      }
      ctx.fill();
      
      // Draw tag text
      ctx.fillStyle = color.text;
      ctx.font = `500 ${theme.fontSize - 2}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(tag, currentX + tagWidth / 2, centerY + tagHeight / 2);
      
      currentX += tagWidth + tagGap;
    }
  }
};

