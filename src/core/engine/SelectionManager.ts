/**
 * SelectionManager - Handles all selection-related state and operations
 * 
 * Extracted from GridEngine to provide a focused, testable selection API.
 */

import type { StoreApi } from 'zustand/vanilla';
import type { GridSelection, CellPosition, SelectionRange } from '../types/grid';
import type { GridEngineState } from './GridEngine';
import type { EventBus } from './EventBus';

export interface SelectionManagerDeps {
  store: StoreApi<GridEngineState>;
  eventBus: EventBus;
  getRowCount: () => number;
  getColumnCount: () => number;
}

export class SelectionManager {
  private deps: SelectionManagerDeps;

  constructor(deps: SelectionManagerDeps) {
    this.deps = deps;
  }

  // ===== Getters =====

  /**
   * Get current selection state
   */
  getSelection(): GridSelection | null {
    return this.deps.store.getState().selection;
  }

  /**
   * Get the primary (focused) cell position
   */
  getPrimaryCell(): CellPosition | null {
    return this.getSelection()?.primary || null;
  }

  /**
   * Get all selected ranges
   */
  getRanges(): SelectionRange[] {
    return this.getSelection()?.ranges || [];
  }

  // ===== Setters =====

  /**
   * Set the selection state directly
   */
  setSelection(selection: GridSelection | null): void {
    const previous = this.getSelection();
    this.deps.store.setState({ selection });
    this.deps.eventBus.emit('selection:change', { selection, previous });
  }

  /**
   * Clear all selection
   */
  clearSelection(): void {
    this.setSelection(null);
  }

  // ===== Cell Selection =====

  /**
   * Select a single cell
   */
  selectCell(row: number, col: number): void {
    this.setSelection({
      primary: { row, col },
      ranges: [{ start: { row, col }, end: { row, col } }]
    });
  }

  /**
   * Extend selection from current primary to target cell
   */
  extendSelection(targetRow: number, targetCol: number): void {
    const current = this.getSelection();
    if (!current?.primary) {
      this.selectCell(targetRow, targetCol);
      return;
    }

    const { row: anchorRow, col: anchorCol } = current.primary;

    this.setSelection({
      primary: { row: targetRow, col: targetCol },
      ranges: [{
        start: {
          row: Math.min(anchorRow, targetRow),
          col: Math.min(anchorCol, targetCol)
        },
        end: {
          row: Math.max(anchorRow, targetRow),
          col: Math.max(anchorCol, targetCol)
        }
      }]
    });
  }

  /**
   * Add a new range to existing selection (Cmd/Ctrl+Click)
   */
  addRange(range: SelectionRange, primary?: CellPosition): void {
    const current = this.getSelection();
    const existingRanges = current?.ranges || [];

    this.setSelection({
      primary: primary || range.start,
      ranges: [...existingRanges, range]
    });
  }

  // ===== Row Selection =====

  /**
   * Select an entire row
   */
  selectRow(rowIndex: number, multi: boolean = false): void {
    const colCount = this.deps.getColumnCount();
    if (colCount === 0) return;

    const range: SelectionRange = {
      start: { col: 0, row: rowIndex },
      end: { col: colCount - 1, row: rowIndex }
    };

    const current = this.getSelection();

    if (multi && current) {
      this.setSelection({
        primary: { col: 0, row: rowIndex },
        ranges: [...current.ranges, range]
      });
    } else {
      this.setSelection({
        primary: { col: 0, row: rowIndex },
        ranges: [range]
      });
    }
  }

  /**
   * Toggle row selection (select if not selected, deselect if selected)
   */
  toggleRowSelection(rowIndex: number, multi: boolean = false): void {
    const selection = this.getSelection();
    const colCount = this.deps.getColumnCount();

    if (!selection) {
      this.selectRow(rowIndex, multi);
      return;
    }

    // Check if range covering this row exists
    const existingRangeIndex = selection.ranges.findIndex(r =>
      r.start.row === rowIndex && r.end.row === rowIndex &&
      r.start.col === 0 && r.end.col >= colCount - 1
    );

    if (existingRangeIndex >= 0) {
      // Deselect
      const newRanges = [...selection.ranges];
      newRanges.splice(existingRangeIndex, 1);

      if (newRanges.length === 0) {
        this.clearSelection();
      } else {
        this.setSelection({
          primary: selection.primary,
          ranges: newRanges
        });
      }
    } else {
      // Select
      this.selectRow(rowIndex, multi);
    }
  }

  /**
   * Check if a row is fully selected
   */
  isRowSelected(rowIndex: number): boolean {
    const selection = this.getSelection();
    if (!selection) return false;

    const colCount = this.deps.getColumnCount();
    return selection.ranges.some(r =>
      r.start.row <= rowIndex && r.end.row >= rowIndex &&
      r.start.col === 0 && r.end.col >= colCount - 1
    );
  }

  /**
   * Extend row selection from anchor to target
   */
  extendRowSelection(anchorRow: number, targetRow: number): void {
    const colCount = this.deps.getColumnCount();
    if (colCount === 0) return;

    this.setSelection({
      primary: { col: 0, row: targetRow },
      ranges: [{
        start: { col: 0, row: Math.min(anchorRow, targetRow) },
        end: { col: colCount - 1, row: Math.max(anchorRow, targetRow) }
      }]
    });
  }

  // ===== Column Selection =====

  /**
   * Select an entire column
   */
  selectColumn(colIndex: number, multiSelect: boolean = false, rangeSelect: boolean = false): void {
    const rowCount = this.deps.getRowCount();
    if (rowCount === 0) return;

    const current = this.getSelection();

    // Range Select (Shift + Click)
    if (rangeSelect && current?.primary) {
      const anchorCol = current.primary.col;
      this.setSelection({
        primary: current.primary,
        ranges: [{
          start: { col: Math.min(anchorCol, colIndex), row: 0 },
          end: { col: Math.max(anchorCol, colIndex), row: rowCount - 1 }
        }]
      });
      return;
    }

    // Multi Select (Cmd/Ctrl + Click)
    if (multiSelect && current) {
      const newRange: SelectionRange = {
        start: { col: colIndex, row: 0 },
        end: { col: colIndex, row: rowCount - 1 }
      };

      // Check if already selected to toggle off
      const isAlreadySelected = current.ranges.some(r =>
        r.start.col === colIndex && r.end.col === colIndex &&
        r.start.row === 0 && r.end.row === rowCount - 1
      );

      if (isAlreadySelected) {
        // Remove this range
        const newRanges = current.ranges.filter(r =>
          !(r.start.col === colIndex && r.end.col === colIndex)
        );

        if (newRanges.length === 0) {
          this.clearSelection();
        } else {
          this.setSelection({
            primary: current.primary,
            ranges: newRanges
          });
        }
      } else {
        // Add range
        this.setSelection({
          primary: { col: colIndex, row: 0 },
          ranges: [...current.ranges, newRange]
        });
      }
      return;
    }

    // Default: Single Select with Toggle
    const isSingleColumnSelected = current?.ranges.length === 1 &&
      current.ranges[0].start.col === colIndex &&
      current.ranges[0].end.col === colIndex &&
      current.ranges[0].start.row === 0 &&
      current.ranges[0].end.row === rowCount - 1;

    if (isSingleColumnSelected) {
      this.clearSelection();
    } else {
      this.setSelection({
        primary: { col: colIndex, row: 0 },
        ranges: [{
          start: { col: colIndex, row: 0 },
          end: { col: colIndex, row: rowCount - 1 }
        }]
      });
    }
  }

  // ===== Navigation =====

  /**
   * Move selection relative to current primary cell
   */
  moveSelection(deltaRow: number, deltaCol: number): CellPosition | null {
    const selection = this.getSelection();
    if (!selection?.primary) return null;

    const { row, col } = selection.primary;
    const rowCount = this.deps.getRowCount();
    const colCount = this.deps.getColumnCount();

    const newRow = Math.max(0, Math.min(rowCount - 1, row + deltaRow));
    const newCol = Math.max(0, Math.min(colCount - 1, col + deltaCol));

    if (newRow !== row || newCol !== col) {
      this.selectCell(newRow, newCol);
      return { row: newRow, col: newCol };
    }

    return null;
  }

  /**
   * Select all cells
   */
  selectAll(): void {
    const rowCount = this.deps.getRowCount();
    const colCount = this.deps.getColumnCount();

    if (rowCount === 0 || colCount === 0) return;

    this.setSelection({
      primary: { row: 0, col: 0 },
      ranges: [{
        start: { row: 0, col: 0 },
        end: { row: rowCount - 1, col: colCount - 1 }
      }]
    });
  }

  // ===== Utilities =====

  /**
   * Check if a cell is within the current selection
   */
  isCellSelected(row: number, col: number): boolean {
    const selection = this.getSelection();
    if (!selection) return false;

    return selection.ranges.some(range =>
      row >= range.start.row && row <= range.end.row &&
      col >= range.start.col && col <= range.end.col
    );
  }

  /**
   * Check if a cell is the primary (focused) cell
   */
  isCellPrimary(row: number, col: number): boolean {
    const primary = this.getPrimaryCell();
    return primary?.row === row && primary?.col === col;
  }

  /**
   * Get the bounding box of all selected ranges
   */
  getSelectionBounds(): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
    const ranges = this.getRanges();
    if (ranges.length === 0) return null;

    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    for (const range of ranges) {
      minRow = Math.min(minRow, range.start.row);
      maxRow = Math.max(maxRow, range.end.row);
      minCol = Math.min(minCol, range.start.col);
      maxCol = Math.max(maxCol, range.end.col);
    }

    return { minRow, maxRow, minCol, maxCol };
  }
}

