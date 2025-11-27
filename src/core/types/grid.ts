// Platform-level: Support any data type for maximum flexibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CellValue = any;

// Cell Types - matches the built-in cell type system
export type CellType = 
  | 'text' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'select' 
  | 'email' 
  | 'url' 
  | 'phone' 
  | 'progress' 
  | 'linked'
  // New types (Phase 2)
  | 'currency'
  | 'tags'
  | 'entity'
  | 'rating'
  | 'json'
  | 'ai'
  | 'action';

// Formatting options for each type
export interface CellFormat {
    // Number formatting
    decimals?: number;
    thousandsSeparator?: boolean;
    prefix?: string;  // e.g., "$" for currency
    suffix?: string;  // e.g., "%" for percentage

    // Date formatting
    dateFormat?: string;  // e.g., "MM/DD/YYYY", "YYYY-MM-DD"

    // Boolean formatting
    booleanDisplay?: 'checkbox' | 'text';  // ✓/✗ or TRUE/FALSE

    // Text overflow
    overflow?: 'ellipsis' | 'wrap' | 'clip';
}

export interface CellPosition {
    col: number;
    row: number;
}

export interface GridCell {
    value: CellValue;
    displayValue?: string;
    style?: CellStyle;
    loading?: boolean; // For AI streaming
    type?: CellType;  // Override column type
    format?: CellFormat;  // Override column format
    _cached?: string;  // Cached formatted value for performance

    // Error handling for type mismatches
    error?: boolean;  // Cell has a validation error
    errorMessage?: string;  // Error description
}

export interface CellStyle {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    bg?: string;
    align?: 'left' | 'center' | 'right';
}

export interface GridColumn {
    id: string;
    title: string;
    width: number;
    type: CellType;  // Cell type determines rendering, editing, validation
    format?: CellFormat;  // Display format options
    /** Type-specific options (e.g., select options, progress range, etc.) */
    typeOptions?: Record<string, unknown>;
    visible: boolean;
    pinned?: boolean;
    headerAction?: {
        icon: 'play' | 'sparkles' | 'refresh' | 'settings';
        tooltip?: string;
    };
}

export interface GridRow {
    id: string;
    height?: number;
    // Sparse storage: only store cells that exist
    cells: Map<string, GridCell>;
    
    // Grouping Metadata
    isGroupHeader?: boolean;
    groupKey?: string;      // The unique key for this group
    groupTitle?: string;    // Display title
    isCollapsed?: boolean;
    groupCount?: number;    // Number of items in group
    depth?: number;         // Nesting level (0 for top level)
}

export interface GridSelection {
    ranges: SelectionRange[];
    primary: CellPosition | null;
}

export interface SelectionRange {
    start: CellPosition;
    end: CellPosition;
}

export interface GridTheme {
    // Dimensions
    rowHeight: number;
    headerHeight: number;
    rowHeaderWidth: number;

    // Colors
    backgroundColor?: string;
    headerBackgroundColor: string;
    headerColor?: string; // New
    gridLineColor: string;
    borderColor: string;
    
    // Selection
    selectionColor: string;
    selectionBorderColor: string;

    // Font
    fontFamily: string;
    fontSize: number;
    headerFontFamily: string;
    headerFontSize: number;
}

export interface RowAction {
    id: string;
    label: string;
    icon: 'edit' | 'delete' | 'duplicate' | 'detail' | 'enrich' | 'play' | 'sparkles' | 'refresh' | 'settings' | 'maximize' | 'trash';
    tooltip?: string;
}
