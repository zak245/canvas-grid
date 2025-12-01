# @grid-engine/core

A high-performance, opinionated grid engine for building spreadsheet-like interfaces.

[![npm version](https://badge.fury.io/js/@grid-engine%2Fcore.svg)](https://www.npmjs.com/package/@grid-engine/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Documentation 📚

- **[Engineering Overview](docs/ENGINEERING_OVERVIEW.md)** - 🆕 **Start Here**. High-level conceptual map for engineers.
- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.md)** - Comprehensive system design and module breakdown.
- **[Interaction Flow](docs/INTERACTION_FLOW.md)** - High-level guide to how user interactions are processed.
- **[Interaction Deep Dive](docs/INTERACTION_DEEP_DIVE.md)** - Detailed code-level analysis of the interaction subsystem (Layers 0-6).

## Engineering Overview: How It Works 🛠️

This is a high-level conceptual map of the Grid Engine. It is designed to help engineers understand the system's mental model without getting bogged down in implementation details.

### The Core Concept: Headless & Renderer-Agnostic

At its heart, this is not a "Canvas Grid" or a "React Grid". It is a **Logic Engine** that happens to draw things.

The system is built on a strictly decoupled **Model-View-Controller (MVC)** architecture:

1.  **The Brain (`GridEngine`)**: Handles all logic (sorting, selection, filtering, state). It knows *nothing* about HTML or Canvas.
2.  **The State (`GridModel`)**: An optimized data structure holding the cells, rows, and columns.
3.  **The View (`GridRenderer`)**: A pluggable layer that visualizes the state.

This separation allows us to swap the entire rendering engine (e.g., from Canvas to HTML) at runtime without changing a single line of business logic.

---

### 1. The Abstraction Layers

The system is organized into clear layers of responsibility.

#### Layer A: The Data Adapter (Source of Truth)
The engine never talks directly to your database or API. It talks to a `DataAdapter`.
*   **Role**: Bridges the internal Grid Model with the outside world.
*   **Abstraction**: `interface DataAdapter { fetchData(), updateCell(), ... }`
*   **Why**: You can switch from a local JSON array to a WebSocket feed just by swapping the adapter. The engine doesn't care.

#### Layer B: The Logical Model (Internal State)
*   **Components**: `GridModel`, `SelectionManager`, `HistoryManager`.
*   **Logic**: "Cell [2, 5] is selected", "Column 'Price' is sorted ASC".
*   **Coordinates**: Uses **Logical Coordinates** (`row: 5`, `col: 2`).
*   **State Split**:
    *   **Data State**: (Values) stored in `GridModel` (Mutable, optimized for speed).
    *   **UI State**: (Selection, Hover) stored in `Zustand` (Immutable, reactive).

#### Layer C: The Input Bridge (EventNormalizer)
This is the magic glue. Browsers give us pixel events (`x: 500, y: 200`). The engine needs logical commands.
*   **Role**: Intercepts DOM events -> Translates Pixels to Logical Coords -> Dispatches Commands.
*   **Flow**: `Click(500px, 200px)` -> `Normalizer` -> `Click(Row 10, Col 3)` -> `Engine`.
*   **Why**: This allows the same logic to work whether you click a pixel on a Canvas or a `<div>` in the DOM.

#### Layer D: The Renderer (Visualization)
*   **Abstraction**: `interface GridRenderer { render(), attach(), detach() }`
*   **Implementations**:
    *   **Canvas**: Draws pixels. Fast (60fps). O(1) complexity.
    *   **HTML**: Moves absolute-positioned `<div>`s. Accessible. O(N) complexity.
    *   **React**: Emits signals to a React tree. Flexible.

---

### 2. The Interaction Loop

Everything happens in a strict unidirectional cycle:

1.  **Input**: User acts (Click, Keypress).
2.  **Normalize**: `InputController` converts raw event to Logical Command.
3.  **Update**: Managers (Selection, Editing) update the State.
4.  **Notify**: `EventBus` broadcasts changes (`selection:change`).
5.  **Render**: The Engine triggers the active Renderer to repaint.

---

### 3. Coordinate Systems

Understanding the two coordinate systems is crucial:

| System | Unit | Used By | Example |
| :--- | :--- | :--- | :--- |
| **Screen Space** | Pixels (`x`, `y`) | Renderers, Mouse Events | `x: 150`, `y: 300` |
| **Grid Space** | Indices (`col`, `row`) | Model, Logic, Data | `col: 2`, `row: 5` |

*   **Viewport**: The camera. It tracks `scrollTop` and `scrollLeft` to map between the two systems.
*   **Virtualization**: To support millions of rows, we only "solve" the math (Logical <-> Screen) for the items currently visible in the Viewport.

---

### 4. Key Logic Abstractions

#### "Cell Types" as Plugins
A `CellType` is a self-contained plugin defining how a specific data type behaves.
*   **Renderer**: How to draw it (Text, Date, Boolean).
*   **Editor**: What input to show when double-clicked.
*   **Validator**: Is the input valid?
*   **Formatter**: How to display the value string.

#### "Managers" for Modular Logic
The `GridEngine` class is just a container. The actual logic lives in specialized managers:
*   `SelectionManager`: Handles range math (Shift+Click logic).
*   `EditingManager`: Handles the lifecycle of an edit (Start -> Validate -> Commit).
*   `HistoryManager`: Handles Undo/Redo stacks.

---

### Summary for Engineers

*   **Don't look for `<div>`s** in the core logic. Think in abstract `(row, col)` coordinates.
*   **Logic is centralized.** If you want to change how selection works, you change it in *one* place (`SelectionManager`), and it updates Canvas, HTML, and React modes instantly.
*   **Data is decoupled.** The grid is just a viewer/editor for a data source provided via the Adapter.

## Triple Engine Architecture 🚀

**Make it count.** Why choose between performance and flexibility when you can have both?

The engine features a groundbreaking **Triple Rendering Engine** that lets you switch strategies based on your specific use case, without changing your data model or business logic.

### 1. Canvas Engine (The Speed Demon)
*   **Best for**: Extreme Performance, Large Datasets (100k+ rows).
*   **Tech**: Pure HTML5 Canvas, 60FPS scrolling, GPU acceleration.
*   **Why**: When you need raw speed and data density. It's the default for a reason.

### 2. HTML Engine (The DOM Master)
*   **Best for**: Accessibility (A11y), Native Text Selection, CSS styling.
*   **Tech**: Virtualized DOM elements.
*   **Why**: When you need screen readers to "read" the grid or want to use standard CSS for complex layouts while keeping decent performance (up to 5k rows).

### 3. React Engine (The Component King)
*   **Best for**: Complex Interactivity, Custom React Components.
*   **Tech**: Headless state management with React rendering.
*   **Why**: Embed your existing Dropdowns, DatePickers, and interactive Cards directly into cells. Complete component flexibility.

---

## Features


- **🚀 High Performance**: Canvas-based rendering with virtualization for 100K+ rows at 60fps
- **📚 Workbooks & Sheets**: Multi-sheet support with a centralized manager, just like a spreadsheet
- **🔌 Adapter System**: Connect to any data source (Local, REST API, WebSocket)
- **⚡️ Optimistic Updates**: Built-in support for instant UI updates with background sync
- **📦 Batteries Included**: Built-in cell types, editors, and validation
- **⚛️ React Ready**: Hooks and components for easy React integration
- **📱 Touch Support**: Works on mobile and tablet devices
- **⌨️ Keyboard Navigation**: Full keyboard support for power users

## Installation

```bash
npm install @grid-engine/core
```

## Quick Start

### 1. Workbooks (Multi-Sheet)

The `WorkbookManager` is the recommended way to use the library, as it handles multiple sheets and coordinates state.

```typescript
import { WorkbookShell, useWorkbook } from '@grid-engine/react';
import { WorkbookManager } from '@grid-engine/core';

// Initialize a manager with one or more sheets
const manager = new WorkbookManager([
  { 
    id: 'sheet-1', 
    name: 'Sales Data', 
    config: {
      dataSource: {
        mode: 'local',
        initialData: {
            columns: [
                { id: 'id', title: 'ID', width: 60, type: 'text' },
                { id: 'name', title: 'Product', width: 150, type: 'text' }
            ],
            rows: []
        }
      }
    } 
  }
]);

function App() {
  // The WorkbookShell handles the canvas, tabs, and sheet switching
  return (
    <div style={{ height: '100vh' }}>
      <WorkbookShell manager={manager} />
    </div>
  );
}
```

### 2. Single Grid (Standalone)

For simple use cases requiring only a single grid without tabs:

```typescript
import { createGridEngine } from '@grid-engine/core';

const engine = createGridEngine({
  dataSource: {
    mode: 'local',
    initialData: {
      columns: [
        { id: 'name', title: 'Name', type: 'text', width: 150 },
        { id: 'role', title: 'Role', type: 'select', width: 120 }
      ],
      rows: [
        {
          id: 'row-1',
          cells: new Map([
            ['name', { value: 'Alice' }],
            ['role', { value: 'Admin' }]
          ])
        }
      ]
    }
  }
});

// Mount to a canvas element
engine.mount(document.getElementById('grid-canvas'));
```

### 3. Connecting to a Backend

To persist data, use the `BackendAdapter` or create your own `DataAdapter` implementation.

```typescript
import { createGridEngine, BackendAdapter } from '@grid-engine/core';

// Initialize adapter with your API endpoint
const adapter = new BackendAdapter({
  baseUrl: 'https://api.your-app.com',
  gridId: 'user-grid-1'
});

const engine = createGridEngine({
  dataSource: {
    // Use 'backend' mode but provide the custom/configured adapter
    mode: 'backend',
    adapter: adapter
  },
  // Optional: Handle lifecycle events
  lifecycle: {
    onCellChange: ({ rowIndex, columnId, value }) => {
      console.log(`Updated cell: ${rowIndex}, ${columnId} = ${value}`);
    },
    onError: (error) => {
      console.error('Grid error:', error);
    }
  }
});
```

## Built-in Cell Types

The library comes with a comprehensive registry of cell types, each with its own renderer, editor, and validator.

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `text` | Single-line text input | Names, descriptions |
| `number` | Numeric values with formatting | Prices, quantities, ages |
| `currency` | Currency formatting (e.g., $1,000.00) | Financial data |
| `date` | Date picker & formatter | Deadlines, birthdates |
| `boolean` | Checkbox toggle | Active status, flags |
| `select` | Dropdown menu | Categories, status |
| `email` | Email validation & mailto link | User contacts |
| `url` | Clickable external links | Websites, resources |
| `phone` | Phone number formatting | Contact directories |
| `progress` | Visual progress bar (0-1) | Project completion |
| `rating` | Star rating component | Reviews, scores |
| `tags` | Multi-select colored tags | Skills, labels |
| `linked` | Reference to another record | Foreign keys, relations |
| `entity` | Rich object with avatar/label | User profiles, companies |
| `json` | Raw JSON editor | Configs, metadata |
| `action` | Interactive buttons | Edit/Delete row actions |
| `ai` | AI-assisted content generation | Auto-summaries, insights |

## Interactions & UI/UX

### 🖱 Mouse Interactions
- **Cell Selection**: Click to select single cell, drag to select range.
- **Range Extension**: Shift + Click to extend selection from anchor.
- **Multi-Selection**: Ctrl/Cmd + Click to add non-contiguous ranges.
- **Fill Handle**: Drag the bottom-right corner of selection to fill data (Excel-like).
- **Column Resize**: Drag right edge of column header. Double-click to auto-fit.
- **Column Reorder**: Drag and drop column headers to rearrange.
- **Row Reorder**: Drag and drop row numbers to rearrange.
- **Row Selection**: Click row number to select entire row. Drag to select multiple.
- **Context Menu**: Right-click for actions (Copy, Cut, Paste, Delete).

### ⌨️ Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Arrow Keys` | Navigate cells |
| `Tab` / `Shift+Tab` | Move to next/previous cell |
| `Enter` | Start editing / Commit edit / Move down |
| `Escape` | Cancel editing |
| `Home` / `End` | Jump to start/end of row |
| `PageUp` / `PageDown` | Scroll by page |
| `Ctrl/Cmd + A` | Select all |
| `Ctrl/Cmd + C` | Copy selection to clipboard |
| `Ctrl/Cmd + X` | Cut selection |
| `Ctrl/Cmd + V` | Paste from clipboard |
| `Ctrl/Cmd + Z` | Undo last action |
| `Ctrl/Cmd + Y` | Redo last action |
| `Delete` / `Backspace` | Clear content of selected cells |

### 🎨 UI Features
- **Virtualization**: Renders only visible cells, supporting 100,000+ rows smoothly.
- **Frozen Columns**: Lock columns (like ID or Name) to the left side.
- **Column Grouping**: Group rows by column values with collapsible headers.
- **Optimistic UI**: Immediate feedback on edits before server confirmation.
- **Accessibility**: Focus management and keyboard navigation compliance.
- **Theming**: Fully customizable colors, fonts, and dimensions via config.
- **Clipboard**: Full TSV support compatible with Excel and Google Sheets.

## Architecture

### Data Adapters

The engine is decoupled from data storage via the `DataAdapter` interface.

- **`LocalAdapter`**: (Included) Manages data in-memory. Great for simple lists or read-only views.
- **`BackendAdapter`**: (Included) A reference implementation for REST APIs. Supports optimistic updates, pagination, and server-side operations.
- **Custom Adapter**: Implement the `DataAdapter` interface to connect to Firebase, GraphQL, WebSockets, or any other source.

### Optimistic Updates

The engine handles user interactions immediately ("Optimistic UI") and synchronizes with the adapter in the background. If the adapter throws an error, the engine automatically rolls back the change.

## License

MIT
