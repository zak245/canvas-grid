import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { useGridEngine } from '../hooks/useGridEngine';
import { GridEngine } from '../../core/engine/GridEngine';
import type { GridColumn } from '../../core/types/grid';
import { ColumnMenu } from '../../components/ColumnMenu';
import { AddColumnMenu } from '../../components/AddColumnMenu';
import { ColumnSettingsDrawer } from '../../components/ColumnSettingsDrawer';
import { HeaderRenameInput } from '../../components/HeaderRenameInput';
import { CellEditorOverlay } from '../../components/CellEditorOverlay';
import { RowDetailDrawer } from '../../components/overlays/RowDetailDrawer';
import { EnrichmentModal } from '../../components/overlays/EnrichmentModal';
import { GridReact } from './GridReact';

export interface GridContainerProps {
    engine: GridEngine;
    onAddColumnClick?: (column?: GridColumn) => void;
    className?: string;
}

export const GridContainer: React.FC<GridContainerProps> = ({
    engine,
    onAddColumnClick,
    className
}) => {
    const containerRef = useGridEngine(engine);
    const [reactContainer, setReactContainer] = useState<HTMLElement | null>(null);
    
    // Subscribe to store for UI state (Single Source of Truth)
    const activeHeaderMenu = useStore(engine.store, (state) => state.activeHeaderMenu);
    const activeAddColumnMenu = useStore(engine.store, (state) => state.activeAddColumnMenu);
    const editingHeader = useStore(engine.store, (state) => state.editingHeader);
    const activeColumnSettings = useStore(engine.store, (state) => state.activeColumnSettings);
    const activeRowDetail = useStore(engine.store, (state) => state.activeRowDetail);
    const activeEnrichment = useStore(engine.store, (state) => state.activeEnrichment);
    
    // Get data from engine
    const [, setDataVersion] = useState(0);

    // Subscribe to data/sort changes
    useEffect(() => {
        const unsubscribeData = engine.subscribeToDataChange(() => {
            setDataVersion(v => v + 1);
        });
        
        const unsubscribeSort = engine.subscribeToSortChange(() => {
            setDataVersion(v => v + 1);
        });

        // React Renderer Integration
        const subAttach = engine.on('renderer:attached', (payload) => {
            if (payload.type === 'react') {
                setReactContainer(payload.container);
            }
        });

        const subDetach = engine.on('renderer:detached', () => {
            setReactContainer(null);
        });

        // Check initial state (in case we missed event)
        const renderer = engine.getRenderer();
        if (renderer && renderer.getElement() && engine.getConfig()?.renderer === 'react') {
             const el = renderer.getElement();
             if (el && el.classList.contains('ds-grid-react-root')) {
                 setReactContainer(el);
             }
        }

        return () => {
            unsubscribeData();
            unsubscribeSort();
            subAttach();
            subDetach();
        };
    }, [engine]);

    // Scroll handler - Removed explicit wheel handler here as InputController handles it now globally on the container
    // We might need to ensure the container is focusable or input controller attaches to it.
    // InputController attaches to the element returned by renderer. 
    // If renderer is Canvas, it attaches to canvas inside this container.
    // If renderer is HTML, it attaches to div inside this container.
    
    const handleMenuAction = (action: string, columnId: string) => {
        if (action === 'sortAsc') engine.sort(columnId, 'asc');
        if (action === 'sortDesc') engine.sort(columnId, 'desc');
        if (action === 'hide') engine.setColumnVisibility(columnId, false);
        if (action === 'rename') engine.store.setState({ editingHeader: columnId });
        if (action === 'settings') engine.store.setState({ activeColumnSettings: columnId });
        if (action === 'pin') engine.updateColumn(columnId, { pinned: true });
        if (action === 'unpin') engine.updateColumn(columnId, { pinned: false });
        
        // Grouping
        if (action === 'group') engine.groupByColumn(columnId);
        if (action === 'ungroup') engine.groupByColumn(null);

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

    const allColumns = engine.model.getColumns();

    return (
        <div className={`w-full h-full relative overflow-hidden bg-white ${className || ''}`}>
            {/* Container for Renderer (Canvas/HTML/React) */}
            <div ref={containerRef} className="w-full h-full" />
            
            {/* React Renderer Portal */}
            {reactContainer && createPortal(
                <GridReact engine={engine} />,
                reactContainer
            )}

            {/* Portals for Menus (Driven by Store) */}
            {activeHeaderMenu && (
                <ColumnMenu
                    isOpen={true}
                    x={activeHeaderMenu.x}
                    y={activeHeaderMenu.y}
                    columnId={activeHeaderMenu.colId}
                    isPinned={engine.model.getColumnById(activeHeaderMenu.colId)?.pinned}
                    isGrouped={engine.rows.getGrouping().columnId === activeHeaderMenu.colId}
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
                
                const screenX = rect.left + x;
                const screenY = rect.top;
                
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

            {activeRowDetail !== null && (
                <RowDetailDrawer
                    engine={engine}
                    rowIndex={activeRowDetail}
                    onClose={() => engine.closeRowDetail()}
                />
            )}

            {activeEnrichment !== null && (
                <EnrichmentModal
                    rowIndex={activeEnrichment}
                    onClose={() => engine.closeEnrichment()}
                />
            )}
        </div>
    );
};
