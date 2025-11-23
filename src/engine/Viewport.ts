import { GridColumn, GridRow } from '../types/grid';

export interface ViewportState {
    scrollTop: number;
    scrollLeft: number;
    width: number;
    height: number;
}

export interface VisibleRange {
    rowStartIndex: number;
    rowEndIndex: number;
    colStartIndex: number;
    colEndIndex: number;
    visibleRows: GridRow[];
    visibleColumns: GridColumn[];
}

export class Viewport {
    private state: ViewportState = {
        scrollTop: 0,
        scrollLeft: 0,
        width: 0,
        height: 0,
    };

    private rowHeight: number = 32; // Default, should come from theme
    private headerHeight: number = 40;
    private rowHeaderWidth: number = 50;

    constructor(config?: Partial<ViewportState>) {
        if (config) {
            this.state = { ...this.state, ...config };
        }
    }

    updateState(updates: Partial<ViewportState>) {
        this.state = { ...this.state, ...updates };
    }

    getState(): ViewportState {
        return this.state;
    }

    // Calculate visible range based on current scroll and dimensions
    calculateVisibleRange(
        allRows: GridRow[],
        allColumns: GridColumn[]
    ): VisibleRange {
        const { scrollTop, scrollLeft, width, height } = this.state;

        // Rows
        const effectiveHeight = height - this.headerHeight;
        const startRow = Math.floor(scrollTop / this.rowHeight);
        const visibleRowCount = Math.ceil(effectiveHeight / this.rowHeight);
        // Add buffer
        const rowStartIndex = Math.max(0, startRow - 2);
        const rowEndIndex = Math.min(allRows.length - 1, startRow + visibleRowCount + 2);

        // Columns
        const effectiveWidth = width - this.rowHeaderWidth;
        let currentX = 0;
        let colStartIndex = -1;
        let colEndIndex = -1;

        // Linear search for columns (Optimization: Binary search or cached offsets)
        for (let i = 0; i < allColumns.length; i++) {
            const colWidth = allColumns[i].width;

            // Check if column is visible
            if (currentX + colWidth > scrollLeft && currentX < scrollLeft + effectiveWidth) {
                if (colStartIndex === -1) colStartIndex = i;
                colEndIndex = i;
            }

            currentX += colWidth;

            // Stop if we passed the viewport
            if (currentX > scrollLeft + effectiveWidth) break;
        }

        // Handle case where no columns are visible (e.g. scrolled too far)
        if (colStartIndex === -1) {
            colStartIndex = 0;
            colEndIndex = 0;
        }

        // Add buffer to columns
        colStartIndex = Math.max(0, colStartIndex - 1);
        colEndIndex = Math.min(allColumns.length - 1, colEndIndex + 1);

        return {
            rowStartIndex,
            rowEndIndex,
            colStartIndex,
            colEndIndex,
            visibleRows: allRows.slice(rowStartIndex, rowEndIndex + 1),
            visibleColumns: allColumns.slice(colStartIndex, colEndIndex + 1),
        };
    }
    getRangeBounds(
        range: { start: { col: number; row: number }; end: { col: number; row: number } },
        allColumns: GridColumn[]
    ): { x: number; y: number; width: number; height: number } | null {
        const { scrollTop, scrollLeft } = this.state;

        // Calculate Y
        const startRow = Math.min(range.start.row, range.end.row);
        const endRow = Math.max(range.start.row, range.end.row);
        const y = (startRow * this.rowHeight) + this.headerHeight - scrollTop;
        const height = ((endRow - startRow + 1) * this.rowHeight);

        // Calculate X
        const startCol = Math.min(range.start.col, range.end.col);
        const endCol = Math.max(range.start.col, range.end.col);

        let x = this.rowHeaderWidth - scrollLeft;
        let width = 0;

        // Optimization: This is O(N) where N is number of columns. 
        // Should be optimized with cached offsets for large datasets.
        for (let i = 0; i <= endCol; i++) {
            const colWidth = allColumns[i].width;
            if (i < startCol) {
                x += colWidth;
            } else {
                width += colWidth;
            }
        }

        return { x, y, width, height };
    }
}
