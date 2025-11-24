import { createStore, StoreApi } from 'zustand/vanilla';
import { GridModel } from './GridModel';
import { Viewport } from './Viewport';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputController } from './InputController';
import { AIStreamer } from '../services/AIStreamer';
import type { GridSelection, GridTheme, GridRow, GridColumn, CellValue } from '../types/grid';
import type { GridConfig, LifecycleHooks } from '../config/GridConfig';
import type { DataAdapter } from '../adapters/DataAdapter';
import type { ColumnSort } from '../types/platform';
import { LocalAdapter } from '../adapters/LocalAdapter';
import { mergeConfig, validateConfig } from '../config/GridConfig';

export interface GridEngineState {
    selection: GridSelection | null;
    isDragging: boolean;
    isFilling: boolean;
    fillRange: GridSelection | null;
    hoverPosition: { x: number; y: number } | null;  // For tooltips
    editingCell: { col: number; row: number } | null;
    // NEW: Reorder State (Restored for Text Swapping)
    reorderState: {
        colIndex: number; // Index in visibleColumns
        dragX: number;    // Visual X position relative to canvas
        targetIndex: number; // Where it would drop
        dragOffset: number; // Offset of mouse within the column
    } | null;
    // NEW: Overlay State (Single Source of Truth)
    activeHeaderMenu: { colId: string, x: number, y: number } | null;
    activeAddColumnMenu: { x: number, y: number } | null;
    editingHeader: string | null;
    activeColumnSettings: string | null;
}

export class GridEngine {
    // Core components
    public model!: GridModel;
    public viewport!: Viewport;
    public store!: StoreApi<GridEngineState>;
    public theme!: GridTheme;

    // Platform components (NEW)
    private config: GridConfig | null = null;
    private adapter: DataAdapter | null = null;
    public lifecycle: LifecycleHooks = {};

    // Rendering
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private renderer: CanvasRenderer | null = null;
    private rafId: number | null = null;

    // Input
    private inputController: InputController | null = null;

    // AI
    public aiStreamer: AIStreamer | null = null;

    // Constructor overloads for backward compatibility
    constructor();
    constructor(config: Partial<GridConfig>);
    constructor(config?: Partial<GridConfig>) {
        if (config) {
            // NEW: Config-based initialization
            this.initWithConfig(config);
        } else {
            // OLD: Legacy initialization (backward compatible)
            this.initLegacy();
        }
    }

    // NEW: Config-based initialization
    private initWithConfig(userConfig: Partial<GridConfig>) {
        // Merge with defaults
        this.config = mergeConfig(userConfig);
        this.lifecycle = this.config.lifecycle;

        // Validate config
        const errors = validateConfig(this.config);
        if (errors.length > 0) {
            console.error('[GridEngine] Configuration errors:', errors);
            throw new Error(`Invalid configuration: ${errors.join(', ')}`);
        }

        // Initialize adapter
        this.adapter = this.initializeAdapter(this.config);

        // Initialize model with adapter
        this.model = new GridModel(this.adapter);

        // Initialize viewport
        this.viewport = new Viewport({
            width: 800,
            height: 600
        });

        // Initialize theme
        this.theme = {
            ...this.getDefaultTheme(),
            ...this.config.ui.theme,
        };

        // Initialize store
        this.store = createStore<GridEngineState>(() => ({
            selection: null,
            isDragging: false,
            isFilling: false,
            fillRange: null,
            hoverPosition: null,
            editingCell: null,
            reorderState: null,
            activeHeaderMenu: null,
            activeAddColumnMenu: null,
            editingHeader: null,
            activeColumnSettings: null,
        }));

        // Call initialization hook
        this.lifecycle.onInit?.();

        // Load initial data
        this.loadInitialData();
    }

    // OLD: Legacy initialization (backward compatible)
    private initLegacy() {
        this.model = new GridModel();
        this.viewport = new Viewport({
            width: 800,
            height: 600
        });

        this.theme = this.getDefaultTheme();

        this.store = createStore<GridEngineState>(() => ({
            selection: null,
            isDragging: false,
            isFilling: false,
            fillRange: null,
            hoverPosition: null,
            editingCell: null,
            reorderState: null,
            activeHeaderMenu: null,
            activeAddColumnMenu: null,
            editingHeader: null,
            activeColumnSettings: null,
        }));
    }

    // Initialize adapter based on config
    private initializeAdapter(config: GridConfig): DataAdapter {
        // Custom adapter
        if (config.dataSource.adapter) {
            return config.dataSource.adapter;
        }

        // Local mode
        if (config.dataSource.mode === 'local') {
            if (!config.dataSource.initialData) {
                throw new Error('Local mode requires initialData');
            }
            return new LocalAdapter(config.dataSource.initialData);
        }

        // Backend mode
        if (config.dataSource.mode === 'backend') {
            if (!config.dataSource.endpoints) {
                throw new Error('Backend mode requires endpoints or custom adapter');
            }
            // Note: BackendAdapter would be imported here
            // For now, throw error as it's not implemented yet
            throw new Error('BackendAdapter not implemented yet. Use MockBackendAdapter or custom adapter.');
        }

        throw new Error(`Unknown data source mode: ${config.dataSource.mode}`);
    }

    // Subscribe to model updates (used for React integration)
    public subscribeToDataChange(callback: () => void): () => void {
        // Create a temporary wrapper that we can call internally
        const wrappedCallback = () => callback();
        
        // Add to a list of subscribers
        this.dataChangeSubscribers.push(wrappedCallback);
        
        return () => {
            this.dataChangeSubscribers = this.dataChangeSubscribers.filter(cb => cb !== wrappedCallback);
        };
    }
    
    private dataChangeSubscribers: (() => void)[] = [];
    
    private notifyDataChange() {
        this.dataChangeSubscribers.forEach(cb => cb());
    }

    // Subscribe to sort changes (NEW)
    public subscribeToSortChange(callback: (sortState: ColumnSort[]) => void): () => void {
        const wrappedCallback = (sort: ColumnSort[]) => callback(sort);
        this.sortChangeSubscribers.push(wrappedCallback);
        return () => {
            this.sortChangeSubscribers = this.sortChangeSubscribers.filter(cb => cb !== wrappedCallback);
        };
    }

    private sortChangeSubscribers: ((sort: ColumnSort[]) => void)[] = [];

    private notifySortChange(sortState: ColumnSort[]) {
        this.sortChangeSubscribers.forEach(cb => cb(sortState));
    }

    // REMOVED: Header Menu and Add Column subscriptions (Moved to Store)


    // Load initial data from adapter
    private async loadInitialData() {
        if (!this.adapter) return;

        try {
            this.lifecycle.onBeforeDataLoad?.();

            const data = await this.adapter.fetchData({});

            // Allow lifecycle hook to transform data
            const processedData = this.lifecycle.onDataLoad?.(data) || data;

            this.model.setColumns(processedData.columns);
            this.model.setRows(processedData.rows);
            
            // Notify subscribers that data has changed
            this.notifyDataChange();

        } catch (error) {
            this.lifecycle.onDataLoadError?.(error as Error);
            this.lifecycle.onError?.({
                type: 'data:load',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
        }
    }

    // Default theme
    private getDefaultTheme(): GridTheme {
        return {
            headerHeight: 40,
            rowHeight: 32,
            rowHeaderWidth: 50,
            borderColor: '#e5e7eb',
            gridLineColor: 'rgba(0, 0, 0, 0.05)',
            headerBackgroundColor: '#f9fafb',
            selectionColor: 'rgba(59, 130, 246, 0.1)',
            selectionBorderColor: '#3b82f6',
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            headerFontFamily: 'Inter, sans-serif',
            headerFontSize: 12,
        };
    }

    // --- Initialization ---
    mount(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const ctx = canvas.getContext('2d', { alpha: false });
        this.ctx = ctx;

        if (this.ctx) {
            this.renderer = new CanvasRenderer(this, this.ctx);
        }
        this.inputController = new InputController(this);
        this.inputController.mount(canvas);
        this.aiStreamer = new AIStreamer(this);
        this.startLoop();
    }

    unmount() {
        this.stopLoop();
        if (this.inputController && this.canvas) {
            this.inputController.unmount(this.canvas);
            this.inputController = null;
        }
        this.canvas = null;
        this.ctx = null;
        this.renderer = null;
    }

    // --- Render Loop ---
    private startLoop() {
        if (this.rafId) return;
        const loop = () => {
            this.render();
            this.rafId = requestAnimationFrame(loop);
        };
        this.rafId = requestAnimationFrame(loop);
    }

    private stopLoop() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    private render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }

    // Helper to scroll to bottom
    private scrollToBottom() {
        const rowCount = this.model.getRowCount();
        const { height, scrollLeft } = this.viewport.getState();
        const { rowHeight, headerHeight } = this.theme;
        
        // Calculate total content height including the ghost row (+1)
        const totalHeight = (rowCount + 1) * rowHeight;
        
        // Calculate max scroll top (Content Height - Viewport Content Area)
        const viewportContentHeight = height - headerHeight;
        const maxScrollTop = Math.max(0, totalHeight - viewportContentHeight);
        
        this.scroll(maxScrollTop, scrollLeft);
    }

    // --- Actions ---
    resize(width: number, height: number) {
        this.viewport.updateState({ width, height });
        // Auto-close menus on resize
        this.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
    }

    scroll(scrollTop: number, scrollLeft: number) {
        this.viewport.updateState({ scrollTop, scrollLeft });
        // Auto-close menus on scroll
        this.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
    }

    // ===== NEW: PUBLIC API METHODS =====

    /**
     * Add a new row
     */
    async addRow(row: Partial<GridRow>): Promise<GridRow> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Before hook
        const processedRow = this.lifecycle.onBeforeRowAdd?.(row);
        if (processedRow === false) {
            throw new Error('Row addition cancelled by lifecycle hook');
        }

        const rowToAdd = processedRow || row;

        try {
            // Call adapter
            const newRow = await this.adapter.addRow(rowToAdd);

            // Update model
            this.model.addRow(newRow);

            // After hook
            this.lifecycle.onRowAdd?.(newRow);

            // Trigger render
            this.notifyDataChange();
            
            // Defer scrolling to ensure data is settled and UI is ready
            setTimeout(() => {
                this.scrollToBottom();
                this.render();
            }, 10);

            return newRow;
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'row:add',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Update an existing row
     */
    async updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Before hook
        const processedChanges = this.lifecycle.onBeforeRowUpdate?.(rowId, changes);
        if (processedChanges === false) {
            throw new Error('Row update cancelled by lifecycle hook');
        }

        const changesToApply = processedChanges || changes;

        try {
            // Call adapter
            const updatedRow = await this.adapter.updateRow(rowId, changesToApply);

            // Update model
            this.model.updateRow(updatedRow);

            // After hook
            this.lifecycle.onRowUpdate?.(updatedRow);

            return updatedRow;
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'row:update',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Delete a row
     */
    async deleteRow(rowId: string): Promise<void> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Before hook
        const shouldDelete = this.lifecycle.onBeforeRowDelete?.(rowId);
        if (shouldDelete === false) {
            return; // Cancelled
        }

        try {
            // Call adapter
            await this.adapter.deleteRow(rowId);

            // Update model
            this.model.deleteRow(rowId);

            // After hook
            this.lifecycle.onRowDelete?.(rowId);
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'row:delete',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Update a single cell
     */
    async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        const oldValue = this.model.getCell(rowIndex, columnId)?.value;

        // Validation hook
        const validationResult = this.lifecycle.onCellValidate?.({
            rowIndex,
            columnId,
            value,
            oldValue,
        });

        if (validationResult && !validationResult.valid) {
            throw new Error(validationResult.error || 'Cell validation failed');
        }

        // Before hook
        const processedValue = this.lifecycle.onBeforeCellChange?.({
            rowIndex,
            columnId,
            value,
            oldValue,
        });

        if (processedValue === false) {
            return; // Cancelled
        }

        const valueToSet = processedValue !== undefined ? processedValue : value;

        try {
            // Call adapter
            await this.adapter.updateCell(rowIndex, columnId, valueToSet);

            // Update model
            this.model.setCellValue(rowIndex, columnId, valueToSet);

            // After hook
            this.lifecycle.onCellChange?.({
                rowIndex,
                columnId,
                value: valueToSet,
                oldValue,
            });
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'cell:update',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Sort by column
     */
    async sort(columnId: string, direction?: 'asc' | 'desc'): Promise<void> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        let newSortState: ColumnSort[];

        if (direction) {
            // Explicit direction from menu
            newSortState = [{ columnId, direction }];
        } else {
            // Toggle sort state (click on header)
            const currentSort = this.model.getSortState();
            if (currentSort && currentSort[0]?.columnId === columnId) {
                // Toggle direction
                if (currentSort[0].direction === 'asc') {
                    newSortState = [{ columnId, direction: 'desc' }];
                } else {
                    newSortState = []; // Clear sort
                }
            } else {
                newSortState = [{ columnId, direction: 'asc' }];
            }
        }

        // Before hook
        const processedSort = this.lifecycle.onBeforeSort?.(newSortState);
        if (processedSort === false) {
            return; // Cancelled
        }

        const sortToApply = processedSort || newSortState;

        try {
            // Call adapter
            await this.adapter.sort(sortToApply);

            // Update model sort state
            this.model.setSortState(sortToApply);

            // Notify subscribers (React UI)
            this.notifySortChange(sortToApply);

            // For local mode, we need to re-fetch data to get sorted rows
            if (this.config?.dataSource.mode === 'local') {
                const data = await this.adapter.fetchData({});
                this.model.setRows(data.rows);
                
                // Notify data change to re-render rows
                this.notifyDataChange();
            }

            // After hook
            this.lifecycle.onSort?.(sortToApply);
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'sort',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Set column visibility
     */
    setColumnVisibility(columnId: string, visible: boolean) {
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        columns[colIndex].visible = visible;
        this.model.setColumns([...columns]); // Trigger update
        
        // Recalculate Ghost Menu Position if open
        const { activeAddColumnMenu } = this.store.getState();
        if (activeAddColumnMenu && this.canvas) {
             const visibleCols = this.model.getVisibleColumns();
             const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
             const { scrollLeft } = this.viewport.getState();
             const { rowHeaderWidth } = this.theme;
             
             const rect = this.canvas.getBoundingClientRect();
             
             // Visual X on Canvas = rowHeaderWidth - scrollLeft + totalWidth
             const ghostVisualX = rowHeaderWidth - scrollLeft + totalWidth;
             const ghostScreenX = rect.left + ghostVisualX;
             
             // Align menu (same logic as MouseHandler)
             const MENU_WIDTH = 300;
             let menuX = ghostScreenX;
             if (menuX + MENU_WIDTH > window.innerWidth) {
                menuX = window.innerWidth - MENU_WIDTH - 10;
             }
             
             // Keep Y same
             this.store.setState({
                 activeAddColumnMenu: { x: menuX, y: activeAddColumnMenu.y }
             });
        }
        
        this.notifyDataChange(); // Notify React to update headers
        this.render(); // Re-render canvas
    }

    /**
     * Resize a column
     */
    async resizeColumn(columnId: string, width: number): Promise<void> {
        // Validation
        if (width < 50) width = 50; // Min width
        if (width > 2000) width = 2000; // Max width

        // Update model
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        // Create a new column object to trigger updates if we used immutable patterns
        // But here we mutate the object for performance, then notify
        columns[colIndex].width = width;
        
        // Notify UI (headers need to move)
        this.model.setColumns([...columns]);
        
        // Trigger render to update grid lines
        this.render();
    }

    /**
     * Auto-resize column to fit content
     */
    async autoResizeColumn(columnId: string): Promise<void> {
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        const column = columns[colIndex];
        const rows = this.model.getAllRows();
        
        // 1. Measure Header
        // Approximation: 8px per char + padding (roughly)
        // Better: Use canvas context to measure if available, or a hidden span
        // For now, a heuristic is fast and usually sufficient for 90% cases
        let maxWidth = (column.title.length * 8) + 24; // +24 for sort icon/menu/padding

        // 2. Measure Content (Sample first 1000 rows for speed)
        const sampleLimit = 1000;
        const rowsToScan = rows.slice(0, sampleLimit);

        // We need a context to measure text properly
        const ctx = this.canvas?.getContext('2d');
        if (ctx) {
            ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
            
            // Measure Header
            const headerWidth = ctx.measureText(column.title).width + 40; // +40 padding
            maxWidth = Math.max(maxWidth, headerWidth);

            // Measure Cells
            for (const row of rowsToScan) {
                const cell = row.cells.get(columnId);
                if (cell?.value) {
                    const text = cell.displayValue || String(cell.value);
                    const width = ctx.measureText(text).width + 16; // +16 padding
                    if (width > maxWidth) maxWidth = width;
                }
            }
        }

        // Cap max width
        maxWidth = Math.min(maxWidth, 600);

        // Apply
        this.resizeColumn(columnId, maxWidth);
    }

    /**
     * Update a column properties
     */
    async updateColumn(columnId: string, updates: Partial<GridColumn>): Promise<void> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Update model
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        // Apply updates
        const updatedColumn = { ...columns[colIndex], ...updates };
        columns[colIndex] = updatedColumn;
        
        this.model.setColumns([...columns]); // Trigger update
        
        // Notify subscribers
        this.notifyDataChange();
        this.render();

        // TODO: Call adapter if needed for backend persistence
        // await this.adapter.updateColumn(columnId, updates);
    }

    /**
     * Add a column
     */
    async addColumn(column: GridColumn): Promise<GridColumn> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Before hook
        const processedColumn = this.lifecycle.onBeforeColumnAdd?.(column);
        if (processedColumn === false) {
            throw new Error('Column addition cancelled by lifecycle hook');
        }

        const columnToAdd = processedColumn ? { ...column, ...processedColumn } : column;

        try {
            // Call adapter
            const newColumn = await this.adapter.addColumn(columnToAdd);

            // Update model
            this.model.addColumn(newColumn);

            // After hook
            this.lifecycle.onColumnAdd?.(newColumn);

            return newColumn;
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'column:add',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Delete a column
     */
    async deleteColumn(columnId: string): Promise<void> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        // Before hook
        const shouldDelete = this.lifecycle.onBeforeColumnDelete?.(columnId);
        if (shouldDelete === false) {
            return; // Cancelled
        }

        try {
            // Call adapter
            await this.adapter.deleteColumn(columnId);

            // Update model
            this.model.deleteColumn(columnId);

            // After hook
            this.lifecycle.onColumnDelete?.(columnId);
        } catch (error) {
            this.lifecycle.onError?.({
                type: 'column:delete',
                message: (error as Error).message,
                timestamp: Date.now(),
            });
            throw error;
        }
    }

    /**
     * Select a whole column
     */
    selectColumn(columnId: string, multiSelect: boolean = false, rangeSelect: boolean = false) {
        const colIndex = this.model.getColumns().findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        const rowCount = this.model.getRowCount();
        if (rowCount === 0) return;

        const currentSelection = this.store.getState().selection;

        // 1. Handle Range Select (Shift + Click)
        if (rangeSelect && currentSelection?.primary) {
            const anchorCol = currentSelection.primary.col;
            
            // Create range from anchor column to new column
            this.store.setState({
                selection: {
                    primary: currentSelection.primary, // Keep same primary focus
                    ranges: [{
                        start: { col: Math.min(anchorCol, colIndex), row: 0 },
                        end: { col: Math.max(anchorCol, colIndex), row: rowCount - 1 }
                    }]
                }
            });
            return;
        }

        // 2. Handle Multi Select (Cmd/Ctrl + Click)
        if (multiSelect && currentSelection) {
            // Add new range
            const newRange = {
                start: { col: colIndex, row: 0 },
                end: { col: colIndex, row: rowCount - 1 }
            };
            
            // Check if already selected to toggle off
            const isAlreadySelected = currentSelection.ranges.some(r => 
                r.start.col === colIndex && r.end.col === colIndex && 
                r.start.row === 0 && r.end.row === rowCount - 1
            );

            if (isAlreadySelected) {
                // Remove this range
                const newRanges = currentSelection.ranges.filter(r => 
                    !(r.start.col === colIndex && r.end.col === colIndex)
                );
                
                if (newRanges.length === 0) {
                    this.store.setState({ selection: null });
                } else {
                    this.store.setState({
                        selection: {
                            primary: currentSelection.primary, // Keep primary
                            ranges: newRanges
                        }
                    });
                }
            } else {
                // Add range
                this.store.setState({
                    selection: {
                        primary: { col: colIndex, row: 0 },
                        ranges: [...currentSelection.ranges, newRange]
                    }
                });
            }
            return;
        }

        // 3. Default: Single Select with Toggle
        // Check if this specific column is already the ONLY selection
        const isSingleColumnSelected = currentSelection?.ranges.length === 1 &&
            currentSelection.ranges[0].start.col === colIndex &&
            currentSelection.ranges[0].end.col === colIndex &&
            currentSelection.ranges[0].start.row === 0 &&
            currentSelection.ranges[0].end.row === rowCount - 1;

        if (isSingleColumnSelected) {
            // Toggle off
            this.store.setState({ selection: null });
        } else {
            // Select
            this.store.setState({
                selection: {
                    primary: { col: colIndex, row: 0 },
                    ranges: [{
                        start: { col: colIndex, row: 0 },
                        end: { col: colIndex, row: rowCount - 1 }
                    }]
                }
            });
        }
    }

    // NEW: Move Column (Reordering)
    moveColumn(fromVisibleIndex: number, toVisibleIndex: number): void {
        const visibleCols = this.model.getVisibleColumns();
        if (fromVisibleIndex < 0 || fromVisibleIndex >= visibleCols.length ||
            toVisibleIndex < 0 || toVisibleIndex >= visibleCols.length ||
            fromVisibleIndex === toVisibleIndex) {
            return;
        }

        const fromId = visibleCols[fromVisibleIndex].id;
        const toId = visibleCols[toVisibleIndex].id;

        const allCols = this.model.getColumns();
        const fromRealIndex = allCols.findIndex(c => c.id === fromId);
        const toRealIndex = allCols.findIndex(c => c.id === toId);

        if (fromRealIndex === -1 || toRealIndex === -1) return;

        // Update model
        this.model.moveColumn(fromRealIndex, toRealIndex);

        // Notify
        this.notifyDataChange();
        this.render();
    }

    /**
     * Get adapter (for testing/debugging)
     */
    public getAdapter(): DataAdapter | null {
        return this.adapter;
    }

    /**
     * Get config (for testing/debugging)
     */
    public getConfig(): GridConfig | null {
        return this.config;
    }
}
