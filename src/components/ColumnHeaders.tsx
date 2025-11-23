import React, { useState } from 'react';
import { GridColumn } from '../types/grid';
import { ChevronDown, GripVertical, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import type { ColumnSort } from '../types/platform';
import { ColumnMenu } from './ColumnMenu';

interface ColumnHeadersProps {
    columns: GridColumn[];
    scrollLeft: number;
    rowHeaderWidth: number;
    sortState?: ColumnSort[];
    onSort?: (columnId: string, direction?: 'asc' | 'desc') => void;
    onSelectColumn?: (columnId: string, multiSelect: boolean, rangeSelect: boolean) => void;
}

export const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
    columns,
    scrollLeft,
    rowHeaderWidth,
    sortState = [],
    onSort,
    onSelectColumn
}) => {
    const [menuState, setMenuState] = useState<{ isOpen: boolean; x: number; y: number; columnId: string } | null>(null);

    const getSortIcon = (columnId: string) => {
        const sort = sortState.find(s => s.columnId === columnId);
        if (!sort) return null;
        
        return sort.direction === 'asc' 
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    const handleMenuOpen = (e: React.MouseEvent, columnId: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setMenuState({
            isOpen: true,
            x: rect.left,
            y: rect.bottom + 4,
            columnId
        });
    };

    const handleMenuAction = (action: string, columnId: string) => {
        setMenuState(null);
        if (action === 'sortAsc') onSort?.(columnId, 'asc');
        if (action === 'sortDesc') onSort?.(columnId, 'desc');
    };

    const handleHeaderClick = (e: React.MouseEvent, columnId: string) => {
        // Support multi-select (Cmd/Ctrl) and range-select (Shift)
        const multiSelect = e.metaKey || e.ctrlKey;
        const rangeSelect = e.shiftKey;
        onSelectColumn?.(columnId, multiSelect, rangeSelect);
    };

    return (
        <>
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
                            className="border-r border-gray-200 flex items-center px-2 group hover:bg-gray-100 transition-colors cursor-pointer relative select-none"
                            style={{ width: `${col.width}px`, minWidth: `${col.width}px` }}
                            onClick={(e) => handleHeaderClick(e, col.id)}
                        >
                            <GripVertical size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
                            <span className="text-xs font-semibold text-gray-700 truncate flex-1">
                                {col.title}
                            </span>
                            {col.type === 'ai' && (
                                <span className="ml-1 text-xs text-purple-600">✨</span>
                            )}
                            
                            {/* Sort Indicator */}
                            <div className="ml-1">
                                {getSortIcon(col.id)}
                            </div>

                            {/* Menu Trigger */}
                            <button 
                                className="p-1 hover:bg-gray-200 rounded ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleMenuOpen(e, col.id)}
                            >
                                <ChevronDown size={14} className="text-gray-500" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Render Menu via Portal */}
            {menuState && (
                <ColumnMenu
                    isOpen={menuState.isOpen}
                    x={menuState.x}
                    y={menuState.y}
                    columnId={menuState.columnId}
                    onClose={() => setMenuState(null)}
                    onAction={handleMenuAction}
                />
            )}
        </>
    );
};
