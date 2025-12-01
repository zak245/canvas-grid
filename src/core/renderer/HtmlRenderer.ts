import { BaseRenderer } from './types';
import { GridEngine } from '../engine/GridEngine';
import { cellTypeRegistry } from '../cell-types/registry';
import { CellRenderContext, CellTypeName } from '../cell-types/types';

// Helper for SVG Icons
const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
        text: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h12v2H4zm0 5h10v2H4z"/></svg>',
        number: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 4v16M14 4v16M5 9h14M5 15h14"/></svg>',
        date: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        boolean: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 12l2 2 4-4"/></svg>',
        email: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        url: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        select: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/><path d="M18 16l3 0l-1.5 3z"/></svg>',
    };
    return icons[type] || icons.text;
};

export class HtmlRenderer extends BaseRenderer {
    private containerElement: HTMLElement | null = null;
    private gridContainer: HTMLElement | null = null;
    private headerContainer: HTMLElement | null = null;
    private bodyContainer: HTMLElement | null = null;
    
    // Cache for reconciliation
    private renderedRows: Map<string, HTMLElement> = new Map();
    private renderedHeaders: Map<string, HTMLElement> = new Map();

    constructor(engine: GridEngine) {
        super(engine);
    }

    attach(container: HTMLElement): void {
        this.containerElement = container;
        
        // Main Grid Container
        this.gridContainer = document.createElement('div');
        this.gridContainer.className = 'ds-grid-html-container';
        this.gridContainer.style.position = 'relative';
        this.gridContainer.style.width = '100%';
        this.gridContainer.style.height = '100%';
        this.gridContainer.style.overflow = 'hidden';
        this.gridContainer.style.backgroundColor = '#fff';
        this.gridContainer.style.userSelect = 'none'; // Prevent text selection
        this.gridContainer.style.webkitUserSelect = 'none';
        // Make it focusable for keyboard events
        this.gridContainer.tabIndex = 0; 
        this.gridContainer.style.outline = 'none';

        // Header Container
        this.headerContainer = document.createElement('div');
        this.headerContainer.className = 'ds-grid-header';
        this.headerContainer.style.position = 'absolute';
        this.headerContainer.style.top = '0';
        this.headerContainer.style.left = '0';
        this.headerContainer.style.overflow = 'hidden';
        this.headerContainer.style.zIndex = '10';

        // Body Container
        this.bodyContainer = document.createElement('div');
        this.bodyContainer.className = 'ds-grid-body';
        this.bodyContainer.style.position = 'absolute';
        this.bodyContainer.style.left = '0';
        this.bodyContainer.style.overflow = 'hidden';

        this.gridContainer.appendChild(this.headerContainer);
        this.gridContainer.appendChild(this.bodyContainer);
        this.containerElement.appendChild(this.gridContainer);

        // Inject Styles for Interactions
        const style = document.createElement('style');
        style.textContent = `
            .ds-grid-header-cell {
                transition: background-color 0.1s;
                cursor: default;
            }
            .ds-grid-header-cell:hover {
                background-color: #f3f4f6 !important;
            }
            .ds-grid-header-cell-resizer {
                position: absolute;
                top: 0;
                right: 0;
                width: 4px;
                height: 100%;
                cursor: col-resize;
                z-index: 10;
            }
            .ds-grid-header-cell-resizer:hover {
                background-color: #3b82f6;
            }
            .ds-grid-header-cell:hover .ds-grid-header-menu-arrow {
                opacity: 1 !important;
            }
        `;
        this.gridContainer.appendChild(style);
    }

    detach(): void {
        if (this.gridContainer && this.containerElement) {
            this.containerElement.removeChild(this.gridContainer);
        }
        this.renderedRows.clear();
        this.renderedHeaders.clear();
        this.gridContainer = null;
        this.headerContainer = null;
        this.bodyContainer = null;
        this.containerElement = null;
    }

    getElement(): HTMLElement | null {
        return this.gridContainer;
    }

    render(): void {
        if (!this.gridContainer || !this.headerContainer || !this.bodyContainer) return;

        const { width, height, scrollTop, scrollLeft } = this.engine.viewport.getState();
        const { theme } = this.engine;

        // 1. Layout Containers
        this.headerContainer.style.height = `${theme.headerHeight}px`;
        this.headerContainer.style.width = `${width}px`;
        this.bodyContainer.style.top = `${theme.headerHeight}px`;
        this.bodyContainer.style.width = `${width}px`;
        this.bodyContainer.style.height = `${height - theme.headerHeight}px`;

        // 2. Calculate Visible Range
        const allRows = this.engine.rows.getViewRows();
        const allVisibleColumns = [...this.engine.model.getVisibleColumns()].sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return 0;
        });

        const visibleRange = this.engine.viewport.calculateVisibleRange(
            allRows,
            allVisibleColumns
        );

        if (!visibleRange) {
            return;
        }

        const { visibleRows, visibleColumns, pinnedColumns, rowStartIndex, scrollableGridX } = visibleRange;

        // 3. Render Headers
        this.renderHeaders(visibleColumns, pinnedColumns, scrollLeft, theme, visibleRange);

        // 4. Render Body (Rows & Cells)
        this.renderBody(visibleRows, rowStartIndex, visibleColumns, pinnedColumns, scrollableGridX, scrollLeft, scrollTop, theme);
        
        // 5. Sync Interactions
        this.syncInteractionOverlay();
    }

    private syncInteractionOverlay() {
        // In HTML mode, interactions (selection, focus) are handled by SelectionOverlay (Canvas based)
        // or by native DOM events if we wanted pure DOM selection.
        // Currently, SelectionOverlay is separate and handled by GridEngine.
        // But we need to ensure our container responds to input.
        
        // Since InputController attaches to our container, events are captured.
        // But we need to make sure pointer events pass through if we want native text selection?
        // Grid design usually prevents native selection in favor of virtual selection.
        // So `user-select: none` is correct.
    }

    private createCornerHeader(theme: any): HTMLElement {
        const rowHeader = document.createElement('div');
        rowHeader.style.position = 'absolute';
        rowHeader.style.width = `${theme.rowHeaderWidth}px`;
        rowHeader.style.height = '100%';
        rowHeader.style.left = '0';
        rowHeader.style.backgroundColor = theme.headerBackgroundColor;
        rowHeader.style.borderBottom = `1px solid ${theme.borderColor}`;
        rowHeader.style.borderRight = `1px solid ${theme.borderColor}`;
        rowHeader.style.zIndex = '20';
        rowHeader.style.display = 'flex';
        rowHeader.style.alignItems = 'center';
        rowHeader.style.justifyContent = 'center';
        
        const selectAllCheck = document.createElement('input');
        selectAllCheck.type = 'checkbox';
        selectAllCheck.style.margin = '0';
        selectAllCheck.style.pointerEvents = 'none'; // Let click pass to MouseHandler
        selectAllCheck.readOnly = true;
        
        rowHeader.appendChild(selectAllCheck);
        
        return rowHeader;
    }

    private createGroupHeader(row: any, top: number, theme: any): HTMLElement {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.top = `${top}px`;
        el.style.left = '0';
        el.style.width = '100%';
        el.style.height = `${theme.rowHeight}px`;
        el.style.backgroundColor = '#f3f4f6';
        el.style.borderBottom = `1px solid ${theme.borderColor}`;
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.paddingLeft = `${theme.rowHeaderWidth + 12}px`;
        el.style.boxSizing = 'border-box';
        el.style.cursor = 'pointer';
        el.style.zIndex = '20';

        // Arrow
        const arrow = document.createElement('div');
        arrow.style.marginRight = '8px';
        arrow.style.display = 'flex';
        arrow.style.color = '#6b7280';
        arrow.innerHTML = row.isCollapsed 
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 8l-7 11-7-11z"/></svg>`;
        
        el.appendChild(arrow);

        // Title
        const title = document.createElement('span');
        title.style.fontWeight = '600';
        title.style.fontSize = `${theme.fontSize}px`;
        title.style.color = '#374151';
        title.textContent = `${row.groupTitle || 'Untitled'} (${row.groupCount || 0})`;
        
        el.appendChild(title);

        return el;
    }

    private createRowHeader(actualRowIndex: number, rowTop: number, theme: any): HTMLElement {
        const rowHeader = document.createElement('div');
        rowHeader.style.position = 'absolute';
        rowHeader.style.top = `${rowTop}px`;
        rowHeader.style.left = '0';
        rowHeader.style.width = `${theme.rowHeaderWidth}px`;
        rowHeader.style.height = `${theme.rowHeight}px`;
        rowHeader.style.backgroundColor = '#f9fafb';
        rowHeader.style.borderBottom = `1px solid ${theme.borderColor}`;
        rowHeader.style.borderRight = `1px solid ${theme.borderColor}`;
        rowHeader.style.display = 'flex';
        rowHeader.style.alignItems = 'center';
        rowHeader.style.justifyContent = 'center';
        rowHeader.style.fontSize = `${theme.fontSize}px`;
        rowHeader.style.color = '#9ca3af';
        rowHeader.style.zIndex = '15';

        const isSelected = this.engine.selection.isRowSelected(actualRowIndex);
        
        if (isSelected) {
            rowHeader.style.backgroundColor = '#e0e7ff';
            rowHeader.style.color = '#3b82f6';
            rowHeader.style.fontWeight = '600';
        }

        const check = document.createElement('input');
        check.type = 'checkbox';
        check.checked = isSelected;
        check.style.position = 'absolute';
        check.style.left = '8px';
        check.style.top = '50%';
        check.style.transform = 'translateY(-50%)';
        check.style.margin = '0';
        check.style.cursor = 'pointer';
        check.onclick = (e) => {
            e.stopPropagation();
            this.engine.selection.toggleRowSelection(actualRowIndex);
            this.render();
        };
        
        rowHeader.appendChild(check);
        
        const num = document.createElement('span');
        num.textContent = String(actualRowIndex + 1);
        num.style.marginLeft = '20px';
        rowHeader.appendChild(num);

        return rowHeader;
    }

    private renderHeaders(
        visibleColumns: any[], 
        pinnedColumns: any[], 
        scrollLeft: number, 
        theme: any,
        visibleRange: any
    ) {
        if (!this.headerContainer) return;

        // Simple reconciliation: Clear and rebuild for now (optimized DOM updates are complex)
        // In a real implementation, we would diff `renderedHeaders`.
        this.headerContainer.innerHTML = '';

        const fragment = document.createDocumentFragment();
        const frozenWidth = this.engine.model.getFrozenWidth();
        const sortState = this.engine.model.getSortState();

        // Row Header Placeholder (Select All)
        fragment.appendChild(this.createCornerHeader(theme));

        let currentX = theme.rowHeaderWidth;
        
        // Helper to render a column header
        const renderCol = (col: any, isPinned: boolean) => {
            const el = document.createElement('div');
            el.className = 'ds-grid-header-cell';
            el.style.position = 'absolute';
            // Adjust X based on scroll if not pinned
            const x = isPinned ? currentX : currentX - scrollLeft;
            el.style.left = `${x}px`;
            el.style.width = `${col.width}px`;
            el.style.height = '100%';
            el.style.backgroundColor = theme.headerBackgroundColor;
            el.style.borderBottom = `1px solid ${theme.borderColor}`;
            el.style.borderRight = `1px solid ${theme.borderColor}`;
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'space-between'; // Space between title and icons
            el.style.padding = '0 8px';
            el.style.boxSizing = 'border-box';
            el.style.fontSize = `${theme.headerFontSize || theme.fontSize}px`;
            el.style.fontFamily = theme.headerFontFamily || theme.fontFamily;
            el.style.fontWeight = '600';
            el.style.color = theme.headerColor || '#374151';
            
            if (isPinned) el.style.zIndex = '15';

            // Title Container
            const titleSpan = document.createElement('span');
            titleSpan.textContent = col.title;
            titleSpan.style.overflow = 'hidden';
            titleSpan.style.textOverflow = 'ellipsis';
            titleSpan.style.whiteSpace = 'nowrap';
            titleSpan.style.flex = '1';
            el.appendChild(titleSpan);

            // Type Icon (Left)
            const typeIcon = document.createElement('div');
            typeIcon.innerHTML = getTypeIcon(col.type || 'text');
            typeIcon.style.color = '#9ca3af';
            typeIcon.style.display = 'flex';
            typeIcon.style.marginRight = '8px';
            el.insertBefore(typeIcon, titleSpan);

            // Icons Container
            const iconsDiv = document.createElement('div');
            iconsDiv.style.display = 'flex';
            iconsDiv.style.alignItems = 'center';
            iconsDiv.style.gap = '4px';

            // Sort Icon
            const sort = sortState.find(s => s.columnId === col.id);
            if (sort) {
                const sortIcon = document.createElement('div');
                sortIcon.innerHTML = sort.direction === 'asc' 
                    ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>`
                    : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;
                sortIcon.style.color = '#2563eb'; // Blue
                sortIcon.style.display = 'flex';
                iconsDiv.appendChild(sortIcon);
            }

            // Menu Arrow (Always visible on hover or if menu active)
            // We use CSS to handle hover visibility if we add a class, or just render it.
            // Canvas logic renders it if hovered or menu open.
            // Here we can just render it and style it.
            const menuArrow = document.createElement('div');
            menuArrow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
            menuArrow.className = 'ds-grid-header-menu-arrow';
            menuArrow.style.color = '#9ca3af';
            menuArrow.style.display = 'flex';
            menuArrow.style.opacity = '0'; // Hidden by default
            menuArrow.style.transition = 'opacity 0.1s';
            iconsDiv.appendChild(menuArrow);

            // Menu/Action Placeholder (only show on hover - handled by CSS/JS or just always show '...' if active)
            // For now, let's add a visual indicator if headerAction exists
            if (col.headerAction) {
                const actionIcon = document.createElement('div');
                // Simple dot indicator or icon
                actionIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>`;
                actionIcon.style.color = '#9ca3af';
                actionIcon.style.display = 'flex';
                iconsDiv.appendChild(actionIcon);
            }

            el.appendChild(iconsDiv);

            // Resize Handle
            const resizer = document.createElement('div');
            resizer.className = 'ds-grid-header-cell-resizer';
            el.appendChild(resizer);

            fragment.appendChild(el);
            currentX += col.width;
        };

        // Pinned Cols
        pinnedColumns.forEach(col => renderCol(col, true));
        
        // Scrollable Cols
        const scrollableCols = visibleColumns.filter(c => !c.pinned);
        const startScrollableX = visibleRange.scrollableGridX || 0;
        let currentScrollableX = startScrollableX;

        scrollableCols.forEach(col => {
            const el = document.createElement('div');
            el.className = 'ds-grid-header-cell';
            el.style.position = 'absolute';
            const screenX = theme.rowHeaderWidth + (currentScrollableX - scrollLeft);
            
            if (screenX + col.width > theme.rowHeaderWidth && screenX < this.engine.viewport.getState().width) {
                el.style.left = `${screenX}px`;
                el.style.width = `${col.width}px`;
                el.style.height = '100%';
                el.style.backgroundColor = theme.headerBackgroundColor;
                el.style.borderBottom = `1px solid ${theme.borderColor}`;
                el.style.borderRight = `1px solid ${theme.borderColor}`;
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'space-between';
                el.style.padding = '0 8px';
                el.style.boxSizing = 'border-box';
                el.style.fontSize = `${theme.headerFontSize || theme.fontSize}px`;
                el.style.fontFamily = theme.headerFontFamily || theme.fontFamily;
                el.style.fontWeight = '600';
                el.style.color = theme.headerColor || '#374151';

                // Title
                const titleSpan = document.createElement('span');
                titleSpan.textContent = col.title;
                titleSpan.style.overflow = 'hidden';
                titleSpan.style.textOverflow = 'ellipsis';
                titleSpan.style.whiteSpace = 'nowrap';
                titleSpan.style.flex = '1';
                el.appendChild(titleSpan);

                // Type Icon (Left)
                const typeIcon = document.createElement('div');
                typeIcon.innerHTML = getTypeIcon(col.type || 'text');
                typeIcon.style.color = '#9ca3af';
                typeIcon.style.display = 'flex';
                typeIcon.style.marginRight = '8px';
                el.insertBefore(typeIcon, titleSpan);

                // Icons
                const iconsDiv = document.createElement('div');
                iconsDiv.style.display = 'flex';
                iconsDiv.style.alignItems = 'center';
                iconsDiv.style.gap = '4px';

                const sort = sortState.find(s => s.columnId === col.id);
                if (sort) {
                    const sortIcon = document.createElement('div');
                    sortIcon.innerHTML = sort.direction === 'asc' 
                        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>`
                        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>`;
                    sortIcon.style.color = '#2563eb';
                    sortIcon.style.display = 'flex';
                    iconsDiv.appendChild(sortIcon);
                }

                // Menu Arrow
                const menuArrow = document.createElement('div');
                menuArrow.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
                menuArrow.className = 'ds-grid-header-menu-arrow';
                menuArrow.style.color = '#9ca3af';
                menuArrow.style.display = 'flex';
                menuArrow.style.opacity = '0';
                menuArrow.style.transition = 'opacity 0.1s';
                iconsDiv.appendChild(menuArrow);

                if (col.headerAction) {
                    const actionIcon = document.createElement('div');
                    actionIcon.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="5" cy="12" r="2"/></svg>`;
                    actionIcon.style.color = '#9ca3af';
                    actionIcon.style.display = 'flex';
                    iconsDiv.appendChild(actionIcon);
                }
                el.appendChild(iconsDiv);

                // Resize Handle
                const resizer = document.createElement('div');
                resizer.className = 'ds-grid-header-cell-resizer';
                el.appendChild(resizer);

                fragment.appendChild(el);
            }
            currentScrollableX += col.width;
        });

        this.headerContainer.appendChild(fragment);
    }

    private createAddRowFooter(
        top: number, 
        theme: any, 
        visibleColumns: any[], 
        pinnedColumns: any[], 
        scrollableGridX: number, 
        scrollLeft: number
    ): HTMLElement {
        const footer = document.createElement('div');
        footer.style.position = 'absolute';
        footer.style.top = `${top}px`;
        footer.style.left = '0';
        footer.style.width = '100%';
        footer.style.height = `${theme.rowHeight}px`;
        
        // Background cells
        const allCols = [...pinnedColumns, ...visibleColumns.filter((c: any) => !c.pinned)];
        let currentScrollableX = scrollableGridX || 0;
        let pinnedX = theme.rowHeaderWidth;
        
        allCols.forEach(col => {
            const cell = document.createElement('div');
            let left = 0;
            if (col.pinned) {
                left = pinnedX;
                pinnedX += col.width;
                cell.style.zIndex = '10';
            } else {
                left = theme.rowHeaderWidth + (currentScrollableX - scrollLeft);
                currentScrollableX += col.width;
            }
            
            // Only render if visible
            if (left + col.width > theme.rowHeaderWidth && left < this.engine.viewport.getState().width) {
                cell.style.position = 'absolute';
                cell.style.left = `${left}px`;
                cell.style.width = `${col.width}px`;
                cell.style.height = '100%';
                cell.style.backgroundColor = '#f9fafb';
                cell.style.borderRight = `1px solid ${theme.gridLineColor}`;
                cell.style.borderBottom = `1px solid ${theme.gridLineColor}`;
                footer.appendChild(cell);
            }
        });
        
        // Input and Text
        const controls = document.createElement('div');
        controls.style.position = 'absolute';
        controls.style.left = `${theme.rowHeaderWidth + 12}px`;
        controls.style.top = '4px';
        controls.style.height = `${theme.rowHeight - 8}px`;
        controls.style.display = 'flex';
        controls.style.alignItems = 'center';
        controls.style.zIndex = '20';
        controls.style.pointerEvents = 'none'; // Pass clicks to MouseHandler
        
        const input = document.createElement('div');
        input.style.width = '40px';
        input.style.height = '100%';
        input.style.backgroundColor = '#fff';
        input.style.border = '1px solid #d1d5db';
        input.style.display = 'flex';
        input.style.alignItems = 'center';
        input.style.justifyContent = 'center';
        input.style.marginRight = '10px';
        input.textContent = String(this.engine.store.getState().rowsToAdd);
        input.style.fontSize = `${theme.fontSize}px`;
        input.style.fontFamily = theme.fontFamily;
        input.style.color = '#374151';
        
        const text = document.createElement('div');
        text.textContent = '+ Add Rows';
        text.style.color = '#6b7280';
        text.style.fontSize = `${theme.fontSize}px`;
        text.style.fontFamily = theme.fontFamily;
        
        controls.appendChild(input);
        controls.appendChild(text);
        
        footer.appendChild(controls);
        
        return footer;
    }

    private renderBody(
        visibleRows: any[], 
        rowStartIndex: number, 
        visibleColumns: any[], 
        pinnedColumns: any[], 
        scrollableGridX: number, 
        scrollLeft: number, 
        scrollTop: number, 
        theme: any
    ) {
        if (!this.bodyContainer) return;
        
        this.bodyContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        const frozenWidth = this.engine.model.getFrozenWidth();

        visibleRows.forEach((row, index) => {
            const actualRowIndex = rowStartIndex + index;
            const rowTop = (actualRowIndex * theme.rowHeight) - scrollTop;
            
            if (rowTop + theme.rowHeight < 0) return;

            // Group Header Handling
            if (row.isGroupHeader) {
                fragment.appendChild(this.createGroupHeader(row, rowTop, theme));
                return;
            }

            // Render Row Header
            fragment.appendChild(this.createRowHeader(actualRowIndex, rowTop, theme));

            // Render Cells
            const allCols = [...pinnedColumns, ...visibleColumns.filter((c: any) => !c.pinned)];
            let currentScrollableX = scrollableGridX;
            let pinnedX = theme.rowHeaderWidth;

            allCols.forEach(col => {
                const cell = row.cells.get(col.id);
                const cellEl = document.createElement('div');
                
                let left = 0;
                let isPinned = !!col.pinned;

                if (isPinned) {
                    left = pinnedX;
                    pinnedX += col.width;
                    cellEl.style.zIndex = '10';
                } else {
                    left = theme.rowHeaderWidth + (currentScrollableX - scrollLeft);
                    currentScrollableX += col.width;
                }

                cellEl.style.position = 'absolute';
                cellEl.style.top = `${rowTop}px`;
                cellEl.style.left = `${left}px`;
                cellEl.style.width = `${col.width}px`;
                cellEl.style.height = `${theme.rowHeight}px`;
                cellEl.style.borderBottom = `1px solid ${theme.gridLineColor}`;
                cellEl.style.borderRight = `1px solid ${theme.gridLineColor}`;
                cellEl.style.backgroundColor = '#fff';
                cellEl.style.padding = '0 8px';
                cellEl.style.boxSizing = 'border-box';
                cellEl.style.display = 'flex';
                cellEl.style.alignItems = 'center';
                cellEl.style.fontSize = `${theme.fontSize}px`;
                cellEl.style.fontFamily = theme.fontFamily;
                cellEl.style.overflow = 'hidden';
                cellEl.style.whiteSpace = 'nowrap';

                // Get renderer
                const cellType = cellTypeRegistry.get(col.type as CellTypeName);
                
                if (cellType.renderHtml) {
                    const context: CellRenderContext<any> = {
                        value: cell?.value,
                        displayValue: cellType.format(cell?.value, col.typeOptions),
                        x: left, // Use absolute calculated position
                        y: rowTop, // Use absolute calculated position
                        width: col.width,
                        height: theme.rowHeight,
                        isSelected: false, // TODO: Check selection
                        isFocused: false,
                        isEditing: false,
                        isHovered: false,
                        hasError: false,
                        theme: theme,
                        rowIndex: actualRowIndex,
                        columnId: col.id,
                        options: col.typeOptions
                    };
                    
                    const result = cellType.renderHtml(context);
                    if (result instanceof HTMLElement) {
                        cellEl.appendChild(result);
                    } else {
                        cellEl.innerHTML = result as string;
                    }
                } else {
                    // Fallback to text content
                    const displayValue = cellType.format(cell?.value, col.typeOptions);
                    cellEl.textContent = displayValue;
                }

                fragment.appendChild(cellEl);
            });
        });

        this.bodyContainer.appendChild(fragment);

        // Add Row Footer
        const totalRows = this.engine.rows.getRowCount();
        const addRowY = (totalRows * theme.rowHeight) - scrollTop;
        const containerHeight = this.engine.viewport.getState().height - theme.headerHeight;

        if (addRowY < containerHeight) {
            this.bodyContainer.appendChild(
                this.createAddRowFooter(addRowY, theme, visibleColumns, pinnedColumns, scrollableGridX, scrollLeft)
            );
        }
    }
}

