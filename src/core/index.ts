/**
 * Core Grid Engine - Framework Agnostic
 * 
 * This is the main entry point for the core grid engine.
 * It can be used with any framework or vanilla JavaScript.
 */

// Engine
export { GridEngine } from './engine/GridEngine';
export { EventBus } from './engine/EventBus';
export type { 
  GridEventType, 
  GridEventPayloads, 
  GridEventHandler, 
  Unsubscribe 
} from './engine/EventBus';

// Managers
export { SelectionManager } from './engine/SelectionManager';
export { ColumnManager } from './engine/ColumnManager';
export { EditingManager } from './engine/EditingManager';
export { WorkbookManager } from './workbook/WorkbookManager';

// Model
export { GridModel } from './engine/GridModel';

// Viewport
export { Viewport } from './engine/Viewport';

// Config
export { DEFAULT_CONFIG } from './config/GridConfig';
export type { GridConfig } from './config/GridConfig';

// Types
export type {
  GridColumn,
  GridRow,
  CellValue,
  GridSelection,
  CellPosition,
  GridTheme,
  CellFormat,
} from './types/grid';

export type {
  ColumnSort,
} from './types/platform';

// Workbook Types
export type {
  Sheet,
  WorkbookState
} from './types/workbook';

// Adapters
export type { DataAdapter } from './adapters/DataAdapter';
export { LocalAdapter } from './adapters/LocalAdapter';
export { BackendAdapter } from './adapters/BackendAdapter';

// Platform types
export type { FetchParams, GridData, CellUpdate } from './types/platform';

// Renderer
export type { GridRenderer } from './renderer/types';
export { CanvasRenderer } from './renderer/CanvasRenderer';

// Cell Types
export * from './cell-types';

// Utils
export { CellFormatter } from './utils/CellFormatter';
export { ImageCache } from './utils/ImageCache';

// Factory function
import { GridEngine } from './engine/GridEngine';
import type { GridConfig } from './config/GridConfig';

/**
 * Factory function to create a new GridEngine instance.
 * This is the primary way to initialize the grid library.
 * 
 * @param config - Configuration object with dataSource and optional settings
 */
export function createGridEngine(config: Partial<GridConfig>): GridEngine {
  return new GridEngine(config);
}
