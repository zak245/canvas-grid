import { GridEngine } from '../../engine/GridEngine';

export class SelectionOverlay {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private engine: GridEngine;
    private container: HTMLElement | null = null;
    private dpr: number = window.devicePixelRatio || 1;

    constructor(engine: GridEngine) {
        this.engine = engine;
    }

    attach(container: HTMLElement) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'ds-grid-selection-overlay';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none'; // Allow clicks to pass through
        this.canvas.style.zIndex = '100'; // Above everything
        
        container.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        
        this.updateSize();
    }

    detach() {
        if (this.canvas && this.container) {
            this.container.removeChild(this.canvas);
        }
        this.canvas = null;
        this.ctx = null;
        this.container = null;
    }

    updateSize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
    }

    render() {
        if (!this.ctx || !this.canvas) return;
        
        const { width, height } = this.engine.viewport.getState();
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.resetTransform();
        this.ctx.scale(this.dpr, this.dpr);

        // Calculate Frozen Width
        const pinnedCols = this.engine.model.getVisibleColumns().filter(c => c.pinned);
        let frozenWidth = 0;
        for (const col of pinnedCols) {
            frozenWidth += col.width;
        }

        // Reuse logic from CanvasRenderer (duplicated for now to avoid complex inheritance refactor)
        this.drawSelection(this.ctx, frozenWidth);
        this.drawFillRange(this.ctx, frozenWidth);
    }

    // --- Drawing Logic (Duplicated from CanvasRenderer for independence) ---

    private drawSelection(ctx: CanvasRenderingContext2D, frozenWidth: number) {
        const selection = this.engine.store.getState().selection;
        if (!selection) return;
        
        const { theme } = this.engine;
        const { scrollLeft, scrollTop, width, height } = this.engine.viewport.getState();
        
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

            const visibleCols = this.engine.model.getVisibleColumns();
            
            for (let i = 0; i < selection.ranges.length; i++) {
                const range = selection.ranges[i];
                const isLast = i === selection.ranges.length - 1;
                
                let rangeStartX = -1;
                let rangeEndX = -1;
                
                let currentX = 0;
                for (const col of visibleCols) {
                    const belongsToLayer = isScrollable ? !col.pinned : col.pinned;
                    const trueIndex = this.engine.model.getColumns().findIndex(c => c.id === col.id);
                    
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
                    if (isLast && !this.engine.store.getState().isFilling) {
                        const allColumns = this.engine.model.getColumns();
                        const endCol = allColumns[range.end.col];
                        if (endCol) {
                            const endColIsPinned = !!endCol.pinned;
                            if ((isScrollable && !endColIsPinned) || (!isScrollable && endColIsPinned)) {
                    const handleSize = 6;
                                const handleX = rangeEndX - handleSize / 2;
                                const handleY = startY + selHeight - handleSize / 2;

                    ctx.fillStyle = theme.selectionBorderColor;
                    ctx.fillRect(handleX, handleY, handleSize, handleSize);
                                ctx.fillStyle = '#ffffff';
                                ctx.fillRect(handleX + 1, handleY + 1, handleSize - 2, handleSize - 2);
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

    private drawFillRange(ctx: CanvasRenderingContext2D, frozenWidth: number) {
        const fillRange = this.engine.store.getState().fillRange;
        if (!fillRange) return;
        
        const { theme } = this.engine;
        const { scrollLeft, scrollTop, width, height } = this.engine.viewport.getState();
        
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

            const visibleCols = this.engine.model.getVisibleColumns();
            
            for (const range of fillRange.ranges) {
                let rangeStartX = -1;
                let rangeEndX = -1;
                
                let currentX = 0;
                for (const col of visibleCols) {
                    const belongsToLayer = isScrollable ? !col.pinned : col.pinned;
                    const trueIndex = this.engine.model.getColumns().findIndex(c => c.id === col.id);
                    
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
}

