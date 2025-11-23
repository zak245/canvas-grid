/**
 * Platform Types
 * 
 * Additional types for the platform layer that don't belong in grid.ts
 * These support the config, adapters, and lifecycle systems.
 */

import type { GridColumn, GridRow, CellValue, GridSelection, CellType } from './grid';

// ==================== DATA OPERATIONS ====================

export interface FetchParams {
  page?: number;
  pageSize?: number;
  sort?: ColumnSort[];
  filter?: ColumnFilter[];
}

export interface GridData {
  columns: GridColumn[];
  rows: GridRow[];
  totalRows?: number;
  page?: number;
  pageSize?: number;
}

export interface CellUpdate {
  rowIndex: number;
  columnId: string;
  value: CellValue;
}

export interface CellChange {
  rowIndex: number;
  columnId: string;
  value: CellValue;
  oldValue: CellValue;
}

export interface RowUpdate {
  rowId: string;
  changes: Partial<GridRow>;
}

// ==================== SORTING & FILTERING ====================

export interface ColumnSort {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface ColumnFilter {
  columnId: string;
  operator: FilterOperator;
  value: any;
}

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty';

export type ComparatorFn = (a: any, b: any) => number;

// ==================== VALIDATION ====================

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'regex' | 'custom';
  value?: any;
  message?: string;
  validator?: (value: CellValue) => boolean;
}

// ==================== ERRORS ====================

export interface GridError {
  type: string;
  message: string;
  details?: any;
  timestamp: number;
}

// ==================== PERFORMANCE ====================

export interface RenderStats {
  frameTime: number;
  cellsRendered: number;
  fps: number;
  timestamp: number;
}

export interface PerformanceMetrics {
  renderTime: number;
  sortTime: number;
  updateTime: number;
  memory?: number;
}

// ==================== UI ====================

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  separator?: boolean;
  shortcut?: string;
}

export interface TooltipData {
  content: string;
  x: number;
  y: number;
  visible: boolean;
}

// ==================== TRANSACTIONS ====================

export interface Transaction {
  id: string;
  operations: Operation[];
  timestamp: number;
}

export interface Operation {
  type: OperationType;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  data: any;
}

export type OperationType =
  | 'cell:update'
  | 'cell:bulkUpdate'
  | 'row:add'
  | 'row:update'
  | 'row:delete'
  | 'row:bulkDelete'
  | 'column:add'
  | 'column:update'
  | 'column:delete'
  | 'column:reorder'
  | 'sort:change'
  | 'filter:change';

// ==================== OPTIMISTIC UPDATES ====================

export interface PendingUpdate {
  id: string;
  timestamp: number;
  optimisticUpdate: () => void;
  status: 'pending' | 'success' | 'error';
  error?: Error;
}

// ==================== CELL EDITORS ====================

export interface CellEditor {
  type: CellType;
  component: React.ComponentType<CellEditorProps>;
  getValue: (element: HTMLElement) => CellValue;
}

export interface CellEditorProps {
  value: CellValue;
  column: GridColumn;
  onChange: (value: CellValue) => void;
  onCommit: () => void;
  onCancel: () => void;
}

// ==================== BACKEND ====================

export interface BackendEndpoints {
  // Data
  fetchData: string;
  
  // Rows
  addRow: string;
  updateRow: string;
  deleteRow: string;
  bulkUpdateRows: string;
  bulkDeleteRows: string;
  
  // Columns
  addColumn: string;
  updateColumn: string;
  deleteColumn: string;
  reorderColumns: string;
  
  // Cells
  updateCell: string;
  bulkUpdateCells: string;
  
  // Operations
  sort: string;
  filter: string;
}

// ==================== TYPE GUARDS ====================

export function isCellUpdate(obj: any): obj is CellUpdate {
  return (
    obj &&
    typeof obj.rowIndex === 'number' &&
    typeof obj.columnId === 'string' &&
    obj.value !== undefined
  );
}

export function isColumnSort(obj: any): obj is ColumnSort {
  return (
    obj &&
    typeof obj.columnId === 'string' &&
    (obj.direction === 'asc' || obj.direction === 'desc')
  );
}

