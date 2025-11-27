import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  ProgressTypeOptions 
} from '../types';

// ============================================================================
// Progress Cell Definition
// ============================================================================

export const progressCellDefinition: CellDefinition<number> = {
  name: 'progress',
  label: 'Progress',
  defaultWidth: 150,
  editorMode: 'overlay',

  // ===== Editing =====
  
  createEditor(context: EditorContext<number>): CellEditor<number> {
    return new ProgressEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: ProgressTypeOptions): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid number' };
    }
    
    const min = options?.min ?? 0;
    const max = options?.max ?? 100;
    
    if (num < min) {
      return { valid: false, error: `Value must be at least ${min}` };
    }
    
    if (num > max) {
      return { valid: false, error: `Value must be at most ${max}` };
    }
    
    return { valid: true };
  },
  
  parse(input: string, options?: ProgressTypeOptions): number | null {
    if (!input || input.trim() === '') return null;
    
    // Remove % if present
    const cleaned = input.replace(/%$/, '').trim();
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) return null;
    
    const min = options?.min ?? 0;
    const max = options?.max ?? 100;
    
    return Math.max(min, Math.min(max, num));
  },

  // ===== Formatting =====
  
  format(value: number, options?: ProgressTypeOptions): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    
    const min = options?.min ?? 0;
    const max = options?.max ?? 100;
    const percent = ((value - min) / (max - min)) * 100;
    
    return `${Math.round(percent)}%`;
  },
  
  serialize(value: number): string {
    if (value === null || value === undefined || isNaN(value)) return '';
    return String(value);
  },

  // ===== Sorting =====
  
  compare(a: number, b: number): number {
    return (a ?? 0) - (b ?? 0);
  },
  
  matches(value: number, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    if (typeof filter === 'object') {
      const rangeFilter = filter as { min?: number; max?: number };
      if (rangeFilter.min !== undefined && value < rangeFilter.min) return false;
      if (rangeFilter.max !== undefined && value > rangeFilter.max) return false;
      return true;
    }
    
    return value === filter;
  }
};

// ============================================================================
// Progress Editor Implementation
// ============================================================================

class ProgressEditor implements CellEditor<number> {
  private context: EditorContext<number>;
  private container: HTMLDivElement | null = null;
  private slider: HTMLInputElement | null = null;
  private valueDisplay: HTMLSpanElement | null = null;
  private currentValue: number;

  constructor(context: EditorContext<number>) {
    this.context = context;
    this.currentValue = context.value ?? 0;
  }

  mount(): void {
    const { container, bounds, options } = this.context;
    const typeOptions = options as ProgressTypeOptions | undefined;
    
    const min = typeOptions?.min ?? 0;
    const max = typeOptions?.max ?? 100;
    const color = typeOptions?.color ?? '#3b82f6';
    
    // Create container
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: `${bounds.height}px`,
      width: `${Math.max(bounds.width, 200)}px`,
      padding: '12px',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: '1000',
    });
    
    // Value display
    this.valueDisplay = document.createElement('span');
    Object.assign(this.valueDisplay.style, {
      display: 'block',
      textAlign: 'center',
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '8px',
      color: '#1f2937',
    });
    this.valueDisplay.textContent = `${Math.round(this.currentValue)}%`;
    this.container.appendChild(this.valueDisplay);
    
    // Slider
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.min = String(min);
    this.slider.max = String(max);
    this.slider.value = String(this.currentValue);
    
    Object.assign(this.slider.style, {
      width: '100%',
      height: '8px',
      appearance: 'none',
      backgroundColor: '#e5e7eb',
      borderRadius: '4px',
      outline: 'none',
      cursor: 'pointer',
    });
    
    // Style the slider thumb
    const style = document.createElement('style');
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
    `;
    this.container.appendChild(style);
    
    this.slider.addEventListener('input', this.handleInput);
    this.slider.addEventListener('change', this.handleChange);
    this.container.appendChild(this.slider);
    
    // Keyboard handler
    document.addEventListener('keydown', this.handleKeyDown);
    
    container.appendChild(this.container);
  }

  unmount(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.slider) {
      this.slider.removeEventListener('input', this.handleInput);
      this.slider.removeEventListener('change', this.handleChange);
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    this.slider = null;
    this.valueDisplay = null;
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(value: number): void {
    this.currentValue = value;
    if (this.slider) {
      this.slider.value = String(value);
    }
    if (this.valueDisplay) {
      this.valueDisplay.textContent = `${Math.round(value)}%`;
    }
  }

  focus(): void {
    this.slider?.focus();
  }

  isValid(): boolean {
    const typeOptions = this.context.options as ProgressTypeOptions | undefined;
    const result = progressCellDefinition.validate(this.currentValue, typeOptions);
    return result.valid;
  }

  private handleInput = (): void => {
    if (this.slider) {
      this.currentValue = parseFloat(this.slider.value);
      if (this.valueDisplay) {
        this.valueDisplay.textContent = `${Math.round(this.currentValue)}%`;
      }
      this.context.onChange?.(this.currentValue);
    }
  };

  private handleChange = (): void => {
    // Commit on mouse release
    this.context.onCommit(this.currentValue);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.context.onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.context.onCommit(this.currentValue);
    }
  };
}

