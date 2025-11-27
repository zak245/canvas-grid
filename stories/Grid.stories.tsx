import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect, useRef } from 'react';
import { createGridEngine, GridEngine, GridColumn, GridRow } from '../src/core';

// ============================================================================
// Story Meta
// ============================================================================

const meta: Meta = {
  title: 'Grid Engine/Basic Grid',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
# Grid Engine

A high-performance, canvas-based grid engine for building spreadsheet-like interfaces.

## Features

- **Canvas Rendering**: 60fps performance with 100K+ rows
- **Built-in Cell Types**: text, number, date, boolean, select, email, url, phone, progress, linked
- **Full Interactions**: Selection, editing, keyboard navigation, copy/paste, fill handle
- **Event System**: Subscribe to grid events for integration with your app
- **React Integration**: Hooks and components for easy React integration

## Basic Usage

\`\`\`typescript
import { createGridEngine } from '@grid-engine/core';

const engine = createGridEngine({
  columns: [...],
  rows: [...],
});

engine.mount(canvasElement);
\`\`\`
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

// ============================================================================
// Helper Components
// ============================================================================

interface GridCanvasProps {
  columns: GridColumn[];
  rows: GridRow[];
  height?: number;
}

const GridCanvas: React.FC<GridCanvasProps> = ({ columns, rows, height = 400 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GridEngine | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create engine with initial data using proper config structure
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: {
          columns,
          rows,
        },
      },
    });

    engineRef.current = engine;

    // Mount to canvas
    engine.mount(canvasRef.current);

    // Handle resize
    const handleResize = () => {
      const parent = containerRef.current;
      if (!parent) return;

      const { clientWidth, clientHeight } = parent;
      const dpr = window.devicePixelRatio || 1;

      canvasRef.current!.width = clientWidth * dpr;
      canvasRef.current!.height = clientHeight * dpr;
      canvasRef.current!.style.width = `${clientWidth}px`;
      canvasRef.current!.style.height = `${clientHeight}px`;

      engine.resize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.unmount();
    };
  }, [columns, rows]);

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <canvas ref={canvasRef} />
    </div>
  );
};

// ============================================================================
// Sample Data
// ============================================================================

const sampleColumns: GridColumn[] = [
  { id: 'name', title: 'Name', type: 'text', width: 150 },
  { id: 'email', title: 'Email', type: 'email', width: 200 },
  { id: 'age', title: 'Age', type: 'number', width: 80 },
  { id: 'active', title: 'Active', type: 'boolean', width: 80 },
  { id: 'joined', title: 'Joined', type: 'date', width: 120 },
];

const sampleRows: GridRow[] = Array.from({ length: 100 }, (_, i) => ({
  id: `row-${i}`,
  cells: new Map([
    ['name', { value: `Person ${i + 1}`, displayValue: `Person ${i + 1}` }],
    ['email', { value: `person${i + 1}@example.com`, displayValue: `person${i + 1}@example.com` }],
    ['age', { value: 20 + (i % 50), displayValue: String(20 + (i % 50)) }],
    ['active', { value: i % 3 !== 0, displayValue: i % 3 !== 0 ? 'Yes' : 'No' }],
    ['joined', { value: new Date(2020, i % 12, (i % 28) + 1).toISOString(), displayValue: new Date(2020, i % 12, (i % 28) + 1).toLocaleDateString() }],
  ]),
}));

// ============================================================================
// Stories
// ============================================================================

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <GridCanvas columns={sampleColumns} rows={sampleRows} />,
};

export const EmptyGrid: Story = {
  render: () => (
    <GridCanvas
      columns={[
        { id: 'col1', title: 'Column 1', type: 'text', width: 150 },
        { id: 'col2', title: 'Column 2', type: 'text', width: 150 },
        { id: 'col3', title: 'Column 3', type: 'text', width: 150 },
      ]}
      rows={[]}
    />
  ),
};

export const LargeDataset: Story = {
  render: () => {
    const columns: GridColumn[] = [
      { id: 'id', title: 'ID', type: 'number', width: 80 },
      { id: 'name', title: 'Name', type: 'text', width: 150 },
      { id: 'value', title: 'Value', type: 'number', width: 100 },
      { id: 'status', title: 'Status', type: 'text', width: 100 },
      { id: 'date', title: 'Date', type: 'date', width: 120 },
    ];

    const rows: GridRow[] = Array.from({ length: 10000 }, (_, i) => ({
      id: `row-${i}`,
      cells: new Map([
        ['id', { value: i + 1, displayValue: String(i + 1) }],
        ['name', { value: `Item ${i + 1}`, displayValue: `Item ${i + 1}` }],
        ['value', { value: Math.round(Math.random() * 1000), displayValue: String(Math.round(Math.random() * 1000)) }],
        ['status', { value: ['Active', 'Pending', 'Completed'][i % 3], displayValue: ['Active', 'Pending', 'Completed'][i % 3] }],
        ['date', { value: new Date(2024, i % 12, (i % 28) + 1).toISOString(), displayValue: new Date(2024, i % 12, (i % 28) + 1).toLocaleDateString() }],
      ]),
    }));

    return <GridCanvas columns={columns} rows={rows} height={600} />;
  },
};

export const DifferentColumnTypes: Story = {
  render: () => {
    const columns: GridColumn[] = [
      { id: 'text', title: 'Text', type: 'text', width: 150 },
      { id: 'number', title: 'Number', type: 'number', width: 100 },
      { id: 'date', title: 'Date', type: 'date', width: 120 },
      { id: 'boolean', title: 'Boolean', type: 'boolean', width: 80 },
      { id: 'email', title: 'Email', type: 'email', width: 180 },
      { id: 'url', title: 'URL', type: 'url', width: 200 },
    ];

    const rows: GridRow[] = [
      {
        id: 'row-1',
        cells: new Map([
          ['text', { value: 'Hello World', displayValue: 'Hello World' }],
          ['number', { value: 42, displayValue: '42' }],
          ['date', { value: new Date().toISOString(), displayValue: new Date().toLocaleDateString() }],
          ['boolean', { value: true, displayValue: 'Yes' }],
          ['email', { value: 'test@example.com', displayValue: 'test@example.com' }],
          ['url', { value: 'https://example.com', displayValue: 'https://example.com' }],
        ]),
      },
      {
        id: 'row-2',
        cells: new Map([
          ['text', { value: 'Another row', displayValue: 'Another row' }],
          ['number', { value: 123.45, displayValue: '123.45' }],
          ['date', { value: new Date(2024, 0, 1).toISOString(), displayValue: 'Jan 1, 2024' }],
          ['boolean', { value: false, displayValue: 'No' }],
          ['email', { value: 'user@company.com', displayValue: 'user@company.com' }],
          ['url', { value: 'https://google.com', displayValue: 'https://google.com' }],
        ]),
      },
    ];

    return <GridCanvas columns={columns} rows={rows} />;
  },
};

