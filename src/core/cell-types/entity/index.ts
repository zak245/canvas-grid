import { entityCellDefinition } from './definition';
import { entityCellRenderer as entityCanvasRenderer } from './canvas';
import { entityCellRenderer } from './renderers';
import type { CellType, EntityValue } from '../types';

export const entityCellType: CellType<EntityValue> = {
  ...entityCellDefinition,
  ...entityCanvasRenderer,
  ...entityCellRenderer,
};
