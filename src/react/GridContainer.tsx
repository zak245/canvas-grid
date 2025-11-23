import React, { useEffect, useState } from 'react';
import { useGridEngine } from './useGridEngine';
import { GridColumn, GridRow } from '../types/grid';
import { ColumnHeaders } from '../components/ColumnHeaders';
import { RowHeaders } from '../components/RowHeaders';

interface GridContainerProps {
    columns?: GridColumn[];
    rows?: GridRow[];
    onColumnsUpdate?: (columns: GridColumn[]) => void;
}

export const GridContainer: React.FC<GridContainerProps> = ({
    columns = [],
    rows = [],
    onColumnsUpdate
}) => {
    const { canvasRef, engine } = useGridEngine();
    const [scrollState, setScrollState] = useState({ scrollLeft: 0, scrollTop: 0 });
    const [visibleRowIndices, setVisibleRowIndices] = useState<number[]>([]);

    // Sync props to engine
    useEffect(() => {
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
    }, [engine, columns, rows]);

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
    }, [engine]);

    // Handle wheel events for scrolling
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            const { scrollTop, scrollLeft } = engine.viewport.getState();
            const deltaX = e.deltaX;
            const deltaY = e.deltaY;

            // Calculate total grid dimensions
            const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
            const totalHeight = rows.length * engine.theme.rowHeight;
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
    }, [engine, canvasRef, columns, rows]);

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
                    columns={columns}
                    scrollLeft={scrollState.scrollLeft}
                    rowHeaderWidth={engine.theme.rowHeaderWidth}
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
