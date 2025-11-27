import React, { useState } from 'react';
import { X, Type, Hash, Calendar, CheckSquare, List, Mail, Link, Phone, BarChart2 } from 'lucide-react';
import type { GridColumn, CellType } from '../core/types/grid';

interface AddColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (column: GridColumn) => void;
}

const COLUMN_TYPES: { type: CellType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Type size={20} /> },
    { type: 'number', label: 'Number', icon: <Hash size={20} /> },
    { type: 'date', label: 'Date', icon: <Calendar size={20} /> },
    { type: 'boolean', label: 'Checkbox', icon: <CheckSquare size={20} /> },
    { type: 'select', label: 'Select', icon: <List size={20} /> },
    { type: 'email', label: 'Email', icon: <Mail size={20} /> },
    { type: 'url', label: 'URL', icon: <Link size={20} /> },
    { type: 'phone', label: 'Phone', icon: <Phone size={20} /> },
    { type: 'progress', label: 'Progress', icon: <BarChart2 size={20} /> },
];

export const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [selectedType, setSelectedType] = useState<CellType>('text');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newColumn: GridColumn = {
            id: `col_${Date.now()}`,
            title,
            width: 200,
            type: selectedType,
            visible: true,
        };

        onSubmit(newColumn);
        setTitle('');
        setSelectedType('text');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Add New Column</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Column Name</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Status, Priority, Email"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Column Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {COLUMN_TYPES.map(({ type, label, icon }) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedType(type)}
                                    className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${
                                        selectedType === type 
                                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                    }`}
                                >
                                    {icon}
                                    <span className="text-xs">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={!title}
                            className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Create Column
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


