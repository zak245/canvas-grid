/**
 * EventBus - Typed event system for the grid engine
 * 
 * Provides a clean, typed pub/sub mechanism for grid events.
 * Consumers get full TypeScript autocomplete and type safety.
 */

import type { GridColumn, GridRow, GridSelection, CellValue } from '../types/grid';
import type { ColumnSort, MenuItem } from '../types/platform';
import type { ContextType } from './ContextMenuManager';

// ============================================================================
// Event Payload Definitions
// ============================================================================

export interface GridEventPayloads {
  // UI Events
  'context-menu': {
    x: number;
    y: number;
    items: MenuItem[];
    context: ContextType;
  };

  // Data Events
  'data:change': {
    changes: Array<{
      rowIndex: number;
      columnId: string;
      value: CellValue;
      oldValue: CellValue;
    }>;
    source: 'edit' | 'paste' | 'fill' | 'api' | 'delete';
  };
  
  'data:load': {
    rowCount: number;
    columnCount: number;
  };

  // Selection Events
  'selection:change': {
    selection: GridSelection | null;
    previous: GridSelection | null;
  };

  // Column Events
  'column:resize': {
    columnId: string;
    width: number;
    oldWidth: number;
  };

  'column:reorder': {
    columnId: string;
    fromIndex: number;
    toIndex: number;
  };

  'column:add': {
    column: GridColumn;
  };

  'column:delete': {
    columnId: string;
    column: GridColumn;
  };

  'column:update': {
    columnId: string;
    changes: Partial<GridColumn>;
  };

  'column:visibility': {
    columnId: string;
    visible: boolean;
  };

  // Row Events
  'row:add': {
    row: GridRow;
    index: number;
  };

  'row:delete': {
    rowId: string;
    index: number;
  };

  'row:update': {
    row: GridRow;
  };

  // NEW: Row Reorder Event
  'row:reorder': {
    fromIndex: number;
    toIndex: number;
  };

  // Edit Events
  'edit:start': {
    row: number;
    col: number;
    columnId: string;
    value: CellValue;
  };

  'edit:commit': {
    row: number;
    col: number;
    columnId: string;
    value: CellValue;
    oldValue: CellValue;
  };

  'edit:cancel': {
    row: number;
    col: number;
    columnId: string;
  };

  // Sort Events
  'sort:change': {
    sortState: ColumnSort[];
    previousSortState: ColumnSort[];
  };

  // Scroll Events
  'scroll': {
    scrollTop: number;
    scrollLeft: number;
    previousScrollTop: number;
    previousScrollLeft: number;
  };

  // Viewport Events
  'viewport:resize': {
    width: number;
    height: number;
  };

  // Error Events
  'error': {
    type: string;
    message: string;
    details?: unknown;
  };
}

// ============================================================================
// Type Helpers
// ============================================================================

export type GridEventType = keyof GridEventPayloads;

export type GridEventHandler<T extends GridEventType> = (
  payload: GridEventPayloads[T]
) => void;

export type Unsubscribe = () => void;

// ============================================================================
// EventBus Implementation
// ============================================================================

export class EventBus {
  private listeners: Map<GridEventType, Set<GridEventHandler<any>>> = new Map();
  private onceListeners: Map<GridEventType, Set<GridEventHandler<any>>> = new Map();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<T extends GridEventType>(
    event: T,
    handler: GridEventHandler<T>
  ): Unsubscribe {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Subscribe to an event (fires once then auto-unsubscribes)
   * @returns Unsubscribe function
   */
  once<T extends GridEventType>(
    event: T,
    handler: GridEventHandler<T>
  ): Unsubscribe {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler);

    return () => {
      this.onceListeners.get(event)?.delete(handler);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<T extends GridEventType>(
    event: T,
    handler: GridEventHandler<T>
  ): void {
    this.listeners.get(event)?.delete(handler);
    this.onceListeners.get(event)?.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T extends GridEventType>(
    event: T,
    payload: GridEventPayloads[T]
  ): void {
    // Call regular listeners
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in handler for "${event}":`, error);
        }
      });
    }

    // Call once listeners and remove them
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      onceHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventBus] Error in once handler for "${event}":`, error);
        }
      });
      this.onceListeners.delete(event);
    }
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  clear(event?: GridEventType): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: GridEventType): number {
    const regular = this.listeners.get(event)?.size || 0;
    const once = this.onceListeners.get(event)?.size || 0;
    return regular + once;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: GridEventType): boolean {
    return this.listenerCount(event) > 0;
  }
}

// ============================================================================
// Singleton Instance (optional - engines can also create their own)
// ============================================================================

export const createEventBus = (): EventBus => new EventBus();
