Goal
Build a platform-level configuration framework that provides abstractions for developers to configure grid behavior (sorting, column management, data operations) with support for local (browser) and backend modes.

Proposed Changes
Core Architecture
1. Grid Configuration (src/config/GridConfig.ts)
Purpose: Central configuration object for grid behavior

interface DataSourceConfig {
  mode: 'local' | 'backend';
  
  // Local mode
  data?: { columns: GridColumn[]; rows: GridRow[] };
  
  // Backend mode
  endpoints?: {
    fetch?: string;          // GET /api/grid/data
    sort?: string;           // POST /api/grid/sort
    update?: string;         // PATCH /api/grid/cells
    deleteColumn?: string;   // DELETE /api/grid/columns/:id
  };
  
  // Adapter for custom backends
  adapter?: DataAdapter;
}
interface SortingConfig {
  mode: 'local' | 'backend' | 'hybrid';
  
  // Multi-column sort
  multiColumn?: boolean;
  
  // Custom comparators
  comparators?: Record<CellType, ComparatorFn>;
  
  // Backend sorting
  onSort?: (sortState: ColumnSort[]) => Promise<void>;
  
  // Debounce for backend requests
  debounceMs?: number;
}
2. Data Adapter Pattern (src/adapters/DataAdapter.ts)
Purpose: Abstract data operations for local vs backend

interface DataAdapter {
  // Fetch data
  fetchData(params: FetchParams): Promise<GridData>;
  
  // Sort
  sort(sortState: ColumnSort[]): Promise<GridData | void>;
  
  // Update cells
  updateCells(updates: CellUpdate[]): Promise<void>;
  
  // Column operations
  addColumn(column: GridColumn): Promise<void>;
  deleteColumn(columnId: string): Promise<void>;
  reorderColumns(order: string[]): Promise<void>;
}
class LocalAdapter implements DataAdapter {
  private data: GridData;
  
  async sort(sortState: ColumnSort[]): Promise<void> {
    // Sort in-memory using comparators
    this.data.rows = sortRows(this.data.rows, sortState);
  }
}
class BackendAdapter implements DataAdapter {
  constructor(private endpoints: EndpointConfig) {}
  
  async sort(sortState: ColumnSort[]): Promise<GridData> {
    const response = await fetch(this.endpoints.sort, {
      method: 'POST',
      body: JSON.stringify({ sort: sortState })
    });
    return response.json();
  }
}
3. Lifecycle Hooks (src/types/hooks.ts)
Purpose: Allow developers to hook into grid lifecycle

interface GridHooks {
  // Data
  onDataLoad?: (data: GridData) => void | GridData;
  onDataChange?: (changes: DataChange[]) => void;
  
  // Columns
  onColumnAdd?: (column: GridColumn) => void | GridColumn;
  onColumnDelete?: (columnId: string) => boolean; // return false to cancel
  onColumnResize?: (columnId: string, newWidth: number) => void;
  onColumnReorder?: (oldIndex: number, newIndex: number) => void;
  
  // Sorting
  onSortChange?: (sortState: ColumnSort[]) => void;
  
  // Cells
  onCellChange?: (cell: CellChange) => void | CellValue; // return new value or void
  onCellValidate?: (cell: CellChange) => ValidationResult;
  
  // Selection
  onSelectionChange?: (selection: GridSelection) => void;
}
4. Event System (src/events/GridEvents.ts)
Purpose: Emit events for developer consumption

type GridEventMap = {
  'data:loaded': { data: GridData };
  'data:changed': { changes: DataChange[] };
  'column:added': { column: GridColumn };
  'column:deleted': { columnId: string };
  'column:resized': { columnId: string; width: number };
  'sort:changed': { sortState: ColumnSort[] };
  'cell:changed': { rowIndex: number; columnId: string; value: CellValue };
  'selection:changed': { selection: GridSelection };
};
class GridEventEmitter {
  on<K extends keyof GridEventMap>(
    event: K,
    handler: (data: GridEventMap[K]) => void
  ): void;
  
  emit<K extends keyof GridEventMap>(
    event: K,
    data: GridEventMap[K]
  ): void;
}
5. Sorting Implementation
Local Sorting (src/sorting/LocalSorter.ts)
class LocalSorter {
  sort(
    rows: GridRow[],
    sortState: ColumnSort[],
    columns: GridColumn[]
  ): GridRow[] {
    return rows.slice().sort((a, b) => {
      for (const sort of sortState) {
        const column = columns.find(c => c.id === sort.columnId);
        if (!column) continue;
        
        const aVal = a.cells.get(column.id)?.value;
        const bVal = b.cells.get(column.id)?.value;
        
        const comparator = this.getComparator(column.type);
        const result = comparator(aVal, bVal);
        
        if (result !== 0) {
          return sort.direction === 'asc' ? result : -result;
        }
      }
      return 0;
    });
  }
  
  private getComparator(type: CellType): ComparatorFn {
    // Type-specific comparison logic
  }
}
Backend Sorting (src/sorting/BackendSorter.ts)
class BackendSorter {
  async sort(
    sortState: ColumnSort[],
    adapter: DataAdapter
  ): Promise<GridData> {
    return adapter.sort(sortState);
  }
}
Updated GridEngine Integration
class GridEngine {
  private config: GridConfig;
  private adapter: DataAdapter;
  private sorter: LocalSorter | BackendSorter;
  private events: GridEventEmitter;
  
  constructor(config: GridConfig) {
    this.config = config;
    
    // Initialize adapter
    this.adapter = config.dataSource.adapter || 
      (config.dataSource.mode === 'local' 
        ? new LocalAdapter(config.dataSource.data!)
        : new BackendAdapter(config.dataSource.endpoints!));
    
    // Initialize sorter
    this.sorter = config.sorting?.mode === 'backend'
      ? new BackendSorter()
      : new LocalSorter();
    
    // Initialize events
    this.events = new GridEventEmitter();
  }
  
  async sort(columnId: string): Promise<void> {
    // Toggle sort direction
    const newSortState = this.toggleSort(columnId);
    
    // Call hook
    this.config.hooks?.onSortChange?.(newSortState);
    
    // Execute sort
    if (this.config.sorting?.mode === 'backend') {
      const newData = await this.sorter.sort(newSortState, this.adapter);
      this.model.setRows(newData.rows);
    } else {
      const sortedRows = this.sorter.sort(
        this.model.getAllRows(),
        newSortState,
        this.model.getColumns()
      );
      this.model.setRows(sortedRows);
    }
    
    // Emit event
    this.events.emit('sort:changed', { sortState: newSortState });
  }
}
Example 1: Basic Local Grid
const grid = new GridEngine({
  dataSource: {
    mode: 'local',
    data: { columns, rows }
  },
  sorting: {
    mode: 'local',
    multiColumn: true
  }
});
Example 2: Backend Grid with Custom Adapter
const grid = new GridEngine({
  dataSource: {
    mode: 'backend',
    adapter: new CustomBackendAdapter({
      baseUrl: 'https://api.example.com',
      auth: { token: 'xxx' }
    })
  },
  sorting: {
    mode: 'backend',
    debounceMs: 300
  },
  hooks: {
    onSortChange: (sortState) => {
      console.log('Sort changed:', sortState);
    },
    onColumnDelete: (columnId) => {
      return confirm(`Delete column ${columnId}?`);
    }
  },
  events: {
    on: {
      'data:changed': (data) => {
        console.log('Data changed:', data);
      }
    }
  }
});
Example 3: Hooks for Validation
const grid = new GridEngine({
  dataSource: { mode: 'local', data },
  hooks: {
    onCellChange: (change) => {
      // Custom business logic
      if (change.columnId === 'email' && !isValidEmail(change.value)) {
        return change.oldValue; // Revert
      }
    },
    onCellValidate: (change) => {
      // Custom validation beyond type checking
      if (change.columnId === 'age' && change.value < 18) {
        return { valid: false, error: 'Must be 18+' };
      }
      return { valid: true };
    }
  }
});
Verification Plan
Unit Tests
Test LocalAdapter.sort() with various data types
Test BackendAdapter with mocked fetch
Test hooks invocation order
Test event emission
Integration Tests
Create grid with local config → sort → verify order
Create grid with backend config → sort → verify API call
Test hook cancellation (onColumnDelete returns false)
Manual Testing
Create example app with both local and backend modes
Toggle sort on columns
Verify events fire correctly
Implementation Phases
Phase 1: Core Framework (This PR)
[NEW] src/config/GridConfig.ts - Configuration interfaces
[NEW] src/adapters/DataAdapter.ts - Adapter pattern
[NEW] src/adapters/LocalAdapter.ts - Local implementation
[NEW] src/adapters/BackendAdapter.ts - Backend implementation
[NEW] src/types/hooks.ts - Hook types
[NEW] src/events/GridEventEmitter.ts - Event system
[NEW] src/sorting/LocalSorter.ts - Local sorting logic
[NEW] src/sorting/BackendSorter.ts - Backend sorting
[MODIFY] 
src/engine/GridEngine.ts
 - Integrate config system
Phase 2: Column Management Integration
Use config for column resize, reorder, delete
Call hooks for column operations
Emit events for column changes
Phase 3: Documentation & Examples
Developer guide for config
Example projects (local + backend)
Migration guide from old system
