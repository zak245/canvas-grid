# Engineering Overview: How It Works 🛠️

This document provides a high-level conceptual map of the Grid Engine. It is designed to help engineers understand the system's mental model without getting bogged down in implementation details.

## The Core Concept: Headless & Renderer-Agnostic

At its heart, this is not a "Canvas Grid" or a "React Grid". It is a **Logic Engine** that happens to draw things.

The system is built on a strictly decoupled **Model-View-Controller (MVC)** architecture:

1.  **The Brain (`GridEngine`)**: Handles all logic (sorting, selection, filtering, state). It knows *nothing* about HTML or Canvas.
2.  **The State (`GridModel`)**: An optimized data structure holding the cells, rows, and columns.
3.  **The View (`GridRenderer`)**: A pluggable layer that visualizes the state.

This separation allows us to swap the entire rendering engine (e.g., from Canvas to HTML) at runtime without changing a single line of business logic.

---

## 1. The Abstraction Layers

The system is organized into clear layers of responsibility.

### Layer A: The Data Adapter (Source of Truth)
The engine never talks directly to your database or API. It talks to a `DataAdapter`.
*   **Role**: Bridges the internal Grid Model with the outside world.
*   **Abstraction**: `interface DataAdapter { fetchData(), updateCell(), ... }`
*   **Why**: You can switch from a local JSON array to a WebSocket feed just by swapping the adapter. The engine doesn't care.

### Layer B: The Logical Model (Internal State)
*   **Components**: `GridModel`, `SelectionManager`, `HistoryManager`.
*   **Logic**: "Cell [2, 5] is selected", "Column 'Price' is sorted ASC".
*   **Coordinates**: Uses **Logical Coordinates** (`row: 5`, `col: 2`).
*   **State Split**:
    *   **Data State**: (Values) stored in `GridModel` (Mutable, optimized for speed).
    *   **UI State**: (Selection, Hover) stored in `Zustand` (Immutable, reactive).

### Layer C: The Input Bridge (EventNormalizer)
This is the magic glue. Browsers give us pixel events (`x: 500, y: 200`). The engine needs logical commands.
*   **Role**: Intercepts DOM events -> Translates Pixels to Logical Coords -> Dispatches Commands.
*   **Flow**: `Click(500px, 200px)` -> `Normalizer` -> `Click(Row 10, Col 3)` -> `Engine`.
*   **Why**: This allows the same logic to work whether you click a pixel on a Canvas or a `<div>` in the DOM.

### Layer D: The Renderer (Visualization)
*   **Abstraction**: `interface GridRenderer { render(), attach(), detach() }`
*   **Implementations**:
    *   **Canvas**: Draws pixels. Fast (60fps). O(1) complexity.
    *   **HTML**: Moves absolute-positioned `<div>`s. Accessible. O(N) complexity.
    *   **React**: Emits signals to a React tree. Flexible.

---

## 2. The Interaction Loop

Everything happens in a strict unidirectional cycle:

1.  **Input**: User acts (Click, Keypress).
2.  **Normalize**: `InputController` converts raw event to Logical Command.
3.  **Update**: Managers (Selection, Editing) update the State.
4.  **Notify**: `EventBus` broadcasts changes (`selection:change`).
5.  **Render**: The Engine triggers the active Renderer to repaint.

---

## 3. Coordinate Systems

Understanding the two coordinate systems is crucial:

| System | Unit | Used By | Example |
| :--- | :--- | :--- | :--- |
| **Screen Space** | Pixels (`x`, `y`) | Renderers, Mouse Events | `x: 150`, `y: 300` |
| **Grid Space** | Indices (`col`, `row`) | Model, Logic, Data | `col: 2`, `row: 5` |

*   **Viewport**: The camera. It tracks `scrollTop` and `scrollLeft` to map between the two systems.
*   **Virtualization**: To support millions of rows, we only "solve" the math (Logical <-> Screen) for the items currently visible in the Viewport.

---

## 4. Key Logic Abstractions

### "Cell Types" as Plugins
A `CellType` is a self-contained plugin defining how a specific data type behaves.
*   **Renderer**: How to draw it (Text, Date, Boolean).
*   **Editor**: What input to show when double-clicked.
*   **Validator**: Is the input valid?
*   **Formatter**: How to display the value string.

### "Managers" for Modular Logic
The `GridEngine` class is just a container. The actual logic lives in specialized managers:
*   `SelectionManager`: Handles range math (Shift+Click logic).
*   `EditingManager`: Handles the lifecycle of an edit (Start -> Validate -> Commit).
*   `HistoryManager`: Handles Undo/Redo stacks.

---

## Summary for Engineers

*   **Don't look for `<div>`s** in the core logic. Think in abstract `(row, col)` coordinates.
*   **Logic is centralized.** If you want to change how selection works, you change it in *one* place (`SelectionManager`), and it updates Canvas, HTML, and React modes instantly.
*   **Data is decoupled.** The grid is just a viewer/editor for a data source provided via the Adapter.

