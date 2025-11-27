import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  UrlTypeOptions 
} from '../types';

// ============================================================================
// URL Validation
// ============================================================================

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// URL Cell Definition
// ============================================================================

export const urlCellDefinition: CellDefinition<string> = {
  name: 'url',
  label: 'URL',
  defaultWidth: 250,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string>): CellEditor<string> {
    return new UrlEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: UrlTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const url = String(value).trim();
    
    if (!isValidUrl(url)) {
      return { valid: false, error: 'Invalid URL' };
    }
    
    // Check allowed protocols
    if (options?.allowedProtocols && options.allowedProtocols.length > 0) {
      try {
        const parsed = new URL(url);
        const protocol = parsed.protocol.replace(':', '');
        if (!options.allowedProtocols.includes(protocol)) {
          return { valid: false, error: `URL must use: ${options.allowedProtocols.join(', ')}` };
        }
      } catch {
        return { valid: false, error: 'Invalid URL' };
      }
    }
    
    return { valid: true };
  },
  
  parse(input: string): string | null {
    if (!input || input.trim() === '') return null;
    
    let url = input.trim();
    
    // Add https:// if no protocol
    if (!url.includes('://')) {
      url = 'https://' + url;
    }
    
    return url;
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
// URL Editor Implementation
// ============================================================================

class UrlEditor implements CellEditor<string> {
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
    this.input.type = 'url';
    this.input.placeholder = 'https://example.com';
    
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
    const result = urlCellDefinition.validate(this.currentValue, this.context.options as UrlTypeOptions);
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
      this.currentValue = this.input.value;
      this.context.onChange?.(this.currentValue);
    }
  };

  private commitValue(moveNext: boolean = false): void {
    // Parse to add protocol if missing
    const parsed = urlCellDefinition.parse(this.currentValue);
    this.context.onCommit(parsed ?? '', moveNext);
  }
}

