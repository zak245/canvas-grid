import React, { useState } from 'react';
import { GridColumn } from '../types/grid';
import { ChevronDown, GripVertical, ArrowUp, ArrowDown, Plus } from 'lucide-react';
import type { ColumnSort } from '../types/platform';
import { ColumnMenu } from './ColumnMenu';
import { AddColumnMenu } from './AddColumnMenu';

interface ColumnHeadersProps {
    columns: GridColumn[];
    allColumns?: GridColumn[];
    scrollLeft: number;
    rowHeaderWidth: number;
    sortState?: ColumnSort[];
    onSort?: (columnId: string, direction?: 'asc' | 'desc') => void;
    onSelectColumn?: (columnId: string, multiSelect: boolean, rangeSelect: boolean) => void;
    onResize?: (columnId: string, width: number) => void;
    onAutoResize?: (columnId: string) => void;
    onHide?: (columnId: string) => void;
    onShow?: (columnId: string) => void;
    onAddColumn?: (column?: any) => void;
}

export const ColumnHeaders: React.FC<ColumnHeadersProps> = ({
    columns,
    allColumns = [],
    scrollLeft,
    rowHeaderWidth,
    sortState = [],
    onSort,
    onSelectColumn,
    onResize,
    onAutoResize,
    onHide,
    onShow,
    onAddColumn
}) => {
    const [menuState, setMenuState] = useState<{ isOpen: boolean; x: number; y: number; columnId: string } | null>(null);
    const [addMenuState, setAddMenuState] = useState<{ isOpen: boolean; x: number; y: number } | null>(null);
    
    // Resizing state
    const resizingRef = React.useRef<{ 
        columnId: string; 
        startX: number; 
        startWidth: number; 
    } | null>(null);

    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            
            const { columnId, startX, startWidth } = resizingRef.current;
            const diff = e.clientX - startX;
            const newWidth = Math.max(50, startWidth + diff); // Min width 50px
            
            onResize?.(columnId, newWidth);
        };

        const handleMouseUp = () => {
            if (resizingRef.current) {
                resizingRef.current = null;
                document.body.style.cursor = 'default';
            }
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [onResize]);

    const handleResizeStart = (e: React.MouseEvent, columnId: string, width: number) => {
        e.stopPropagation(); // Prevent header click
        e.preventDefault();
        
        resizingRef.current = {
            columnId,
            startX: e.clientX,
            startWidth: width
        };
        document.body.style.cursor = 'col-resize';
    };

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
        if (action === 'hide') onHide?.(columnId);
    };

    const handleHeaderClick = (e: React.MouseEvent, columnId: string) => {
        // Support multi-select (Cmd/Ctrl) and range-select (Shift)
        const multiSelect = e.metaKey || e.ctrlKey;
        const rangeSelect = e.shiftKey;
        onSelectColumn?.(columnId, multiSelect, rangeSelect);
    };

    const handleAddClick = (e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const menuWidth = 300; // Approximate width of the menu (w-72 = 288px)
        
        let x = rect.left;
        // Check if menu would overflow right edge of viewport
        if (x + menuWidth > window.innerWidth) {
            // Align right edge of menu with right edge of button
            x = rect.right - menuWidth;
        }

        setAddMenuState({
            isOpen: true,
            x,
            y: rect.bottom + 4
        });
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

                            {/* Resize Handle */}
                            <div
                                className="absolute top-0 bottom-0 right-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
                                onMouseDown={(e) => handleResizeStart(e, col.id, col.width)}
                                onDoubleClick={(e) => { e.stopPropagation(); onAutoResize?.(col.id); }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    ))}
                    
                    {/* Ghost Column (Add New) */}
                    <div
                        className="border-r border-gray-200 flex items-center justify-center px-2 hover:bg-gray-100 transition-colors cursor-pointer min-w-[50px] border-dashed"
                        style={{ width: '50px' }}
                        onClick={handleAddClick}
                        title="Add Column"
                    >
                        <Plus size={16} className="text-gray-400" />
                    </div>
                </div>
            </div>

            {/* Column Actions Menu */}
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

            {/* Add Column Menu */}
            {addMenuState && (
                <AddColumnMenu
                    isOpen={addMenuState.isOpen}
                    x={addMenuState.x}
                    y={addMenuState.y}
                    hiddenColumns={allColumns.filter(c => c.visible === false)}
                    onClose={() => setAddMenuState(null)}
                    onShowColumn={(id) => onShow?.(id)}
                    onCreateNew={(col) => onAddColumn?.(col)}
                />
            )}
        </>
    );
};
