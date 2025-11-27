import { actionCellDefinition } from './definition';
import { actionCellRenderer } from './canvas';
import type { CellType } from '../types';

export const actionCellType: CellType<null> = {
  ...actionCellDefinition,
  ...actionCellRenderer,
};

