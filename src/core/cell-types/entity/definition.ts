import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  EntityTypeOptions,
} from '../types';

// ============================================================================
// Entity Value Type
// ============================================================================

export interface EntityValue {
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  icon?: string;
  color?: string;
}

// ============================================================================
// Entity Cell Definition
// ============================================================================

export const entityCellDefinition: CellDefinition<EntityValue> = {
  name: 'entity',
  label: 'Entity',
  defaultWidth: 200,
  editorMode: 'drawer',

  // ===== Editing =====
  
  createEditor(context: EditorContext<EntityValue>): CellEditor<EntityValue> {
    return new EntityEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    if (typeof value !== 'object') {
      return { valid: false, error: 'Entity must be an object' };
    }
    
    const entity = value as EntityValue;
    
    if (!entity.id || typeof entity.id !== 'string') {
      return { valid: false, error: 'Entity must have an id' };
    }
    
    if (!entity.name || typeof entity.name !== 'string') {
      return { valid: false, error: 'Entity must have a name' };
    }
    
    return { valid: true };
  },
  
  parse(input: string): EntityValue | null {
    if (!input || input.trim() === '') return null;
    
    try {
      const parsed = JSON.parse(input);
      if (parsed.id && parsed.name) {
        return parsed as EntityValue;
      }
    } catch {
      // If not JSON, create a simple entity from the string
      return {
        id: input.toLowerCase().replace(/\s+/g, '-'),
        name: input,
      };
    }
    
    return null;
  },

  // ===== Formatting =====
  
  format(value: EntityValue): string {
    if (!value) return '';
    return value.name;
  },
  
  serialize(value: EntityValue): string {
    if (!value) return '';
    return JSON.stringify(value);
  },

  // ===== Sorting =====
  
  compare(a: EntityValue, b: EntityValue): number {
    const nameA = a?.name ?? '';
    const nameB = b?.name ?? '';
    return nameA.localeCompare(nameB);
  },
  
  matches(value: EntityValue, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    if (typeof filter === 'string') {
      const searchLower = filter.toLowerCase();
      return (
        value?.name?.toLowerCase().includes(searchLower) ||
        value?.subtitle?.toLowerCase().includes(searchLower) ||
        value?.id?.toLowerCase().includes(searchLower)
      ) ?? false;
    }
    
    return true;
  }
};

// ============================================================================
// Entity Editor Implementation (Drawer-based)
// ============================================================================

class EntityEditor implements CellEditor<EntityValue> {
  private context: EditorContext<EntityValue>;
  private container: HTMLDivElement | null = null;
  private currentValue: EntityValue | null;

  constructor(context: EditorContext<EntityValue>) {
    this.context = context;
    this.currentValue = context.value ?? null;
  }

  mount(): void {
    const { container } = this.context;
    
    // Create form container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      padding: '16px',
    });
    
    this.renderForm();
    container.appendChild(this.container);
  }

  private renderForm(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Name *</label>
        <input 
          type="text" 
          id="entity-name"
          value="${this.currentValue?.name ?? ''}"
          style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
        />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Subtitle</label>
        <input 
          type="text" 
          id="entity-subtitle"
          value="${this.currentValue?.subtitle ?? ''}"
          style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
        />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 14px; font-weight: 500; margin-bottom: 4px;">Image URL</label>
        <input 
          type="text" 
          id="entity-image"
          value="${this.currentValue?.image ?? ''}"
          placeholder="https://..."
          style="width: 100%; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 14px; box-sizing: border-box;"
        />
      </div>
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button 
          id="entity-cancel"
          style="padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; cursor: pointer; font-size: 14px;"
        >Cancel</button>
        <button 
          id="entity-save"
          style="padding: 8px 16px; border: none; border-radius: 6px; background: #3b82f6; color: #fff; cursor: pointer; font-size: 14px;"
        >Save</button>
      </div>
    `;
    
    // Event handlers
    const nameInput = this.container.querySelector('#entity-name') as HTMLInputElement;
    const subtitleInput = this.container.querySelector('#entity-subtitle') as HTMLInputElement;
    const imageInput = this.container.querySelector('#entity-image') as HTMLInputElement;
    const cancelBtn = this.container.querySelector('#entity-cancel') as HTMLButtonElement;
    const saveBtn = this.container.querySelector('#entity-save') as HTMLButtonElement;
    
    const updateValue = () => {
      this.currentValue = {
        id: this.currentValue?.id ?? `entity-${Date.now()}`,
        name: nameInput.value,
        subtitle: subtitleInput.value || undefined,
        image: imageInput.value || undefined,
      };
    };
    
    nameInput.addEventListener('input', updateValue);
    subtitleInput.addEventListener('input', updateValue);
    imageInput.addEventListener('input', updateValue);
    
    cancelBtn.addEventListener('click', () => this.context.onCancel());
    saveBtn.addEventListener('click', () => this.commitValue());
    
    // Enter to save
    [nameInput, subtitleInput, imageInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.commitValue();
        } else if (e.key === 'Escape') {
          this.context.onCancel();
        }
      });
    });
  }

  unmount(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getValue(): EntityValue {
    return this.currentValue ?? { id: '', name: '' };
  }

  setValue(value: EntityValue): void {
    this.currentValue = value;
    this.renderForm();
  }

  focus(): void {
    const nameInput = this.container?.querySelector('#entity-name') as HTMLInputElement;
    nameInput?.focus();
    nameInput?.select();
  }

  isValid(): boolean {
    return !!this.currentValue?.name;
  }

  private commitValue(): void {
    if (this.currentValue?.name) {
      this.context.onCommit(this.currentValue);
    } else {
      this.context.onCancel();
    }
  }
}

