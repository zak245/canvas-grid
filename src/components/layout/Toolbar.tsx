import React from 'react';
import { Search, Filter, ArrowUpDown, Plus, Download, Sparkles } from 'lucide-react';

interface ToolbarProps {
    onAddColumn: () => void;
    onAddRow?: () => void; // Kept in interface for compatibility but removed from UI
    mode?: 'local' | 'backend'; // Display mode indicator
}

export const Toolbar: React.FC<ToolbarProps> = ({ onAddColumn, mode }) => {
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
                {/* Mode Indicator */}
                {mode && (
                    <>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            mode === 'backend' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-blue-100 text-blue-800'
                        }`}>
                            {mode === 'backend' ? '🔌 Backend Mode' : '💾 Local Mode'}
                        </div>
                        <div className="h-6 w-px bg-gray-200 mx-1" />
                    </>
                )}

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
