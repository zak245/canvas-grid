import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  LinkedTypeOptions 
} from '../types';

// ============================================================================
// Linked Record Value Type
// ============================================================================

export interface LinkedRecordValue {
  id: string;
  name: string;
  avatar?: string;
  logo?: string;
  [key: string]: unknown;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getColorForName(name: string): string {
  const colors = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
  ];
  
  // Simple hash based on name
  let hash = 0;
  for (let i = 0; i < (name ?? '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// ============================================================================
// Linked Cell Definition
// ============================================================================

export const linkedCellDefinition: CellDefinition<LinkedRecordValue | LinkedRecordValue[]> = {
  name: 'linked',
  label: 'Linked Record',
  defaultWidth: 200,
  editorMode: 'drawer',

  // ===== Editing =====
  
  createEditor(context: EditorContext<LinkedRecordValue | LinkedRecordValue[]>): CellEditor<LinkedRecordValue | LinkedRecordValue[]> {
    return new LinkedEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: LinkedTypeOptions): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    const records = Array.isArray(value) ? value : [value];
    
    for (const record of records) {
      if (typeof record !== 'object' || !record) {
        return { valid: false, error: 'Invalid linked record' };
      }
      
      const rec = record as LinkedRecordValue;
      if (!rec.id) {
        return { valid: false, error: 'Linked record must have an id' };
      }
    }
    
    // Check max selections for multiple
    if (options?.allowMultiple === false && records.length > 1) {
      return { valid: false, error: 'Only one record can be linked' };
    }
    
    return { valid: true };
  },
  
  parse(input: string): LinkedRecordValue | null {
    if (!input || input.trim() === '') return null;
    
    try {
      const parsed = JSON.parse(input);
      if (typeof parsed === 'object' && parsed.id) {
        return parsed as LinkedRecordValue;
      }
    } catch {
      // If not JSON, create a simple record
      return { id: input, name: input };
    }
    
    return null;
  },

  // ===== Formatting =====
  
  format(value: LinkedRecordValue | LinkedRecordValue[], options?: LinkedTypeOptions): string {
    if (!value) return '';
    
    const records = Array.isArray(value) ? value : [value];
    const displayField = options?.displayField ?? 'name';
    
    return records
      .map(r => r[displayField] ?? r.name ?? r.id ?? '')
      .join(', ');
  },
  
  serialize(value: LinkedRecordValue | LinkedRecordValue[]): string {
    if (!value) return '';
    return JSON.stringify(value);
  },

  // ===== Sorting =====
  
  compare(a: LinkedRecordValue | LinkedRecordValue[], b: LinkedRecordValue | LinkedRecordValue[]): number {
    const nameA = Array.isArray(a) ? (a[0]?.name ?? '') : (a?.name ?? '');
    const nameB = Array.isArray(b) ? (b[0]?.name ?? '') : (b?.name ?? '');
    return nameA.localeCompare(nameB);
  },
  
  matches(value: LinkedRecordValue | LinkedRecordValue[], filter: unknown): boolean {
    if (!filter) return true;
    
    const records = Array.isArray(value) ? value : [value];
    const filterStr = String(filter).toLowerCase();
    
    return records.some(r => 
      r.name?.toLowerCase().includes(filterStr) ||
      r.id?.toLowerCase().includes(filterStr)
    );
  }
};

// ============================================================================
// Linked Editor Implementation
// ============================================================================

class LinkedEditor implements CellEditor<LinkedRecordValue | LinkedRecordValue[]> {
  private context: EditorContext<LinkedRecordValue | LinkedRecordValue[]>;
  private container: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private resultsList: HTMLDivElement | null = null;
  private currentValue: LinkedRecordValue[];
  private isMultiple: boolean;

  constructor(context: EditorContext<LinkedRecordValue | LinkedRecordValue[]>) {
    this.context = context;
    const typeOptions = context.options as LinkedTypeOptions | undefined;
    
    const initialValue = context.value;
    this.currentValue = Array.isArray(initialValue) 
      ? [...initialValue] 
      : (initialValue ? [initialValue] : []);
    this.isMultiple = typeOptions?.allowMultiple ?? false;
  }

  mount(): void {
    const { container, bounds, theme } = this.context;
    
    // Create drawer/picker container
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: `${bounds.height}px`,
      width: `${Math.max(bounds.width, 280)}px`,
      maxHeight: '300px',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: '1000',
      overflow: 'hidden',
    });
    
    // Search input
    const searchContainer = document.createElement('div');
    Object.assign(searchContainer.style, {
      padding: '12px',
      borderBottom: '1px solid #e5e7eb',
    });
    
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search records...';
    Object.assign(this.searchInput.style, {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: `${theme.fontSize}px`,
      fontFamily: theme.fontFamily,
      outline: 'none',
      boxSizing: 'border-box',
    });
    
    this.searchInput.addEventListener('input', this.handleSearch);
    this.searchInput.addEventListener('keydown', this.handleKeyDown);
    searchContainer.appendChild(this.searchInput);
    this.container.appendChild(searchContainer);
    
    // Results list
    this.resultsList = document.createElement('div');
    Object.assign(this.resultsList.style, {
      maxHeight: '200px',
      overflowY: 'auto',
    });
    this.container.appendChild(this.resultsList);
    
    // Show initial results (mock data for now)
    this.renderResults([]);
    
    // Click outside to close
    document.addEventListener('mousedown', this.handleClickOutside);
    
    container.appendChild(this.container);
  }

  unmount(): void {
    document.removeEventListener('mousedown', this.handleClickOutside);
    
    if (this.searchInput) {
      this.searchInput.removeEventListener('input', this.handleSearch);
      this.searchInput.removeEventListener('keydown', this.handleKeyDown);
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    
    this.searchInput = null;
    this.resultsList = null;
  }

  getValue(): LinkedRecordValue | LinkedRecordValue[] {
    if (this.isMultiple) {
      return this.currentValue;
    }
    return this.currentValue[0] ?? { id: '', name: '' };
  }

  setValue(value: LinkedRecordValue | LinkedRecordValue[]): void {
    this.currentValue = Array.isArray(value) ? [...value] : (value ? [value] : []);
  }

  focus(): void {
    this.searchInput?.focus();
  }

  isValid(): boolean {
    const typeOptions = this.context.options as LinkedTypeOptions | undefined;
    const result = linkedCellDefinition.validate(this.currentValue, typeOptions);
    return result.valid;
  }

  private renderResults(results: LinkedRecordValue[]): void {
    if (!this.resultsList) return;
    
    this.resultsList.innerHTML = '';
    
    // Show selected items first
    for (const record of this.currentValue) {
      const item = this.createResultItem(record, true);
      this.resultsList.appendChild(item);
    }
    
    // Show search results
    for (const record of results) {
      if (!this.currentValue.find(r => r.id === record.id)) {
        const item = this.createResultItem(record, false);
        this.resultsList.appendChild(item);
      }
    }
    
    // Empty state
    if (this.currentValue.length === 0 && results.length === 0) {
      const empty = document.createElement('div');
      Object.assign(empty.style, {
        padding: '20px',
        textAlign: 'center',
        color: '#9ca3af',
      });
      empty.textContent = 'Type to search records...';
      this.resultsList.appendChild(empty);
    }
  }

  private createResultItem(record: LinkedRecordValue, isSelected: boolean): HTMLDivElement {
    const item = document.createElement('div');
    Object.assign(item.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 12px',
      cursor: 'pointer',
      backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
    });
    
    // Avatar
    const avatar = document.createElement('div');
    Object.assign(avatar.style, {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      backgroundColor: getColorForName(record.name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontWeight: 'bold',
      fontSize: '12px',
    });
    avatar.textContent = getInitials(record.name);
    item.appendChild(avatar);
    
    // Name
    const name = document.createElement('span');
    name.textContent = record.name;
    Object.assign(name.style, {
      flex: '1',
      color: '#1f2937',
    });
    item.appendChild(name);
    
    // Selected indicator
    if (isSelected) {
      const check = document.createElement('span');
      check.innerHTML = '✓';
      Object.assign(check.style, {
        color: '#22c55e',
        fontWeight: 'bold',
      });
      item.appendChild(check);
    }
    
    // Hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f3f4f6';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = isSelected ? '#f3f4f6' : 'transparent';
    });
    
    // Click handler
    item.addEventListener('click', () => {
      this.toggleRecord(record);
    });
    
    return item;
  }

  private toggleRecord(record: LinkedRecordValue): void {
    const index = this.currentValue.findIndex(r => r.id === record.id);
    
    if (index >= 0) {
      this.currentValue.splice(index, 1);
    } else {
      if (this.isMultiple) {
        this.currentValue.push(record);
      } else {
        this.currentValue = [record];
        // Single select commits immediately
        this.context.onCommit(record);
        return;
      }
    }
    
    this.renderResults([]);
    this.context.onChange?.(this.getValue());
  }

  private handleSearch = (): void => {
    // In real implementation, this would search via adapter
    // For now, just re-render
    this.renderResults([]);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.context.onCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.context.onCommit(this.getValue());
    }
  };

  private handleClickOutside = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.context.onCommit(this.getValue());
    }
  };
}

