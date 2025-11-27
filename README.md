# @grid-engine/core

A high-performance, opinionated grid engine for building spreadsheet-like interfaces.

[![npm version](https://badge.fury.io/js/@grid-engine%2Fcore.svg)](https://www.npmjs.com/package/@grid-engine/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **🚀 High Performance**: Canvas-based rendering with virtualization for 100K+ rows at 60fps
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

### 1. Local Data (In-Memory)

The simplest way to get started is using the `LocalAdapter` with in-memory data.

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

### 2. Connecting to a Backend

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
