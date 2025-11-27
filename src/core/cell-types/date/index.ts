import { dateCellDefinition } from './definition';
import { dateCellRenderer } from './canvas';
import type { CellType } from '../types';

export const dateCellType: CellType<Date | string> = {
  ...dateCellDefinition,
  ...dateCellRenderer,
};

