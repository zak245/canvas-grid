import type { CanvasCellRenderer, CellRenderContext, AIValue, AITypeOptions } from '../types';

// ============================================================================
// AI Cell Renderer (Canvas)
// ============================================================================

export const aiCellRenderer: CanvasCellRenderer<AIValue | string> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<AIValue | string>): void {
    const { value, x, y, width, height, theme, options, isHovered } = context;
    const typeOptions = options as AITypeOptions | undefined;
    const mode = typeOptions?.mode ?? 'enrichment';
    
    const padding = 8;
    
    // Handle string value (simple result)
    if (typeof value === 'string') {
      ctx.fillStyle = '#1f2937';
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      
      let displayText = value;
      const maxWidth = width - padding * 2;
      while (displayText.length > 0 && ctx.measureText(displayText).width > maxWidth) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== value) {
        displayText = displayText.slice(0, -1) + '…';
      }
      
      ctx.fillText(displayText, x + padding, y + height / 2);
      return;
    }
    
    // Handle AIValue object
    const aiValue = value as AIValue | undefined;
    const status = aiValue?.status ?? 'idle';
    
    switch (status) {
      case 'idle':
        renderIdleState(ctx, x, y, width, height, theme, mode, isHovered);
        break;
      case 'pending':
        renderPendingState(ctx, x, y, width, height, theme);
        break;
      case 'running':
        renderRunningState(ctx, x, y, width, height, theme, aiValue?.progress, typeOptions?.showProgress);
        break;
      case 'complete':
        renderCompleteState(ctx, x, y, width, height, theme, aiValue?.result);
        break;
      case 'error':
        renderErrorState(ctx, x, y, width, height, theme, aiValue?.error);
        break;
    }
  }
};

// ============================================================================
// Render Helpers
// ============================================================================

function renderIdleState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: any,
  mode: string,
  isHovered: boolean
): void {
  const padding = 8;
  
  if (mode === 'enrichment' && isHovered) {
    // Show "Enrich" button on hover
    const btnWidth = 70;
    const btnHeight = 24;
    const btnX = x + (width - btnWidth) / 2;
    const btnY = y + (height - btnHeight) / 2;
    
    // Button background
    const gradient = ctx.createLinearGradient(btnX, btnY, btnX + btnWidth, btnY + btnHeight);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(1, '#6366f1');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 4);
    else ctx.rect(btnX, btnY, btnWidth, btnHeight);
    ctx.fill();
    
    // Button text
    ctx.fillStyle = '#fff';
    ctx.font = `500 ${theme.fontSize - 1}px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText('✨ Enrich', btnX + btnWidth / 2, btnY + btnHeight / 2);
  } else {
    // Empty state
    ctx.fillStyle = '#d1d5db';
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('—', x + padding, y + height / 2);
  }
}

function renderPendingState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _width: number,
  height: number,
  theme: any
): void {
  const padding = 8;
  
  // Pulsing dot
  const dotSize = 8;
  const dotX = x + padding + dotSize / 2;
  const dotY = y + height / 2;
  
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotSize / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Text
  ctx.fillStyle = '#6b7280';
  ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('Pending...', x + padding + dotSize + 8, y + height / 2);
}

function renderRunningState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _width: number,
  height: number,
  theme: any,
  progress?: number,
  showProgress?: boolean
): void {
  const padding = 8;
  
  // Spinner (simplified)
  const spinnerSize = 14;
  const spinnerX = x + padding;
  const spinnerY = y + (height - spinnerSize) / 2;
  
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(spinnerX + spinnerSize / 2, spinnerY + spinnerSize / 2, spinnerSize / 2 - 2, 0, Math.PI * 1.5);
  ctx.stroke();
  
  // Progress or running text
  let text = 'Running...';
  if (showProgress && progress !== undefined) {
    text = `${progress}%`;
  }
  
  ctx.fillStyle = '#3b82f6';
  ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, spinnerX + spinnerSize + 8, y + height / 2);
}

function renderCompleteState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  theme: any,
  result?: string
): void {
  const padding = 8;
  const maxWidth = width - padding * 2;
  
  if (!result) {
    ctx.fillStyle = '#22c55e';
    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('✓ Complete', x + padding, y + height / 2);
    return;
  }
  
  // Truncate result
  ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
  let displayText = result;
  while (displayText.length > 0 && ctx.measureText(displayText).width > maxWidth) {
    displayText = displayText.slice(0, -1);
  }
  if (displayText !== result) {
    displayText = displayText.slice(0, -1) + '…';
  }
  
  ctx.fillStyle = '#1f2937';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(displayText, x + padding, y + height / 2);
}

function renderErrorState(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _width: number,
  height: number,
  theme: any,
  error?: string
): void {
  const padding = 8;
  
  // Error icon
  ctx.fillStyle = '#ef4444';
  ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('⚠️ ' + (error ?? 'Error'), x + padding, y + height / 2);
}

