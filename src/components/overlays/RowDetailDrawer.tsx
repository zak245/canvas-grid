import React, { useEffect, useRef, useState } from 'react';
import { GridEngine } from '../../core/engine/GridEngine';
import { X } from 'lucide-react';
import { cellTypeRegistry } from '../../core/cell-types/registry';
import type { EditorContext, CellTypeName } from '../../core/cell-types/types';
import type { GridRow, GridColumn } from '../../core/types/grid';

interface RowDetailDrawerProps {
    engine: GridEngine;
    rowIndex: number;
    onClose: () => void;
}

interface DrawerFieldProps {
    engine: GridEngine;
    row: GridRow;
    column: GridColumn;
    rowIndex: number;
}

const DrawerField: React.FC<DrawerFieldProps> = ({ engine, row, column, rowIndex }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const editorRef = useRef<any>(null);

    const cell = row.cells.get(column.id);
    const value = cell?.value;
    const cellType = cellTypeRegistry.get(column.type as CellTypeName);

    useEffect(() => {
        if (!isEditing || !containerRef.current) return;

        // Create Editor Context
        const rect = containerRef.current.getBoundingClientRect();
        const context: EditorContext = {
            container: containerRef.current,
            value,
            bounds: {
                x: 0,
                y: 0,
                width: rect.width,
                height: rect.height,
            },
            options: column.typeOptions,
            theme: engine.theme,
            rowIndex,
            columnId: column.id,
            onCommit: (newValue, moveNext) => {
                engine.updateCell(rowIndex, column.id, newValue);
                setIsEditing(false);
            },
            onCancel: () => {
                setIsEditing(false);
            },
            // onChange is optional for immediate feedback, but we rely on commit
        };

        const editor = cellType.createEditor(context);
        editorRef.current = editor;
        editor.mount();
        
        // Focus editor after mount
        setTimeout(() => {
            editor.focus();
        }, 10);

        return () => {
            editor.unmount();
            editorRef.current = null;
        };
    }, [isEditing, engine, value, column, rowIndex, cellType]);

    // Format value for display when not editing (or underneath overlay editors)
    const displayValue = cellType.format(value, column.typeOptions);

    return (
        <div className="space-y-1">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{column.title}</div>
            <div 
                ref={containerRef} 
                className={`relative h-10 w-full bg-white rounded border ${isEditing ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'} transition-colors cursor-text`}
                style={{ minHeight: '40px' }}
                onClick={() => {
                    if (!isEditing) setIsEditing(true);
                }}
            >
                {/* 
                    Display Value 
                    - For 'inline' editors (Text), the editor covers this completely.
                    - For 'overlay' editors (Select, Date), the editor appears detached, so this remains visible.
                */}
                <div className="absolute inset-0 p-2 flex items-center text-sm text-gray-800 pointer-events-none">
                    {value !== undefined && value !== null && value !== '' ? (
                        <span className="truncate w-full">{displayValue}</span>
                    ) : (
                        <span className="text-gray-400 italic">Empty</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const RowDetailDrawer: React.FC<RowDetailDrawerProps> = ({ engine, rowIndex, onClose }) => {
    const row = engine.rows.getRow(rowIndex);
    const columns = engine.model.getVisibleColumns();

    if (!row) return null;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-[400px] bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col transform transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="font-semibold text-gray-700">Row {rowIndex + 1} Details</div>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
                    <X size={16} className="text-gray-500" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {columns.map((col) => (
                    <DrawerField 
                        key={col.id} 
                        engine={engine} 
                        row={row} 
                        column={col} 
                        rowIndex={rowIndex} 
                    />
                ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50">
                <button 
                    onClick={onClose}
                    className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    );
};
