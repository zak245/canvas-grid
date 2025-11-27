import type { CanvasCellRenderer, CellRenderContext } from '../types';

// ============================================================================
// Boolean Cell Renderer (Canvas)
// ============================================================================

export const booleanCellRenderer: CanvasCellRenderer<boolean> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<boolean>): void {
    const { value, x, y, width, height, isHovered } = context;
    
    const checkboxSize = 18;
    const checkboxX = x + (width - checkboxSize) / 2;
    const checkboxY = y + (height - checkboxSize) / 2;
    
    // Draw checkbox background
    ctx.fillStyle = value ? '#22c55e' : (isHovered ? '#f3f4f6' : '#ffffff');
    ctx.strokeStyle = value ? '#22c55e' : '#d1d5db';
    ctx.lineWidth = 1.5;
    
    // Rounded rectangle
    const radius = 4;
    ctx.beginPath();
    ctx.moveTo(checkboxX + radius, checkboxY);
    ctx.lineTo(checkboxX + checkboxSize - radius, checkboxY);
    ctx.quadraticCurveTo(checkboxX + checkboxSize, checkboxY, checkboxX + checkboxSize, checkboxY + radius);
    ctx.lineTo(checkboxX + checkboxSize, checkboxY + checkboxSize - radius);
    ctx.quadraticCurveTo(checkboxX + checkboxSize, checkboxY + checkboxSize, checkboxX + checkboxSize - radius, checkboxY + checkboxSize);
    ctx.lineTo(checkboxX + radius, checkboxY + checkboxSize);
    ctx.quadraticCurveTo(checkboxX, checkboxY + checkboxSize, checkboxX, checkboxY + checkboxSize - radius);
    ctx.lineTo(checkboxX, checkboxY + radius);
    ctx.quadraticCurveTo(checkboxX, checkboxY, checkboxX + radius, checkboxY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw checkmark if checked
    if (value) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(checkboxX + 4, checkboxY + checkboxSize / 2);
      ctx.lineTo(checkboxX + checkboxSize / 2 - 1, checkboxY + checkboxSize - 5);
      ctx.lineTo(checkboxX + checkboxSize - 4, checkboxY + 5);
      ctx.stroke();
    }
    
    // Hover effect
    if (isHovered && !value) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fill();
    }
  }
};

