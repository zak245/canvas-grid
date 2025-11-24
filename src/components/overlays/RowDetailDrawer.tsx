import React from 'react';
import { GridEngine } from '../../engine/GridEngine';
import { X } from 'lucide-react';

interface RowDetailDrawerProps {
    engine: GridEngine;
    rowIndex: number;
    onClose: () => void;
}

export const RowDetailDrawer: React.FC<RowDetailDrawerProps> = ({ engine, rowIndex, onClose }) => {
    const row = engine.model.getRow(rowIndex);
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
                {columns.map(col => {
                    const cell = row.cells.get(col.id);
                    const value = cell?.value;
                    const displayValue = cell?.displayValue || String(value ?? '');
                    
                    return (
                        <div key={col.id} className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{col.title}</div>
                            <div className="p-2 bg-gray-50 rounded border border-gray-200 text-sm text-gray-800 min-h-[36px] flex items-center">
                                {value !== undefined && value !== null && value !== '' ? displayValue : <span className="text-gray-400 italic">Empty</span>}
                            </div>
                        </div>
                    );
                })}
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

