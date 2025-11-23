import React, { useState } from 'react';
import { GridContainer } from './react/GridContainer';
import { AppShell } from './components/layout/AppShell';
import { AddColumnModal } from './components/AddColumnModal';
import { generateMockData } from './utils/mockData';
import { GridColumn } from './types/grid';

// Generate initial data - 500K rows for performance testing
const { columns: initialCols, rows: initialRows } = generateMockData(500000, false);

function App() {
    const [isAddColumnOpen, setIsAddColumnOpen] = useState(false);
    const [columns, setColumns] = useState<GridColumn[]>(initialCols);

    const handleAddColumn = (newColumn: GridColumn) => {
        setColumns([...columns, newColumn]);
    };

    return (
        <AppShell onAddColumn={() => setIsAddColumnOpen(true)}>
            <GridContainer
                columns={columns}
                rows={initialRows}
                onColumnsUpdate={setColumns}
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
