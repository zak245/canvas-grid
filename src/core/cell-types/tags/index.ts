import { tagsCellDefinition } from './definition';
import { tagsCellRenderer } from './canvas';
import type { CellType } from '../types';

export const tagsCellType: CellType<string[]> = {
  ...tagsCellDefinition,
  ...tagsCellRenderer,
};

