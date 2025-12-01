/**
 * EditingManager - Handles cell editing lifecycle
 * 
 * Extracted from GridEngine to provide a focused, testable editing API.
 */

import type { StoreApi } from 'zustand/vanilla';
import type { CellValue, GridColumn } from '../types/grid';
import type { GridEngineState } from './GridEngine';
import type { GridModel } from './GridModel';
import type { EventBus } from './EventBus';
import type { LifecycleHooks } from '../config/GridConfig';

export interface EditingManagerDeps {
  store: StoreApi<GridEngineState>;
  model: GridModel;
  eventBus: EventBus;
  lifecycle: LifecycleHooks;
  getCanvas: () => HTMLCanvasElement | null;
}

export interface EditingState {
  row: number;
  col: number;
  columnId: string;
  value: CellValue;
}

export class EditingManager {
  private deps: EditingManagerDeps;

  constructor(deps: EditingManagerDeps) {
    this.deps = deps;
  }

  // ===== Getters =====

  /**
   * Get current editing state
   */
  getEditingCell(): { row: number; col: number } | null {
    return this.deps.store.getState().editingCell;
  }

  /**
   * Check if currently editing
   */
  isEditing(): boolean {
    return this.getEditingCell() !== null;
  }

  /**
   * Get full editing state including value
   */
  getEditingState(): EditingState | null {
    const editingCell = this.getEditingCell();
    if (!editingCell) return null;

    const { row, col } = editingCell;
    const visibleCols = this.deps.model.getVisibleColumns();
    const column = visibleCols[col];
    if (!column) return null;

    const rows = this.deps.model.getAllRows();
    const value = rows[row]?.cells.get(column.id)?.value;

    return {
      row,
      col,
      columnId: column.id,
      value
    };
  }

  // ===== Edit Lifecycle =====

  /**
   * Start editing a cell
   */
  startEdit(row: number, col: number): boolean {
    const visibleCols = this.deps.model.getVisibleColumns();
    const column = visibleCols[col];
    if (!column) return false;

    // Check lifecycle hook
    if (this.deps.lifecycle.onBeforeCellEdit?.(row, column.id) === false) {
      return false;
    }

    // Get current value
    const rows = this.deps.model.getAllRows();
    const cellValue = rows[row]?.cells.get(column.id)?.value;

    // Check if editable (cell type check or readonly prop)
    // TODO: Check column.editable or cellType.editable?
    // Assuming for now all cells are editable if enabled in config.

    // Always set editing state - the CellEditorOverlay handles the mode
    this.deps.store.setState({ editingCell: { row, col } });
    this.deps.lifecycle.onCellEditStart?.(row, column.id, cellValue);

    // Emit event
    this.deps.eventBus.emit('edit:start', {
      row,
      col,
      columnId: column.id,
      value: cellValue
    });

    return true;
  }

  /**
   * Commit the current edit
   */
  commitEdit(newValue: CellValue): boolean {
    const editingCell = this.getEditingCell();
    if (!editingCell) return false;

    const { row, col } = editingCell;
    const visibleCols = this.deps.model.getVisibleColumns();
    const column = visibleCols[col];
    if (!column) return false;

    // Get old value
    const rows = this.deps.model.getAllRows();
    const oldValue = rows[row]?.cells.get(column.id)?.value;

    // Clear editing state
    this.deps.store.setState({ editingCell: null });

    // Focus canvas
    this.deps.getCanvas()?.focus();

    // Emit event
    this.deps.eventBus.emit('edit:commit', {
      row,
      col,
      columnId: column.id,
      value: newValue,
      oldValue
    });

    // Lifecycle hook
    this.deps.lifecycle.onCellEditEnd?.(row, column.id, newValue);

    return true;
  }

  /**
   * Cancel the current edit
   */
  cancelEdit(): boolean {
    const editingCell = this.getEditingCell();
    if (!editingCell) return false;

    const { row, col } = editingCell;
    const visibleCols = this.deps.model.getVisibleColumns();
    const column = visibleCols[col];

    // Clear editing state
    this.deps.store.setState({ editingCell: null });

    // Focus canvas
    this.deps.getCanvas()?.focus();

    // Emit event
    if (column) {
      this.deps.eventBus.emit('edit:cancel', {
        row,
        col,
        columnId: column.id
      });
    }

    return true;
  }

  /**
   * Stop editing (commit or cancel based on parameter)
   */
  stopEdit(cancel: boolean = false): boolean {
    if (cancel) {
      return this.cancelEdit();
    }
    
    // For stopEdit without explicit commit, just clear the state
    // The actual commit happens via commitEdit with the new value
    const editingCell = this.getEditingCell();
    if (!editingCell) return false;

    const { row, col } = editingCell;
    const visibleCols = this.deps.model.getVisibleColumns();
    const column = visibleCols[col];

    // Clear editing state
    this.deps.store.setState({ editingCell: null });

    // Focus canvas
    this.deps.getCanvas()?.focus();

    // Lifecycle hook
    if (column) {
      const rows = this.deps.model.getAllRows();
      const cellValue = rows[row]?.cells.get(column.id)?.value;
      this.deps.lifecycle.onCellEditEnd?.(row, column.id, cellValue);
    }

    return true;
  }

  // ===== Utilities =====

  /**
   * Check if a specific cell is being edited
   */
  isCellEditing(row: number, col: number): boolean {
    const editing = this.getEditingCell();
    return editing?.row === row && editing?.col === col;
  }

  /**
   * Get the column being edited
   */
  getEditingColumn(): GridColumn | null {
    const editing = this.getEditingCell();
    if (!editing) return null;

    const visibleCols = this.deps.model.getVisibleColumns();
    return visibleCols[editing.col] || null;
  }
}

