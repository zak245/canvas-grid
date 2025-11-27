import { phoneCellDefinition } from './definition';
import { phoneCellRenderer } from './canvas';
import type { CellType } from '../types';

export const phoneCellType: CellType<string> = {
  ...phoneCellDefinition,
  ...phoneCellRenderer,
};

