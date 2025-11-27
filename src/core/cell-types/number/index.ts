import { numberCellDefinition } from './definition';
import { numberCellRenderer } from './canvas';
import type { CellType } from '../types';

export const numberCellType: CellType<number> = {
  ...numberCellDefinition,
  ...numberCellRenderer,
};

