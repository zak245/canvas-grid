import type { CanvasCellRenderer, CellRenderContext, EntityValue, EntityTypeOptions } from '../types';

// ============================================================================
// Image Cache (simple in-memory cache)
// ============================================================================

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(url: string): HTMLImageElement | null {
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }
  
  // Start loading
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  
  img.onload = () => {
    imageCache.set(url, img);
  };
  
  return null; // Not loaded yet
}

// ============================================================================
// Entity Cell Renderer (Canvas)
// ============================================================================

export const entityCellRenderer: CanvasCellRenderer<EntityValue> = {
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<EntityValue>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as EntityTypeOptions | undefined;
    
    if (!value) return;
    
    const showImage = typeOptions?.showImage ?? true;
    const showSubtitle = typeOptions?.showSubtitle ?? true;
    const imageShape = typeOptions?.imageShape ?? 'circle';
    const imageSize = typeOptions?.imageSize ?? 28;
    
    const padding = 8;
    let currentX = x + padding;
    const centerY = y + height / 2;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    // Draw image/avatar
    if (showImage) {
      const imageX = currentX;
      const imageY = centerY - imageSize / 2;
      
      if (value.image) {
        const img = loadImage(value.image);
        
        if (img) {
          ctx.save();
          ctx.beginPath();
          
          if (imageShape === 'circle') {
            ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
          } else if (imageShape === 'rounded') {
            if (ctx.roundRect) ctx.roundRect(imageX, imageY, imageSize, imageSize, 4);
            else ctx.rect(imageX, imageY, imageSize, imageSize);
          } else {
            ctx.rect(imageX, imageY, imageSize, imageSize);
          }
          
          ctx.clip();
          ctx.drawImage(img, imageX, imageY, imageSize, imageSize);
          ctx.restore();
          
          // Border
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (imageShape === 'circle') {
            ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
          } else if (imageShape === 'rounded') {
            if (ctx.roundRect) ctx.roundRect(imageX, imageY, imageSize, imageSize, 4);
            else ctx.rect(imageX, imageY, imageSize, imageSize);
          } else {
            ctx.rect(imageX, imageY, imageSize, imageSize);
          }
          ctx.stroke();
        } else {
          // Loading placeholder
          ctx.fillStyle = '#f3f4f6';
          ctx.beginPath();
          if (imageShape === 'circle') {
            ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
          } else {
            if (ctx.roundRect) ctx.roundRect(imageX, imageY, imageSize, imageSize, imageShape === 'rounded' ? 4 : 0);
            else ctx.rect(imageX, imageY, imageSize, imageSize);
          }
          ctx.fill();
        }
      } else if (value.icon || value.color) {
        // Icon/color placeholder
        const bgColor = value.color ?? '#6b7280';
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (imageShape === 'circle') {
          ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
        } else {
          if (ctx.roundRect) ctx.roundRect(imageX, imageY, imageSize, imageSize, imageShape === 'rounded' ? 4 : 0);
          else ctx.rect(imageX, imageY, imageSize, imageSize);
        }
        ctx.fill();
        
        // Initial letter
        const initial = value.name.charAt(0).toUpperCase();
        ctx.fillStyle = '#fff';
        ctx.font = `600 ${imageSize * 0.5}px ${theme.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(initial, imageX + imageSize / 2, imageY + imageSize / 2);
      } else {
        // Default placeholder
        ctx.fillStyle = '#e5e7eb';
        ctx.beginPath();
        if (imageShape === 'circle') {
          ctx.arc(imageX + imageSize / 2, imageY + imageSize / 2, imageSize / 2, 0, Math.PI * 2);
        } else {
          if (ctx.roundRect) ctx.roundRect(imageX, imageY, imageSize, imageSize, imageShape === 'rounded' ? 4 : 0);
          else ctx.rect(imageX, imageY, imageSize, imageSize);
        }
        ctx.fill();
        
        // Initial letter
        const initial = value.name.charAt(0).toUpperCase();
        ctx.fillStyle = '#9ca3af';
        ctx.font = `600 ${imageSize * 0.5}px ${theme.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(initial, imageX + imageSize / 2, imageY + imageSize / 2);
      }
      
      currentX += imageSize + 8;
    }
    
    // Text area
    const textX = currentX;
    const maxTextWidth = width - (currentX - x) - padding;
    
    // Draw name
    ctx.fillStyle = hasError ? '#dc2626' : '#1f2937';
    ctx.font = `500 ${theme.fontSize}px ${theme.fontFamily}`;
    ctx.textBaseline = showSubtitle && value.subtitle ? 'bottom' : 'middle';
    ctx.textAlign = 'left';
    
    let displayName = value.name;
    const nameWidth = ctx.measureText(displayName).width;
    if (nameWidth > maxTextWidth) {
      // Truncate
      while (displayName.length > 0 && ctx.measureText(displayName + '…').width > maxTextWidth) {
        displayName = displayName.slice(0, -1);
      }
      displayName += '…';
    }
    
    const nameY = showSubtitle && value.subtitle ? centerY - 2 : centerY;
    ctx.fillText(displayName, textX, nameY);
    
    // Draw subtitle
    if (showSubtitle && value.subtitle) {
      ctx.fillStyle = '#6b7280';
      ctx.font = `${theme.fontSize - 2}px ${theme.fontFamily}`;
      ctx.textBaseline = 'top';
      
      let displaySubtitle = value.subtitle;
      const subtitleWidth = ctx.measureText(displaySubtitle).width;
      if (subtitleWidth > maxTextWidth) {
        while (displaySubtitle.length > 0 && ctx.measureText(displaySubtitle + '…').width > maxTextWidth) {
          displaySubtitle = displaySubtitle.slice(0, -1);
        }
        displaySubtitle += '…';
      }
      
      ctx.fillText(displaySubtitle, textX, centerY + 2);
    }
  }
};

