import { linkedCellDefinition } from './definition';
import { linkedCellRenderer } from './canvas';
import type { CellType } from '../types';
import type { LinkedRecordValue } from './definition';

export const linkedCellType: CellType<LinkedRecordValue | LinkedRecordValue[]> = {
  ...linkedCellDefinition,
  ...linkedCellRenderer,
};

export type { LinkedRecordValue } from './definition';
