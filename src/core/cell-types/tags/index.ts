import { tagsCellDefinition } from './definition';
import { tagsCellRenderer as tagsCanvasRenderer } from './canvas';
import { tagsCellRenderer } from './renderers';
import type { CellType } from '../types';

export const tagsCellType: CellType<string[]> = {
  ...tagsCellDefinition,
  ...tagsCanvasRenderer,
  ...tagsCellRenderer,
};
