import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { useGridEngine } from './useGridEngine';
import { GridEngine } from '../engine/GridEngine';
import type { GridColumn, GridRow } from '../types/grid';
import type { GridConfig } from '../config/GridConfig';
// import type { ColumnSort } from '../types/platform'; // Removed unused import
import { ColumnMenu } from '../components/ColumnMenu';
import { AddColumnMenu } from '../components/AddColumnMenu';
import { ColumnSettingsDrawer } from '../components/ColumnSettingsDrawer';
import { HeaderRenameInput } from '../components/HeaderRenameInput';
import { CellEditorOverlay } from '../components/CellEditorOverlay';

interface GridContainerProps {
    engine?: GridEngine;
    columns?: GridColumn[];
    rows?: GridRow[];
    onColumnsUpdate?: (columns: GridColumn[]) => void;
    config?: Partial<GridConfig>;
    onAddColumnClick?: (column?: GridColumn) => void;
}

export const GridContainer: React.FC<GridContainerProps> = ({
    engine: externalEngine,
    columns = [],
    rows = [],
    config,
    onAddColumnClick
}) => {
    const { canvasRef, engine } = useGridEngine(externalEngine || config);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0 });
    
    // Subscribe to store for UI state (Single Source of Truth)
    const activeHeaderMenu = useStore(engine.store, (state) => state.activeHeaderMenu);
    const activeAddColumnMenu = useStore(engine.store, (state) => state.activeAddColumnMenu);
    const editingHeader = useStore(engine.store, (state) => state.editingHeader);
    const activeColumnSettings = useStore(engine.store, (state) => state.activeColumnSettings);
    const editingCell = useStore(engine.store, (state) => state.editingCell);
    
    const effectiveColumns = config ? engine.model.getVisibleColumns() : columns;
    const allColumns = config ? engine.model.getColumns() : columns;
    const effectiveRows = config ? engine.model.getAllRows() : rows;
    const [dataVersion, setDataVersion] = useState(0);

    // Subscribe to data/sort changes
    useEffect(() => {
        if (!config) return;

        const unsubscribeData = engine.subscribeToDataChange(() => {
            setDataVersion(v => v + 1);
        });
        
        const unsubscribeSort = engine.subscribeToSortChange(() => {
            // No-op, just trigger re-render via dataVersion if needed
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
        }, 16);
        return () => clearInterval(interval);
    }, [engine, dataVersion]);

    // Scroll handler
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            // Freeze scroll if menu is open
            // For editingCell, check if the editor allows scroll
            let shouldFreeze = !!(activeHeaderMenu || activeAddColumnMenu || editingHeader || activeColumnSettings);
            
            if (!shouldFreeze && editingCell) {
                const columns = engine.model.getVisibleColumns();
                const column = columns[editingCell.col];
                if (column) {
                    // Default to true (lock) unless explicitly false
                    if (column.editor?.lockScroll !== false) {
                        shouldFreeze = true;
                    }
                } else {
                    shouldFreeze = true;
                }
            }

            if (shouldFreeze) {
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
    }, [engine, canvasRef, effectiveColumns, effectiveRows, activeHeaderMenu, activeAddColumnMenu, editingHeader, activeColumnSettings, editingCell]); // Added dependencies

    // Menu Handlers
    const handleMenuAction = (action: string, columnId: string) => {
        if (action === 'sortAsc') engine.sort(columnId, 'asc');
        if (action === 'sortDesc') engine.sort(columnId, 'desc');
        if (action === 'hide') engine.setColumnVisibility(columnId, false);
        if (action === 'rename') engine.store.setState({ editingHeader: columnId });
        if (action === 'settings') engine.store.setState({ activeColumnSettings: columnId });
        if (action === 'pin') engine.updateColumn(columnId, { pinned: true });
        if (action === 'unpin') engine.updateColumn(columnId, { pinned: false });
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
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
            {/* Canvas Grid */}
            <canvas ref={canvasRef} className="block touch-none" />

            {/* Portals for Menus (Driven by Store) */}
            {activeHeaderMenu && (
                <ColumnMenu
                    isOpen={true}
                    x={activeHeaderMenu.x}
                    y={activeHeaderMenu.y}
                    columnId={activeHeaderMenu.colId}
                    isPinned={engine.model.getColumnById(activeHeaderMenu.colId)?.pinned}
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
                    onAddColumnClick={onAddColumnClick}
                />
            )}

            {editingHeader && (() => {
                const visibleCols = engine.model.getVisibleColumns();
                const index = visibleCols.findIndex(c => c.id === editingHeader);
                if (index === -1 || !containerRef.current) return null;
                
                const rect = containerRef.current.getBoundingClientRect();
                let x = engine.theme.rowHeaderWidth - engine.viewport.getState().scrollLeft;
                for (let i = 0; i < index; i++) x += visibleCols[i].width;
                
                // Absolute Screen Coordinates
                const screenX = rect.left + x;
                const screenY = rect.top; // Header is at top of container
                
                const column = engine.model.getColumns().find(c => c.id === editingHeader);
                if (!column) return null;

                return (
                    <HeaderRenameInput
                        x={screenX}
                        y={screenY}
                        width={visibleCols[index].width}
                        height={engine.theme.headerHeight}
                        initialValue={column.title}
                        onSave={(newTitle) => {
                            engine.updateColumn(editingHeader, { title: newTitle });
                            engine.store.setState({ editingHeader: null });
                        }}
                        onCancel={() => engine.store.setState({ editingHeader: null })}
                    />
                );
            })()}

            {activeColumnSettings && (() => {
                const column = engine.model.getColumns().find(c => c.id === activeColumnSettings);
                if (!column) return null;

                return (
                    <ColumnSettingsDrawer
                        isOpen={true}
                        column={column}
                        onClose={() => engine.store.setState({ activeColumnSettings: null })}
                        onUpdate={(updates) => engine.updateColumn(activeColumnSettings, updates)}
                    />
                );
            })()}

            <CellEditorOverlay engine={engine} containerRef={containerRef} />
        </div>
    );
};
