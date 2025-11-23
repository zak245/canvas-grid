import React from 'react';
import { Search, Filter, ArrowUpDown, Plus, Download, Sparkles } from 'lucide-react';

interface ToolbarProps {
    onAddColumn: () => void;
    onAddRow?: () => void; // Kept in interface for compatibility but removed from UI
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAddColumn }) => {
    return (
        <div className="h-14 border-b border-gray-200 bg-white flex items-center px-4 justify-between shrink-0 z-40 relative">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200 w-64">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search views..."
                        className="bg-transparent border-none outline-none text-sm w-full"
                    />
                </div>

                <div className="h-6 w-px bg-gray-200 mx-2" />

                <div className="flex items-center gap-1">
                    <ToolButton icon={<Filter size={16} />} label="Filter" />
                    <ToolButton icon={<ArrowUpDown size={16} />} label="Sort" />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={onAddColumn}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md border border-gray-200 transition-colors"
                >
                    <Plus size={16} />
                    <span>Column</span>
                </button>

                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-md shadow-sm transition-colors">
                    <Sparkles size={16} />
                    <span>Enrich</span>
                </button>

                <div className="h-6 w-px bg-gray-200 mx-2" />

                <button className="p-2 text-gray-500 hover:text-gray-700">
                    <Download size={18} />
                </button>
            </div>
        </div>
    );
};

const ToolButton: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-md transition-colors">
        {icon}
        <span>{label}</span>
    </button>
);
