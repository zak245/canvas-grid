import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  JsonTypeOptions,
} from '../types';

// ============================================================================
// JSON Cell Definition
// ============================================================================

export const jsonCellDefinition: CellDefinition<unknown> = {
  name: 'json',
  label: 'JSON',
  defaultWidth: 200,
  editorMode: 'drawer',

  // ===== Editing =====
  
  createEditor(context: EditorContext<unknown>): CellEditor<unknown> {
    return new JsonEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    // Any value that can be JSON-serialized is valid
    try {
      JSON.stringify(value);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid JSON value' };
    }
  },
  
  parse(input: string): unknown | null {
    if (!input || input.trim() === '') return null;
    
    try {
      return JSON.parse(input);
    } catch {
      return null;
    }
  },

  // ===== Formatting =====
  
  format(value: unknown): string {
    if (value === null || value === undefined) return '';
    
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  },
  
  serialize(value: unknown): string {
    if (value === null || value === undefined) return '';
    
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  },

  // ===== Sorting =====
  
  compare(a: unknown, b: unknown): number {
    // Sort by stringified value
    const strA = JSON.stringify(a) ?? '';
    const strB = JSON.stringify(b) ?? '';
    return strA.localeCompare(strB);
  },
  
  matches(value: unknown, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    if (typeof filter === 'string') {
      const searchLower = filter.toLowerCase();
      const valueStr = JSON.stringify(value).toLowerCase();
      return valueStr.includes(searchLower);
    }
    
    return true;
  }
};

// ============================================================================
// JSON Editor Implementation (Drawer-based)
// ============================================================================

class JsonEditor implements CellEditor<unknown> {
  private context: EditorContext<unknown>;
  private container: HTMLDivElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private currentValue: unknown;
  private parseError: string | null = null;

  constructor(context: EditorContext<unknown>) {
    this.context = context;
    this.currentValue = context.value ?? null;
  }

  mount(): void {
    const { container } = this.context;
    
    // Create form container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    });
    
    // Header
    const header = document.createElement('div');
    header.style.marginBottom = '12px';
    header.innerHTML = `
      <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">Edit JSON</h3>
      <p style="margin: 0; font-size: 12px; color: #6b7280;">Enter valid JSON data</p>
    `;
    this.container.appendChild(header);
    
    // Error display
    const errorDiv = document.createElement('div');
    errorDiv.id = 'json-error';
    Object.assign(errorDiv.style, {
      display: 'none',
      padding: '8px 12px',
      marginBottom: '12px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '6px',
      color: '#dc2626',
      fontSize: '12px',
    });
    this.container.appendChild(errorDiv);
    
    // Textarea
    this.textarea = document.createElement('textarea');
    Object.assign(this.textarea.style, {
      flex: '1',
      width: '100%',
      padding: '12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontFamily: '"SF Mono", Monaco, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
      resize: 'none',
      boxSizing: 'border-box',
    });
    
    // Set initial value
    try {
      this.textarea.value = JSON.stringify(this.currentValue, null, 2);
    } catch {
      this.textarea.value = '';
    }
    
    this.textarea.addEventListener('input', this.handleInput);
    this.textarea.addEventListener('keydown', this.handleKeyDown);
    
    this.container.appendChild(this.textarea);
    
    // Buttons
    const buttons = document.createElement('div');
    Object.assign(buttons.style, {
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      marginTop: '12px',
    });
    
    const formatBtn = document.createElement('button');
    formatBtn.textContent = 'Format';
    Object.assign(formatBtn.style, {
      padding: '8px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      background: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    });
    formatBtn.addEventListener('click', this.handleFormat);
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    Object.assign(cancelBtn.style, {
      padding: '8px 16px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      background: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    });
    cancelBtn.addEventListener('click', () => this.context.onCancel());
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    Object.assign(saveBtn.style, {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '6px',
      background: '#3b82f6',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '14px',
    });
    saveBtn.addEventListener('click', () => this.commitValue());
    
    buttons.appendChild(formatBtn);
    buttons.appendChild(cancelBtn);
    buttons.appendChild(saveBtn);
    this.container.appendChild(buttons);
    
    container.appendChild(this.container);
  }

  private handleInput = (): void => {
    if (!this.textarea) return;
    
    const errorDiv = this.container?.querySelector('#json-error') as HTMLDivElement;
    
    try {
      this.currentValue = JSON.parse(this.textarea.value);
      this.parseError = null;
      if (errorDiv) errorDiv.style.display = 'none';
      this.context.onChange?.(this.currentValue);
    } catch (e) {
      this.parseError = (e as Error).message;
      if (errorDiv) {
        errorDiv.textContent = `Parse error: ${this.parseError}`;
        errorDiv.style.display = 'block';
      }
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.context.onCancel();
    } else if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.commitValue();
    }
  };

  private handleFormat = (): void => {
    if (!this.textarea || this.parseError) return;
    
    try {
      const parsed = JSON.parse(this.textarea.value);
      this.textarea.value = JSON.stringify(parsed, null, 2);
    } catch {
      // Ignore format errors
    }
  };

  unmount(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    this.textarea = null;
  }

  getValue(): unknown {
    return this.currentValue;
  }

  setValue(value: unknown): void {
    this.currentValue = value;
    if (this.textarea) {
      try {
        this.textarea.value = JSON.stringify(value, null, 2);
      } catch {
        this.textarea.value = '';
      }
    }
  }

  focus(): void {
    this.textarea?.focus();
  }

  isValid(): boolean {
    return this.parseError === null;
  }

  private commitValue(): void {
    if (this.parseError) {
      // Don't commit if there's a parse error
      return;
    }
    this.context.onCommit(this.currentValue);
  }
}

