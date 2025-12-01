import { GridEngine } from '../engine/GridEngine';
import { Sheet } from '../types/workbook';
import { createStore, StoreApi } from 'zustand/vanilla';
import { DEFAULT_CONFIG } from '../config/GridConfig';

interface WorkbookStore {
    sheets: Sheet[];
    activeSheetId: string | null;
}

export class WorkbookManager {
    private store: StoreApi<WorkbookStore>;
    
    constructor(initialSheets: Sheet[]) {
        this.store = createStore(() => ({
            sheets: initialSheets,
            activeSheetId: initialSheets.length > 0 ? initialSheets[0].id : null
        }));
    }

    getStore() {
        return this.store;
    }

    getActiveEngine(): GridEngine | null {
        const state = this.store.getState();
        const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
        
        if (!activeSheet) return null;

        // Lazy initialization of the engine
        if (!activeSheet.engine) {
            activeSheet.engine = new GridEngine(activeSheet.config);
        }

        return activeSheet.engine;
    }

    addSheet(name: string, config: any = DEFAULT_CONFIG) {
        const newSheet: Sheet = {
            id: crypto.randomUUID(),
            name,
            config
        };

        this.store.setState(prev => ({
            sheets: [...prev.sheets, newSheet],
            activeSheetId: newSheet.id // Auto-switch to new sheet
        }));
    }

    setActiveSheet(sheetId: string) {
        const state = this.store.getState();
        if (state.activeSheetId === sheetId) return;

        // 1. Pause/Unmount current engine (if any)
        const currentSheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (currentSheet?.engine) {
            currentSheet.engine.unmount(); 
        }

        // 2. Set new active ID
        this.store.setState({ activeSheetId: sheetId });
    }

    deleteSheet(sheetId: string) {
        // Prevent deleting the last sheet
        const state = this.store.getState();
        if (state.sheets.length <= 1) return;

        this.store.setState(prev => {
            // If the sheet to delete has an engine, unmount it first to be safe (though it shouldn't be mounted if inactive)
            const sheetToDelete = prev.sheets.find(s => s.id === sheetId);
            if (sheetToDelete?.engine) {
                sheetToDelete.engine.unmount();
            }

            const newSheets = prev.sheets.filter(s => s.id !== sheetId);
            let newActiveId = prev.activeSheetId;

            // If we deleted the active sheet, switch to the previous one
            if (prev.activeSheetId === sheetId) {
                newActiveId = newSheets[newSheets.length - 1].id;
            }

            return {
                sheets: newSheets,
                activeSheetId: newActiveId
            };
        });
    }

    /**
     * Duplicate a sheet with its configuration
     */
    duplicateSheet(sheetId: string) {
        const state = this.store.getState();
        const sourceSheet = state.sheets.find(s => s.id === sheetId);
        
        if (!sourceSheet) throw new Error(`Sheet ${sheetId} not found`);

        // Create a deep copy of the configuration to avoid reference issues
        // JSON serialize is the safest standard way for data objects, 
        // though we must be careful if config contains functions (lifecycle hooks)
        // For now, we assume config is JSON-serializable or we do a smart clone.
        // Let's stick to spread + specific deep clones for known data properties.
        
        const newConfig = { ...sourceSheet.config };
        if (newConfig.dataSource) {
            newConfig.dataSource = { ...newConfig.dataSource };
            if (newConfig.dataSource.initialData) {
                // Deep clone initial data
                newConfig.dataSource.initialData = JSON.parse(JSON.stringify(newConfig.dataSource.initialData));
            }
        }

        const newSheet: Sheet = {
            id: crypto.randomUUID(),
            name: `${sourceSheet.name} (Copy)`,
            config: newConfig
        };

        this.store.setState(prev => ({
            sheets: [...prev.sheets, newSheet],
            activeSheetId: newSheet.id
        }));

        return newSheet;
    }

    /**
     * Rename a sheet
     */
    renameSheet(sheetId: string, newName: string) {
        if (!newName.trim()) return;
        
        this.store.setState(prev => ({
            sheets: prev.sheets.map(s => 
                s.id === sheetId ? { ...s, name: newName } : s
            )
        }));
    }

    /**
     * Reorder sheets
     */
    reorderSheet(fromIndex: number, toIndex: number) {
        this.store.setState(prev => {
            const newSheets = [...prev.sheets];
            const [moved] = newSheets.splice(fromIndex, 1);
            newSheets.splice(toIndex, 0, moved);
            return { sheets: newSheets };
        });
    }
}

