import type { CellType, CellValue } from '../types/grid';

/**
 * TypeValidator - Validates if a value is compatible with a column type
 */
export class TypeValidator {
    /**
     * Validate if a value matches the expected type
     * Returns { valid: boolean, error?: string }
     */
    static validate(value: CellValue, expectedType: CellType): { valid: boolean; error?: string } {
        // Null/undefined/empty is always valid
        if (value === null || value === undefined || value === '') {
            return { valid: true };
        }

        switch (expectedType) {
            case 'text':
                // Text accepts anything
                return { valid: true };

            case 'number':
                const num = typeof value === 'number' ? value : parseFloat(value);
                if (isNaN(num)) {
                    return { valid: false, error: 'Invalid number' };
                }
                return { valid: true };

            case 'date':
                let date: Date;
                if (value instanceof Date) {
                    date = value;
                } else {
                    date = new Date(value);
                }
                if (isNaN(date.getTime())) {
                    return { valid: false, error: 'Invalid date' };
                }
                return { valid: true };

            case 'boolean':
                // Accept boolean or truthy string values
                if (typeof value === 'boolean') {
                    return { valid: true };
                }
                const strVal = String(value).toLowerCase();
                if (['true', 'false', '1', '0', 'yes', 'no'].includes(strVal)) {
                    return { valid: true };
                }
                return { valid: false, error: 'Invalid boolean' };

            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(String(value))) {
                    return { valid: false, error: 'Invalid email format' };
                }
                return { valid: true };

            case 'url':
                try {
                    new URL(String(value));
                    return { valid: true };
                } catch {
                    // Also accept relative URLs or partial URLs
                    const urlPattern = /^(https?:\/\/|www\.)/i;
                    if (urlPattern.test(String(value))) {
                        return { valid: true };
                    }
                    return { valid: false, error: 'Invalid URL format' };
                }

            case 'ai':
                // AI columns accept anything
                return { valid: true };

            default:
                return { valid: true };
        }
    }

    /**
     * Attempt to convert a value to match the expected type
     * Returns the converted value or original if conversion fails
     */
    static tryConvert(value: CellValue, targetType: CellType): CellValue {
        if (value === null || value === undefined || value === '') {
            return value;
        }

        try {
            switch (targetType) {
                case 'number':
                    const num = parseFloat(value);
                    return isNaN(num) ? value : num;

                case 'date':
                    if (value instanceof Date) return value;
                    const date = new Date(value);
                    return isNaN(date.getTime()) ? value : date;

                case 'boolean':
                    if (typeof value === 'boolean') return value;
                    const strVal = String(value).toLowerCase();
                    if (strVal === 'true' || strVal === '1' || strVal === 'yes') return true;
                    if (strVal === 'false' || strVal === '0' || strVal === 'no') return false;
                    return value;

                default:
                    return value;
            }
        } catch {
            return value;
        }
    }
}
