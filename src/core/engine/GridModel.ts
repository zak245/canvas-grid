import type { GridColumn, GridRow, CellValue } from '../types/grid';
import type { DataAdapter } from '../adapters/DataAdapter';
import type { ColumnSort } from '../types/platform';
import { CellFormatter } from '../utils/CellFormatter';
import { TypeValidator } from '../utils/TypeValidator';

export class GridModel {
    private columns: GridColumn[] = [];
    private rows: Map<string, GridRow> = new Map();
    // Deprecated: private rowOrder: string[] = []; 
    // We now rely on the external RowManager/View Layer for ordering.
    // However, for simple default behavior (and to support the getRowId(index) requirement
    // of the RowManager during init), we can expose the map iterator or keys.
    
    // NEW: Sort state
    private sortState: ColumnSort[] = [];
    
    // NEW: Optional adapter reference
    private adapter: DataAdapter | null = null;
    
    // Constructor with optional adapter
    constructor(adapter?: DataAdapter) {
        if (adapter) {
            this.adapter = adapter;
        }
    }

    public getAdapter(): DataAdapter | undefined {
        return this.adapter || undefined;
    }
    
    // --- Column Management ---
    setColumns(columns: GridColumn[]): void {
        this.columns = columns;
    }

    getColumns(): GridColumn[] {
        return this.columns;
    }

    getVisibleColumns(): GridColumn[] {
        // Filter and Sort to ensure pinned columns are always first
        return this.columns
            .filter(col => col.visible !== false)
            .sort((a, b) => {
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0;
            });
    }

    getColumn(index: number): GridColumn | undefined {
        return this.columns[index];
    }

    getColumnById(id: string): GridColumn | undefined {
        return this.columns.find(col => col.id === id);
    }

    getColumnCount(): number {
        return this.columns.length;
    }

    // --- Row Management ---
    
    // NOTE: getRowCount() and getRow() are now responsibilities of RowManager (View Layer).
    // But for internal operations or "Data Model" queries, we might still need them.
    // However, per the plan, we should remove internal rowOrder management to enforce separation.
    
    /**
     * Get all rows (unordered map values)
     */
    getAllRows(): GridRow[] {
        return Array.from(this.rows.values());
    }

    /**
     * Get row IDs iterator (for initializing View Layer)
     */
    getRowIds(): IterableIterator<string> {
        return this.rows.keys();
    }

    getRowById(id: string): GridRow | undefined {
        return this.rows.get(id);
    }

    setRows(rows: GridRow[]) {
        this.rows.clear();
        rows.forEach(row => {
            this.rows.set(row.id, row);
        });
    }

    // --- Cell Management ---
    // Helper: Get cell by ID lookup
    getCell(rowId: string, colId: string) {
        const row = this.getRowById(rowId);
        return row?.cells.get(colId);
    }

    setCellValue(rowId: string, colId: string, value: CellValue) {
        const row = this.getRowById(rowId);
        if (!row) return;

        // Get column to check type
        const column = this.getColumnById(colId);
        if (!column) return;

        // Validate and convert value
        const validation = TypeValidator.validate(value, column.type);
        const convertedValue = TypeValidator.tryConvert(value, column.type);

        const cell = row.cells.get(colId);
        if (cell) {
            cell.value = convertedValue;
            // Mark error if validation failed
            cell.error = !validation.valid;
            cell.errorMessage = validation.error;
            // Invalidate cache when value changes
            CellFormatter.invalidateCache(cell);
        } else {
            // Create new cell with validation
            row.cells.set(colId, {
                value: convertedValue,
                error: !validation.valid,
                errorMessage: validation.error,
            });
        }
    }
    
    // ===== NEW: ROW OPERATIONS =====
    
    /**
     * Add a row to the model
     * Note: This is called AFTER adapter has created the row
     */
    addRow(row: GridRow): void {
        this.rows.set(row.id, row);
    }
    
    /**
     * Update a row in the model
     * Note: This is called AFTER adapter has updated the row
     */
    updateRow(row: GridRow): void {
        this.rows.set(row.id, row);
    }
    
    /**
     * Delete a row from the model
     * Note: This is called AFTER adapter has deleted the row
     */
    deleteRow(rowId: string): void {
        this.rows.delete(rowId);
    }
    
    // ===== NEW: COLUMN OPERATIONS =====
    
    getFrozenWidth(): number {
        return this.getVisibleColumns()
            .filter(c => c.pinned)
            .reduce((sum, c) => sum + c.width, 0);
    }

    /**
     * Add a column to the model
     * Note: This is called AFTER adapter has created the column
     */
    addColumn(column: GridColumn): void {
        this.columns.push(column);
        this.sortColumns();
    }
    
    /**
     * Update a column in the model
     * Note: This is called AFTER adapter has updated the column
     */
    updateColumn(columnId: string, changes: Partial<GridColumn>): void {
        const column = this.getColumnById(columnId);
        if (column) {
            Object.assign(column, changes);
            // Re-sort if pinned status changed
            if (changes.pinned !== undefined) {
                this.sortColumns();
            }
        }
    }
    
    /**
     * Delete a column from the model
     * Note: This is called AFTER adapter has deleted the column
     */
    deleteColumn(columnId: string): void {
        this.columns = this.columns.filter(c => c.id !== columnId);
        // Note: Adapter should handle removing cells
    }

    /**
     * Move a column from one index to another
     * Handles automatic pinning/unpinning based on drop target
     */
    moveColumn(fromIndex: number, toIndex: number): void {
        if (fromIndex < 0 || fromIndex >= this.columns.length ||
            toIndex < 0 || toIndex >= this.columns.length ||
            fromIndex === toIndex) {
            return;
        }

        // Count pinned columns BEFORE the move
        // We use this as the threshold
        const pinnedCount = this.columns.filter(c => c.pinned).length;

        const column = this.columns[fromIndex];
        
        // Remove from old index
        this.columns.splice(fromIndex, 1);
        // Insert at new index
        this.columns.splice(toIndex, 0, column);

        // Update Pinned State
        if (toIndex < pinnedCount) {
            column.pinned = true;
        } else {
            column.pinned = false;
        }
    }

    private sortColumns() {
        // Stable sort: pinned first
        this.columns.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });
    }
    
    // ===== NEW: SORT STATE =====
    
    /**
     * Get current sort state
     */
    getSortState(): ColumnSort[] {
        return this.sortState;
    }
    
    /**
     * Set sort state
     */
    setSortState(sortState: ColumnSort[]): void {
        this.sortState = sortState;
    }
}
