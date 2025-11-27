import { GridEngine } from '../engine/GridEngine';
import { GridConfig } from '../config/GridConfig';

export interface Sheet {
    id: string;
    name: string;
    config: Partial<GridConfig>;
    engine?: GridEngine; // The engine instance is lazy-loaded
}

export interface WorkbookState {
    sheets: Sheet[];
    activeSheetId: string;
}

