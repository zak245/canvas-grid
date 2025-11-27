/**
 * Cell Type Registry
 * 
 * Central registry for all built-in cell types.
 * The grid uses this to look up how to render, edit, and validate cells.
 */

import type { 
  CellType, 
  CellTypeName, 
  CellTypeRegistry, 
  CellDefinition, 
  CanvasCellRenderer 
} from './types';

// Import all built-in cell types
import { textCellType } from './text';
import { numberCellType } from './number';
import { dateCellType } from './date';
import { booleanCellType } from './boolean';
import { selectCellType } from './select';
import { emailCellType } from './email';
import { urlCellType } from './url';
import { phoneCellType } from './phone';
import { progressCellType } from './progress';
import { linkedCellType } from './linked';
import { currencyCellType } from './currency';
import { tagsCellType } from './tags';
import { entityCellType } from './entity';
import { ratingCellType } from './rating';
import { jsonCellType } from './json';
import { aiCellType } from './ai';
import { actionCellType } from './action';

// ============================================================================
// Registry Implementation
// ============================================================================

class CellTypeRegistryImpl implements CellTypeRegistry {
  // Use 'any' to allow different CellType<T> variants
  private types: Map<CellTypeName, CellType<any>> = new Map();

  constructor() {
    // Register all built-in types
    this.register(textCellType);
    this.register(numberCellType);
    this.register(dateCellType);
    this.register(booleanCellType);
    this.register(selectCellType);
    this.register(emailCellType);
    this.register(urlCellType);
    this.register(phoneCellType);
    this.register(progressCellType);
    this.register(linkedCellType);
    this.register(currencyCellType);
    this.register(tagsCellType);
    this.register(entityCellType);
    this.register(ratingCellType);
    this.register(jsonCellType);
    this.register(aiCellType);
    this.register(actionCellType);
  }

  private register(type: CellType<any>): void {
    this.types.set(type.name, type);
  }

  get(name: CellTypeName): CellType {
    const type = this.types.get(name);
    if (!type) {
      // Fall back to text type for unknown types
      console.warn(`[CellTypeRegistry] Unknown cell type "${name}", falling back to text`);
      return this.types.get('text')!;
    }
    return type;
  }

  getDefinition(name: CellTypeName): CellDefinition {
    return this.get(name);
  }

  getRenderer(name: CellTypeName, engine: 'canvas'): CanvasCellRenderer {
    const type = this.get(name);
    if (engine === 'canvas') {
        return type;
    }
    // Fallback to canvas if engine not found, though this shouldn't happen with types
    return type;
  }

  has(name: CellTypeName): boolean {
    return this.types.has(name);
  }

  getAll(): Map<CellTypeName, CellType> {
    return new Map(this.types);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const cellTypeRegistry = new CellTypeRegistryImpl();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get a cell type by name
 */
export function getCellType(name: CellTypeName): CellType {
  return cellTypeRegistry.get(name);
}

/**
 * Format a cell value using its type
 */
export function formatCellValue(
  value: unknown,
  typeName: CellTypeName,
  options?: Record<string, unknown>
): string {
  const type = getCellType(typeName);
  return type.format(value, options);
}

/**
 * Validate a cell value using its type
 */
export function validateCellValue(
  value: unknown,
  typeName: CellTypeName,
  options?: Record<string, unknown>
): { valid: boolean; error?: string } {
  const type = getCellType(typeName);
  return type.validate(value, options);
}

/**
 * Parse a string input using its type
 */
export function parseCellValue(
  input: string,
  typeName: CellTypeName,
  options?: Record<string, unknown>
): unknown {
  const type = getCellType(typeName);
  return type.parse(input, options);
}
