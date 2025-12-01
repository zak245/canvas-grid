import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';
import { GridEngine } from '../core/engine/GridEngine';
import { cellTypeRegistry } from '../core/cell-types/registry';
import type { CellTypeName, CellEditor, EditorContext } from '../core/cell-types/types';

interface CellEditorOverlayProps {
    engine: GridEngine;
    containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Calculate the screen X position for a cell, accounting for pinned columns
 */
function calculateCellX(
    col: number,
    columns: { width: number; pinned?: boolean }[],
    scrollLeft: number,
    rowHeaderWidth: number,
    containerLeft: number
): number {
    // Calculate frozen width (pinned columns)
    let frozenWidth = 0;
    for (const c of columns) {
        if (c.pinned) {
            frozenWidth += c.width;
        }
    }
    
    // Calculate x offset up to the target column
    let xOffset = 0;
    let isPinned = false;
    for (let i = 0; i < col; i++) {
        xOffset += columns[i].width;
    }
    
    // Check if target column is pinned
    if (columns[col]?.pinned) {
        isPinned = true;
    }
    
    // If pinned, don't apply scroll offset
    if (isPinned) {
        return containerLeft + rowHeaderWidth + xOffset;
    }
    
    // For scrollable columns, apply scroll offset
    return containerLeft + rowHeaderWidth + xOffset - scrollLeft;
}

/**
 * CellEditorOverlay - Renders the appropriate editor for the currently editing cell
 * 
 * Uses the cell type registry to get the correct editor for each cell type.
 * No more custom editor components - the library owns all cell editing.
 */
export const CellEditorOverlay: React.FC<CellEditorOverlayProps> = ({ engine, containerRef }) => {
    const editorRef = useRef<CellEditor | null>(null);
    const containerElRef = useRef<HTMLDivElement>(null);
    
    const editingCell = useStore(engine.store, (state) => state.editingCell);
    
    // Clean up editor on unmount or when editing stops
    useEffect(() => {
        return () => {
            if (editorRef.current) {
                editorRef.current.unmount();
                editorRef.current = null;
            }
        };
    }, []);
    
    // Handle editor lifecycle when editingCell changes
    useEffect(() => {
        // Clean up previous editor
        if (editorRef.current) {
            editorRef.current.unmount();
            editorRef.current = null;
        }
        
        if (!editingCell || !containerElRef.current || !containerRef.current) {
            return;
        }
        
        const { row, col } = editingCell;
        const columns = engine.model.getVisibleColumns();
        const column = columns[col];
        
        if (!column) return;
        
        const rows = engine.model.getAllRows();
        const gridRow = rows[row];
        if (!gridRow) return;
        
        const cell = gridRow.cells.get(column.id);
        const value = cell?.value;
        
        // Get cell definition from registry
        const cellDefinition = cellTypeRegistry.getDefinition(column.type as CellTypeName);
        
        // Calculate bounds
        const { theme } = engine;
        const { scrollLeft, scrollTop } = engine.viewport.getState();
        const rect = containerRef.current.getBoundingClientRect();
        
        const cellX = calculateCellX(col, columns, scrollLeft, theme.rowHeaderWidth, rect.left);
        const cellY = rect.top + theme.headerHeight + (row * theme.rowHeight) - scrollTop;
        
        // Create editor context
        const editorContext: EditorContext = {
            container: containerElRef.current,
            value,
            bounds: {
                x: cellX,
                y: cellY,
                width: column.width,
                height: theme.rowHeight,
            },
            options: column.typeOptions,
            theme,
            rowIndex: row,
            columnId: column.id,
            onCommit: (newValue: unknown, moveNext: boolean = false) => {
                engine.updateCell(row, column.id, newValue)
                    .then(() => {
                        engine.stopEdit();
                        if (moveNext) {
                            // Move selection down to the next row (standard spreadsheet behavior)
                            engine.moveSelection(1, 0);
                        }
                    })
                    .catch(console.error);
            },
            onCancel: () => {
                engine.stopEdit(true);
            },
        };
        
        // Create and mount the editor using the definition
        const editor = cellDefinition.createEditor(editorContext);
        editorRef.current = editor;
        editor.mount();
        
        // Focus the editor with a small delay to ensure mounting
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
            }
        }, 10);
        
    }, [editingCell, engine, containerRef]);
    
    if (!editingCell || !containerRef.current) return null;
    
    const { row, col } = editingCell;
    const columns = engine.model.getVisibleColumns();
    const column = columns[col];
    
    if (!column) return null;
    
    // Calculate position for the container
    const { theme } = engine;
    const { scrollLeft, scrollTop } = engine.viewport.getState();
    const rect = containerRef.current.getBoundingClientRect();
    
    const cellX = calculateCellX(col, columns, scrollLeft, theme.rowHeaderWidth, rect.left);
    const cellY = rect.top + theme.headerHeight + (row * theme.rowHeight) - scrollTop;
    
    // Get cell type definition to check editor mode
    const cellDefinition = cellTypeRegistry.getDefinition(column.type as CellTypeName);
    
    // For drawer editors, render a full-screen overlay
    if (cellDefinition.editorMode === 'drawer') {
        return createPortal(
            <div 
                className="fixed inset-0 z-[10000] flex items-center justify-center"
            >
                <div 
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => engine.stopEdit(true)}
                />
                <div 
                    ref={containerElRef}
                    className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
                >
                    {/* Editor will be mounted here by the cell type */}
                </div>
            </div>,
            document.body
        );
    }
    
    // For inline/overlay editors, position at the cell
    return createPortal(
        <div 
            ref={containerElRef}
            style={{ 
                position: 'fixed', 
                top: cellY, 
                left: cellX, 
                width: column.width, 
                height: theme.rowHeight,
                zIndex: 10000,
                background: '#fff',
                color: '#1f2937',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
        >
            {/* Editor will be mounted here by the cell type */}
        </div>,
        document.body
    );
};
