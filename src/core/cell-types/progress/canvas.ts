import type { CanvasCellRenderer, CellRenderContext, ProgressTypeOptions } from '../types';

// ============================================================================
// Progress Cell Renderer (Canvas)
// ============================================================================

export const progressCellRenderer: CanvasCellRenderer<number> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<number>): void {
    const { value, x, y, width, height, theme, options } = context;
    const typeOptions = options as ProgressTypeOptions | undefined;
    
    const min = typeOptions?.min ?? 0;
    const max = typeOptions?.max ?? 100;
    const showLabel = typeOptions?.showLabel ?? true;
    const color = typeOptions?.color ?? '#3b82f6';
    
    const percent = Math.max(0, Math.min(100, ((value ?? 0) - min) / (max - min) * 100));
    
    const barHeight = 8;
    const barY = y + (height - barHeight) / 2;
    const barWidth = width - (showLabel ? 50 : 16);
    const barX = x + 8;
    
    // Background track
    ctx.fillStyle = '#e5e7eb';
    ctx.beginPath();
    // Assuming roundRect exists or polyfill logic
    if (ctx.roundRect) {
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
    } else {
        ctx.rect(barX, barY, barWidth, barHeight); // Fallback
    }
    ctx.fill();
    
    // Progress fill
    if (percent > 0) {
      const fillWidth = (barWidth * percent) / 100;
      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) {
          ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
      } else {
          ctx.rect(barX, barY, fillWidth, barHeight); // Fallback
      }
      ctx.fill();
    }
    
    // Label
    if (showLabel) {
      ctx.fillStyle = '#6b7280';
      ctx.font = `${theme.fontSize - 1}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(percent)}%`, x + width - 8, y + height / 2);
    }
  }
};

