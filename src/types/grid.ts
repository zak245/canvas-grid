// Platform-level: Support any data type for maximum flexibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CellValue = any;

// Cell Types
export type CellType = 'text' | 'number' | 'date' | 'boolean' | 'email' | 'url' | 'ai' | 'linked';

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
    type: CellType;  // Default type for this column
    format?: CellFormat;  // Default format for this column
    aiConfig?: {
        prompt: string;
        model: string;
    };
    visible: boolean;
    pinned?: boolean;
    headerAction?: {
        icon: 'play' | 'sparkles' | 'refresh' | 'settings';
        tooltip?: string;
    };
    editor?: ColumnEditorConfig;
    formatter?: (value: any) => string;
}

export type EditorMode = 'inline' | 'drawer' | 'modal' | 'custom';

export interface ColumnEditorConfig {
    mode?: EditorMode;
    component?: any; // Custom React component for 'custom' mode
    options?: { label: string; value: any }[];
    lockScroll?: boolean;
}

export interface EditorProps<T = any> {
    value: T;
    width: number;
    height: number;
    column: GridColumn;
    onCommit: (newValue: T, shouldMove?: boolean) => void;
    onCancel: () => void;
    className?: string;
}

export interface GridRow {
    id: string;
    height?: number;
    // Sparse storage: only store cells that exist
    cells: Map<string, GridCell>;
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
