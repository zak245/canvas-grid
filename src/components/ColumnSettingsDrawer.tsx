import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { GridColumn } from '../core/types/grid';

interface ColumnSettingsDrawerProps {
    isOpen: boolean;
    column: GridColumn | null;
    onClose: () => void;
    onUpdate: (updates: Partial<GridColumn>) => void;
}

export const ColumnSettingsDrawer: React.FC<ColumnSettingsDrawerProps> = ({
    isOpen,
    column,
    onClose,
    onUpdate
}) => {
    if (!isOpen || !column) return null;

    return createPortal(
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[9998]"
                onClick={onClose}
            />
            
            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-[300px] bg-white shadow-2xl z-[9999] border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-900">Column Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md text-gray-500">
                        <X size={16} />
                    </button>
                </div>
                
                <div className="p-4 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Column Name</label>
                        <input
                            type="text"
                            value={column.title}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Data Type</label>
                        <select
                            value={column.type || 'text'}
                            onChange={(e) => onUpdate({ type: e.target.value as any })}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Checkbox (Boolean)</option>
                            <option value="select">Select (Dropdown)</option>
                        </select>
                    </div>

                    {/* Placeholder for more settings */}
                    <div className="pt-4 border-t border-gray-100">
                         <p className="text-xs text-gray-400 italic">More settings coming soon...</p>
                    </div>
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <button 
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </>,
        document.body
    );
};


