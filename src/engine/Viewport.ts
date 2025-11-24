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
    pinnedColumns: GridColumn[];
    scrollableGridX: number; // X position of the first visible scrollable column
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
    private rowHeaderWidth: number = 70;

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
        const pinnedColumns: GridColumn[] = [];
        let frozenWidth = 0;
        
        // 1. Identify Pinned Columns and Frozen Width
        // We assume they are sorted to the start, but we iterate all to be safe/consistent
        for (const col of allColumns) {
            if (col.pinned) {
                pinnedColumns.push(col);
                frozenWidth += col.width;
            }
        }

        const effectiveWidth = width - this.rowHeaderWidth;
        const visibleColumns: GridColumn[] = [];
        
        let currentX = 0;
        let colStartIndex = -1;
        let colEndIndex = -1;
        let scrollableGridX = frozenWidth; // Default to start of scrollable area

        // 2. Find Scrollable Columns
        for (let i = 0; i < allColumns.length; i++) {
            const col = allColumns[i];
            const colWidth = col.width;

            if (col.pinned) {
                currentX += colWidth;
                continue;
            }

            // Visible Window in World Coordinates
            // We effectively see [scrollLeft + frozenWidth, scrollLeft + effectiveWidth]
            // mapped to Screen X [frozenWidth, effectiveWidth]
            const viewStart = scrollLeft + frozenWidth;
            const viewEnd = scrollLeft + effectiveWidth;

            if (currentX + colWidth > viewStart && currentX < viewEnd) {
                if (colStartIndex === -1) {
                    colStartIndex = i;
                    scrollableGridX = currentX;
                }
                colEndIndex = i;
                visibleColumns.push(col);
            }

            currentX += colWidth;

            // Stop if we passed the viewport
            if (currentX > viewEnd) break;
        }

        // Handle case where no columns are visible
        if (colStartIndex === -1 && visibleColumns.length === 0 && allColumns.length > pinnedColumns.length) {
             // Find first unpinned
             const firstUnpinned = allColumns.findIndex(c => !c.pinned);
             if (firstUnpinned !== -1) {
                 colStartIndex = firstUnpinned;
                 colEndIndex = firstUnpinned;
                 // We need to calculate X for this column if we were to render it
                 // But if it's not visible, maybe scrollableGridX doesn't matter as list is empty
             }
        }

        return {
            rowStartIndex,
            rowEndIndex,
            colStartIndex,
            colEndIndex,
            visibleRows: allRows.slice(rowStartIndex, rowEndIndex + 1),
            visibleColumns, // Now excludes pinned columns
            pinnedColumns,
            scrollableGridX
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

        let currentX = 0;
        let rangeX = -1;
        let rangeWidth = 0;

        for (let i = 0; i < allColumns.length; i++) {
            const col = allColumns[i];
            const colWidth = col.width;

            if (i >= startCol && i <= endCol) {
                // Calculate visual X for this column
                // If pinned, it's just currentX
                // If unpinned, it's currentX - scrollLeft
                const visualX = col.pinned ? currentX : currentX - scrollLeft;
                
                if (rangeX === -1) {
                    rangeX = visualX;
                }
                
                rangeWidth += colWidth;
            }

            currentX += colWidth;
            
            if (i > endCol) break;
        }

        if (rangeX === -1) return null;

        return { x: this.rowHeaderWidth + rangeX, y, width: rangeWidth, height };
    }
}
