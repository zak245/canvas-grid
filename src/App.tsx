import { useState } from 'react';
import { GridContainer } from './react/GridContainer';
import { AppShell } from './components/layout/AppShell';
import { AddColumnModal } from './components/AddColumnModal';
import { generateMockData } from './utils/mockData';
import type { GridColumn } from './types/grid';
import type { GridConfig } from './config/GridConfig';

// Generate initial data - 10 rows for testing add row experience
const { columns: initialCols, rows: initialRows } = generateMockData(10, false);

// NEW: Create grid config using platform foundation
const gridConfig: Partial<GridConfig> = {
    dataSource: {
        mode: 'local',
        initialData: {
            columns: initialCols,
            rows: initialRows
        }
    },
    features: {
        columns: {
            allowResize: true,
            allowReorder: true,
            allowDelete: true,
            allowHide: true,
            allowAdd: true,
            allowRename: true,
            allowPin: true,
            allowGroups: false,
            minWidth: 50,
            maxWidth: 600,
            defaults: { visible: true, width: 200 }
        },
        rows: {
            allowAdd: true,
            allowDelete: true,
            allowReorder: false,
            allowBulkDelete: true,
            allowBulkUpdate: true,
            rowHeight: 32,
            allowVariableHeight: false,
            allowMultiSelect: true,
            bufferSize: 2
        },
        cells: {
            enabled: true,
            mode: 'doubleClick',
            startEditOnType: false,
            validateOnChange: true,
            validateOnBlur: true,
            autoSave: false,
            autoSaveDebounce: 1000
        },
        sorting: {
            mode: 'local',
            multiColumn: false,
            strategy: 'indices', // Virtual sorting - FAST!
            debounceMs: 300
        },
        selection: { mode: 'multi', allowRanges: true },
        ai: { enabled: true, streamingEnabled: true }
    },
    performance: {
        enableVirtualization: true,
        renderBufferSize: 2,
        batchUpdates: true,
        batchSize: 100,
        batchDebounce: 50,
        optimisticUpdates: false,
        enableFormatCache: true,
        enableTransactions: false
    },
    lifecycle: {
        onSort: (sortState) => {
            console.log('Sorted:', sortState);
        },
        onRowAdd: (row) => {
            console.log('Row added:', row.id);
        },
        onError: (error) => {
            console.error('Grid error:', error);
        }
    },
    ui: {
        theme: {},
        confirmDelete: true,
        enableContextMenus: true,
        showErrorTooltips: true,
        showCellTooltips: false
    }
};

function App() {
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [columns, setColumns] = useState<GridColumn[]>(initialCols);

    const handleAddColumn = (newColumn: GridColumn) => {
        setColumns([...columns, newColumn]);
    };

    const handleAddRow = async () => {
        // Create a new empty row
        const newRow = {
            cells: new Map()
        };
        await gridEngineInstance.addRow(newRow);
        console.log('New row added via UI');
    };

    return (
        <AppShell onAddColumn={() => setIsAddColumnOpen(true)} onAddRow={handleAddRow}>
            <GridContainer
                config={gridConfig}  // NEW: Pass config
            />
            <AddColumnModal
                isOpen={isAddColumnOpen}
                onClose={() => setIsAddColumnOpen(false)}
                onSubmit={handleAddColumn}
            />
        </AppShell>
    );
}

export default App;
