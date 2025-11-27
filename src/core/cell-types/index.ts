/**
 * Cell Types - Public API
 * 
 * All built-in cell types and the registry for accessing them.
 */

// Types
export type {
  CellType,
  CellTypeName,
  CellRenderContext,
  EditorContext,
  CellEditor,
  ValidationResult,
  TypeOptions,
  TextTypeOptions,
  NumberTypeOptions,
  DateTypeOptions,
  BooleanTypeOptions,
  SelectTypeOptions,
  SelectOption,
  EmailTypeOptions,
  UrlTypeOptions,
  PhoneTypeOptions,
  ProgressTypeOptions,
  LinkedTypeOptions,
  CellTypeRegistry,
} from './types';

// Registry
export { 
  cellTypeRegistry, 
  getCellType, 
  formatCellValue, 
  validateCellValue, 
  parseCellValue 
} from './registry';

// Individual cell types
export { textCellType } from './text';
export { numberCellType } from './number';
export { dateCellType } from './date';
export { booleanCellType } from './boolean';
export { selectCellType } from './select';
export { emailCellType } from './email';
export { urlCellType } from './url';
export { phoneCellType } from './phone';
export { progressCellType } from './progress';
export { linkedCellType } from './linked';

// Linked record value type
export type { LinkedRecordValue } from './linked';

