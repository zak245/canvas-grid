import { selectCellDefinition } from './definition';
import { selectCellRenderer as selectCanvasRenderer } from './canvas';
import { selectCellRenderer as selectHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const selectCellType: CellType<string | string[]> = {
  ...selectCellDefinition,
  ...selectCanvasRenderer,
  ...selectHtmlRenderer,
};
