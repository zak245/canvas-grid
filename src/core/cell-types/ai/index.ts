import { aiCellDefinition } from './definition';
import { aiCellRenderer } from './canvas';
import type { CellType, AIValue } from '../types';

export const aiCellType: CellType<AIValue | string> = {
  ...aiCellDefinition,
  ...aiCellRenderer,
};

