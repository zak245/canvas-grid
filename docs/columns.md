Column Management System - Design Proposal
Overview
This document defines the complete column management system for the Clay Killer Data Grid, including interactions, configurations, features, and implementation approach.

1. Column Properties & Configuration
Core Column Schema
interface GridColumn {
  // Identity
  id: string;                    // Unique identifier
  title: string;                 // Display name (editable)
  
  // Visual
  width: number;                 // Column width in pixels
  visible: boolean;              // Show/hide state
  pinned?: 'left' | 'right';     // Pin column to edge
  
  // Data Type
  type: CellType;                // text | number | date | boolean | email | url | ai
  format?: CellFormat;           // Type-specific formatting
  
  // Validation
  required?: boolean;            // Cell cannot be empty
  validation?: ValidationRule;   // Custom validation logic
  
  // Behavior
  editable?: boolean;            // Allow inline editing (default: true)
  sortable?: boolean;            // Allow sorting (default: true)
  filterable?: boolean;          // Allow filtering (default: true)
  
  // AI Configuration (for AI columns)
  aiConfig?: {
    prompt: string;
    model: string;
    dependsOn?: string[];        // Trigger when these columns change
  };
  
  // Metadata
  description?: string;          // Tooltip description
  tags?: string[];               // For organization
}
2. Column Interactions
A. Resize Column
Trigger: Hover on column border → drag Visual:

Cursor changes to col-resize
Column width updates in real-time
Minimum width: 50px, Maximum: 600px
Implementation:

// On column header edge hover
if (isNearColumnBorder(mouseX)) {
  canvas.style.cursor = 'col-resize';
}
// On drag
column.width = Math.max(50, Math.min(600, newWidth));
Double-click to auto-fit:

Measure widest cell content in column
Set width to fit + padding
B. Reorder Column
Trigger: Click & drag column header Visual:

Ghost/preview of column while dragging
Vertical drop indicator between columns
Other columns shift to show insertion point
Implementation:

// Swap column order in array
const [removed] = columns.splice(oldIndex, 1);
columns.splice(newIndex, 0, removed);
Constraints:

Cannot reorder pinned columns across pin boundary
Left-pinned columns stay left, right-pinned stay right
C. Hide/Show Column
Trigger:

Right-click header → "Hide Column"
Column menu → Toggle visibility
Visual:

Hidden columns don't render
Show hidden columns via menu/settings panel
Implementation:

column.visible = false;  // Hide
// To show: column picker UI
D. Delete Column
Trigger: Right-click header → "Delete Column" (with confirmation) Visual:

Confirmation dialog: "Delete column '{name}'? This cannot be undone."
Column and all data removed
Implementation:

// Remove from columns
columns = columns.filter(c => c.id !== columnId);
// Remove from all rows
rows.forEach(row => row.cells.delete(columnId));
E. Pin Column
Trigger: Right-click header → "Pin Left" / "Pin Right" / "Unpin" Visual:

Pinned columns:
Stay visible during horizontal scroll
Rendered in separate canvas layer
Visual separator (border or shadow)
Implementation:

column.pinned = 'left';  // or 'right' or undefined
// Renderer splits columns into: leftPinned, unpinned, rightPinned
Use Cases:

Pin "Name" column while scrolling data
Pin "Actions" column on right edge
3. Column Header UI/UX
Header Layout
┌─────────────────────────────────────┐
│  Column Title     ▼  ⚙️  ⋮         │  ← Header (40px height)
├─────────────────────────────────────┤
│  [cell data...]                     │
Elements:

Title: Editable on double-click
Sort indicator (▲/▼): Shows sort state
Filter icon (🔽): Opens filter menu
Settings icon (⚙️): Column config
Menu icon (⋮): Context menu
Context Menu (Right-click)
┌─────────────────────────┐
│ ✏️  Rename Column        │
│ ─────────────────────── │
│ 📌  Pin Left             │
│ 📌  Pin Right            │
│ 📌  Unpin                │
│ ─────────────────────── │
│ ↕️  Sort Ascending       │
│ ↕️  Sort Descending      │
│ ↕️  Clear Sort           │
│ ─────────────────────── │
│ 🔍  Filter...            │
│ ─────────────────────── │
│ 👁️  Hide Column          │
│ 🗑️  Delete Column        │
│ ─────────────────────── │
│ ⚙️  Column Settings...   │
└─────────────────────────┘
Column Settings Panel (Modal/Drawer)
┌────────────────────────────────────┐
│ Column Settings: "Email"        [X]│
├────────────────────────────────────┤
│                                    │
│ Name:        [Email             ]  │
│                                    │
│ Type:        [email        ▼]      │
│                                    │
│ Width:       [250px         ]      │
│                                    │
│ ☑ Required                         │
│ ☑ Editable                         │
│ ☑ Sortable                         │
│ ☑ Filterable                       │
│                                    │
│ Description:                       │
│ ┌────────────────────────────────┐ │
│ │ User's email address           │ │
│ └────────────────────────────────┘ │
│                                    │
│ [Cancel]              [Save]       │
└────────────────────────────────────┘
4. Column Features
A. Sorting
Trigger: Click column header title States:

Unsorted (default)
Ascending (▲)
Descending (▼)
Click again → cycle
Visual:

Arrow indicator in header
Sorted column has subtle highlight
Implementation:

interface ColumnSort {
  columnId: string;
  direction: 'asc' | 'desc';
}
// Multi-column sort (future)
sortState: ColumnSort[] = [
  { columnId: 'name', direction: 'asc' },
  { columnId: 'date', direction: 'desc' }
];
Performance:

For 500K rows: Use virtual sort (store indices)
Don't mutate original data
Cache sorted indices
B. Filtering
Trigger: Click filter icon → dropdown Filter Types by Column Type:

Text:

Contains / Doesn't contain
Equals / Not equals
Starts with / Ends with
Is empty / Is not empty
Number:

Equals / Not equals
Greater than / Less than
Between (range)
Is empty / Is not empty
Date:

Equals / Before / After
Between (date range)
In last N days
Is empty / Is not empty
Boolean:

Is true / Is false
Is empty / Is not empty
Implementation:

interface ColumnFilter {
  columnId: string;
  operator: 'contains' | 'equals' | 'gt' | 'lt' | 'between' | ...;
  value: any;
}
filterState: ColumnFilter[] = [
  { columnId: 'status', operator: 'equals', value: 'active' },
  { columnId: 'revenue', operator: 'gt', value: 100000 }
];
C. Column Groups (Future Enhancement)
Use Case: Organize related columns

┌──────────────────────────────────────┐
│        Contact Info                  │  ← Group header
├──────────────┬──────────────┬────────┤
│ First Name   │ Last Name    │ Email  │  ← Column headers
Implementation:

interface ColumnGroup {
  id: string;
  title: string;
  columnIds: string[];
  collapsible?: boolean;
}
5. Column Templates (Presets)
Quick Add Templates
const columnTemplates = {
  text: { type: 'text', width: 200 },
  email: { type: 'email', width: 250, validation: emailRegex },
  phone: { type: 'text', width: 150, format: phoneFormat },
  currency: { type: 'number', width: 150, format: { prefix: '$', decimals: 2 } },
  percentage: { type: 'number', width: 100, format: { suffix: '%', decimals: 1 } },
  date: { type: 'date', width: 150, format: { dateFormat: 'MM/DD/YYYY' } },
  checkbox: { type: 'boolean', width: 100, format: { booleanDisplay: 'checkbox' } },
  url: { type: 'url', width: 300 },
  ai_email: { type: 'ai', width: 250, aiConfig: { prompt: 'Find work email', model: 'gpt-4' } }
};
6. Add Column Flow
Option A: "Add Column" Button (Recommended)
User clicks "+ Add Column" button (top-right of grid)
Modal opens with template picker
Select template or "Custom"
Configure column properties
Click "Add" → column appears at end
Option B: Right-click on Headers
Right-click between columns
Context menu: "Insert Column Left/Right"
Quick config or use template
7. Column Persistence
Save/Load Column State
interface ColumnState {
  columns: GridColumn[];
  sort?: ColumnSort[];
  filters?: ColumnFilter[];
  pinnedColumns?: { left: string[]; right: string[] };
}
// Save to localStorage or backend
localStorage.setItem('grid_columns', JSON.stringify(columnState));
8. Implementation Priority
Phase 1: Core (P0)
 Column type system
 Column resize (drag border)
 Column hide/show (context menu + picker UI)
 Column delete (context menu + confirmation)
 Rename column (double-click header)
Phase 2: Organization (P1)
 Column reorder (drag & drop)
 Column pin (left/right)
 Column context menu (full menu)
Phase 3: Data Operations (P1)
 Column sort (click header, visual indicator)
 Column filter (dropdown UI, filter logic)
Phase 4: Advanced (P2)
 Column settings panel
 Column templates
 Column groups
 Multi-column sort
 Auto-fit column width
9. Key Design Decisions
Decision 1: Canvas vs React for Headers?
Recommendation: React for column headers

Why: Rich interactions (menus, inputs, modals)
Canvas for grid cells remains optimal
Headers are small surface area (~30 columns max)
Decision 2: Column State Management?
Recommendation: Store in GridModel

class GridModel {
  private columns: GridColumn[];
  private columnOrder: string[];  // For reordering
  private sortState?: ColumnSort[];
  private filterState?: ColumnFilter[];
}
Decision 3: Immediate vs Batch Updates?
Recommendation: Immediate for visual (resize, reorder), Batched for data (sort, filter)

Resize/reorder: Update immediately, feels responsive
Sort/filter: Debounce/batch to avoid thrashing on large datasets
10. Next Steps
Implement Column Resize (most requested)
Add Context Menu (foundation for all column actions)
Implement Hide/Show (simple, high value)
Implement Delete (completes basic CRUD)
Then: Reorder, Pin, Sort, Filter
Questions for Review
Column templates: Should we have predefined templates or let users configure from scratch?
Column groups: Priority? Or defer to later?
Multi-column sort: Need it for MVP or single-column is enough?
Filter UI: Inline dropdown vs dedicated filter panel?
Column permissions: Role-based (viewer can't edit column config)?