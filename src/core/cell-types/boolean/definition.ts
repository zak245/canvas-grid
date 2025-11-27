import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  BooleanTypeOptions 
} from '../types';

// ============================================================================
// Boolean Cell Definition
// ============================================================================

export const booleanCellDefinition: CellDefinition<boolean> = {
  name: 'boolean',
  label: 'Checkbox',
  defaultWidth: 80,
  editorMode: 'inline', // Click to toggle

  // ===== Editing =====
  
  createEditor(context: EditorContext<boolean>): CellEditor<boolean> {
    // Boolean cells toggle on click, no separate editor needed
    return new BooleanEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    if (typeof value !== 'boolean') {
      // Try to coerce
      if (value === 'true' || value === 1 || value === '1') {
        return { valid: true };
      }
      if (value === 'false' || value === 0 || value === '0' || value === '') {
        return { valid: true };
      }
      return { valid: false, error: 'Value must be true or false' };
    }
    
    return { valid: true };
  },
  
  parse(input: string): boolean | null {
    if (input === null || input === undefined || input === '') return null;
    
    const lower = String(input).toLowerCase().trim();
    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on') {
      return true;
    }
    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off') {
      return false;
    }
    
    return null;
  },

  // ===== Formatting =====
  
  format(value: boolean, options?: BooleanTypeOptions): string {
    if (value === null || value === undefined) return '';
    
    if (value) {
      return options?.trueLabel ?? 'Yes';
    }
    return options?.falseLabel ?? 'No';
  },
  
  serialize(value: boolean): string {
    return value ? 'true' : 'false';
  },

  // ===== Sorting =====
  
  compare(a: boolean, b: boolean): number {
    // true before false
    if (a === b) return 0;
    return a ? -1 : 1;
  },
  
  matches(value: boolean, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    return value === filter;
  }
};

// ============================================================================
// Boolean Editor Implementation
// ============================================================================

class BooleanEditor implements CellEditor<boolean> {
  private context: EditorContext<boolean>;
  private currentValue: boolean;

  constructor(context: EditorContext<boolean>) {
    this.context = context;
    this.currentValue = context.value ?? false;
  }

  mount(): void {
    // Toggle immediately on mount (click triggered the edit)
    this.currentValue = !this.currentValue;
    
    // Commit the toggled value immediately
    setTimeout(() => {
      this.context.onCommit(this.currentValue);
    }, 0);
  }

  unmount(): void {
    // Nothing to clean up
  }

  getValue(): boolean {
    return this.currentValue;
  }

  setValue(value: boolean): void {
    this.currentValue = value;
  }

  focus(): void {
    // No focusable element
  }

  isValid(): boolean {
    return true;
  }
}

