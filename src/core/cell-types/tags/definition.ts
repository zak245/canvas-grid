import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  TagsTypeOptions,
} from '../types';

// ============================================================================
// Default Tag Colors
// ============================================================================

export const TAG_COLORS = [
  { bg: '#fee2e2', text: '#991b1b' }, // red-100, red-800
  { bg: '#ffedd5', text: '#9a3412' }, // orange-100, orange-800
  { bg: '#fef9c3', text: '#854d0e' }, // yellow-100, yellow-800
  { bg: '#dcfce7', text: '#166534' }, // green-100, green-800
  { bg: '#ccfbf1', text: '#115e59' }, // teal-100, teal-800
  { bg: '#dbeafe', text: '#1e40af' }, // blue-100, blue-800
  { bg: '#ede9fe', text: '#6b21a8' }, // purple-100, purple-800
  { bg: '#fce7f3', text: '#9d174d' }, // pink-100, pink-800
  { bg: '#f3f4f6', text: '#374151' }, // gray-100, gray-700
];

export function getTagColor(label: string, options?: TagsTypeOptions): { bg: string; text: string } {
  // Check if tag has a predefined color
  const predefined = options?.options?.find(t => t.label === label);
  if (predefined?.color) {
      // If predefined is just a string (bg), we try to guess text or use dark default
      return { bg: predefined.color, text: '#1f2937' };
  }
  
  // Generate consistent color from label
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ============================================================================
// Tags Cell Definition
// ============================================================================

export const tagsCellDefinition: CellDefinition<string[]> = {
  name: 'tags',
  label: 'Tags',
  defaultWidth: 200,
  editorMode: 'overlay',

  // ===== Editing =====
  
  createEditor(context: EditorContext<string[]>): CellEditor<string[]> {
    return new TagsEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: TagsTypeOptions): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    if (!Array.isArray(value)) {
      return { valid: false, error: 'Tags must be an array' };
    }
    
    if (options?.maxTags && value.length > options.maxTags) {
      return { valid: false, error: `Maximum ${options.maxTags} tags allowed` };
    }
    
    // Check if all tags are valid strings
    for (const tag of value) {
      if (typeof tag !== 'string' || tag.trim() === '') {
        return { valid: false, error: 'Invalid tag value' };
      }
    }
    
    // Check if tags are from predefined options (if not allowing custom)
    if (options?.options && !options.allowCustom) {
      const validLabels = options.options.map(o => o.label);
      for (const tag of value) {
        if (!validLabels.includes(tag)) {
          return { valid: false, error: `Invalid tag: ${tag}` };
        }
      }
    }
    
    return { valid: true };
  },
  
  parse(input: string, _options?: TagsTypeOptions): string[] | null {
    if (!input || input.trim() === '') return [];
    
    // Split by comma and clean up
    return input
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  },

  // ===== Formatting =====
  
  format(value: string[], _options?: TagsTypeOptions): string {
    if (!value || !Array.isArray(value)) return '';
    return value.join(', ');
  },
  
  serialize(value: string[]): string {
    if (!value || !Array.isArray(value)) return '';
    return JSON.stringify(value);
  },

  // ===== Sorting =====
  
  compare(a: string[], b: string[]): number {
    const countA = a?.length ?? 0;
    const countB = b?.length ?? 0;
    return countA - countB;
  },
  
  matches(value: string[], filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    // Support searching for a specific tag
    if (typeof filter === 'string') {
      return value?.includes(filter) ?? false;
    }
    
    // Support array of tags (any match)
    if (Array.isArray(filter)) {
      return filter.some(f => value?.includes(f));
    }
    
    return true;
  }
};

// ============================================================================
// Tags Editor Implementation
// ============================================================================

class TagsEditor implements CellEditor<string[]> {
  private context: EditorContext<string[]>;
  private container: HTMLDivElement | null = null;
  private currentValue: string[];

  constructor(context: EditorContext<string[]>) {
    this.context = context;
    this.currentValue = context.value ? [...context.value] : [];
  }

  mount(): void {
    const { container, bounds, options } = this.context;
    const typeOptions = options as TagsTypeOptions | undefined;
    
    const rect = container.getBoundingClientRect();

    // Create dropdown container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.bottom}px`,
      minWidth: `${Math.max(rect.width, 250)}px`,
      maxHeight: '300px',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      zIndex: '10001',
      overflow: 'auto',
      padding: '8px',
    });
    
    // Render current tags
    this.renderContent(typeOptions);
    
    // Add to body to escape clipping
    document.body.appendChild(this.container);
    
    // Click outside to close
    setTimeout(() => {
      document.addEventListener('mousedown', this.handleClickOutside);
    }, 0);
  }

  private renderContent(typeOptions?: TagsTypeOptions): void {
    if (!this.container) return;
    
    this.container.innerHTML = '';
    
    // Current tags section
    if (this.currentValue.length > 0) {
      const currentSection = document.createElement('div');
      currentSection.style.marginBottom = '8px';
      currentSection.style.display = 'flex';
      currentSection.style.flexWrap = 'wrap';
      currentSection.style.gap = '4px';
      
      this.currentValue.forEach(tag => {
        const chip = this.createTagChip(tag, typeOptions, true);
        currentSection.appendChild(chip);
      });
      
      this.container.appendChild(currentSection);
      
      // Divider
      const divider = document.createElement('div');
      divider.style.borderTop = '1px solid #e5e7eb';
      divider.style.margin = '8px 0';
      this.container.appendChild(divider);
    }
    
    // Available tags
    const availableTags = typeOptions?.options ?? [];
    if (availableTags.length > 0) {
      const label = document.createElement('div');
      label.textContent = 'Add tag';
      label.style.fontSize = '12px';
      label.style.color = '#6b7280';
      label.style.marginBottom = '8px';
      this.container.appendChild(label);
      
      const optionsContainer = document.createElement('div');
      optionsContainer.style.display = 'flex';
      optionsContainer.style.flexWrap = 'wrap';
      optionsContainer.style.gap = '4px';
      
      availableTags.forEach(tagOption => {
        if (!this.currentValue.includes(tagOption.label)) {
          const chip = this.createTagChip(tagOption.label, typeOptions, false);
          chip.addEventListener('click', () => {
            this.addTag(tagOption.label);
            this.renderContent(typeOptions);
          });
          optionsContainer.appendChild(chip);
        }
      });
      
      this.container.appendChild(optionsContainer);
    }
    
    // Custom tag input (if allowed)
    if (typeOptions?.allowCustom !== false) {
      const inputContainer = document.createElement('div');
      inputContainer.style.marginTop = '8px';
      
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type and press Enter...';
      Object.assign(input.style, {
        width: '100%',
        padding: '8px',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        fontSize: '13px',
        boxSizing: 'border-box',
      });
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
          e.preventDefault();
          this.addTag(input.value.trim());
          input.value = '';
          this.renderContent(typeOptions);
        } else if (e.key === 'Escape') {
          this.context.onCancel();
        }
      });
      
      inputContainer.appendChild(input);
      this.container.appendChild(inputContainer);
      
      // Focus input
      setTimeout(() => input.focus(), 0);
    }
  }

  private createTagChip(label: string, options?: TagsTypeOptions, removable: boolean = false): HTMLSpanElement {
    const color = getTagColor(label, options);
    
    const chip = document.createElement('span');
    Object.assign(chip.style, {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      backgroundColor: color.bg,
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      color: color.text,
      cursor: 'pointer',
    });
    
    chip.textContent = label;
    
    if (removable) {
      const removeBtn = document.createElement('span');
      removeBtn.textContent = '×';
      removeBtn.style.marginLeft = '4px';
      removeBtn.style.fontSize = '14px';
      removeBtn.style.opacity = '0.6';
      removeBtn.addEventListener('mouseenter', () => { removeBtn.style.opacity = '1'; });
      removeBtn.addEventListener('mouseleave', () => { removeBtn.style.opacity = '0.6'; });
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeTag(label);
        this.renderContent(options);
      });
      chip.appendChild(removeBtn);
    }
    
    return chip;
  }

  private addTag(tag: string): void {
    if (!this.currentValue.includes(tag)) {
      this.currentValue.push(tag);
      this.context.onChange?.(this.currentValue);
    }
  }

  private removeTag(tag: string): void {
    this.currentValue = this.currentValue.filter(t => t !== tag);
    this.context.onChange?.(this.currentValue);
  }

  private handleClickOutside = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.commitValue();
    }
  };

  unmount(): void {
    document.removeEventListener('mousedown', this.handleClickOutside);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getValue(): string[] {
    return this.currentValue;
  }

  setValue(value: string[]): void {
    this.currentValue = value ? [...value] : [];
  }

  focus(): void {
    // Focus is handled in renderContent
  }

  isValid(): boolean {
    const result = tagsCellDefinition.validate(this.currentValue, this.context.options as TagsTypeOptions);
    return result.valid;
  }

  private commitValue(): void {
    this.context.onCommit(this.currentValue);
  }
}

