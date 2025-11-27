import type { CanvasCellRenderer, CellRenderContext, DateTypeOptions } from '../types';

// ============================================================================
// Date Cell Renderer (Canvas)
// ============================================================================

export const dateCellRenderer: CanvasCellRenderer<Date | string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<Date | string>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as DateTypeOptions | undefined;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    // Format and display date
    const date = parseDate(value);
    if (date) {
      const formatted = formatDate(date, typeOptions);
      
      // Calendar icon
      ctx.fillStyle = '#9ca3af';
      drawCalendarIcon(ctx, x + 8, y + height / 2 - 6, 12);
      
      // Date text
      ctx.fillStyle = hasError ? '#dc2626' : '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(formatted, x + 26, y + height / 2);
    }
  }
};

// ============================================================================
// Helpers (Duplicated for rendering context)
// ============================================================================

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

function formatDate(date: Date, options?: DateTypeOptions): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const format = options?.format ?? 'date';
  
  switch (format) {
    case 'relative':
      return formatRelative(date);
    
    case 'datetime':
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'time':
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'date':
    default:
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  
  return `${Math.floor(diffDays / 365)}y ago`;
}

function drawCalendarIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.5;
  
  // Calendar body
  ctx.strokeRect(x, y + 2, size, size - 2);
  
  // Top bar
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x + size, y + 5);
  ctx.stroke();
  
  // Calendar rings
  ctx.beginPath();
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + 3, y + 3);
  ctx.moveTo(x + size - 3, y);
  ctx.lineTo(x + size - 3, y + 3);
  ctx.stroke();
  
  ctx.restore();
}

