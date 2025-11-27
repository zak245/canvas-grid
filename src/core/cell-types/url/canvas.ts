import type { CanvasCellRenderer, CellRenderContext } from '../types';

// ============================================================================
// URL Cell Renderer (Canvas)
// ============================================================================

export const urlCellRenderer: CanvasCellRenderer<string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string>): void {
    const { value, x, y, width, height, theme, hasError } = context;
    
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    if (value) {
      // Link icon
      ctx.fillStyle = '#9ca3af';
      drawLinkIcon(ctx, x + 8, y + height / 2 - 6, 12);
      
      // Display URL (without protocol for cleaner look)
      let displayUrl = value;
      try {
        const url = new URL(value);
        displayUrl = url.hostname + url.pathname;
        if (displayUrl.endsWith('/')) {
          displayUrl = displayUrl.slice(0, -1);
        }
      } catch {
        // Keep original if not valid URL
      }
      
      const displayText = truncateText(ctx, displayUrl, width - 32);
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

function drawLinkIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  
  // Chain link
  const half = size / 2;
  
  ctx.beginPath();
  ctx.arc(x + half / 2, y + half, half / 2, Math.PI * 0.5, Math.PI * 1.5);
  ctx.moveTo(x + half / 2, y + half / 2);
  ctx.lineTo(x + half, y + half / 2);
  ctx.moveTo(x + half / 2, y + half + half / 2);
  ctx.lineTo(x + half, y + half + half / 2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(x + half + half / 2, y + half, half / 2, Math.PI * 1.5, Math.PI * 0.5);
  ctx.moveTo(x + half, y + half / 2);
  ctx.lineTo(x + half + half / 2, y + half / 2);
  ctx.moveTo(x + half, y + half + half / 2);
  ctx.lineTo(x + half + half / 2, y + half + half / 2);
  ctx.stroke();
  
  ctx.restore();
}

