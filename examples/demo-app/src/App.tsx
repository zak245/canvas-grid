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
            options: [
                { value: 'Electronics', label: 'Electronics', color: '#3b82f6' },
                { value: 'Furniture', label: 'Furniture', color: '#8b5cf6' },
                { value: 'Clothing', label: 'Clothing', color: '#ec4899' },
                { value: 'Books', label: 'Books', color: '#f59e0b' },
                { value: 'Software', label: 'Software', color: '#10b981' }
            ]
        } 
    },
    { 
        id: 'status', 
        title: 'Status', 
        width: 120, 
        type: 'select', 
        visible: true,
        typeOptions: {
            options: [
                { value: 'In Stock', label: 'In Stock', color: '#22c55e' },
                { value: 'Low Stock', label: 'Low Stock', color: '#eab308' },
                { value: 'Out of Stock', label: 'Out of Stock', color: '#ef4444' },
                { value: 'Discontinued', label: 'Discontinued', color: '#9ca3af' }
            ]
        }
    },
    { 
        id: 'price', 
        title: 'Price', 
        width: 100, 
        type: 'number', 
        visible: true,
        typeOptions: {
            format: 'currency'
        }
    },
    {
        id: 'progress',
        title: 'Progress',
        width: 150,
        type: 'progress',
        visible: true,
        typeOptions: {
            color: '#8b5cf6'
        }
    },
    { 
        id: 'rating', 
        title: 'Rating', 
        width: 120, 
        type: 'rating', 
        visible: true,
        typeOptions: {
            color: '#f59e0b'
        }
    },
    { 
        id: 'tags', 
        title: 'Tags', 
        width: 200, 
        type: 'tags', 
        visible: true,
        typeOptions: {
            options: [
                { label: 'New', color: '#dbeafe' },
                { label: 'Sale', color: '#fee2e2' },
                { label: 'Popular', color: '#ffedd5' },
                { label: 'Limited', color: '#f3e8ff' }
            ]
        }
    },
    {
        id: 'lastUpdated',
        title: 'Last Updated',
        width: 150,
        type: 'date',
        visible: true
    },
    {
        id: 'active',
        title: 'Active',
        width: 80,
        type: 'boolean',
        visible: true
    }
];

// 2. Define Data Generation Helper
const generateData = (count: number): GridRow[] => {
    const rows: GridRow[] = [];
    const categories = ['Electronics', 'Furniture', 'Clothing', 'Books', 'Software'];
    const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];
    const tagsList = ['New', 'Sale', 'Popular', 'Limited'];
    
    for(let i = 0; i < count; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const price = (Math.random() * 1000).toFixed(2);
        const rating = Math.floor(Math.random() * 5) + 1;
        const progress = Math.floor(Math.random() * 100);
        const tags = [
            tagsList[Math.floor(Math.random() * tagsList.length)],
            Math.random() > 0.5 ? tagsList[Math.floor(Math.random() * tagsList.length)] : null
        ].filter(Boolean);

        const cells = new Map();
        cells.set('id', { value: `PRD-${1000 + i}` });
        cells.set('name', { value: `${category} Item ${i + 1}` });
        cells.set('category', { value: category });
        cells.set('status', { value: status });
        cells.set('price', { value: parseFloat(price) });
        cells.set('rating', { value: rating });
        cells.set('progress', { value: progress });
        cells.set('tags', { value: tags });
        cells.set('lastUpdated', { value: new Date().toISOString().split('T')[0] });
        cells.set('active', { value: Math.random() > 0.2 });

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
const DemoWorkbookShell = ({ renderer }: { renderer: 'canvas' | 'react' | 'html' }) => {
    const manager = useMemo(() => {
        return new WorkbookManager([
            { 
                id: 'sheet-1', 
                name: 'Q1 Sales', 
                config: {
                    ...baseConfig,
                    renderer, // Pass renderer
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
                    renderer, // Pass renderer
                    dataSource: {
                        mode: 'local',
                        initialData: { columns, rows: generateData(20) }
                    }
                } 
            }
        ]);
    }, [renderer]);

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
    const [renderer, setRenderer] = useState<'canvas' | 'react' | 'html'>('canvas');

    return (
        <div className="w-screen h-screen bg-white flex flex-col">
            <header className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-gray-50 shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-gray-800">Grid Engine Demo</h1>
                    {mode === 'workbook' && (
                        <div className="flex bg-gray-200 rounded-lg p-1 gap-1">
                            <button 
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${renderer === 'canvas' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                onClick={() => setRenderer('canvas')}
                            >
                                Canvas
                            </button>
                            <button 
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${renderer === 'react' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                onClick={() => setRenderer('react')}
                            >
                                React
                            </button>
                            <button 
                                className={`px-3 py-1 text-sm rounded-md transition-colors ${renderer === 'html' ? 'bg-white shadow-sm text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                onClick={() => setRenderer('html')}
                            >
                                HTML
                            </button>
                        </div>
                    )}
                </div>
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
                    Single sheets
                    </button>
                </div>
            </header>
            <main className="flex-1 relative overflow-hidden">
                {mode === 'workbook' ? <DemoWorkbookShell renderer={renderer} /> : <TripleDemo />}
            </main>
        </div>
    );
}
