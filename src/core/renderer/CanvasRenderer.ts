import { GridEngine } from '../engine/GridEngine';
import { GridRow, GridColumn } from '../types/grid';
import { BaseRenderer } from './types';
import { cellTypeRegistry } from '../cell-types/registry';
import type { CellRenderContext, CellTypeName } from '../cell-types/types';

/**
 * CanvasRenderer - High-performance canvas-based grid renderer
 * 
 * Implements the GridRenderer interface via BaseRenderer for pluggable rendering.
 * Optimized for 60fps rendering with 10K+ rows.
 */
export class CanvasRenderer extends BaseRenderer {
    private ctx: CanvasRenderingContext2D | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private dpr: number = window.devicePixelRatio || 1;

    constructor(engine: GridEngine, ctx: CanvasRenderingContext2D) {
        super(engine);
        this.ctx = ctx;
        this.canvas = ctx.canvas;
    }

    // ===== GridRenderer Interface Implementation =====

    /**
     * Attach the renderer to a container element
     */
    attach(container: HTMLElement): void {
        this.container = container;
        
        // Create canvas if not already created
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.style.display = 'block';
            this.canvas.style.width = '100%';
            this.canvas.style.height = '100%';
            container.appendChild(this.canvas);
        }
        
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.updateCanvasSize();
    }

    /**
     * Detach the renderer and clean up
     */
    detach(): void {
        if (this.canvas && this.container) {
            this.container.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.container = null;
        // engine is managed by BaseRenderer
    }

    /**
     * Get the canvas element (for input handling)
     */
    getElement(): HTMLElement | null {
        return this.canvas;
    }

    /**
     * Set the device pixel ratio
     */
    setPixelRatio(ratio: number): void {
        this.dpr = ratio;
        this.updateCanvasSize();
    }

    /**
     * Force a full repaint
     */
    invalidate(): void {
        if (this.engine) {
            this.render();
        }
    }

    /**
     * Update canvas size based on container
     */
    private updateCanvasSize(): void {
        if (!this.canvas || !this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    // ===== Render Methods =====

    /**
     * Render the grid
     */
    render(): void {
        const { ctx, dpr, engine } = this;
        if (!ctx || !engine) return;

        const { width, height, scrollTop, scrollLeft } = engine.viewport.getState();
        const { theme } = engine;

        // 1. Setup
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // 2. Calculate Visible Range
        const allRows = engine.rows.getViewRows();
        // We sort here as a safeguard, though GridModel.getVisibleColumns() should be sorted.
        const allVisibleColumns = [...engine.model.getVisibleColumns()].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
        
        const visibleRange = engine.viewport.calculateVisibleRange(
            allRows,
            allVisibleColumns
        );

        const { visibleRows, visibleColumns, pinnedColumns, rowStartIndex, scrollableGridX } = visibleRange;

        // Calculate Frozen Width
        let frozenWidth = 0;
        for (const col of pinnedColumns) {
            frozenWidth += col.width;
        }

        // Helper to draw a set of columns using the cell type registry
        const drawColumns = (columns: typeof visibleColumns, isScrollable: boolean) => {
            const selection = engine.store.getState().selection;
            const editingCell = engine.store.getState().editingCell;
            const hoveredCell = engine.store.getState().hoveredCell;
            
            for (let rowIdx = 0; rowIdx < visibleRows.length; rowIdx++) {
                const row = visibleRows[rowIdx];
                const actualRowIndex = rowStartIndex + rowIdx;
                
                // Y position in grid space (before any transform)
                const gridY = actualRowIndex * theme.rowHeight;
                
                // Calculate initial X for this pass (in grid space)
                let gridX = isScrollable ? scrollableGridX : 0; 

                // Group Header Handling
                if (row.isGroupHeader) {
                    this.drawGroupHeader(ctx, row, gridY, columns, isScrollable, theme, gridX);
                    continue;
                }

                for (let colIdx = 0; colIdx < columns.length; colIdx++) {
                    const col = columns[colIdx];
                    const cell = row.cells.get(col.id);

                    // Border
                    ctx.strokeStyle = theme.gridLineColor;
                    ctx.strokeRect(gridX, gridY, col.width, theme.rowHeight);

                    // Error indication
                    if (cell?.error) {
                        ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
                        ctx.fillRect(gridX, gridY, col.width, theme.rowHeight);
                        ctx.strokeStyle = '#ef4444';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(gridX + 1, gridY + 1, col.width - 2, theme.rowHeight - 2);
                        ctx.lineWidth = 1;
                    }

                    // Get the cell definition and renderer from registry
                    const definition = cellTypeRegistry.getDefinition(col.type as CellTypeName);
                    const renderer = cellTypeRegistry.getRenderer(col.type as CellTypeName, 'canvas');
                    
                    // Build render context
                    const isSelected = selection?.ranges.some(range => 
                        actualRowIndex >= range.start.row && 
                        actualRowIndex <= range.end.row
                    ) ?? false;
                    
                    const isFocused = selection?.primary?.row === actualRowIndex && 
                        selection?.primary?.col === colIdx;
                    
                    const isEditing = editingCell?.row === actualRowIndex && 
                        editingCell?.col === colIdx;
                    
                    // Check if this cell is hovered using the centralized hoveredCell from MouseHandler
                    // hoveredCell.col is the true column index in the full column list
                    // We need to compare with this column's true index
                    const allColumns = engine.model.getColumns();
                    const trueColIndex = allColumns.findIndex(c => c.id === col.id);
                    const isHovered = hoveredCell !== null && 
                                     hoveredCell.row === actualRowIndex && 
                                     hoveredCell.col === trueColIndex;
                    
                    // Format value using definition
                    const displayValue = definition.format(cell?.value, col.typeOptions);
                    
                    const renderContext: CellRenderContext = {
                        value: cell?.value,
                        displayValue,
                        x: gridX,
                        y: gridY,
                        width: col.width,
                        height: theme.rowHeight,
                        isSelected,
                        isFocused: isFocused ?? false,
                        isEditing: isEditing ?? false,
                        isHovered,
                        hasError: !!cell?.error,
                        errorMessage: cell?.errorMessage,
                        options: col.typeOptions,
                        theme,
                        rowIndex: actualRowIndex,
                        columnId: col.id,
                    };
                    
                    // Use renderer to draw
                    renderer.render(ctx, renderContext);

                    gridX += col.width;
                }
            }
        };

        // 3. Draw Scrollable Data Grid (Layer 1)
        if (visibleColumns.length > 0 && visibleColumns.some(c => !c.pinned)) {
            const scrollableCols = visibleColumns.filter(c => !c.pinned);
            ctx.save();
            ctx.beginPath();
            ctx.rect(theme.rowHeaderWidth + frozenWidth, theme.headerHeight, width - theme.rowHeaderWidth - frozenWidth, height - theme.headerHeight);
            ctx.clip();
            
            ctx.translate(-scrollLeft + theme.rowHeaderWidth, -scrollTop + theme.headerHeight);
            
            // Only draw scrollable columns in this layer
            drawColumns(scrollableCols, true);
            
            // Draw "+ Add Row" Ghost Row (Scrollable part)
            this.drawAddRowGhost(ctx, engine, visibleRows, rowStartIndex, scrollableCols, true, scrollableGridX);

            ctx.restore();
        }

        // 4. Draw Frozen Data Grid (Layer 2 - Overlay)
        if (pinnedColumns.length > 0) {
            ctx.save();
            ctx.translate(theme.rowHeaderWidth, -scrollTop + theme.headerHeight);
            
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
            
            // Calculate height based on content to stop shadow at the end of data
            const totalRows = engine.rows.getRowCount();
            const contentHeight = (totalRows + 1) * theme.rowHeight; // +1 for ghost row
            const shadowHeight = Math.min(height - theme.headerHeight, Math.max(0, contentHeight - scrollTop));

            if (shadowHeight > 0) {
                ctx.beginPath();
                ctx.moveTo(frozenWidth, 0);
                ctx.lineTo(frozenWidth, shadowHeight);
                ctx.strokeStyle = '#e5e7eb';
                ctx.stroke();
                
                const gradient = ctx.createLinearGradient(frozenWidth, 0, frozenWidth + 6, 0);
                gradient.addColorStop(0, 'rgba(0, 0, 0, 0.05)');
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(frozenWidth, 0, 6, shadowHeight);
            }

            ctx.restore();
        }

        // 5. Draw Selection
        this.drawSelection(ctx, engine, frozenWidth);

        // 6. Draw Fill Range
        this.drawFillRange(ctx, engine, frozenWidth);

        // 7. Draw Canvas Headers
        this.drawHeaders(ctx, engine, frozenWidth);

        // 7b. Draw Row Headers
        this.drawRowHeaders(ctx, engine, visibleRows, rowStartIndex);

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
        const totalRows = engine.rows.getRowCount();
        
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
                    const { rowsToAdd } = engine.store.getState();
                    const textX = isScrollable ? 12 + scrollLeft : 12;

                    // Draw Input Box
                    const inputX = textX;
                    const inputY = addRowY + 4;
                    const inputWidth = 40;
                    const inputHeight = theme.rowHeight - 8;
                    
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(inputX, inputY, inputWidth, inputHeight);
                    ctx.strokeStyle = '#d1d5db';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(inputX, inputY, inputWidth, inputHeight);
                    
                    ctx.fillStyle = '#374151';
                    ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(String(rowsToAdd), inputX + inputWidth/2, inputY + inputHeight/2);
                    
                    // Draw "+ Add Rows" Button Text
                    const btnX = inputX + inputWidth + 10;
                    ctx.textAlign = 'left';
                    ctx.fillStyle = '#6b7280';
                    
                    // If hovering button (we can't easily check here without passing specific hover state for this area, 
                    // but let's just keep it simple for now)
                    ctx.fillText('+ Add Rows', btnX, addRowY + theme.rowHeight / 2);
                }
            }
        }
    }
    
    // Helper to draw Group Header
    private drawGroupHeader(
        ctx: CanvasRenderingContext2D,
        row: GridRow,
        y: number,
        columns: GridColumn[],
        isScrollable: boolean,
        theme: any,
        startX: number
    ) {
        // Calculate total width of columns in this pass
        let passWidth = 0;
        for (const col of columns) passWidth += col.width;

        // Background
        ctx.fillStyle = '#f3f4f6'; // Light gray
        ctx.fillRect(startX, y, passWidth, theme.rowHeight);
        
        // Bottom Border
        ctx.strokeStyle = theme.borderColor;
        ctx.beginPath();
        ctx.moveTo(startX, y + theme.rowHeight - 0.5);
        ctx.lineTo(startX + passWidth, y + theme.rowHeight - 0.5);
        ctx.stroke();

        // Determine if we should draw the content (Arrow + Title)
        // We draw content if:
        // 1. We are in the Pinned layer (!isScrollable)
        // 2. OR We are in Scrollable layer BUT there are no pinned columns (so this is the only layer)
        const hasPinned = this.engine?.model.getVisibleColumns().some(c => c.pinned);
        const shouldDrawContent = (!isScrollable && hasPinned) || (isScrollable && !hasPinned);

        if (shouldDrawContent) {
            // Position content relative to the start of the grid (left-aligned)
            // If pinned, startX is 0. If scrollable (and no pinned), startX is scrollableGridX (or 0 if not scrolled).
            // We want sticky behavior? 
            // Actually, if "Scrollable & No Pinned", startX might vary. 
            // Let's place it at `startX + 12`.
            
            const x = startX + 12;
            const centerY = y + theme.rowHeight / 2;
            
            // Arrow
            ctx.fillStyle = '#6b7280';
            ctx.beginPath();
            if (row.isCollapsed) {
                // Right Arrow (Triangle)
                ctx.moveTo(x, centerY - 4);
                ctx.lineTo(x + 6, centerY);
                ctx.lineTo(x, centerY + 4);
            } else {
                // Down Arrow (Triangle)
                ctx.moveTo(x - 2, centerY - 3);
                ctx.lineTo(x + 8, centerY - 3);
                ctx.lineTo(x + 3, centerY + 3);
            }
            ctx.fill();
            
            // Title
            ctx.fillStyle = '#374151';
            ctx.font = `600 ${theme.fontSize}px ${theme.fontFamily}`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            const title = `${row.groupTitle || 'Untitled'} (${row.groupCount || 0})`;
            ctx.fillText(title, x + 16, centerY);
        }
    }

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
                ctx.beginPath();
                ctx.rect(theme.rowHeaderWidth, theme.headerHeight, frozenWidth, height - theme.headerHeight);
                ctx.clip();
                ctx.translate(theme.rowHeaderWidth, theme.headerHeight - scrollTop);
            }

            const visibleCols = engine.model.getVisibleColumns(); // Always sorted now
            
            for (let i = 0; i < selection.ranges.length; i++) {
                const range = selection.ranges[i];
                const isLast = i === selection.ranges.length - 1;
                
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
                    
                    // Draw Fill Handle (Bottom-Right)
                    // Only for the last range and if not currently filling
                    if (isLast && !engine.store.getState().isFilling) {
                        const allColumns = engine.model.getColumns();
                        const endCol = allColumns[range.end.col];
                        if (endCol) {
                            const endColIsPinned = !!endCol.pinned;
                            // Check if the end of the selection belongs to this layer
                            if ((isScrollable && !endColIsPinned) || (!isScrollable && endColIsPinned)) {
                    const handleSize = 6;
                                const handleX = rangeEndX - handleSize / 2;
                                const handleY = startY + selHeight - handleSize / 2;

                    ctx.fillStyle = theme.selectionBorderColor;
                    ctx.fillRect(handleX, handleY, handleSize, handleSize);
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(handleX + 1, handleY + 1, handleSize - 2, handleSize - 2); // Inner white
                            }
                        }
                    }
                }
            }
            ctx.restore();
        };
        
        drawSelectionPart(true);
        drawSelectionPart(false);
    }

    private drawFillRange(ctx: CanvasRenderingContext2D, engine: GridEngine, frozenWidth: number) {
        const fillRange = engine.store.getState().fillRange;
        if (!fillRange) return;
        
        const { theme } = engine;
        const { scrollLeft, scrollTop, width, height } = engine.viewport.getState();
        
        const drawFillRangePart = (isScrollable: boolean) => {
            ctx.save();
            
            if (isScrollable) {
                ctx.beginPath();
                ctx.rect(theme.rowHeaderWidth + frozenWidth, theme.headerHeight, width - theme.rowHeaderWidth - frozenWidth, height - theme.headerHeight);
                ctx.clip();
            ctx.translate(theme.rowHeaderWidth - scrollLeft, theme.headerHeight - scrollTop);
            } else {
                ctx.beginPath();
                ctx.rect(theme.rowHeaderWidth, theme.headerHeight, frozenWidth, height - theme.headerHeight);
                ctx.clip();
                ctx.translate(theme.rowHeaderWidth, theme.headerHeight - scrollTop);
            }

            const visibleCols = engine.model.getVisibleColumns();
            
            for (const range of fillRange.ranges) {
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

                    // Dashed Border for Fill Range
                    ctx.strokeStyle = theme.selectionBorderColor;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);
                    ctx.strokeRect(rangeStartX, startY, selWidth, selHeight);
                    ctx.setLineDash([]);
                    
                    // Light Fill
                    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
                    ctx.fillRect(rangeStartX, startY, selWidth, selHeight);
                }
            }
            ctx.restore();
        };
        
        drawFillRangePart(true);
        drawFillRangePart(false);
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
        } else if (icon === 'trash') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(5, 5); ctx.lineTo(19, 5); // Lid line
            ctx.moveTo(9, 5); ctx.lineTo(10, 3); ctx.lineTo(14, 3); ctx.lineTo(15, 5); // Lid handle
            ctx.moveTo(7, 5); ctx.lineTo(8, 20); ctx.lineTo(16, 20); ctx.lineTo(17, 5); // Body
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(10, 8); ctx.lineTo(10, 17);
            ctx.moveTo(14, 8); ctx.lineTo(14, 17);
            ctx.stroke();
        } else if (icon === 'maximize') {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            // Top-right arrow
            ctx.moveTo(15, 9); ctx.lineTo(19, 5);
            ctx.moveTo(19, 5); ctx.lineTo(15, 5);
            ctx.moveTo(19, 5); ctx.lineTo(19, 9);
            // Bottom-left arrow
            ctx.moveTo(9, 15); ctx.lineTo(5, 19);
            ctx.moveTo(5, 19); ctx.lineTo(5, 15);
            ctx.moveTo(5, 19); ctx.lineTo(9, 19);
            ctx.stroke();
            // Small box in center
            ctx.strokeRect(10, 10, 4, 4);
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

    private drawRowHeaders(ctx: CanvasRenderingContext2D, engine: GridEngine, visibleRows: GridRow[], rowStartIndex: number) {
        const { theme } = engine;
        const { height, scrollTop } = engine.viewport.getState();
        const { hoverPosition } = engine.store.getState();
        
        const rowHeaderWidth = theme.rowHeaderWidth;
        
        // 1. Background & Border (Row Headers)
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, theme.headerHeight, rowHeaderWidth, height - theme.headerHeight);
        
        ctx.beginPath();
        ctx.moveTo(rowHeaderWidth, theme.headerHeight);
        ctx.lineTo(rowHeaderWidth, height);
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();

        // 2. Calculate Hovered Row (Only if mouse is inside row header area)
        let hoveredRowIndex = -1;
        if (hoverPosition && hoverPosition.x < rowHeaderWidth && hoverPosition.y > theme.headerHeight) {
             hoveredRowIndex = Math.floor((hoverPosition.y - theme.headerHeight + scrollTop) / theme.rowHeight);
        }

        // 3. Draw Each Row Header
        let y = (rowStartIndex * theme.rowHeight) - scrollTop + theme.headerHeight;
        
        // Save context to clip row headers to below the main header
        // This prevents rows from drawing over the top-left corner if we didn't draw it last,
        // but also keeps things clean.
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, theme.headerHeight, rowHeaderWidth, height - theme.headerHeight);
        ctx.clip();

        for (let i = 0; i < visibleRows.length; i++) {
            const rowIndex = rowStartIndex + i;
            const isHovered = rowIndex === hoveredRowIndex;
            const isSelected = engine.isRowSelected(rowIndex);

            // Highlight background if Hovered or Selected
            if (isHovered || isSelected) {
                ctx.fillStyle = isSelected ? '#eff6ff' : '#f3f4f6'; // Light Blue or Light Gray
                ctx.fillRect(0, y, rowHeaderWidth - 1, theme.rowHeight);
            }

            // Show controls if Hovered OR Selected
            if (isHovered || isSelected) {
                const cbSize = 14;
                const cbX = 8;
                const cbY = y + (theme.rowHeight - cbSize) / 2;
                
                // Draw Checkbox
                ctx.beginPath();
                // Use rect if roundRect not supported (though standard now)
                if (ctx.roundRect) {
                    ctx.roundRect(cbX, cbY, cbSize, cbSize, 3);
                } else {
                    ctx.rect(cbX, cbY, cbSize, cbSize);
                }
                
                if (isSelected) {
                    ctx.fillStyle = theme.selectionBorderColor;
                    ctx.fill();
                    
                    // Checkmark
                    ctx.beginPath();
                    ctx.moveTo(cbX + 3.5, cbY + 7);
                    ctx.lineTo(cbX + 6, cbY + 9.5);
                    ctx.lineTo(cbX + 10.5, cbY + 4);
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = '#d1d5db';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fillStyle = '#ffffff';
                    ctx.fill();
                }

                // Action Buttons (Only on Hover)
                if (isHovered) {
                     const configActions = engine.getConfig()?.features.rows.actions;
                     
                     if (configActions && configActions.length > 0) {
                         // Draw configured actions (right-aligned)
                         let actionX = rowHeaderWidth - 20;
                         for (const action of configActions) {
                             const actionY = y + (theme.rowHeight - 14) / 2;
                             this.drawIcon(ctx, action.icon, actionX, actionY, 14, '#6b7280');
                             actionX -= 24;
                         }
                     } else {
                         // Default Actions (Enrich, Detail)
                         const enrichX = rowHeaderWidth - 34; 
                         const enrichY = y + (theme.rowHeight - 14) / 2;
                         this.drawIcon(ctx, 'sparkles', enrichX, enrichY, 14, '#8b5cf6');
    
                         const detailX = rowHeaderWidth - 16;
                         const detailY = y + (theme.rowHeight - 14) / 2;
                         this.drawIcon(ctx, 'maximize', detailX, detailY, 14, '#6b7280');
                     }
                }
            } else {
                // Default: Row Number
                ctx.fillStyle = '#9ca3af';
                ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(String(rowIndex + 1), 8, y + theme.rowHeight / 2);
            }

            y += theme.rowHeight;
        }
        ctx.restore(); // End clip

        // 0. Top-Left Corner (Header Junction) - DRAWN LAST to stay on top
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(0, 0, rowHeaderWidth, theme.headerHeight);
        
        // Select All Checkbox
        const cbSize = 14;
        const cbX = 8;
        const cbY = (theme.headerHeight - cbSize) / 2;
        
        // Determine if all selected
        const rowCount = engine.rows.getRowCount();
        const colCount = engine.model.getColumns().length;
        const selection = engine.store.getState().selection;
        const isAllSelected = selection && selection.ranges.some(r => 
            r.start.row === 0 && r.end.row === rowCount - 1 &&
            r.start.col === 0 && r.end.col >= colCount - 1
        );

        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(cbX, cbY, cbSize, cbSize, 3);
        } else {
            ctx.rect(cbX, cbY, cbSize, cbSize);
        }
        
        if (isAllSelected) {
            ctx.fillStyle = theme.selectionBorderColor;
            ctx.fill();
            
            // Checkmark
            ctx.beginPath();
            ctx.moveTo(cbX + 3.5, cbY + 7);
            ctx.lineTo(cbX + 6, cbY + 9.5);
            ctx.lineTo(cbX + 10.5, cbY + 4);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        } else {
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        
        ctx.beginPath();
        ctx.moveTo(0, theme.headerHeight);
        ctx.lineTo(rowHeaderWidth, theme.headerHeight);
        ctx.strokeStyle = theme.borderColor;
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    private drawErrorTooltip(ctx: CanvasRenderingContext2D, engine: GridEngine) {
        if (!engine) return;
        
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

        const row = engine.rows.getRow(rowIndex);
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
