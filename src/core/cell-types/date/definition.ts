import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  DateTypeOptions 
} from '../types';

// ============================================================================
// Date Cell Definition
// ============================================================================

export const dateCellDefinition: CellDefinition<Date | string> = {
  name: 'date',
  label: 'Date',
  defaultWidth: 140,
  editorMode: 'overlay',

  // ===== Editing =====
  
  createEditor(context: EditorContext<Date | string>): CellEditor<Date | string> {
    return new DateEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: DateTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const date = parseDate(value);
    
    if (!date || isNaN(date.getTime())) {
      return { valid: false, error: 'Invalid date' };
    }
    
    if (options?.minDate && date < options.minDate) {
      return { valid: false, error: `Date must be after ${formatDate(options.minDate)}` };
    }
    
    if (options?.maxDate && date > options.maxDate) {
      return { valid: false, error: `Date must be before ${formatDate(options.maxDate)}` };
    }
    
    return { valid: true };
  },
  
  parse(input: string): Date | null {
    if (!input || input.trim() === '') return null;
    
    const date = new Date(input);
    if (isNaN(date.getTime())) return null;
    
    return date;
  },

  // ===== Formatting =====
  
  format(value: Date | string, options?: DateTypeOptions): string {
    const date = parseDate(value);
    if (!date) return '';
    return formatDate(date, options);
  },
  
  serialize(value: Date | string): string {
    const date = parseDate(value);
    if (!date) return '';
    return date.toISOString();
  },

  // ===== Sorting =====
  
  compare(a: Date | string, b: Date | string): number {
    const dateA = parseDate(a);
    const dateB = parseDate(b);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateA.getTime() - dateB.getTime();
  },
  
  matches(value: Date | string, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    const date = parseDate(value);
    if (!date) return false;
    
    // Support range filters
    if (typeof filter === 'object') {
      const rangeFilter = filter as { start?: Date | string; end?: Date | string };
      const start = rangeFilter.start ? parseDate(rangeFilter.start) : null;
      const end = rangeFilter.end ? parseDate(rangeFilter.end) : null;
      
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    }
    
    return false;
  }
};

// ============================================================================
// Date Editor Implementation
// ============================================================================

class DateEditor implements CellEditor<Date | string> {
  private context: EditorContext<Date | string>;
  private container: HTMLDivElement | null = null;
  private input: HTMLInputElement | null = null;
  private currentValue: Date | null;

  constructor(context: EditorContext<Date | string>) {
    this.context = context;
    this.currentValue = parseDate(context.value);
  }

  mount(): void {
    const { container, bounds, theme, options } = this.context;
    const typeOptions = options as DateTypeOptions | undefined;
    
    // Create container for the date picker
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      zIndex: '1000',
    });
    
    // Create native date input
    this.input = document.createElement('input');
    this.input.type = typeOptions?.includeTime ? 'datetime-local' : 'date';
    
    Object.assign(this.input.style, {
      width: `${Math.max(bounds.width, 200)}px`,
      height: `${bounds.height}px`,
      padding: '0 8px',
      border: `2px solid ${theme.selectionBorderColor}`,
      borderRadius: '4px',
      outline: 'none',
      fontSize: `${theme.fontSize}px`,
      fontFamily: theme.fontFamily,
      backgroundColor: '#fff',
      color: '#1f2937',
      boxSizing: 'border-box',
    });
    
    // Set initial value
    if (this.currentValue) {
      if (typeOptions?.includeTime) {
        this.input.value = toDateTimeLocalString(this.currentValue);
      } else {
        this.input.value = toDateString(this.currentValue);
      }
    }
    
    // Set min/max dates
    if (typeOptions?.minDate) {
      this.input.min = toDateString(typeOptions.minDate);
    }
    if (typeOptions?.maxDate) {
      this.input.max = toDateString(typeOptions.maxDate);
    }
    
    // Event handlers
    this.input.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('change', this.handleChange);
    
    this.container.appendChild(this.input);
    container.appendChild(this.container);
  }

  unmount(): void {
    if (this.input) {
      this.input.removeEventListener('keydown', this.handleKeyDown);
      this.input.removeEventListener('blur', this.handleBlur);
      this.input.removeEventListener('change', this.handleChange);
    }
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.input = null;
  }

  getValue(): Date | string {
    return this.currentValue ?? '';
  }

  setValue(value: Date | string): void {
    this.currentValue = parseDate(value);
    if (this.input && this.currentValue) {
      this.input.value = toDateString(this.currentValue);
    }
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      this.input.showPicker?.(); // Open native date picker if supported
    }
  }

  isValid(): boolean {
    const result = dateCellDefinition.validate(this.currentValue, this.context.options as DateTypeOptions);
    return result.valid;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCommit(this.currentValue ?? '', true); // true = move next
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCommit(this.currentValue ?? '');
    } else {
        e.stopPropagation();
    }
  };

  private handleBlur = (): void => {
    setTimeout(() => {
      if (this.input && document.activeElement !== this.input) {
        this.context.onCommit(this.currentValue ?? '');
      }
    }, 150);
  };

  private handleChange = (): void => {
    if (this.input) {
      this.currentValue = this.input.value ? new Date(this.input.value) : null;
      this.context.onChange?.(this.currentValue ?? '');
    }
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  if (typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  
  return null;
}

function formatDate(date: Date, options?: DateTypeOptions): string {
  if (!date || isNaN(date.getTime())) return '';
  
  const format = options?.format ?? 'date';
  
  switch (format) {
    case 'relative':
      return formatRelative(date);
    
    case 'datetime':
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'time':
      return date.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      });
    
    case 'date':
    default:
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  }
}

function formatRelative(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  
  return `${Math.floor(diffDays / 365)}y ago`;
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function toDateTimeLocalString(date: Date): string {
  return date.toISOString().slice(0, 16);
}

