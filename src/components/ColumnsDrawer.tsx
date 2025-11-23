import React from 'react';
import { GridColumn } from '../types/grid';
import { X, GripVertical, Eye, EyeOff, Plus } from 'lucide-react';

interface ColumnsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    columns: GridColumn[];
    onToggleVisibility: (columnId: string, visible: boolean) => void;
    onAddColumn: () => void;
}

export const ColumnsDrawer: React.FC<ColumnsDrawerProps> = ({
    isOpen,
    onClose,
    columns,
    onToggleVisibility,
    onAddColumn
}) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 z-50"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-80 bg-white shadow-xl z-50 border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
                    <h2 className="font-semibold text-gray-800">Manage Columns</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-1">
                        {columns.map((col) => (
                            <div 
                                key={col.id}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 border border-transparent hover:border-gray-200 group transition-colors"
                            >
                                <GripVertical size={16} className="text-gray-300 cursor-grab" />
                                
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-700 truncate">
                                        {col.title}
                                    </div>
                                    <div className="text-xs text-gray-400 capitalize">
                                        {col.type}
                                    </div>
                                </div>

                                <button
                                    onClick={() => onToggleVisibility(col.id, !col.visible)}
                                    className={`p-1.5 rounded-md transition-colors ${
                                        col.visible !== false 
                                            ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-200' 
                                            : 'text-gray-400 bg-gray-100'
                                    }`}
                                >
                                    {col.visible !== false ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onAddColumn}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        <Plus size={16} />
                        Add New Column
                    </button>
                </div>
            </div>
        </>
    );
};

