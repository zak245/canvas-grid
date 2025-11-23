# Unified Platform Architecture - Improved Plan

**Goal:** Build a robust, performant, extensible grid platform that supports local and backend modes, column management, inline editing, and row operations - all while maintaining 60fps with 500K rows.

---

## 🏗️ Core Architecture Improvements

### 1. Unified Configuration (`src/config/GridConfig.ts`)

```typescript
interface GridConfig {
  // Data Source
  dataSource: DataSourceConfig;
  
  // Features
  features: {
    columns: ColumnManagementConfig;
    rows: RowManagementConfig;
    cells: CellEditingConfig;
    sorting: SortingConfig;
    selection: SelectionConfig;
    ai: AIConfig;
  };
  
  // Performance
  performance: PerformanceConfig;
  
  // Lifecycle (unified - replaces separate events & hooks)
  lifecycle: LifecycleHooks;
  
  // UI/UX
  ui: UIConfig;
}

// ==================== DATA SOURCE ====================

interface DataSourceConfig {
  mode: 'local' | 'backend' | 'hybrid';
  
  // Local mode
  initialData?: {
    columns: GridColumn[];
    rows: GridRow[];
  };
  
  // Backend mode
  endpoints?: BackendEndpoints;
  
  // Custom adapter (overrides default)
  adapter?: DataAdapter;
  
  // Pagination (for backend)
  pagination?: {
    enabled: boolean;
    pageSize: number;
    serverSide: boolean;  // true = backend pagination, false = client-side
  };
  
  // Caching
  cache?: {
    enabled: boolean;
    ttl?: number;  // Time to live in ms
    strategy: 'memory' | 'indexeddb' | 'custom';
  };
}

interface BackendEndpoints {
  // Data
  fetchData: string;          // GET /api/grid/data?page=1&pageSize=50
  
  // Rows
  addRow: string;             // POST /api/grid/rows
  updateRow: string;          // PATCH /api/grid/rows/:id
  deleteRow: string;          // DELETE /api/grid/rows/:id
  bulkUpdateRows: string;     // PATCH /api/grid/rows/bulk
  
  // Columns
  addColumn: string;          // POST /api/grid/columns
  updateColumn: string;       // PATCH /api/grid/columns/:id
  deleteColumn: string;       // DELETE /api/grid/columns/:id
  reorderColumns: string;     // POST /api/grid/columns/reorder
  
  // Cells
  updateCell: string;         // PATCH /api/grid/cells
  bulkUpdateCells: string;    // PATCH /api/grid/cells/bulk
  
  // Operations
  sort: string;               // POST /api/grid/sort
  filter: string;             // POST /api/grid/filter
}

// ==================== COLUMN MANAGEMENT ====================

interface ColumnManagementConfig {
  // Basic operations
  allowResize: boolean;       // Default: true
  allowReorder: boolean;      // Default: true
  allowHide: boolean;         // Default: true
  allowDelete: boolean;       // Default: true
  allowAdd: boolean;          // Default: true
  allowRename: boolean;       // Default: true
  
  // Advanced operations
  allowPin: boolean;          // Default: true
  allowGroups: boolean;       // Default: false (Phase 4)
  
  // Constraints
  minWidth: number;           // Default: 50
  maxWidth: number;           // Default: 600
  
  // Templates
  templates?: Record<string, Partial<GridColumn>>;
  
  // Defaults for new columns
  defaults: Partial<GridColumn>;
}

// ==================== ROW MANAGEMENT ====================

interface RowManagementConfig {
  // Basic operations
  allowAdd: boolean;          // Default: true
  allowDelete: boolean;       // Default: true
  allowReorder: boolean;      // Default: false (heavy operation)
  
  // Bulk operations
  allowBulkDelete: boolean;   // Default: true
  allowBulkUpdate: boolean;   // Default: true
  
  // Row height
  rowHeight: number;          // Default: 32
  allowVariableHeight: boolean;  // Default: false (performance)
  
  // Row selection
  allowMultiSelect: boolean;  // Default: true
  
  // Virtual scrolling
  bufferSize: number;         // Default: 2 (rows above/below viewport)
}

// ==================== CELL EDITING ====================

interface CellEditingConfig {
  // Inline editing
  enabled: boolean;           // Default: true
  mode: 'click' | 'doubleClick' | 'manual';  // Default: 'doubleClick'
  
  // Edit triggers
  startEditOnType: boolean;   // Default: false
  
  // Validation
  validateOnChange: boolean;  // Default: true
  validateOnBlur: boolean;    // Default: true
  
  // Auto-save
  autoSave: boolean;          // Default: false
  autoSaveDebounce: number;   // Default: 1000ms
  
  // Editors (custom editors per type)
  customEditors?: Record<CellType, CellEditor>;
}

// ==================== SORTING ====================

interface SortingConfig {
  mode: 'local' | 'backend' | 'hybrid';
  
  // Multi-column sort
  multiColumn: boolean;       // Default: false (enable in Phase 4)
  maxSortColumns?: number;    // Default: 3
  
  // Performance
  strategy: 'copy' | 'indices';  // 'indices' for large datasets
  
  // Custom comparators
  comparators?: Record<CellType, ComparatorFn>;
  
  // Debounce for backend
  debounceMs: number;         // Default: 300
}

// ==================== PERFORMANCE ====================

interface PerformanceConfig {
  // Rendering
  enableVirtualization: boolean;  // Default: true
  renderBufferSize: number;       // Default: 2
  
  // Batching
  batchUpdates: boolean;          // Default: true
  batchSize: number;              // Default: 100
  batchDebounce: number;          // Default: 50ms
  
  // Optimistic updates (for backend mode)
  optimisticUpdates: boolean;     // Default: true
  
  // Caching
  enableFormatCache: boolean;     // Default: true
  
  // Transaction support
  enableTransactions: boolean;    // Default: false (Phase 3)
}

// ==================== LIFECYCLE HOOKS ====================

interface LifecycleHooks {
  // Initialization
  onInit?: () => void | Promise<void>;
  onMount?: (engine: GridEngine) => void;
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
  onBeforeRowDelete?: (rowId: string) => boolean;  // return false to cancel
  onRowDelete?: (rowId: string) => void;
  
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
  
  // Cells
  onBeforeCellEdit?: (rowIndex: number, columnId: string) => boolean;
  onCellEditStart?: (rowIndex: number, columnId: string, value: CellValue) => void;
  onCellEditEnd?: (rowIndex: number, columnId: string, value: CellValue) => void;
  onBeforeCellChange?: (change: CellChange) => CellValue | false;  // return false to cancel
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

interface UIConfig {
  theme: Partial<GridTheme>;
  
  // Modals
  confirmDelete: boolean;     // Default: true
  
  // Context menus
  enableContextMenus: boolean; // Default: true
  customContextMenus?: {
    cell?: (position: CellPosition) => MenuItem[];
    column?: (columnId: string) => MenuItem[];
    row?: (rowIndex: number) => MenuItem[];
  };
  
  // Tooltips
  showErrorTooltips: boolean;  // Default: true
  showCellTooltips: boolean;   // Default: false
  customTooltip?: (cell: GridCell, column: GridColumn) => string | null;
}
```

---

## 2. Enhanced Data Adapter (`src/adapters/DataAdapter.ts`)

```typescript
interface DataAdapter {
  // ===== DATA FETCHING =====
  fetchData(params: FetchParams): Promise<GridData>;
  
  // ===== ROW OPERATIONS =====
  addRow(row: Partial<GridRow>): Promise<GridRow>;
  updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow>;
  deleteRow(rowId: string): Promise<void>;
  bulkUpdateRows(updates: Array<{ rowId: string; changes: Partial<GridRow> }>): Promise<GridRow[]>;
  bulkDeleteRows(rowIds: string[]): Promise<void>;
  
  // ===== COLUMN OPERATIONS =====
  addColumn(column: GridColumn): Promise<GridColumn>;
  updateColumn(columnId: string, changes: Partial<GridColumn>): Promise<GridColumn>;
  deleteColumn(columnId: string): Promise<void>;
  reorderColumns(order: string[]): Promise<void>;
  resizeColumn(columnId: string, width: number): Promise<void>;
  hideColumn(columnId: string): Promise<void>;
  pinColumn(columnId: string, pin: 'left' | 'right' | null): Promise<void>;
  
  // ===== CELL OPERATIONS =====
  updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void>;
  bulkUpdateCells(updates: CellUpdate[]): Promise<void>;
  
  // ===== SORTING & FILTERING =====
  sort(sortState: ColumnSort[]): Promise<GridData | void>;
  filter(filterState: ColumnFilter[]): Promise<GridData | void>;
  
  // ===== METADATA =====
  getColumnSchema(): Promise<GridColumn[]>;
  getRowCount(): Promise<number>;
}

// ===== LOCAL ADAPTER =====

class LocalAdapter implements DataAdapter {
  private data: GridData;
  private sortIndices: number[] | null = null;  // Virtual sort
  private filterIndices: number[] | null = null;  // Virtual filter
  
  constructor(initialData: GridData) {
    this.data = initialData;
  }
  
  // Row operations
  async addRow(row: Partial<GridRow>): Promise<GridRow> {
    const newRow: GridRow = {
      id: row.id || `row_${Date.now()}`,
      cells: row.cells || new Map(),
      height: row.height
    };
    this.data.rows.push(newRow);
    this.invalidateIndices();
    return newRow;
  }
  
  async updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow> {
    const row = this.data.rows.find(r => r.id === rowId);
    if (!row) throw new Error(`Row ${rowId} not found`);
    
    Object.assign(row, changes);
    return row;
  }
  
  async deleteRow(rowId: string): Promise<void> {
    this.data.rows = this.data.rows.filter(r => r.id !== rowId);
    this.invalidateIndices();
  }
  
  async bulkUpdateCells(updates: CellUpdate[]): Promise<void> {
    // Group by row for efficiency
    const updatesByRow = new Map<string, CellUpdate[]>();
    updates.forEach(update => {
      const row = this.data.rows[update.rowIndex];
      if (!row) return;
      
      if (!updatesByRow.has(row.id)) {
        updatesByRow.set(row.id, []);
      }
      updatesByRow.get(row.id)!.push(update);
    });
    
    // Apply updates
    updatesByRow.forEach((rowUpdates, rowId) => {
      const row = this.data.rows.find(r => r.id === rowId);
      if (!row) return;
      
      rowUpdates.forEach(update => {
        row.cells.set(update.columnId, {
          value: update.value,
          // ... validation happens here
        });
      });
    });
  }
  
  // PERFORMANCE: Virtual sorting with indices
  async sort(sortState: ColumnSort[]): Promise<void> {
    if (sortState.length === 0) {
      this.sortIndices = null;
      return;
    }
    
    // Create array of indices
    this.sortIndices = Array.from({ length: this.data.rows.length }, (_, i) => i);
    
    // Sort indices, not rows
    this.sortIndices.sort((aIdx, bIdx) => {
      const rowA = this.data.rows[aIdx];
      const rowB = this.data.rows[bIdx];
      
      for (const sort of sortState) {
        const column = this.data.columns.find(c => c.id === sort.columnId);
        if (!column) continue;
        
        const aVal = rowA.cells.get(column.id)?.value;
        const bVal = rowB.cells.get(column.id)?.value;
        
        const result = this.compare(aVal, bVal, column.type);
        
        if (result !== 0) {
          return sort.direction === 'asc' ? result : -result;
        }
      }
      return 0;
    });
  }
  
  // Get row by virtual index (handles sorting/filtering)
  getRowByIndex(index: number): GridRow | undefined {
    if (this.sortIndices) {
      const actualIndex = this.sortIndices[index];
      return this.data.rows[actualIndex];
    }
    return this.data.rows[index];
  }
  
  private compare(a: any, b: any, type: CellType): number {
    // Type-specific comparison
    // ... implementation
  }
  
  private invalidateIndices() {
    // Recalculate sort/filter indices
    // ... implementation
  }
  
  // ... other methods
}

// ===== BACKEND ADAPTER =====

class BackendAdapter implements DataAdapter {
  private endpoints: BackendEndpoints;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number;
  
  constructor(endpoints: BackendEndpoints, cacheTTL: number = 60000) {
    this.endpoints = endpoints;
    this.cacheTTL = cacheTTL;
  }
  
  async fetchData(params: FetchParams): Promise<GridData> {
    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    
    const response = await fetch(this.endpoints.fetchData + this.buildQueryString(params));
    const data = await response.json();
    
    this.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
  
  async bulkUpdateCells(updates: CellUpdate[]): Promise<void> {
    await fetch(this.endpoints.bulkUpdateCells, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });
    
    this.invalidateCache();
  }
  
  private buildQueryString(params: any): string {
    const query = new URLSearchParams(params);
    return `?${query.toString()}`;
  }
  
  private invalidateCache() {
    this.cache.clear();
  }
  
  // ... other methods
}

// ===== MOCK BACKEND ADAPTER (for POC) =====

class MockBackendAdapter implements DataAdapter {
  private localAdapter: LocalAdapter;
  private latency: number;  // Simulate network delay
  
  constructor(initialData: GridData, latency: number = 300) {
    this.localAdapter = new LocalAdapter(initialData);
    this.latency = latency;
  }
  
  private async simulateLatency<T>(fn: () => T): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, this.latency));
    return fn();
  }
  
  async fetchData(params: FetchParams): Promise<GridData> {
    console.log('[MockBackend] Fetching data:', params);
    return this.simulateLatency(() => this.localAdapter.fetchData(params));
  }
  
  async addRow(row: Partial<GridRow>): Promise<GridRow> {
    console.log('[MockBackend] Adding row:', row);
    return this.simulateLatency(() => this.localAdapter.addRow(row));
  }
  
  async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
    console.log('[MockBackend] Updating cell:', { rowIndex, columnId, value });
    return this.simulateLatency(() => this.localAdapter.updateCell(rowIndex, columnId, value));
  }
  
  async sort(sortState: ColumnSort[]): Promise<void> {
    console.log('[MockBackend] Sorting:', sortState);
    return this.simulateLatency(() => this.localAdapter.sort(sortState));
  }
  
  // ... other methods with logging + latency
}
```

---

## 3. Transaction System (`src/transactions/TransactionManager.ts`)

For undo/redo and batch operations:

```typescript
interface Transaction {
  id: string;
  operations: Operation[];
  timestamp: number;
}

interface Operation {
  type: 'cell:update' | 'row:add' | 'row:delete' | 'column:update' | /* ... */;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  data: any;
}

class TransactionManager {
  private history: Transaction[] = [];
  private currentIndex: number = -1;
  private maxHistory: number = 50;
  
  startTransaction(): string {
    const id = `txn_${Date.now()}`;
    this.currentTransaction = { id, operations: [], timestamp: Date.now() };
    return id;
  }
  
  addOperation(operation: Operation) {
    if (!this.currentTransaction) {
      throw new Error('No active transaction');
    }
    this.currentTransaction.operations.push(operation);
  }
  
  async commit(): Promise<void> {
    if (!this.currentTransaction) return;
    
    // Execute all operations
    for (const op of this.currentTransaction.operations) {
      await op.execute();
    }
    
    // Add to history
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(this.currentTransaction);
    this.currentIndex++;
    
    // Limit history size
    if (this.history.length > this.maxHistory) {
      this.history.shift();
      this.currentIndex--;
    }
    
    this.currentTransaction = null;
  }
  
  async undo(): Promise<void> {
    if (this.currentIndex < 0) return;
    
    const transaction = this.history[this.currentIndex];
    
    // Undo in reverse order
    for (let i = transaction.operations.length - 1; i >= 0; i--) {
      await transaction.operations[i].undo();
    }
    
    this.currentIndex--;
  }
  
  async redo(): Promise<void> {
    if (this.currentIndex >= this.history.length - 1) return;
    
    this.currentIndex++;
    const transaction = this.history[this.currentIndex];
    
    // Redo in forward order
    for (const op of transaction.operations) {
      await op.execute();
    }
  }
  
  canUndo(): boolean {
    return this.currentIndex >= 0;
  }
  
  canRedo(): boolean {
    return this.currentIndex < this.history.length - 1;
  }
}
```

---

## 4. Optimistic Update Manager (`src/optimistic/OptimisticUpdateManager.ts`)

Makes backend mode feel instant:

```typescript
class OptimisticUpdateManager {
  private pendingUpdates: Map<string, PendingUpdate> = new Map();
  
  async applyOptimistically<T>(
    id: string,
    optimisticUpdate: () => void,
    backendCall: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // Apply optimistic update immediately
    optimisticUpdate();
    
    this.pendingUpdates.set(id, {
      id,
      timestamp: Date.now(),
      optimisticUpdate,
      status: 'pending'
    });
    
    try {
      // Make backend call
      const result = await backendCall();
      
      // Success
      this.pendingUpdates.delete(id);
      onSuccess?.(result);
      
    } catch (error) {
      // Revert optimistic update
      this.revert(id);
      this.pendingUpdates.delete(id);
      onError?.(error as Error);
    }
  }
  
  private revert(id: string) {
    // Revert logic - depends on operation type
    // Could use transaction system here
  }
}
```

---

## 5. Updated GridEngine Integration

```typescript
class GridEngine {
  public model: GridModel;
  public viewport: Viewport;
  public renderer: CanvasRenderer;
  public store: StoreApi<GridEngineState>;
  public theme: GridTheme;
  
  // NEW: Platform components
  private config: GridConfig;
  private adapter: DataAdapter;
  private transactions?: TransactionManager;
  private optimistic?: OptimisticUpdateManager;
  private lifecycle: LifecycleHooks;
  
  constructor(config: GridConfig) {
    this.config = config;
    this.lifecycle = config.lifecycle;
    
    // Initialize adapter
    this.adapter = this.initializeAdapter(config.dataSource);
    
    // Initialize optional components
    if (config.performance.enableTransactions) {
      this.transactions = new TransactionManager();
    }
    
    if (config.performance.optimisticUpdates && config.dataSource.mode !== 'local') {
      this.optimistic = new OptimisticUpdateManager();
    }
    
    // Call lifecycle hook
    this.lifecycle.onInit?.();
    
    // ... existing initialization
  }
  
  private initializeAdapter(dataSourceConfig: DataSourceConfig): DataAdapter {
    // Custom adapter
    if (dataSourceConfig.adapter) {
      return dataSourceConfig.adapter;
    }
    
    // Local mode
    if (dataSourceConfig.mode === 'local') {
      return new LocalAdapter(dataSourceConfig.initialData!);
    }
    
    // Backend mode
    return new BackendAdapter(dataSourceConfig.endpoints!);
  }
  
  // ===== PUBLIC API =====
  
  async addRow(row: Partial<GridRow>): Promise<GridRow> {
    // Before hook
    const processedRow = this.lifecycle.onBeforeRowAdd?.(row);
    if (processedRow === false) return;  // Cancelled
    
    const rowToAdd = processedRow || row;
    
    // Transaction
    if (this.transactions) {
      this.transactions.startTransaction();
    }
    
    // Optimistic update
    if (this.optimistic && this.config.dataSource.mode === 'backend') {
      let tempRow: GridRow;
      
      await this.optimistic.applyOptimistically(
        `addRow_${Date.now()}`,
        () => {
          // Optimistic: Add to model immediately
          tempRow = this.model.addRow(rowToAdd);
        },
        () => this.adapter.addRow(rowToAdd),
        (result) => {
          // Success: Replace temp row with real row from backend
          this.model.replaceRow(tempRow.id, result);
          this.lifecycle.onRowAdd?.(result);
        },
        (error) => {
          // Error: Remove temp row
          this.model.deleteRow(tempRow.id);
          this.lifecycle.onError?.({ type: 'row:add', message: error.message });
        }
      );
      
      return tempRow;
    }
    
    // Normal flow (local or no optimistic)
    const newRow = await this.adapter.addRow(rowToAdd);
    this.model.addRow(newRow);
    
    // After hook
    this.lifecycle.onRowAdd?.(newRow);
    
    return newRow;
  }
  
  async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
    // Before hook (validation)
    const validationResult = this.lifecycle.onCellValidate?.({
      rowIndex,
      columnId,
      value,
      oldValue: this.model.getCell(rowIndex, columnId)?.value
    });
    
    if (validationResult && !validationResult.valid) {
      // Show error
      return;
    }
    
    // Batch updates if enabled
    if (this.config.performance.batchUpdates) {
      this.batchQueue.push({ rowIndex, columnId, value });
      this.scheduleBatchFlush();
      return;
    }
    
    // Immediate update
    await this.adapter.updateCell(rowIndex, columnId, value);
    this.model.setCellValue(rowIndex, columnId, value);
    
    this.lifecycle.onCellChange?.({ rowIndex, columnId, value });
  }
  
  async sort(columnId: string): Promise<void> {
    const newSortState = this.toggleSortState(columnId);
    
    // Before hook
    const processedSort = this.lifecycle.onBeforeSort?.(newSortState);
    if (processedSort === false) return;  // Cancelled
    
    const sortToApply = processedSort || newSortState;
    
    // Execute sort
    if (this.config.features.sorting.mode === 'backend') {
      // Backend sort
      await this.adapter.sort(sortToApply);
      const newData = await this.adapter.fetchData({});
      this.model.setRows(newData.rows);
    } else {
      // Local sort (virtual with indices)
      await this.adapter.sort(sortToApply);
    }
    
    // Update state
    this.model.setSortState(sortToApply);
    
    // After hook
    this.lifecycle.onSort?.(sortToApply);
  }
  
  // ... other methods
}
```

---

## 6. Implementation Roadmap

### Phase 1: Platform Foundation (Week 1-2) ✅ HIGH PRIORITY

**Files to create:**
1. `src/config/GridConfig.ts` - All config interfaces
2. `src/adapters/DataAdapter.ts` - Adapter interface
3. `src/adapters/LocalAdapter.ts` - Local implementation with virtual sorting
4. `src/adapters/MockBackendAdapter.ts` - Mock backend for POC
5. `src/types/platform.ts` - Platform types (FetchParams, CellUpdate, etc.)

**Files to modify:**
1. `src/engine/GridEngine.ts` - Integrate config system
2. `src/engine/GridModel.ts` - Add row operations, sort state

**Tests:**
- LocalAdapter with virtual sorting (500K rows)
- MockBackendAdapter with latency simulation
- Lifecycle hooks invocation order

---

### Phase 2: Row Operations (Week 2-3) ✅ HIGH PRIORITY

**Features:**
- Add row (inline + modal)
- Delete row (selected rows)
- Bulk operations
- Row selection UI

**Files:**
1. `src/components/RowActions.tsx` - Add/delete row buttons
2. `src/components/RowContextMenu.tsx` - Right-click menu
3. Update `GridModel` with row CRUD

---

### Phase 3: Inline Editing (Week 3-4) ✅ HIGH PRIORITY

**Features:**
- Double-click to edit
- Type-specific editors (text input, number input, date picker, checkbox, dropdown)
- Tab/Enter navigation
- Auto-save
- Validation on blur

**Files:**
1. `src/editors/CellEditorManager.ts` - Manages active editor
2. `src/editors/TextEditor.tsx`
3. `src/editors/NumberEditor.tsx`
4. `src/editors/DateEditor.tsx`
5. `src/editors/BooleanEditor.tsx`
6. Update `GridEngine` to handle edit state

**State:**
```typescript
interface GridEngineState {
  // ... existing
  editingCell: { row: number; col: string; editor: CellEditor } | null;
  editorPosition: { x: number; y: number; width: number; height: number } | null;
}
```

---

### Phase 4: Column Management (Week 4-5)

**Features (from columns.md):**
- Resize (drag border)
- Reorder (drag header)
- Hide/show (context menu)
- Delete (context menu + confirm)
- Rename (double-click title)
- Pin left/right

**Files:**
1. `src/components/ColumnHeader.tsx` - Enhanced with interactions
2. `src/components/ColumnContextMenu.tsx` - Full context menu
3. `src/components/ColumnResizeHandle.tsx` - Resize drag handle
4. `src/handlers/ColumnDragHandler.ts` - Reorder logic

---

### Phase 5: Sorting (Week 5)

**Features:**
- Click header to sort
- Visual indicator (▲/▼)
- Multi-column sort (Shift+Click)
- Local + backend modes

**Files:**
1. `src/sorting/LocalSorter.ts` - Virtual sorting
2. Update `LocalAdapter` with sorting
3. Update `ColumnHeader` with sort UI

---

### Phase 6: Optimizations (Week 6)

**Features:**
- Optimistic updates
- Transaction system (undo/redo)
- Batch operations
- Performance monitoring

**Files:**
1. `src/optimistic/OptimisticUpdateManager.ts`
2. `src/transactions/TransactionManager.ts`
3. `src/performance/PerformanceMonitor.ts`

---

## 7. Mock Backend Implementation

Create a simple Express server for POC:

```typescript
// mock-backend/server.ts

import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage
let columns: GridColumn[] = [...]; // Load from mockData
let rows: GridRow[] = [...];
let sortState: ColumnSort[] = [];

// Fetch data
app.get('/api/grid/data', (req, res) => {
  const { page = 1, pageSize = 50 } = req.query;
  
  // Apply sorting
  let sortedRows = applySorting(rows, sortState);
  
  // Paginate
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedRows = sortedRows.slice(start, end);
  
  res.json({
    columns,
    rows: paginatedRows,
    totalRows: rows.length,
    page,
    pageSize
  });
});

// Add row
app.post('/api/grid/rows', (req, res) => {
  const newRow = {
    id: `row_${Date.now()}`,
    cells: new Map(),
    ...req.body
  };
  rows.push(newRow);
  res.json(newRow);
});

// Update cell
app.patch('/api/grid/cells', (req, res) => {
  const { rowIndex, columnId, value } = req.body;
  const row = rows[rowIndex];
  if (row) {
    row.cells.set(columnId, { value });
  }
  res.sendStatus(200);
});

// Bulk update cells
app.patch('/api/grid/cells/bulk', (req, res) => {
  const { updates } = req.body;
  updates.forEach(({ rowIndex, columnId, value }) => {
    const row = rows[rowIndex];
    if (row) {
      row.cells.set(columnId, { value });
    }
  });
  res.sendStatus(200);
});

// Sort
app.post('/api/grid/sort', (req, res) => {
  sortState = req.body.sort;
  res.sendStatus(200);
});

// Delete column
app.delete('/api/grid/columns/:id', (req, res) => {
  const { id } = req.params;
  columns = columns.filter(c => c.id !== id);
  rows.forEach(row => row.cells.delete(id));
  res.sendStatus(200);
});

app.listen(3001, () => {
  console.log('Mock backend running on http://localhost:3001');
});
```

---

## 8. Example Usage

```typescript
// Local mode
const gridLocal = new GridEngine({
  dataSource: {
    mode: 'local',
    initialData: generateMockData(500000)
  },
  features: {
    columns: {
      allowResize: true,
      allowReorder: true,
      allowDelete: true,
      defaults: { editable: true, sortable: true }
    },
    rows: {
      allowAdd: true,
      allowDelete: true
    },
    cells: {
      enabled: true,
      mode: 'doubleClick',
      autoSave: false
    },
    sorting: {
      mode: 'local',
      strategy: 'indices',  // Virtual sorting
      multiColumn: false
    }
  },
  performance: {
    enableVirtualization: true,
    batchUpdates: true,
    optimisticUpdates: false  // Not needed for local
  },
  lifecycle: {
    onCellChange: (change) => {
      console.log('Cell changed:', change);
    },
    onRowAdd: (row) => {
      console.log('Row added:', row);
    }
  }
});

// Backend mode with mock
const gridBackend = new GridEngine({
  dataSource: {
    mode: 'backend',
    adapter: new MockBackendAdapter(generateMockData(500000), 300),  // 300ms latency
    pagination: {
      enabled: true,
      pageSize: 50,
      serverSide: true
    }
  },
  features: {
    /* same as above */
  },
  performance: {
    enableVirtualization: true,
    batchUpdates: true,
    batchSize: 100,
    batchDebounce: 50,
    optimisticUpdates: true  // Makes backend feel instant
  },
  lifecycle: {
    onBeforeCellChange: (change) => {
      // Custom validation
      if (change.columnId === 'email') {
        const result = validateEmail(change.value);
        if (!result.valid) {
          return false;  // Cancel change
        }
      }
    },
    onError: (error) => {
      console.error('Grid error:', error);
      // Show toast notification
    }
  }
});
```

---

## 9. Key Improvements Over Original Plan

1. **Unified Lifecycle Hooks** - No separate events + hooks (less confusion)
2. **Virtual Sorting** - Handles 500K rows without performance hit
3. **Optimistic Updates** - Backend feels instant
4. **Transaction System** - Foundation for undo/redo
5. **Batch Operations** - Prevents thrashing
6. **Mock Backend Adapter** - Easy POC testing
7. **Row Operations** - Complete CRUD
8. **Inline Editing Config** - Type-specific editors
9. **Performance Config** - Fine-tune for use case
10. **Comprehensive Lifecycle** - Hook into everything

---

## 10. Testing Strategy

### Unit Tests
```typescript
describe('LocalAdapter', () => {
  it('should handle 500K rows with virtual sorting', async () => {
    const adapter = new LocalAdapter(generateMockData(500000));
    await adapter.sort([{ columnId: 'name', direction: 'asc' }]);
    
    // Should complete in < 200ms
    // Should not copy array (check memory)
  });
});

describe('OptimisticUpdateManager', () => {
  it('should revert on backend error', async () => {
    // ...
  });
});
```

### Integration Tests
```typescript
describe('GridEngine', () => {
  it('should add row with backend mode', async () => {
    const grid = new GridEngine({
      dataSource: { mode: 'backend', adapter: mockAdapter }
    });
    
    const row = await grid.addRow({ cells: new Map() });
    expect(mockAdapter.addRow).toHaveBeenCalled();
  });
});
```

---

## Next Steps

1. **Week 1:** Implement platform foundation (configs, adapters)
2. **Week 2:** Add row operations + tests
3. **Week 3:** Inline editing with type-specific editors
4. **Week 4:** Column management (resize, reorder, etc.)
5. **Week 5:** Sorting (local + backend)
6. **Week 6:** Optimizations + mock backend

**Start with:** `src/config/GridConfig.ts` and `src/adapters/LocalAdapter.ts`

Ready to begin implementation? 🚀

