import { useState, useMemo } from 'react';
import { GridRow, GridColumn } from '@grid-engine/core';
import { WorkbookShell, useWorkbook } from '@grid-engine/react';
import { WorkbookManager } from '@grid-engine/core';
import { ContextMenu } from './ContextMenu';
import { TripleDemo } from './TripleDemo';

// 1. Define Columns
const columns: GridColumn[] = [
    { 
        id: 'id', 
        title: 'ID', 
        width: 80, 
        type: 'text', 
        visible: true, 
        pinned: true 
    },
    { 
        id: 'name', 
        title: 'Product Name', 
        width: 220, 
        type: 'text', 
        visible: true 
    },
    { 
        id: 'category', 
        title: 'Category', 
        width: 140, 
        type: 'select', 
        visible: true,
        typeOptions: {
            options: ['Electronics', 'Furniture', 'Clothing', 'Books', 'Software']
        } 
    },
    { 
        id: 'status', 
        title: 'Status', 
        width: 120, 
        type: 'select', 
        visible: true,
        typeOptions: {
            options: ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'],
            colors: {
                'In Stock': '#dcfce7', // Green 100
                'Low Stock': '#fef9c3', // Yellow 100
                'Out of Stock': '#fee2e2', // Red 100
                'Discontinued': '#f3f4f6' // Gray 100
            }
        }
    },
    { 
        id: 'price', 
        title: 'Price', 
        width: 100, 
        type: 'currency', 
        visible: true,
        format: {
            prefix: '$',
            decimals: 2
        }
    },
    { 
        id: 'rating', 
        title: 'Rating', 
        width: 120, 
        type: 'rating', 
        visible: true 
    },
    { 
        id: 'tags', 
        title: 'Tags', 
        width: 200, 
        type: 'tags', 
        visible: true 
    },
    {
        id: 'lastUpdated',
        title: 'Last Updated',
        width: 150,
        type: 'date',
        visible: true
    },
    {
        id: 'image',
        title: 'Image',
        width: 100,
        type: 'image',
        visible: true
    }
];

// 2. Define Data Generation Helper
const generateData = (count: number): GridRow[] => {
    const rows: GridRow[] = [];
    const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Software'];
    const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];
    
    for(let i = 0; i < count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const price = (Math.random() * 1000).toFixed(2);
        const rating = Math.floor(Math.random() * 5) + 1;

        const cells = new Map();
        cells.set('id', { value: `PRD-${1000 + i}` });
        cells.set('name', { value: `${category} Item ${i + 1}` });
        cells.set('category', { value: category });
        cells.set('status', { value: status });
        cells.set('price', { value: parseFloat(price) });
        cells.set('rating', { value: rating });
        cells.set('tags', { value: ['New', 'Sale'] });
        cells.set('lastUpdated', { value: new Date().toISOString().split('T')[0] });

        rows.push({
            id: `row-${i}`,
            cells
        });
    }
    return rows;
};

// 3. Define Config Template
const baseConfig = {
    ui: {
        theme: {
            headerHeight: 40,
            rowHeight: 40,
            rowHeaderWidth: 60
        }
    },
    features: {
        rows: {
            actions: [
                { id: 'detail', label: 'Detail', icon: 'maximize' },
                { id: 'delete', label: 'Delete', icon: 'trash' }
            ]
        }
    }
};

// 4. Custom Workbook Shell for Demo (Wraps the Core Shell)
const DemoWorkbookShell = () => {
    const manager = useMemo(() => {
        return new WorkbookManager([
            { 
                id: 'sheet-1', 
                name: 'Q1 Sales', 
                config: {
                    ...baseConfig,
                    dataSource: {
                        mode: 'local',
                        initialData: { columns, rows: generateData(50) }
                    }
                } 
            },
            { 
                id: 'sheet-2', 
                name: 'Q2 Projections', 
                config: {
                    ...baseConfig,
                    dataSource: {
                        mode: 'local',
                        initialData: { columns, rows: generateData(20) }
                    }
                } 
            }
        ]);
    }, []);

    const { activeSheetId } = useWorkbook(manager);
    const activeEngine = manager.getActiveEngine();

    return (
        <div className="flex flex-col h-full relative">
            <div className="flex-1 relative overflow-hidden">
                 <WorkbookShell manager={manager} />
                 {activeEngine && <ContextMenu engine={activeEngine} />}
            </div>
        </div>
    );
};

export default function App() {
    const [mode, setMode] = useState<'workbook' | 'triple'>('workbook');

    return (
        <div className="w-screen h-screen bg-white flex flex-col">
            <header className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-gray-50 shrink-0 z-30">
                <h1 className="font-bold text-gray-800">Grid Engine Demo</h1>
                <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
                    <button 
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'workbook' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setMode('workbook')}
                    >
                        Workbook
                    </button>
                    <button 
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${mode === 'triple' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                        onClick={() => setMode('triple')}
                    >
                        Triple Engine
                    </button>
                </div>
            </header>
            <main className="flex-1 relative overflow-hidden">
                {mode === 'workbook' ? <DemoWorkbookShell /> : <TripleDemo />}
            </main>
        </div>
    );
}
