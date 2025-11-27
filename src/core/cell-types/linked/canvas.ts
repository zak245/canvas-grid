import { getInitials, getColorForName } from './definition';
import type { CanvasCellRenderer, CellRenderContext, LinkedRecordValue, LinkedTypeOptions } from '../types';

// ============================================================================
// Linked Cell Renderer (Canvas)
// ============================================================================

export const linkedCellRenderer: CanvasCellRenderer<LinkedRecordValue | LinkedRecordValue[]> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<LinkedRecordValue | LinkedRecordValue[]>): void {
    const { value, x, y, width, height, theme, options } = context;
    const typeOptions = options as LinkedTypeOptions | undefined;
    
    if (!value) return;
    
    const records = Array.isArray(value) ? value : [value];
    const showAvatar = typeOptions?.showAvatar ?? true;
    
    let currentX = x + 8;
    const avatarSize = 20;
    const maxWidth = width - 16;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      if (!record) continue;
      
      const name = record.name ?? record.id ?? 'Unknown';
      const avatarUrl = record.avatar ?? record.logo;
      
      // Measure item width
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      const textWidth = ctx.measureText(name).width;
      const itemWidth = (showAvatar ? avatarSize + 8 : 0) + textWidth + 16;
      
      // Check if we have space
      if (currentX + itemWidth > x + maxWidth) {
        const remaining = records.length - i;
        if (remaining > 0) {
          ctx.fillStyle = '#6b7280';
          ctx.font = `${theme.fontSize - 1}px ${theme.fontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';
          ctx.fillText(`+${remaining}`, currentX, y + height / 2);
        }
        break;
      }
      
      // Draw chip background
      const chipHeight = 24;
      const chipY = y + (height - chipHeight) / 2;
      const chipWidth = itemWidth;
      
      ctx.fillStyle = '#f3f4f6';
      ctx.beginPath();
      if (ctx.roundRect) {
          ctx.roundRect(currentX, chipY, chipWidth, chipHeight, 12);
      } else {
          // Fallback for roundRect
          const r = 12;
          ctx.moveTo(currentX + r, chipY);
          ctx.lineTo(currentX + chipWidth - r, chipY);
          ctx.quadraticCurveTo(currentX + chipWidth, chipY, currentX + chipWidth, chipY + r);
          ctx.lineTo(currentX + chipWidth, chipY + chipHeight - r);
          ctx.quadraticCurveTo(currentX + chipWidth, chipY + chipHeight, currentX + chipWidth - r, chipY + chipHeight);
          ctx.lineTo(currentX + r, chipY + chipHeight);
          ctx.quadraticCurveTo(currentX, chipY + chipHeight, currentX, chipY + chipHeight - r);
          ctx.lineTo(currentX, chipY + r);
          ctx.quadraticCurveTo(currentX, chipY, currentX + r, chipY);
      }
      ctx.fill();
      
      let textX = currentX + 8;
      
      // Draw avatar/logo
      if (showAvatar) {
        const avatarX = currentX + 4;
        const avatarY = chipY + 2;
        
        if (avatarUrl) {
          // For now, draw a placeholder circle
          // In real implementation, would use ImageCache
          ctx.fillStyle = '#d1d5db';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.fill();
          
          // Draw initials as fallback
          ctx.fillStyle = '#6b7280';
          ctx.font = `bold ${avatarSize * 0.4}px ${theme.fontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(
            getInitials(name),
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2
          );
        } else {
          // Draw initials circle
          ctx.fillStyle = getColorForName(name);
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${avatarSize * 0.4}px ${theme.fontFamily}`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(
            getInitials(name),
            avatarX + avatarSize / 2,
            avatarY + avatarSize / 2
          );
        }
        
        textX = avatarX + avatarSize + 6;
      }
      
      // Draw name
      ctx.fillStyle = '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(name, textX, y + height / 2);
      
      currentX += chipWidth + 4;
    }
  }
};

