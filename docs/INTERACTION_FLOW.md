# Grid Interaction Flow & Architecture

This document details the complete interaction lifecycle within the Grid project, covering both Canvas and Non-Canvas (HTML/React) rendering modes. The system is designed with a **headless engine architecture**, meaning the logic for state, interaction, and data is decoupled from the visual presentation.

## 1. High-Level Architecture

The interaction system relies on three main pillars:
1.  **GridEngine**: The central brain that holds state (`GridModel`, `SelectionManager`, `Viewport`) and coordinates updates.
2.  **InputController**: The bridge between the browser's DOM events and the internal grid logic.
3.  **Renderer**: The visual layer (Canvas, HTML, or React) that draws the state.

regardless of the renderer, the **interaction logic is unified**. The engine treats user inputs as abstract commands (e.g., "Select Cell at 1,1") rather than specific DOM interactions.

## 2. The Interaction Loop

Every interaction follows a standardized flow:

```mermaid
graph TD
    User[User Action] -->|DOM Event| Input[InputController]
    Input -->|Raw Event| Handler[Mouse/Keyboard Handler]
    Handler -->|GridInputEvent| Normalizer[EventNormalizer]
    Normalizer -->|NormalizedEvent (Col, Row)| Logic[GridEngine Logic]
    Logic -->|State Update| Store[Grid State/Model]
    Store -->|Event Emit| Engine[GridEngine Loop]
    Engine -->|Render Call| Renderer[Canvas/HTML Renderer]
```

### Step 1: Event Capture (InputController)
When the grid mounts, `GridEngine` initializes the `InputController`. This controller attaches standard DOM event listeners to the **container element** (the `div` or `canvas` hosting the grid).

-   **Mouse**: `mousedown`, `mousemove`, `mouseup`, `contextmenu`, `wheel`
-   **Keyboard**: `keydown`
-   **Clipboard**: `copy`, `cut`, `paste` (attached globally to `document` but filtered)

**Key Concept**: The grid is always "listening," regardless of whether it's drawing pixels on a canvas or moving `div`s around.

### Step 2: Event Normalization (EventNormalizer)
This is the crucial step that unifies Canvas and HTML modes. The `EventNormalizer` translates raw pixel coordinates (`x`, `y`) from the mouse event into logical Grid coordinates (`col`, `row`).

1.  **Coordinate Calculation**:
    -   Takes `clientX/Y` relative to the grid container.
    -   Subtracts header heights and row header widths.
    -   Adjusts for `scrollLeft` and `scrollTop`.
    -   Divides by `rowHeight` to find the **Row Index**.
    -   Iterates through column widths to find the **Column Index**.

2.  **Region Detection**:
    -   Determines if the click happened in the `corner`, `row-header`, `header`, or `cell` body.

3.  **HTML Specifics**:
    -   In HTML/React mode, the Normalizer also checks `event.target` for elements with `data-action` attributes. This allows specific buttons (like a "Open Menu" icon) to trigger distinct actions even if they are inside a cell.

### Step 3: Logic & State Updates (Handlers)
The `MouseHandler` and `KeyboardHandler` consume the normalized events and invoke methods on the `GridEngine`.

#### Mouse Interactions
-   **Selection**: Clicking a cell calls `engine.selection.selectCell(col, row)`.
-   **Drag Selection**: `mousedown` starts a drag state; `mousemove` updates the selection range.
-   **Resizing**: Hovering near a column/row edge changes the cursor. Dragging updates `column.width` or `row.height`.
-   **Header Actions**: Clicking a header triggers selection or sorting. Double-clicking auto-sizes (not yet fully implemented in snippets).

#### Keyboard Interactions
-   **Navigation**: Arrow keys move the selection (`engine.moveSelection(dx, dy)`).
-   **Editing**: Typing a character or pressing `Enter` triggers `engine.startEdit()`.
-   **Shortcuts**:
    -   `Shift + Arrow`: Expand selection.
    -   `Ctrl/Cmd + C`: Copy selected range.
    -   `Ctrl/Cmd + Z`: Undo.

### Step 4: Rendering (Canvas vs. Non-Canvas)
Once the state is updated, the `GridEngine` triggers a render cycle.

#### Canvas Renderer
-   **Mechanism**: Uses the HTML5 `<canvas>` 2D Context.
-   **Process**:
    1.  Clears the entire canvas rect.
    2.  Calculates the "Visible Window" (which rows/cols are currently in the viewport).
    3.  Iterates through visible cells and draws them pixel-by-pixel (rects, text, lines).
    4.  Draws overlays (selection borders, drag handles) on top.
-   **Performance**: Extremely high. Handles millions of cells by only drawing what's visible.

#### HTML Renderer
-   **Mechanism**: Uses standard DOM elements (`div`, `span`).
-   **Process**:
    1.  Calculates the "Visible Window".
    2.  **Reconciliation**: Creates or updates absolute-positioned `div` elements for each visible cell.
    3.  Positions elements using the same math as the Event Normalizer (e.g., `top: row * height`, `left: col * width`).
-   **Interaction Difference**:
    -   Because elements are standard DOM nodes, you can technically inspect them.
    -   However, `pointer-events` are often managed to ensure the `InputController` on the parent container still captures the main interactions (like drag-selecting across multiple divs).

#### React Renderer (Conceptual)
-   Similar to HTML Renderer but uses React Virtual DOM to diff changes.
-   Likely uses a standard React component tree where `GridEngine` pushes state updates to a root context or store.

## Detailed Interaction Scenarios

### 1. Editing a Cell
1.  **Trigger**: User double-clicks a cell OR presses `Enter`.
2.  **Handler**: `MouseHandler` detects double-click -> calls `engine.startEdit()`.
3.  **Engine**:
    -   Sets `state.isEditing = true`.
    -   Determines the active cell's bounds.
4.  **Overlay**: The `CellEditorOverlay` (a React component or DOM overlay) appears *on top* of the canvas/grid at the exact cell coordinates.
5.  **Focus**: Focus moves from the grid container to the input in the overlay.
6.  **Commit**: User presses `Enter`.
    -   `InputController` (listening globally or on capture) or the Editor's internal handler catches it.
    -   Calls `engine.stopEdit(value)`.
    -   Engine updates `GridModel`.
    -   Overlay closes. Focus returns to Grid Container.

### 2. Scrolling
1.  **Trigger**: User scrolls with mouse wheel or trackpad.
2.  **Capture**: `InputController` listens for `wheel`.
3.  **Engine**:
    -   Updates `scrollTop` / `scrollLeft` in `Viewport`.
    -   Clamps values to content limits.
4.  **Render**:
    -   **Canvas**: Offsets the drawing origin.
    -   **HTML**: Updates the `top/left` positions of the recycled cell `div`s.

### 3. Hover Effects
1.  **Trigger**: Mouse moves over the grid.
2.  **Normalizer**: Calculates the cell under the cursor.
3.  **Optimization**: To prevent excessive re-renders, hover states might be handled locally or via a lightweight "Overlay" canvas that only redraws the highlight, avoiding a full grid repaint.
4.  **HTML Mode**: CSS `:hover` classes on the cell `div`s handle this natively without engine intervention, offering a slight performance variation.

## Summary of Differences

| Feature | Canvas Renderer | HTML/React Renderer |
| :--- | :--- | :--- |
| **Rendering** | Immediate Mode (Pixels) | Retained Mode (DOM Nodes) |
| **Memory** | Constant (Viewport size) | Proportional to Viewport (DOM nodes) |
| **Event Target** | Single `<canvas>` element | Individual `<div>` elements (bubble up) |
| **Styling** | Programmatic (Canvas API) | CSS / Tailwind |
| **Debugging** | Harder (pixels) | Easier (Inspect Element) |
| **Accessibility** | Requires hidden screen reader DOM | Native DOM structure (better a11y) |

Despite these differences, the **interaction logic remains 100% shared**. The HTML Renderer places elements exactly where the Canvas Renderer would draw them, ensuring that the engine's coordinate-based event logic works identically for both.

