import { booleanCellDefinition } from './definition';
import { booleanCellRenderer as booleanCanvasRenderer } from './canvas';
import { booleanCellRenderer as booleanHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const booleanCellType: CellType<boolean> = {
  ...booleanCellDefinition,
  ...booleanCanvasRenderer,
  ...booleanHtmlRenderer,
};
