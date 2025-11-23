# Canvas Headers Migration Plan

## Objective
Eliminate visual lag and synchronization issues between Column Headers (currently React DOM) and the Grid Body (Canvas) during scrolling, resizing, and column visibility changes.

## Architecture Strategy: "Hybrid Canvas Headers"

We will move the **rendering source of truth** for headers entirely to the HTML5 Canvas. React will effectively "retire" from layout duties and focus solely on **overlay interactions** (menus, tooltips, editors).

### Key Decisions
1.  **No `d3-scale`**: We will stick to performant, raw arithmetic (`x += col.width`) for layout calculations.
2.  **No `react-use-gesture`**: We will expand our existing `MouseHandler.ts` to handle header interactions, keeping the engine dependency-free and "close to the metal".
3.  **Visuals**: Text, Borders, Backgrounds, and Sort Icons will be drawn via `CanvasRenderingContext2D`.
4.  **Interactions**: 
    -   **Clicks/Drags**: Handled by `MouseHandler`.
    -   **Menus/Popovers**: Triggered by `MouseHandler` but rendered as React Portals at the correct (x,y) coordinates.

---

## Implementation Roadmap

### Phase 1: Canvas Header Rendering
**Goal**: Draw the headers visually on the canvas.

1.  **Update `GridTheme`**:
    -   Ensure header styles (font, bg color, height) are fully defined in the theme object.
2.  **Update `CanvasRenderer.ts`**:
    -   Implement `drawHeaders()` method.
    -   Logic: Iterate `visibleColumns`, draw rects and text at `y=0` to `y=headerHeight`.
    -   **Sticky**: Use `ctx.translate(-scrollLeft, 0)` for headers to keep them vertically fixed but horizontally scrollable.
    -   **Selection**: If a column is selected, draw a specific "Selected Header" style (blue background/border) to indicate selection visually includes the header.
3.  **Update `GridContainer.tsx`**:
    -   Remove the DOM-based `<ColumnHeaders />` component.
    -   Keep the `onAddColumn` logic but move the trigger to Canvas.

### Phase 2: Header Interaction Logic (MouseHandler)
**Goal**: Re-implement clicking, sorting, resizing, and **Reordering** using Canvas coordinates.

1.  **Update `MouseHandler.ts`**:
    -   Detect if `mouseY < headerHeight`.
    -   **Hit Testing**: Map `mouseX + scrollLeft` to the correct column index.
    -   **Cursor Management**: 
        -   Edge (±5px): `col-resize`
        -   Center: `grab` (for reorder) or `pointer` (for click)
    
    -   **Click Handling**:
        -   **Left Click**: 
            -   If on Sort Icon -> Toggle Sort.
            -   If on Menu Icon -> Open Menu.
            -   Else -> Select Column (Call `engine.selectColumn` with modifier keys).
        -   **Double Click**: Auto-resize (on edge).

    -   **Drag Handling (Resize)**:
        -   If started on edge -> Resize column width. Update model immediately.

    -   **Drag Handling (Reorder)**:
        -   If started on center -> Start Reorder Mode.
        -   **Visuals**: Draw a "ghost" header following the mouse.
        -   **Indicator**: Draw a vertical blue line between columns indicating drop target.
        -   **Drop**: Calculate new index, call `engine.moveColumn(from, to)`.

### Phase 3: React Overlays & Menus
**Goal**: Keep the "Rich" UI parts working (Dropdowns).

1.  **`GridEngine` Events**:
    -   Add `onHeaderMenuClick(colId, x, y)` to `Lifecycle` or `GridEngine` callbacks.
2.  **`GridContainer` Integration**:
    -   Listen to `onHeaderMenuClick`.
    -   Update React state to show `<ColumnMenu />` at the given (x,y).
3.  **Ghost Column**:
    -   Render the "+" button as a graphic in `CanvasRenderer`.
    -   Clicking it triggers `onAddColumnClick` in React.

### Phase 4: Refactoring & Cleanup
**Goal**: Remove dead code.

1.  Delete `src/components/ColumnHeaders.tsx`.
2.  Clean up `GridContainer` props related to the old headers.
3.  Verify `selection` overlays line up perfectly with new headers.

---

## Technical Challenges & Solutions

### 1. Sticky Headers
**Problem**: When scrolling down, headers must stay at top.
**Solution**: In `CanvasRenderer.render()`:
1.  Clear Canvas.
2.  `ctx.save()` -> `ctx.translate(-scrollLeft, -scrollTop + headerHeight)` -> Draw Data Rows. `ctx.restore()`.
3.  `ctx.save()` -> `ctx.translate(-scrollLeft, 0)` -> Draw Headers. `ctx.restore()`.
    *   This draws headers *over* any data that might scroll behind them.

### 2. Icons (Sort, Menu)
**Problem**: Drawing SVG icons on Canvas is tedious.
**Solution**: 
-   **Option A (Fastest)**: Use `Path2D` for simple shapes (arrows, hamburger menu).
-   **Proposal**: Use simple `Path2D` drawing for Sort Arrow and Menu dots. It keeps it dependency-free and crisp.

### 3. Text Truncation
**Problem**: CSS does `text-overflow: ellipsis` automatically. Canvas does not.
**Solution**: Implement a helper `drawTextWithEllipsis(ctx, text, maxWidth)` that measures text and chops it if it overflows.

## Next Steps
1.  Execute **Phase 1** (Rendering).
2.  Verify synchronization.
3.  Execute **Phase 2** (Interactions).
