import { entityCellDefinition } from './definition';
import { entityCellRenderer } from './canvas';
import type { CellType, EntityValue } from '../types';

export const entityCellType: CellType<EntityValue> = {
  ...entityCellDefinition,
  ...entityCellRenderer,
};

