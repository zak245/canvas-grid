import React from 'react';
import { createPortal } from 'react-dom';
import { GridEngine } from '../engine/GridEngine';
import { TextEditor } from './editors/TextEditor';

interface CellEditorOverlayProps {
    engine: GridEngine;
    containerRef: React.RefObject<HTMLDivElement>;
}

export const CellEditorOverlay: React.FC<CellEditorOverlayProps> = ({ engine, containerRef }) => {
    const editingCell = engine.store.getState().editingCell;
    
    if (!editingCell || !containerRef.current) return null;

    const { row, col } = editingCell;
    const columns = engine.model.getVisibleColumns();
    const column = columns[col];
    
    // Safety check
    if (!column) return null;

    const rows = engine.model.getAllRows();
    const gridRow = rows[row];
    if (!gridRow) return null;
    
    const cell = gridRow.cells.get(column.id);
    const value = cell?.value;

    // Calculate Geometry
    const { theme } = engine;
    const { scrollLeft, scrollTop } = engine.viewport.getState();
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate X
    let xOffset = 0;
    for (let i = 0; i < col; i++) {
        xOffset += columns[i].width;
    }
    // Cell X relative to container
    const relativeX = theme.rowHeaderWidth + xOffset - scrollLeft;
    const cellX = rect.left + relativeX;
    
    // Calculate Y
    const relativeY = theme.headerHeight + (row * theme.rowHeight) - scrollTop;
    const cellY = rect.top + relativeY;
    
    // Determine Editor Component
    let EditorComponent: any = TextEditor;
    
    if (column.editor?.component) {
        EditorComponent = column.editor.component;
    } else if (column.editor?.mode === 'custom') {
        // Fallback if mode is custom but no component?
        EditorComponent = TextEditor;
    }
    
    // Map basic types to editors if not explicit
    // if (!column.editor && column.type === 'number') EditorComponent = NumberEditor;

    return createPortal(
        <div 
            style={{ 
                position: 'fixed', 
                top: cellY, 
                left: cellX, 
                width: column.width, 
                height: theme.rowHeight,
                zIndex: 10000
            }}
        >
            <EditorComponent
                key={`${row}-${col}`}
                value={value}
                width={column.width}
                height={theme.rowHeight}
                column={column}
                onCommit={(newValue: any, shouldMove?: boolean) => {
                    engine.updateCell(row, column.id, newValue)
                        .then(() => {
                            engine.stopEdit();
                            if (shouldMove) {
                                engine.moveSelection(1, 0);
                            }
                        })
                        .catch(console.error);
                }}
                onCancel={() => engine.stopEdit(true)}
            />
        </div>,
        document.body
    );
};

