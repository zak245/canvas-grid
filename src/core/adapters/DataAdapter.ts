/**
 * Data Adapter Interface
 * 
 * Abstraction for data operations that enables seamless switching between:
 * - Local mode (in-memory)
 * - Backend mode (API calls)
 * - Custom implementations
 * 
 * Performance considerations:
 * - All methods are async (supports both sync and async implementations)
 * - Bulk operations provided for efficiency
 * - Virtual sorting support (indices instead of array copies)
 */

import type { GridColumn, GridRow, CellValue } from '../types/grid';
import type { FetchParams, GridData, CellUpdate, ColumnSort } from '../types/platform';

export interface DataAdapter {
  // ===== DATA FETCHING =====
  
  /**
   * Fetch grid data (supports pagination, sorting, filtering)
   */
  fetchData(params: FetchParams): Promise<GridData>;
  
  // ===== ROW OPERATIONS =====
  
  /**
   * Add a new row
   * @returns The created row with server-generated ID
   */
  addRow(row: Partial<GridRow>): Promise<GridRow>;
  
  /**
   * Update an existing row
   */
  updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow>;
  
  /**
   * Delete a row
   */
  deleteRow(rowId: string): Promise<void>;
  
  /**
   * Bulk update multiple rows
   * More efficient than calling updateRow multiple times
   */
  bulkUpdateRows(updates: Array<{ rowId: string; changes: Partial<GridRow> }>): Promise<GridRow[]>;
  
  /**
   * Bulk delete multiple rows
   * More efficient than calling deleteRow multiple times
   */
  bulkDeleteRows(rowIds: string[]): Promise<void>;
  
  // ===== COLUMN OPERATIONS =====
  
  /**
   * Add a new column
   */
  addColumn(column: GridColumn): Promise<GridColumn>;
  
  /**
   * Update column properties
   */
  updateColumn(columnId: string, changes: Partial<GridColumn>): Promise<GridColumn>;
  
  /**
   * Delete a column and all its data
   */
  deleteColumn(columnId: string): Promise<void>;
  
  /**
   * Reorder columns
   * @param order Array of column IDs in new order
   */
  reorderColumns(order: string[]): Promise<void>;
  
  /**
   * Resize a column
   */
  resizeColumn(columnId: string, width: number): Promise<void>;
  
  /**
   * Hide/show a column
   */
  hideColumn(columnId: string): Promise<void>;
  
  /**
   * Pin a column to left or right edge
   */
  pinColumn(columnId: string, pin: 'left' | 'right' | null): Promise<void>;
  
  // ===== CELL OPERATIONS =====
  
  /**
   * Update a single cell
   */
  updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void>;
  
  /**
   * Bulk update multiple cells
   * More efficient than calling updateCell multiple times
   */
  bulkUpdateCells(updates: CellUpdate[]): Promise<void>;
  
  // ===== SORTING & FILTERING =====
  
  /**
   * Apply sorting
   * - Local mode: Returns void (sorts in place using indices)
   * - Backend mode: Returns new data (server-side sort)
   */
  sort(sortState: ColumnSort[]): Promise<GridData | void>;
  
  // ===== METADATA =====
  
  /**
   * Get column schema
   */
  getColumnSchema(): Promise<GridColumn[]>;
  
  /**
   * Get total row count
   */
  getRowCount(): Promise<number>;
}

