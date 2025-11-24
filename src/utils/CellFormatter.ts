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
            return this.applyOverflow(cell._cached, maxWidth);
        }

        // Custom Formatter from Column
        if (column.formatter) {
            const formatted = column.formatter(cell.value);
            cell._cached = formatted;
            return this.applyOverflow(formatted, maxWidth);
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
            case 'ai':
                formatted = this.formatAI(value);
                break;
            case 'text':
            default:
                formatted = this.formatText(value);
                break;
        }

        // Cache the result
        cell._cached = formatted;

        return this.applyOverflow(formatted, maxWidth);
    }

    private static formatText(value: any): string {
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return String(value);
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

    private static formatAI(value: any): string {
        // AI cells just render their value as-is (streaming handled elsewhere)
        return String(value || '');
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
