import { emailCellDefinition } from './definition';
import { emailCellRenderer } from './canvas';
import type { CellType } from '../types';

export const emailCellType: CellType<string> = {
  ...emailCellDefinition,
  ...emailCellRenderer,
};

