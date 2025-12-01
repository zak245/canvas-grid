import { dateCellDefinition } from './definition';
import { dateCellRenderer as dateCanvasRenderer } from './canvas';
import { dateCellRenderer as dateHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const dateCellType: CellType<Date> = {
  ...dateCellDefinition,
  ...dateCanvasRenderer,
  ...dateHtmlRenderer,
};
