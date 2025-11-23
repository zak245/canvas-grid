import { GridEngine } from './GridEngine';
import { CellPosition } from '../types/grid';

export class KeyboardHandler {
    constructor(private engine: GridEngine) { }

    handleKeyDown = (e: KeyboardEvent) => {
        const selection = this.engine.store.getState().selection;
        if (!selection || !selection.primary) return;

        const { primary } = selection;
        const { row, col } = primary;
        const rowCount = this.engine.model.getRowCount();
        const colCount = this.engine.model.getColumns().length;

        let newRow = row;
        let newCol = col;
        let shouldPreventDefault = false;
        let shouldExtendSelection = e.shiftKey;

        // Arrow Key Navigation
        if (e.key === 'ArrowUp') {
            newRow = Math.max(0, row - 1);
            shouldPreventDefault = true;
        } else if (e.key === 'ArrowDown') {
            newRow = Math.min(rowCount - 1, row + 1);
            shouldPreventDefault = true;
        } else if (e.key === 'ArrowLeft') {
            newCol = Math.max(0, col - 1);
            shouldPreventDefault = true;
        } else if (e.key === 'ArrowRight') {
            newCol = Math.min(colCount - 1, col + 1);
            shouldPreventDefault = true;
        }
        // Tab Navigation
        else if (e.key === 'Tab') {
            if (e.shiftKey) {
                newCol = Math.max(0, col - 1);
            } else {
                newCol = Math.min(colCount - 1, col + 1);
            }
            shouldPreventDefault = true;
        }
        // Enter Navigation
        else if (e.key === 'Enter') {
            if (e.shiftKey) {
                newRow = Math.max(0, row - 1);
            } else {
                newRow = Math.min(rowCount - 1, row + 1);
            }
            shouldPreventDefault = true;
        }
        // Home/End Keys
        else if (e.key === 'Home') {
            if (e.metaKey || e.ctrlKey) {
                newRow = 0;
                newCol = 0;
            } else {
                newCol = 0;
            }
            shouldPreventDefault = true;
        } else if (e.key === 'End') {
            if (e.metaKey || e.ctrlKey) {
                newRow = rowCount - 1;
                newCol = colCount - 1;
            } else {
                newCol = colCount - 1;
            }
            shouldPreventDefault = true;
        }
        // Page Up/Down
        else if (e.key === 'PageUp') {
            const viewportHeight = this.engine.viewport.getState().height;
            const rowsPerPage = Math.floor(viewportHeight / this.engine.theme.rowHeight);
            newRow = Math.max(0, row - rowsPerPage);
            shouldPreventDefault = true;
        } else if (e.key === 'PageDown') {
            const viewportHeight = this.engine.viewport.getState().height;
            const rowsPerPage = Math.floor(viewportHeight / this.engine.theme.rowHeight);
            newRow = Math.min(rowCount - 1, row + rowsPerPage);
            shouldPreventDefault = true;
        }
        // Copy/Paste/Cut
        else if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
            this.handleCopy();
            shouldPreventDefault = true;
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
            // Paste is async, don't await to avoid blocking
            this.handlePaste().catch(err => console.error('Paste error:', err));
            shouldPreventDefault = true;
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
            this.handleCut();
            shouldPreventDefault = true;
        }
        // Select All
        else if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
            this.selectAll();
            shouldPreventDefault = true;
        }
        // Escape
        else if (e.key === 'Escape') {
            // TODO: Clear editing cell when implemented
            shouldPreventDefault = true;
        }
        // Delete/Backspace
        else if (e.key === 'Delete' || e.key === 'Backspace') {
            this.clearSelectedCells();
            shouldPreventDefault = true;
        }

        if (shouldPreventDefault) {
            e.preventDefault();
            e.stopPropagation();
        }

        // Update selection if cell position changed
        if (newRow !== row || newCol !== col) {
            this.updateSelection(primary, row, col, newRow, newCol, shouldExtendSelection, e.key);
        }
    };

    private updateSelection(
        primary: CellPosition,
        oldRow: number,
        oldCol: number,
        newRow: number,
        newCol: number,
        shouldExtend: boolean,
        key: string
    ) {
        const selection = this.engine.store.getState().selection!;

        if (shouldExtend && (key.startsWith('Arrow') || key === 'PageUp' || key === 'PageDown')) {
            // Extend selection range - preserve anchor point
            const currentRange = selection.ranges[0];
            let anchorRow: number;
            let anchorCol: number;

            if (currentRange && (currentRange.start.row !== currentRange.end.row ||
                currentRange.start.col !== currentRange.end.col)) {
                // Already in range - find anchor (opposite of primary)
                if (primary.row === currentRange.start.row && primary.col === currentRange.start.col) {
                    anchorRow = currentRange.end.row;
                    anchorCol = currentRange.end.col;
                } else {
                    anchorRow = currentRange.start.row;
                    anchorCol = currentRange.start.col;
                }
            } else {
                // First Shift+Arrow - current cell is anchor
                anchorRow = oldRow;
                anchorCol = oldCol;
            }

            this.engine.store.setState({
                selection: {
                    primary: { row: newRow, col: newCol },
                    ranges: [
                        {
                            start: { row: Math.min(anchorRow, newRow), col: Math.min(anchorCol, newCol) },
                            end: { row: Math.max(anchorRow, newRow), col: Math.max(anchorCol, newCol) }
                        }
                    ]
                }
            });
        } else {
            // Move selection to new cell
            this.engine.store.setState({
                selection: {
                    primary: { row: newRow, col: newCol },
                    ranges: [
                        { start: { row: newRow, col: newCol }, end: { row: newRow, col: newCol } }
                    ]
                }
            });
        }

        this.scrollToCell(newRow, newCol);
    }

    private scrollToCell(row: number, col: number) {
        const { scrollTop, scrollLeft, width, height } = this.engine.viewport.getState();
        const { rowHeight, headerHeight, rowHeaderWidth } = this.engine.theme;
        const columns = this.engine.model.getColumns();

        const cellTop = row * rowHeight;
        const cellBottom = cellTop + rowHeight;
        let cellLeft = 0;
        for (let i = 0; i < col; i++) {
            cellLeft += columns[i].width;
        }
        const cellRight = cellLeft + columns[col].width;

        const viewportTop = scrollTop;
        const viewportBottom = scrollTop + height - headerHeight;
        const viewportLeft = scrollLeft;
        const viewportRight = scrollLeft + width - rowHeaderWidth;

        let newScrollTop = scrollTop;
        let newScrollLeft = scrollLeft;

        if (cellTop < viewportTop) {
            newScrollTop = cellTop;
        } else if (cellBottom > viewportBottom) {
            newScrollTop = cellBottom - (height - headerHeight);
        }

        if (cellLeft < viewportLeft) {
            newScrollLeft = cellLeft;
        } else if (cellRight > viewportRight) {
            newScrollLeft = cellRight - (width - rowHeaderWidth);
        }

        if (newScrollTop !== scrollTop || newScrollLeft !== scrollLeft) {
            this.engine.scroll(newScrollTop, newScrollLeft);
        }
    }

    private handleCopy() {
        const selection = this.engine.store.getState().selection;
        if (!selection || selection.ranges.length === 0) return;

        const range = selection.ranges[0];
        const rows = this.engine.model.getAllRows();
        const columns = this.engine.model.getColumns();

        let tsvContent = '';
        for (let r = range.start.row; r <= range.end.row; r++) {
            const row = rows[r];
            if (!row) continue;

            const rowData: string[] = [];
            for (let c = range.start.col; c <= range.end.col; c++) {
                const col = columns[c];
                const cell = row.cells.get(col.id);
                rowData.push(cell?.value?.toString() || '');
            }
            tsvContent += rowData.join('\t') + '\n';
        }

        navigator.clipboard.writeText(tsvContent).catch(err => {
            console.error('Failed to copy:', err);
        });

        console.log('Copied to clipboard');
    }

    private async handlePaste() {
        const selection = this.engine.store.getState().selection;
        if (!selection || !selection.primary) return;

        try {
            // Read from clipboard
            const text = await navigator.clipboard.readText();
            if (!text) return;

            // Parse TSV data (tab-separated, newline-separated)
            const rows = text.split('\n').filter(row => row.length > 0);
            const data: string[][] = rows.map(row => row.split('\t'));

            if (data.length === 0) return;

            const pasteRows = data.length;
            const pasteCols = Math.max(...data.map(row => row.length));

            const { primary } = selection;
            const columns = this.engine.model.getColumns();
            const totalRows = this.engine.model.getRowCount();

            // Determine paste mode:
            // 1. Single cell paste: paste data starting from primary cell
            // 2. Range paste: if selection range matches paste size, map 1:1
            // 3. Overflow: paste extends beyond selection

            const range = selection.ranges[0];
            const selectionRows = range.end.row - range.start.row + 1;
            const selectionCols = range.end.col - range.start.col + 1;

            let startRow = primary.row;
            let startCol = primary.col;

            // If selection is bigger than 1 cell, start from selection start
            if (selectionRows > 1 || selectionCols > 1) {
                startRow = range.start.row;
                startCol = range.start.col;
            }

            // Apply paste data (validation happens automatically in setCellValue)
            for (let r = 0; r < pasteRows; r++) {
                const targetRow = startRow + r;
                if (targetRow >= totalRows) break;

                const rowData = data[r];
                for (let c = 0; c < rowData.length; c++) {
                    const targetCol = startCol + c;
                    if (targetCol >= columns.length) break;

                    const pastedValue = rowData[c];
                    const column = columns[targetCol];

                    // Set cell value - validation happens automatically in model
                    this.engine.model.setCellValue(targetRow, column.id, pastedValue);
                }
            }

            // Update selection to cover pasted area
            const newEndRow = Math.min(startRow + pasteRows - 1, totalRows - 1);
            const newEndCol = Math.min(startCol + pasteCols - 1, columns.length - 1);

            this.engine.store.setState({
                selection: {
                    primary: { row: startRow, col: startCol },
                    ranges: [
                        { start: { row: startRow, col: startCol }, end: { row: newEndRow, col: newEndCol } }
                    ]
                }
            });

            console.log(`Pasted ${pasteRows} rows × ${pasteCols} cols`);
        } catch (err) {
            console.error('Failed to paste:', err);
        }
    }

    private handleCut() {
        this.handleCopy();
        this.clearSelectedCells();
    }

    private selectAll() {
        const rowCount = this.engine.model.getRowCount();
        const colCount = this.engine.model.getColumns().length;

        this.engine.store.setState({
            selection: {
                primary: { row: 0, col: 0 },
                ranges: [
                    { start: { row: 0, col: 0 }, end: { row: rowCount - 1, col: colCount - 1 } }
                ]
            }
        });
    }

    private clearSelectedCells() {
        const selection = this.engine.store.getState().selection;
        if (!selection || selection.ranges.length === 0) return;

        const range = selection.ranges[0];
        const columns = this.engine.model.getColumns();

        for (let r = range.start.row; r <= range.end.row; r++) {
            for (let c = range.start.col; c <= range.end.col; c++) {
                const col = columns[c];
                this.engine.model.setCellValue(r, col.id, '');
            }
        }
    }
}
