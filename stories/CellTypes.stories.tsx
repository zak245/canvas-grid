import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GridContainer } from '../src/react/components/GridContainer';
import { createGridEngine } from '../src/core';
import type { GridColumn, GridRow } from '../src/core/types/grid';

const meta: Meta<typeof GridContainer> = {
  title: 'Cell Types/Showcase',
  component: GridContainer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof GridContainer>;

// ============================================================================
// All Cell Types Demo
// ============================================================================

const allTypesColumns: GridColumn[] = [
  { id: 'text', title: 'Text', width: 150, type: 'text', visible: true },
  { id: 'number', title: 'Number', width: 100, type: 'number', visible: true },
  { id: 'currency', title: 'Currency', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'USD' } },
  { id: 'date', title: 'Date', width: 120, type: 'date', visible: true },
  { id: 'boolean', title: 'Boolean', width: 80, type: 'boolean', visible: true },
  { id: 'email', title: 'Email', width: 180, type: 'email', visible: true },
  { id: 'url', title: 'URL', width: 200, type: 'url', visible: true },
  { id: 'phone', title: 'Phone', width: 140, type: 'phone', visible: true },
  { id: 'progress', title: 'Progress', width: 120, type: 'progress', visible: true },
  { id: 'rating', title: 'Rating', width: 120, type: 'rating', visible: true, typeOptions: { max: 5, icon: 'star' } },
  { id: 'tags', title: 'Tags', width: 200, type: 'tags', visible: true, typeOptions: { 
    options: [
      { label: 'Feature', color: '#3b82f6' },
      { label: 'Bug', color: '#ef4444' },
      { label: 'Urgent', color: '#f97316' },
      { label: 'Done', color: '#22c55e' },
    ]
  }},
  { id: 'select', title: 'Select', width: 120, type: 'select', visible: true, typeOptions: {
    options: [
      { value: 'active', label: 'Active', color: '#22c55e' },
      { value: 'pending', label: 'Pending', color: '#fbbf24' },
      { value: 'inactive', label: 'Inactive', color: '#6b7280' },
    ]
  }},
];

const allTypesRows: GridRow[] = [
  {
    id: 'row_1',
    cells: new Map([
      ['text', { value: 'Hello World' }],
      ['number', { value: 1234.56 }],
      ['currency', { value: 99.99 }],
      ['date', { value: '2024-01-15' }],
      ['boolean', { value: true }],
      ['email', { value: 'john@example.com' }],
      ['url', { value: 'https://example.com' }],
      ['phone', { value: '+1 (555) 123-4567' }],
      ['progress', { value: 75 }],
      ['rating', { value: 4 }],
      ['tags', { value: ['Feature', 'Urgent'] }],
      ['select', { value: 'active' }],
    ]),
  },
  {
    id: 'row_2',
    cells: new Map([
      ['text', { value: 'Another row' }],
      ['number', { value: -500 }],
      ['currency', { value: 1250.00 }],
      ['date', { value: '2024-06-20' }],
      ['boolean', { value: false }],
      ['email', { value: 'jane@company.org' }],
      ['url', { value: 'https://github.com' }],
      ['phone', { value: '+44 20 7946 0958' }],
      ['progress', { value: 30 }],
      ['rating', { value: 2.5 }],
      ['tags', { value: ['Bug'] }],
      ['select', { value: 'pending' }],
    ]),
  },
  {
    id: 'row_3',
    cells: new Map([
      ['text', { value: 'Third entry' }],
      ['number', { value: 0 }],
      ['currency', { value: 0 }],
      ['date', { value: new Date().toISOString() }],
      ['boolean', { value: true }],
      ['email', { value: 'support@test.io' }],
      ['url', { value: 'https://docs.example.com/guide' }],
      ['phone', { value: '(800) 555-0199' }],
      ['progress', { value: 100 }],
      ['rating', { value: 5 }],
      ['tags', { value: ['Done', 'Feature'] }],
      ['select', { value: 'inactive' }],
    ]),
  },
];

export const AllCellTypes: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: {
          columns: allTypesColumns,
          rows: allTypesRows,
        },
      },
    });

    return (
      <div style={{ height: '400px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Currency Types Demo
// ============================================================================

const currencyColumns: GridColumn[] = [
  { id: 'description', title: 'Description', width: 150, type: 'text', visible: true },
  { id: 'usd', title: 'USD', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'USD' } },
  { id: 'eur', title: 'EUR', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'EUR' } },
  { id: 'gbp', title: 'GBP', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'GBP' } },
  { id: 'jpy', title: 'JPY', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'JPY', decimals: 0 } },
];

const currencyRows: GridRow[] = [
  { id: 'r1', cells: new Map([['description', { value: 'Product A' }], ['usd', { value: 99.99 }], ['eur', { value: 89.99 }], ['gbp', { value: 79.99 }], ['jpy', { value: 10000 }]]) },
  { id: 'r2', cells: new Map([['description', { value: 'Product B' }], ['usd', { value: 249.00 }], ['eur', { value: 229.00 }], ['gbp', { value: 199.00 }], ['jpy', { value: 25000 }]]) },
  { id: 'r3', cells: new Map([['description', { value: 'Discount' }], ['usd', { value: -50.00 }], ['eur', { value: -45.00 }], ['gbp', { value: -40.00 }], ['jpy', { value: -5000 }]]) },
];

export const CurrencyFormats: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: currencyColumns, rows: currencyRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Rating Demo
// ============================================================================

const ratingColumns: GridColumn[] = [
  { id: 'item', title: 'Item', width: 150, type: 'text', visible: true },
  { id: 'stars', title: 'Stars (5)', width: 130, type: 'rating', visible: true, typeOptions: { max: 5, icon: 'star', color: '#fbbf24' } },
  { id: 'hearts', title: 'Hearts (3)', width: 100, type: 'rating', visible: true, typeOptions: { max: 3, icon: 'heart', color: '#ef4444' } },
  { id: 'circles', title: 'Circles (10)', width: 180, type: 'rating', visible: true, typeOptions: { max: 10, icon: 'circle', color: '#3b82f6' } },
];

const ratingRows: GridRow[] = [
  { id: 'r1', cells: new Map([['item', { value: 'Excellent' }], ['stars', { value: 5 }], ['hearts', { value: 3 }], ['circles', { value: 10 }]]) },
  { id: 'r2', cells: new Map([['item', { value: 'Good' }], ['stars', { value: 4 }], ['hearts', { value: 2 }], ['circles', { value: 7 }]]) },
  { id: 'r3', cells: new Map([['item', { value: 'Average' }], ['stars', { value: 3 }], ['hearts', { value: 2 }], ['circles', { value: 5 }]]) },
  { id: 'r4', cells: new Map([['item', { value: 'Poor' }], ['stars', { value: 1 }], ['hearts', { value: 1 }], ['circles', { value: 2 }]]) },
];

export const RatingStyles: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: ratingColumns, rows: ratingRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Tags Demo
// ============================================================================

const tagsColumns: GridColumn[] = [
  { id: 'task', title: 'Task', width: 200, type: 'text', visible: true },
  { id: 'labels', title: 'Labels', width: 250, type: 'tags', visible: true, typeOptions: {
    options: [
      { label: 'Frontend', color: '#3b82f6' },
      { label: 'Backend', color: '#8b5cf6' },
      { label: 'Database', color: '#ec4899' },
      { label: 'DevOps', color: '#f97316' },
      { label: 'Testing', color: '#22c55e' },
      { label: 'Documentation', color: '#6b7280' },
    ],
    allowCustom: true,
  }},
  { id: 'priority', title: 'Priority', width: 150, type: 'tags', visible: true, typeOptions: {
    options: [
      { label: 'Critical', color: '#ef4444' },
      { label: 'High', color: '#f97316' },
      { label: 'Medium', color: '#fbbf24' },
      { label: 'Low', color: '#22c55e' },
    ],
    maxTags: 1,
  }},
];

const tagsRows: GridRow[] = [
  { id: 't1', cells: new Map([['task', { value: 'Build login page' }], ['labels', { value: ['Frontend', 'Backend'] }], ['priority', { value: ['High'] }]]) },
  { id: 't2', cells: new Map([['task', { value: 'Setup CI/CD' }], ['labels', { value: ['DevOps'] }], ['priority', { value: ['Critical'] }]]) },
  { id: 't3', cells: new Map([['task', { value: 'Write API docs' }], ['labels', { value: ['Backend', 'Documentation'] }], ['priority', { value: ['Low'] }]]) },
  { id: 't4', cells: new Map([['task', { value: 'Database migration' }], ['labels', { value: ['Backend', 'Database', 'DevOps'] }], ['priority', { value: ['Medium'] }]]) },
];

export const TagsWithColors: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: tagsColumns, rows: tagsRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Entity Demo
// ============================================================================

const entityColumns: GridColumn[] = [
  { id: 'company', title: 'Company', width: 220, type: 'entity', visible: true, typeOptions: { showImage: true, showSubtitle: true, imageShape: 'rounded' } },
  { id: 'contact', title: 'Contact', width: 200, type: 'entity', visible: true, typeOptions: { showImage: true, imageShape: 'circle' } },
  { id: 'revenue', title: 'Revenue', width: 120, type: 'currency', visible: true, typeOptions: { currency: 'USD' } },
];

const entityRows: GridRow[] = [
  { id: 'e1', cells: new Map([
    ['company', { value: { id: 'google', name: 'Google', subtitle: 'Technology', image: 'https://logo.clearbit.com/google.com' } }],
    ['contact', { value: { id: 'john', name: 'John Smith', subtitle: 'CEO', color: '#3b82f6' } }],
    ['revenue', { value: 2500000 }],
  ])},
  { id: 'e2', cells: new Map([
    ['company', { value: { id: 'apple', name: 'Apple', subtitle: 'Technology', image: 'https://logo.clearbit.com/apple.com' } }],
    ['contact', { value: { id: 'jane', name: 'Jane Doe', subtitle: 'CFO', color: '#8b5cf6' } }],
    ['revenue', { value: 3800000 }],
  ])},
  { id: 'e3', cells: new Map([
    ['company', { value: { id: 'microsoft', name: 'Microsoft', subtitle: 'Technology', image: 'https://logo.clearbit.com/microsoft.com' } }],
    ['contact', { value: { id: 'bob', name: 'Bob Wilson', subtitle: 'CTO', color: '#22c55e' } }],
    ['revenue', { value: 1900000 }],
  ])},
];

export const EntityCells: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: entityColumns, rows: entityRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// AI Cells Demo
// ============================================================================

const aiColumns: GridColumn[] = [
  { id: 'name', title: 'Lead Name', width: 150, type: 'text', visible: true },
  { id: 'email', title: 'Email', width: 180, type: 'email', visible: true },
  { id: 'enrichedEmail', title: 'Work Email (AI)', width: 200, type: 'ai', visible: true, typeOptions: { mode: 'enrichment' } },
  { id: 'summary', title: 'AI Summary', width: 250, type: 'ai', visible: true, typeOptions: { mode: 'streaming', showProgress: true } },
];

const aiRows: GridRow[] = [
  { id: 'a1', cells: new Map([
    ['name', { value: 'John Smith' }],
    ['email', { value: 'john@gmail.com' }],
    ['enrichedEmail', { value: { status: 'complete', result: 'john.smith@acme.com' } }],
    ['summary', { value: 'Senior executive with 15+ years experience in tech.' }],
  ])},
  { id: 'a2', cells: new Map([
    ['name', { value: 'Jane Doe' }],
    ['email', { value: 'jane@yahoo.com' }],
    ['enrichedEmail', { value: { status: 'pending' } }],
    ['summary', { value: { status: 'running', progress: 45 } }],
  ])},
  { id: 'a3', cells: new Map([
    ['name', { value: 'Bob Wilson' }],
    ['email', { value: 'bob@outlook.com' }],
    ['enrichedEmail', { value: { status: 'idle' } }],
    ['summary', { value: { status: 'idle' } }],
  ])},
  { id: 'a4', cells: new Map([
    ['name', { value: 'Alice Brown' }],
    ['email', { value: 'alice@hotmail.com' }],
    ['enrichedEmail', { value: { status: 'error', error: 'Email not found' } }],
    ['summary', { value: { status: 'complete', result: 'Marketing specialist focused on B2B SaaS.' } }],
  ])},
];

export const AICells: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: aiColumns, rows: aiRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Action Cells Demo
// ============================================================================

const actionColumns: GridColumn[] = [
  { id: 'name', title: 'Contact', width: 150, type: 'text', visible: true },
  { id: 'email', title: 'Email', width: 180, type: 'email', visible: true },
  { id: 'actions', title: 'Actions', width: 120, type: 'action', visible: true, typeOptions: {
    buttons: [
      { id: 'email', icon: 'mail', tooltip: 'Send Email' },
      { id: 'call', icon: 'phone', tooltip: 'Call' },
      { id: 'link', icon: 'link', tooltip: 'View Profile' },
    ],
  }},
];

const actionRows: GridRow[] = [
  { id: 'c1', cells: new Map([['name', { value: 'John Smith' }], ['email', { value: 'john@example.com' }], ['actions', { value: null }]]) },
  { id: 'c2', cells: new Map([['name', { value: 'Jane Doe' }], ['email', { value: 'jane@example.com' }], ['actions', { value: null }]]) },
  { id: 'c3', cells: new Map([['name', { value: 'Bob Wilson' }], ['email', { value: 'bob@example.com' }], ['actions', { value: null }]]) },
];

export const ActionButtons: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: actionColumns, rows: actionRows },
      },
    });

    // Listen for action events
    React.useEffect(() => {
      const handleAction = (e: CustomEvent) => {
        console.log('Action triggered:', e.detail);
        alert(`Action: ${e.detail.actionId} on row ${e.detail.rowIndex}`);
      };
      
      document.addEventListener('grid:action', handleAction as EventListener);
      return () => document.removeEventListener('grid:action', handleAction as EventListener);
    }, []);

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// JSON Cells Demo
// ============================================================================

const jsonColumns: GridColumn[] = [
  { id: 'name', title: 'Name', width: 120, type: 'text', visible: true },
  { id: 'config', title: 'Config (Summary)', width: 150, type: 'json', visible: true, typeOptions: { displayMode: 'summary' } },
  { id: 'metadata', title: 'Metadata (Keys)', width: 200, type: 'json', visible: true, typeOptions: { displayMode: 'key-value', maxKeys: 2 } },
  { id: 'raw', title: 'Raw JSON', width: 250, type: 'json', visible: true, typeOptions: { displayMode: 'raw' } },
];

const jsonRows: GridRow[] = [
  { id: 'j1', cells: new Map([
    ['name', { value: 'User 1' }],
    ['config', { value: { theme: 'dark', language: 'en', notifications: true } }],
    ['metadata', { value: { created: '2024-01-15', version: '1.0.0', author: 'admin' } }],
    ['raw', { value: { id: 1, active: true, roles: ['admin', 'user'] } }],
  ])},
  { id: 'j2', cells: new Map([
    ['name', { value: 'User 2' }],
    ['config', { value: { theme: 'light', language: 'es' } }],
    ['metadata', { value: { created: '2024-02-20', version: '2.0.0' } }],
    ['raw', { value: [1, 2, 3, 4, 5] }],
  ])},
];

export const JSONDisplay: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: jsonColumns, rows: jsonRows },
      },
    });

    return (
      <div style={{ height: '300px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};


