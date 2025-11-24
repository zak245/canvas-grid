import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, ArrowLeft, Check } from 'lucide-react';
import { GridColumn } from '../types/grid';

interface AddColumnMenuProps {
    isOpen: boolean;
    x: number;
    y: number;
    allColumns: GridColumn[];
    onClose: () => void;
    onToggleVisibility: (columnId: string, visible: boolean) => void;
    onCreateNew: (column: GridColumn) => void;
    onAddColumnClick?: (column?: GridColumn) => void; // Add optional prop to match usage
}

export const AddColumnMenu: React.FC<AddColumnMenuProps> = ({
    isOpen,
    x,
    y,
    allColumns,
    onClose,
    onToggleVisibility,
    onCreateNew,
    // onAddColumnClick - not used yet but prop exists
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [view, setView] = useState<'list' | 'create'>('list');
    
    const [newColTitle, setNewColTitle] = useState('');
    const [newColType, setNewColType] = useState<GridColumn['type']>('text');

    useEffect(() => {
        if (!isOpen) {
            setView('list');
            setSearch('');
            setNewColTitle('');
            return;
        }

        let handler: ((e: MouseEvent) => void) | null = null;

        const timer = setTimeout(() => {
            handler = (e: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                    onClose();
                }
            };
            document.addEventListener('mousedown', handler);
        }, 50);

        return () => {
            clearTimeout(timer);
            if (handler) {
                document.removeEventListener('mousedown', handler);
            }
        };
    }, [isOpen, onClose]);

    useEffect(() => {
        if (view === 'create') {
            setNewColTitle(search);
        }
    }, [view]);

    if (!isOpen) return null;

    const handleCreate = () => {
        if (!newColTitle.trim()) return;
        
        const newColumn: GridColumn = {
            id: `col_${Date.now()}`,
            title: newColTitle,
            type: newColType,
            width: 200,
            visible: true
        };
        
        onCreateNew(newColumn);
        onClose();
    };

    const filteredColumns = allColumns.filter(col => 
        col.title.toLowerCase().includes(search.toLowerCase())
    );

    return createPortal(
        <div
            ref={menuRef}
            className="fixed z-[9999] bg-white rounded-lg shadow-xl border border-gray-200 w-72 animate-in fade-in zoom-in-95 duration-100 flex flex-col overflow-hidden"
            style={{ top: y, left: x }}
        >
            {view === 'list' ? (
                <>
                    <div className="p-2 border-b border-gray-100">
                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-md border border-gray-200">
                            <Search size={14} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Find or create column..."
                                className="bg-transparent border-none outline-none text-sm w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                        {filteredColumns.length > 0 ? (
                            <>
                                <div className="px-3 py-1 text-xs font-semibold text-gray-500 flex justify-between items-center">
                                    <span>Manage Columns</span>
                                    <span className="text-[10px] font-normal bg-gray-100 px-1.5 rounded">{filteredColumns.length}</span>
                                </div>
                                {filteredColumns.map((col) => (
                                    <button
                                        key={col.id}
                                        onClick={() => onToggleVisibility(col.id, !col.visible)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className={`
                                            w-4 h-4 flex items-center justify-center rounded transition-colors
                                            ${col.visible ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300'}
                                        `}>
                                            {col.visible && <Check size={10} strokeWidth={4} />}
                                        </div>
                                        
                                        <span className={`flex-1 truncate ${!col.visible ? 'text-gray-400' : 'text-gray-700'}`}>
                                            {col.title}
                                        </span>
                                        
                                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded capitalize opacity-0 group-hover:opacity-100 transition-opacity">
                                            {col.type}
                                        </span>
                                    </button>
                                ))}
                                <div className="h-px bg-gray-100 my-1" />
                            </>
                        ) : search && (
                            <div className="px-4 py-2 text-sm text-gray-500 text-center italic">
                                No columns match "{search}"
                            </div>
                        )}

                        <button
                            onClick={() => setView('create')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50 text-blue-600 transition-colors font-medium"
                        >
                            <Plus size={16} />
                            Create New Column "{search || '...'}"
                        </button>
                    </div>
                </>
            ) : (
                <div className="p-3 flex flex-col gap-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                        <button 
                            onClick={() => setView('list')}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <span className="font-medium text-sm text-gray-700">New Column</span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                            <input
                                type="text"
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                value={newColTitle}
                                onChange={(e) => setNewColTitle(e.target.value)}
                                placeholder="Column Name"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                            <select
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                value={newColType}
                                onChange={(e) => setNewColType(e.target.value as any)}
                            >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="date">Date</option>
                                <option value="checkbox">Checkbox</option>
                                <option value="select">Select</option>
                            </select>
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={!newColTitle.trim()}
                            className="w-full flex items-center justify-center gap-2 bg-black text-white py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            <Check size={14} />
                            Create Column
                        </button>
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
