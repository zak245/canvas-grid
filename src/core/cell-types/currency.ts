/**
 * Currency Cell Type
 * 
 * Formatted currency values with proper symbol and locale support.
 * This is a specialized version of the number type with currency-specific defaults.
 */

import type { 
  CellType, 
  CellRenderContext, 
  EditorContext, 
  CellEditor,
  ValidationResult,
} from './types';

// ============================================================================
// Currency Type Options
// ============================================================================

export interface CurrencyTypeOptions {
  /** Currency code (e.g., 'USD', 'EUR', 'GBP') */
  currency?: string;
  /** Locale for formatting (e.g., 'en-US', 'de-DE') */
  locale?: string;
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Show currency symbol (default: true) */
  showSymbol?: boolean;
  /** Symbol position ('before' | 'after') */
  symbolPosition?: 'before' | 'after';
}

// ============================================================================
// Currency Symbols
// ============================================================================

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  KRW: '₩',
  RUB: '₽',
  BRL: 'R$',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  MXN: 'MX$',
  AED: 'د.إ',
  SAR: '﷼',
};

// ============================================================================
// Currency Cell Type Implementation
// ============================================================================

export const currencyCellType: CellType<number> = {
  name: 'currency',
  label: 'Currency',
  defaultWidth: 130,
  editorMode: 'inline',

  // ===== Rendering =====
  
  render(ctx: CanvasRenderingContext2D, context: CellRenderContext<number>): void {
    const { value, x, y, width, height, theme, hasError, options } = context;
    const typeOptions = options as CurrencyTypeOptions | undefined;
    
    // Background for error state
    if (hasError) {
      ctx.fillStyle = 'rgba(254, 226, 226, 0.5)';
      ctx.fillRect(x, y, width, height);
    }
    
    // Format and display currency
    if (value !== null && value !== undefined && !isNaN(value)) {
      const formatted = formatCurrency(value, typeOptions);
      
      ctx.fillStyle = hasError ? '#dc2626' : (value < 0 ? '#dc2626' : '#1f2937');
      ctx.font = `${theme.fontSize}px ${theme.fontFamily}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right'; // Currency is right-aligned
      ctx.fillText(formatted, x + width - 8, y + height / 2);
    }
  },

  // ===== Editing =====
  
  createEditor(context: EditorContext<number>): CellEditor<number> {
    return new CurrencyEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: CurrencyTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid currency value' };
    }
    
    if (options?.min !== undefined && num < options.min) {
      return { valid: false, error: `Value must be at least ${formatCurrency(options.min, options)}` };
    }
    
    if (options?.max !== undefined && num > options.max) {
      return { valid: false, error: `Value must be at most ${formatCurrency(options.max, options)}` };
    }
    
    return { valid: true };
  },
  
  parse(input: string, options?: CurrencyTypeOptions): number | null {
    if (!input || input.trim() === '') return null;
    
    // Remove currency symbols, commas, spaces
    const currencyCode = options?.currency ?? 'USD';
    const symbol = CURRENCY_SYMBOLS[currencyCode] ?? '$';
    
    let cleaned = input
      .replace(new RegExp(`[${symbol}\\s,]`, 'g'), '')
      .replace(/[$€£¥₹₩₽]/g, '')
      .trim();
    
    // Handle negative with parentheses: (100) -> -100
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) return null;
    
    return num;
  },

  // ===== Formatting =====
  
  format(value: number, options?: CurrencyTypeOptions): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return formatCurrency(value, options);
  },
  
  serialize(value: number): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return String(value);
  },

  // ===== Sorting =====
  
  compare(a: number, b: number): number {
    const numA = a ?? 0;
    const numB = b ?? 0;
    return numA - numB;
  },
  
  matches(value: number, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    // Support range filters like { min: 0, max: 100 }
    if (typeof filter === 'object') {
      const rangeFilter = filter as { min?: number; max?: number };
      if (rangeFilter.min !== undefined && value < rangeFilter.min) return false;
      if (rangeFilter.max !== undefined && value > rangeFilter.max) return false;
      return true;
    }
    
    // Exact match
    return value === filter;
  }
};

// ============================================================================
// Currency Editor Implementation
// ============================================================================

class CurrencyEditor implements CellEditor<number> {
  private context: EditorContext<number>;
  private input: HTMLInputElement | null = null;
  private currentValue: number | null;

  constructor(context: EditorContext<number>) {
    this.context = context;
    this.currentValue = context.value ?? null;
  }

  mount(): void {
    const { container, bounds, theme, options } = this.context;
    const typeOptions = options as CurrencyTypeOptions | undefined;
    
    // Create input element
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.inputMode = 'decimal';
    
    // Style the input
    // Note: Container is already positioned at cell location
    Object.assign(this.input.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      padding: '0 8px',
      border: `2px solid ${theme.selectionBorderColor}`,
      borderRadius: '0',
      outline: 'none',
      fontSize: `${theme.fontSize}px`,
      fontFamily: theme.fontFamily,
      backgroundColor: '#fff',
      boxSizing: 'border-box',
      textAlign: 'right',
      zIndex: '1000',
    });
    
    // Set initial value (formatted for display)
    if (this.currentValue !== null) {
      this.input.value = formatCurrency(this.currentValue, typeOptions);
    }
    
    // Event handlers
    this.input.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('input', this.handleInput);
    
    // Add to container
    container.appendChild(this.input);
  }

  unmount(): void {
    if (this.input) {
      this.input.removeEventListener('keydown', this.handleKeyDown);
      this.input.removeEventListener('blur', this.handleBlur);
      this.input.removeEventListener('input', this.handleInput);
      this.input.remove();
      this.input = null;
    }
  }

  getValue(): number {
    return this.currentValue ?? 0;
  }

  setValue(value: number): void {
    this.currentValue = value;
    if (this.input) {
      this.input.value = formatCurrency(value, this.context.options as CurrencyTypeOptions);
    }
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      this.input.select();
    }
  }

  isValid(): boolean {
    const result = currencyCellType.validate(this.currentValue, this.context.options as CurrencyTypeOptions);
    return result.valid;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.context.onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      this.commitValue();
    }
    
    // Allow only valid number characters
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', '-', '.', ',', '(', ')'];
    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      // Allow currency symbols
      if (!['$', '€', '£', '¥', '₹'].includes(e.key)) {
        e.preventDefault();
      }
    }
  };

  private handleBlur = (): void => {
    setTimeout(() => {
      if (this.input && document.activeElement !== this.input) {
        this.commitValue();
      }
    }, 100);
  };

  private handleInput = (): void => {
    if (this.input) {
      const parsed = currencyCellType.parse(this.input.value, this.context.options as CurrencyTypeOptions);
      if (parsed !== null) {
        this.currentValue = parsed;
        this.context.onChange?.(parsed);
      }
    }
  };

  private commitValue(): void {
    if (this.input) {
      const parsed = currencyCellType.parse(this.input.value, this.context.options as CurrencyTypeOptions);
      this.currentValue = parsed;
      this.context.onCommit(parsed ?? 0);
    }
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatCurrency(value: number, options?: CurrencyTypeOptions): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  const currencyCode = options?.currency ?? 'USD';
  const decimals = options?.decimals ?? 2;
  const showSymbol = options?.showSymbol ?? true;
  const symbolPosition = options?.symbolPosition ?? 'before';
  
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? '$';
  const absValue = Math.abs(value);
  
  // Format number with thousands separator
  const formatted = absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  
  // Build final string
  let result = '';
  
  if (showSymbol && symbolPosition === 'before') {
    result = symbol + formatted;
  } else if (showSymbol && symbolPosition === 'after') {
    result = formatted + ' ' + symbol;
  } else {
    result = formatted;
  }
  
  // Handle negative values
  if (value < 0) {
    result = '-' + result;
  }
  
  return result;
}

