import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  TextTypeOptions 
} from '../types';

// ============================================================================
// Text Cell Definition
// ============================================================================

export const textCellDefinition: CellDefinition<string> = {
  name: 'text',
  label: 'Text',
  defaultWidth: 200,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string>): CellEditor<string> {
    return new TextEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: TextTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const str = String(value);
    
    if (options?.maxLength && str.length > options.maxLength) {
      return { 
        valid: false, 
        error: `Text exceeds maximum length of ${options.maxLength} characters` 
      };
    }
    
    return { valid: true };
  },
  
  parse(input: string): string | null {
    if (input === null || input === undefined) return null;
    return String(input);
  },

  // ===== Formatting =====
  
  format(value: string): string {
    if (value === null || value === undefined) return '';
    return String(value);
  },
  
  serialize(value: string): string {
    return value ?? '';
  },

  // ===== Sorting =====
  
  compare(a: string, b: string): number {
    const strA = (a ?? '').toLowerCase();
    const strB = (b ?? '').toLowerCase();
    return strA.localeCompare(strB);
  },
  
  matches(value: string, filter: unknown): boolean {
    if (!filter) return true;
    const str = (value ?? '').toLowerCase();
    const filterStr = String(filter).toLowerCase();
    return str.includes(filterStr);
  }
};

// ============================================================================
// Text Editor Implementation
// ============================================================================

class TextEditor implements CellEditor<string> {
  private context: EditorContext<string>;
  private input: HTMLInputElement | HTMLTextAreaElement | null = null;
  private currentValue: string;

  constructor(context: EditorContext<string>) {
    this.context = context;
    this.currentValue = context.value ?? '';
  }

  mount(): void {
    const { container, bounds, theme, options } = this.context;
    const typeOptions = options as TextTypeOptions | undefined;
    const isMultiline = typeOptions?.multiline ?? false;
    
    // Create input element
    if (isMultiline) {
      this.input = document.createElement('textarea');
      (this.input as HTMLTextAreaElement).rows = 3;
    } else {
      this.input = document.createElement('input');
      this.input.type = 'text';
    }
    
    // Style the input to match the cell
    // Note: The container is already positioned at the cell location,
    // so we use left/top: 0 to fill the container
    Object.assign(this.input.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${bounds.width}px`,
      height: isMultiline ? 'auto' : `${bounds.height}px`,
      minHeight: `${bounds.height}px`,
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
    
    // Set initial value
    this.input.value = this.currentValue;
    
    // Set placeholder
    if (typeOptions?.placeholder) {
      this.input.placeholder = typeOptions.placeholder;
    }
    
    // Set max length
    if (typeOptions?.maxLength) {
      this.input.maxLength = typeOptions.maxLength;
    }
    
    // Event handlers
    this.input.addEventListener('keydown', this.handleKeyDown as EventListener);
    this.input.addEventListener('blur', this.handleBlur);
    this.input.addEventListener('input', this.handleInput);
    
    // Add to container
    container.appendChild(this.input);
  }

  unmount(): void {
    if (this.input) {
      this.input.removeEventListener('keydown', this.handleKeyDown as EventListener);
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
    const result = textCellDefinition.validate(this.currentValue, this.context.options as TextTypeOptions);
    return result.valid;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); // Stop bubbling to grid
      this.context.onCommit(this.currentValue, true); // true = move next
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCommit(this.currentValue); // Tab usually moves right, but let's stick to default commit for now
    } else {
        // Stop propagation for other keys to prevent grid navigation
        e.stopPropagation();
    }
  };

  private handleBlur = (): void => {
    // Small delay to allow click events to fire first
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

