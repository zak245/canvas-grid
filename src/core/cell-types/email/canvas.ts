import type { CanvasCellRenderer, CellRenderContext } from '../types';

// ============================================================================
// Email Cell Renderer (Canvas)
// ============================================================================

export const emailCellRenderer: CanvasCellRenderer<string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string>): void {
    const { value, x, y, width, height, theme, hasError } = context;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    if (value) {
      // Email icon
      ctx.fillStyle = '#9ca3af';
      drawEmailIcon(ctx, x + 8, y + height / 2 - 6, 12);
      
      // Email text
      const displayText = truncateText(ctx, value, width - 32);
      ctx.fillStyle = hasError ? '#dc2626' : '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      
      ctx.fillText(displayText, x + 26, y + height / 2);
    }
  }
};

// ============================================================================
// Helper Functions (Duplicated for renderer)
// ============================================================================

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  const ellipsis = '…';
  let width = ctx.measureText(text).width;
  
  if (width <= maxWidth) return text;
  
  let truncated = text;
  while (width > maxWidth && truncated.length > 0) {
    truncated = truncated.slice(0, -1);
    width = ctx.measureText(truncated + ellipsis).width;
  }
  
  return truncated + ellipsis;
}

function drawEmailIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.5;
  
  // Envelope body
  ctx.strokeRect(x, y + 2, size, size - 4);
  
  // Envelope flap
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x + size / 2, y + size / 2);
  ctx.lineTo(x + size, y + 2);
  ctx.stroke();
  
  ctx.restore();
}

