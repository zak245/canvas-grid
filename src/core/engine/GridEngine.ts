import { createStore, StoreApi } from 'zustand/vanilla';
import { GridModel } from './GridModel';
import { Viewport } from './Viewport';
import { CanvasRenderer } from '../renderer/CanvasRenderer';
import { InputController } from './InputController';
import { EventBus, GridEventType, GridEventHandler, Unsubscribe } from './EventBus';
import { SelectionManager } from './SelectionManager';
import { ColumnManager } from './ColumnManager';
import { EditingManager } from './EditingManager';
import { RowManager } from './RowManager';
import { HistoryManager, GridCommand } from './HistoryManager';
import { ContextMenuManager } from './ContextMenuManager'; // Removed unused MenuContext
import type { GridSelection, GridTheme, GridRow, GridColumn, CellValue, CellPosition } from '../types/grid';
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
    hoveredCell: { col: number; row: number } | null;  // The cell currently being hovered
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
    // NEW: Row Actions State
    activeRowDetail: number | null;
    activeEnrichment: number | null;
    rowsToAdd: number;
}

export class GridEngine {
    // Core components
    public model!: GridModel;
    public viewport!: Viewport;
    public store!: StoreApi<GridEngineState>;
    public theme!: GridTheme;

    // Event system
    public eventBus: EventBus = new EventBus();
    
    // Operation Locks
    private isAddingRow = false;
    private isAddingColumn = false;

    // Managers (extracted for modularity)
    private _selectionManager: SelectionManager | null = null;
    private _columnManager: ColumnManager | null = null;
    private _editingManager: EditingManager | null = null;
    private _rowManager: RowManager | null = null;
    private _historyManager: HistoryManager | null = null;
    private _contextMenuManager: ContextMenuManager | null = null;

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
    public inputController: InputController | null = null;

    // AI (optional feature)
    public aiStreamer: any = null;

    constructor(config: Partial<GridConfig>) {
        this.initialize(config);
    }

    private initialize(userConfig: Partial<GridConfig>) {
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

        // Sync viewport dimensions with theme
        this.viewport.setDimensions({
            rowHeight: this.theme.rowHeight,
            headerHeight: this.theme.headerHeight,
            rowHeaderWidth: this.theme.rowHeaderWidth,
        });

        // Initialize store
        this.store = createStore<GridEngineState>(() => ({
            selection: null,
            isDragging: false,
            isFilling: false,
            fillRange: null,
            hoverPosition: null,
            hoveredCell: null,
            editingCell: null,
            reorderState: null,
            activeHeaderMenu: null,
            activeAddColumnMenu: null,
            editingHeader: null,
            activeColumnSettings: null,
            activeRowDetail: null,
            activeEnrichment: null,
            rowsToAdd: 10,
        }));

        // Initialize managers
        this.initializeManagers();

        // Call initialization hook
        this.lifecycle.onInit?.();

        // Load initial data
        this.loadInitialData();
    }

    // Initialize managers with dependencies
    private initializeManagers(): void {
        // Row Manager (View Layer)
        this._rowManager = new RowManager(this.model);

        // Selection Manager
        this._selectionManager = new SelectionManager({
            store: this.store,
            eventBus: this.eventBus,
            // Use RowManager for visual row count
            getRowCount: () => this._rowManager!.getRowCount(),
            getColumnCount: () => this.model.getColumnCount(),
        });

        // Column Manager
        this._columnManager = new ColumnManager({
            model: this.model,
            adapter: this.adapter,
            eventBus: this.eventBus,
            lifecycle: this.lifecycle,
            getCanvas: () => this.canvas,
            render: () => this.render(),
        });

        // Editing Manager
        this._editingManager = new EditingManager({
            store: this.store,
            model: this.model,
            eventBus: this.eventBus,
            lifecycle: this.lifecycle,
            getCanvas: () => this.canvas,
        });

        // History Manager
        this._historyManager = new HistoryManager(50);

        // Context Menu Manager
        this._contextMenuManager = new ContextMenuManager();
        
        // Register Default Providers
        this._contextMenuManager.registerProvider({
            id: 'core-grouping',
            getMenuItems: (context) => {
                const items: import('../types/platform').MenuItem[] = [];
                
                // Column Header Context
                if (context.type === 'column-header' && context.columnId) {
                    const currentGrouping = this.rows.getGrouping();
                    
                    if (currentGrouping.columnId === context.columnId) {
                        items.push({
                            id: 'ungroup',
                            label: 'Ungroup',
                            onClick: () => this.groupByColumn(null)
                        });
                    } else {
                        items.push({
                            id: 'group-by',
                            label: 'Group by this column',
                            onClick: () => this.groupByColumn(context.columnId!)
                        });
                    }
                }
                
                // General Context (Ungroup if grouped)
                if ((context.type === 'grid-body' || context.type === 'row-header' || context.type === 'cell') && this.rows.getGrouping().columnId) {
                     // Add a separator if we have other items, but here we are the first provider usually
                     items.push({
                         id: 'ungroup-global',
                         label: 'Ungroup',
                         onClick: () => this.groupByColumn(null)
                     });
                }
                
                return items;
            }
        });

        // Register Default Edit Actions
        this._contextMenuManager.registerProvider({
            id: 'core-edit',
            getMenuItems: (context) => {
                const items: import('../types/platform').MenuItem[] = [];

                if (context.type === 'cell' || context.type === 'selection' || context.type === 'row-header' || context.type === 'grid-body') {
                     // Add separator if needed (handled by manager usually, but we are a separate provider)
                     
                     items.push({
                         id: 'cut',
                         label: 'Cut',
                         icon: 'scissors', // Assuming icon support or just label
                         shortcut: 'Ctrl+X',
                         onClick: () => this.inputController?.keyboardHandler.performCut()
                     });

                     items.push({
                         id: 'copy',
                         label: 'Copy',
                         icon: 'copy',
                         shortcut: 'Ctrl+C',
                         onClick: () => this.inputController?.keyboardHandler.performCopy()
                     });

                     items.push({
                         id: 'paste',
                         label: 'Paste',
                         icon: 'clipboard',
                         shortcut: 'Ctrl+V',
                         onClick: () => this.inputController?.keyboardHandler.performPaste()
                     });

                     items.push({ 
                         id: 'sep-edit', 
                         label: '', 
                         onClick: () => {}, 
                         separator: true 
                     });

                     items.push({
                         id: 'delete',
                         label: 'Delete',
                         icon: 'trash',
                         shortcut: 'Delete',
                         onClick: () => this.inputController?.keyboardHandler.performDelete()
                     });
                }

                return items;
            }
        });
    }

    // Public accessors for managers
    public get selection(): SelectionManager {
        if (!this._selectionManager) throw new Error('SelectionManager not initialized');
        return this._selectionManager;
    }

    public get columns(): ColumnManager {
        if (!this._columnManager) throw new Error('ColumnManager not initialized');
        return this._columnManager;
    }

    public get editing(): EditingManager {
        if (!this._editingManager) throw new Error('EditingManager not initialized');
        return this._editingManager;
    }

    public get rows(): RowManager {
        if (!this._rowManager) throw new Error('RowManager not initialized');
        return this._rowManager;
    }

    public get history(): HistoryManager {
        if (!this._historyManager) throw new Error('HistoryManager not initialized');
        return this._historyManager;
    }

    public get contextMenu(): ContextMenuManager {
        if (!this._contextMenuManager) throw new Error('ContextMenuManager not initialized');
        return this._contextMenuManager;
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
            throw new Error('BackendAdapter not implemented yet. Use MockBackendAdapter or custom adapter.');
        }

        throw new Error(`Unknown data source mode: ${config.dataSource.mode}`);
    }

    // ===== EVENT SYSTEM =====

    public on<T extends GridEventType>(event: T, handler: GridEventHandler<T>): Unsubscribe {
        return this.eventBus.on(event, handler);
    }

    public once<T extends GridEventType>(event: T, handler: GridEventHandler<T>): Unsubscribe {
        return this.eventBus.once(event, handler);
    }

    public off<T extends GridEventType>(event: T, handler: GridEventHandler<T>): void {
        this.eventBus.off(event, handler);
    }

    public subscribeToDataChange(callback: () => void): () => void {
        return this.eventBus.on('data:change', () => callback());
    }

    public subscribeToSortChange(callback: (sortState: ColumnSort[]) => void): () => void {
        return this.eventBus.on('sort:change', (e) => callback(e.sortState));
    }

    private emitSortChange(sortState: ColumnSort[], previousSortState: ColumnSort[]) {
        this.eventBus.emit('sort:change', { sortState, previousSortState });
    }

    // Load initial data from adapter
    private async loadInitialData() {
        if (!this.adapter) return;

        try {
            this.lifecycle.onBeforeDataLoad?.();

            // Fetch all data with large page size
            const data = await this.adapter.fetchData({ 
                page: 1, 
                pageSize: 50000 
            });

            const processedData = this.lifecycle.onDataLoad?.(data) || data;

            this.model.setColumns(processedData.columns);
            this.model.setRows(processedData.rows);
            
            // Initialize View Layer
            this._rowManager?.initialize();

            // Emit data load event
            this.eventBus.emit('data:load', {
                rowCount: processedData.rows.length,
                columnCount: processedData.columns.length,
            });

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
            rowHeaderWidth: 90,
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

    public render() {
        if (this.renderer) {
            this.renderer.render();
        }
    }

    // Helper to scroll to bottom
    private scrollToBottom() {
        // Use visual row count
        const rowCount = this.rows.getRowCount();
        const { height, scrollLeft } = this.viewport.getState();
        const { rowHeight, headerHeight } = this.theme;
        
        const totalHeight = (rowCount + 1) * rowHeight;
        const viewportContentHeight = height - headerHeight;
        const maxScrollTop = Math.max(0, totalHeight - viewportContentHeight);
        
        this.scroll(maxScrollTop, scrollLeft);
    }

    // --- Actions ---
    resize(width: number, height: number) {
        this.viewport.updateState({ width, height });
        this.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
        // Force render on resize
        this.render();
    }

    scroll(scrollTop: number, scrollLeft: number) {
        const { rowHeight, headerHeight } = this.theme;
        const { height, width } = this.viewport.getState();
        
        // Ensure we don't scroll past content bounds
        const rowCount = this.rows.getRowCount();
        const totalHeight = (rowCount + 1) * rowHeight; // +1 for potential empty space/add row
        const contentHeight = Math.max(0, totalHeight - (height - headerHeight));
        
        const maxScrollLeft = Math.max(0, this.model.getColumns().reduce((sum, c) => sum + c.width, 0) - width + this.theme.rowHeaderWidth);

        const clampedTop = Math.max(0, Math.min(scrollTop, contentHeight));
        const clampedLeft = Math.max(0, Math.min(scrollLeft, maxScrollLeft + 500)); // Allow some overscroll for whitespace

        this.viewport.updateState({ scrollTop: clampedTop, scrollLeft: clampedLeft });
        this.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
        // Force render on scroll
        this.render();
    }

    // ===== PUBLIC API METHODS =====

    /**
     * Add a new row
     */
    async addRow(row: Partial<GridRow>): Promise<GridRow> {
        if (this.isAddingRow) {
            throw new Error('Row addition already in progress');
        }
        
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        this.isAddingRow = true;

        try {
            // Before hook
            const processedRow = this.lifecycle.onBeforeRowAdd?.(row);
            if (processedRow === false) {
                throw new Error('Row addition cancelled by lifecycle hook');
            }

            const rowToAdd = processedRow || row;

            // Call adapter
            const newRow = await this.adapter.addRow(rowToAdd);

            // Update model
            this.model.addRow(newRow);
            
            // Update View Layer
            this.rows.onRowAdded(newRow.id);

            // After hook
            this.lifecycle.onRowAdd?.(newRow);

            // Emit event
            this.eventBus.emit('row:add', { 
                row: newRow, 
                index: this.rows.getRowCount() - 1 
            });
            
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
        } finally {
            this.isAddingRow = false;
        }
    }

    /**
     * Update an existing row
     */
    async updateRow(rowId: string, changes: Partial<GridRow>): Promise<GridRow> {
        if (!this.adapter) {
            throw new Error('Adapter not initialized. Use config-based constructor.');
        }

        const processedChanges = this.lifecycle.onBeforeRowUpdate?.(rowId, changes);
        if (processedChanges === false) {
            throw new Error('Row update cancelled by lifecycle hook');
        }

        const changesToApply = processedChanges || changes;

        try {
            const updatedRow = await this.adapter.updateRow(rowId, changesToApply);
            this.model.updateRow(updatedRow);
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

        const shouldDelete = this.lifecycle.onBeforeRowDelete?.(rowId);
        if (shouldDelete === false) return;

        try {
            await this.adapter.deleteRow(rowId);
            this.model.deleteRow(rowId);
            this.rows.onRowDeleted(rowId);
            this.lifecycle.onRowDelete?.(rowId);
            this.render();
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
     * Start editing a cell
     */
    startEdit(row: number, col: number) {
        const visibleCols = this.model.getVisibleColumns();
        const column = visibleCols[col];
        if (!column) return;

        if (this.lifecycle.onBeforeCellEdit?.(row, column.id) === false) return;

        this.store.setState({ editingCell: { row, col } });
        // Use RowManager to get the correct row
        const gridRow = this.rows.getRow(row);
        const cellValue = gridRow?.cells.get(column.id)?.value;
        this.lifecycle.onCellEditStart?.(row, column.id, cellValue);
    }

    /**
     * Stop editing
     */
    stopEdit(cancel: boolean = false) {
        const { editingCell } = this.store.getState();
        if (editingCell) {
            const { row, col } = editingCell;
            const visibleCols = this.model.getVisibleColumns();
            const column = visibleCols[col];
            
            this.store.setState({ editingCell: null });
            this.canvas?.focus();
            
            if (column && !cancel) {
                 const gridRow = this.rows.getRow(row);
                 const cellValue = gridRow?.cells.get(column.id)?.value;
                 this.lifecycle.onCellEditEnd?.(row, column.id, cellValue);
            }
        }
    }

    /**
     * Update a single cell
     */
    async updateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
        const row = this.rows.getRow(rowIndex);
        if (!row) return;

        const command: GridCommand = {
            type: 'cell:update',
            execute: async () => {
                await this._performUpdateCell(rowIndex, columnId, value);
            },
            undo: async () => {
                // We need to store old value in command context, not fetch it dynamically
                // But for simplicity, we can't easily do that here without changing signature
                // Better: Wrap the logic inside _performUpdateCell to be self-contained or
                // create the command outside.
                // For this level of integration, we'll do a direct call and assume _performUpdateCell 
                // handles the details, but strictly speaking we should capture state.
                
                // REVISIT: To fully support undo, we need the OLD value captured at the moment of execute
                // Let's refactor slightly to capture it.
            }
        };
        
        // Capture state for undo
        const oldValue = row.cells.get(columnId)?.value;
        command.undo = async () => {
            await this._performUpdateCell(rowIndex, columnId, oldValue);
        };

        // Execute via history manager
        await this.history.execute(command);
    }

    // Internal implementation of cell update
    private async _performUpdateCell(rowIndex: number, columnId: string, value: CellValue): Promise<void> {
        if (!this.adapter) throw new Error('Adapter not initialized');
        
        // We need the Row ID for the model update
        const row = this.rows.getRow(rowIndex);
        if (!row) return;
        const rowId = row.id;

        const oldValue = this.model.getCell(rowId, columnId)?.value;

        // Hooks
        const validationResult = this.lifecycle.onCellValidate?.({ rowIndex, columnId, value, oldValue });
        if (validationResult && !validationResult.valid) throw new Error(validationResult.error || 'Validation failed');

        const processedValue = this.lifecycle.onBeforeCellChange?.({ rowIndex, columnId, value, oldValue });
        if (processedValue === false) return;

        const valueToSet = processedValue !== undefined ? processedValue : value;

        try {
            // Optimistic
            this.model.setCellValue(rowId, columnId, valueToSet);
            // Backend
            await this.adapter.updateCell(rowIndex, columnId, valueToSet); // Note: Adapter might need rowId in future
            
            this.lifecycle.onCellChange?.({ rowIndex, columnId, value: valueToSet, oldValue });
        } catch (error) {
            this.model.setCellValue(rowId, columnId, oldValue);
            this.lifecycle.onError?.({ type: 'cell:update', message: (error as Error).message, timestamp: Date.now() });
            throw error;
        }
    }

    /**
     * Bulk update multiple cells
     */
    async bulkUpdateCells(updates: Array<{ rowIndex: number; columnId: string; value: CellValue }>): Promise<void> {
        if (!this.adapter) throw new Error('Adapter not initialized');

        const oldValues = updates.map(u => {
            const row = this.rows.getRow(u.rowIndex);
            return {
                rowIndex: u.rowIndex,
                rowId: row?.id,
                columnId: u.columnId,
                oldValue: row?.cells.get(u.columnId)?.value
            };
        });

        const execute = async () => {
            try {
                // Optimistic
                for (const update of updates) {
                    const row = this.rows.getRow(update.rowIndex);
                    if (row) {
                        this.model.setCellValue(row.id, update.columnId, update.value);
                    }
                }
                // Backend
                await this.adapter!.bulkUpdateCells(updates);
            } catch (error) {
                // Rollback logic is handled by undo or catch block
                // If strictly internal error, we rollback here
                 for (const old of oldValues) {
                    if (old.rowId) this.model.setCellValue(old.rowId, old.columnId, old.oldValue);
                }
                throw error;
            }
        };

        const undo = async () => {
            for (const old of oldValues) {
                if (old.rowId) {
                    this.model.setCellValue(old.rowId, old.columnId, old.oldValue);
                }
            }
            // We should ideally sync rollback to backend too
             // await this.adapter.bulkUpdateCells(oldValues.map(...));
        };

        await this.history.execute({ type: 'cell:bulk-update', execute, undo });
    }

    // Wrappers for Fill/Paste using bulkUpdateCells
    async fillData(source: any, target: any): Promise<void> {
        // Logic remains same, calls bulkUpdateCells which is now history-aware
        // Need to re-implement the logic to extract data using RowManager
        
        const columns = this.model.getColumns();
        const sourceData: any[][] = [];
        const startCol = Math.min(source.start.col, source.end.col);
        const endCol = Math.max(source.start.col, source.end.col);
        const startRow = Math.min(source.start.row, source.end.row);
        const endRow = Math.max(source.start.row, source.end.row);

        const sourceWidth = endCol - startCol + 1;
        const sourceHeight = endRow - startRow + 1;

        for (let r = startRow; r <= endRow; r++) {
            const rowData: any[] = [];
            const row = this.rows.getRow(r); // Use RowManager
            if (row) {
                for (let c = startCol; c <= endCol; c++) {
                    const colId = columns[c].id;
                    const cell = row.cells.get(colId);
                    rowData.push(cell?.value);
                }
            }
            sourceData.push(rowData);
        }

        const updates: Array<{ rowIndex: number; columnId: string; value: CellValue }> = [];
        const targetStartCol = Math.min(target.start.col, target.end.col);
        const targetEndCol = Math.max(target.start.col, target.end.col);
        const targetStartRow = Math.min(target.start.row, target.end.row);
        const targetEndRow = Math.max(target.start.row, target.end.row);

        for (let r = targetStartRow; r <= targetEndRow; r++) {
            for (let c = targetStartCol; c <= targetEndCol; c++) {
                const sourceR = (r - targetStartRow) % sourceHeight;
                const sourceC = (c - targetStartCol) % sourceWidth;
                // Check bounds
                if (sourceData[sourceR]) {
                    const value = sourceData[sourceR][sourceC];
                    const colId = columns[c].id;
                    updates.push({ rowIndex: r, columnId: colId, value });
                }
            }
        }

        await this.bulkUpdateCells(updates);
    }

    async pasteData(data: string[][], startRow: number, startCol: number): Promise<void> {
        const columns = this.model.getColumns();
        const totalRows = this.rows.getRowCount();
        const updates: Array<{ rowIndex: number; columnId: string; value: CellValue }> = [];

        for (let r = 0; r < data.length; r++) {
            const targetRow = startRow + r;
            if (targetRow >= totalRows) break;

            const rowData = data[r];
            for (let c = 0; c < rowData.length; c++) {
                const targetCol = startCol + c;
                if (targetCol >= columns.length) break;

                const value = rowData[c];
                const column = columns[targetCol];
                updates.push({ rowIndex: targetRow, columnId: column.id, value });
            }
        }

        await this.bulkUpdateCells(updates);
    }

    /**
     * Sort by column
     */
    async sort(columnId: string, direction?: 'asc' | 'desc'): Promise<void> {
        if (!this.adapter) throw new Error('Adapter not initialized');

        let newSortState: ColumnSort[];

        if (direction) {
            newSortState = [{ columnId, direction }];
        } else {
            const currentSort = this.model.getSortState();
            if (currentSort && currentSort[0]?.columnId === columnId) {
                if (currentSort[0].direction === 'asc') {
                    newSortState = [{ columnId, direction: 'desc' }];
                } else {
                    newSortState = [];
                }
            } else {
                newSortState = [{ columnId, direction: 'asc' }];
            }
        }

        if (this.lifecycle.onBeforeSort?.(newSortState) === false) return;

        // Store previous state for undo (if we were to implement undo for sort)
        // Sort is usually considered a "view" state, not data state, so often skipped in undo history
        // But if requested, we could wrap it.

        try {
            await this.adapter.sort(newSortState);
            const previousSortState = this.model.getSortState();
            this.model.setSortState(newSortState);
            this.emitSortChange(newSortState, previousSortState);

            if (this.config?.dataSource.mode === 'local') {
                const data = await this.adapter.fetchData({});
                // Update View Layer with new order
                this.model.setRows(data.rows);
                this.rows.setViewOrder(data.rows.map(r => r.id));
            }

            this.lifecycle.onSort?.(newSortState);
        } catch (error) {
            this.lifecycle.onError?.({ type: 'sort', message: (error as Error).message, timestamp: Date.now() });
            throw error;
        }
    }

    // ... (Column visibility and resize methods remain largely same, just ensure renders)

    setColumnVisibility(columnId: string, visible: boolean) {
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        const oldValue = columns[colIndex].visible;

        const execute = async () => {
            columns[colIndex].visible = visible;
            this.model.setColumns([...columns]);
            this.render();
            this.eventBus.emit('column:visibility', { columnId, visible });
        };

        const undo = async () => {
            columns[colIndex].visible = oldValue;
            this.model.setColumns([...columns]);
            this.render();
            this.eventBus.emit('column:visibility', { columnId, visible: oldValue });
        };

        this.history.execute({ type: 'column:visibility', execute, undo });
    }

    async resizeColumn(columnId: string, width: number): Promise<void> {
        if (width < 50) width = 50;
        if (width > 2000) width = 2000;

        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;
        
        const oldWidth = columns[colIndex].width;
        
        // Note: Resize is often continuous (drag), so we might not want to push every pixel to history
        // Usually only the "drag end" event pushes to history.
        // For now, direct update.
        
        columns[colIndex].width = width;
        this.model.setColumns([...columns]);
        
        if (this.adapter) {
            try {
                await this.adapter.resizeColumn(columnId, width);
            } catch (error) {
                columns[colIndex].width = oldWidth;
                this.model.setColumns([...columns]);
            }
        }
        this.render();
    }
    
    // Add autoResizeColumn, updateColumn, addColumn, deleteColumn similar logic...
    // For brevity, retaining existing logic structure but ensuring they call this.render()
    
    async autoResizeColumn(columnId: string): Promise<void> {
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        const column = columns[colIndex];
        const rows = this.rows.getViewRows(); // Use view rows
        
        let maxWidth = (column.title.length * 8) + 24;
        const sampleLimit = 1000;
        const rowsToScan = rows.slice(0, sampleLimit);

        const ctx = this.canvas?.getContext('2d');
        if (ctx) {
            ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
            const headerWidth = ctx.measureText(column.title).width + 40;
            maxWidth = Math.max(maxWidth, headerWidth);

            for (const row of rowsToScan) {
                const cell = row.cells.get(columnId);
                if (cell?.value) {
                    const text = cell.displayValue || String(cell.value);
                    const width = ctx.measureText(text).width + 16;
                    if (width > maxWidth) maxWidth = width;
                }
            }
        }
        maxWidth = Math.min(maxWidth, 600);
        this.resizeColumn(columnId, maxWidth);
    }

    async updateColumn(columnId: string, updates: Partial<GridColumn>): Promise<void> {
        if (!this.adapter) throw new Error('Adapter not initialized');
        const columns = this.model.getColumns();
        const colIndex = columns.findIndex(c => c.id === columnId);
        if (colIndex === -1) return;
        
        const oldColumn = { ...columns[colIndex] };
        const updatedColumn = { ...columns[colIndex], ...updates };
        
        columns[colIndex] = updatedColumn;
        this.model.setColumns([...columns]);
        this.eventBus.emit('column:update', { columnId, changes: updates });
        this.render();

        try {
            await this.adapter.updateColumn(columnId, updates);
        } catch (error) {
            columns[colIndex] = oldColumn;
            this.model.setColumns([...columns]);
            this.eventBus.emit('column:update', { columnId, changes: oldColumn });
            this.render();
            throw error;
        }
    }

    async addColumn(column: GridColumn): Promise<GridColumn> {
        // ... existing addColumn logic
        // This typically isn't undone via Ctrl+Z in complex apps without full schema rollback support
        if (this.isAddingColumn) throw new Error('Busy');
        if (!this.adapter) throw new Error('No adapter');
        this.isAddingColumn = true;
        try {
             const processedColumn = this.lifecycle.onBeforeColumnAdd?.(column);
             if (processedColumn === false) throw new Error('Cancelled');
             const columnToAdd = processedColumn ? { ...column, ...processedColumn } : column;
             const newColumn = await this.adapter.addColumn(columnToAdd);
             this.model.setColumns([...this.model.getColumns()]);
             this.lifecycle.onColumnAdd?.(newColumn);
             return newColumn;
        } finally {
            this.isAddingColumn = false;
        }
    }

    async deleteColumn(columnId: string): Promise<void> {
         if (!this.adapter) throw new Error('No adapter');
         if (this.lifecycle.onBeforeColumnDelete?.(columnId) === false) return;
         try {
             await this.adapter.deleteColumn(columnId);
             const data = await this.adapter.fetchData({});
             this.model.setColumns(data.columns);
             this.lifecycle.onColumnDelete?.(columnId);
         } catch (e) {
             throw e;
         }
    }

    moveSelection(deltaRow: number, deltaCol: number) {
        const { selection } = this.store.getState();
        if (!selection || !selection.primary) return;

        const { row, col } = selection.primary;
        const rowCount = this.rows.getRowCount(); // Use View Layer
        const colCount = this.model.getColumns().length;

        const newRow = Math.max(0, Math.min(rowCount - 1, row + deltaRow));
        const newCol = Math.max(0, Math.min(colCount - 1, col + deltaCol));

        if (newRow !== row || newCol !== col) {
            this.store.setState({
                selection: {
                    primary: { row: newRow, col: newCol },
                    ranges: [{ start: { row: newRow, col: newCol }, end: { row: newRow, col: newCol } }]
                }
            });
            this.scrollToCell(newRow, newCol);
        }
    }

    scrollToCell(row: number, col: number) {
        // Ensure Viewport uses correct dimensions
        const { scrollTop, scrollLeft, width, height } = this.viewport.getState();
        const { rowHeight, headerHeight, rowHeaderWidth } = this.theme;
        const columns = this.model.getColumns();

        const cellTop = row * rowHeight;
        const cellBottom = cellTop + rowHeight;
        
        let cellLeft = 0;
        for (let i = 0; i < col; i++) {
            cellLeft += columns[i].width;
        }
        const cellRight = cellLeft + columns[col].width;

        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + height - headerHeight;
        const viewportLeft = scrollLeft;
        const viewportRight = scrollLeft + width - rowHeaderWidth;

        let newScrollTop = scrollTop;
        let newScrollLeft = scrollLeft;

        if (cellTop < viewportTop) {
            newScrollTop = cellTop;
        } else if (cellBottom > viewportBottom) {
            newScrollTop = cellBottom - (height - headerHeight);
        }

        if (cellLeft < viewportLeft) {
            newScrollLeft = cellLeft;
        } else if (cellRight > viewportRight) {
            newScrollLeft = cellRight - (width - rowHeaderWidth);
        }

        if (newScrollTop !== scrollTop || newScrollLeft !== scrollLeft) {
            this.scroll(newScrollTop, newScrollLeft);
        }
    }

    selectRow(rowIndex: number, multi: boolean = false) {
        const colCount = this.model.getColumns().length;
        if (colCount === 0) return;

        const range = {
            start: { col: 0, row: rowIndex },
            end: { col: colCount - 1, row: rowIndex }
        };
        
        const currentSelection = this.store.getState().selection;
        
        if (multi && currentSelection) {
            this.store.setState({
                selection: {
                    primary: { col: 0, row: rowIndex },
                    ranges: [...currentSelection.ranges, range]
                }
            });
        } else {
            this.store.setState({
                selection: {
                    primary: { col: 0, row: rowIndex },
                    ranges: [range]
                }
            });
        }
    }

    toggleRowSelection(rowIndex: number, multi: boolean = false) {
        const selection = this.store.getState().selection;
        const colCount = this.model.getColumns().length;
        
        if (!selection) {
            this.selectRow(rowIndex, multi);
            return;
        }
        
        const existingRangeIndex = selection.ranges.findIndex(r => 
            r.start.row === rowIndex && r.end.row === rowIndex &&
            r.start.col === 0 && r.end.col >= colCount - 1
        );

        if (existingRangeIndex >= 0) {
            const newRanges = [...selection.ranges];
            newRanges.splice(existingRangeIndex, 1);
            if (newRanges.length === 0) {
                this.store.setState({ selection: null });
            } else {
                this.store.setState({
                    selection: {
                        primary: selection.primary,
                        ranges: newRanges
                    }
                });
            }
        } else {
            this.selectRow(rowIndex, multi);
        }
    }

    isRowSelected(rowIndex: number): boolean {
        const selection = this.store.getState().selection;
        if (!selection) return false;
        const colCount = this.model.getColumns().length;
        return selection.ranges.some(r => 
            r.start.row <= rowIndex && r.end.row >= rowIndex &&
            r.start.col === 0 && r.end.col >= colCount - 1
        );
    }

    triggerRowAction(rowIndex: number, action: string) {
        // Use View Layer to identify row
        const row = this.rows.getRow(rowIndex);
        if (!row) return;

        if (action === 'delete') {
             this.deleteRow(row.id);
        } else if (action === 'detail') {
            this.openRowDetail(rowIndex);
        } else if (action === 'enrich') {
            this.openEnrichment(rowIndex);
        }
        if (this.lifecycle.onRowAction) {
            this.lifecycle.onRowAction(rowIndex, action);
        }
    }

    openRowDetail(rowIndex: number) {
        this.store.setState({ activeRowDetail: rowIndex });
    }
    
    closeRowDetail() {
        this.store.setState({ activeRowDetail: null });
    }

    openEnrichment(rowIndex: number) {
        this.store.setState({ activeEnrichment: rowIndex });
    }

    closeEnrichment() {
        this.store.setState({ activeEnrichment: null });
    }

    toggleSelectAllRows() {
        const rowCount = this.rows.getRowCount();
        const colCount = this.model.getColumns().length;
        if (rowCount === 0 || colCount === 0) return;

        const currentSelection = this.store.getState().selection;
        const isAllSelected = currentSelection && currentSelection.ranges.some(r => 
            r.start.row === 0 && r.end.row === rowCount - 1 &&
            r.start.col === 0 && r.end.col >= colCount - 1
        );

        if (isAllSelected) {
            this.store.setState({ selection: null });
        } else {
            this.store.setState({
                selection: {
                    primary: { col: 0, row: 0 },
                    ranges: [{
                        start: { col: 0, row: 0 },
                        end: { col: colCount - 1, row: rowCount - 1 }
                    }]
                }
            });
        }
    }

    setRowsToAdd(count: number) {
        this.store.setState({ rowsToAdd: count });
    }

    async addMultipleRows(count: number) {
         if (count <= 0) return;
         if (!this.adapter) throw new Error('Adapter not initialized');

         try {
             const newRows: GridRow[] = [];
             for (let i = 0; i < count; i++) {
                 const row: Partial<GridRow> = { cells: new Map() };
                 const processedRow = this.lifecycle.onBeforeRowAdd?.(row);
                 if (processedRow !== false) {
                     const rowToAdd = processedRow || row;
                     const newRow = await this.adapter.addRow(rowToAdd);
                     newRows.push(newRow);
                 }
             }

             for (const newRow of newRows) {
                 this.model.addRow(newRow);
                 this.rows.onRowAdded(newRow.id);
                 this.lifecycle.onRowAdd?.(newRow);
             }

             this.eventBus.emit('row:add', { 
                 row: newRows[newRows.length - 1], 
                 index: this.rows.getRowCount() - 1 
             });
             
             setTimeout(() => {
                 this.scrollToBottom();
                 this.render();
             }, 10);

         } catch (error) {
             console.error('Failed to add multiple rows:', error);
         }
    }

    selectColumn(columnId: string, multiSelect: boolean = false, rangeSelect: boolean = false) {
        const colIndex = this.model.getColumns().findIndex(c => c.id === columnId);
        if (colIndex === -1) return;

        const rowCount = this.rows.getRowCount();
        if (rowCount === 0) return;

        const currentSelection = this.store.getState().selection;

        if (rangeSelect && currentSelection?.primary) {
            const anchorCol = currentSelection.primary.col;
            this.store.setState({
                selection: {
                    primary: currentSelection.primary,
                    ranges: [{
                        start: { col: Math.min(anchorCol, colIndex), row: 0 },
                        end: { col: Math.max(anchorCol, colIndex), row: rowCount - 1 }
                    }]
                }
            });
            return;
        }

        if (multiSelect && currentSelection) {
            const newRange = {
                start: { col: colIndex, row: 0 },
                end: { col: colIndex, row: rowCount - 1 }
            };
            
            const isAlreadySelected = currentSelection.ranges.some(r => 
                r.start.col === colIndex && r.end.col === colIndex && 
                r.start.row === 0 && r.end.row === rowCount - 1
            );

            if (isAlreadySelected) {
                const newRanges = currentSelection.ranges.filter(r => 
                    !(r.start.col === colIndex && r.end.col === colIndex)
                );
                
                if (newRanges.length === 0) {
                    this.store.setState({ selection: null });
                } else {
                    this.store.setState({
                        selection: {
                            primary: currentSelection.primary,
                            ranges: newRanges
                        }
                    });
                }
            } else {
                this.store.setState({
                    selection: {
                        primary: { col: colIndex, row: 0 },
                        ranges: [...currentSelection.ranges, newRange]
                    }
                });
            }
            return;
        }

        const isSingleColumnSelected = currentSelection?.ranges.length === 1 &&
            currentSelection.ranges[0].start.col === colIndex &&
            currentSelection.ranges[0].end.col === colIndex &&
            currentSelection.ranges[0].start.row === 0 &&
            currentSelection.ranges[0].end.row === rowCount - 1;

        if (isSingleColumnSelected) {
            this.store.setState({ selection: null });
        } else {
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

        this.model.moveColumn(fromRealIndex, toRealIndex);

        this.eventBus.emit('column:reorder', { 
            columnId: fromId, 
            fromIndex: fromRealIndex, 
            toIndex: toRealIndex 
        });
        this.render();
    }

    /**
     * NEW: Move Row via RowManager
     */
    moveRow(fromIndex: number, toIndex: number): void {
        const execute = async () => {
            this.rows.moveRow(fromIndex, toIndex);
            this.render();
            this.eventBus.emit('row:reorder', { fromIndex, toIndex });
        };

        const undo = async () => {
            // Inverse move: if we moved from A to B, moving B to A undoes it?
            // Careful with indices shifting. 
            // A swap is symmetric if implemented as swap. 
            // But splice move is not.
            // If we moved item at index 5 to index 2:
            // [0,1,2,3,4,5] -> [0,1,5,2,3,4]
            // Undo: move item at index 2 back to 5.
            this.rows.moveRow(toIndex, fromIndex);
            this.render();
            this.eventBus.emit('row:reorder', { fromIndex: toIndex, toIndex: fromIndex });
        };

        this.history.execute({ type: 'row:reorder', execute, undo });
    }

    // ===== GROUPING API =====

    groupByColumn(columnId: string | null) {
        this.rows.groupBy(columnId);
        this.render();
    }

    toggleGroup(groupKey: string) {
        this.rows.toggleGroup(groupKey);
        this.render();
    }

    expandAllGroups() {
        this.rows.expandAll();
        this.render();
    }

    collapseAllGroups() {
        this.rows.collapseAll();
        this.render();
    }

    getCellPositionAt(x: number, y: number): CellPosition | null {
        const { theme } = this;
        const { scrollTop, scrollLeft } = this.viewport.getState();
        const frozenWidth = this.model.getFrozenWidth();

        if (x < theme.rowHeaderWidth || y < theme.headerHeight) {
            return null;
        }

        const gridY = y - theme.headerHeight + scrollTop;
        const rowIndex = Math.floor(gridY / theme.rowHeight);

        if (rowIndex < 0 || rowIndex >= this.rows.getRowCount()) {
            return null;
        }

        const adjustedX = x - theme.rowHeaderWidth;
        let gridX = adjustedX;

        if (adjustedX >= frozenWidth) {
            gridX += scrollLeft;
        } 
        
        const visibleColumns = this.model.getVisibleColumns();
        let currentX = 0;
        let matchedColId: string | null = null;

        for (const col of visibleColumns) {
            const nextX = currentX + col.width;
            if (gridX >= currentX && gridX < nextX) {
                matchedColId = col.id;
                break;
            }
            currentX = nextX;
        }

        if (!matchedColId) return null;

        const allColumns = this.model.getColumns();
        const trueColIndex = allColumns.findIndex(c => c.id === matchedColId);

        if (trueColIndex === -1) return null;

        return { col: trueColIndex, row: rowIndex };
    }

    /**
     * Public accessor for config (for managers and plugins)
     */
    public getConfig(): GridConfig | null {
        return this.config;
    }
}
