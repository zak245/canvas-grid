# @grid-engine/core - Technical Architecture

This document provides a comprehensive technical overview of the `@grid-engine/core` library. It explains the architecture, core components, data flow, and implementation details.

---

## 1. Core Architecture Overview

The library follows a **Modified MVC (Model-View-Controller)** pattern designed for high-performance canvas rendering.

- **Model (`GridModel`)**: Single source of truth for grid data (columns, rows, cells). It is optimized for O(1) lookups and efficient updates.
- **View (`CanvasRenderer`)**: A purely functional rendering layer that draws the state of the Model and the Engine onto an HTML5 Canvas. It is stateless and driven by the requestAnimationFrame loop.
- **Controller (`GridEngine`)**: The central brain that orchestrates user inputs, state changes, and coordinates between the Model, View, and Data Adapters.

### Data Flow

1.  **Input**: User interaction (Mouse/Keyboard) is captured by `InputController`.
2.  **Logic**: `GridEngine` processes the input (e.g., "Select Cell", "Sort Column").
3.  **State Update**:
    - **Transient State**: (Selection, Hover) is updated in the `Zustand` store.
    - **Persistent Data**: (Values, Sort Order) is updated in the `GridModel` and synced via `DataAdapter`.
4.  **Render**: The `CanvasRenderer` reads the new state and repaints the dirty regions of the canvas.

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

## 2. Engine Components (The Controller)

The `GridEngine` class is the entry point. It initializes the environment and composes specific "Managers" to handle distinct domains of logic.

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

## 3. Data Model & Adapters (The Model)

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

## 4. Rendering System (The View)

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

## 5. Cell Type System

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

## 6. State Management

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
