import { progressCellDefinition } from './definition';
import { progressCellRenderer as progressCanvasRenderer } from './canvas';
import { progressCellRenderer as progressHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const progressCellType: CellType<number> = {
  ...progressCellDefinition,
  ...progressCanvasRenderer,
  ...progressHtmlRenderer,
};
