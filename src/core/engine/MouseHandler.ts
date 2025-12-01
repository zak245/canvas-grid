import { GridEngine } from './GridEngine';
import { CellPosition } from '../types/grid';
import { GridInputEvent } from '../renderer/types';

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

    // Double Click Detection
    private lastClickTime = 0;
    private lastClickPos: { x: number, y: number } | null = null;

    constructor(private engine: GridEngine) { }

    private createInputEvent(e: MouseEvent): GridInputEvent {
        // Use currentTarget (listener attachment point) to get reliable coordinates
        // This fixes issues where e.target is a child element (HTML/React renderers)
        // causing offsetX/Y to be relative to the child instead of the container.
        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();

        return {
            type: e.type as any,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            button: e.button,
            modifiers: {
                shift: e.shiftKey,
                ctrl: e.ctrlKey,
                alt: e.altKey,
                meta: e.metaKey
            },
            originalEvent: e
        };
    }

    handleMouseDown = (e: MouseEvent) => {
        // Ensure canvas/container has focus
        // The Normalizer also has syncFocus, but explicit focus here ensures immediate response
        if (e.target instanceof HTMLElement) {
            e.target.focus();
        }

        // Normalize Event
        const inputEvent = this.createInputEvent(e);
        const event = this.engine.eventNormalizer.normalizeEvent(inputEvent);
        if (!event) return;

        // Manual Double Click Detection (Robust against DOM replacement)
        const now = Date.now();
        if (this.lastClickPos && 
            Math.abs(event.x - this.lastClickPos.x) < 10 &&
            Math.abs(event.y - this.lastClickPos.y) < 10 &&
            (now - this.lastClickTime) < 400) {
            
            this.handleDoubleClick(e);
            // Reset
            this.lastClickTime = 0;
            this.lastClickPos = null;
            return;
        }
        this.lastClickTime = now;
        this.lastClickPos = { x: event.x, y: event.y };

        // NEW: Handle Action Cell Click
        if (event.action) {
            this.engine.eventBus.emit('cell:action', event.action);
            return;
        }

        const { theme } = this.engine;
        const { scrollTop } = this.engine.viewport.getState();
        
        // Ignore Right Click for Mouse Down (handled in onContextMenu)
        if (e.button === 2) {
            return;
        }

        // 0. Check Row Header Interaction
        if (event.target === 'corner') {
            // Toggle Select All on any click in the corner region
                this.engine.toggleSelectAllRows();
                return;
        }
        
        if (event.target === 'row-header') {
            const rowIndex = event.row;
            const rowCount = this.engine.rows.getRowCount();
            
            if (rowIndex >= 0 && rowIndex < rowCount) {
                // NEW: Check for Group Header
                const row = this.engine.rows.getRow(rowIndex);
                if (row?.isGroupHeader && row.groupKey) {
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
                         if (event.x >= actionX - 8 && event.x <= actionX + 8) {
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
                     
                     if (event.x >= enrichX - 8 && event.x <= enrichX + 8) {
                         this.engine.triggerRowAction(rowIndex, 'enrich');
                         actionHandled = true;
                     } else if (event.x >= detailX - 8 && event.x <= detailX + 8) {
                         this.engine.triggerRowAction(rowIndex, 'detail');
                         actionHandled = true;
                     }
                 }

                 if (actionHandled) return;

                 // Check Row Checkbox (Simulate Multi-Select)
                 if (event.x <= 30) {
                     this.engine.toggleRowSelection(rowIndex, true); // Force multi
                     return;
                 }

                 // Start Row Reorder or Selection
                 this.rowReorderCandidate = {
                     rowIndex,
                     startY: e.clientY,
                     dragOffset: (event.y - theme.headerHeight + scrollTop) % theme.rowHeight
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

        // 1. Check for Header Interaction
        if (event.target === 'header') {
            this.handleHeaderMouseDown(e, event.x);
            return;
        }

        // Close menus on any grid body interaction
        const { activeHeaderMenu, activeAddColumnMenu } = this.engine.store.getState();
        if (activeHeaderMenu || activeAddColumnMenu) {
            this.engine.store.setState({ activeHeaderMenu: null, activeAddColumnMenu: null });
        }

        // NEW: Check for Group Header Click in Body
        const bodyY = event.y - theme.headerHeight + scrollTop;
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
        const totalRows = this.engine.rows.getRowCount();
        const addRowY = totalRows * theme.rowHeight;
        const gridY = (event.y - theme.headerHeight) + scrollTop;
        
        if (gridY >= addRowY && gridY < addRowY + theme.rowHeight) {
            // Input Box & Button are drawn at visual X = theme.rowHeaderWidth + 12
            const startX = theme.rowHeaderWidth + 12;
            
            // 1. Check Input Box (width 40)
            if (event.x >= startX && event.x <= startX + 40) {
                e.preventDefault();
                
                // Create inline input element
                const input = document.createElement('input');
                input.type = 'number';
                input.value = String(this.engine.store.getState().rowsToAdd);
                input.style.position = 'absolute';
                input.style.left = `${e.clientX - event.x + startX}px`; 
                
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                
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
            if (event.x >= startX + 50 && event.x <= startX + 150) {
                e.preventDefault(); // Prevent double firing
                e.stopPropagation();
                const count = this.engine.store.getState().rowsToAdd;
                this.engine.addMultipleRows(count).catch(console.error);
                return;
            }
            
            return;
        }

        // Check for Cell Click
        if (event.target === 'cell' && event.col >= 0 && event.row >= 0) {
            const cell = { col: event.col, row: event.row };
            const { selection } = this.engine.store.getState();

            // 3. Check if clicking on fill handle
            if (selection && this.isClickOnFillHandle(event.x, event.y, selection)) {
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
        }
    };

    handleMouseMove = (e: MouseEvent) => {
        const inputEvent = this.createInputEvent(e);
        const event = this.engine.eventNormalizer.normalizeEvent(inputEvent);
        if (!event) return;

        const { theme } = this.engine;
        const { isFilling, selection } = this.engine.store.getState();
        const { scrollTop } = this.engine.viewport.getState();
        const canvas = e.target as HTMLElement;

        // Update hover position for tooltips and hovered cell
        const hoveredCell = (event.target === 'cell' && event.col >= 0) ? { col: event.col, row: event.row } : null;
        
        this.engine.store.setState({
            hoverPosition: { x: event.x, y: event.y },
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
            canvas.style.cursor = 'grabbing';
            return;
        }

        // 0b. Handle Row Selection Drag (only if not reordering)
        if (this.isSelectingRows && this.rowSelectionStart !== -1 && !this.isReorderingRow) {
             const gridY = event.y - theme.headerHeight + scrollTop;
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
            this.updateReorderState(e.clientX, event.x);
            canvas.style.cursor = 'grabbing';
            return;
        }

        // 3. Handle Cursor Styling
        if (event.target === 'row-header') {
             const enrichX = theme.rowHeaderWidth - 34;
             const detailX = theme.rowHeaderWidth - 16;
             
             if ((event.x >= enrichX - 8 && event.x <= enrichX + 8) || 
                 (event.x >= detailX - 8 && event.x <= detailX + 8)) {
                 canvas.style.cursor = 'pointer';
             } else {
                 canvas.style.cursor = 'default';
             }
        } else if (event.target === 'header') {
            const { colIndex, onEdge } = this.getHeaderAt(event.x);
            
            if (onEdge) {
                canvas.style.cursor = 'col-resize';
            } else if (colIndex >= 0) {
                canvas.style.cursor = 'default'; 
            } else {
                // Check Ghost Column
                const visibleCols = this.engine.model.getVisibleColumns();
                const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
                const { scrollLeft } = this.engine.viewport.getState();
                const x = event.x + scrollLeft - theme.rowHeaderWidth;
                
                if (x >= totalWidth && x < totalWidth + 50) {
                    canvas.style.cursor = 'pointer'; // Ghost column
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        } else if (selection && this.isClickOnFillHandle(event.x, event.y, selection)) {
            canvas.style.cursor = 'crosshair';
        } else if (!isFilling) {
            canvas.style.cursor = 'default';
        }

        // 4. Handle Cell Drag Operations
        if (isFilling && selection) {
            this.updateFillRange(event.x, event.y, selection);
        } else if (this.isDragging && this.dragStart) {
            this.updateDragSelection(event.x, event.y);
        }
    };

    handleMouseUp = (e: MouseEvent) => {
        const inputEvent = this.createInputEvent(e);
        const event = this.engine.eventNormalizer.normalizeEvent(inputEvent);
        if (!event) return; // Should we continue to reset state even if event is null? Yes.

        const { isFilling, selection, fillRange } = this.engine.store.getState();
        const { theme } = this.engine;
        const { scrollTop } = this.engine.viewport.getState();

        // Reset Row Selection Drag
        this.isSelectingRows = false;
        this.rowSelectionStart = -1;

        // Handle Row Reorder Drop
        if (this.isReorderingRow && this.rowReorderCandidate) {
            const targetRow = Math.floor((event.y - theme.headerHeight + scrollTop) / theme.rowHeight);
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
            const targetIndex = this.calculateReorderTarget(e.clientX, event.x);
            if (targetIndex !== this.reorderCandidate.colIndex) {
                this.engine.moveColumn(this.reorderCandidate.colIndex, targetIndex);
            }
            
            this.isReordering = false;
            this.reorderCandidate = null;
            this.engine.store.setState({ reorderState: null });
            return;
        }

        // Handle Column Selection (Click on Header)
        if (event.target === 'header' && !this.isResizing && !this.isReordering) {
            const { colIndex, xInCol } = this.getHeaderAt(event.x);
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
        const inputEvent = this.createInputEvent(e);
        const event = this.engine.eventNormalizer.normalizeEvent(inputEvent);
        if (!event) return;

        if (event.target === 'header') {
            const { colIndex, onEdge } = this.getHeaderAt(event.x);
            if (onEdge && colIndex >= 0) {
                const column = this.engine.model.getVisibleColumns()[colIndex];
                if (column) {
                    this.engine.autoResizeColumn(column.id);
                }
            }
        } else if (event.target === 'cell' && event.col >= 0 && event.row >= 0) {
            // Cell Double Click - Start Edit
             this.engine.startEdit(event.row, event.col);
        }
    };

    // NEW: Handle Context Menu Event
    onContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        this.handleContextMenu(e);
    };

    private handleContextMenu(e: MouseEvent) {
        const inputEvent = this.createInputEvent(e);
        const event = this.engine.eventNormalizer.normalizeEvent(inputEvent);
        if (!event) return;
        
        // Determine Context
        let contextType: 'cell' | 'row-header' | 'column-header' | 'grid-body' = 'grid-body';
        let args: any = {};

        if (event.target === 'header') {
            // Disabled context menu for column headers as requested
            return;
        } else if (event.target === 'row-header') {
            contextType = 'row-header';
            args.row = event.row;
        } else if (event.target === 'cell') {
            contextType = 'cell';
            args.row = event.row;
            args.col = event.col;

            // Check if we need to select the cell (if not already part of selection)
            const { selection } = this.engine.store.getState();
            let isSelected = false;
            if (selection) {
                // Check if cell is in any range
                for (const range of selection.ranges) {
                    if (args.row >= range.start.row && args.row <= range.end.row &&
                        args.col >= range.start.col && args.col <= range.end.col) {
                        isSelected = true;
                        break;
                    }
                }
            }

            if (!isSelected) {
                // Select the cell
                this.engine.store.setState({
                    selection: {
                        primary: { row: args.row, col: args.col },
                        ranges: [{ start: { row: args.row, col: args.col }, end: { row: args.row, col: args.col } }]
                    }
                });
                this.engine.render(); // Re-render to show selection
            }

            // Add column ID and Type for easier lookups
            const cols = this.engine.model.getVisibleColumns();
            const colDef = cols[args.col];
            if (colDef) {
                args.columnId = colDef.id;
                args.cellType = colDef.type;
            }
        }

        // Fetch menu items from manager
        const items = this.engine.contextMenu.getMenuForContext({
            type: contextType,
            ...args
        });

        // Emit event for UI to handle display
        if (items.length > 0) {
            this.engine.eventBus.emit('context-menu', {
                x: e.clientX,
                y: e.clientY,
                items,
                context: contextType
            });
        }
    }

    // --- Header Helpers ---

    private handleHeaderMouseDown(e: MouseEvent, x: number) {
        const { theme } = this.engine;
        const { scrollLeft } = this.engine.viewport.getState();
        const { colIndex, onEdge, xInCol } = this.getHeaderAt(x);
        const visibleCols = this.engine.model.getVisibleColumns();

        // 1. Check Ghost Column Click
        const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
        const gridX = x + scrollLeft - theme.rowHeaderWidth;
        
        if (gridX >= totalWidth - 5 && gridX < totalWidth + 55) {
            e.preventDefault();
            e.stopPropagation();

            const currentAdd = this.engine.store.getState().activeAddColumnMenu;
            if (currentAdd) {
                 this.engine.store.setState({ activeAddColumnMenu: null });
                 return;
            }
            
            const offsetInGhost = gridX - totalWidth;
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

    private updateReorderState(clientX: number, gridX: number) {
        if (!this.reorderCandidate) return;
        
        const targetIndex = this.calculateReorderTarget(clientX, gridX);

        this.engine.store.setState({
            reorderState: {
                colIndex: this.reorderCandidate.colIndex,
                dragX: clientX,
                targetIndex,
                dragOffset: this.reorderCandidate.dragOffset
            }
        });
    }

    private calculateReorderTarget(clientX: number, gridX: number): number {
        const { theme } = this.engine;
        const { scrollLeft } = this.engine.viewport.getState();
        const frozenWidth = this.engine.model.getFrozenWidth();
        const visibleCols = this.engine.model.getVisibleColumns();
        const sourceIndex = this.reorderCandidate?.colIndex ?? -1;

        if (sourceIndex === -1) return -1;

        const draggedCol = visibleCols[sourceIndex];
        const ghostWidth = draggedCol.width; 
        const dragOffset = this.reorderCandidate?.dragOffset ?? (ghostWidth / 2);
        
        // Map ClientX to GridX logic - already done by normalizer logic roughly
        // But let's use the passed gridX (which is offsetX relative to canvas)
        // Adjust gridX to account for scroll
        const adjustedX = gridX - theme.rowHeaderWidth;
        let effectiveGridX = adjustedX;
        if (adjustedX >= frozenWidth) {
            effectiveGridX += scrollLeft;
        }
        
        const ghostLeft = effectiveGridX - dragOffset;
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
        // Re-use normalizer? Or logic matches `getCellPositionAt`
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
