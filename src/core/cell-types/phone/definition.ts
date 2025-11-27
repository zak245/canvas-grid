import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  PhoneTypeOptions 
} from '../types';

// ============================================================================
// Phone Number Formatting
// ============================================================================

function formatPhoneNumber(phone: string, format: 'international' | 'national' | 'e164' = 'national'): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // US phone number formatting
  if (digits.length === 10) {
    if (format === 'e164') {
      return `+1${digits}`;
    }
    if (format === 'international') {
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    // National
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // With country code
  if (digits.length === 11 && digits.startsWith('1')) {
    const national = digits.slice(1);
    if (format === 'e164') {
      return `+${digits}`;
    }
    if (format === 'international') {
      return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
    }
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  
  // International number - just add + and spaces
  if (digits.length > 10) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`.trim();
  }
  
  // Partial number - just return digits
  return digits;
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

// ============================================================================
// Phone Cell Definition
// ============================================================================

export const phoneCellDefinition: CellDefinition<string> = {
  name: 'phone',
  label: 'Phone',
  defaultWidth: 160,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string>): CellEditor<string> {
    return new PhoneEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const phone = String(value);
    
    if (!isValidPhone(phone)) {
      return { valid: false, error: 'Invalid phone number' };
    }
    
    return { valid: true };
  },
  
  parse(input: string): string | null {
    if (!input || input.trim() === '') return null;
    // Store as digits only
    return input.replace(/\D/g, '');
  },

  // ===== Formatting =====
  
  format(value: string, options?: PhoneTypeOptions): string {
    if (!value) return '';
    return formatPhoneNumber(value, options?.format);
  },
  
  serialize(value: string): string {
    // E.164 format for storage
    const digits = (value ?? '').replace(/\D/g, '');
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length > 10 && !digits.startsWith('+')) {
      return `+${digits}`;
    }
    return digits;
  },

  // ===== Sorting =====
  
  compare(a: string, b: string): number {
    const digitsA = (a ?? '').replace(/\D/g, '');
    const digitsB = (b ?? '').replace(/\D/g, '');
    return digitsA.localeCompare(digitsB);
  },
  
  matches(value: string, filter: unknown): boolean {
    if (!filter) return true;
    const digits = (value ?? '').replace(/\D/g, '');
    const filterDigits = String(filter).replace(/\D/g, '');
    return digits.includes(filterDigits);
  }
};

// ============================================================================
// Phone Editor Implementation
// ============================================================================

class PhoneEditor implements CellEditor<string> {
  private context: EditorContext<string>;
  private input: HTMLInputElement | null = null;
  private currentValue: string;

  constructor(context: EditorContext<string>) {
    this.context = context;
    this.currentValue = context.value ?? '';
  }

  mount(): void {
    const { container, bounds, theme, options } = this.context;
    const typeOptions = options as PhoneTypeOptions | undefined;
    
    this.input = document.createElement('input');
    this.input.type = 'tel';
    this.input.placeholder = '(555) 123-4567';
    
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
    
    // Display formatted value
    this.input.value = formatPhoneNumber(this.currentValue, typeOptions?.format);
    
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
      const typeOptions = this.context.options as PhoneTypeOptions | undefined;
      this.input.value = formatPhoneNumber(value, typeOptions?.format);
    }
  }

  focus(): void {
    if (this.input) {
      this.input.focus();
      this.input.select();
    }
  }

  isValid(): boolean {
    const result = phoneCellDefinition.validate(this.currentValue);
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
      // Store digits only
      this.currentValue = this.input.value.replace(/\D/g, '');
      
      // Auto-format as user types
      const typeOptions = this.context.options as PhoneTypeOptions | undefined;
      const cursorPos = this.input.selectionStart ?? 0;
      const formatted = formatPhoneNumber(this.currentValue, typeOptions?.format);
      
      // Only update if different to avoid cursor jump
      if (this.input.value !== formatted) {
        this.input.value = formatted;
        // Try to maintain cursor position
        const newPos = Math.min(cursorPos + (formatted.length - this.input.value.length), formatted.length);
        this.input.setSelectionRange(newPos, newPos);
      }
      
      this.context.onChange?.(this.currentValue);
    }
  };
}

