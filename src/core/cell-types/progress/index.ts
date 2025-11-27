import { progressCellDefinition } from './definition';
import { progressCellRenderer } from './canvas';
import type { CellType } from '../types';

export const progressCellType: CellType<number> = {
  ...progressCellDefinition,
  ...progressCellRenderer,
};

