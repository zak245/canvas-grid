import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  EmailTypeOptions 
} from '../types';

// ============================================================================
// Email Validation Regex
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Email Cell Definition
// ============================================================================

export const emailCellDefinition: CellDefinition<string> = {
  name: 'email',
  label: 'Email',
  defaultWidth: 220,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string>): CellEditor<string> {
    return new EmailEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: EmailTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const email = String(value).trim();
    
    if (!EMAIL_REGEX.test(email)) {
      return { valid: false, error: 'Invalid email address' };
    }
    
    // Check allowed domains
    if (options?.domains && options.domains.length > 0) {
      const domain = email.split('@')[1];
      if (!options.domains.includes(domain)) {
        return { valid: false, error: `Email must be from: ${options.domains.join(', ')}` };
      }
    }
    
    return { valid: true };
  },
  
  parse(input: string): string | null {
    if (!input || input.trim() === '') return null;
    return input.trim().toLowerCase();
  },

  // ===== Formatting =====
  
  format(value: string): string {
    return value ?? '';
  },
  
  serialize(value: string): string {
    return value ?? '';
  },

  // ===== Sorting =====
  
  compare(a: string, b: string): number {
    return (a ?? '').localeCompare(b ?? '');
  },
  
  matches(value: string, filter: unknown): boolean {
    if (!filter) return true;
    return (value ?? '').toLowerCase().includes(String(filter).toLowerCase());
  }
};

// ============================================================================
// Email Editor Implementation
// ============================================================================

class EmailEditor implements CellEditor<string> {
  private context: EditorContext<string>;
  private input: HTMLInputElement | null = null;
  private currentValue: string;

  constructor(context: EditorContext<string>) {
    this.context = context;
    this.currentValue = context.value ?? '';
  }

  mount(): void {
    const { container, bounds, theme } = this.context;
    
    this.input = document.createElement('input');
    this.input.type = 'email';
    
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
      zIndex: '1000',
    });
    
    this.input.value = this.currentValue;
    
    this.input.addEventListener('keydown', this.handleKeyDown);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('input', this.handleInput);
    
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

  getValue(): string {
    return this.currentValue;
  }

  setValue(value: string): void {
    this.currentValue = value;
    if (this.input) {
      this.input.value = value;
    }
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      this.input.select();
    }
  }

  isValid(): boolean {
    const result = emailCellDefinition.validate(this.currentValue, this.context.options as EmailTypeOptions);
    return result.valid;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCommit(this.currentValue, true); // true = move next
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCommit(this.currentValue);
    } else {
        e.stopPropagation();
    }
  };

  private handleBlur = (): void => {
    setTimeout(() => {
      if (this.input && document.activeElement !== this.input) {
        this.context.onCommit(this.currentValue);
      }
    }, 100);
  };

  private handleInput = (): void => {
    if (this.input) {
      this.currentValue = this.input.value;
      this.context.onChange?.(this.currentValue);
    }
  };
}

