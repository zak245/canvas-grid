import { jsonCellDefinition } from './definition';
import { jsonCellRenderer } from './canvas';
import type { CellType } from '../types';

export const jsonCellType: CellType<unknown> = {
  ...jsonCellDefinition,
  ...jsonCellRenderer,
};

