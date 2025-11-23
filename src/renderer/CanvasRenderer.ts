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
            engine.model.getColumns()
        );

        const { visibleRows, visibleColumns, rowStartIndex, colStartIndex } = visibleRange;

        // 3. Draw Data Grid (scrolled content)
        ctx.save();
        ctx.translate(-scrollLeft + theme.rowHeaderWidth, -scrollTop + theme.headerHeight);

        // Draw Rows
        let y = rowStartIndex * theme.rowHeight;
        for (const row of visibleRows) {
            // Draw Cells
            let x = 0;

            // Calculate x offset for visible columns
            for (let i = 0; i < colStartIndex; i++) {
                x += engine.model.getColumn(i)?.width || 0;
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

        ctx.restore();

        // 4. Draw Selection (with header offset)
        const selection = engine.store.getState().selection;
        if (selection) {
            ctx.save();
            ctx.translate(theme.rowHeaderWidth - scrollLeft, theme.headerHeight - scrollTop);

            for (const range of selection.ranges) {
                // Calculate range bounds
                let startX = 0;
                let startY = range.start.row * theme.rowHeight;
                let width = 0;
                let height = (range.end.row - range.start.row + 1) * theme.rowHeight;

                const cols = engine.model.getColumns();
                for (let i = 0; i < cols.length; i++) {
                    if (i < range.start.col) {
                        startX += cols[i].width;
                    } else if (i <= range.end.col) {
                        width += cols[i].width;
                    }
                }

                // Draw Selection Background
                ctx.fillStyle = theme.selectionColor;
                ctx.fillRect(startX, startY, width, height);

                // Draw Selection Border
                ctx.strokeStyle = theme.selectionBorderColor;
                ctx.lineWidth = 2;
                ctx.strokeRect(startX, startY, width, height);

                // Draw Fill Handle (Bottom Right of the last range)
                if (range === selection.ranges[selection.ranges.length - 1]) {
                    const handleSize = 6;
                    const handleX = startX + width - handleSize / 2;
                    const handleY = startY + height - handleSize / 2;

                    ctx.fillStyle = theme.selectionBorderColor;
                    ctx.fillRect(handleX, handleY, handleSize, handleSize);

                    // White border for handle to make it pop
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(handleX, handleY, handleSize, handleSize);
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

            // Calculate bounds the SAME way as selection (lines 78-91)
            let startX = 0;
            let startY = range.start.row * theme.rowHeight;
            let width = 0;
            let height = (range.end.row - range.start.row + 1) * theme.rowHeight;

            const cols = engine.model.getColumns();
            for (let i = 0; i < cols.length; i++) {
                if (i < range.start.col) {
                    startX += cols[i].width;
                } else if (i <= range.end.col) {
                    width += cols[i].width;
                }
            }

            // Draw dashed border
            ctx.strokeStyle = theme.selectionBorderColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(startX, startY, width, height);

            ctx.restore();
        }

        // 6. Draw Error Tooltip on hover
        this.drawErrorTooltip(ctx, engine);
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
        const columns = engine.model.getColumns();

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

