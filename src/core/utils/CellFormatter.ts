import type { GridCell, GridColumn, CellFormat } from '../types/grid';

/**
 * CellFormatter - Handles formatting of cell values based on type
 * Includes caching for performance on 60fps rendering
 */
export class CellFormatter {
    // Removed unused private static numberFormat

    private static currencyFormat = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    /**
     * Format a cell value based on its type and format options
     * Returns empty string for null/undefined
     */
    static format(
        cell: GridCell | undefined,
        column: GridColumn,
        maxWidth?: number
    ): string {
        // Handle null/undefined/empty
        if (cell === undefined || cell.value === null || cell.value === undefined) {
            return '';
        }

        // Check cache first
        if (cell._cached !== undefined) {
            // Auto-invalidate bad cache (Fix for [object Object] sticking across HMR)
            if (cell._cached === '[object Object]' || cell._cached.startsWith('[object') || cell._cached === '') {
                delete cell._cached;
            } else {
                return this.applyOverflow(cell._cached, maxWidth);
            }
        }

        const value = cell.value;
        const type = cell.type || column.type || 'text';
        const format = { ...column.format, ...cell.format };

        let formatted: string;

        switch (type) {
            case 'number':
                formatted = this.formatNumber(value, format);
                break;
            case 'date':
                formatted = this.formatDate(value, format);
                break;
            case 'boolean':
                formatted = this.formatBoolean(value, format);
                break;
            case 'email':
                formatted = this.formatEmail(value);
                break;
            case 'url':
                formatted = this.formatUrl(value);
                break;
            case 'linked':
                if (typeof value === 'object' && value) {
                    formatted = String(value.name || value.label || value.title || value.id || '');
                } else {
                     formatted = String(value || '');
                }
                break;
            case 'phone':
                formatted = this.formatPhone(value);
                break;
            case 'select':
                formatted = this.formatSelect(value);
                break;
            case 'progress':
                formatted = this.formatProgress(value);
                break;
            case 'text':
            default:
                formatted = this.formatText(value);
                break;
        }

        // Cache the result
        // optimization: don't cache empty strings for linked types to prevent "invisible" state
        if (formatted !== '' || type !== 'linked') {
            cell._cached = formatted;
        }
        
        return this.applyOverflow(formatted, maxWidth);
    }

    private static formatText(value: any): string {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
        
        // Handle objects that shouldn't be converted to [object Object]
        if (typeof value === 'object' && value !== null) {
            // Try to extract a meaningful string representation
            const name = value.name || value.label || value.title || value.id;
            if (name) return String(name);
        }
        
        return '';
    }

    private static formatNumber(value: any, format: CellFormat): string {
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) {
            // Invalid number - show raw value as string
            return String(value);
        }

        let formatted: string;

        if (format.prefix === '$' || format.suffix === '$') {
            // Currency formatting
            formatted = this.currencyFormat.format(num);
        } else if (format.suffix === '%') {
            // Percentage
            formatted = (num * 100).toFixed(format.decimals ?? 1) + '%';
        } else {
            // Regular number
            const decimals = format.decimals ?? 2;
            if (format.thousandsSeparator) {
                formatted = num.toLocaleString('en-US', {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals,
                });
            } else {
                formatted = num.toFixed(decimals);
            }
        }

        // Apply prefix/suffix
        if (format.prefix && !format.prefix.includes('$')) {
            formatted = format.prefix + formatted;
        }
        if (format.suffix && !format.suffix.includes('%') && !format.suffix.includes('$')) {
            formatted = formatted + format.suffix;
        }

        return formatted;
    }

    private static formatDate(value: any, format: CellFormat): string {
        let date: Date;

        if (value instanceof Date) {
            date = value;
        } else if (typeof value === 'string' || typeof value === 'number') {
            date = new Date(value);
        } else {
            // Invalid date - show raw value as string
            return String(value);
        }

        if (isNaN(date.getTime())) {
            // Invalid date - show raw value as string
            return String(value);
        }

        // Simple date formatting (can be enhanced with date-fns later)
        const dateFormat = format.dateFormat || 'YYYY-MM-DD';

        if (dateFormat === 'MM/DD/YYYY') {
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const year = date.getFullYear();
            return `${month}/${day}/${year}`;
        } else if (dateFormat === 'YYYY-MM-DD') {
            return date.toISOString().split('T')[0];
        } else {
            // Default
            return date.toLocaleDateString();
        }
    }

    private static formatBoolean(value: any, format: CellFormat): string {
        const bool = typeof value === 'boolean' ? value :
            value === 'true' || value === '1' || value === 1;

        if (format.booleanDisplay === 'checkbox') {
            return bool ? '✓' : '✗';
        } else {
            return bool ? 'TRUE' : 'FALSE';
        }
    }

    private static formatEmail(value: any): string {
        const str = String(value || '');
        // Just return the value - validation happens elsewhere
        return str;
    }

    private static formatUrl(value: any): string {
        const str = String(value || '');
        // Just return the value - validation happens elsewhere
        return str;
    }

    private static formatPhone(value: any): string {
        if (!value) return '';
        
        // Remove all non-digits
        const digits = String(value).replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for 10 digits
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        
        // Format with country code for 11 digits starting with 1
        if (digits.length === 11 && digits.startsWith('1')) {
            const national = digits.slice(1);
            return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
        }
        
        // Return as-is for other formats
        return String(value);
    }

    private static formatSelect(value: any): string {
        if (!value) return '';
        
        // If it's an array (multi-select), join with commas
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        
        return String(value);
    }

    private static formatProgress(value: any): string {
        if (value === null || value === undefined) return '';
        
        const num = typeof value === 'number' ? value : parseFloat(value);
        if (isNaN(num)) return '';
        
        return `${Math.round(num)}%`;
    }

    /**
     * Apply text overflow handling
     */
    private static applyOverflow(text: string, maxWidth?: number): string {
        if (!maxWidth || !text) return text;

        // Approximate: 1 char ≈ 7px with 13px font
        const maxChars = Math.floor(maxWidth / 7);

        if (text.length > maxChars) {
            return text.substring(0, maxChars - 1) + '…';
        }

        return text;
    }

    /**
     * Invalidate cache when cell value changes
     */
    static invalidateCache(cell: GridCell): void {
        delete cell._cached;
    }
}
