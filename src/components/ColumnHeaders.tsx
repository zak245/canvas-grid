import React from 'react';
import { GridColumn } from '../types/grid';
import { ChevronDown, GripVertical } from 'lucide-react';

interface ColumnHeadersProps {
    columns: GridColumn[];
    scrollLeft: number;
    rowHeaderWidth: number;
}

export const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
    columns,
    scrollLeft,
    rowHeaderWidth
}) => {
    return (
        <div
            className="absolute top-0 left-0 right-0 h-10 bg-gray-50 border-b border-gray-200 flex overflow-hidden"
            style={{ paddingLeft: `${rowHeaderWidth}px` }}
        >
            <div
                className="flex"
                style={{ transform: `translateX(-${scrollLeft}px)` }}
            >
                {columns.map((col) => (
                    <div
                        key={col.id}
                        className="border-r border-gray-200 flex items-center px-2 group hover:bg-gray-100 transition-colors cursor-pointer"
                        style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                    >
                        <GripVertical size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                        <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                            {col.title}
                        </span>
                        {col.type === 'ai' && (
                            <span className="ml-1 text-xs text-purple-600">✨</span>
                        )}
                        <ChevronDown size={14} className="text-gray-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>
        </div>
    );
};
