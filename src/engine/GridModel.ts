import type { GridColumn, GridRow, CellValue } from '../types/grid';
import type { DataAdapter } from '../adapters/DataAdapter';
import type { ColumnSort } from '../types/platform';
import { CellFormatter } from '../utils/CellFormatter';
import { TypeValidator } from '../utils/TypeValidator';

export class GridModel {
    private columns: GridColumn[] = [];
    private rows: Map<string, GridRow> = new Map();
    private rowOrder: string[] = [];
    
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

    // --- Column Management ---
    setColumns(columns: GridColumn[]): void {
        this.columns = columns;
    }

    getColumns(): GridColumn[] {
        return this.columns;
    }

    getVisibleColumns(): GridColumn[] {
        return this.columns.filter(col => col.visible !== false);
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
    getRowCount(): number {
        return this.rowOrder.length;
    }

    getAllRows(): GridRow[] {
        return Array.from(this.rows.values());
    }

    getRow(index: number): GridRow | undefined {
        const id = this.rowOrder[index];
        return this.rows.get(id);
    }

    getRowById(id: string): GridRow | undefined {
        return this.rows.get(id);
    }

    setRows(rows: GridRow[]) {
        this.rows.clear();
        this.rowOrder = [];
        rows.forEach(row => {
            this.rows.set(row.id, row);
            this.rowOrder.push(row.id);
        });
    }

    // --- Cell Management ---
    getCell(rowIndex: number, colId: string) {
        const row = this.getRow(rowIndex);
        return row?.cells.get(colId);
    }

    setCellValue(rowIndex: number, colId: string, value: CellValue) {
        const row = this.getRow(rowIndex);
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

    fillData(
        source: { start: { col: number; row: number }; end: { col: number; row: number } },
        target: { start: { col: number; row: number }; end: { col: number; row: number } }
    ) {
        // Get source data
        const sourceData: any[][] = [];
        const startCol = Math.min(source.start.col, source.end.col);
        const endCol = Math.max(source.start.col, source.end.col);
        const startRow = Math.min(source.start.row, source.end.row);
        const endRow = Math.max(source.start.row, source.end.row);

        const sourceWidth = endCol - startCol + 1;
        const sourceHeight = endRow - startRow + 1;

        for (let r = startRow; r <= endRow; r++) {
            const rowData: any[] = [];
            for (let c = startCol; c <= endCol; c++) {
                const colId = this.columns[c].id;
                const cell = this.getCell(r, colId);
                rowData.push(cell?.value);
            }
            sourceData.push(rowData);
        }

        // Fill target
        const targetStartCol = Math.min(target.start.col, target.end.col);
        const targetEndCol = Math.max(target.start.col, target.end.col);
        const targetStartRow = Math.min(target.start.row, target.end.row);
        const targetEndRow = Math.max(target.start.row, target.end.row);

        for (let r = targetStartRow; r <= targetEndRow; r++) {
            for (let c = targetStartCol; c <= targetEndCol; c++) {
                // Determine source value index (modulo for repeating pattern)
                // Note: This repeats the pattern from the top-left of the target range
                const sourceR = (r - targetStartRow) % sourceHeight;
                const sourceC = (c - targetStartCol) % sourceWidth;

                const value = sourceData[sourceR][sourceC];
                const colId = this.columns[c].id;
                this.setCellValue(r, colId, value);
            }
        }
    }
    
    // ===== NEW: ROW OPERATIONS =====
    
    /**
     * Add a row to the model
     * Note: This is called AFTER adapter has created the row
     */
    addRow(row: GridRow): void {
        this.rows.set(row.id, row);
        this.rowOrder.push(row.id);
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
        this.rowOrder = this.rowOrder.filter(id => id !== rowId);
    }
    
    // ===== NEW: COLUMN OPERATIONS =====
    
    /**
     * Add a column to the model
     * Note: This is called AFTER adapter has created the column
     */
    addColumn(column: GridColumn): void {
        this.columns.push(column);
    }
    
    /**
     * Update a column in the model
     * Note: This is called AFTER adapter has updated the column
     */
    updateColumn(columnId: string, changes: Partial<GridColumn>): void {
        const column = this.getColumnById(columnId);
        if (column) {
            Object.assign(column, changes);
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
