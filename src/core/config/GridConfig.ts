/**
 * Grid Configuration
 * 
 * Central configuration system for the grid platform.
 * Provides abstractions for developers to configure grid behavior with support
 * for local (browser) and backend modes.
 * 
 * Design principles:
 * 1. Sensible defaults - works out of the box
 * 2. Progressive enhancement - add complexity as needed
 * 3. Type-safe - full TypeScript support
 * 4. Extensible - hooks and adapters for custom behavior
 */

import type { GridColumn, GridRow, CellValue, CellType, GridTheme, GridSelection } from '../types/grid';
import type {
  ColumnSort,
  ComparatorFn,
  ValidationResult,
  CellChange,
  GridError,
  RenderStats,
  MenuItem,
  BackendEndpoints,
  CellEditor,
  GridData,
  // FetchParams - removed unused import
} from '../types/platform';

// ==================== MAIN CONFIG ====================

export interface GridConfig {
  // Data source configuration
  dataSource: DataSourceConfig;
  
  // Feature configurations
  features: FeaturesConfig;
  
  // Performance tuning
  performance: PerformanceConfig;
  
  // Lifecycle hooks
  lifecycle: LifecycleHooks;
  
  // UI customization
  ui: UIConfig;
}

// ==================== DATA SOURCE ====================

export interface DataSourceConfig {
  mode: 'local' | 'backend' | 'hybrid';
  
  // Local mode
  initialData?: GridData;
  
  // Backend mode
  endpoints?: BackendEndpoints;
  
  // Custom adapter (overrides default)
  adapter?: any; // Will be DataAdapter interface
  
  // Pagination
  pagination?: {
    enabled: boolean;
    pageSize: number;
    serverSide: boolean;
  };
  
  // Caching
  cache?: {
    enabled: boolean;
    ttl?: number;
    strategy: 'memory' | 'indexeddb' | 'custom';
  };
}

// ==================== FEATURES ====================

export interface FeaturesConfig {
  columns: ColumnManagementConfig;
  rows: RowManagementConfig;
  cells: CellEditingConfig;
  sorting: SortingConfig;
  selection: SelectionConfig;
  ai: AIConfig;
}

export interface ColumnManagementConfig {
  // Basic operations
  allowResize: boolean;
  allowReorder: boolean;
  allowHide: boolean;
  allowDelete: boolean;
  allowAdd: boolean;
  allowRename: boolean;
  
  // Advanced operations
  allowPin: boolean;
  allowGroups: boolean;
  
  // Constraints
  minWidth: number;
  maxWidth: number;
  
  // Templates for quick add
  templates?: Record<string, Partial<GridColumn>>;
  
  // Defaults for new columns
  defaults: Partial<GridColumn>;
}

export interface RowManagementConfig {
  // Basic operations
  allowAdd: boolean;
  allowDelete: boolean;
  allowReorder: boolean;
  
  // Bulk operations
  allowBulkDelete: boolean;
  allowBulkUpdate: boolean;
  
  // Row height
  rowHeight: number;
  allowVariableHeight: boolean;
  
  // Row selection
  allowMultiSelect: boolean;
  
  // Row Actions
  actions?: RowAction[];
  
  // Virtual scrolling
  bufferSize: number;
}

export interface CellEditingConfig {
  // Inline editing
  enabled: boolean;
  mode: 'click' | 'doubleClick' | 'manual';
  
  // Edit triggers
  startEditOnType: boolean;
  
  // Validation
  validateOnChange: boolean;
  validateOnBlur: boolean;
  
  // Auto-save
  autoSave: boolean;
  autoSaveDebounce: number;
  
  // Custom editors
  customEditors?: Record<CellType, CellEditor>;
}

export interface SortingConfig {
  mode: 'local' | 'backend' | 'hybrid';
  
  // Multi-column sort
  multiColumn: boolean;
  maxSortColumns?: number;
  
  // Performance strategy
  strategy: 'copy' | 'indices'; // 'indices' for large datasets
  
  // Custom comparators
  comparators?: Record<CellType, ComparatorFn>;
  
  // Debounce for backend
  debounceMs: number;
}

export interface SelectionConfig {
  mode: 'single' | 'multi';
  allowRanges: boolean;
}

export interface AIConfig {
  enabled: boolean;
  streamingEnabled: boolean;
}

// ==================== PERFORMANCE ====================

export interface PerformanceConfig {
  // Rendering
  enableVirtualization: boolean;
  renderBufferSize: number;
  
  // Batching
  batchUpdates: boolean;
  batchSize: number;
  batchDebounce: number;
  
  // Optimistic updates (for backend mode)
  optimisticUpdates: boolean;
  
  // Caching
  enableFormatCache: boolean;
  
  // Transactions (undo/redo)
  enableTransactions: boolean;
}

// ==================== LIFECYCLE HOOKS ====================

export interface LifecycleHooks {
  // Initialization
  onInit?: () => void | Promise<void>;
  onMount?: (engine: any) => void; // Will be GridEngine
  onUnmount?: () => void;
  
  // Data Loading
  onBeforeDataLoad?: () => void | Promise<void>;
  onDataLoad?: (data: GridData) => void | GridData;
  onDataLoadError?: (error: Error) => void;
  
  // Rows
  onBeforeRowAdd?: (row: Partial<GridRow>) => Partial<GridRow> | false;
  onRowAdd?: (row: GridRow) => void;
  onBeforeRowUpdate?: (rowId: string, changes: Partial<GridRow>) => Partial<GridRow> | false;
  onRowUpdate?: (row: GridRow) => void;
  onBeforeRowDelete?: (rowId: string) => boolean;
  onRowDelete?: (rowId: string) => void;
  onRowAction?: (rowIndex: number, actionId: string) => void; // Generic row action hook
  
  // Columns
  onBeforeColumnAdd?: (column: Partial<GridColumn>) => Partial<GridColumn> | false;
  onColumnAdd?: (column: GridColumn) => void;
  onBeforeColumnUpdate?: (columnId: string, changes: Partial<GridColumn>) => Partial<GridColumn> | false;
  onColumnUpdate?: (column: GridColumn) => void;
  onBeforeColumnDelete?: (columnId: string) => boolean;
  onColumnDelete?: (columnId: string) => void;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnReorder?: (columnId: string, oldIndex: number, newIndex: number) => void;
  onColumnPin?: (columnId: string, pin: 'left' | 'right' | null) => void;
  onColumnAction?: (columnId: string, actionId: string) => void;
  
  // Cells
  onBeforeCellEdit?: (rowIndex: number, columnId: string) => boolean;
  onCellEditStart?: (rowIndex: number, columnId: string, value: CellValue) => void;
  onCellEditEnd?: (rowIndex: number, columnId: string, value: CellValue) => void;
  onBeforeCellChange?: (change: CellChange) => CellValue | false;
  onCellChange?: (change: CellChange) => void;
  onCellValidate?: (change: CellChange) => ValidationResult;
  
  // Sorting
  onBeforeSort?: (sortState: ColumnSort[]) => ColumnSort[] | false;
  onSort?: (sortState: ColumnSort[]) => void;
  
  // Selection
  onSelectionChange?: (selection: GridSelection) => void;
  
  // Performance
  onRenderStart?: () => void;
  onRenderEnd?: (stats: RenderStats) => void;
  
  // Errors
  onError?: (error: GridError) => void;
}

// ==================== UI CONFIG ====================

export interface UIConfig {
  // Theme
  theme: Partial<GridTheme>;
  
  // Modals
  confirmDelete: boolean;
  
  // Context menus
  enableContextMenus: boolean;
  customContextMenus?: {
    cell?: (position: { row: number; col: string }) => MenuItem[];
    column?: (columnId: string) => MenuItem[];
    row?: (rowIndex: number) => MenuItem[];
  };
  
  // Tooltips
  showErrorTooltips: boolean;
  showCellTooltips: boolean;
  customTooltip?: (cell: any, column: GridColumn) => string | null;
}

// ==================== DEFAULT CONFIGS ====================

export const DEFAULT_CONFIG: GridConfig = {
  dataSource: {
    mode: 'local',
  },
  features: {
    columns: {
      allowResize: true,
      allowReorder: true,
      allowHide: true,
      allowDelete: true,
      allowAdd: true,
      allowRename: true,
      allowPin: true,
      allowGroups: false,
      minWidth: 50,
      maxWidth: 600,
      defaults: {
        visible: true,
      },
    },
    rows: {
      allowAdd: true,
      allowDelete: true,
      allowReorder: false,
      allowBulkDelete: true,
      allowBulkUpdate: true,
      rowHeight: 32,
      allowVariableHeight: false,
      allowMultiSelect: true,
      bufferSize: 2,
    },
    cells: {
      enabled: true,
      mode: 'doubleClick',
      startEditOnType: false,
      validateOnChange: true,
      validateOnBlur: true,
      autoSave: false,
      autoSaveDebounce: 1000,
    },
    sorting: {
      mode: 'local',
      multiColumn: false,
      strategy: 'indices',
      debounceMs: 300,
    },
    selection: {
      mode: 'multi',
      allowRanges: true,
    },
    ai: {
      enabled: true,
      streamingEnabled: true,
    },
  },
  performance: {
    enableVirtualization: true,
    renderBufferSize: 2,
    batchUpdates: true,
    batchSize: 100,
    batchDebounce: 50,
    optimisticUpdates: false,
    enableFormatCache: true,
    enableTransactions: false,
  },
  lifecycle: {},
  ui: {
    theme: {},
    confirmDelete: true,
    enableContextMenus: true,
    showErrorTooltips: true,
    showCellTooltips: false,
  },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Merges user config with defaults
 */
export function mergeConfig(userConfig: Partial<GridConfig>): GridConfig {
  return {
    dataSource: {
      ...DEFAULT_CONFIG.dataSource,
      ...userConfig.dataSource,
    },
    features: {
      columns: {
        ...DEFAULT_CONFIG.features.columns,
        ...userConfig.features?.columns,
      },
      rows: {
        ...DEFAULT_CONFIG.features.rows,
        ...userConfig.features?.rows,
      },
      cells: {
        ...DEFAULT_CONFIG.features.cells,
        ...userConfig.features?.cells,
      },
      sorting: {
        ...DEFAULT_CONFIG.features.sorting,
        ...userConfig.features?.sorting,
      },
      selection: {
        ...DEFAULT_CONFIG.features.selection,
        ...userConfig.features?.selection,
      },
      ai: {
        ...DEFAULT_CONFIG.features.ai,
        ...userConfig.features?.ai,
      },
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      ...userConfig.performance,
    },
    lifecycle: {
      ...DEFAULT_CONFIG.lifecycle,
      ...userConfig.lifecycle,
    },
    ui: {
      ...DEFAULT_CONFIG.ui,
      ...userConfig.ui,
    },
  };
}

/**
 * Validates config and returns errors
 */
export function validateConfig(config: GridConfig): string[] {
  const errors: string[] = [];
  
  // Data source validation
  if (config.dataSource.mode === 'backend' && !config.dataSource.endpoints && !config.dataSource.adapter) {
    errors.push('Backend mode requires either endpoints or custom adapter');
  }
  
  if (config.dataSource.mode === 'local' && !config.dataSource.initialData && !config.dataSource.adapter) {
    errors.push('Local mode requires initialData or custom adapter');
  }
  
  // Performance validation
  if (config.performance.batchSize < 1) {
    errors.push('Batch size must be at least 1');
  }
  
  if (config.features.columns.minWidth > config.features.columns.maxWidth) {
    errors.push('Column minWidth cannot be greater than maxWidth');
  }
  
  return errors;
}

