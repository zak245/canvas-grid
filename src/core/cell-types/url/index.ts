import { urlCellDefinition } from './definition';
import { urlCellRenderer } from './canvas';
import type { CellType } from '../types';

export const urlCellType: CellType<string> = {
  ...urlCellDefinition,
  ...urlCellRenderer,
};

