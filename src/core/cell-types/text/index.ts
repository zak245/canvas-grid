import { textCellDefinition } from './definition';
import { textCellRenderer as textCanvasRenderer } from './canvas';
import { textCellRenderer as textHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const textCellType: CellType<string> = {
  ...textCellDefinition,
  ...textCanvasRenderer,
  ...textHtmlRenderer,
};
