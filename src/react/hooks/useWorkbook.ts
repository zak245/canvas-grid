import { useEffect, useState } from 'react';
import { WorkbookManager } from '../../core/workbook/WorkbookManager';
import { Sheet } from '../../core/types/workbook';

export function useWorkbook(manager: WorkbookManager) {
    const [activeSheetId, setActiveSheetId] = useState<string | null>(null);
    const [sheets, setSheets] = useState<Sheet[]>([]);

    // Subscribe to manager changes
    useEffect(() => {
        const store = manager.getStore();
        
        const unsubscribe = store.subscribe((state) => {
            setActiveSheetId(state.activeSheetId);
            setSheets(state.sheets);
        });
        
        // Initial sync
        const state = store.getState();
        setActiveSheetId(state.activeSheetId);
        setSheets(state.sheets);

        return unsubscribe;
    }, [manager]);

    return { 
        sheets, 
        activeSheetId,
        setActiveSheet: (id: string) => manager.setActiveSheet(id),
        addSheet: manager.addSheet.bind(manager),
        deleteSheet: manager.deleteSheet.bind(manager),
        duplicateSheet: manager.duplicateSheet.bind(manager),
        renameSheet: manager.renameSheet.bind(manager),
        reorderSheet: manager.reorderSheet.bind(manager),
    };
}
