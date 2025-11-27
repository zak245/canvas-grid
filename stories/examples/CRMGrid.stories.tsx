import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { GridContainer } from '../../src/react/components/GridContainer';
import { createGridEngine } from '../../src/core';
import type { GridColumn, GridRow } from '../../src/core/types/grid';

const meta: Meta<typeof GridContainer> = {
  title: 'Examples/CRM Grid',
  component: GridContainer,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof GridContainer>;

// ============================================================================
// CRM Lead Management Grid
// ============================================================================

const crmColumns: GridColumn[] = [
  // Contact Info
  { 
    id: 'contact', 
    title: 'Contact', 
    width: 220, 
    type: 'entity', 
    visible: true, 
    pinned: true,
    typeOptions: { 
      showImage: true, 
      showSubtitle: true, 
      imageShape: 'circle' 
    } 
  },
  { id: 'email', title: 'Email', width: 200, type: 'email', visible: true },
  { id: 'phone', title: 'Phone', width: 150, type: 'phone', visible: true },
  
  // Company Info
  { 
    id: 'company', 
    title: 'Company', 
    width: 200, 
    type: 'entity', 
    visible: true, 
    typeOptions: { 
      showImage: true, 
      showSubtitle: true, 
      imageShape: 'rounded' 
    } 
  },
  
  // Lead Status
  { 
    id: 'status', 
    title: 'Status', 
    width: 130, 
    type: 'select', 
    visible: true, 
    typeOptions: {
      options: [
        { value: 'new', label: 'New', color: '#3b82f6' },
        { value: 'contacted', label: 'Contacted', color: '#8b5cf6' },
        { value: 'qualified', label: 'Qualified', color: '#22c55e' },
        { value: 'proposal', label: 'Proposal', color: '#f97316' },
        { value: 'negotiation', label: 'Negotiation', color: '#eab308' },
        { value: 'closed_won', label: 'Closed Won', color: '#10b981' },
        { value: 'closed_lost', label: 'Closed Lost', color: '#ef4444' },
      ]
    }
  },
  
  // Lead Score
  { 
    id: 'score', 
    title: 'Lead Score', 
    width: 120, 
    type: 'rating', 
    visible: true, 
    typeOptions: { max: 5, icon: 'star', color: '#fbbf24' } 
  },
  
  // Deal Value
  { 
    id: 'dealValue', 
    title: 'Deal Value', 
    width: 130, 
    type: 'currency', 
    visible: true, 
    typeOptions: { currency: 'USD' } 
  },
  
  // Tags
  { 
    id: 'tags', 
    title: 'Tags', 
    width: 200, 
    type: 'tags', 
    visible: true, 
    typeOptions: {
      options: [
        { label: 'Enterprise', color: '#8b5cf6' },
        { label: 'SMB', color: '#3b82f6' },
        { label: 'Startup', color: '#22c55e' },
        { label: 'Hot Lead', color: '#ef4444' },
        { label: 'Referral', color: '#f97316' },
        { label: 'Inbound', color: '#14b8a6' },
        { label: 'Outbound', color: '#6b7280' },
      ],
      allowCustom: true,
    }
  },
  
  // AI Enrichment
  { 
    id: 'aiInsight', 
    title: 'AI Insight', 
    width: 250, 
    type: 'ai', 
    visible: true, 
    typeOptions: { mode: 'enrichment' } 
  },
  
  // Last Contact
  { id: 'lastContact', title: 'Last Contact', width: 120, type: 'date', visible: true },
  
  // Actions
  { 
    id: 'actions', 
    title: 'Actions', 
    width: 100, 
    type: 'action', 
    visible: true, 
    typeOptions: {
      buttons: [
        { id: 'email', icon: 'mail', tooltip: 'Send Email' },
        { id: 'call', icon: 'phone', tooltip: 'Call' },
        { id: 'more', icon: 'more', tooltip: 'More Actions' },
      ],
    }
  },
];

const generateCRMData = (count: number): GridRow[] => {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Lisa', 'Robert', 'Amanda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Wilson'];
  const titles = ['CEO', 'CTO', 'VP Sales', 'Director', 'Manager', 'Founder', 'Head of Growth', 'CFO'];
  const companies = [
    { name: 'Acme Corp', industry: 'Technology', logo: 'https://logo.clearbit.com/acme.com' },
    { name: 'TechStart', industry: 'SaaS', logo: 'https://logo.clearbit.com/techcrunch.com' },
    { name: 'DataFlow', industry: 'Analytics', logo: 'https://logo.clearbit.com/datadog.com' },
    { name: 'CloudNine', industry: 'Cloud', logo: 'https://logo.clearbit.com/cloudflare.com' },
    { name: 'GrowthLabs', industry: 'Marketing', logo: 'https://logo.clearbit.com/hubspot.com' },
    { name: 'SecureNet', industry: 'Security', logo: 'https://logo.clearbit.com/okta.com' },
    { name: 'FinanceAI', industry: 'FinTech', logo: 'https://logo.clearbit.com/stripe.com' },
    { name: 'HealthTech', industry: 'Healthcare', logo: 'https://logo.clearbit.com/oscar.com' },
  ];
  const statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  const tagOptions = ['Enterprise', 'SMB', 'Startup', 'Hot Lead', 'Referral', 'Inbound', 'Outbound'];
  const aiInsights = [
    { status: 'complete', result: 'High-intent buyer, recently raised Series B funding.' },
    { status: 'complete', result: 'Decision maker with budget authority. Responded to 3 emails.' },
    { status: 'pending' },
    { status: 'running', progress: 65 },
    { status: 'idle' },
    { status: 'error', error: 'Insufficient data' },
    { status: 'complete', result: 'Previous customer, churned 6 months ago. Re-engagement opportunity.' },
  ];
  
  const rows: GridRow[] = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const company = companies[i % companies.length];
    const title = titles[i % titles.length];
    
    // Generate random tags (1-3)
    const numTags = Math.floor(Math.random() * 3) + 1;
    const tags: string[] = [];
    for (let t = 0; t < numTags; t++) {
      const tag = tagOptions[Math.floor(Math.random() * tagOptions.length)];
      if (!tags.includes(tag)) tags.push(tag);
    }
    
    rows.push({
      id: `lead_${i}`,
      cells: new Map([
        ['contact', { value: { 
          id: `contact_${i}`, 
          name: `${firstName} ${lastName}`, 
          subtitle: title,
          color: `hsl(${(i * 37) % 360}, 60%, 50%)`,
        }}],
        ['email', { value: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.name.toLowerCase().replace(/\s/g, '')}.com` }],
        ['phone', { value: `+1 (${500 + i % 500}) ${100 + i % 900}-${1000 + i % 9000}` }],
        ['company', { value: { 
          id: `company_${i}`, 
          name: company.name, 
          subtitle: company.industry,
          image: company.logo,
        }}],
        ['status', { value: statuses[i % statuses.length] }],
        ['score', { value: Math.floor(Math.random() * 5) + 1 }],
        ['dealValue', { value: Math.floor(Math.random() * 500000) + 10000 }],
        ['tags', { value: tags }],
        ['aiInsight', { value: aiInsights[i % aiInsights.length] }],
        ['lastContact', { value: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }],
        ['actions', { value: null }],
      ]),
    });
  }
  
  return rows;
};

export const LeadManagement: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: {
          columns: crmColumns,
          rows: generateCRMData(50),
        },
      },
    });

    // Listen for action events
    React.useEffect(() => {
      const handleAction = (e: CustomEvent) => {
        console.log('CRM Action:', e.detail);
      };
      
      document.addEventListener('grid:action', handleAction as EventListener);
      return () => document.removeEventListener('grid:action', handleAction as EventListener);
    }, []);

    return (
      <div style={{ height: '600px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};

// ============================================================================
// Deal Pipeline View
// ============================================================================

const pipelineColumns: GridColumn[] = [
  { id: 'deal', title: 'Deal', width: 200, type: 'entity', visible: true, pinned: true, typeOptions: { showImage: true, showSubtitle: true } },
  { id: 'value', title: 'Value', width: 130, type: 'currency', visible: true, typeOptions: { currency: 'USD' } },
  { id: 'stage', title: 'Stage', width: 140, type: 'select', visible: true, typeOptions: {
    options: [
      { value: 'discovery', label: 'Discovery', color: '#3b82f6' },
      { value: 'demo', label: 'Demo', color: '#8b5cf6' },
      { value: 'proposal', label: 'Proposal', color: '#f97316' },
      { value: 'negotiation', label: 'Negotiation', color: '#eab308' },
      { value: 'closing', label: 'Closing', color: '#22c55e' },
    ]
  }},
  { id: 'probability', title: 'Win %', width: 100, type: 'progress', visible: true },
  { id: 'closeDate', title: 'Close Date', width: 120, type: 'date', visible: true },
  { id: 'owner', title: 'Owner', width: 150, type: 'entity', visible: true, typeOptions: { showImage: true, imageShape: 'circle' } },
  { id: 'priority', title: 'Priority', width: 120, type: 'rating', visible: true, typeOptions: { max: 3, icon: 'star', color: '#ef4444' } },
];

const pipelineRows: GridRow[] = [
  { id: 'd1', cells: new Map([
    ['deal', { value: { id: 'd1', name: 'Enterprise License', subtitle: 'Acme Corp' } }],
    ['value', { value: 250000 }],
    ['stage', { value: 'negotiation' }],
    ['probability', { value: 75 }],
    ['closeDate', { value: '2024-02-15' }],
    ['owner', { value: { id: 'u1', name: 'Sarah Chen', color: '#3b82f6' } }],
    ['priority', { value: 3 }],
  ])},
  { id: 'd2', cells: new Map([
    ['deal', { value: { id: 'd2', name: 'Team Plan', subtitle: 'TechStart' } }],
    ['value', { value: 48000 }],
    ['stage', { value: 'proposal' }],
    ['probability', { value: 50 }],
    ['closeDate', { value: '2024-03-01' }],
    ['owner', { value: { id: 'u2', name: 'Mike Johnson', color: '#22c55e' } }],
    ['priority', { value: 2 }],
  ])},
  { id: 'd3', cells: new Map([
    ['deal', { value: { id: 'd3', name: 'Pilot Program', subtitle: 'DataFlow' } }],
    ['value', { value: 15000 }],
    ['stage', { value: 'demo' }],
    ['probability', { value: 30 }],
    ['closeDate', { value: '2024-03-15' }],
    ['owner', { value: { id: 'u3', name: 'Emily Davis', color: '#f97316' } }],
    ['priority', { value: 1 }],
  ])},
];

export const DealPipeline: Story = {
  render: () => {
    const engine = createGridEngine({
      dataSource: {
        mode: 'local',
        initialData: { columns: pipelineColumns, rows: pipelineRows },
      },
    });

    return (
      <div style={{ height: '400px', width: '100%' }}>
        <GridContainer engine={engine} />
      </div>
    );
  },
};


