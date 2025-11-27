import type { CanvasCellRenderer, CellRenderContext, ActionTypeOptions } from '../types';

// ============================================================================
// Icon Paths (Simple SVG-style icons)
// ============================================================================

const ICONS: Record<string, (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => void> = {
  mail: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x + 2, y + 4, size - 4, size - 8);
    ctx.moveTo(x + 2, y + 4);
    ctx.lineTo(x + size / 2, y + size / 2 - 2);
    ctx.lineTo(x + size - 2, y + 4);
    ctx.stroke();
  },
  phone: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 3);
    ctx.lineTo(x + 7, y + 3);
    ctx.quadraticCurveTo(x + 4, y + 8, x + 4, y + 12);
    ctx.quadraticCurveTo(x + 8, y + size - 3, x + size - 4, y + size - 3);
    ctx.lineTo(x + size - 3, y + size - 6);
    ctx.stroke();
  },
  link: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    const s = size * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + s * 2, y + s);
    ctx.lineTo(x + size - s, y + s);
    ctx.lineTo(x + size - s, y + size - s * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s, y + size - s);
    ctx.lineTo(x + size - s, y + s);
    ctx.stroke();
  },
  edit: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size - 4, y + 4);
    ctx.lineTo(x + 4, y + size - 4);
    ctx.lineTo(x + 4, y + size - 2);
    ctx.lineTo(x + 6, y + size - 2);
    ctx.lineTo(x + size - 2, y + 6);
    ctx.closePath();
    ctx.stroke();
  },
  trash: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 5);
    ctx.lineTo(x + size - 3, y + 5);
    ctx.moveTo(x + size / 2 - 2, y + 3);
    ctx.lineTo(x + size / 2 + 2, y + 3);
    ctx.lineTo(x + size / 2 + 2, y + 5);
    ctx.lineTo(x + size / 2 - 2, y + 5);
    ctx.moveTo(x + 5, y + 5);
    ctx.lineTo(x + 5, y + size - 3);
    ctx.lineTo(x + size - 5, y + size - 3);
    ctx.lineTo(x + size - 5, y + 5);
    ctx.stroke();
  },
  copy: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 5, y + 2, size - 8, size - 8);
    ctx.strokeRect(x + 3, y + 5, size - 8, size - 8);
  },
  download: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y + 3);
    ctx.lineTo(x + size / 2, y + size - 6);
    ctx.moveTo(x + size / 2 - 4, y + size - 9);
    ctx.lineTo(x + size / 2, y + size - 5);
    ctx.lineTo(x + size / 2 + 4, y + size - 9);
    ctx.moveTo(x + 4, y + size - 3);
    ctx.lineTo(x + size - 4, y + size - 3);
    ctx.stroke();
  },
  more: (ctx, x, y, size, color) => {
    ctx.fillStyle = color;
    const dotSize = 3;
    const centerY = y + size / 2;
    ctx.beginPath();
    ctx.arc(x + size / 2 - 5, centerY, dotSize / 2, 0, Math.PI * 2);
    ctx.arc(x + size / 2, centerY, dotSize / 2, 0, Math.PI * 2);
    ctx.arc(x + size / 2 + 5, centerY, dotSize / 2, 0, Math.PI * 2);
    ctx.fill();
  },
  sparkles: (ctx, x, y, size, color) => {
    ctx.fillStyle = color;
    const cx = x + size / 2;
    const cy = y + size / 2;
    const r = size * 0.35;
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.3, cx + r, cy);
    ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 0.3, cx, cy + r);
    ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 0.3, cx - r, cy);
    ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.3, cx, cy - r);
    ctx.fill();
  },
};

// ============================================================================
// Action Cell Renderer (Canvas)
// ============================================================================

export const actionCellRenderer: CanvasCellRenderer<null> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<null>): void {
    const { x, y, width, height, options, isHovered } = context;
    const typeOptions = options as ActionTypeOptions | undefined;
    
    const buttons = typeOptions?.buttons ?? [];
    if (buttons.length === 0) return;
    
    const iconSize = 20;
    const gap = 4;
    const totalWidth = buttons.length * iconSize + (buttons.length - 1) * gap;
    let currentX = x + (width - totalWidth) / 2;
    const centerY = y + (height - iconSize) / 2;
    
    for (const button of buttons) {
      const isDisabled = button.disabled ?? false;
      const color = isDisabled ? '#d1d5db' : (isHovered ? '#3b82f6' : '#6b7280');
      
      // Draw icon background on hover
      if (isHovered && !isDisabled) {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(currentX - 2, centerY - 2, iconSize + 4, iconSize + 4, 4);
        else ctx.rect(currentX - 2, centerY - 2, iconSize + 4, iconSize + 4);
        ctx.fill();
      }
      
      // Draw icon
      const drawIcon = ICONS[button.icon] ?? ICONS.more;
      drawIcon(ctx, currentX, centerY, iconSize, color);
      
      currentX += iconSize + gap;
    }
  }
};

