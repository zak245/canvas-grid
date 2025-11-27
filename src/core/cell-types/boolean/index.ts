import { booleanCellDefinition } from './definition';
import { booleanCellRenderer } from './canvas';
import type { CellType } from '../types';

export const booleanCellType: CellType<boolean> = {
  ...booleanCellDefinition,
  ...booleanCellRenderer,
};

