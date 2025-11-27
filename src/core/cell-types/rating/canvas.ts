import type { CanvasCellRenderer, CellRenderContext, RatingTypeOptions } from '../types';

// ============================================================================
// Rating Cell Renderer (Canvas)
// ============================================================================

export const ratingCellRenderer: CanvasCellRenderer<number> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<number>): void {
    const { value, x, y, width, height, options, isHovered } = context;
    const typeOptions = options as RatingTypeOptions | undefined;
    
    const max = typeOptions?.max ?? 5;
    const icon = typeOptions?.icon ?? 'star';
    const color = typeOptions?.color ?? '#fbbf24'; // amber-400
    const allowHalf = typeOptions?.allowHalf ?? false;
    
    const iconSize = 16;
    const gap = 2;
    const totalWidth = max * iconSize + (max - 1) * gap;
    const startX = x + (width - totalWidth) / 2;
    const centerY = y + height / 2;
    
    const currentValue = value ?? 0;
    
    for (let i = 0; i < max; i++) {
      const iconX = startX + i * (iconSize + gap);
      const iconY = centerY - iconSize / 2;
      
      // Determine fill state
      let fillAmount = 0;
      if (currentValue >= i + 1) {
        fillAmount = 1;
      } else if (allowHalf && currentValue >= i + 0.5) {
        fillAmount = 0.5;
      }
      
      // Draw icon
      drawRatingIcon(ctx, icon, iconX, iconY, iconSize, color, fillAmount, isHovered);
    }
  }
};

// ============================================================================
// Drawing Helpers
// ============================================================================

function drawRatingIcon(
  ctx: CanvasRenderingContext2D,
  icon: 'star' | 'heart' | 'circle',
  x: number,
  y: number,
  size: number,
  color: string,
  fillAmount: number,
  isHovered: boolean
): void {
  ctx.save();
  
  // Scale on hover
  if (isHovered) {
    const scale = 1.1;
    const offset = size * (scale - 1) / 2;
    ctx.translate(x - offset, y - offset);
    ctx.scale(scale, scale);
    x = 0;
    y = 0;
  }
  
  if (icon === 'star') {
    drawStar(ctx, x + size / 2, y + size / 2, size / 2, color, fillAmount);
  } else if (icon === 'heart') {
    drawHeart(ctx, x, y, size, color, fillAmount);
  } else {
    drawCircle(ctx, x + size / 2, y + size / 2, size / 2, color, fillAmount);
  }
  
  ctx.restore();
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  fillAmount: number
): void {
  const spikes = 5;
  const outerRadius = radius;
  const innerRadius = radius * 0.4;
  
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  
  if (fillAmount > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = fillAmount;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.strokeStyle = fillAmount > 0 ? color : '#d1d5db';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  fillAmount: number
): void {
  const width = size;
  const height = size;
  
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y + height * 0.3);
  ctx.bezierCurveTo(x + width / 2, y, x, y, x, y + height * 0.3);
  ctx.bezierCurveTo(x, y + height * 0.6, x + width / 2, y + height, x + width / 2, y + height);
  ctx.bezierCurveTo(x + width / 2, y + height, x + width, y + height * 0.6, x + width, y + height * 0.3);
  ctx.bezierCurveTo(x + width, y, x + width / 2, y, x + width / 2, y + height * 0.3);
  ctx.closePath();
  
  if (fillAmount > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = fillAmount;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.strokeStyle = fillAmount > 0 ? color : '#d1d5db';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  fillAmount: number
): void {
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.8, 0, Math.PI * 2);
  
  if (fillAmount > 0) {
    ctx.fillStyle = color;
    ctx.globalAlpha = fillAmount;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.strokeStyle = fillAmount > 0 ? color : '#d1d5db';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

