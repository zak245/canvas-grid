import { useState, useEffect } from 'react';
import { GridContainer } from './react/GridContainer';
import { AppShell } from './components/layout/AppShell';
import { AddColumnModal } from './components/AddColumnModal';
import { ColumnsDrawer } from './components/ColumnsDrawer';
import { EnrichmentMenu } from './components/EnrichmentMenu';
import { EnrichmentProgress } from './components/EnrichmentProgress';
import { generateMockData, generateCompanyPool } from './utils/mockData';
import { BackendAdapter } from './adapters';
import type { GridColumn } from './types/grid';
import type { GridConfig } from './config/GridConfig';
import { GridEngine } from './engine/GridEngine';
import { TagEditor } from './examples/editors/TagEditor';
import { MultiSelectEditor } from './examples/editors/MultiSelectEditor';
import { JsonEditorDrawer } from './examples/editors/JsonEditorDrawer';
import { PhoneNumberDrawer } from './examples/editors/PhoneNumberDrawer';
import { LinkedRecordDrawer } from './examples/editors/LinkedRecordDrawer';

// Backend Configuration
// Toggle USE_BACKEND to switch between local and backend modes
const USE_BACKEND = import.meta.env.VITE_USE_BACKEND === 'true'; 
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const GRID_ID = import.meta.env.VITE_GRID_ID || '6923deb29159ecd511020001'; // Default or from env

// Generate initial data for local mode
const { columns: initialCols, rows: initialRows } = generateMockData(20004, false);

// Pin "First Name" for demo (Column Freeze)
const firstNameCol = initialCols.find(c => c.title === 'First Name');
if (firstNameCol) {
    firstNameCol.pinned = true;
}

// Configure generic header action for Email column
const emailCol = initialCols.find(c => c.type === 'email');
if (emailCol) {
    emailCol.headerAction = {
        icon: 'sparkles',
        tooltip: 'Verify Emails'
    };
}

// Configure Status Column for Custom Inline Edit
const statusCol = initialCols.find(c => c.id === 'status');
if (statusCol) {
    statusCol.editor = {
        mode: 'custom',
        component: TagEditor
    };
}

// Add Tags Column for Multi-Select Edit
initialCols.push({
    id: 'tags',
    title: 'Tags (Multi)',
    width: 200,
    type: 'text',
    visible: true,
    editor: {
        mode: 'custom',
        component: MultiSelectEditor
    },
    formatter: (value: any) => {
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return String(value || '');
    }
});

// Populate Tags Data
initialRows.forEach((row, i) => {
    const tags = [];
    if (i % 2 === 0) tags.push('Feature');
    if (i % 3 === 0) tags.push('Urgent');
    if (i % 5 === 0) tags.push('Bug');
    row.cells.set('tags', { value: tags });
});

// Add Metadata Column for Drawer Edit
initialCols.push({
    id: 'metadata',
    title: 'Metadata (JSON)',
    width: 200,
    type: 'text',
    visible: true,
    editor: {
        mode: 'drawer'
    }
});

// Configure Phone Column for Custom Drawer Edit
const phoneCol = initialCols.find(c => c.id === 'phone');
if (phoneCol) {
    phoneCol.title = 'Phone Numbers';
    phoneCol.width = 220;
    phoneCol.editor = {
        mode: 'custom',
        component: PhoneNumberDrawer,
        lockScroll: false
    };
    phoneCol.formatter = (value: any) => {
        try {
            if (typeof value === 'string' && value.trim().startsWith('[')) {
                const parsed = JSON.parse(value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const primary = parsed.find((p: any) => p.isPrimary) || parsed[0];
                    const count = parsed.length;
                    return `${primary.number} (${primary.type})${count > 1 ? ` +${count - 1}` : ''}`;
                }
                return '';
            }
            return String(value || '');
        } catch (e) {
            return String(value || '');
        }
    };
}

// Generate Company Options for Editor
const companyPool = generateCompanyPool(50);
const companyOptions = companyPool.map(c => ({
    label: c.name,
    value: c
}));

// Configure Company Column (Linked Record)
const companyCol = initialCols.find(c => c.id === 'company');
if (companyCol) {
    companyCol.editor = {
        mode: 'custom',
        component: LinkedRecordDrawer,
        options: companyOptions,
        lockScroll: false
    };
    companyCol.formatter = (value: any) => {
        try {
             if (typeof value === 'string' && value.trim().startsWith('{')) {
                const parsed = JSON.parse(value);
                return parsed.name || '';
             }
             return String(value || '');
        } catch (e) {
            return String(value || '');
        }
    };
}

// Create backend adapter if using backend mode
const backendAdapter = USE_BACKEND ? new BackendAdapter({
    baseUrl: BACKEND_URL,
    gridId: GRID_ID,
    enableLogs: true,
}) : null;

// NEW: Create grid config using platform foundation
const gridConfig: Partial<GridConfig> = {
    dataSource: USE_BACKEND 
        ? {
            mode: 'backend',
            adapter: backendAdapter!,
        }
        : {
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
        },
        onColumnAction: (columnId, action) => {
            console.log(`Action triggered: ${action} on ${columnId}`);
            alert(`Generic Action Triggered!\n\nColumn: ${columnId}\nAction: ${action}\n\n(Consumer can wire this to API calls, verification, etc.)`);
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

// Create instance outside component
const gridEngineInstance = new GridEngine(gridConfig as any);

function App() {
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [isColumnsDrawerOpen, setIsColumnsDrawerOpen] = useState(false);
    const [columns, setColumns] = useState<GridColumn[]>([]);
    const [isLoading, setIsLoading] = useState(USE_BACKEND);
    const [error, setError] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [activeEnrichmentJob, setActiveEnrichmentJob] = useState<string | null>(null);
    const [drawerState, setDrawerState] = useState<{
        isOpen: boolean;
        rowIndex: number;
        colId: string;
        initialData: any;
    }>({ isOpen: false, rowIndex: -1, colId: '', initialData: null });

    useEffect(() => {
        // Subscribe to engine changes to update local state for Drawer
        const unsubscribe = gridEngineInstance.subscribeToDataChange(() => {
            setColumns(gridEngineInstance.model.getColumns());
        });

        // Subscribe to selection changes to update enrichment menu
        const unsubscribeSelection = gridEngineInstance.store.subscribe(
            (state) => {
                const selection = state.selection;
                if (selection && USE_BACKEND) {
                    // Extract unique row indices from selection ranges
                    const rowIndices = new Set<number>();
                    selection.ranges.forEach((range: any) => {
                        for (let row = range.start.row; row <= range.end.row; row++) {
                            rowIndices.add(row);
                        }
                    });

                    // Get row IDs from model
                    const rows = gridEngineInstance.model.getAllRows();
                    const ids = Array.from(rowIndices)
                        .map((idx) => rows[idx]?.id)
                        .filter(Boolean) as string[];

                    setSelectedRowIds(ids);
                } else {
                    setSelectedRowIds([]);
                }
            }
        );
        
        // Initial load
        const loadData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
                if (USE_BACKEND) {
                    console.log('🔌 Loading data from backend...');
                    console.log(`📡 Backend URL: ${BACKEND_URL}`);
                    console.log(`📊 Grid ID: ${GRID_ID}`);
                    
                    // Test backend connection
                    const response = await fetch(`${BACKEND_URL}/health`);
                    if (!response.ok) {
                        throw new Error('Backend server is not responding');
                    }
                    console.log('✅ Backend connection successful');
                }
                
                setColumns(gridEngineInstance.model.getColumns());
                setIsLoading(false);
            } catch (err: any) {
                console.error('❌ Failed to load data:', err);
                setError(err.message || 'Failed to connect to backend');
                setIsLoading(false);
            }
        };
        
        loadData();
        
        // Attach lifecycle hook for custom editors
        gridEngineInstance.lifecycle.onCellEditStart = (row, colId, value) => {
             const col = gridEngineInstance.model.getColumnById(colId);
             // Check both explicit mode and ID as fallback
             if (colId === 'metadata' || col?.editor?.mode === 'drawer') {
                 setDrawerState({
                     isOpen: true,
                     rowIndex: row,
                     colId,
                     initialData: value
                 });
             }
        };
        
        return () => {
            unsubscribe();
            unsubscribeSelection();
        };
    }, []);

    const handleAddColumn = async (newColumn: GridColumn) => {
        await gridEngineInstance.addColumn(newColumn);
        setIsAddColumnOpen(false);
    };

    const handleAddRow = async () => {
        // Create a new empty row
        const newRow = {
            cells: new Map()
        };
        await gridEngineInstance.addRow(newRow);
        console.log('New row added via UI');
    };

    const handleEnrichmentComplete = async () => {
        console.log('✅ Enrichment completed!');
        console.log('💡 Tip: Refresh the page to see enriched data, or scroll/interact with grid');
        // Note: For a production app, you'd implement proper data refresh here
        // For this POC, user can refresh page or the grid will update on next interaction
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading data from backend...</p>
                    <p className="text-sm text-gray-500 mt-2">{BACKEND_URL}</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center max-w-md">
                    <div className="text-red-600 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Backend Connection Failed</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <div className="bg-gray-100 p-4 rounded-lg text-left text-sm">
                        <p className="font-mono text-gray-700 mb-2">Backend URL: {BACKEND_URL}</p>
                        <p className="font-mono text-gray-700">Grid ID: {GRID_ID}</p>
                    </div>
                    <div className="mt-4 space-y-2">
                        <button 
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Retry Connection
                        </button>
                        <p className="text-xs text-gray-500">
                            Make sure backend is running: <code className="bg-gray-200 px-2 py-1 rounded">cd backend && npm run dev</code>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <AppShell 
            onAddColumn={() => setIsColumnsDrawerOpen(true)} 
            onAddRow={handleAddRow}
            mode={USE_BACKEND ? 'backend' : 'local'}
        >
            {/* Enrichment Menu - Only show in backend mode */}
            {USE_BACKEND && (
                <EnrichmentMenu
                    selectedRowIds={selectedRowIds}
                    gridId={GRID_ID}
                    backendUrl={BACKEND_URL}
                    onEnrichmentStart={(jobId) => setActiveEnrichmentJob(jobId)}
                    onEnrichmentComplete={handleEnrichmentComplete}
                />
            )}

            <GridContainer
                engine={gridEngineInstance}
                config={gridConfig} 
                onAddColumnClick={(column) => {
                    if (column) {
                        handleAddColumn(column);
                    } else {
                        setIsAddColumnOpen(true);
                    }
                }}
            />
            
            <AddColumnModal
                isOpen={isAddColumnOpen}
                onClose={() => setIsAddColumnOpen(false)}
                onSubmit={handleAddColumn}
            />

            <ColumnsDrawer
                isOpen={isColumnsDrawerOpen}
                onClose={() => setIsColumnsDrawerOpen(false)}
                columns={columns}
                onToggleVisibility={(colId, visible) => gridEngineInstance.setColumnVisibility(colId, visible)}
                onAddColumn={() => {
                    setIsColumnsDrawerOpen(false);
                    setIsAddColumnOpen(true);
                }}
            />

            {/* Enrichment Progress Modal */}
            {activeEnrichmentJob && (
                <EnrichmentProgress
                    jobId={activeEnrichmentJob}
                    gridId={GRID_ID}
                    backendUrl={BACKEND_URL}
                    onClose={() => setActiveEnrichmentJob(null)}
                    onComplete={handleEnrichmentComplete}
                />
            )}

            <JsonEditorDrawer
                isOpen={drawerState.isOpen}
                title="Edit Metadata"
                initialData={drawerState.initialData}
                onClose={() => setDrawerState(prev => ({ ...prev, isOpen: false }))}
                onSave={(newData) => {
                    gridEngineInstance.updateCell(drawerState.rowIndex, drawerState.colId, newData);
                }}
            />
        </AppShell>
    );
}

export default App;
