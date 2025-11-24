import { GridEngine } from '../engine/GridEngine';
import { CellFormatter } from '../utils/CellFormatter';
import { GridRow, GridColumn } from '../types/grid';

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

        const { visibleRows, visibleColumns, pinnedColumns, rowStartIndex, scrollableGridX } = visibleRange;

        // Calculate Frozen Width
        let frozenWidth = 0;
        for (const col of pinnedColumns) {
            frozenWidth += col.width;
        }

        // Helper to draw a set of columns
        const drawColumns = (columns: typeof visibleColumns, isScrollable: boolean) => {
        let y = rowStartIndex * theme.rowHeight;
        for (const row of visibleRows) {
                // Calculate initial X for this pass
                // If scrollable, startX is the calculated GridX of the first visible column
                // If frozen, startX is 0
                let x = isScrollable ? scrollableGridX : 0; 

                for (const col of columns) {
                const cell = row.cells.get(col.id);

                // Border
                ctx.strokeStyle = theme.gridLineColor;
                ctx.strokeRect(x, y, col.width, theme.rowHeight);

                    // Error indication
                if (cell?.error) {
                        ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
                    ctx.fillRect(x, y, col.width, theme.rowHeight);
                        ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x + 1, y + 1, col.width - 2, theme.rowHeight - 2);
                        ctx.lineWidth = 1;
                }

                    // Text
                const displayValue = CellFormatter.format(cell, col, col.width - 16);
                if (displayValue) {
                        ctx.fillStyle = cell?.error ? '#dc2626' : (cell?.style?.color || '#000');
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
        };

        // 3. Draw Scrollable Data Grid (Layer 1)
        if (visibleColumns.length > 0) {
            ctx.save();
            // Clip to right of frozen width
            ctx.beginPath();
            ctx.rect(theme.rowHeaderWidth + frozenWidth, theme.headerHeight, width - theme.rowHeaderWidth - frozenWidth, height - theme.headerHeight);
            ctx.clip();
            
            // Translate: Move up for header, and shift left by scrollLeft
            ctx.translate(-scrollLeft + theme.rowHeaderWidth, -scrollTop + theme.headerHeight);
            
            drawColumns(visibleColumns, true);
            
            // Draw "+ Add Row" Ghost Row (Scrollable part)
            this.drawAddRowGhost(ctx, engine, visibleRows, rowStartIndex, visibleColumns, true, scrollableGridX);

            ctx.restore();
        }

        // 4. Draw Frozen Data Grid (Layer 2 - Overlay)
        if (pinnedColumns.length > 0) {
            ctx.save();
            // Translate: No scrollLeft
            ctx.translate(theme.rowHeaderWidth, -scrollTop + theme.headerHeight);
            
            // Clear background for frozen columns to cover scrollable content
            const totalFrozenHeight = visibleRows.length * theme.rowHeight;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, rowStartIndex * theme.rowHeight, frozenWidth, totalFrozenHeight);
            
            drawColumns(pinnedColumns, false);
            
            // Draw "+ Add Row" Ghost Row (Frozen part)
            this.drawAddRowGhost(ctx, engine, visibleRows, rowStartIndex, pinnedColumns, false, 0);

            ctx.restore();
            
            // Draw Drop Shadow for Freeze Line (Gradient)
            ctx.save();
            ctx.translate(theme.rowHeaderWidth, theme.headerHeight);
            
            ctx.beginPath();
            ctx.moveTo(frozenWidth, 0);
            ctx.lineTo(frozenWidth, height - theme.headerHeight);
            ctx.strokeStyle = '#e5e7eb';
            ctx.stroke();
            
            const gradient = ctx.createLinearGradient(frozenWidth, 0, frozenWidth + 6, 0);
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(frozenWidth, 0, 6, height - theme.headerHeight);

        ctx.restore();
        }

        // 5. Draw Selection
        this.drawSelection(ctx, engine, frozenWidth);

        // 6. Draw Fill Range
        // this.drawFillRange(ctx, engine, frozenWidth); // TODO: Update fill range too

        // 7. Draw Canvas Headers (NEW)
        this.drawHeaders(ctx, engine, frozenWidth);

        // 8. Draw Error Tooltip
        this.drawErrorTooltip(ctx, engine);
    }

    // Helper for Add Row Ghost
    private drawAddRowGhost(
        ctx: CanvasRenderingContext2D, 
        engine: GridEngine, 
        visibleRows: GridRow[], 
        rowStartIndex: number,
        columns: GridColumn[],
        isScrollable: boolean,
        startX: number
    ) {
        const { theme } = engine;
        const { scrollTop, height, scrollLeft } = engine.viewport.getState();
        const totalRows = engine.model.getRowCount();
        
        if (rowStartIndex + visibleRows.length >= totalRows) {
            const addRowY = totalRows * theme.rowHeight;
            if (addRowY < scrollTop + height) {
                let x = startX;
                
                for (const col of columns) {
                    ctx.fillStyle = '#f9fafb'; 
                    ctx.fillRect(x, addRowY, col.width, theme.rowHeight);
                    ctx.strokeStyle = theme.gridLineColor;
                    ctx.strokeRect(x, addRowY, col.width, theme.rowHeight);
                    x += col.width;
                }
                
                const hasPinned = engine.model.getVisibleColumns().some(c => c.pinned);
                const shouldDrawText = (!isScrollable && hasPinned) || (isScrollable && !hasPinned);
                
                if (shouldDrawText) {
                    ctx.fillStyle = '#6b7280';
                    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    
                    const textX = isScrollable ? 12 + scrollLeft : 12;
                    ctx.fillText('+ Add Row', textX, addRowY + theme.rowHeight / 2);
                }
            }
        }
    }
    
    // New Draw Selection Method to handle split
    private drawSelection(ctx: CanvasRenderingContext2D, engine: GridEngine, frozenWidth: number) {
        const selection = engine.store.getState().selection;
        if (!selection) return;
        
        const { theme } = engine;
        const { scrollLeft, scrollTop, width, height } = engine.viewport.getState();
        
        const drawSelectionPart = (isScrollable: boolean) => {
            ctx.save();
            
            if (isScrollable) {
                ctx.beginPath();
                ctx.rect(theme.rowHeaderWidth + frozenWidth, theme.headerHeight, width - theme.rowHeaderWidth - frozenWidth, height - theme.headerHeight);
                ctx.clip();
            ctx.translate(theme.rowHeaderWidth - scrollLeft, theme.headerHeight - scrollTop);
            } else {
                // Frozen
                ctx.beginPath();
                ctx.rect(theme.rowHeaderWidth, theme.headerHeight, frozenWidth, height - theme.headerHeight);
                ctx.clip();
                ctx.translate(theme.rowHeaderWidth, theme.headerHeight - scrollTop);
            }

            const visibleCols = engine.model.getVisibleColumns(); // All visible

            for (const range of selection.ranges) {
                let rangeStartX = -1;
                let rangeEndX = -1;
                
                let currentX = 0;
                for (const col of visibleCols) {
                    const belongsToLayer = isScrollable ? !col.pinned : col.pinned;
                    const trueIndex = engine.model.getColumns().findIndex(c => c.id === col.id);
                    
                    if (trueIndex >= range.start.col && trueIndex <= range.end.col) {
                        if (belongsToLayer) {
                            if (rangeStartX === -1) rangeStartX = currentX;
                            rangeEndX = currentX + col.width;
                        }
                    }
                    
                    currentX += col.width;
                }
                
                if (rangeStartX !== -1) {
                    const startY = range.start.row * theme.rowHeight;
                    const selWidth = rangeEndX - rangeStartX;
                    const selHeight = (range.end.row - range.start.row + 1) * theme.rowHeight;

                ctx.fillStyle = theme.selectionColor;
                    ctx.fillRect(rangeStartX, startY, selWidth, selHeight);

                ctx.strokeStyle = theme.selectionBorderColor;
                ctx.lineWidth = 2;
                    ctx.strokeRect(rangeStartX, startY, selWidth, selHeight);
                }
            }
            ctx.restore();
        };
        
        drawSelectionPart(true);
        drawSelectionPart(false);
    }

    private drawIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number, color: string) {
        ctx.save();
        ctx.translate(x, y);
        const scale = size / 24;
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        ctx.beginPath();
        
        if (icon === 'play') {
            ctx.moveTo(8, 5);
            ctx.lineTo(19, 12);
            ctx.lineTo(8, 19);
            ctx.fill();
        } else if (icon === 'sparkles' || icon === 'ai') {
            ctx.moveTo(12, 1);
            ctx.quadraticCurveTo(15, 9, 23, 12);
            ctx.quadraticCurveTo(15, 15, 12, 23);
            ctx.quadraticCurveTo(9, 15, 1, 12);
            ctx.quadraticCurveTo(9, 9, 12, 1);
            ctx.fill();
            ctx.moveTo(18, 2);
            ctx.lineTo(19, 5);
            ctx.lineTo(22, 6);
            ctx.lineTo(19, 7);
            ctx.lineTo(18, 10);
            ctx.lineTo(17, 7);
            ctx.lineTo(14, 6);
            ctx.lineTo(17, 5);
            ctx.fill();
        } else if (icon === 'refresh') {
            ctx.arc(12, 12, 6, 0, Math.PI * 1.5);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(12, 6);
            ctx.lineTo(18, 6);
            ctx.lineTo(15, 3);
            ctx.fill();
        } else if (icon === 'settings') {
            ctx.arc(12, 12, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.arc(12, 12, 7, 0, Math.PI * 2);
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (icon === 'text') {
            ctx.fillRect(4, 6, 16, 2);
            ctx.fillRect(4, 11, 12, 2);
            ctx.fillRect(4, 16, 10, 2);
        } else if (icon === 'number') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(9, 4); ctx.lineTo(9, 20);
            ctx.moveTo(15, 4); ctx.lineTo(15, 20);
            ctx.moveTo(5, 9); ctx.lineTo(19, 9);
            ctx.moveTo(5, 15); ctx.lineTo(19, 15);
            ctx.stroke();
        } else if (icon === 'date') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 6, 16, 14);
            ctx.beginPath();
            ctx.moveTo(8, 3); ctx.lineTo(8, 7);
            ctx.moveTo(16, 3); ctx.lineTo(16, 7);
            ctx.moveTo(4, 10); ctx.lineTo(20, 10);
            ctx.stroke();
        } else if (icon === 'boolean') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(4, 4, 16, 16);
            ctx.beginPath();
            ctx.moveTo(8, 12); ctx.lineTo(11, 15); ctx.lineTo(16, 9);
            ctx.stroke();
        } else if (icon === 'email') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.strokeRect(3, 6, 18, 12);
            ctx.beginPath();
            ctx.moveTo(3, 6); ctx.lineTo(12, 13); ctx.lineTo(21, 6);
            ctx.stroke();
        } else if (icon === 'url') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(9, 12, 4, 0.5 * Math.PI, 1.5 * Math.PI);
            ctx.moveTo(9, 8); ctx.lineTo(15, 8);
            ctx.moveTo(9, 16); ctx.lineTo(15, 16);
            ctx.arc(15, 12, 4, 1.5 * Math.PI, 0.5 * Math.PI);
            ctx.stroke();
        } else if (icon === 'select') {
            ctx.fillRect(4, 6, 16, 2);
            ctx.fillRect(4, 11, 16, 2);
            ctx.fillRect(4, 16, 16, 2);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(18, 16); ctx.lineTo(21, 16); ctx.lineTo(19.5, 19);
            ctx.fill();
        }
        
        ctx.restore();
    }

    private drawHeaders(ctx: CanvasRenderingContext2D, engine: GridEngine, frozenWidth: number) {
        const { theme } = engine;
        const { scrollLeft, width } = engine.viewport.getState();
        const visibleColumns = engine.model.getVisibleColumns();
        const sortState = engine.model.getSortState();
        const reorderState = engine.store.getState().reorderState;

        let visualCols = [...visibleColumns];
        if (reorderState) {
            const { colIndex, targetIndex } = reorderState;
            if (colIndex >= 0 && colIndex < visualCols.length && targetIndex >= 0 && targetIndex <= visualCols.length) {
                const [item] = visualCols.splice(colIndex, 1);
                visualCols.splice(targetIndex, 0, item);
            }
        }

        const visualPinned = visualCols.filter(c => c.pinned);
        const visualScrollable = visualCols.filter(c => !c.pinned);

        const drawHeaderList = (columns: GridColumn[], isScrollable: boolean) => {
            let x = isScrollable ? frozenWidth : 0;
            
            for (const visualCol of columns) {
                // OPTIMIZATION: Check visibility
                const screenX = isScrollable 
                    ? x - scrollLeft + theme.rowHeaderWidth 
                    : x + theme.rowHeaderWidth;
                
                const screenRight = screenX + visualCol.width;

                if (screenRight < theme.rowHeaderWidth || screenX > width) {
                    x += visualCol.width;
                    continue;
                }

                const isGhost = reorderState && visualCol.id === visibleColumns[reorderState.colIndex].id;

                // Background
                ctx.fillStyle = theme.headerBackgroundColor;
                ctx.fillRect(x, 0, visualCol.width, theme.headerHeight);

                // Border
                ctx.strokeStyle = theme.borderColor;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, 0, visualCol.width, theme.headerHeight);

                if (!isGhost) {
                    ctx.fillStyle = theme.headerColor || '#374151';
                    ctx.font = `600 ${theme.headerFontSize || theme.fontSize}px ${theme.headerFontFamily || theme.fontFamily}`;
                    ctx.textBaseline = 'middle';
                    ctx.textAlign = 'left';
                    
                    const hasAction = !!visualCol.headerAction;
                    const textPadding = 8;
                    const menuIconSpace = 28;
                    const actionIconSpace = hasAction ? 24 : 0;
                    const typeIconSpace = 20;
                    const availableWidth = visualCol.width - (textPadding * 2) - menuIconSpace - actionIconSpace - typeIconSpace;

            ctx.save();
                    ctx.beginPath();
                    ctx.rect(x + textPadding, 0, Math.max(0, availableWidth + typeIconSpace), theme.headerHeight);
                    ctx.clip();
                    
                    this.drawIcon(ctx, visualCol.type || 'text', x + textPadding, theme.headerHeight / 2 - 7, 14, '#9ca3af');
                    ctx.fillText(visualCol.title, x + textPadding + typeIconSpace, theme.headerHeight / 2);
                    ctx.restore();

                    if (!reorderState) {
                        if (hasAction && visualCol.headerAction) {
                            const actionX = x + visualCol.width - 48;
                            const actionY = theme.headerHeight / 2 - 8;
                            const hoverPos = engine.store.getState().hoverPosition;
                            let isActionHovered = false;
                            if (hoverPos && hoverPos.y < theme.headerHeight) {
                                 const relativeHoverX = isScrollable 
                                    ? hoverPos.x - theme.rowHeaderWidth + scrollLeft 
                                    : hoverPos.x - theme.rowHeaderWidth;
                                 if (relativeHoverX >= actionX - 2 && relativeHoverX < actionX + 18) isActionHovered = true;
                            }
                            this.drawIcon(ctx, visualCol.headerAction.icon, actionX, actionY, 16, isActionHovered ? '#3b82f6' : '#6b7280');
                        }

                        const sort = sortState.find(s => s.columnId === visualCol.id);
                        const iconX = x + visualCol.width - 20;
                        const iconY = theme.headerHeight / 2;
                        const hoverPos = engine.store.getState().hoverPosition;
                        let isHovered = false;
                        if (hoverPos && hoverPos.y < theme.headerHeight) {
                             const relativeHoverX = isScrollable 
                                ? hoverPos.x - theme.rowHeaderWidth + scrollLeft 
                                : hoverPos.x - theme.rowHeaderWidth;
                             if (relativeHoverX >= x && relativeHoverX < x + visualCol.width) isHovered = true;
                        }
                        
                        const activeHeaderMenu = engine.store.getState().activeHeaderMenu;
                        const isMenuOpen = activeHeaderMenu?.colId === visualCol.id;

                        if (sort) {
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
                        } else if (isHovered || isMenuOpen) {
                            ctx.beginPath();
                            ctx.strokeStyle = '#9ca3af';
                            ctx.lineWidth = 1.5;
                            ctx.moveTo(iconX, iconY - 2);
                            ctx.lineTo(iconX + 4, iconY + 2);
                            ctx.lineTo(iconX + 8, iconY - 2);
                            ctx.stroke();
                        }
                    }
                }
                x += visualCol.width;
            }
        };

        ctx.save();
        ctx.beginPath();
        ctx.rect(theme.rowHeaderWidth + frozenWidth, 0, width - theme.rowHeaderWidth - frozenWidth, theme.headerHeight);
        ctx.clip();
        ctx.translate(theme.rowHeaderWidth - scrollLeft, 0);
        
        const totalVisibleWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) + 100;
        ctx.fillStyle = theme.headerBackgroundColor;
        ctx.fillRect(frozenWidth, 0, totalVisibleWidth - frozenWidth, theme.headerHeight);
        
        ctx.strokeStyle = theme.borderColor;
        ctx.beginPath();
        ctx.moveTo(frozenWidth, theme.headerHeight);
        ctx.lineTo(totalVisibleWidth, theme.headerHeight);
        ctx.stroke();
        
        drawHeaderList(visualScrollable, true);
        
        let ghostX = frozenWidth;
        for(const c of visualScrollable) ghostX += c.width;
        
        const ghostWidth = 50;
        ctx.fillStyle = '#f9fafb'; 
        ctx.fillRect(ghostX, 0, ghostWidth, theme.headerHeight);
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(ghostX, 0, ghostWidth, theme.headerHeight);
        
        ctx.strokeStyle = '#9ca3af'; 
        ctx.lineWidth = 2;
        ctx.beginPath();
        const centerX = ghostX + ghostWidth / 2;
        const centerY = theme.headerHeight / 2;
        ctx.moveTo(centerX - 5, centerY);
        ctx.lineTo(centerX + 5, centerY);
        ctx.moveTo(centerX, centerY - 5);
        ctx.lineTo(centerX, centerY + 5);
        ctx.stroke();

        ctx.restore();

        if (visualPinned.length > 0) {
            ctx.save();
            ctx.translate(theme.rowHeaderWidth, 0);
            
            ctx.fillStyle = theme.headerBackgroundColor;
            ctx.fillRect(0, 0, frozenWidth, theme.headerHeight);
            
            ctx.strokeStyle = theme.borderColor;
            ctx.beginPath();
            ctx.moveTo(0, theme.headerHeight);
            ctx.lineTo(frozenWidth, theme.headerHeight);
            ctx.stroke();
            
            drawHeaderList(visualPinned, false);
            
            ctx.beginPath();
            ctx.moveTo(frozenWidth - 0.5, 0);
            ctx.lineTo(frozenWidth - 0.5, theme.headerHeight);
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            ctx.restore();
            
            // Header shadow (Gradient)
            ctx.save();
            ctx.translate(theme.rowHeaderWidth, 0);
            const hGradient = ctx.createLinearGradient(frozenWidth, 0, frozenWidth + 6, 0);
            hGradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
            hGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = hGradient;
            ctx.fillRect(frozenWidth, 0, 6, theme.headerHeight);
            ctx.restore();
        }

        if (reorderState) {
            const draggedCol = visibleColumns[reorderState.colIndex];
            if (draggedCol) {
                const dragOffset = reorderState.dragOffset || 0;
                const ghostX = reorderState.dragX - dragOffset;
                const ghostY = 6;
                
                ctx.save();
                ctx.resetTransform();
                ctx.scale(this.dpr, this.dpr);
                
                ctx.font = `600 ${theme.headerFontSize || theme.fontSize}px ${theme.headerFontFamily || theme.fontFamily}`;
                const textWidth = ctx.measureText(draggedCol.title).width;
                const padding = 16;
                const pillWidth = textWidth + padding * 2;
                const pillHeight = theme.headerHeight - 12;
                
                ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetY = 2;
                
                const r = 6;
                ctx.beginPath();
                ctx.moveTo(ghostX + r, ghostY);
                ctx.lineTo(ghostX + pillWidth - r, ghostY);
                ctx.quadraticCurveTo(ghostX + pillWidth, ghostY, ghostX + pillWidth, ghostY + r);
                ctx.lineTo(ghostX + pillWidth, ghostY + pillHeight - r);
                ctx.quadraticCurveTo(ghostX + pillWidth, ghostY + pillHeight, ghostX + pillWidth - r, ghostY + pillHeight);
                ctx.lineTo(ghostX + r, ghostY + pillHeight);
                ctx.quadraticCurveTo(ghostX, ghostY + pillHeight, ghostX, ghostY + pillHeight - r);
                ctx.lineTo(ghostX, ghostY + r);
                ctx.quadraticCurveTo(ghostX, ghostY, ghostX + r, ghostY);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(draggedCol.title, ghostX + pillWidth / 2, ghostY + pillHeight / 2);
                
                ctx.restore();
            }
        }
    }

    private drawErrorTooltip(ctx: CanvasRenderingContext2D, engine: typeof this.engine) {
        const { hoverPosition } = engine.store.getState();
        if (!hoverPosition) return;

        const { theme } = engine;
        const { scrollTop, scrollLeft } = engine.viewport.getState();

        const gridX = hoverPosition.x - theme.rowHeaderWidth + scrollLeft;
        const gridY = hoverPosition.y - theme.headerHeight + scrollTop;

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

        if (!cell?.error || !cell.errorMessage) return;

        const padding = 8;
        const fontSize = 12;
        const text = `⚠️ ${cell.errorMessage}`;

        ctx.save();
        ctx.font = `${fontSize}px ${theme.fontFamily}`;
        const textWidth = ctx.measureText(text).width;

        let tooltipX = hoverPosition.x + 10;
        let tooltipY = hoverPosition.y - 30;

        const tooltipWidth = textWidth + padding * 2;
        const tooltipHeight = fontSize + padding * 2;

        const canvas = ctx.canvas;
        if (tooltipX + tooltipWidth > canvas.width) {
            tooltipX = hoverPosition.x - tooltipWidth - 10;
        }
        if (tooltipY < 0) {
            tooltipY = hoverPosition.y + 20;
        }

        ctx.fillStyle = 'rgba(51, 51, 51, 0.95)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;

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

        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, tooltipX + padding, tooltipY + tooltipHeight / 2);

        ctx.restore();
    }
}