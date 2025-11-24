/**
 * Seed Script - Populate demo data
 * 
 * Creates a sample grid with realistic GTM data
 */

import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from './db.js';
import { Grid, Row } from './models.js';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';

export async function seed(forcedGridId?: string) {
  console.log('🌱 Seeding database...\n');

  // Only connect if not already connected (for server usage)
  if (mongoose.connection.readyState === 0) {
    await connectDatabase();
  }

  // Clear existing data
  console.log('Clearing existing data...');
  await Grid.deleteMany({});
  await Row.deleteMany({});

  // Create a grid
  console.log('Creating grid...');
  
  const gridData: any = {
    name: 'Q1 2024 Sales Prospects',
    columns: [
      {
        id: 'col_company',
        title: 'Company',
        width: 200,
        type: 'text',
        visible: true,
        position: 0,
      },
      {
        id: 'col_domain',
        title: 'Website',
        width: 180,
        type: 'url',
        visible: true,
        position: 1,
      },
      {
        id: 'col_industry',
        title: 'Industry',
        width: 150,
        type: 'text',
        visible: true,
        position: 2,
      },
      {
        id: 'col_size',
        title: 'Company Size',
        width: 130,
        type: 'text',
        visible: true,
        position: 3,
      },
      {
        id: 'col_firstName',
        title: 'First Name',
        width: 130,
        type: 'text',
        visible: true,
        position: 4,
      },
      {
        id: 'col_lastName',
        title: 'Last Name',
        width: 130,
        type: 'text',
        visible: true,
        position: 5,
      },
      {
        id: 'col_title',
        title: 'Title',
        width: 180,
        type: 'text',
        visible: true,
        position: 6,
      },
      {
        id: 'col_email',
        title: 'Work Email',
        width: 220,
        type: 'email',
        visible: true,
        position: 7,
      },
      {
        id: 'col_phone',
        title: 'Phone',
        width: 150,
        type: 'text',
        visible: true,
        position: 8,
      },
      {
        id: 'col_linkedin',
        title: 'LinkedIn',
        width: 200,
        type: 'url',
        visible: true,
        position: 9,
      },
      {
        id: 'col_revenue',
        title: 'Estimated Revenue',
        width: 160,
        type: 'text',
        visible: true,
        position: 10,
      },
      {
        id: 'col_funding',
        title: 'Funding',
        width: 120,
        type: 'text',
        visible: true,
        position: 11,
      },
      {
        id: 'col_notes',
        title: 'Notes',
        width: 250,
        type: 'text',
        visible: true,
        position: 12,
      },
    ],
    totalRows: 0,
    settings: {
      defaultRowHeight: 32,
    },
  };

  if (forcedGridId) {
    gridData._id = forcedGridId;
  }

  const grid = new Grid(gridData);

  await grid.save();
  console.log(`✓ Grid created: ${grid._id}`);

  // Sample data
  const sampleData = [
    {
      company: 'Stripe',
      domain: 'stripe.com',
      industry: 'FinTech',
      size: '5001-10000',
      firstName: 'Patrick',
      lastName: 'Collison',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$500M-1B',
      funding: '$2.2B',
      notes: 'High priority - enterprise plan',
    },
    {
      company: 'Notion',
      domain: 'notion.so',
      industry: 'SaaS',
      size: '201-500',
      firstName: 'Ivan',
      lastName: 'Zhao',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$100M-500M',
      funding: '$343M',
      notes: 'Interested in API integration',
    },
    {
      company: 'Figma',
      domain: 'figma.com',
      industry: 'Design Tools',
      size: '501-1000',
      firstName: 'Dylan',
      lastName: 'Field',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$100M-500M',
      funding: '$333M',
      notes: 'Demo scheduled for next week',
    },
    {
      company: 'Linear',
      domain: 'linear.app',
      industry: 'Project Management',
      size: '51-200',
      firstName: 'Karri',
      lastName: 'Saarinen',
      title: 'Co-founder',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$10M-50M',
      funding: '$52M',
      notes: 'Hot lead - follow up',
    },
    {
      company: 'Vercel',
      domain: 'vercel.com',
      industry: 'Cloud Platform',
      size: '201-500',
      firstName: 'Guillermo',
      lastName: 'Rauch',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$50M-100M',
      funding: '$313M',
      notes: 'Enterprise pricing inquiry',
    },
    {
      company: 'Supabase',
      domain: 'supabase.com',
      industry: 'Database',
      size: '51-200',
      firstName: 'Paul',
      lastName: 'Copplestone',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$10M-50M',
      funding: '$116M',
      notes: 'Need to enrich contact data',
    },
    {
      company: 'Retool',
      domain: 'retool.com',
      industry: 'Developer Tools',
      size: '201-500',
      firstName: 'David',
      lastName: 'Hsu',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$50M-100M',
      funding: '$220M',
      notes: 'Strategic partnership potential',
    },
    {
      company: 'Plaid',
      domain: 'plaid.com',
      industry: 'FinTech',
      size: '501-1000',
      firstName: 'Zach',
      lastName: 'Perret',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$100M-500M',
      funding: '$734M',
      notes: 'Warm intro via investor',
    },
    {
      company: 'Airtable',
      domain: 'airtable.com',
      industry: 'Database',
      size: '501-1000',
      firstName: 'Howie',
      lastName: 'Liu',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$100M-500M',
      funding: '$1.4B',
      notes: 'Competitor - watch closely',
    },
    {
      company: 'Zapier',
      domain: 'zapier.com',
      industry: 'Automation',
      size: '501-1000',
      firstName: 'Wade',
      lastName: 'Foster',
      title: 'CEO',
      email: '',
      phone: '',
      linkedin: '',
      revenue: '$100M-500M',
      funding: '$1.3M',
      notes: 'Integration partner opportunity',
    },
  ];

  // Create rows
  console.log('Creating rows...');
  for (let i = 0; i < sampleData.length; i++) {
    const data = sampleData[i];
    const row = new Row({
      gridId: grid._id,
      rowId: `row_${nanoid(10)}`,
      position: i,
      cells: {
        col_company: data.company,
        col_domain: data.domain,
        col_industry: data.industry,
        col_size: data.size,
        col_firstName: data.firstName,
        col_lastName: data.lastName,
        col_title: data.title,
        col_email: data.email,
        col_phone: data.phone,
        col_linkedin: data.linkedin,
        col_revenue: data.revenue,
        col_funding: data.funding,
        col_notes: data.notes,
      },
      metadata: {
        createdAt: new Date(),
      },
    });

    await row.save();
  }

  // Update grid total rows
  grid.totalRows = sampleData.length;
  await grid.save();

  console.log(`✓ Created ${sampleData.length} rows`);
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📊 Grid ID: ${grid._id}`);
  console.log(`📝 Total Rows: ${grid.totalRows}`);
  console.log('');
  console.log('💡 Use this Grid ID in your frontend to load the data');
  console.log('   Update App.tsx to use BackendAdapter with this gridId');
  console.log('');
  console.log('🧪 Test enrichment features:');
  console.log('   1. Select rows (notice empty email/phone/linkedin fields)');
  console.log('   2. Use enrichment UI to fill in contact data');
  console.log('   3. Watch the data populate in real-time!');
  console.log('');

  // Only disconnect if we started the connection in this script (standalone mode)
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await disconnectDatabase();
  }
}

// Run seed if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}
