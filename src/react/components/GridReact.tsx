import React, { useEffect, useState, useMemo } from 'react';
import { GridEngine } from '../../core/engine/GridEngine';
import { useStore } from 'zustand';
import { cellTypeRegistry } from '../../core/cell-types/registry';
import { CellRenderContext, CellTypeName } from '../../core/cell-types/types';

// Helper for SVG Icons
const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
        text: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h12v2H4zm0 5h10v2H4z"/></svg>,
        number: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 4v16M14 4v16M5 9h14M5 15h14"/></svg>,
        date: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
        boolean: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 12l2 2 4-4"/></svg>,
        email: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
        url: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
        select: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/><path d="M18 16l3 0l-1.5 3z"/></svg>,
    };
    return icons[type] || icons.text;
};

export interface GridReactProps {
    engine: GridEngine;
}

// Separate components to clean up render loop
const CornerHeader: React.FC<{ 
    theme: any;
    engine: GridEngine;
}> = ({ theme, engine }) => {
    // Selection state is managed by engine, just render the checkbox state
    // We don't need onClick here because MouseHandler handles the 'corner' hit test globally
    return (
        <div 
            style={{
                position: 'absolute',
                left: 0,
                width: theme.rowHeaderWidth,
                height: '100%',
                backgroundColor: theme.headerBackgroundColor,
                borderBottom: `1px solid ${theme.borderColor}`,
                borderRight: `1px solid ${theme.borderColor}`,
                zIndex: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <input 
                type="checkbox"
                style={{ margin: 0, pointerEvents: 'none' }}
                readOnly
                checked={false} // TODO: Implement full selection check
            />
        </div>
    );
};

const RowHeader: React.FC<{
    theme: any;
    rowIndex: number;
    top: number;
    isSelected: boolean;
    onToggle: () => void;
}> = ({ theme, rowIndex, top, isSelected, onToggle }) => {
    return (
        <div style={{
            position: 'absolute',
            top,
            left: 0,
            width: theme.rowHeaderWidth,
            height: theme.rowHeight,
            backgroundColor: isSelected ? '#e0e7ff' : '#f9fafb',
            borderBottom: `1px solid ${theme.borderColor}`,
            borderRight: `1px solid ${theme.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.fontSize,
            color: isSelected ? '#3b82f6' : '#9ca3af',
            fontWeight: isSelected ? 600 : 400,
            zIndex: 15
        }}>
            <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => {}} 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                style={{
                    position: 'absolute',
                    left: 8,
                    cursor: 'pointer',
                    margin: 0
                }}
            />
            <span style={{ marginLeft: 20 }}>{rowIndex + 1}</span>
        </div>
    );
};

const GroupHeader: React.FC<{
    row: any;
    top: number;
    theme: any;
    engine: GridEngine;
}> = ({ row, top, theme, engine }) => {
    return (
        <div style={{
            position: 'absolute',
            top,
            left: 0,
            width: '100%',
            height: theme.rowHeight,
            backgroundColor: '#f3f4f6',
            borderBottom: `1px solid ${theme.borderColor}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: theme.rowHeaderWidth + 12,
            boxSizing: 'border-box',
            cursor: 'pointer',
            zIndex: 20
        }}>
            <div style={{ marginRight: 8, display: 'flex', color: '#6b7280' }}>
                {row.isCollapsed 
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8l-7 11-7-11z"/></svg>
                }
            </div>
            <span style={{ fontWeight: 600, fontSize: theme.fontSize, color: '#374151' }}>
                {`${row.groupTitle || 'Untitled'} (${row.groupCount || 0})`}
            </span>
        </div>
    );
};

export const GridReact: React.FC<GridReactProps> = ({ engine }) => {
    // Subscribe to engine render signals AND selection changes
    // The flickering happens because selection update doesn't trigger a render here immediately
    const selection = useStore(engine.store, (state) => state.selection);

    // Subscribe to engine render signals for other updates (scrolling etc)
    const [version, setVersion] = useState(0);

    useEffect(() => {
        return engine.on('render', () => {
            setVersion(v => v + 1);
        });
    }, [engine]);

    // Get Viewport State
    const { scrollTop, scrollLeft, width, height } = engine.viewport.getState();
    const theme = engine.theme;

    // Calculate Visible Range (Re-using engine logic)
    const allRows = engine.rows.getViewRows();
    const allVisibleColumns = engine.model.getVisibleColumns();
    
    // We can use engine.viewport.calculateVisibleRange but it returns indices/arrays.
    // For React, we might want to just use that.
    const visibleRange = engine.viewport.calculateVisibleRange(allRows, allVisibleColumns);
    const { visibleRows, visibleColumns, pinnedColumns, rowStartIndex, scrollableGridX } = visibleRange;

    const frozenWidth = engine.model.getFrozenWidth();
    const sortState = engine.model.getSortState();

    return (
        <div style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            outline: 'none'
        }} tabIndex={0}>
            <style>{`
                .ds-grid-react-header-cell {
                    transition: background-color 0.1s;
                    cursor: default;
                }
                .ds-grid-react-header-cell:hover {
                    background-color: #f3f4f6 !important;
                }
                .ds-grid-react-header-cell-resizer {
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 4px;
                    height: 100%;
                    cursor: col-resize;
                    z-index: 10;
                }
                .ds-grid-react-header-cell-resizer:hover {
                    background-color: #3b82f6;
                }
                .ds-grid-react-header-cell:hover .ds-grid-react-header-menu-arrow {
                    opacity: 1 !important;
                }
            `}</style>

            {/* Header */}
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: width, 
                height: theme.headerHeight,
                overflow: 'hidden',
                zIndex: 10 
            }}>
                <CornerHeader theme={theme} engine={engine} />

                {/* Pinned Columns */}
                {pinnedColumns.map((col, i) => {
                    let left = theme.rowHeaderWidth;
                    for(let j=0; j<i; j++) left += pinnedColumns[j].width;
                    
                    const sort = sortState.find(s => s.columnId === col.id);

                    return (
                        <div key={col.id} className="ds-grid-react-header-cell" style={{
                            position: 'absolute',
                            left,
                            width: col.width,
                            height: '100%',
                            backgroundColor: theme.headerBackgroundColor,
                            borderBottom: `1px solid ${theme.borderColor}`,
                            borderRight: `1px solid ${theme.borderColor}`,
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            zIndex: 15,
                            fontSize: theme.headerFontSize,
                            fontFamily: theme.headerFontFamily,
                            fontWeight: 600,
                            color: theme.headerColor || '#374151',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ color: '#9ca3af', display: 'flex', marginRight: 8 }}>
                                {getTypeIcon(col.type || 'text')}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {col.title}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {sort && (
                                    <div style={{ color: '#2563eb', display: 'flex' }}>
                                        {sort.direction === 'asc' ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                                        )}
                                    </div>
                                )}
                                <div className="ds-grid-react-header-menu-arrow" style={{ color: '#9ca3af', display: 'flex', opacity: 0, transition: 'opacity 0.1s' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </div>
                                {col.headerAction && (
                                    <div style={{ color: '#9ca3af', display: 'flex' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
                                    </div>
                                )}
                            </div>

                            <div className="ds-grid-react-header-cell-resizer" />
                        </div>
                    );
                })}

                {/* Scrollable Columns */}
                {visibleColumns.filter(c => !c.pinned).map((col, i) => {
                    // Calculate Left
                    // visibleColumns (excluding pinned) start at scrollableGridX offset logic
                    // But we can just sum widths for simple logic if we trust visibleColumns order
                    // Re-using HtmlRenderer logic:
                    // screenX = theme.rowHeaderWidth + frozenWidth + (logicalX - scrollLeft)
                    // logicalX for this column needs to be known.
                    
                    // Let's iterate to find logicalX? 
                    // visibleRange.scrollableGridX is the start X of the *first* visible scrollable column in the set.
                    // So:
                    let currentLogicalX = scrollableGridX;
                    // Find this col in the scrollable set
                    const scrollableSet = visibleColumns.filter(c => !c.pinned);
                    const idx = scrollableSet.indexOf(col);
                    for(let k=0; k<idx; k++) currentLogicalX += scrollableSet[k].width;

                    const left = theme.rowHeaderWidth + frozenWidth + (currentLogicalX - scrollLeft);
                    const sort = sortState.find(s => s.columnId === col.id);

                    return (
                        <div key={col.id} className="ds-grid-react-header-cell" style={{
                            position: 'absolute',
                            left,
                            width: col.width,
                            height: '100%',
                            backgroundColor: theme.headerBackgroundColor,
                            borderBottom: `1px solid ${theme.borderColor}`,
                            borderRight: `1px solid ${theme.borderColor}`,
                            padding: '0 8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: theme.headerFontSize,
                            fontFamily: theme.headerFontFamily,
                            fontWeight: 600,
                            color: theme.headerColor || '#374151',
                            boxSizing: 'border-box'
                        }}>
                            <div style={{ color: '#9ca3af', display: 'flex', marginRight: 8 }}>
                                {getTypeIcon(col.type || 'text')}
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {col.title}
                            </span>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {sort && (
                                    <div style={{ color: '#2563eb', display: 'flex' }}>
                                        {sort.direction === 'asc' ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
                                        )}
                                    </div>
                                )}
                                <div className="ds-grid-react-header-menu-arrow" style={{ color: '#9ca3af', display: 'flex', opacity: 0, transition: 'opacity 0.1s' }}>
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                                </div>
                                {col.headerAction && (
                                    <div style={{ color: '#9ca3af', display: 'flex' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>
                                    </div>
                                )}
                            </div>
                            <div className="ds-grid-react-header-cell-resizer" />
                        </div>
                    );
                })}
            </div>

            {/* Body */}
            <div style={{
                position: 'absolute',
                top: theme.headerHeight,
                left: 0,
                width: width,
                height: height - theme.headerHeight,
                overflow: 'hidden'
            }}>
                {visibleRows.map((row, rowIndex) => {
                    const actualIndex = rowStartIndex + rowIndex;
                    const top = (actualIndex * theme.rowHeight) - scrollTop;
                    
                    if (row.isGroupHeader) {
                        return <GroupHeader key={row.id} row={row} top={top} theme={theme} engine={engine} />;
                    }

                    const isSelected = engine.selection.isRowSelected(actualIndex);
                    
                    return (
                        <React.Fragment key={row.id}>
                            <RowHeader 
                                theme={theme}
                                rowIndex={actualIndex}
                                top={top}
                                isSelected={isSelected}
                                onToggle={() => engine.selection.toggleRowSelection(actualIndex)}
                            />

                            {/* Cells */}
                            {[...pinnedColumns, ...visibleColumns.filter(c => !c.pinned)].map(col => {
                                const isPinned = !!col.pinned;
                                let left = 0;
                                if (isPinned) {
                                    left = theme.rowHeaderWidth;
                                    // Find index in pinned
                                    const pIdx = pinnedColumns.indexOf(col);
                                    for(let p=0; p<pIdx; p++) left += pinnedColumns[p].width;
                                } else {
                                    const scrollableSet = visibleColumns.filter(c => !c.pinned);
                                    const idx = scrollableSet.indexOf(col);
                                    let currentLogicalX = scrollableGridX;
                                    for(let k=0; k<idx; k++) currentLogicalX += scrollableSet[k].width;
                                    left = theme.rowHeaderWidth + frozenWidth + (currentLogicalX - scrollLeft);
                                }

                                const cell = row.cells.get(col.id);
                                const cellType = cellTypeRegistry.get(col.type as CellTypeName);
                                let content: React.ReactNode;

                                if (cellType.renderReact) {
                                     const context: CellRenderContext<any> = {
                                        value: cell?.value,
                                        displayValue: cellType.format(cell?.value, col.typeOptions),
                                        x: left,
                                        y: top,
                                        width: col.width,
                                        height: theme.rowHeight,
                                        isSelected: false,
                                        isFocused: false,
                                        isEditing: false,
                                        isHovered: false,
                                        hasError: false,
                                        theme: theme,
                                        rowIndex: rowIndex + rowStartIndex,
                                        columnId: col.id,
                                        options: col.typeOptions
                                    };
                                    content = cellType.renderReact(context);
                                } else {
                                    content = cell?.value ? String(cell.value) : '';
                                }
                                
                                return (
                                    <div key={`${row.id}-${col.id}`} style={{
                                        position: 'absolute',
                                        top,
                                        left,
                                        width: col.width,
                                        height: theme.rowHeight,
                                        borderBottom: `1px solid ${theme.gridLineColor}`,
                                        borderRight: `1px solid ${theme.gridLineColor}`,
                                        backgroundColor: '#fff',
                                        padding: '0 8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        fontSize: theme.fontSize,
                                        fontFamily: theme.fontFamily,
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                        zIndex: isPinned ? 10 : 1
                                    }}>
                                        {content}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

