/**
 * ColumnManager - Handles all column-related operations
 * 
 * Extracted from GridEngine to provide a focused, testable column API.
 */

import type { GridColumn } from '../types/grid';
import type { GridModel } from './GridModel';
import type { DataAdapter } from '../adapters/DataAdapter';
import type { EventBus } from './EventBus';
import type { LifecycleHooks } from '../config/GridConfig';

export interface ColumnManagerDeps {
  model: GridModel;
  adapter: DataAdapter | null;
  eventBus: EventBus;
  lifecycle: LifecycleHooks;
  getCanvas: () => HTMLElement | null;
  render: () => void;
}

export class ColumnManager {
  private deps: ColumnManagerDeps;

  constructor(deps: ColumnManagerDeps) {
    this.deps = deps;
  }

  // ===== Getters =====

  /**
   * Get all columns
   */
  getColumns(): GridColumn[] {
    return this.deps.model.getColumns();
  }

  /**
   * Get visible columns (respects visibility and pinning order)
   */
  getVisibleColumns(): GridColumn[] {
    return this.deps.model.getVisibleColumns();
  }

  /**
   * Get a column by ID
   */
  getColumn(columnId: string): GridColumn | undefined {
    return this.deps.model.getColumnById(columnId);
  }

  /**
   * Get column count
   */
  getColumnCount(): number {
    return this.deps.model.getColumnCount();
  }

  /**
   * Get total width of frozen columns
   */
  getFrozenWidth(): number {
    return this.deps.model.getFrozenWidth();
  }

  // ===== Column CRUD =====

  /**
   * Add a new column
   * NOTE: This method is kept for backwards compatibility.
   * Prefer using GridEngine.addColumn() directly.
   */
  async addColumn(column: GridColumn): Promise<GridColumn> {
    const adapter = this.deps.adapter;
    if (!adapter) {
      throw new Error('Adapter not initialized');
    }

    // Before hook
    const processedColumn = this.deps.lifecycle.onBeforeColumnAdd?.(column);
    if (processedColumn === false) {
      throw new Error('Column addition cancelled by lifecycle hook');
    }

    const columnToAdd = processedColumn ? { ...column, ...processedColumn } : column;

    try {
      // Call adapter - this adds to adapter's data store
      // NOTE: adapter and model share the same columns array reference,
      // so we do NOT call model.addColumn() to avoid duplicate entries.
      const newColumn = await adapter.addColumn(columnToAdd);

      // Trigger re-sort by refreshing the columns array
      this.deps.model.setColumns([...this.deps.model.getColumns()]);

      // Emit event
      this.deps.eventBus.emit('column:add', { column: newColumn });

      // After hook
      this.deps.lifecycle.onColumnAdd?.(newColumn);

      this.deps.render();
      return newColumn;
    } catch (error) {
      this.deps.eventBus.emit('error', {
        type: 'column:add',
        message: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Update column properties
   */
  async updateColumn(columnId: string, updates: Partial<GridColumn>): Promise<void> {
    const adapter = this.deps.adapter;
    if (!adapter) {
      throw new Error('Adapter not initialized');
    }

    const columns = this.getColumns();
    const colIndex = columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return;

    const oldColumn = { ...columns[colIndex] };

    // OPTIMISTIC UPDATE
    const updatedColumn = { ...columns[colIndex], ...updates };
    columns[colIndex] = updatedColumn;
    this.deps.model.setColumns([...columns]);
    this.deps.eventBus.emit('column:update', { columnId, changes: updates });
    this.deps.render();

    // BACKEND SYNC
    try {
      await adapter.updateColumn(columnId, updates);
    } catch (error) {
      // ROLLBACK
      columns[colIndex] = oldColumn;
      this.deps.model.setColumns([...columns]);
      this.deps.eventBus.emit('column:update', { columnId, changes: oldColumn });
      this.deps.render();

      this.deps.eventBus.emit('error', {
        type: 'column:update',
        message: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a column
   * NOTE: This method is kept for backwards compatibility.
   * Prefer using GridEngine.deleteColumn() directly.
   */
  async deleteColumn(columnId: string): Promise<void> {
    const adapter = this.deps.adapter;
    if (!adapter) {
      throw new Error('Adapter not initialized');
    }

    const column = this.getColumn(columnId);
    if (!column) return;

    // Before hook
    const shouldDelete = this.deps.lifecycle.onBeforeColumnDelete?.(columnId);
    if (shouldDelete === false) {
      return;
    }

    try {
      // Call adapter - this creates a new filtered array
      await adapter.deleteColumn(columnId);
      
      // Sync model with adapter's new array
      const data = await adapter.fetchData({});
      this.deps.model.setColumns(data.columns);

      // Emit event
      this.deps.eventBus.emit('column:delete', { columnId, column });

      // After hook
      this.deps.lifecycle.onColumnDelete?.(columnId);

      this.deps.render();
    } catch (error) {
      this.deps.eventBus.emit('error', {
        type: 'column:delete',
        message: (error as Error).message,
      });
      throw error;
    }
  }

  // ===== Column Operations =====

  /**
   * Resize a column
   */
  async resizeColumn(columnId: string, width: number): Promise<void> {
    // Validation
    const clampedWidth = Math.max(50, Math.min(2000, width));

    const columns = this.getColumns();
    const colIndex = columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return;

    const oldWidth = columns[colIndex].width;

    // OPTIMISTIC UPDATE
    columns[colIndex].width = clampedWidth;
    this.deps.model.setColumns([...columns]);

    // Emit event
    this.deps.eventBus.emit('column:resize', {
      columnId,
      width: clampedWidth,
      oldWidth
    });

    // BACKEND SYNC
    const adapter = this.deps.adapter;
    if (adapter) {
      try {
        await adapter.resizeColumn(columnId, clampedWidth);
      } catch (error) {
        // ROLLBACK
        columns[colIndex].width = oldWidth;
        this.deps.model.setColumns([...columns]);
        console.error('Column resize failed:', error);
      }
    }

    this.deps.render();
  }

  /**
   * Auto-resize column to fit content
   */
  async autoResizeColumn(columnId: string): Promise<void> {
    const column = this.getColumn(columnId);
    if (!column) return;

    const rows = this.deps.model.getAllRows();
    const canvas = this.deps.getCanvas();

    // Measure header
    let maxWidth = (column.title.length * 8) + 24;

    // Measure content
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.font = '13px Inter, sans-serif';

      const headerWidth = ctx.measureText(column.title).width + 40;
      maxWidth = Math.max(maxWidth, headerWidth);

      const sampleLimit = 1000;
      const rowsToScan = rows.slice(0, sampleLimit);

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
    await this.resizeColumn(columnId, maxWidth);
  }

  /**
   * Set column visibility
   */
  setColumnVisibility(columnId: string, visible: boolean): void {
    const columns = this.getColumns();
    const colIndex = columns.findIndex(c => c.id === columnId);
    if (colIndex === -1) return;

    columns[colIndex].visible = visible;
    this.deps.model.setColumns([...columns]);

    // Emit event
    this.deps.eventBus.emit('column:visibility', { columnId, visible });

    this.deps.render();
  }

  /**
   * Move/reorder a column
   */
  moveColumn(fromVisibleIndex: number, toVisibleIndex: number): void {
    const visibleCols = this.getVisibleColumns();
    if (
      fromVisibleIndex < 0 || fromVisibleIndex >= visibleCols.length ||
      toVisibleIndex < 0 || toVisibleIndex >= visibleCols.length ||
      fromVisibleIndex === toVisibleIndex
    ) {
      return;
    }

    const fromId = visibleCols[fromVisibleIndex].id;
    const toId = visibleCols[toVisibleIndex].id;

    const allCols = this.getColumns();
    const fromRealIndex = allCols.findIndex(c => c.id === fromId);
    const toRealIndex = allCols.findIndex(c => c.id === toId);

    if (fromRealIndex === -1 || toRealIndex === -1) return;

    // Update model
    this.deps.model.moveColumn(fromRealIndex, toRealIndex);

    // Emit event
    this.deps.eventBus.emit('column:reorder', {
      columnId: fromId,
      fromIndex: fromRealIndex,
      toIndex: toRealIndex
    });

    this.deps.render();
  }

  /**
   * Pin a column to left/right
   */
  async pinColumn(columnId: string, pin: 'left' | 'right' | null): Promise<void> {
    const column = this.getColumn(columnId);
    if (!column) return;

    await this.updateColumn(columnId, { pinned: pin === 'left' || pin === 'right' });
  }

  // ===== Utilities =====

  /**
   * Get column index by ID
   */
  getColumnIndex(columnId: string): number {
    return this.getColumns().findIndex(c => c.id === columnId);
  }

  /**
   * Get visible column index by ID
   */
  getVisibleColumnIndex(columnId: string): number {
    return this.getVisibleColumns().findIndex(c => c.id === columnId);
  }
}

