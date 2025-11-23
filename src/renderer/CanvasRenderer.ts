import { GridEngine } from '../engine/GridEngine';
import { GridTheme } from '../types/grid';
import { CellFormatter } from '../utils/CellFormatter';

export class CanvasRenderer {
    private engine: GridEngine;
    private ctx: CanvasRenderingContext2D;
    private dpr: number;

    constructor(engine: GridEngine, ctx: CanvasRenderingContext2D) {
        this.engine = engine;
        this.ctx = ctx;
        this.dpr = window.devicePixelRatio || 1;
    }

    render() {
        const { ctx, dpr, engine } = this;
        const { width, height, scrollTop, scrollLeft } = engine.viewport.getState();
        const { theme } = engine;

        // 1. Setup
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // 2. Calculate Visible Range
        const allRows = engine.model.getAllRows();
        const visibleRange = engine.viewport.calculateVisibleRange(
            allRows,
            engine.model.getVisibleColumns()
        );

        const { visibleRows, visibleColumns, rowStartIndex, colStartIndex } = visibleRange;

        // 3. Draw Data Grid (scrolled content)
        ctx.save();
        // Translate for data rows: move up by headerHeight + scrollTop
        ctx.translate(-scrollLeft + theme.rowHeaderWidth, -scrollTop + theme.headerHeight);

        // Draw Rows
        let y = rowStartIndex * theme.rowHeight;
        for (const row of visibleRows) {
            // Draw Cells
            let x = 0;

            // Calculate x offset for visible columns
            for (let i = 0; i < colStartIndex; i++) {
                x += engine.model.getVisibleColumns()[i]?.width || 0;
            }

            for (const col of visibleColumns) {
                const cell = row.cells.get(col.id);

                // Border
                ctx.strokeStyle = theme.gridLineColor;
                ctx.strokeRect(x, y, col.width, theme.rowHeight);

                // Error indication - red background tint for type mismatches
                if (cell?.error) {
                    ctx.fillStyle = 'rgba(254, 226, 226, 0.5)'; // Light red tint
                    ctx.fillRect(x, y, col.width, theme.rowHeight);

                    // Red border for error cells
                    ctx.strokeStyle = '#ef4444'; // Red-500
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, col.width - 2, theme.rowHeight - 2);
                    ctx.lineWidth = 1; // Reset
                }

                // Text - format using CellFormatter
                const displayValue = CellFormatter.format(cell, col, col.width - 16);

                if (displayValue) {
                    ctx.fillStyle = cell?.error ? '#dc2626' : (cell?.style?.color || '#000'); // Red text for errors
                    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = cell?.style?.align || 'left';

                    const textX = cell?.style?.align === 'right'
                        ? x + col.width - 8
                        : (cell?.style?.align === 'center'
                            ? x + col.width / 2
                            : x + 8);

                    ctx.fillText(displayValue, textX, y + theme.rowHeight / 2);
                }

                x += col.width;
            }
            y += theme.rowHeight;
        }

        // NEW: Draw "+ Add Row" Button at bottom
        const totalRows = engine.model.getRowCount();
        if (rowStartIndex + visibleRows.length >= totalRows) {
            const totalWidth = engine.model.getVisibleColumns().reduce((acc, col) => acc + col.width, 0);
            const addRowY = totalRows * theme.rowHeight;
            
            // Only draw if visible
            if (addRowY < scrollTop + height) {
                // Background
                ctx.fillStyle = '#f9fafb'; // Gray-50
                ctx.fillRect(0, addRowY, totalWidth, theme.rowHeight);
                
                // Border
                ctx.strokeStyle = theme.gridLineColor;
                ctx.strokeRect(0, addRowY, totalWidth, theme.rowHeight);
                
                // Text
                ctx.fillStyle = '#6b7280'; // Gray-500
                ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
                ctx.textAlign = 'left';
                ctx.fillText('+ Add Row', 12, addRowY + theme.rowHeight / 2);
            }
        }

        ctx.restore();

        // 4. Draw Selection (with header offset)
        const selection = engine.store.getState().selection;
        if (selection) {
            ctx.save();
            ctx.translate(theme.rowHeaderWidth - scrollLeft, theme.headerHeight - scrollTop);

            const cols = engine.model.getVisibleColumns();
            const allCols = engine.model.getColumns();

            for (const range of selection.ranges) {
                // Calculate visual range bounds
                let rangeStartX = -1;
                let rangeEndX = -1;
                
                let currentX = 0;
                for (const col of cols) {
                    const trueIndex = allCols.findIndex(c => c.id === col.id);
                    
                    // Check if this visible column is inside the selection range
                    if (trueIndex >= range.start.col && trueIndex <= range.end.col) {
                        if (rangeStartX === -1) rangeStartX = currentX;
                        rangeEndX = currentX + col.width;
                    }
                    
                    currentX += col.width;
                }
                
                if (rangeStartX !== -1) {
                    const startY = range.start.row * theme.rowHeight;
                    const width = rangeEndX - rangeStartX;
                    const height = (range.end.row - range.start.row + 1) * theme.rowHeight;

                    // Draw Selection Background
                    ctx.fillStyle = theme.selectionColor;
                    ctx.fillRect(rangeStartX, startY, width, height);

                    // Draw Selection Border
                    ctx.strokeStyle = theme.selectionBorderColor;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(rangeStartX, startY, width, height);

                    // Draw Fill Handle (Bottom Right of the visual range)
                    if (range === selection.ranges[selection.ranges.length - 1]) {
                        const handleSize = 6;
                        const handleX = rangeEndX - handleSize / 2;
                        const handleY = startY + height - handleSize / 2;

                        ctx.fillStyle = theme.selectionBorderColor;
                        ctx.fillRect(handleX, handleY, handleSize, handleSize);

                        // White border for handle
                        ctx.strokeStyle = '#ffffff';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(handleX, handleY, handleSize, handleSize);
                    }
                }
            }
            ctx.restore();
        }

        // 5. Draw Fill Range (if filling)
        const state = engine.store.getState();
        if (state.isFilling && state.fillRange && state.fillRange.ranges.length > 0) {
            const range = state.fillRange.ranges[0];

            ctx.save();
            // Apply same translate as selection
            ctx.translate(theme.rowHeaderWidth - scrollLeft, theme.headerHeight - scrollTop);

            const cols = engine.model.getVisibleColumns();
            const allCols = engine.model.getColumns();

            // Calculate visual range bounds
            let rangeStartX = -1;
            let rangeEndX = -1;
            
            let currentX = 0;
            for (const col of cols) {
                const trueIndex = allCols.findIndex(c => c.id === col.id);
                
                // Check if this visible column is inside the selection range
                if (trueIndex >= range.start.col && trueIndex <= range.end.col) {
                    if (rangeStartX === -1) rangeStartX = currentX;
                    rangeEndX = currentX + col.width;
                }
                
                currentX += col.width;
            }

            if (rangeStartX !== -1) {
                const startY = range.start.row * theme.rowHeight;
                const width = rangeEndX - rangeStartX;
                const height = (range.end.row - range.start.row + 1) * theme.rowHeight;

                // Draw dashed border
                ctx.strokeStyle = theme.selectionBorderColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                ctx.strokeRect(rangeStartX, startY, width, height);
            }

            ctx.restore();
        }

        // 6. Draw Canvas Headers (NEW)
        this.drawHeaders(ctx, engine);

        // 7. Draw Error Tooltip on hover
        this.drawErrorTooltip(ctx, engine);
    }

    private drawHeaders(ctx: CanvasRenderingContext2D, engine: GridEngine) {
        const { theme } = engine;
        const { scrollLeft, width } = engine.viewport.getState();
        const visibleColumns = engine.model.getVisibleColumns();
        const sortState = engine.model.getSortState();

        ctx.save();
        // Stick to top, scroll horizontally
        ctx.translate(theme.rowHeaderWidth - scrollLeft, 0);

        // Draw Reorder Visuals
        const reorderState = engine.store.getState().reorderState;
        
        let x = 0;
        for (let i = 0; i < visibleColumns.length; i++) {
            const col = visibleColumns[i];
            let drawX = x;
            let isDragged = false;

            if (reorderState) {
                const { colIndex, targetIndex } = reorderState;
                const draggedWidth = visibleColumns[colIndex].width;

                if (i === colIndex) {
                    isDragged = true;
                } else if (i > colIndex && i < targetIndex) {
                    // Shift Left (fill gap)
                    drawX -= draggedWidth;
                } else if (i < colIndex && i >= targetIndex) {
                    // Shift Right (make room)
                    drawX += draggedWidth;
                }
            }

            if (isDragged) {
                // Draw Empty Slot (Gap)
                ctx.fillStyle = '#f3f4f6'; // Gray-100
                ctx.fillRect(drawX, 0, col.width, theme.headerHeight);
                ctx.strokeStyle = '#e5e7eb'; // Gray-200 border
                ctx.strokeRect(drawX, 0, col.width, theme.headerHeight);
                // No text/icons
            } else {
                // Draw Column at shifted position
                // Background
                ctx.fillStyle = theme.headerBackgroundColor;
                ctx.fillRect(drawX, 0, col.width, theme.headerHeight);

                // Border
                ctx.strokeStyle = theme.borderColor;
                ctx.strokeRect(drawX, 0, col.width, theme.headerHeight);

                // Text
                ctx.fillStyle = theme.headerColor || '#374151';
                ctx.font = `${theme.headerFontSize}px ${theme.headerFontFamily}`;
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                
                // Text Truncation
                const textPadding = 8;
                const iconSpace = 28;
                const availableWidth = col.width - (textPadding * 2) - iconSpace;
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(drawX + textPadding, 0, availableWidth, theme.headerHeight);
                ctx.clip();
                ctx.fillText(col.title, drawX + textPadding, theme.headerHeight / 2);
                ctx.restore();

                // Sort Icon OR Menu Trigger
                const sort = sortState.find(s => s.columnId === col.id);
                const iconX = drawX + col.width - 20;
                const iconY = theme.headerHeight / 2;

                // Check Hover
                const hoverPos = engine.store.getState().hoverPosition;
                let isHovered = false;
                if (hoverPos && hoverPos.y < theme.headerHeight) {
                    // Note: Mouse detection is on LOGICAL position (x), not visual (drawX)
                    // But for visual consistency, if I hover the *shifted* column, I expect the icon.
                    // However, MouseHandler uses logical position. 
                    // Syncing them perfectly is hard without sharing logic.
                    // For now, stick to logical hover check
                    const relativeHoverX = hoverPos.x - theme.rowHeaderWidth + scrollLeft;
                    if (relativeHoverX >= x && relativeHoverX < x + col.width) {
                        isHovered = true;
                    }
                }

                if (sort) {
                    // ... sort arrow ...
                    ctx.beginPath();
                    ctx.fillStyle = '#2563eb';
                    if (sort.direction === 'asc') {
                        ctx.moveTo(iconX, iconY + 3);
                        ctx.lineTo(iconX + 4, iconY - 3);
                        ctx.lineTo(iconX + 8, iconY + 3);
                    } else {
                        ctx.moveTo(iconX, iconY - 3);
                        ctx.lineTo(iconX + 4, iconY + 3);
                        ctx.lineTo(iconX + 8, iconY - 3);
                    }
                    ctx.fill();
                } else if (isHovered) {
                    // ... chevron ...
                    ctx.beginPath();
                    ctx.strokeStyle = '#9ca3af';
                    ctx.lineWidth = 1.5;
                    ctx.moveTo(iconX, iconY - 2);
                    ctx.lineTo(iconX + 4, iconY + 2);
                    ctx.lineTo(iconX + 8, iconY - 2);
                    ctx.stroke();
                }
            }

            x += col.width;
        }

        // Ghost Column (+)
        // Draw at 'x' which is now at the end of visible columns
        const ghostWidth = 50;
        ctx.fillStyle = '#f9fafb'; // Gray-50
        ctx.fillRect(x, 0, ghostWidth, theme.headerHeight);
        
        ctx.strokeStyle = theme.borderColor;
        ctx.strokeRect(x, 0, ghostWidth, theme.headerHeight);
        
        // Draw "+"
        ctx.strokeStyle = '#9ca3af'; // Gray-400
        ctx.lineWidth = 2;
        ctx.beginPath();
        const centerX = x + ghostWidth / 2;
        const centerY = theme.headerHeight / 2;
        // Horizontal line
        ctx.moveTo(centerX - 5, centerY);
        ctx.lineTo(centerX + 5, centerY);
        // Vertical line
        ctx.moveTo(centerX, centerY - 5);
        ctx.lineTo(centerX, centerY + 5);
        ctx.stroke();

        // Draw Ghost Header (Overlay)
        if (reorderState) {
            const draggedCol = visibleColumns[reorderState.colIndex];
            if (draggedCol) {
                // Center ghost on mouse
                const ghostX = reorderState.dragX - theme.rowHeaderWidth + scrollLeft - (draggedCol.width / 2);
                
                ctx.save();
                // Enhanced Shadow for "lifting" effect
                ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = 15;
                ctx.shadowOffsetY = 5;
                
                // Background (slightly transparent to see grid below if needed, but opaque is cleaner)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.fillRect(ghostX, 0, draggedCol.width, theme.headerHeight);
                
                // Border (Blue to indicate active state)
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.strokeRect(ghostX, 0, draggedCol.width, theme.headerHeight);
                
                // Text
                ctx.fillStyle = theme.headerColor || '#374151';
                ctx.font = `${theme.headerFontSize}px ${theme.headerFontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                // Clip text
                ctx.beginPath();
                ctx.rect(ghostX + 8, 0, draggedCol.width - 16, theme.headerHeight);
                ctx.clip();
                ctx.fillText(draggedCol.title, ghostX + 8, theme.headerHeight / 2);
                
                ctx.restore();
            }
        }

        ctx.restore();
    }

    private drawErrorTooltip(ctx: CanvasRenderingContext2D, engine: typeof this.engine) {
        const { hoverPosition } = engine.store.getState();
        if (!hoverPosition) return;

        const { theme } = engine;
        const { scrollTop, scrollLeft } = engine.viewport.getState();

        // Convert mouse position to grid cell
        const gridX = hoverPosition.x - theme.rowHeaderWidth + scrollLeft;
        const gridY = hoverPosition.y - theme.headerHeight + scrollTop;

        // Find which cell is being hovered
        const rowIndex = Math.floor(gridY / theme.rowHeight);
        const columns = engine.model.getVisibleColumns();

        let colIndex = -1;
        let xOffset = 0;
        for (let i = 0; i < columns.length; i++) {
            if (gridX >= xOffset && gridX < xOffset + columns[i].width) {
                colIndex = i;
                break;
            }
            xOffset += columns[i].width;
        }

        if (rowIndex < 0 || colIndex < 0) return;

        const row = engine.model.getRow(rowIndex);
        if (!row) return;

        const column = columns[colIndex];
        const cell = row.cells.get(column.id);

        // Only show tooltip for error cells
        if (!cell?.error || !cell.errorMessage) return;

        // Draw tooltip
        const padding = 8;
        const fontSize = 12;
        const text = `⚠️ ${cell.errorMessage}`;

        ctx.save();
        ctx.font = `${fontSize}px ${theme.fontFamily}`;
        const textWidth = ctx.measureText(text).width;

        // Position tooltip near mouse, but keep it on screen
        let tooltipX = hoverPosition.x + 10;
        let tooltipY = hoverPosition.y - 30;

        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = fontSize + padding * 2;

        // Keep tooltip on screen
        const canvas = ctx.canvas;
        if (tooltipX + tooltipWidth > canvas.width) {
            tooltipX = hoverPosition.x - tooltipWidth - 10;
        }
        if (tooltipY < 0) {
            tooltipY = hoverPosition.y + 20;
        }

        // Draw tooltip background (dark with slight transparency)
        ctx.fillStyle = 'rgba(51, 51, 51, 0.95)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;

        // Rounded rectangle
        const radius = 4;
        ctx.beginPath();
        ctx.moveTo(tooltipX + radius, tooltipY);
        ctx.lineTo(tooltipX + tooltipWidth - radius, tooltipY);
        ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY, tooltipX + tooltipWidth, tooltipY + radius);
        ctx.lineTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight - radius);
        ctx.quadraticCurveTo(tooltipX + tooltipWidth, tooltipY + tooltipHeight, tooltipX + tooltipWidth - radius, tooltipY + tooltipHeight);
        ctx.lineTo(tooltipX + radius, tooltipY + tooltipHeight);
        ctx.quadraticCurveTo(tooltipX, tooltipY + tooltipHeight, tooltipX, tooltipY + tooltipHeight - radius);
        ctx.lineTo(tooltipX, tooltipY + radius);
        ctx.quadraticCurveTo(tooltipX, tooltipY, tooltipX + radius, tooltipY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tooltipX + padding, tooltipY + tooltipHeight / 2);

        ctx.restore();
    }
}
