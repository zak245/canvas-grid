import type { 
  CellDefinition, 
  EditorContext, 
  CellEditor,
  ValidationResult,
  RatingTypeOptions,
} from '../types';

// ============================================================================
// Rating Cell Definition
// ============================================================================

export const ratingCellDefinition: CellDefinition<number> = {
  name: 'rating',
  label: 'Rating',
  defaultWidth: 120,
  editorMode: 'inline',

  // ===== Editing =====
  
  createEditor(context: EditorContext<number>): CellEditor<number> {
    return new RatingEditor(context);
  },

  // ===== Validation =====
  
  validate(value: unknown, options?: RatingTypeOptions): ValidationResult {
    if (value === null || value === undefined) {
      return { valid: true };
    }
    
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    
    if (isNaN(num)) {
      return { valid: false, error: 'Invalid rating value' };
    }
    
    const max = options?.max ?? 5;
    
    if (num < 0 || num > max) {
      return { valid: false, error: `Rating must be between 0 and ${max}` };
    }
    
    return { valid: true };
  },
  
  parse(input: string, options?: RatingTypeOptions): number | null {
    if (!input || input.trim() === '') return 0;
    
    const num = parseFloat(input);
    if (isNaN(num)) return null;
    
    const max = options?.max ?? 5;
    return Math.max(0, Math.min(max, num));
  },

  // ===== Formatting =====
  
  format(value: number, options?: RatingTypeOptions): string {
    if (value === null || value === undefined) return '';
    const max = options?.max ?? 5;
    return `${value}/${max}`;
  },
  
  serialize(value: number): string {
    if (value === null || value === undefined) return '';
    return String(value);
  },

  // ===== Sorting =====
  
  compare(a: number, b: number): number {
    return (a ?? 0) - (b ?? 0);
  },
  
  matches(value: number, filter: unknown): boolean {
    if (filter === null || filter === undefined) return true;
    
    if (typeof filter === 'number') {
      return value >= filter;
    }
    
    if (typeof filter === 'object') {
      const rangeFilter = filter as { min?: number; max?: number };
      if (rangeFilter.min !== undefined && value < rangeFilter.min) return false;
      if (rangeFilter.max !== undefined && value > rangeFilter.max) return false;
      return true;
    }
    
    return true;
  }
};

// ============================================================================
// Rating Editor Implementation
// ============================================================================

class RatingEditor implements CellEditor<number> {
  private context: EditorContext<number>;
  private container: HTMLDivElement | null = null;
  private currentValue: number;

  constructor(context: EditorContext<number>) {
    this.context = context;
    this.currentValue = context.value ?? 0;
  }

  mount(): void {
    const { container, bounds, options } = this.context;
    const typeOptions = options as RatingTypeOptions | undefined;
    
    const max = typeOptions?.max ?? 5;
    const color = typeOptions?.color ?? '#fbbf24';
    const allowHalf = typeOptions?.allowHalf ?? false;
    
    // Create container
    // Note: Parent container is already positioned at cell location
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      left: '0',
      top: '0',
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
      backgroundColor: '#fff',
      border: '2px solid #3b82f6',
      boxSizing: 'border-box',
      zIndex: '10001',
    });
    
    // Create stars
    for (let i = 0; i < max; i++) {
      const star = document.createElement('span');
      star.style.cursor = 'pointer';
      star.style.fontSize = '18px';
      star.style.transition = 'transform 0.1s';
      star.dataset.index = String(i);
      
      this.updateStarDisplay(star, i, this.currentValue, color);
      
      star.addEventListener('mouseenter', () => {
        star.style.transform = 'scale(1.2)';
      });
      
      star.addEventListener('mouseleave', () => {
        star.style.transform = 'scale(1)';
      });
      
      star.addEventListener('click', (e) => {
        const rect = star.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isHalf = allowHalf && clickX < rect.width / 2;
        
        this.currentValue = isHalf ? i + 0.5 : i + 1;
        this.updateAllStars(color);
        this.context.onChange?.(this.currentValue);
        
        // Auto-commit after a short delay
        setTimeout(() => this.commitValue(), 200);
      });
      
      this.container.appendChild(star);
    }
    
    container.appendChild(this.container);
    
    // Click outside to commit
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside);
    }, 0);
  }

  private updateStarDisplay(star: HTMLSpanElement, index: number, value: number, color: string): void {
    if (value >= index + 1) {
      star.textContent = '★';
      star.style.color = color;
    } else if (value >= index + 0.5) {
      star.textContent = '★'; // Could use a half-star character
      star.style.color = color;
      star.style.opacity = '0.5';
    } else {
      star.textContent = '☆';
      star.style.color = '#d1d5db';
      star.style.opacity = '1';
    }
  }

  private updateAllStars(color: string): void {
    if (!this.container) return;
    
    const stars = this.container.querySelectorAll('span');
    stars.forEach((star, i) => {
      this.updateStarDisplay(star as HTMLSpanElement, i, this.currentValue, color);
    });
  }

  private handleClickOutside = (e: MouseEvent): void => {
    if (this.container && !this.container.contains(e.target as Node)) {
      this.commitValue();
    }
  };

  unmount(): void {
    document.removeEventListener('click', this.handleClickOutside);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }

  getValue(): number {
    return this.currentValue;
  }

  setValue(value: number): void {
    this.currentValue = value;
    const typeOptions = this.context.options as RatingTypeOptions | undefined;
    this.updateAllStars(typeOptions?.color ?? '#fbbf24');
  }

  focus(): void {
    // Stars are already interactive
  }

  isValid(): boolean {
    return ratingCellDefinition.validate(this.currentValue, this.context.options as RatingTypeOptions).valid;
  }

  private commitValue(): void {
    this.context.onCommit(this.currentValue);
  }
}

