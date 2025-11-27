import type { CanvasCellRenderer, CellRenderContext, JsonTypeOptions } from '../types';

// ============================================================================
// JSON Cell Renderer (Canvas)
// ============================================================================

export const jsonCellRenderer: CanvasCellRenderer<unknown> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<unknown>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as JsonTypeOptions | undefined;
    
    if (value === null || value === undefined) return;
    
    const displayMode = typeOptions?.displayMode ?? 'summary';
    const maxKeys = typeOptions?.maxKeys ?? 3;
    
    const padding = 8;
    const maxWidth = width - padding * 2;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    let displayText = '';
    
    if (displayMode === 'raw') {
      // Show truncated JSON string
      displayText = JSON.stringify(value);
    } else if (displayMode === 'summary') {
      // Show key count or array length
      if (Array.isArray(value)) {
        displayText = `[${value.length} items]`;
      } else if (typeof value === 'object') {
        const keys = Object.keys(value as object);
        displayText = `{${keys.length} keys}`;
      } else {
        displayText = String(value);
      }
    } else if (displayMode === 'key-value') {
      // Show first few key-value pairs
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const entries = Object.entries(value as object).slice(0, maxKeys);
        displayText = entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(', ');
      } else if (Array.isArray(value)) {
        displayText = value.slice(0, maxKeys).map(v => formatValue(v)).join(', ');
      } else {
        displayText = String(value);
      }
    }
    
    // Truncate if needed
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    let truncated = displayText;
    while (truncated.length > 0 && ctx.measureText(truncated).width > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    if (truncated !== displayText) {
      truncated = truncated.slice(0, -1) + '…';
    }
    
    // Draw with monospace style hint
    ctx.fillStyle = hasError ? '#dc2626' : '#6b7280';
    ctx.font = `${theme.fontSize - 1}px "SF Mono", Monaco, Consolas, monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(truncated, x + padding, y + height / 2);
  }
};

// ============================================================================
// Helpers (Duplicated for renderer)
// ============================================================================

function formatValue(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{...}';
  return String(v);
}

