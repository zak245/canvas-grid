import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useGridEngine } from './useGridEngine';
import type { GridColumn, GridRow } from '../types/grid';
import type { GridConfig } from '../config/GridConfig';
import type { ColumnSort } from '../types/platform';
import { RowHeaders } from '../components/RowHeaders';
import { ColumnMenu } from '../components/ColumnMenu';
import { AddColumnMenu } from '../components/AddColumnMenu';

interface GridContainerProps {
    columns?: GridColumn[];
    rows?: GridRow[];
    onColumnsUpdate?: (columns: GridColumn[]) => void;
    config?: Partial<GridConfig>;
    onAddColumnClick?: (column?: GridColumn) => void;
}

export const GridContainer: React.FC<GridContainerProps> = ({
    columns = [],
    rows = [],
    onColumnsUpdate,
    config,
    onAddColumnClick
}) => {
    const { canvasRef, engine } = useGridEngine(config);
    const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0 });
    const [visibleRowIndices, setVisibleRowIndices] = useState<number[]>([]);
    
    // Subscribe to store for UI state (Single Source of Truth)
    const activeHeaderMenu = useStore(engine.store, (state) => state.activeHeaderMenu);
    const activeAddColumnMenu = useStore(engine.store, (state) => state.activeAddColumnMenu);
    
    const effectiveColumns = config ? engine.model.getVisibleColumns() : columns;
    const allColumns = config ? engine.model.getColumns() : columns;
    const effectiveRows = config ? engine.model.getAllRows() : rows;
    const [dataVersion, setDataVersion] = useState(0);
    const [sortState, setSortState] = useState<ColumnSort[]>([]);

    // Subscribe to data/sort changes
    useEffect(() => {
        if (!config) return;

        const unsubscribeData = engine.subscribeToDataChange(() => {
            setDataVersion(v => v + 1);
        });
        
        const unsubscribeSort = engine.subscribeToSortChange((sort) => {
            setSortState(sort);
        });

        return () => {
            unsubscribeData();
            unsubscribeSort();
        };
    }, [engine, config]);

    // Sync props to engine (legacy mode)
    useEffect(() => {
        if (config) return;
        if (columns.length > 0) {
            engine.model.setColumns(columns);
             const aiColumns = columns.filter(col => col.type === 'ai');
            if (aiColumns.length > 0 && engine.aiStreamer) {
                const allRows = engine.model.getAllRows();
                aiColumns.forEach(aiCol => {
                    allRows.forEach((row, rowIndex) => {
                        if (aiCol.aiConfig?.prompt) {
                            const context = Array.from(row.cells.values())
                                .map(cell => cell.value)
                                .filter(Boolean)
                                .join(' ');
                            const fullPrompt = `${aiCol.aiConfig.prompt}. Context: ${context}`;
                            if (engine.aiStreamer) {
                                engine.aiStreamer.streamCell(rowIndex, aiCol.id, fullPrompt);
                            }
                        }
                    });
                });
            }
        }
        if (rows.length > 0) engine.model.setRows(rows);
    }, [engine, columns, rows, config]);

    // Viewport sync
    useEffect(() => {
        const interval = setInterval(() => {
            const viewportState = engine.viewport.getState();
            setScrollState({
                scrollLeft: viewportState.scrollLeft,
                scrollTop: viewportState.scrollTop
            });

            const visibleRange = engine.viewport.calculateVisibleRange(
                engine.model.getAllRows(),
                engine.model.getVisibleColumns()
            );
            const indices = Array.from(
                { length: visibleRange.rowEndIndex - visibleRange.rowStartIndex + 1 },
                (_, i) => visibleRange.rowStartIndex + i
            );
            setVisibleRowIndices(indices);
        }, 16);
        return () => clearInterval(interval);
    }, [engine, dataVersion]);

    // Scroll handler
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            // Freeze scroll if menu is open
            if (activeHeaderMenu || activeAddColumnMenu) {
                return;
            }

            const { scrollTop, scrollLeft } = engine.viewport.getState();
            const totalWidth = effectiveColumns.reduce((sum, col) => sum + col.width, 0) + 50;
            // Add extra row height for "Add Row" ghost row
            const totalHeight = (effectiveRows.length + 1) * engine.theme.rowHeight;
            const viewportState = engine.viewport.getState();
            const newScrollLeft = Math.max(0, Math.min(totalWidth - viewportState.width + engine.theme.rowHeaderWidth, scrollLeft + e.deltaX));
            const newScrollTop = Math.max(0, Math.min(totalHeight - viewportState.height + engine.theme.headerHeight, scrollTop + e.deltaY));
            engine.scroll(newScrollTop, newScrollLeft);
        };
        const canvas = canvasRef.current;
        if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas?.removeEventListener('wheel', handleWheel);
    }, [engine, canvasRef, effectiveColumns, effectiveRows, activeHeaderMenu, activeAddColumnMenu]); // Added dependencies

    // Menu Handlers
    const handleMenuAction = (action: string, columnId: string) => {
        if (action === 'sortAsc') engine.sort(columnId, 'asc');
        if (action === 'sortDesc') engine.sort(columnId, 'desc');
        if (action === 'hide') engine.setColumnVisibility(columnId, false);
        // Close via store
        engine.store.setState({ activeHeaderMenu: null });
    };

    const handleCloseMenu = () => {
        engine.store.setState({ activeHeaderMenu: null });
    };

    const handleCloseAddMenu = () => {
         engine.store.setState({ activeAddColumnMenu: null });
    };

    const handleCreateColumn = (column: GridColumn) => {
        engine.addColumn(column);
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-white">
            {/* Top-left corner */}
            <div
                className="absolute top-0 left-0 bg-gray-50 border-r border-b border-gray-200 z-20"
                style={{ width: `${engine.theme.rowHeaderWidth}px`, height: `${engine.theme.headerHeight}px` }}
            />

            {/* Row Headers - STILL REACT FOR NOW, BUT CLEANER */}
            <div className="absolute top-0 left-0 bottom-0 z-10">
                <RowHeaders
                    visibleRowIndices={visibleRowIndices}
                    scrollTop={scrollState.scrollTop}
                    rowHeight={engine.theme.rowHeight}
                    headerHeight={engine.theme.headerHeight}
                    rowHeaderWidth={engine.theme.rowHeaderWidth}
                />
            </div>

            {/* Canvas Grid */}
            <canvas ref={canvasRef} className="block touch-none" />

            {/* Portals for Menus (Driven by Store) */}
            {activeHeaderMenu && (
                <ColumnMenu
                    isOpen={true}
                    x={activeHeaderMenu.x}
                    y={activeHeaderMenu.y}
                    columnId={activeHeaderMenu.colId}
                    onClose={handleCloseMenu}
                    onAction={handleMenuAction}
                />
            )}

            {activeAddColumnMenu && (
                <AddColumnMenu
                    isOpen={true}
                    x={activeAddColumnMenu.x}
                    y={activeAddColumnMenu.y}
                    allColumns={allColumns}
                    onClose={handleCloseAddMenu}
                    onToggleVisibility={(id, visible) => engine.setColumnVisibility(id, visible)}
                    onCreateNew={handleCreateColumn}
                />
            )}
        </div>
    );
};
