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
        // Enter: Start Editing
        else if (e.key === 'Enter') {
            const visibleCols = this.engine.model.getVisibleColumns();
            const allCols = this.engine.model.getColumns();
            const trueColId = allCols[col].id;
            const visibleIndex = visibleCols.findIndex(c => c.id === trueColId);
            
            if (visibleIndex !== -1) {
                this.engine.startEdit(row, visibleIndex);
                shouldPreventDefault = true;
            }
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

    onCopy(e: ClipboardEvent) {
        const selection = this.engine.store.getState().selection;
        if (!selection || selection.ranges.length === 0) return;

        // Prevent default browser copy (which would copy the focused UI element)
        e.preventDefault();

        const rows = this.engine.model.getAllRows();
        const columns = this.engine.model.getColumns();
        const rowCount = this.engine.model.getRowCount();

        // 1. Determine bounding box
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;
        const selectedCells = new Set<string>();

        for (const range of selection.ranges) {
            minRow = Math.min(minRow, range.start.row);
            maxRow = Math.max(maxRow, range.end.row);
            minCol = Math.min(minCol, range.start.col);
            maxCol = Math.max(maxCol, range.end.col);

            for (let r = range.start.row; r <= range.end.row; r++) {
                for (let c = range.start.col; c <= range.end.col; c++) {
                    selectedCells.add(`${r}:${c}`);
                }
            }
        }

        if (minRow === Infinity) return;

        // Check for large copy
        const totalRowsToCopy = maxRow - minRow + 1;
        if (totalRowsToCopy > 1000) {
            // Note: window.confirm blocks execution, which is allowed in event handlers
            const proceed = window.confirm(`You are about to copy ${totalRowsToCopy} rows. This might take a moment. Do you want to proceed?`);
            if (!proceed) return;
        }

        // 2. Build TSV content
        let tsvContent = '';

        // Check if full column selection (include headers)
        const isFullColumnSelection = minRow === 0 && maxRow === rowCount - 1;

        if (isFullColumnSelection) {
            const headerRow: string[] = [];
            for (let c = minCol; c <= maxCol; c++) {
                if (selectedCells.has(`${minRow}:${c}`)) { // Check against first row of selection
                    const col = columns[c];
                    let title = col.title || '';
                    if (title.includes('\t') || title.includes('\n')) {
                        title = `"${title.replace(/"/g, '""')}"`;
                    }
                    headerRow.push(title);
                } else {
                    headerRow.push('');
                }
            }
            tsvContent += headerRow.join('\t') + '\n';
        }
        
        for (let r = minRow; r <= maxRow; r++) {
            const rowData: string[] = [];
            const row = rows[r];

            for (let c = minCol; c <= maxCol; c++) {
                if (selectedCells.has(`${r}:${c}`)) {
                    const col = columns[c];
                    const cell = row?.cells.get(col.id);
                    let value = cell?.value?.toString() || '';
                    if (value.includes('\t') || value.includes('\n')) {
                        value = `"${value.replace(/"/g, '""')}"`;
                    }
                    rowData.push(value);
                } else {
                    rowData.push('');
                }
            }
            tsvContent += rowData.join('\t') + '\n';
        }

        // 3. Write to clipboard event data
        e.clipboardData?.setData('text/plain', tsvContent);
        console.log(`Copied ${maxRow - minRow + 1} rows × ${maxCol - minCol + 1} cols`);
    }

    onCut(e: ClipboardEvent) {
        this.onCopy(e);
        this.clearSelectedCells();
    }

    async onPaste(e: ClipboardEvent) {
        const selection = this.engine.store.getState().selection;
        if (!selection || !selection.primary) return;

        // Prevent default paste
        e.preventDefault();

        try {
            // Read from clipboard event data
            const text = e.clipboardData?.getData('text/plain');
            if (!text) return;

            await this.processPasteData(text);
        } catch (err) {
            console.error('Failed to paste:', err);
        }
    }

    private async processPasteData(text: string) {
        // Parse TSV data
        const rows = text.split('\n').filter(row => row.length > 0);
        const data: string[][] = rows.map(row => row.split('\t'));

        if (data.length === 0) return;

        const pasteRows = data.length;
        const pasteCols = Math.max(...data.map(row => row.length));

        const selection = this.engine.store.getState().selection!;
        const { primary } = selection;
        const columns = this.engine.model.getColumns();
        const totalRows = this.engine.model.getRowCount();

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

        // Use GridEngine's pasteData for optimistic update + backend sync
        try {
            await this.engine.pasteData(data, startRow, startCol);
        } catch (error) {
            console.error('Paste failed:', error);
        }

        // Update selection
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
    }

    // Deprecated private methods (removed/replaced)
    // private handleCopy() { ... }
    // private handlePaste() { ... }
    // private handleCut() { ... }

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
