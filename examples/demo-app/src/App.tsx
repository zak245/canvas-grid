import { GridContainer } from '@grid-engine/react';
import { createGridEngine } from '@grid-engine/core';
import type { GridColumn, GridRow } from '@grid-engine/core';
import { ContextMenu } from './ContextMenu';

// 1. Comprehensive Columns Definition
const columns: GridColumn[] = [
    // Basic Types
    { id: 'col-text', title: 'Name', width: 180, type: 'text', visible: true },
    { id: 'col-number', title: 'Age', width: 100, type: 'number', visible: true, typeOptions: { min: 0, max: 120 } },
    { id: 'col-currency', title: 'Salary', width: 140, type: 'currency', visible: true, typeOptions: { currency: 'USD' } },
    { id: 'col-date', title: 'Join Date', width: 150, type: 'date', visible: true, typeOptions: { format: 'date' } },
    
    // Selection & Boolean
    { id: 'col-boolean', title: 'Active', width: 100, type: 'boolean', visible: true },
    { 
        id: 'col-select', 
        title: 'Department', 
        width: 160, 
        type: 'select', 
        visible: true, 
        typeOptions: { 
            options: [
                { value: 'eng', label: 'Engineering', color: '#dbeafe' },
                { value: 'mkt', label: 'Marketing', color: '#fce7f3' },
                { value: 'sales', label: 'Sales', color: '#dcfce7' },
                { value: 'hr', label: 'HR', color: '#f3f4f6' }
            ] 
        } 
    },
    
    // Contact Info
    { id: 'col-email', title: 'Email', width: 220, type: 'email', visible: true },
    { id: 'col-phone', title: 'Phone', width: 160, type: 'phone', visible: true },
    { id: 'col-url', title: 'Website', width: 200, type: 'url', visible: true },
    
    // Visual & Interactive
    { id: 'col-progress', title: 'Performance', width: 150, type: 'progress', visible: true },
    { id: 'col-rating', title: 'Rating', width: 140, type: 'rating', visible: true, typeOptions: { max: 5, icon: 'star' } },
    { 
        id: 'col-tags', 
        title: 'Skills', 
        width: 200, 
        type: 'tags', 
        visible: true,
        typeOptions: {
            options: [
                { label: 'React', color: '#61dafb' },
                { label: 'TypeScript', color: '#3178c6' },
                { label: 'Node.js', color: '#339933' },
                { label: 'Python', color: '#3776ab' },
                { label: 'Design', color: '#ea4c89' }
            ]
        }
    },
    
    // Advanced
    { id: 'col-json', title: 'Metadata', width: 200, type: 'json', visible: true },
    { id: 'col-action', title: 'Actions', width: 100, type: 'action', visible: true, typeOptions: { buttons: [{ id: 'edit', icon: 'edit' }, { id: 'delete', icon: 'trash' }] } }
];

// 2. Rich Sample Data
const rows: GridRow[] = [
    {
        id: 'row-1',
        cells: new Map([
            ['col-text', { value: 'Alice Johnson' }],
            ['col-number', { value: 28 }],
            ['col-currency', { value: 95000 }],
            ['col-date', { value: '2023-01-15' }],
            ['col-boolean', { value: true }],
            ['col-select', { value: 'eng' }],
            ['col-email', { value: 'alice@tech.co' }],
            ['col-phone', { value: '555-0101' }],
            ['col-url', { value: 'https://alice.dev' }],
            ['col-progress', { value: 0.85 }],
            ['col-rating', { value: 5 }],
            ['col-tags', { value: ['React', 'TypeScript'] }],
            ['col-json', { value: JSON.stringify({ role: 'Senior Dev', remote: true }) }],
        ])
    },
    {
        id: 'row-2',
        cells: new Map([
            ['col-text', { value: 'Bob Smith' }],
            ['col-number', { value: 34 }],
            ['col-currency', { value: 82000 }],
            ['col-date', { value: '2022-11-01' }],
            ['col-boolean', { value: true }],
            ['col-select', { value: 'sales' }],
            ['col-email', { value: 'bob.smith@sales.net' }],
            ['col-phone', { value: '555-0102' }],
            ['col-url', { value: 'https://sales.net/bob' }],
            ['col-progress', { value: 0.62 }],
            ['col-rating', { value: 3.5 }],
            ['col-tags', { value: ['Negotiation', 'CRM'] }],
            ['col-json', { value: JSON.stringify({ territory: 'West Coast' }) }],
        ])
    },
    {
        id: 'row-3',
        cells: new Map([
            ['col-text', { value: 'Charlie Brown' }],
            ['col-number', { value: 45 }],
            ['col-currency', { value: 120000 }],
            ['col-date', { value: '2021-06-20' }],
            ['col-boolean', { value: false }],
            ['col-select', { value: 'mkt' }],
            ['col-email', { value: 'charlie@creative.io' }],
            ['col-phone', { value: '555-0103' }],
            ['col-url', { value: 'https://creative.io' }],
            ['col-progress', { value: 0.45 }],
            ['col-rating', { value: 4 }],
            ['col-tags', { value: ['Design', 'Marketing'] }],
            ['col-json', { value: JSON.stringify({ campaigns: 12 }) }],
        ])
    },
    {
        id: 'row-4',
        cells: new Map([
            ['col-text', { value: 'Diana Prince' }],
            ['col-number', { value: 31 }],
            ['col-currency', { value: 105000 }],
            ['col-date', { value: '2023-03-10' }],
            ['col-boolean', { value: true }],
            ['col-select', { value: 'hr' }],
            ['col-email', { value: 'diana@hr.org' }],
            ['col-phone', { value: '555-0104' }],
            ['col-url', { value: 'https://hr.org/team' }],
            ['col-progress', { value: 0.92 }],
            ['col-rating', { value: 4.5 }],
            ['col-tags', { value: ['Recruiting', 'Culture'] }],
            ['col-json', { value: JSON.stringify({ certifications: ['PHR', 'SHRM'] }) }],
        ])
    },
    {
        id: 'row-5',
        cells: new Map([
            ['col-text', { value: 'Evan Wright' }],
            ['col-number', { value: 24 }],
            ['col-currency', { value: 72000 }],
            ['col-date', { value: '2024-01-05' }],
            ['col-boolean', { value: true }],
            ['col-select', { value: 'eng' }],
            ['col-email', { value: 'evan@tech.co' }],
            ['col-phone', { value: '555-0105' }],
            ['col-url', { value: 'https://github.com/evan' }],
            ['col-progress', { value: 0.30 }],
            ['col-rating', { value: 2 }],
            ['col-tags', { value: ['Python', 'React'] }],
            ['col-json', { value: JSON.stringify({ intern: true, mentor: 'Alice' }) }],
        ])
    }
];

// 3. Create Engine
const simpleEngine = createGridEngine({
    dataSource: {
        mode: 'local',
        initialData: { columns, rows }
    },
    ui: {
        theme: {
            headerHeight: 40,
            rowHeight: 40,
            rowHeaderWidth: 60
        }
    } as any,
    features: {
        rows: {
            actions: [
                { id: 'detail', label: 'Detail', icon: 'maximize' },
                { id: 'delete', label: 'Delete', icon: 'trash' }
            ]
        }
    }
});

// 4. App Component
function App() {
    return (
        <div className="w-screen h-screen bg-white flex flex-col">
            <header className="h-16 border-b border-gray-200 px-6 flex items-center justify-between bg-gray-50 shrink-0">
                <h1 className="font-bold text-gray-800">Grid Engine Demo</h1>
            </header>
            <main className="flex-1 relative overflow-hidden">
                <GridContainer engine={simpleEngine} />
                <ContextMenu engine={simpleEngine} />
            </main>
        </div>
    );
}

export default App;
