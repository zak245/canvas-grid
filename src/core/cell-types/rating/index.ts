import { ratingCellDefinition } from './definition';
import { ratingCellRenderer } from './canvas';
import type { CellType } from '../types';

export const ratingCellType: CellType<number> = {
  ...ratingCellDefinition,
  ...ratingCellRenderer,
};

