import { numberCellDefinition } from './definition';
import { numberCellRenderer as numberCanvasRenderer } from './canvas';
import { numberCellRenderer as numberHtmlRenderer } from './renderers';
import type { CellType } from '../types';

export const numberCellType: CellType<number> = {
  ...numberCellDefinition,
  ...numberCanvasRenderer,
  ...numberHtmlRenderer,
};
