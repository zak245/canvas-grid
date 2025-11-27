import { selectCellDefinition } from './definition';
import { selectCellRenderer } from './canvas';
import type { CellType } from '../types';

export const selectCellType: CellType<string | string[]> = {
  ...selectCellDefinition,
  ...selectCellRenderer,
};

