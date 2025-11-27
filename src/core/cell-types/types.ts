/**
 * Cell Type System - Core Interfaces
 * 
 * Each cell type owns its rendering, editing, validation, and formatting.
 * This is the foundation of the opinionated grid library.
 */

import type { GridTheme } from '../types/grid';

// ============================================================================
// Core Cell Type Interface
// ============================================================================

/**
 * CellDefinition defines the core behavior of a cell (engine-agnostic).
 * It handles validation, formatting, parsing, and editor creation.
 */
export interface CellDefinition<T = unknown> {
  /** Unique identifier for this cell type */
  readonly name: CellTypeName;
  
  /** Human-readable label */
  readonly label: string;
  
  /** Default width for columns of this type */
  readonly defaultWidth: number;

  /**
   * Create an editor for this cell type
   * Returns an editor instance that manages the editing UI
   */
  createEditor(context: EditorContext<T>): CellEditor<T>;
  
  /**
   * Whether this cell type supports inline editing (vs overlay/drawer)
   */
  readonly editorMode: 'inline' | 'overlay' | 'drawer';

  // ===== Validation =====
  
  /**
   * Validate a value for this cell type
   */
  validate(value: unknown, options?: TypeOptions): ValidationResult;
  
  /**
   * Parse a string input into the typed value
   */
  parse(input: string, options?: TypeOptions): T | null;

  // ===== Formatting =====
  
  /**
   * Format a value for display
   */
  format(value: T, options?: TypeOptions): string;
  
  /**
   * Get the raw value for clipboard/export
   */
  serialize(value: T): string;

  // ===== Sorting & Filtering =====
  
  /**
   * Compare two values for sorting
   */
  compare(a: T, b: T): number;
  
  /**
   * Check if value matches a filter
   */
  matches?(value: T, filter: unknown): boolean;
}

/**
 * CanvasCellRenderer defines how a cell is drawn on the HTML5 Canvas.
 */
export interface CanvasCellRenderer<T = unknown> {
  /**
   * Render the cell value to canvas
   */
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<T>): void;
}

/**
 * HtmlCellRenderer defines how a cell is rendered in the DOM (React/HTML).
 * (Future proofing for HTML engine)
 */
export interface HtmlCellRenderer<T = unknown> {
  /**
   * Render the cell value as a React node or HTML string
   */
  render(context: CellRenderContext<T>): React.ReactNode | string;
}

/**
 * Legacy CellType interface for backward compatibility during migration.
 * Combines definition and canvas renderer.
 */
export interface CellType<T = unknown> extends CellDefinition<T>, CanvasCellRenderer<T> {}

// ============================================================================
// Cell Type Names (Built-in types only)
// ============================================================================

export type CellTypeName = 
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'email'
  | 'url'
  | 'phone'
  | 'progress'
  | 'linked'
  // New types (Phase 2)
  | 'currency'
  | 'tags'
  | 'entity'
  | 'rating'
  | 'json'
  | 'ai'
  | 'action';

// ============================================================================
// Type-Specific Options
// ============================================================================

export interface TextTypeOptions {
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
}

export interface NumberTypeOptions {
  format?: 'integer' | 'decimal' | 'currency' | 'percent';
  decimals?: number;
  currency?: string;
  min?: number;
  max?: number;
  thousandsSeparator?: boolean;
}

export interface DateTypeOptions {
  format?: 'date' | 'datetime' | 'time' | 'relative';
  dateFormat?: string; // e.g., 'YYYY-MM-DD'
  includeTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export interface BooleanTypeOptions {
  trueLabel?: string;
  falseLabel?: string;
  allowIndeterminate?: boolean;
}

export interface SelectTypeOptions {
  options: SelectOption[];
  multiple?: boolean;
  allowCreate?: boolean;
  maxSelections?: number;
}

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
}

export interface EmailTypeOptions {
  allowMultiple?: boolean;
  domains?: string[]; // Allowed domains
}

export interface UrlTypeOptions {
  allowedProtocols?: string[];
  showPreview?: boolean;
}

export interface PhoneTypeOptions {
  format?: 'international' | 'national' | 'e164';
  defaultCountry?: string;
  allowMultiple?: boolean;
}

export interface ProgressTypeOptions {
  min?: number;
  max?: number;
  showLabel?: boolean;
  color?: string;
}

export interface LinkedTypeOptions {
  source: string; // Table/collection name
  displayField?: string;
  searchFields?: string[];
  allowMultiple?: boolean;
  showAvatar?: boolean;
}

// New type options (Phase 2)
export interface CurrencyTypeOptions {
  currency?: string;
  locale?: string;
  decimals?: number;
  min?: number;
  max?: number;
  showSymbol?: boolean;
  symbolPosition?: 'before' | 'after';
}

export interface TagsTypeOptions {
  options?: { label: string; color?: string }[];
  allowCustom?: boolean;
  maxTags?: number;
  defaultColor?: string;
}

export interface EntityTypeOptions {
  showImage?: boolean;
  showSubtitle?: boolean;
  imageShape?: 'circle' | 'square' | 'rounded';
  imageSize?: number;
}

export interface RatingTypeOptions {
  max?: number;
  icon?: 'star' | 'heart' | 'circle';
  allowHalf?: boolean;
  color?: string;
}

export interface JsonTypeOptions {
  displayMode?: 'raw' | 'summary' | 'key-value';
  maxKeys?: number;
  expandable?: boolean;
}

export interface AITypeOptions {
  mode?: 'streaming' | 'status' | 'enrichment';
  showProgress?: boolean;
}

export interface ActionTypeOptions {
  buttons?: { id: string; icon: string; tooltip?: string; disabled?: boolean }[];
}

export type TypeOptions = 
  | TextTypeOptions 
  | NumberTypeOptions 
  | DateTypeOptions
  | BooleanTypeOptions
  | SelectTypeOptions
  | EmailTypeOptions
  | UrlTypeOptions
  | PhoneTypeOptions
  | ProgressTypeOptions
  | LinkedTypeOptions
  // New types (Phase 2)
  | CurrencyTypeOptions
  | TagsTypeOptions
  | EntityTypeOptions
  | RatingTypeOptions
  | JsonTypeOptions
  | AITypeOptions
  | ActionTypeOptions;

// ============================================================================
// Render Context
// ============================================================================

export interface CellRenderContext<T = unknown> {
  /** The cell value */
  value: T;
  
  /** Display value (formatted) */
  displayValue: string;
  
  /** Cell bounds */
  x: number;
  y: number;
  width: number;
  height: number;
  
  /** Cell state */
  isSelected: boolean;
  isFocused: boolean;
  isEditing: boolean;
  isHovered: boolean;
  
  /** Error state */
  hasError: boolean;
  errorMessage?: string;
  
  /** Type-specific options */
  options?: TypeOptions;
  
  /** Current theme */
  theme: GridTheme;
  
  /** Row index */
  rowIndex: number;
  
  /** Column ID */
  columnId: string;
}

// ============================================================================
// Editor Context & Interface
// ============================================================================

export interface EditorContext<T = unknown> {
  /** Container element for the editor */
  container: HTMLElement;
  
  /** Initial value */
  value: T;
  
  /** Cell bounds (screen coordinates) */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Type-specific options */
  options?: TypeOptions;
  
  /** Current theme */
  theme: GridTheme;
  
  /** Row index */
  rowIndex: number;
  
  /** Column ID */
  columnId: string;
  
  /** Callbacks */
  onCommit: (value: T, moveNext?: boolean) => void;
  onCancel: () => void;
  onChange?: (value: T) => void;
}

export interface CellEditor<T = unknown> {
  /** Initialize and show the editor */
  mount(): void;
  
  /** Clean up and remove the editor */
  unmount(): void;
  
  /** Get the current value */
  getValue(): T;
  
  /** Set the value programmatically */
  setValue(value: T): void;
  
  /** Focus the editor */
  focus(): void;
  
  /** Check if editor is valid */
  isValid(): boolean;
}

// ============================================================================
// Validation
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

// ============================================================================
// Cell Type Registry
// ============================================================================

export interface CellTypeRegistry {
  /** Get a cell type by name (legacy / combined) */
  get(name: CellTypeName): CellType;
  
  /** Get just the definition */
  getDefinition(name: CellTypeName): CellDefinition;
  
  /** Get just the renderer for a specific engine */
  getRenderer(name: CellTypeName, engine: 'canvas'): CanvasCellRenderer;
  // Future: getRenderer(name: CellTypeName, engine: 'html'): HtmlCellRenderer;
  
  /** Check if a cell type exists */
  has(name: CellTypeName): boolean;
  
  /** Get all registered cell types */
  getAll(): Map<CellTypeName, CellType>;
}
