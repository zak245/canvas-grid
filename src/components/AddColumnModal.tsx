import React, { useState } from 'react';
import { X, Type, Hash, Sparkles } from 'lucide-react';
import type { GridColumn } from '../types/grid';

interface AddColumnModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (column: GridColumn) => void;
}

export const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'text' | 'number' | 'ai'>('text');
    const [aiPrompt, setAiPrompt] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newColumn: GridColumn = {
            id: `col_${Date.now()}`,
            title,
            width: 200,
            type,
            visible: true,
            ...(type === 'ai' && { aiConfig: { prompt: aiPrompt, model: 'gpt-4' } })
        };

        onSubmit(newColumn);
        setTitle('');
        setType('text');
        setAiPrompt('');
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
                            <button
                                type="button"
                                onClick={() => setType('text')}
                                className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${type === 'text' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Type size={20} />
                                <span className="text-xs">Text</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('number')}
                                className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${type === 'number' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Hash size={20} />
                                <span className="text-xs">Number</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('ai')}
                                className={`flex flex-col items-center gap-2 p-3 border rounded-lg transition-all ${type === 'ai' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <Sparkles size={20} />
                                <span className="text-xs">AI</span>
                            </button>
                        </div>
                    </div>

                    {type === 'ai' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">AI Prompt</label>
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g. Find the company email for this person"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
                                rows={3}
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={!title || (type === 'ai' && !aiPrompt)}
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
