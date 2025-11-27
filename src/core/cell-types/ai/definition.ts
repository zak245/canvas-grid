import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  AITypeOptions,
} from '../types';

// ============================================================================
// AI Value Type
// ============================================================================

export type AIStatus = 'idle' | 'pending' | 'running' | 'complete' | 'error';

export interface AIValue {
  status: AIStatus;
  result?: string;
  error?: string;
  progress?: number; // 0-100
}

// ============================================================================
// AI Cell Definition
// ============================================================================

export const aiCellDefinition: CellDefinition<AIValue | string> = {
  name: 'ai',
  label: 'AI',
  defaultWidth: 200,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<AIValue | string>): CellEditor<AIValue | string> {
    return new AIEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    if (typeof value === 'string') {
      return { valid: true };
    }
    
    if (typeof value === 'object') {
      const aiValue = value as AIValue;
      const validStatuses: AIStatus[] = ['idle', 'pending', 'running', 'complete', 'error'];
      if (!validStatuses.includes(aiValue.status)) {
        return { valid: false, error: 'Invalid AI status' };
      }
      return { valid: true };
    }
    
    return { valid: false, error: 'Invalid AI value' };
  },
  
  parse(input: string): AIValue | string | null {
    if (!input || input.trim() === '') return null;
    
    try {
      const parsed = JSON.parse(input);
      if (parsed.status) {
        return parsed as AIValue;
      }
    } catch {
      // Not JSON, treat as string result
    }
    
    return input;
  },

  // ===== Formatting =====
  
  format(value: AIValue | string): string {
    if (!value) return '';
    
    if (typeof value === 'string') return value;
    
    switch (value.status) {
      case 'idle': return 'Click to enrich';
      case 'pending': return 'Pending...';
      case 'running': return value.progress ? `${value.progress}%` : 'Running...';
      case 'complete': return value.result ?? '';
      case 'error': return `Error: ${value.error}`;
      default: return '';
    }
  },
  
  serialize(value: AIValue | string): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  },

  // ===== Sorting =====
  
  compare(a: AIValue | string, b: AIValue | string): number {
    const strA = typeof a === 'string' ? a : (a?.result ?? '');
    const strB = typeof b === 'string' ? b : (b?.result ?? '');
    return strA.localeCompare(strB);
  },
  
  matches(value: AIValue | string, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    if (typeof filter === 'string') {
      const searchLower = filter.toLowerCase();
      const valueStr = typeof value === 'string' ? value : (value?.result ?? '');
      return valueStr.toLowerCase().includes(searchLower);
    }
    
    return true;
  }
};

// ============================================================================
// AI Editor Implementation
// ============================================================================

class AIEditor implements CellEditor<AIValue | string> {
  private context: EditorContext<AIValue | string>;
  private container: HTMLDivElement | null = null;
  private currentValue: AIValue | string;

  constructor(context: EditorContext<AIValue | string>) {
    this.context = context;
    this.currentValue = context.value ?? { status: 'idle' };
  }

  mount(): void {
    const { container, bounds } = this.context;
    
    // Create simple popup
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: `${bounds.height}px`,
      width: `${Math.max(bounds.width, 200)}px`,
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
      zIndex: '10001',
      padding: '12px',
    });
    
    // Show current status
    const status = typeof this.currentValue === 'string' 
      ? 'complete' 
      : (this.currentValue as AIValue)?.status ?? 'idle';
    
    if (status === 'idle') {
      this.container.innerHTML = `
        <div style="text-align: center;">
          <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
            Click to trigger AI enrichment
          </p>
          <button id="ai-trigger" style="
            padding: 8px 16px;
            background: linear-gradient(135deg, #8b5cf6, #6366f1);
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            margin: 0 auto;
          ">
            ✨ Enrich
          </button>
        </div>
      `;
      
      const triggerBtn = this.container.querySelector('#ai-trigger');
      triggerBtn?.addEventListener('click', () => {
        // Simulate triggering AI
        this.currentValue = { status: 'pending' };
        this.context.onChange?.(this.currentValue);
        this.context.onCommit(this.currentValue);
      });
    } else if (status === 'complete') {
      const result = typeof this.currentValue === 'string' 
        ? this.currentValue 
        : (this.currentValue as AIValue).result ?? '';
      
      this.container.innerHTML = `
        <div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">AI Result:</p>
          <p style="margin: 0; font-size: 14px; color: #1f2937;">${result}</p>
          <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
            <button id="ai-retry" style="
              padding: 6px 12px;
              background: #fff;
              border: 1px solid #e5e7eb;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Retry</button>
            <button id="ai-close" style="
              padding: 6px 12px;
              background: #3b82f6;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Close</button>
          </div>
        </div>
      `;
      
      this.container.querySelector('#ai-retry')?.addEventListener('click', () => {
        this.currentValue = { status: 'pending' };
        this.context.onCommit(this.currentValue);
      });
      
      this.container.querySelector('#ai-close')?.addEventListener('click', () => {
        this.context.onCancel();
      });
    } else {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 12px;">
          <div style="margin-bottom: 8px;">⏳</div>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            ${status === 'pending' ? 'Waiting...' : 'Processing...'}
          </p>
        </div>
      `;
    }
    
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

  getValue(): AIValue | string {
    return this.currentValue;
  }

  setValue(value: AIValue | string): void {
    this.currentValue = value;
  }

  focus(): void {
    // Focus is handled in mount
  }

  isValid(): boolean {
    return true;
  }
}

