import React, { useMemo } from 'react';
import { WorkbookManager } from '../../core/workbook/WorkbookManager';
import { useWorkbook } from '../hooks/useWorkbook';
import { GridContainer } from './GridContainer';
import { DEFAULT_CONFIG } from '../../core/config/GridConfig';
import { GridColumn, GridRow } from '../../core/types/grid';

// Icons
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 1V11M1 6H11" />
  </svg>
);

const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3L9 9M9 3L3 9" />
  </svg>
);

export interface WorkbookShellProps {
    manager?: WorkbookManager;
}

export const WorkbookShell: React.FC<WorkbookShellProps> = ({ manager: propManager }) => {
    // Initialize manager once (if not provided)
    const manager = useMemo(() => {
        if (propManager) return propManager;
        return new WorkbookManager([
            { 
                id: 'sheet-1', 
                name: 'Data Sheet 1', 
                config: { ...DEFAULT_CONFIG, dataSource: { ...DEFAULT_CONFIG.dataSource, initialData: generateMockData(50) } } 
            }
        ]);
    }, [propManager]);

    const { sheets, activeSheetId, setActiveSheet, addSheet, deleteSheet } = useWorkbook(manager);
    
    // Get the active engine directly from the manager
    const activeEngine = manager.getActiveEngine();

    return (
        <div className="flex flex-col h-full w-full bg-gray-50">
            {/* Main Grid Area */}
            <div className="flex-1 relative overflow-hidden">
                {activeEngine && (
                    <GridContainer 
                        key={activeSheetId} // Force re-mount when sheet changes to ensure clean state
                        engine={activeEngine}
                    />
                )}
            </div>

            {/* Bottom Tab Bar */}
            <div className="h-9 bg-white border-t border-gray-200 flex items-center px-2 gap-1 select-none">
                {sheets.map(sheet => (
                    <div 
                        key={sheet.id}
                        className={`
                            group flex items-center
                            px-4 h-7 text-sm font-medium rounded-t-md border-t border-l border-r transition-colors cursor-pointer
                            ${activeSheetId === sheet.id 
                                ? 'bg-white border-gray-300 text-green-600 border-b-white relative top-[1px]' 
                                : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
                            }
                        `}
                        onClick={() => setActiveSheet(sheet.id)}
                    >
                        <span>{sheet.name}</span>
                        {sheets.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    deleteSheet(sheet.id);
                                }}
                                className={`
                                    ml-2 p-0.5 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity
                                    ${activeSheetId === sheet.id ? 'opacity-100' : ''}
                                `}
                            >
                                <XIcon />
                            </button>
                        )}
                    </div>
                ))}
                
                <button 
                    onClick={() => addSheet(`Sheet ${sheets.length + 1}`, { 
                        ...DEFAULT_CONFIG, 
                        dataSource: { 
                            ...DEFAULT_CONFIG.dataSource, 
                            initialData: {
                                columns: [
                                    { id: 'col-1', title: 'Column 1', width: 100, type: 'text', visible: true },
                                    { id: 'col-2', title: 'Column 2', width: 100, type: 'text', visible: true },
                                    { id: 'col-3', title: 'Column 3', width: 100, type: 'text', visible: true },
                                ], 
                                rows: [] 
                            } 
                        } 
                    })}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full ml-1"
                >
                    <PlusIcon />
                </button>
            </div>
        </div>
    );
};

// Helper for mock data
function generateMockData(rowCount: number) {
    const columns: GridColumn[] = [
        { id: 'id', title: 'ID', width: 60, type: 'text', visible: true },
        { id: 'name', title: 'Name', width: 150, type: 'text', visible: true },
        { id: 'status', title: 'Status', width: 100, type: 'select', visible: true, typeOptions: { options: ['Active', 'Inactive', 'Pending'] } },
        { id: 'amount', title: 'Amount', width: 100, type: 'number', visible: true, format: { prefix: '$' } },
        { id: 'date', title: 'Date', width: 120, type: 'date', visible: true },
    ];

    const rows: GridRow[] = [];
    for (let i = 0; i < rowCount; i++) {
        const cells = new Map();
        cells.set('id', { value: `ROW-${i + 1}` });
        cells.set('name', { value: `Item ${i + 1}` });
        cells.set('status', { value: i % 3 === 0 ? 'Active' : i % 3 === 1 ? 'Inactive' : 'Pending' });
        cells.set('amount', { value: Math.floor(Math.random() * 1000) });
        cells.set('date', { value: new Date().toISOString().split('T')[0] });
        
        rows.push({
            id: `row-${i}`,
            cells
        });
    }

    return { columns, rows };
}
