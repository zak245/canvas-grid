import { GridEngine } from './GridEngine';
import { CellPosition } from '../types/grid';

export class MouseHandler {
    private isDragging = false;
    private dragStart: CellPosition | null = null;

    constructor(private engine: GridEngine) { }

    handleMouseDown = (e: MouseEvent) => {
        const cell = this.getCellAt(e.offsetX, e.offsetY);
        if (!cell) return;

        const { selection } = this.engine.store.getState();

        // Check if clicking on fill handle
        if (selection && this.isClickOnFillHandle(e.offsetX, e.offsetY, selection)) {
            this.startFillDrag(selection);
            return;
        }

        // Start cell selection
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
        const { isFilling, selection } = this.engine.store.getState();

        // Update hover position for tooltips
        this.engine.store.setState({
            hoverPosition: { x: e.offsetX, y: e.offsetY }
        });

        // Update cursor style if hovering over fill handle
        const canvas = e.target as HTMLCanvasElement;
        if (selection && this.isClickOnFillHandle(e.offsetX, e.offsetY, selection)) {
            canvas.style.cursor = 'crosshair';
        } else if (!isFilling) {
            canvas.style.cursor = 'default';
        }

        if (isFilling && selection) {
            this.updateFillRange(e.offsetX, e.offsetY, selection);
        } else if (this.isDragging && this.dragStart) {
            this.updateDragSelection(e.offsetX, e.offsetY);
        }
    };

    handleMouseUp = () => {
        const { isFilling, selection, fillRange } = this.engine.store.getState();

        if (isFilling) {
            this.completeFill(selection, fillRange);
        }

        this.isDragging = false;
        this.dragStart = null;
    };

    private getCellAt(x: number, y: number): CellPosition | null {
        const { scrollTop, scrollLeft } = this.engine.viewport.getState();
        const { theme } = this.engine;

        // Adjust for React headers
        const adjustedX = x - theme.rowHeaderWidth;
        const adjustedY = y - theme.headerHeight;

        if (adjustedX < 0 || adjustedY < 0) {
            return null;
        }

        const gridX = adjustedX + scrollLeft;
        const gridY = adjustedY + scrollTop;

        const rowIndex = Math.floor(gridY / theme.rowHeight);

        let currentX = 0;
        let colIndex = -1;
        const columns = this.engine.model.getColumns();

        for (let i = 0; i < columns.length; i++) {
            const width = columns[i].width;
            if (gridX >= currentX && gridX < currentX + width) {
                colIndex = i;
                break;
            }
            currentX += width;
        }

        if (rowIndex >= 0 && colIndex >= 0 && rowIndex < this.engine.model.getRowCount()) {
            return { col: colIndex, row: rowIndex };
        }
        return null;
    }

    private isClickOnFillHandle(x: number, y: number, selection: any): boolean {
        if (!selection || selection.ranges.length === 0) return false;

        const lastRange = selection.ranges[selection.ranges.length - 1];
        const { theme } = this.engine;
        const { scrollTop, scrollLeft } = this.engine.viewport.getState();
        const handleSize = 6;

        // Convert mouse coordinates to grid coordinates
        // Mouse x,y are in canvas space (includes headers but not scroll)
        // We need to convert to grid space (no headers, includes scroll)
        const gridX = (x - theme.rowHeaderWidth) + scrollLeft;
        const gridY = (y - theme.headerHeight) + scrollTop;

        // EXACTLY match CanvasRenderer.ts lines 78-106
        // Calculate range bounds in grid coordinates
        let startX = 0;
        let startY = lastRange.start.row * theme.rowHeight;
        let width = 0;
        let height = (lastRange.end.row - lastRange.start.row + 1) * theme.rowHeight;

        const cols = this.engine.model.getColumns();
        for (let i = 0; i < cols.length; i++) {
            if (i < lastRange.start.col) {
                startX += cols[i].width;
            } else if (i <= lastRange.end.col) {
                width += cols[i].width;
            }
        }

        // Handle position in grid coordinates
        const handleX = startX + width - handleSize / 2;
        const handleY = startY + height - handleSize / 2;

        // Compare grid coordinates with grid handle position
        const tolerance = 3;

        return (
            gridX >= handleX - tolerance &&
            gridX <= handleX + handleSize + tolerance &&
            gridY >= handleY - tolerance &&
            gridY <= handleY + handleSize + tolerance
        );
    }

    private startFillDrag(selection: any) {
        this.engine.store.setState({
            isFilling: true,
            fillRange: selection
        });
    }

    private updateFillRange(x: number, y: number, selection: any) {
        const cell = this.getCellAt(x, y);
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

        const cell = this.getCellAt(x, y);
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

    private completeFill(selection: any, fillRange: any) {
        if (selection && fillRange && fillRange.ranges.length > 0) {
            const source = selection.ranges[selection.ranges.length - 1];
            const target = fillRange.ranges[0];

            this.engine.model.fillData(source, target);

            this.engine.store.setState({
                selection: {
                    primary: selection.primary,
                    ranges: [target]
                }
            });
        }

        this.engine.store.setState({ isFilling: false, fillRange: null });
    }
}
