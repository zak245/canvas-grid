import type { CanvasCellRenderer, CellRenderContext, PhoneTypeOptions } from '../types';

// ============================================================================
// Phone Cell Renderer (Canvas)
// ============================================================================

export const phoneCellRenderer: CanvasCellRenderer<string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<string>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as PhoneTypeOptions | undefined;
    
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    if (value) {
      // Phone icon
      ctx.fillStyle = '#9ca3af';
      drawPhoneIcon(ctx, x + 8, y + height / 2 - 6, 12);
      
      // Formatted phone number
      const formatted = formatPhoneNumber(value, typeOptions?.format);
      const displayText = truncateText(ctx, formatted, width - 32);
      
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

function formatPhoneNumber(phone: string, format: 'international' | 'national' | 'e164' = 'national'): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // US phone number formatting
  if (digits.length === 10) {
    if (format === 'e164') {
      return `+1${digits}`;
    }
    if (format === 'international') {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // National
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // With country code
  if (digits.length === 11 && digits.startsWith('1')) {
    const national = digits.slice(1);
    if (format === 'e164') {
      return `+${digits}`;
    }
    if (format === 'international') {
      return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
    }
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  
  // International number - just add + and spaces
  if (digits.length > 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`.trim();
  }
  
  // Partial number - just return digits
  return digits;
}

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

function drawPhoneIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Phone body
  const padding = 2;
  ctx.strokeRect(x + padding, y, size - padding * 2, size);
  
  // Screen
  ctx.strokeRect(x + padding + 2, y + 2, size - padding * 2 - 4, size - 6);
  
  // Home button
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size - 2, 1, 0, Math.PI * 2);
  ctx.stroke();
  
  ctx.restore();
}

