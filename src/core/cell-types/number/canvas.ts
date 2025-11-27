import type { CanvasCellRenderer, CellRenderContext, NumberTypeOptions } from '../types';

// ============================================================================
// Number Cell Renderer (Canvas)
// ============================================================================

export const numberCellRenderer: CanvasCellRenderer<number> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<number>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as NumberTypeOptions | undefined;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    // Format and display number
    if (value !== null && value !== undefined && !isNaN(value)) {
      const formatted = formatNumber(value, typeOptions);
      
      ctx.fillStyle = hasError ? '#dc2626' : '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right'; // Numbers are right-aligned
      ctx.fillText(formatted, x + width - 8, y + height / 2);
    }
  }
};

// ============================================================================
// Formatting Helpers (Duplicated for rendering context or import if possible)
// ============================================================================

// Note: In a real scenario, we might want to share these helpers from a common utils file
// or import them from definition.ts if exported. For now, I'll duplicate to keep files self-contained
// or we can import if we export them from definition.

function formatNumber(value: number, options?: NumberTypeOptions): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  const format = options?.format ?? 'decimal';
  const decimals = options?.decimals ?? (format === 'integer' ? 0 : 2);
  const currency = options?.currency ?? 'USD';
  const useSeparator = options?.thousandsSeparator ?? true;
  
  switch (format) {
    case 'integer':
      return formatWithSeparator(Math.round(value), 0, useSeparator);
    
    case 'currency':
      return formatCurrency(value, currency, decimals);
    
    case 'percent':
      return formatWithSeparator(value * 100, decimals, useSeparator) + '%';
    
    case 'decimal':
    default:
      return formatWithSeparator(value, decimals, useSeparator);
  }
}

function formatWithSeparator(value: number, decimals: number, useSeparator: boolean): string {
  const fixed = value.toFixed(decimals);
  
  if (!useSeparator) return fixed;
  
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function formatCurrency(value: number, currency: string, decimals: number): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
  };
  
  const symbol = symbols[currency] ?? '$';
  const formatted = formatWithSeparator(Math.abs(value), decimals, true);
  
  if (value < 0) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

