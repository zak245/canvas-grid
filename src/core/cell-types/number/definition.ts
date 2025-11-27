import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  NumberTypeOptions 
} from '../types';

// ============================================================================
// Number Cell Definition
// ============================================================================

export const numberCellDefinition: CellDefinition<number> = {
  name: 'number',
  label: 'Number',
  defaultWidth: 120,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<number>): CellEditor<number> {
    return new NumberEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: NumberTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid number' };
    }
    
    if (options?.min !== undefined && num < options.min) {
      return { valid: false, error: `Value must be at least ${options.min}` };
    }
    
    if (options?.max !== undefined && num > options.max) {
      return { valid: false, error: `Value must be at most ${options.max}` };
    }
    
    if (options?.format === 'integer' && !Number.isInteger(num)) {
      return { valid: false, error: 'Value must be an integer' };
    }
    
    return { valid: true };
  },
  
  parse(input: string, options?: NumberTypeOptions): number | null {
    if (!input || input.trim() === '') return null;
    
    // Remove currency symbols, commas, percent signs
    let cleaned = input
      .replace(/[$€£¥₹,]/g, '')
      .replace(/%$/, '')
      .trim();
    
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) return null;
    
    // If it was a percentage, convert to decimal
    if (options?.format === 'percent' && input.includes('%')) {
      return num / 100;
    }
    
    return num;
  },

  // ===== Formatting =====
  
  format(value: number, options?: NumberTypeOptions): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return formatNumber(value, options);
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
// Number Editor Implementation
// ============================================================================

class NumberEditor implements CellEditor<number> {
  private context: EditorContext<number>;
  private input: HTMLInputElement | null = null;
  private currentValue: number | null;

  constructor(context: EditorContext<number>) {
    this.context = context;
    this.currentValue = context.value ?? null;
  }

  mount(): void {
    const { container, bounds, theme, options } = this.context;
    const typeOptions = options as NumberTypeOptions | undefined;
    
    // Create input element
    this.input = document.createElement('input');
    this.input.type = 'text'; // Use text for better control over formatting
    this.input.inputMode = 'decimal'; // Mobile keyboard hint
    
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
      color: '#1f2937',
      boxSizing: 'border-box',
      textAlign: 'right',
      zIndex: '1000',
    });
    
    // Set initial value (formatted for display)
    if (this.currentValue !== null) {
      this.input.value = formatNumber(this.currentValue, typeOptions);
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
      this.input.value = formatNumber(value, this.context.options as NumberTypeOptions);
    }
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      this.input.select();
    }
  }

  isValid(): boolean {
    const result = numberCellDefinition.validate(this.currentValue, this.context.options as NumberTypeOptions);
    return result.valid;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.commitValue(true); // true = move next
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.commitValue();
    } else {
        e.stopPropagation();
    }
    
    // Allow only valid number characters
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter', 'Escape', '-', '.', ','];
    if (!allowedKeys.includes(e.key) && !/^\d$/.test(e.key) && !e.metaKey && !e.ctrlKey) {
      // Allow currency and percent symbols in input
      if (!['$', '€', '£', '%'].includes(e.key)) {
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
      const parsed = numberCellDefinition.parse(this.input.value, this.context.options as NumberTypeOptions);
      if (parsed !== null) {
        this.currentValue = parsed;
        this.context.onChange?.(parsed);
      }
    }
  };

  private commitValue(moveNext: boolean = false): void {
    if (this.input) {
      const parsed = numberCellDefinition.parse(this.input.value, this.context.options as NumberTypeOptions);
      this.currentValue = parsed;
      this.context.onCommit(parsed ?? 0, moveNext);
    }
  }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatNumber(value: number, options?: NumberTypeOptions): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  
  const format = options?.format ?? 'decimal';
  const decimals = options?.decimals ?? (format === 'integer' ? 0 : 2);
  const currency = options?.currency ?? 'USD';
  const useSeparator = options?.thousandsSeparator ?? true;
  
  switch (format) {
    case 'integer':
      return formatWithSeparator(Math.round(value), 0, useSeparator);
    
    case 'currency':
      return formatCurrency(value, currency, decimals);
    
    case 'percent':
      return formatWithSeparator(value * 100, decimals, useSeparator) + '%';
    
    case 'decimal':
    default:
      return formatWithSeparator(value, decimals, useSeparator);
  }
}

function formatWithSeparator(value: number, decimals: number, useSeparator: boolean): string {
  const fixed = value.toFixed(decimals);
  
  if (!useSeparator) return fixed;
  
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}

function formatCurrency(value: number, currency: string, decimals: number): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
  };
  
  const symbol = symbols[currency] ?? '$';
  const formatted = formatWithSeparator(Math.abs(value), decimals, true);
  
  if (value < 0) {
    return `-${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}

