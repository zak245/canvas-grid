import React, { useEffect, useState } from 'react';
import { useGridEngine } from './useGridEngine';
import type { GridColumn, GridRow } from '../types/grid';
import type { GridConfig } from '../config/GridConfig';
import type { ColumnSort } from '../types/platform';
import { ColumnHeaders } from '../components/ColumnHeaders';
import { RowHeaders } from '../components/RowHeaders';

interface GridContainerProps {
    columns?: GridColumn[];
    rows?: GridRow[];
    onColumnsUpdate?: (columns: GridColumn[]) => void;
    config?: Partial<GridConfig>;  // NEW: Optional config
    onAddColumnClick?: (column?: GridColumn) => void; // Updated to allow passing new column directly
}

export const GridContainer: React.FC<GridContainerProps> = ({
    columns = [],
    rows = [],
    onColumnsUpdate,
    config,  // NEW
    onAddColumnClick
}) => {
    const { canvasRef, engine } = useGridEngine(config);  // NEW: Pass config
    const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0 });
    const [visibleRowIndices, setVisibleRowIndices] = useState<number[]>([]);
    
    // Get columns/rows from engine.model when using config, otherwise from props
    // Use getVisibleColumns() to respect hidden state
    const effectiveColumns = config ? engine.model.getVisibleColumns() : columns;
    const allColumns = config ? engine.model.getColumns() : columns; // Pass all columns for hidden list
    const effectiveRows = config ? engine.model.getAllRows() : rows;
    const [dataVersion, setDataVersion] = useState(0); // Force re-render on data change
    const [sortState, setSortState] = useState<ColumnSort[]>([]); // Local state for sort UI

    // Subscribe to data changes when using config
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

    // Sync props to engine (only if not using config mode)
    useEffect(() => {
        // Skip if engine is using config (adapter handles data loading)
        if (config) return;
        
        // Legacy mode: manually sync columns/rows
        if (columns.length > 0) {
            engine.model.setColumns(columns);

            // Trigger AI streaming for AI columns
            const aiColumns = columns.filter(col => col.type === 'ai');
            if (aiColumns.length > 0 && engine.aiStreamer) {
                // Stream all visible rows for AI columns
                const allRows = engine.model.getAllRows();
                aiColumns.forEach(aiCol => {
                    allRows.forEach((row, rowIndex) => {
                        if (aiCol.aiConfig?.prompt) {
                            // Get context from row for prompt
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
        if (rows.length > 0) {
            engine.model.setRows(rows);
        }
    }, [engine, columns, rows, config]);

    // Subscribe to viewport changes for header sync
    useEffect(() => {
        const interval = setInterval(() => {
            const viewportState = engine.viewport.getState();
            setScrollState({
                scrollLeft: viewportState.scrollLeft,
                scrollTop: viewportState.scrollTop
            });

            // Calculate visible row indices
            const visibleRange = engine.viewport.calculateVisibleRange(
                engine.model.getAllRows(),
                engine.model.getColumns()
            );
            const indices = Array.from(
                { length: visibleRange.rowEndIndex - visibleRange.rowStartIndex + 1 },
                (_, i) => visibleRange.rowStartIndex + i
            );
            setVisibleRowIndices(indices);
        }, 16); // ~60fps

        return () => clearInterval(interval);
    }, [engine, dataVersion]); // Add dataVersion dep

    // Handle wheel events for scrolling
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const { scrollTop, scrollLeft } = engine.viewport.getState();
            const deltaX = e.deltaX;
            const deltaY = e.deltaY;

            // Calculate total grid dimensions
            // Add 50px buffer for the "Add Column" ghost header
            const totalWidth = effectiveColumns.reduce((sum, col) => sum + col.width, 0) + 50;
            const totalHeight = effectiveRows.length * engine.theme.rowHeight;
            const viewportState = engine.viewport.getState();

            // Clamp scroll values
            const newScrollLeft = Math.max(0, Math.min(totalWidth - viewportState.width + engine.theme.rowHeaderWidth, scrollLeft + deltaX));
            const newScrollTop = Math.max(0, Math.min(totalHeight - viewportState.height + engine.theme.headerHeight, scrollTop + deltaY));

            engine.scroll(newScrollTop, newScrollLeft);
        };

        const canvas = canvasRef.current;
        if (canvas) {
            canvas.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('wheel', handleWheel);
            }
        };
    }, [engine, canvasRef, effectiveColumns, effectiveRows]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-white">
            {/* Top-left corner */}
            <div
                className="absolute top-0 left-0 bg-gray-50 border-r border-b border-gray-200 z-20"
                style={{
                    width: `${engine.theme.rowHeaderWidth}px`,
                    height: `${engine.theme.headerHeight}px`
                }}
            />

            {/* Column Headers */}
            <div className="absolute top-0 left-0 right-0 z-10">
                <ColumnHeaders
                    columns={effectiveColumns}
                    allColumns={allColumns}
                    scrollLeft={scrollState.scrollLeft}
                    rowHeaderWidth={engine.theme.rowHeaderWidth}
                    sortState={sortState}
                    onSort={(colId, direction) => engine.sort(colId, direction)}
                    onSelectColumn={(colId, multi, range) => engine.selectColumn(colId, multi, range)}
                    onResize={(colId, width) => engine.resizeColumn(colId, width)}
                    onAutoResize={(colId) => engine.autoResizeColumn(colId)}
                    onHide={(colId) => engine.setColumnVisibility(colId, false)}
                    onShow={(colId) => engine.setColumnVisibility(colId, true)}
                    onAddColumn={onAddColumnClick}
                />
            </div>

            {/* Row Headers */}
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
            <canvas
                ref={canvasRef}
                className="block touch-none"
            />
        </div>
    );
};
