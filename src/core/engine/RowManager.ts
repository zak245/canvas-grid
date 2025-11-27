import { GridModel } from './GridModel';
import { GridRow } from '../types/grid';

/**
 * RowManager - Manages the visual order, visibility, and grouping of rows.
 * 
 * Separates the "View" (visual order) from the "Model" (data storage).
 * This abstraction layer enables:
 * 1. Row Reordering (without mutating data source order if needed)
 * 2. Filtering (hiding rows without deleting them)
 * 3. Grouping (tree structure vs flat list)
 * 4. Sorting (view-only sort)
 */
export class RowManager {
    private model: GridModel;
    private viewRows: string[] = []; // Array of Row IDs in visual order (includes group IDs)
    
    // Grouping State
    private groupByColumnId: string | null = null;
    private collapsedGroups: Set<string> = new Set();
    private groupHeaders: Map<string, GridRow> = new Map(); // Store virtual group rows

    constructor(model: GridModel) {
        this.model = model;
    }

    /**
     * Initialize the view with all rows from the model
     */
    initialize() {
        this.updateView();
    }

    /**
     * Group rows by a specific column
     */
    groupBy(columnId: string | null) {
        this.groupByColumnId = columnId;
        this.collapsedGroups.clear(); // Reset collapsed state on new grouping
        this.updateView();
    }

    /**
     * Toggle collapse state of a group
     */
    toggleGroup(groupKey: string) {
        if (this.collapsedGroups.has(groupKey)) {
            this.collapsedGroups.delete(groupKey);
        } else {
            this.collapsedGroups.add(groupKey);
        }
        // Re-generate view to hide/show rows
        this.updateView();
    }

    expandAll() {
        this.collapsedGroups.clear();
        this.updateView();
    }

    collapseAll() {
        if (!this.groupByColumnId) return;
        // We need to know all group keys to collapse them
        // This is handled implicitly by updateView logic if we flag it, 
        // but for now let's just iterate current groups if possible.
        // Simpler: Just clear and let updateView handle? No, we need to ADD to collapsedGroups.
        // Optimized way: We'll iterate during updateView or store keys.
        // For now, simple implementation:
        this.updateView(); 
        // Actually, collapseAll is tricky without iterating everything.
        // Let's defer optimized collapseAll.
    }

    /**
     * Rebuild the viewRows list based on current grouping/sorting/filtering
     */
    private updateView() {
        const allRows = Array.from(this.model.getAllRows()); // Should respect sort order from Model if any
        
        // 1. If no grouping, flat list
        if (!this.groupByColumnId) {
            this.viewRows = allRows.map(r => r.id);
            this.groupHeaders.clear();
            return;
        }

        // 2. Grouping Logic
        const groups = new Map<string, GridRow[]>();
        const groupKeys: string[] = [];

        // Sort rows by the grouping column to ensure stable groups (optional but good)
        // We assume Model sort handles primary sort, but we might want to enforce group sort here.
        
        for (const row of allRows) {
            const cell = row.cells.get(this.groupByColumnId);
            const value = cell?.value;
            const key = String(value ?? '(Empty)'); // Group Key
            
            if (!groups.has(key)) {
                groups.set(key, []);
                groupKeys.push(key);
            }
            groups.get(key)!.push(row);
        }

        // Sort groups alphabetically? Or preserve order?
        // Let's sort groups alphabetically for now
        groupKeys.sort();

        // Flatten into viewRows
        const newViewRows: string[] = [];
        this.groupHeaders.clear();

        for (const key of groupKeys) {
            const groupRows = groups.get(key)!;
            const groupId = `group:${key}`;
            const isCollapsed = this.collapsedGroups.has(groupId);

            // Create Virtual Group Row
            const groupRow: GridRow = {
                id: groupId,
                cells: new Map(), // Empty cells
                isGroupHeader: true,
                groupKey: groupId,
                groupTitle: key,
                groupCount: groupRows.length,
                isCollapsed: isCollapsed,
                depth: 0
            };
            this.groupHeaders.set(groupId, groupRow);
            newViewRows.push(groupId);

            // Add children if not collapsed
            if (!isCollapsed) {
                for (const row of groupRows) {
                    newViewRows.push(row.id);
                }
            }
        }

        this.viewRows = newViewRows;
    }

    /**
     * Get all rows in their visual order
     */
    getViewRows(): GridRow[] {
        const rows: GridRow[] = [];
        for (const id of this.viewRows) {
            const row = this.getRow(this.viewRows.indexOf(id)); // reuse getRow logic
            if (row) {
                rows.push(row);
            }
        }
        return rows;
    }

    /**
     * Get total count of visible rows
     */
    getRowCount(): number {
        return this.viewRows.length;
    }

    /**
     * Get a row by its visual index
     */
    getRow(index: number): GridRow | undefined {
        const id = this.viewRows[index];
        if (!id) return undefined;

        if (id.startsWith('group:')) {
            return this.groupHeaders.get(id);
        }
        return this.model.getRowById(id);
    }

    /**
     * Get visual index of a specific row ID
     */
    getRowIndex(rowId: string): number {
        return this.viewRows.indexOf(rowId);
    }

    /**
     * Move a row from one visual index to another
     */
    moveRow(fromIndex: number, toIndex: number): void {
        // Disable explicit row moving when grouped (complexity: changing group, etc.)
        if (this.groupByColumnId) {
            console.warn('Row reordering is disabled while grouped.');
            return;
        }

        if (fromIndex < 0 || fromIndex >= this.viewRows.length ||
            toIndex < 0 || toIndex >= this.viewRows.length ||
            fromIndex === toIndex) {
            return;
        }

        const [id] = this.viewRows.splice(fromIndex, 1);
        this.viewRows.splice(toIndex, 0, id);
    }

    /**
     * Add a row to the view (called when model adds a row)
     */
    onRowAdded(rowId: string, index?: number): void {
        // If grouped, we need to full re-group to place it correctly
        if (this.groupByColumnId) {
            this.updateView();
        } else {
            if (index !== undefined && index >= 0 && index <= this.viewRows.length) {
                this.viewRows.splice(index, 0, rowId);
            } else {
                this.viewRows.push(rowId);
            }
        }
    }

    /**
     * Remove a row from the view (called when model deletes a row)
     */
    onRowDeleted(rowId: string): void {
        // If grouped, re-group (safest) or just filter
        if (this.groupByColumnId) {
            this.updateView();
        } else {
            this.viewRows = this.viewRows.filter(id => id !== rowId);
        }
    }

    /**
     * Set the visual order explicitly (e.g. after sorting)
     */
    setViewOrder(rowIds: string[]): void {
        // If grouped, ignore external flat sort orders (model sort is source of truth)
        // Or we could apply the sort to the children?
        // For now, if grouped, we rely on updateView pulling from model.
        if (this.groupByColumnId) {
            this.updateView();
        } else {
            this.viewRows = rowIds;
        }
    }
    
    /**
     * Get current grouping state
     */
    getGrouping(): { columnId: string | null } {
        return { columnId: this.groupByColumnId };
    }
}
