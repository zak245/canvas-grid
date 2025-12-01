# @grid-engine/core - Technical Architecture

This document provides a comprehensive technical overview of the `@grid-engine/core` library. It explains the architecture, core components, data flow, and implementation details.

---

## 1. Core Architecture Overview

The library follows a **Modified MVC (Model-View-Controller)** pattern designed for high-performance canvas rendering, now extended with a **Workbook Manager** layer for multi-sheet support.

- **Model (`GridModel`, `WorkbookManager`)**: Single source of truth for grid data and workbook state. Optimized for O(1) lookups and efficient updates.
- **View (`CanvasRenderer`, `WorkbookShell`)**: A purely functional rendering layer that draws the state of the Model and the Engine onto an HTML5 Canvas, wrapped in a React shell for tabs and overlays.
- **Controller (`GridEngine`, `WorkbookManager`)**: The central brains. `WorkbookManager` orchestrates sheets; `GridEngine` orchestrates user inputs and logic for a specific sheet.

### Data Flow

1.  **Input**: User interaction (Mouse/Keyboard) is captured by `InputController` or `WorkbookShell`.
2.  **Logic**:
    - `WorkbookManager` processes sheet operations (Add, Rename, Switch).
    - `GridEngine` processes grid interactions (Select, Edit, Sort).
3.  **State Update**:
    - **Workbook State**: (Active Sheet, Sheet List) updated in `WorkbookManager` store.
    - **Grid State**: (Selection, Hover) updated in `GridEngine` store.
    - **Persistent Data**: (Values) updated in `GridModel`.
4.  **Render**: The `CanvasRenderer` repaints the active sheet's canvas.

### Event System (`EventBus`)

The components are decoupled via a strictly typed `EventBus`.
- **Publishers**: Engine, Managers, Adapters.
- **Subscribers**: UI components (React), External plugins, Logging systems.

**Key Events:**
- `data:change`: Fired when model data updates.
- `selection:change`: Fired when user selection changes.
- `cell:change`: Fired after a cell edit is committed.
- `column:resize`: Fired during/after column resizing.

---

## 2. Workbook Architecture (New)

The Workbook layer sits above the Grid Engine to manage multiple sheets, similar to Excel or Google Sheets.

### WorkbookManager
- **Role**: Top-level controller.
- **Responsibilities**:
    - Manages the list of `Sheet` objects.
    - Tracks the `activeSheetId`.
    - Lazily instantiates `GridEngine` for each sheet only when needed/activated.
    - Handles sheet lifecycle: Add, Delete, Duplicate, Rename, Reorder.
- **State**: Uses a lightweight `Zustand` store for reactive updates in the UI (tabs).

### Sheet Interface
```typescript
interface Sheet {
    id: string;
    name: string;
    config: GridConfig; // Configuration for this specific sheet
    engine?: GridEngine; // The engine instance (created on demand)
}
```

### Component Hierarchy
```
WorkbookShell (React Component)
 ├── Tabs/Sidebar (UI for switching sheets)
 └── GridContainer (The active sheet view)
      ├── Canvas Element (Rendered by GridEngine)
      └── Overlays (Editors, Menus, Tooltips)
```

---

## 3. Engine Components (The Controller)

The `GridEngine` class is the entry point for a single sheet. It initializes the environment and composes specific "Managers".

### GridEngine
- **Role**: Orchestrator.
- **Responsibilities**:
    - Initializes the `GridModel`, `Viewport`, and `DataAdapter`.
    - Manages the main `requestAnimationFrame` render loop.
    - Exposes the public API (e.g., `engine.updateCell()`, `engine.sort()`).

### SelectionManager
- **Role**: Handles what is selected.
- **Logic**:
    - Manages the `primary` focus cell and list of `ranges`.
    - Handles complex selection logic: Shift+Click (Range Extension), Ctrl+Click (Multi-Range).
    - Provides utility methods like `isCellSelected(row, col)` for the renderer.

### ColumnManager
- **Role**: Manages column definitions and state.
- **Logic**:
    - Handles resizing (updating width in Model).
    - Handles reordering (swapping indices in Model view).
    - Manages visibility (toggling `visible` flag).
    - Calculates visual offsets for rendering (X-positions).

### RowManager
- **Role**: Manages row presentation and organization.
- **Logic**:
    - Maintains the **View Index**: A mapping of `Visual Row Index -> Actual Row ID`.
    - Handles **Sorting**: Reorders the View Index without mutating the underlying data.
    - Handles **Grouping**: Inserts virtual "Group Header" rows into the View Index and manages expand/collapse state.

### EditingManager
- **Role**: Manages the cell editing lifecycle.
- **Flow**:
    1.  `startEdit(row, col)`: Calculates screen position, overlays the correct DOM editor.
    2.  User types...
    3.  `commitEdit(value)`: Validates input, updates Model, updates Adapter.
    4.  `cancelEdit()`: Discards changes, removes editor.

### HistoryManager
- **Role**: Implements Undo/Redo.
- **Pattern**: Command Pattern.
- **Logic**:
    - Stores a stack of `GridCommand` objects: `{ type, execute(), undo() }`.
    - `undo()`: Pops the last command and runs its `undo` function.
    - `redo()`: Pushes the command back and runs `execute()`.
    - Handles "Optimistic Rollback": If a backend save fails, the HistoryManager is used to revert the UI instantly.

### InputController
- **Role**: Bridges the DOM and the Engine.
- **Components**:
    - `MouseHandler`: Translates raw `mousemove`/`mousedown` into Grid Coordinates (`row`, `col`). Handles dragging, resizing zones, and context menus.
    - `KeyboardHandler`: Maps key codes to actions (`ArrowDown` -> Move Selection, `Ctrl+C` -> Copy).

---

## 4. The Coordinate System & Positioning Formulas

> **Note:** When we refer to "formulas" here, we mean the mathematical logic used to calculate positions, sizes, and hit targets for the rendering engine. This is **distinct** from spreadsheet formulas (like `=SUM(A1:B2)`), which are handled by the `DependencyGraph` (if implemented).

The engine must bridge two coordinate systems:
1.  **Screen Space (Pixels)**: Where the user clicks (`x: 150, y: 200`).
2.  **Grid Space (Logical)**: Where the data lives (`col: 3, row: 15`).

### Positioning Formulas (Logical -> Pixel)

When the renderer draws a cell, it must calculate its exact pixel bounding box. This is handled by the `Viewport` and `ColumnManager`.

#### Y-Position (Vertical)
The vertical position is a function of the row index and the scroll position.

```typescript
// Formula for calculating the Y position of a row
const getRowY = (rowIndex: number, scrollTop: number, config: GridConfig) => {
    // Base position: Row Index * Height
    let y = rowIndex * config.rowHeight;
    
    // Add Header Offset (headers are fixed at the top)
    y += config.headerHeight;
    
    // Subtract Scroll (move rows up as we scroll down)
    y -= scrollTop;
    
    return y;
};
```

#### X-Position (Horizontal)
The horizontal position is more complex because column widths are variable. The engine iterates through columns to accumulate offsets.

```typescript
// Formula for calculating the X position of a column
const getColumnX = (targetColIndex: number, scrollLeft: number, columns: GridColumn[]) => {
    let x = 0;
    let frozenWidth = 0;

    // 1. Sum width of all preceding columns
    for (let i = 0; i < targetColIndex; i++) {
        x += columns[i].width;
        
        // Track frozen columns (they don't scroll)
        if (columns[i].pinned) {
            frozenWidth += columns[i].width;
        }
    }

    // 2. Apply Scroll Adjustment
    // If the target column is NOT pinned, it moves with scroll.
    if (!columns[targetColIndex].pinned) {
        x -= scrollLeft;
        
        // 3. Clamp to Frozen Area
        // Unpinned columns should visually "disappear" behind pinned ones
        if (x < frozenWidth) {
             // Handled by clipping in the renderer
        }
    }
    
    return x + ROW_HEADER_WIDTH; // Add offset for the row number column
};
```

### Hit Testing Formulas (Pixel -> Logical)

When a user clicks, we perform "Hit Testing" using the inverse of the positioning formulas. This happens in `GridEngine.getCellPositionAt(x, y)`.

#### 1. Identify Region
First, we check if the click is in a special zone:
- `if y < headerHeight`: **Column Header**
- `if x < rowHeaderWidth`: **Row Header**
- `else`: **Grid Body**

#### 2. Binary Search / Index Calculation (Grid Body)
For the Grid Body, we translate pixels to indices.

```typescript
// Calculating Row Index from Mouse Y
const getRowIndexAt = (mouseY: number, scrollTop: number, config: GridConfig) => {
    // Convert Screen Y to "World Y" (Total scrollable height)
    const worldY = mouseY - config.headerHeight + scrollTop;
    
    // Integer Division
    const rowIndex = Math.floor(worldY / config.rowHeight);
    
    // Boundary Check
    if (rowIndex < 0 || rowIndex >= totalRows) return null;
    return rowIndex;
};
```

For Columns, since widths vary, we cannot use simple division. We iterate (or binary search) through the visible columns:

```typescript
// Calculating Column Index from Mouse X
const getColIndexAt = (mouseX: number, scrollLeft: number, columns: GridColumn[]) => {
    let currentX = ROW_HEADER_WIDTH;
    
    // Adjust for scroll if we are past the frozen section
    const isPastFrozen = mouseX > getFrozenWidth();
    const effectiveX = isPastFrozen ? (mouseX + scrollLeft) : mouseX;

    for (let i = 0; i < columns.length; i++) {
        const colWidth = columns[i].width;
        const nextX = currentX + colWidth;
        
        // Found the column!
        if (effectiveX >= currentX && effectiveX < nextX) {
            return i;
        }
        
        currentX = nextX;
    }
    return null;
};
```

---

## 5. Interaction Pipeline (Deep Dive)

Interactions are not handled by React. They are handled by a raw event processing pipeline to ensure 60FPS performance during drags and complex operations.

### The Pipeline

1.  **DOM Listener**: `InputController` receives a native DOM event (e.g., `mousedown`).
2.  **Dispatcher**: Events are routed to `MouseHandler` or `KeyboardHandler`.
3.  **Hit Test**: The handler uses the **Hit Testing Formulas** (above) to find the target `Cell` or `Header`.
4.  **Action Determination**:
    - *Left Click on Cell*: `SelectionManager.setPrimary(cell)`
    - *Right Click on Cell*: Open Context Menu
    - *Click on Separator*: Start `ColumnResize` mode
    - *Drag on Header*: Start `ColumnReorder` mode
5.  **State Mutation**: The engine updates the `Zustand` store (transient state) or `GridModel` (persistent state).
6.  **Render Request**: The engine flags the canvas as "dirty".
7.  **Paint**: `requestAnimationFrame` calls `CanvasRenderer.render()`.

### Example: Drag-Selecting Cells

**Scenario**: User clicks Cell `B2` and drags to `C4`.

1.  **MouseDown (B2)**:
    - `MouseHandler` detects click at `x: 120, y: 60`.
    - Hit Test returns `{ col: 1, row: 1 }` (0-indexed).
    - Engine calls `selectionManager.setPrimary({ col: 1, row: 1 })`.
    - `isDragging` flag is set to `true`.

2.  **MouseMove (Drag)**:
    - User moves mouse. `MouseHandler` receives continuous stream of events.
    - **Throttle**: We process these on `requestAnimationFrame` or throttled (16ms) to avoid overload.
    - Current Mouse Position -> Hit Test -> New Cell Target (e.g., `C4`).
    - Engine calls `selectionManager.setRangeEnd({ col: 2, row: 3 })`.
    - **State Update**: `selection.range` is updated to `{ start: B2, end: C4 }`.
    - **Render**: Canvas redraws. The `SelectionLayer` draws a blue rectangle using `getRangeBounds()`.

3.  **MouseUp**:
    - `isDragging` set to `false`.
    - Final selection is committed.

---

## 6. Data Model & Adapters (The Model)

The `GridModel` is the high-performance data structure holding the actual grid state. It allows the engine to be completely agnostic of where the data actually comes from (local memory, API, WebSocket).

### GridModel Structure
- **Columns**: Array of `GridColumn` definitions.
- **Rows**: `Map<RowID, GridRow>`.
    - `GridRow`: `{ id: string, cells: Map<ColumnID, GridCell> }`.
    - Using `Map` allows O(1) access to any cell given a Row ID and Column ID, which is critical for rendering performance.

### The Adapter Pattern (`DataAdapter`)
The engine communicates with the outside world exclusively through the `DataAdapter` interface.

```typescript
interface DataAdapter {
  fetchData(params): Promise<GridData>;
  updateCell(row, col, value): Promise<void>;
  addRow(row): Promise<GridRow>;
  // ...
}
```

#### 1. LocalAdapter
- **Usage**: For static data, small datasets, or read-only modes.
- **Implementation**:
    - Holds all data in a simple JavaScript array/object structure.
    - `fetchData` returns slices of this array (supports client-side pagination/sorting).
    - Updates mutate the local array immediately.

#### 2. BackendAdapter
- **Usage**: For connecting to a real server (REST API).
- **Implementation**:
    - Translates engine calls into HTTP requests (`GET /data`, `PUT /cells`, `POST /rows`).
    - **Optimistic Updates**:
        1. Engine calls `adapter.updateCell()`.
        2. Engine *immediately* updates `GridModel` (UI updates instantly).
        3. Adapter sends fetch request in background.
        4. **Failure Strategy**: If fetch fails, Adapter throws. Engine catches, triggers `HistoryManager.undo()` to revert the UI, and notifies user.

### Virtualization & Viewport
To support 100k+ rows, the model doesn't render everything.
- **Viewport**: Tracks `scrollTop`, `scrollLeft`, `width`, `height`.
- **Windowing**:
    - `startRow = floor(scrollTop / rowHeight)`
    - `endRow = ceil((scrollTop + height) / rowHeight)`
    - Only cells within `[startRow, endRow]` and `[startCol, endCol]` are queried from the Model and sent to the Renderer.

---

## 7. Rendering System (The View)

The `CanvasRenderer` is responsible for drawing the grid. It operates in "Immediate Mode", meaning it redraws the entire visible frame on every `requestAnimationFrame`.

### Render Loop
1.  **Clear Canvas**: `ctx.clearRect(0, 0, width, height)`
2.  **Calculate Visible Range**: Based on viewport scroll position.
3.  **Draw Layers**:
    - **Background**: Grid lines, alternating row colors.
    - **Cells**: Iterates through visible cells and calls `cellType.draw()`.
    - **Selection**: Semi-transparent blue overlay for selected range.
    - **Borders**: Active cell border (solid blue).
    - **Headers**: Fixed top layer for column headers (sticky behavior).
    - **Overlays**: Drag handles, drop indicators.

### Optimization Techniques
- **Double Buffering**: Uses an off-screen canvas if text rendering becomes a bottleneck (optional).
- **Dirty Checking**: (Future) Could skip rendering if state hasn't changed, but currently uses `raf` for smooth scrolling.
- **Sub-pixel Rendering**: Ensures sharp lines on High-DPI (Retina) displays by scaling the canvas context.

---

## 8. Cell Type System

The rendering of individual cells is pluggable. The `CellTypeRegistry` maps type names (e.g., 'text', 'date') to implementation objects.

### CellType Interface

```typescript
interface CellType<T> {
  name: string;
  draw(ctx, value, x, y, width, height, theme): void;
  format(value): string;
  validate(value): { valid: boolean, error?: string };
  // ...
}
```

### Customization
Developers can register custom cell types. For example, a `UserAvatarCell` that draws an image and text. The renderer simply looks up the type and calls `.draw()`, passing the canvas context. This keeps the core engine lightweight while allowing infinite visual flexibility.

---

## 9. State Management

The library splits state management into two categories to ensure performance:

### 1. Persistent State (GridModel)
- **Examples**: Cell values, column widths, sort order.
- **Storage**: `GridModel` class.
- **Update Frequency**: Low to Medium.
- **Sync Strategy**: Synced to Backend via Adapter.

### 2. Transient State (Zustand Store)
- **Examples**: Current selection, hover position, drag state, active menu.
- **Storage**: `Zustand` store (`GridEngineState`).
- **Update Frequency**: High (e.g., every mouse move).
- **Sync Strategy**: purely local, discarded on reload.

### Why split?
React reactivity (useState/Redux) is often too slow for 60fps canvas interactions like dragging a selection handle. By using a mutable `GridModel` for data and a lightweight `Zustand` store for UI state, the engine achieves native-like performance without React re-render overhead.

---

## Conclusion

`@grid-engine/core` is built for scale. By bypassing the DOM for the main grid area and using a virtualized canvas approach, it handles datasets that would crash a standard HTML table. The decoupled architecture allows it to fit into any stack (React, Vue, Vanilla) and connect to any backend, making it a versatile foundation for data-heavy applications.
