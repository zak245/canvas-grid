import { GridEngine } from './GridEngine';
import { GridInputEvent } from '../renderer/types';
import { CellRenderContext, CellTypeName } from '../cell-types/types';
import { cellTypeRegistry } from '../cell-types/registry';

export interface NormalizedEvent {
    type: string;
    row: number;
    col: number;
    columnId: string;
    x: number;
    y: number;
    originalEvent: Event;
    cellType: CellTypeName;
    target: 'cell' | 'header' | 'row-header' | 'corner';
    action?: { action: string; payload?: any };
}

export class EventNormalizer {
    private engine: GridEngine;
    private hoveredCell: { col: number; row: number } | null = null;
    private focusTarget: HTMLElement | null = null;

    constructor(engine: GridEngine) {
        this.engine = engine;
    }

    /**
     * Set the element that should receive focus (hidden input or container)
     */
    public setFocusTarget(element: HTMLElement | null) {
        this.focusTarget = element;
    }

    /**
     * Sync focus to the target element
     */
    public syncFocus() {
        if (this.focusTarget && document.activeElement !== this.focusTarget) {
            // Only focus if we don't have a meaningful focus elsewhere (e.g. an editor)
            // Check if active element is inside container
            const container = this.engine.getRenderer()?.getElement()?.parentElement;
            if (container && !container.contains(document.activeElement)) {
                this.focusTarget.focus({ preventScroll: true });
            }
        }
    }

    /**
     * Normalize a raw event into a grid event
     */
    public normalizeEvent(event: GridInputEvent): NormalizedEvent | null {
        const { x, y, originalEvent } = event;
        const { theme } = this.engine;
        const { scrollTop, scrollLeft } = this.engine.viewport.getState();

        // 1. Determine Region
        let region: 'cell' | 'header' | 'row-header' | 'corner' = 'cell';
        if (x < theme.rowHeaderWidth && y < theme.headerHeight) region = 'corner';
        else if (x < theme.rowHeaderWidth) region = 'row-header';
        else if (y < theme.headerHeight) region = 'header';

        // 2. Calculate Grid Coordinates
        let gridX = x - theme.rowHeaderWidth;
        let gridY = y - theme.headerHeight;

        // Adjust for scroll if in scrollable area
        if (region === 'cell' || region === 'header') {
            const frozenWidth = this.engine.model.getFrozenWidth();
            if (gridX >= frozenWidth) {
                gridX += scrollLeft;
            }
        }
        if (region === 'cell' || region === 'row-header') {
            gridY += scrollTop;
        }

        // 3. Map to Row/Col
        const rowIndex = Math.floor(gridY / theme.rowHeight);
        
        // Map X to Column
        let colIndex = -1;
        let columnId = '';
        let cellType: CellTypeName = 'text'; // Default
        let cellRect = { x: 0, y: 0, width: 0, height: 0 };

        if (region === 'cell' || region === 'header') {
            const visibleColumns = this.engine.model.getVisibleColumns();
            let currentX = 0;
            for (let i = 0; i < visibleColumns.length; i++) {
                const col = visibleColumns[i];
                if (gridX >= currentX && gridX < currentX + col.width) {
                    colIndex = i;
                    columnId = col.id;
                    cellType = col.type as CellTypeName;
                    cellRect = {
                        x: region === 'cell' ? currentX + theme.rowHeaderWidth + (gridX >= this.engine.model.getFrozenWidth() ? -scrollLeft : 0) : 0, // Simplified X for context
                        y: 0, // Calculated below
                        width: col.width,
                        height: theme.rowHeight
                    };
                    // Re-calculate precise screen X for the cell start
                    // If frozen, it's theme.rowHeaderWidth + currentX
                    // If scrollable, it's theme.rowHeaderWidth + this.engine.model.getFrozenWidth() + (currentX - frozenWidth - scrollLeft)
                    // But let's use the reverse logic of gridX
                    // gridX is adjusted for scroll.
                    // cellX (screen) should be:
                    // If we are in scrollable area: x - (gridX - currentX)
                    cellRect.x = x - (gridX - currentX);
                    break;
                }
                currentX += col.width;
            }
        }
        
        if (region === 'cell') {
            // Calculate Screen Y for cell start
            // gridY is adjusted for scroll.
            // y is screen Y.
            // cellY (screen) = y - (gridY % theme.rowHeight)
            cellRect.y = y - (gridY % theme.rowHeight);
        }

        // 4. Validation
        const rowCount = this.engine.rows.getRowCount();
        if (region === 'cell') {
            if (rowIndex < 0 || rowIndex >= rowCount) return null;
            if (colIndex === -1) return null;
        }

        // 5. Hit Test / Action Detection
        let actionResult = null;
        if (region === 'cell') {
            // Check for DOM action first (HTML/React mode)
            if (originalEvent.target instanceof HTMLElement) {
                const actionTarget = originalEvent.target.closest('[data-action]');
                if (actionTarget instanceof HTMLElement) {
                    const action = actionTarget.dataset.action;
                    if (action) {
                         actionResult = { 
                             action, 
                             payload: { 
                                 id: action,
                                 rowIndex,
                                 columnId
                             } 
                         };
                    }
                }
            }

            // Fallback to Canvas Hit Test if no DOM action found
            if (!actionResult) {
                actionResult = this.handleHitTest(rowIndex, columnId, cellType, x, y, cellRect, originalEvent);
            }
        }

        // 6. Hover Tracking
        this.updateHoverState(rowIndex, colIndex, region);

        return {
            type: event.type,
            row: rowIndex,
            col: colIndex,
            columnId,
            x,
            y,
            originalEvent,
            cellType,
            target: region,
            action: actionResult || undefined
        };
    }

    private updateHoverState(rowIndex: number, colIndex: number, region: string) {
        const isCell = region === 'cell' && rowIndex >= 0 && colIndex >= 0;
        const newHover = isCell ? { row: rowIndex, col: colIndex } : null;

        const prevHover = this.hoveredCell;
        
        // Check for change
        if (prevHover?.row !== newHover?.row || prevHover?.col !== newHover?.col) {
            // Leave old
            if (prevHover) {
                this.engine.eventBus.emit('hover:leave', { ...prevHover });
                const prevCol = this.engine.model.getVisibleColumns()[prevHover.col];
                if (prevCol) {
                    const cellType = cellTypeRegistry.get(prevCol.type as CellTypeName);
                    // We don't have context here easily to call onHover leave, usually just rerender
                }
            }

            // Enter new
            if (newHover) {
                this.engine.eventBus.emit('hover:enter', { ...newHover });
                
                const col = this.engine.model.getVisibleColumns()[newHover.col];
                if (col) {
                    const cellType = cellTypeRegistry.get(col.type as CellTypeName);
                    // Retrieve context and call onHover if needed
                    // For now, we primarily update state in engine to trigger render
                }
            }

            this.hoveredCell = newHover;
            // Engine store update happens in InputController or MouseHandler usually, 
            // but Normalizer can optionally drive it if we want to centralize.
            // For now, let's rely on the consumer of normalizeEvent to update store
            // or expose a method.
        }
    }

    private handleHitTest(
        rowIndex: number, 
        columnId: string, 
        type: CellTypeName, 
        x: number, 
        y: number, 
        cellRect: { x: number; y: number; width: number; height: number },
        event: Event
    ): { action: string; payload?: any } | null {
        // Only check click/mousedown
        if (event.type !== 'mousedown' && event.type !== 'click') return null;

        const definition = cellTypeRegistry.getDefinition(type);
        const interactive = definition as any; // Check for interactive interface
        
        if (interactive.onHitTest) {
            const row = this.engine.rows.getRow(rowIndex);
            if (!row) return null;
            
            const cell = row.cells.get(columnId);
            const column = this.engine.model.getColumn(columnId);
            
            if (cell && column) {
                // Construct Context
                const context: CellRenderContext<any> = {
                    value: cell.value,
                    displayValue: definition.format(cell.value, column.typeOptions),
                    x: cellRect.x,
                    y: cellRect.y,
                    width: cellRect.width,
                    height: cellRect.height,
                    isSelected: false, // Approximate
                    isFocused: false,
                    isEditing: false,
                    isHovered: false,
                    hasError: false,
                    theme: this.engine.theme,
                    rowIndex,
                    columnId,
                    options: column.typeOptions
                };

                return interactive.onHitTest(context, x, y);
            }
        }
        return null;
    }
}

