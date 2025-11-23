import React from 'react';

interface RowHeadersProps {
    visibleRowIndices: number[];
    scrollTop: number;
    rowHeight: number;
    headerHeight: number;
    rowHeaderWidth: number;
}

export const RowHeaders: React.FC<RowHeadersProps> = ({
    visibleRowIndices,
    scrollTop,
    rowHeight,
    headerHeight,
    rowHeaderWidth
}) => {
    return (
        <div
            className="absolute top-0 left-0 bottom-0 bg-gray-50 border-r border-gray-200 overflow-hidden"
            style={{
                width: `${rowHeaderWidth}px`,
                paddingTop: `${headerHeight}px`
            }}
        >
            <div className="relative">
                {visibleRowIndices.map((rowIndex) => {
                    // Calculate actual position for each row
                    const top = (rowIndex * rowHeight) - scrollTop;

                    return (
                        <div
                            key={rowIndex}
                            className="absolute border-b border-gray-200 flex items-center justify-center text-xs text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                            style={{
                                height: `${rowHeight}px`,
                                width: `${rowHeaderWidth}px`,
                                top: `${top}px`
                            }}
                        >
                            {rowIndex + 1}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
