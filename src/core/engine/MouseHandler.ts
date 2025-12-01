import { GridEngine } from './GridEngine';
import { CellPosition } from '../types/grid';

export class MouseHandler {
    private isDragging = false;
    private dragStart: CellPosition | null = null;

    // Header Interaction State
    private isResizing = false;
    private resizingColIndex: number = -1;
    private resizingStartWidth: number = 0;
    private resizingStartX: number = 0;

    // Row Selection State
    private isSelectingRows = false;
    private rowSelectionStart: number = -1;

    // Reorder State
    private isReordering = false;
    private reorderCandidate: { colIndex: number, startX: number, dragOffset: number } | null = null;

    // NEW: Row Reorder State
    private isReorderingRow = false;
    private rowReorderCandidate: { rowIndex: number, startY: number, dragOffset: number } | null = null;

    constructor(private engine: GridEngine) { }

    handleMouseDown = (e: MouseEvent) => {
        // Ensure canvas has focus for keyboard events
        if (e.target instanceof HTMLCanvasElement) {
            e.target.focus();
        }

        const { theme } = this.engine;
        const { scrollTop } = this.engine.viewport.getState();
        
        // Ignore Right Click for Mouse Down (handled in onContextMenu)
        if (e.button === 2) {
            return;
        }

        // 0. Check Row Header Interaction
        if (e.offsetX < theme.rowHeaderWidth) {
            // Check "Select All" Checkbox (Top-Left)
            if (e.offsetY < theme.headerHeight) {
                const cbSize = 14;
                const cbX = 8;
                const cbY = (theme.headerHeight - cbSize) / 2;
                if (e.offsetX >= cbX - 4 && e.offsetX <= cbX + cbSize + 4 &&
                    e.offsetY >= cbY - 4 && e.offsetY <= cbY + cbSize + 4) {
                    this.engine.toggleSelectAllRows();
                    return;
                }
            }
            
            if (e.offsetY > theme.headerHeight) {
                const rowIndex = Math.floor((e.offsetY - theme.headerHeight + scrollTop) / theme.rowHeight);
                // Use RowManager count
                const rowCount = this.engine.rows.getRowCount();
                
                if (rowIndex >= 0 && rowIndex < rowCount) {
                    // NEW: Check for Group Header
                    const row = this.engine.rows.getRow(rowIndex);
                    if (row?.isGroupHeader && row.groupKey) {
                         // Simple toggle on click anywhere in the header for now
                         // We could refine this to just the arrow icon later
                         this.engine.rows.toggleGroup(row.groupKey);
                         this.engine.render();
                         return;
                    }

                     // Check Configured Actions
                     const configActions = this.engine.getConfig()?.features.rows.actions;
                     let actionHandled = false;
                     
                     if (configActions && configActions.length > 0) {
                         let actionX = theme.rowHeaderWidth - 20;
                         for (const action of configActions) {
                             if (e.offsetX >= actionX - 8 && e.offsetX <= actionX + 8) {
                                 this.engine.triggerRowAction(rowIndex, action.id);
                                 actionHandled = true;
                                 break;
                             }
                             actionX -= 24;
                         }
                     } else {
                         // Default Actions logic (Enrich/Detail)
                         const enrichX = theme.rowHeaderWidth - 34;
                         const detailX = theme.rowHeaderWidth - 16;
                         
                         if (e.offsetX >= enrichX - 8 && e.offsetX <= enrichX + 8) {
                             this.engine.triggerRowAction(rowIndex, 'enrich');
                             actionHandled = true;
                         } else if (e.offsetX >= detailX - 8 && e.offsetX <= detailX + 8) {
                             this.engine.triggerRowAction(rowIndex, 'detail');
                             actionHandled = true;
                         }
                     }

                     if (actionHandled) return;

                     // Check Row Checkbox (Simulate Multi-Select)
                     if (e.offsetX <= 30) {
                         this.engine.toggleRowSelection(rowIndex, true); // Force multi
                         return;
                     }

                     // Start Row Reorder or Selection
                     // If clicking on the number or blank space, initiate drag candidate
                     this.rowReorderCandidate = {
                         rowIndex,
                         startY: e.clientY,
                         dragOffset: (e.offsetY - theme.headerHeight + scrollTop) % theme.rowHeight
                     };

                     // Start Row Selection Drag (Standard)
                     this.isSelectingRows = true;
                     this.rowSelectionStart = rowIndex;
                     
                     const isCtrl = e.metaKey || e.ctrlKey;
                     if (isCtrl) {
                         this.engine.toggleRowSelection(rowIndex, true);
                     } else {
                         this.engine.selectRow(rowIndex, e.shiftKey);
                     }
                }
                return;
            }
        }

        // 1. Check for Header Interaction
        if (e.offsetY < theme.headerHeight) {
            this.handleHeaderMouseDown(e);
            return;
        }

        // Close menus on any grid body interaction
        const { activeHeaderMenu, activeAddColumnMenu } = this.engine.store.getState();
        if (activeHeaderMenu || activeAddColumnMenu) {
            this.engine.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
        }

        // NEW: Check for Group Header Click in Body
        const bodyY = e.offsetY - theme.headerHeight + scrollTop;
        const bodyRowIndex = Math.floor(bodyY / theme.rowHeight);
        const bodyRowCount = this.engine.rows.getRowCount();
        if (bodyRowIndex >= 0 && bodyRowIndex < bodyRowCount) {
            const row = this.engine.rows.getRow(bodyRowIndex);
            if (row?.isGroupHeader && row.groupKey) {
                // Toggle group and stop propagation
                this.engine.rows.toggleGroup(row.groupKey);
                this.engine.render();
                return;
            }
        }

        // 2. Check for "Add Row" button click
        const gridY = (e.offsetY - theme.headerHeight) + scrollTop;
        // Use visual row count
        const totalRows = this.engine.rows.getRowCount();
        const addRowY = totalRows * theme.rowHeight;
        
        if (gridY >= addRowY && gridY < addRowY + theme.rowHeight) {
            // Input Box & Button are drawn at visual X = theme.rowHeaderWidth + 12
            const startX = theme.rowHeaderWidth + 12;
            
            // 1. Check Input Box (width 40)
            if (e.offsetX >= startX && e.offsetX <= startX + 40) {
                e.preventDefault();
                
                // Create inline input element
                const input = document.createElement('input');
                input.type = 'number';
                input.value = String(this.engine.store.getState().rowsToAdd);
                input.style.position = 'absolute';
                input.style.left = `${e.clientX - e.offsetX + startX}px`; // Canvas absolute + relative X
                
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                
                const inputCanvasY = addRowY - scrollTop + theme.headerHeight + 4;
                const inputScreenY = rect.top + inputCanvasY;
                
                input.style.top = `${inputScreenY}px`;
                input.style.width = '40px';
                input.style.height = `${theme.rowHeight - 8}px`;
                input.style.zIndex = '1000';
                input.style.border = '1px solid #3b82f6';
                input.style.outline = 'none';
                input.style.padding = '0 4px';
                input.style.textAlign = 'center';
                input.style.borderRadius = '2px';
                input.style.font = `${theme.fontSize}px ${theme.fontFamily}`;
                
                document.body.appendChild(input);
                input.focus();
                input.select();
                
                const cleanup = () => {
                    if (document.body.contains(input)) {
                        document.body.removeChild(input);
                    }
                    this.engine.render(); // Re-render to show updated static text
                };
                
                const save = () => {
                    const val = parseInt(input.value, 10);
                    if (!isNaN(val) && val > 0) {
                        this.engine.setRowsToAdd(val);
                    }
                    cleanup();
                };
                
                input.onblur = save;
                input.onkeydown = (ev) => {
                    if (ev.key === 'Enter') save();
                    if (ev.key === 'Escape') cleanup();
                };
                
                return;
            }

            // 2. Check Add Button (starts at startX + 50, approx width 100)
            if (e.offsetX >= startX + 50 && e.offsetX <= startX + 150) {
                e.preventDefault(); // Prevent double firing
                e.stopPropagation();
                const count = this.engine.store.getState().rowsToAdd;
                this.engine.addMultipleRows(count).catch(console.error);
                return;
            }
            
            return;
        }

        const cell = this.engine.getCellPositionAt(e.offsetX, e.offsetY);
        if (!cell) return;

        const { selection } = this.engine.store.getState();

        // 3. Check if clicking on fill handle
        if (selection && this.isClickOnFillHandle(e.offsetX, e.offsetY, selection)) {
            this.startFillDrag(selection);
            return;
        }

        // 4. Start cell selection
        this.isDragging = true;
        this.dragStart = cell;

        if (e.shiftKey && selection) {
            // Extend selection
            const primary = selection.primary!;
            this.engine.store.setState({
                selection: {
                    primary,
                    ranges: [
                        {
                            start: { row: Math.min(primary.row, cell.row), col: Math.min(primary.col, cell.col) },
                            end: { row: Math.max(primary.row, cell.row), col: Math.max(primary.col, cell.col) }
                        }
                    ]
                }
            });
        } else if (e.metaKey || e.ctrlKey) {
            // Multi-range selection
            const ranges = selection ? [...selection.ranges] : [];
            ranges.push({ start: cell, end: cell });
            this.engine.store.setState({
                selection: {
                    primary: cell,
                    ranges
                }
            });
        } else {
            // Single cell selection
            this.engine.store.setState({
                selection: {
                    primary: cell,
                    ranges: [{ start: cell, end: cell }]
                }
            });
        }
    };

    handleMouseMove = (e: MouseEvent) => {
        const { theme } = this.engine;
        const { isFilling, selection } = this.engine.store.getState();
        const { scrollTop } = this.engine.viewport.getState();
        const canvas = e.target as HTMLCanvasElement;

        // Update hover position for tooltips and hovered cell
        const hoveredCell = this.engine.getCellPositionAt(e.offsetX, e.offsetY);
        this.engine.store.setState({
            hoverPosition: { x: e.offsetX, y: e.offsetY },
            hoveredCell: hoveredCell
        });

        // 0. Handle Row Reorder
        if (this.rowReorderCandidate && !this.isReorderingRow) {
            if (Math.abs(e.clientY - this.rowReorderCandidate.startY) > 5) {
                this.isReorderingRow = true;
                canvas.style.cursor = 'grabbing';
                // Disable text selection during drag
                document.body.style.userSelect = 'none';
            }
        }

        if (this.isReorderingRow && this.rowReorderCandidate) {
            // TODO: Add visual feedback for row reordering (ghost row / line)
            // For now, just cursor
            canvas.style.cursor = 'grabbing';
            
            // We could update a state variable here for the renderer to draw a line
            // const targetRow = Math.floor((e.offsetY - theme.headerHeight + scrollTop) / theme.rowHeight);
            // this.engine.store.setState({ reorderRowTarget: targetRow }); // Assuming we add this to state
            return;
        }

        // 0b. Handle Row Selection Drag (only if not reordering)
        if (this.isSelectingRows && this.rowSelectionStart !== -1 && !this.isReorderingRow) {
             const gridY = e.offsetY - theme.headerHeight + scrollTop;
             const rowIndex = Math.floor(gridY / theme.rowHeight);
             const rowCount = this.engine.rows.getRowCount();
             const targetRow = Math.max(0, Math.min(rowCount - 1, rowIndex));
             
             const colCount = this.engine.model.getColumns().length;
             const range = {
                 start: { col: 0, row: Math.min(this.rowSelectionStart, targetRow) },
                 end: { col: colCount - 1, row: Math.max(this.rowSelectionStart, targetRow) }
             };
             
             const { selection } = this.engine.store.getState();
             
             if (selection && selection.ranges.length > 0) {
                 // Update last range
                 const otherRanges = selection.ranges.slice(0, selection.ranges.length - 1);
                 this.engine.store.setState({
                     selection: {
                         primary: selection.primary,
                         ranges: [...otherRanges, range]
                     }
                 });
             } else {
                 this.engine.store.setState({
                     selection: {
                         primary: { col: 0, row: this.rowSelectionStart },
                         ranges: [range]
                     }
                 });
             }
             return;
        }

        // 1. Handle Column Resizing
        if (this.isResizing) {
            const deltaX = e.clientX - this.resizingStartX;
            const newWidth = Math.max(50, this.resizingStartWidth + deltaX);
            const column = this.engine.model.getVisibleColumns()[this.resizingColIndex];
            if (column) {
                this.engine.resizeColumn(column.id, newWidth);
            }
            canvas.style.cursor = 'col-resize';
            return;
        }

        // 2. Handle Reordering
        if (this.reorderCandidate && !this.isReordering) {
            // Check threshold to start drag
            if (Math.abs(e.clientX - this.reorderCandidate.startX) > 5) {
                this.isReordering = true;
                canvas.style.cursor = 'grabbing';
            }
        }

        if (this.isReordering && this.reorderCandidate) {
            this.updateReorderState(e.clientX);
            canvas.style.cursor = 'grabbing';
            return;
        }

        // 3. Handle Cursor Styling
        if (e.offsetX < theme.rowHeaderWidth && e.offsetY > theme.headerHeight) {
             const enrichX = theme.rowHeaderWidth - 34;
             const detailX = theme.rowHeaderWidth - 16;
             
             if ((e.offsetX >= enrichX - 8 && e.offsetX <= enrichX + 8) || 
                 (e.offsetX >= detailX - 8 && e.offsetX <= detailX + 8)) {
                 canvas.style.cursor = 'pointer';
             } else {
                 canvas.style.cursor = 'default';
             }
        } else if (e.offsetY < theme.headerHeight) {
            const { colIndex, onEdge } = this.getHeaderAt(e.offsetX);
            
            if (onEdge) {
                canvas.style.cursor = 'col-resize';
            } else if (colIndex >= 0) {
                canvas.style.cursor = 'default'; 
            } else {
                // Check Ghost Column
                const visibleCols = this.engine.model.getVisibleColumns();
                const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
                const { scrollLeft } = this.engine.viewport.getState();
                const x = e.offsetX + scrollLeft - theme.rowHeaderWidth;
                
                if (x >= totalWidth && x < totalWidth + 50) {
                    canvas.style.cursor = 'pointer'; // Ghost column
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        } else if (selection && this.isClickOnFillHandle(e.offsetX, e.offsetY, selection)) {
            canvas.style.cursor = 'crosshair';
        } else if (!isFilling) {
            canvas.style.cursor = 'default';
        }

        // 4. Handle Cell Drag Operations
        if (isFilling && selection) {
            this.updateFillRange(e.offsetX, e.offsetY, selection);
        } else if (this.isDragging && this.dragStart) {
            this.updateDragSelection(e.offsetX, e.offsetY);
        }
    };

    handleMouseUp = (e: MouseEvent) => {
        const { isFilling, selection, fillRange } = this.engine.store.getState();
        const { theme } = this.engine;
        const { scrollTop } = this.engine.viewport.getState();

        // Reset Row Selection Drag
        this.isSelectingRows = false;
        this.rowSelectionStart = -1;

        // Handle Row Reorder Drop
        if (this.isReorderingRow && this.rowReorderCandidate) {
            const targetRow = Math.floor((e.offsetY - theme.headerHeight + scrollTop) / theme.rowHeight);
            const rowCount = this.engine.rows.getRowCount();
            const validTarget = Math.max(0, Math.min(rowCount - 1, targetRow));
            
            if (validTarget !== this.rowReorderCandidate.rowIndex) {
                this.engine.moveRow(this.rowReorderCandidate.rowIndex, validTarget);
            }
            
            this.isReorderingRow = false;
            this.rowReorderCandidate = null;
            document.body.style.userSelect = '';
            return;
        }
        this.rowReorderCandidate = null; // Cancel candidate if not dragged enough

        // Handle Reorder Drop
        if (this.isReordering && this.reorderCandidate) {
            const targetIndex = this.calculateReorderTarget(e.clientX);
            if (targetIndex !== this.reorderCandidate.colIndex) {
                this.engine.moveColumn(this.reorderCandidate.colIndex, targetIndex);
            }
            
            this.isReordering = false;
            this.reorderCandidate = null;
            this.engine.store.setState({ reorderState: null });
            return;
        }

        // Handle Column Selection (Click on Header)
        if (e.offsetY < theme.headerHeight && !this.isResizing && !this.isReordering) {
            const { colIndex, xInCol } = this.getHeaderAt(e.offsetX);
            const visibleCols = this.engine.model.getVisibleColumns();
            
            if (colIndex >= 0) {
                const column = visibleCols[colIndex];
                // Check if we clicked the menu area (don't select if clicking menu)
                 if (xInCol <= column.width - 30) {
                     this.engine.selectColumn(column.id, e.metaKey || e.ctrlKey, e.shiftKey);
                 }
            }
            this.reorderCandidate = null;
        }

        if (isFilling) {
            this.completeFill(selection, fillRange);
        }

        // Stop all drag operations
        this.isDragging = false;
        this.dragStart = null;
        this.isResizing = false;
        this.resizingColIndex = -1;
    };

    handleDoubleClick = (e: MouseEvent) => {
        const { theme } = this.engine;
        if (e.offsetY < theme.headerHeight) {
            const { colIndex, onEdge } = this.getHeaderAt(e.offsetX);
            if (onEdge && colIndex >= 0) {
                const column = this.engine.model.getVisibleColumns()[colIndex];
                if (column) {
                    this.engine.autoResizeColumn(column.id);
                }
            }
        } else {
            // Cell Double Click - Start Edit
            const cell = this.engine.getCellPositionAt(e.offsetX, e.offsetY);
            if (cell) {
                 const visibleCols = this.engine.model.getVisibleColumns();
                 const allCols = this.engine.model.getColumns();
                 const trueColId = allCols[cell.col].id;
                 const visibleIndex = visibleCols.findIndex(c => c.id === trueColId);
                 
                 if (visibleIndex !== -1) {
                     this.engine.startEdit(cell.row, visibleIndex);
                 }
            }
        }
    };

    // NEW: Handle Context Menu Event
    onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        this.handleContextMenu(e);
    };

    private handleContextMenu(e: MouseEvent) {
        const { theme } = this.engine;
        const { scrollTop } = this.engine.viewport.getState();
        
        // Determine Context
        let contextType: 'cell' | 'row-header' | 'column-header' | 'grid-body' = 'grid-body';
        let args: any = {};

        if (e.offsetY < theme.headerHeight) {
            // Disabled context menu for column headers as requested
            return;
        } else if (e.offsetX < theme.rowHeaderWidth) {
            contextType = 'row-header';
            const rowIndex = Math.floor((e.offsetY - theme.headerHeight + scrollTop) / theme.rowHeight);
            args.row = rowIndex;
        } else {
            const cell = this.engine.getCellPositionAt(e.offsetX, e.offsetY);
            if (cell) {
                contextType = 'cell';
                args.row = cell.row;
                args.col = cell.col;

                // Check if we need to select the cell (if not already part of selection)
                const { selection } = this.engine.store.getState();
                let isSelected = false;
                if (selection) {
                    // Check if cell is in any range
                    for (const range of selection.ranges) {
                        if (cell.row >= range.start.row && cell.row <= range.end.row &&
                            cell.col >= range.start.col && cell.col <= range.end.col) {
                            isSelected = true;
                            break;
                        }
                    }
                }

                if (!isSelected) {
                    // Select the cell
                    this.engine.store.setState({
                        selection: {
                            primary: cell,
                            ranges: [{ start: cell, end: cell }]
                        }
                    });
                    this.engine.render(); // Re-render to show selection
                }

                // Add column ID and Type for easier lookups
                const cols = this.engine.model.getColumns();
                const colDef = cols[cell.col];
                if (colDef) {
                    args.columnId = colDef.id;
                    args.cellType = colDef.type;
                }
            }
        }

        // Fetch menu items from manager
        const items = this.engine.contextMenu.getMenuForContext({
            type: contextType,
            ...args
        });

        // Emit event for UI to handle display
        if (items.length > 0) {
            this.engine.store.setState({
                // Optional: store active context menu in state if UI pulls from store
                // activeContextMenu: { x: e.clientX, y: e.clientY, items }
            });
            
            this.engine.eventBus.emit('context-menu', {
                x: e.clientX,
                y: e.clientY,
                items,
                context: contextType
            });
        }
    }

    // --- Header Helpers ---

    private handleHeaderMouseDown(e: MouseEvent) {
        const { theme } = this.engine;
        const { scrollLeft } = this.engine.viewport.getState();
        const { colIndex, onEdge, xInCol } = this.getHeaderAt(e.offsetX);
        const visibleCols = this.engine.model.getVisibleColumns();

        // 1. Check Ghost Column Click
        const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
        const x = e.offsetX + scrollLeft - theme.rowHeaderWidth;
        
        if (x >= totalWidth - 5 && x < totalWidth + 55) {
            e.preventDefault();
            e.stopPropagation();

            const currentAdd = this.engine.store.getState().activeAddColumnMenu;
            if (currentAdd) {
                 this.engine.store.setState({ activeAddColumnMenu: null });
                 return;
            }
            
            const offsetInGhost = x - totalWidth;
            const ghostStartX = e.clientX - offsetInGhost;
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            
            const MENU_WIDTH = 300;
            let menuX = ghostStartX;
            if (menuX + MENU_WIDTH > window.innerWidth) {
                menuX = window.innerWidth - MENU_WIDTH - 10;
            }
            const menuY = rect.top + theme.headerHeight;

            this.engine.store.setState({
                activeAddColumnMenu: { x: menuX, y: menuY },
                activeHeaderMenu: null
            });
            return;
        }

        if (colIndex === -1) return;
        const column = visibleCols[colIndex];

        // 2. Start Resizing
        if (onEdge) {
            e.preventDefault();
            e.stopPropagation();
            this.engine.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });

            this.isResizing = true;
            this.resizingColIndex = colIndex;
            this.resizingStartWidth = column.width;
            this.resizingStartX = e.clientX;
            return;
        }

        // 3. Check Menu Click (Right side)
        if (xInCol > column.width - 30) {
            e.preventDefault();
            e.stopPropagation();
            
            const currentMenu = this.engine.store.getState().activeHeaderMenu;
            if (currentMenu && currentMenu.colId === column.id) {
                 this.engine.store.setState({ activeHeaderMenu: null });
                 return;
            }
            
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const colStartX = e.clientX - xInCol;
            const colEndX = colStartX + column.width;
            
            const MENU_WIDTH = 200;
            let menuX = colEndX - MENU_WIDTH;
            if (menuX + MENU_WIDTH > window.innerWidth) menuX = window.innerWidth - MENU_WIDTH - 10;
            const menuY = rect.top + theme.headerHeight;

            this.engine.store.setState({
                activeHeaderMenu: { colId: column.id, x: menuX, y: menuY },
                activeAddColumnMenu: null
            });
            return;
        }

        // 3b. Check Action Button Click
        if (column.headerAction && xInCol >= column.width - 50 && xInCol < column.width - 30) {
            e.preventDefault();
            e.stopPropagation();
            this.engine.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
            this.engine.lifecycle.onColumnAction?.(column.id, column.headerAction.icon);
            return;
        }

        // 4. Prepare for Reorder
        this.engine.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
        this.reorderCandidate = { 
            colIndex, 
            startX: e.clientX,
            dragOffset: xInCol
        };
    }

    private updateReorderState(clientX: number) {
        if (!this.reorderCandidate) return;
        
        const targetIndex = this.calculateReorderTarget(clientX);

        this.engine.store.setState({
            reorderState: {
                colIndex: this.reorderCandidate.colIndex,
                dragX: clientX,
                targetIndex,
                dragOffset: this.reorderCandidate.dragOffset
            }
        });
    }

    private calculateReorderTarget(clientX: number): number {
        const { theme } = this.engine;
        const { scrollLeft } = this.engine.viewport.getState();
        const frozenWidth = this.engine.model.getFrozenWidth();
        const visibleCols = this.engine.model.getVisibleColumns();
        const sourceIndex = this.reorderCandidate?.colIndex ?? -1;

        if (sourceIndex === -1) return -1;

        const draggedCol = visibleCols[sourceIndex];
        const ghostWidth = draggedCol.width; 
        const dragOffset = this.reorderCandidate?.dragOffset ?? (ghostWidth / 2);
        
        // Map ClientX to GridX logic
        const adjustedX = clientX - theme.rowHeaderWidth;
        let gridX = adjustedX;
        if (adjustedX >= frozenWidth) {
            gridX += scrollLeft;
        }
        
        const ghostLeft = gridX - dragOffset;
        const ghostRight = ghostLeft + ghostWidth;

        const candidates: number[] = [];
        let currentX = 0;

        for (let i = 0; i < visibleCols.length; i++) {
            const col = visibleCols[i];
            if (i !== sourceIndex) {
                const colLeft = currentX;
                const colRight = currentX + col.width;
                const overlapStart = Math.max(ghostLeft, colLeft);
                const overlapEnd = Math.min(ghostRight, colRight);
                const overlapWidth = Math.max(0, overlapEnd - overlapStart);
                
                if (overlapWidth > col.width * 0.3) {
                    candidates.push(i);
                }
            }
            currentX += col.width;
        }

        if (candidates.length === 0) return sourceIndex;

        const startX = this.reorderCandidate?.startX ?? 0;
        const isDraggingRight = clientX > startX;

        if (isDraggingRight) {
            return Math.max(...candidates);
        } else {
            return Math.min(...candidates);
        }
    }

    private getHeaderAt(x: number): { colIndex: number; onEdge: boolean; xInCol: number } {
        const { theme } = this.engine;
        const { scrollLeft } = this.engine.viewport.getState();
        const frozenWidth = this.engine.model.getFrozenWidth();
        
        const adjustedX = x - theme.rowHeaderWidth;
        if (adjustedX < 0) return { colIndex: -1, onEdge: false, xInCol: 0 };

        // Map to Grid Coordinates
        let gridX = adjustedX;
        if (adjustedX >= frozenWidth) {
            gridX += scrollLeft;
        }
        
        // Logic below assumes gridX corresponds to cumulative column widths
        let currentX = 0;
        const columns = this.engine.model.getVisibleColumns();
        const edgeThreshold = 5;

        for (let i = 0; i < columns.length; i++) {
            const width = columns[i].width;
            if (gridX >= currentX && gridX < currentX + width) {
                const xInCol = gridX - currentX;
                if (Math.abs(xInCol - width) <= edgeThreshold) {
                    return { colIndex: i, onEdge: true, xInCol };
                }
                if (xInCol <= edgeThreshold && i > 0) {
                    // Check if previous column is visible/valid to resize?
                    // If i is first scrollable column, i-1 is last frozen column.
                    // Resizing boundary between frozen and scrollable?
                    // It should work fine.
                    return { colIndex: i - 1, onEdge: true, xInCol };
                }
                return { colIndex: i, onEdge: false, xInCol };
            }
            currentX += width;
        }

        return { colIndex: -1, onEdge: false, xInCol: 0 };
    }

    private isClickOnFillHandle(x: number, y: number, selection: any): boolean {
        if (!selection || selection.ranges.length === 0) return false;

        const lastRange = selection.ranges[selection.ranges.length - 1];
        const { theme } = this.engine;
        const { scrollTop, scrollLeft } = this.engine.viewport.getState();
        const frozenWidth = this.engine.model.getFrozenWidth();
        const handleSize = 6;

        const adjustedX = x - theme.rowHeaderWidth;
        let gridX = adjustedX;
        if (adjustedX >= frozenWidth) {
            gridX += scrollLeft;
        }
        const gridY = (y - theme.headerHeight) + scrollTop;

        let startX = 0;
        let startY = lastRange.start.row * theme.rowHeight;
        let width = 0;
        let height = (lastRange.end.row - lastRange.start.row + 1) * theme.rowHeight;

        const cols = this.engine.model.getVisibleColumns();
        const allCols = this.engine.model.getColumns();

        startX = 0;
        width = 0;
        for (const col of cols) {
             const trueIndex = allCols.findIndex(c => c.id === col.id);
             if (trueIndex < lastRange.start.col) {
                 startX += col.width;
             } else if (trueIndex <= lastRange.end.col) {
                 width += col.width;
             }
        }

        const handleX = startX + width - handleSize / 2;
        const handleY = startY + height - handleSize / 2;
        const tolerance = 3;

        return (
            gridX >= handleX - tolerance &&
            gridX <= handleX + handleSize + tolerance &&
            gridY >= handleY - tolerance &&
            gridY <= handleY + handleSize + tolerance
        );
    }

    private startFillDrag(selection: any) {
        this.engine.store.setState({ isFilling: true, fillRange: selection });
    }

    private updateFillRange(x: number, y: number, selection: any) {
        const cell = this.engine.getCellPositionAt(x, y);
        if (!cell) return;

        const sourceRange = selection.ranges[selection.ranges.length - 1];
        this.engine.store.setState({
            fillRange: {
                primary: cell,
                ranges: [
                    {
                        start: sourceRange.start,
                        end: { row: Math.max(sourceRange.end.row, cell.row), col: Math.max(sourceRange.end.col, cell.col) }
                    }
                ]
            }
        });
    }

    private updateDragSelection(x: number, y: number) {
        if (!this.dragStart) return;
        const cell = this.engine.getCellPositionAt(x, y);
        if (!cell) return;

        this.engine.store.setState({
            selection: {
                primary: this.dragStart,
                ranges: [
                    {
                        start: { row: Math.min(this.dragStart.row, cell.row), col: Math.min(this.dragStart.col, cell.col) },
                        end: { row: Math.max(this.dragStart.row, cell.row), col: Math.max(this.dragStart.col, cell.col) }
                    }
                ]
            }
        });
    }

    private async completeFill(selection: any, fillRange: any) {
        if (selection && fillRange && fillRange.ranges.length > 0) {
            const source = selection.ranges[selection.ranges.length - 1];
            const target = fillRange.ranges[0];

            // Use GridEngine's fillData for optimistic update + backend sync
            try {
                await this.engine.fillData(source, target);
            this.engine.store.setState({
                    selection: { primary: selection.primary, ranges: [target] }
                });
            } catch (error) {
                console.error('Fill data failed:', error);
            }
        }
        this.engine.store.setState({ isFilling: false, fillRange: null });
    }
}
