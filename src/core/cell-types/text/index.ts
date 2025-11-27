import { textCellDefinition } from './definition';
import { textCellRenderer } from './canvas';
import type { CellType } from '../types';

export const textCellType: CellType<string> = {
  ...textCellDefinition,
  ...textCellRenderer,
};

