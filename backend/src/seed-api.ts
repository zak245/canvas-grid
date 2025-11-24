/**
 * Seed via API - Seeds the RUNNING server's database
 * 
 * This works with in-memory MongoDB because it hits the server's API
 * instead of creating a new database connection.
 */

import { nanoid } from 'nanoid';

const BACKEND_URL = 'http://localhost:3001';

async function seedViaAPI() {
  console.log('🌱 Seeding database via API...\n');

  // Check if server is running
  try {
    const healthCheck = await fetch(`${BACKEND_URL}/health`);
    if (!healthCheck.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Backend server is not running!');
    console.log('');
    console.log('Please start the backend first:');
    console.log('  cd backend && npm run dev');
    process.exit(1);
  }

  // Sample data
  const companies = [
    {
      company: 'Stripe',
      domain: 'stripe.com',
      industry: 'FinTech',
      size: '5001-10000',
      firstName: 'Patrick',
      lastName: 'Collison',
      title: 'CEO',
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
      revenue: '$100M-500M',
      funding: '$1.3M',
      notes: 'Integration partner opportunity',
    },
  ];

  // Define columns
  const columns = [
    { id: 'col_company', title: 'Company', width: 200, type: 'text', visible: true, position: 0 },
    { id: 'col_domain', title: 'Website', width: 180, type: 'url', visible: true, position: 1 },
    { id: 'col_industry', title: 'Industry', width: 150, type: 'text', visible: true, position: 2 },
    { id: 'col_size', title: 'Company Size', width: 130, type: 'text', visible: true, position: 3 },
    { id: 'col_firstName', title: 'First Name', width: 130, type: 'text', visible: true, position: 4 },
    { id: 'col_lastName', title: 'Last Name', width: 130, type: 'text', visible: true, position: 5 },
    { id: 'col_title', title: 'Title', width: 180, type: 'text', visible: true, position: 6 },
    { id: 'col_email', title: 'Work Email', width: 220, type: 'email', visible: true, position: 7 },
    { id: 'col_phone', title: 'Phone', width: 150, type: 'text', visible: true, position: 8 },
    { id: 'col_linkedin', title: 'LinkedIn', width: 200, type: 'url', visible: true, position: 9 },
    { id: 'col_revenue', title: 'Estimated Revenue', width: 160, type: 'text', visible: true, position: 10 },
    { id: 'col_funding', title: 'Funding', width: 120, type: 'text', visible: true, position: 11 },
    { id: 'col_notes', title: 'Notes', width: 250, type: 'text', visible: true, position: 12 },
  ];

  // Create grid via API
  console.log('Creating grid...');
  const gridResponse = await fetch(`${BACKEND_URL}/api/v1/grids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Q1 2024 Sales Prospects',
      columns,
      settings: { defaultRowHeight: 32 },
    }),
  });

  if (!gridResponse.ok) {
    throw new Error(`Failed to create grid: ${await gridResponse.text()}`);
  }

  const grid = await gridResponse.json();
  const gridId = grid.id;
  console.log(`✓ Grid created: ${gridId}\n`);

  // Create rows via API
  console.log('Creating rows...');
  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const cells: Record<string, any> = {
      col_company: company.company,
      col_domain: company.domain,
      col_industry: company.industry,
      col_size: company.size,
      col_firstName: company.firstName,
      col_lastName: company.lastName,
      col_title: company.title,
      col_email: '',
      col_phone: '',
      col_linkedin: '',
      col_revenue: company.revenue,
      col_funding: company.funding,
      col_notes: company.notes,
    };

    const rowResponse = await fetch(`${BACKEND_URL}/api/v1/grids/${gridId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells }),
    });

    if (!rowResponse.ok) {
      console.error(`Failed to create row ${i + 1}`);
      continue;
    }
    
    console.log(`✓ Row ${i + 1}/${companies.length} created`);
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed completed successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📊 Grid ID: ${gridId}`);
  console.log(`📝 Total Rows: ${companies.length}`);
  console.log('');
  console.log('💡 Update your frontend:');
  console.log(`   1. Open: src/App.tsx`);
  console.log(`   2. Line 18: const GRID_ID = '${gridId}';`);
  console.log(`   3. Refresh browser`);
  console.log('');
}

seedViaAPI().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

