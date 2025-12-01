import { ratingCellDefinition } from './definition';
import { ratingCellRenderer as ratingCanvasRenderer } from './canvas';
import { ratingCellRenderer } from './renderers';
import type { CellType } from '../types';

export const ratingCellType: CellType<number> = {
  ...ratingCellDefinition,
  ...ratingCanvasRenderer,
  ...ratingCellRenderer,
};
