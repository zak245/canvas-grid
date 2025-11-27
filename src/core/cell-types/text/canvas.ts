import type { CanvasCellRenderer, CellRenderContext } from '../types';

// ============================================================================
// Text Cell Renderer (Canvas)
// ============================================================================

export const textCellRenderer: CanvasCellRenderer<string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string>): void {
    const { value, x, y, width, height, theme, hasError, isSelected, isFocused } = context;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    // Text
    if (value) {
      const displayText = truncateText(ctx, String(value), width - 16);
      
      ctx.fillStyle = hasError ? '#dc2626' : '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(displayText, x + 8, y + height / 2);
    }
    
    // Focus indicator
    if (isFocused && isSelected) {
      ctx.strokeStyle = theme.selectionBorderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
    }
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const ellipsis = '…';
  let width = ctx.measureText(text).width;
  
  if (width <= maxWidth) {
    return text;
  }
  
  let truncated = text;
  while (width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
    width = ctx.measureText(truncated + ellipsis).width;
  }
  
  return truncated + ellipsis;
}

