import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  ActionTypeOptions,
} from '../types';

// ============================================================================
// Action Button Definition
// ============================================================================

export interface ActionButton {
  id: string;
  icon: string;
  tooltip?: string;
  disabled?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getIconEmoji(icon: string): string {
  const emojis: Record<string, string> = {
    mail: '✉️',
    phone: '📞',
    link: '🔗',
    edit: '✏️',
    trash: '🗑️',
    copy: '📋',
    download: '⬇️',
    more: '⋯',
    sparkles: '✨',
  };
  return emojis[icon] ?? '•';
}

// ============================================================================
// Action Cell Definition
// ============================================================================

export const actionCellDefinition: CellDefinition<null> = {
  name: 'action',
  label: 'Actions',
  defaultWidth: 100,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<null>): CellEditor<null> {
    return new ActionEditor(context);
  },

  // ===== Validation =====
  
  validate(): ValidationResult {
    return { valid: true };
  },
  
  parse(): null {
    return null;
  },

  // ===== Formatting =====
  
  format(): string {
    return '';
  },
  
  serialize(): string {
    return '';
  },

  // ===== Sorting =====
  
  compare(): number {
    return 0; // Actions are not sortable
  },
  
  matches(): boolean {
    return true; // Actions always match filters
  }
};

// ============================================================================
// Action Editor Implementation
// ============================================================================

class ActionEditor implements CellEditor<null> {
  private context: EditorContext<null>;
  private container: HTMLDivElement | null = null;

  constructor(context: EditorContext<null>) {
    this.context = context;
  }

  mount(): void {
    const { container, bounds, options } = this.context;
    const typeOptions = options as ActionTypeOptions | undefined;
    
    const buttons = typeOptions?.buttons ?? [];
    if (buttons.length === 0) {
      this.context.onCancel();
      return;
    }
    
    // Create popup with action buttons
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: `${bounds.height}px`,
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      zIndex: '10001',
      padding: '4px',
      minWidth: '120px',
    });
    
    buttons.forEach(button => {
      const btn = document.createElement('button');
      Object.assign(btn.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        border: 'none',
        background: 'transparent',
        cursor: button.disabled ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        color: button.disabled ? '#d1d5db' : '#374151',
        textAlign: 'left',
        borderRadius: '4px',
      });
      
      if (!button.disabled) {
        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = '#f3f4f6';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = 'transparent';
        });
      }
      
      // Icon placeholder
      const iconSpan = document.createElement('span');
      iconSpan.textContent = getIconEmoji(button.icon);
      btn.appendChild(iconSpan);
      
      // Label
      const label = document.createElement('span');
      label.textContent = button.tooltip ?? button.id;
      btn.appendChild(label);
      
      btn.addEventListener('click', () => {
        if (!button.disabled) {
          // Emit action event through a custom event
          const event = new CustomEvent('grid:action', {
            detail: { actionId: button.id, rowIndex: this.context.rowIndex }
          });
          document.dispatchEvent(event);
          this.context.onCancel();
        }
      });
      
      this.container!.appendChild(btn);
    });
    
    container.appendChild(this.container);
    
    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside);
    }, 0);
  }

  private handleClickOutside = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.context.onCancel();
    }
  };

  unmount(): void {
    document.removeEventListener('click', this.handleClickOutside);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getValue(): null {
    return null;
  }

  setValue(): void {
    // No-op
  }

  focus(): void {
    // No-op
  }

  isValid(): boolean {
    return true;
  }
}

