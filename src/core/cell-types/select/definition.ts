import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  SelectTypeOptions,
  SelectOption 
} from '../types';

// ============================================================================
// Default Tag Colors
// ============================================================================

export const TAG_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' }, // Blue
  { bg: '#dcfce7', text: '#166534' }, // Green
  { bg: '#fef3c7', text: '#92400e' }, // Yellow
  { bg: '#fce7f3', text: '#9d174d' }, // Pink
  { bg: '#e0e7ff', text: '#3730a3' }, // Indigo
  { bg: '#fed7d7', text: '#c53030' }, // Red
  { bg: '#e9d5ff', text: '#6b21a8' }, // Purple
  { bg: '#ccfbf1', text: '#0f766e' }, // Teal
];

export function getTagColor(index: number): { bg: string; text: string } {
  return TAG_COLORS[index % TAG_COLORS.length];
}

export function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#1f2937' : '#ffffff';
}

// ============================================================================
// Select Cell Definition
// ============================================================================

export const selectCellDefinition: CellDefinition<string | string[]> = {
  name: 'select',
  label: 'Select',
  defaultWidth: 180,
  editorMode: 'overlay',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string | string[]>): CellEditor<string | string[]> {
    return new SelectEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: SelectTypeOptions): ValidationResult {
    if (value === null || value === undefined || value === '') {
      return { valid: true };
    }
    
    const values = Array.isArray(value) ? value : [value];
    const validOptions = options?.options?.map(o => o.value) ?? [];
    
    // Check if all values are valid options (or allow create is on)
    if (!options?.allowCreate && validOptions.length > 0) {
      for (const val of values) {
        if (!validOptions.includes(val)) {
          return { valid: false, error: `"${val}" is not a valid option` };
        }
      }
    }
    
    // Check max selections
    if (options?.maxSelections && values.length > options.maxSelections) {
      return { valid: false, error: `Maximum ${options.maxSelections} selections allowed` };
    }
    
    return { valid: true };
  },
  
  parse(input: string, options?: SelectTypeOptions): string | string[] | null {
    if (!input || input.trim() === '') return null;
    
    // If comma-separated and multiple allowed
    if (options?.multiple && input.includes(',')) {
      return input.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    return input.trim();
  },

  // ===== Formatting =====
  
  format(value: string | string[], options?: SelectTypeOptions): string {
    if (!value) return '';
    
    const values = Array.isArray(value) ? value : [value];
    const selectOptions = options?.options ?? [];
    
    return values
      .map(v => {
        const option = selectOptions.find(o => o.value === v);
        return option?.label ?? v;
      })
      .join(', ');
  },
  
  serialize(value: string | string[]): string {
    if (!value) return '';
    return Array.isArray(value) ? value.join(',') : value;
  },

  // ===== Sorting =====
  
  compare(a: string | string[], b: string | string[]): number {
    const strA = Array.isArray(a) ? a.join(',') : (a ?? '');
    const strB = Array.isArray(b) ? b.join(',') : (b ?? '');
    return strA.localeCompare(strB);
  },
  
  matches(value: string | string[], filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    const values = Array.isArray(value) ? value : [value];
    const filterValues = Array.isArray(filter) ? filter : [filter];
    
    // Check if any filter value matches
    return filterValues.some(f => values.includes(String(f)));
  }
};

// ============================================================================
// Select Editor Implementation
// ============================================================================

class SelectEditor implements CellEditor<string | string[]> {
  private context: EditorContext<string | string[]>;
  private container: HTMLDivElement | null = null;
  private currentValue: string[];
  private options: SelectOption[];
  private isMultiple: boolean;

  constructor(context: EditorContext<string | string[]>) {
    this.context = context;
    const typeOptions = context.options as SelectTypeOptions | undefined;
    
    const initialValue = context.value;
    this.currentValue = Array.isArray(initialValue) 
      ? [...initialValue] 
      : (initialValue ? [initialValue] : []);
    this.options = typeOptions?.options ?? [];
    this.isMultiple = typeOptions?.multiple ?? false;
  }

  mount(): void {
    const { container } = this.context;
    const rect = container.getBoundingClientRect();
    
    // Create dropdown container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed', // Use fixed to avoid clipping and z-index issues
      left: `${rect.left}px`,
      top: `${rect.bottom}px`,
      minWidth: `${Math.max(rect.width, 200)}px`,
      maxHeight: '250px',
      overflowY: 'auto',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: '9999', // Ensure it's on top of everything
    });
    
    // Render options
    this.renderOptions();
    
    // Append to body to escape grid clipping
    document.body.appendChild(this.container);

    // Delay listener to avoid catching the opening click event
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleClickOutside);
      document.addEventListener('keydown', this.handleKeyDown);
    }, 0);
  }

  unmount(): void {
    document.removeEventListener('mousedown', this.handleClickOutside);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getValue(): string | string[] {
    if (this.isMultiple) {
      return this.currentValue;
    }
    return this.currentValue[0] ?? '';
  }

  setValue(value: string | string[]): void {
    this.currentValue = Array.isArray(value) ? [...value] : (value ? [value] : []);
    this.renderOptions();
  }

  focus(): void {
    // Focus the container for keyboard navigation
    this.container?.focus();
  }

  isValid(): boolean {
    const typeOptions = this.context.options as SelectTypeOptions | undefined;
    const result = selectCellDefinition.validate(this.currentValue, typeOptions);
    return result.valid;
  }

  private renderOptions(): void {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    
    for (let i = 0; i < this.options.length; i++) {
      const option = this.options[i];
      const isSelected = this.currentValue.includes(option.value);
      const color = option.color 
        ? { bg: option.color, text: getContrastColor(option.color) }
        : getTagColor(i);
      
      const optionEl = document.createElement('div');
      Object.assign(optionEl.style, {
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
      });
      
      // Checkbox for multi-select
      if (this.isMultiple) {
        const checkbox = document.createElement('div');
        Object.assign(checkbox.style, {
          width: '16px',
          height: '16px',
          borderRadius: '4px',
          border: isSelected ? 'none' : '1px solid #d1d5db',
          backgroundColor: isSelected ? '#3b82f6' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        });
        if (isSelected) {
          checkbox.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
        optionEl.appendChild(checkbox);
      }
      
      // Tag preview
      const tag = document.createElement('span');
      Object.assign(tag.style, {
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '13px',
        backgroundColor: color.bg,
        color: color.text,
      });
      tag.textContent = option.label;
      optionEl.appendChild(tag);
      
      // Hover effect
      optionEl.addEventListener('mouseenter', () => {
        optionEl.style.backgroundColor = '#f3f4f6';
      });
      optionEl.addEventListener('mouseleave', () => {
        optionEl.style.backgroundColor = isSelected ? '#f3f4f6' : 'transparent';
      });
      
      // Click handler
      optionEl.addEventListener('click', () => {
        this.toggleOption(option.value);
      });
      
      this.container.appendChild(optionEl);
    }
  }

  private toggleOption(value: string): void {
    if (this.isMultiple) {
      const index = this.currentValue.indexOf(value);
      if (index >= 0) {
        this.currentValue.splice(index, 1);
      } else {
        this.currentValue.push(value);
      }
      this.renderOptions();
      this.context.onChange?.(this.getValue());
    } else {
      this.currentValue = [value];
      this.context.onCommit(value);
    }
  }

  private handleClickOutside = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.context.onCommit(this.getValue());
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.context.onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // For single select, commit and move next
      // For multi select, just commit value (don't close or move) - user must use Escape to close
      if (!this.isMultiple) {
          this.context.onCommit(this.getValue(), true);
      } else {
          // Multi-select: Enter might toggle current option if we had keyboard nav,
          // but for now just ensure it doesn't close/move.
          // We commit the current state but keep editor open?
          // Actually, usually Enter in multi-select dropdown toggles selection.
          // Since we don't have keyboard nav in dropdown yet, we just prevent default close.
          // The user said "if its a multi edit cell ... we use escape to close".
      }
    } else {
        e.stopPropagation();
    }
  };
}

