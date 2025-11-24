/**
 * Seed via API - Seeds the RUNNING server's database
 * 
 * This works with in-memory MongoDB because it hits the server's API
 * instead of creating a new database connection.
 */

import { nanoid } from 'nanoid';

const BACKEND_URL = 'http://localhost:3001';
const TOTAL_ROWS = 10000;
const BATCH_SIZE = 100; // Create rows in batches for better performance

// Sample data for randomization
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn', 'Sage', 'Drew', 'Jamie', 'Parker', 'Reese', 'Cameron', 'Blake'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Lee', 'Wang', 'Kim', 'Chen', 'Patel'];
const industries = ['FinTech', 'SaaS', 'E-commerce', 'Healthcare', 'EdTech', 'MarTech', 'Developer Tools', 'AI/ML', 'Cybersecurity', 'Cloud Platform', 'Database', 'Analytics', 'CRM', 'HR Tech', 'Legal Tech'];
const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'];
const titles = ['CEO', 'CTO', 'VP Sales', 'VP Engineering', 'Director of Operations', 'Head of Marketing', 'Co-founder', 'Chief Revenue Officer', 'VP Product', 'Engineering Manager'];
const revenues = ['<$1M', '$1M-10M', '$10M-50M', '$50M-100M', '$100M-500M', '$500M-1B', '$1B+'];
const fundings = ['Bootstrapped', '$1M-5M', '$5M-10M', '$10M-50M', '$50M-100M', '$100M-500M', '$500M+'];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCompanyName(index: number): string {
  const prefixes = ['Tech', 'Cloud', 'Data', 'Smart', 'Net', 'Web', 'Digi', 'Cyber', 'Soft', 'App'];
  const suffixes = ['ify', 'ly', 'io', 'hub', 'lab', 'pro', 'corp', 'sys', 'ware', 'base'];
  return `${randomItem(prefixes)}${randomItem(suffixes)}${index}`;
}

function generateDomain(company: string): string {
  return `${company.toLowerCase().replace(/[0-9]/g, '')}.com`;
}

function generateRandomRow(index: number): Record<string, any> {
  const company = generateCompanyName(index);
  const firstName = randomItem(firstNames);
  const lastName = randomItem(lastNames);
  
  return {
    col_company: company,
    col_domain: generateDomain(company),
    col_industry: randomItem(industries),
    col_size: randomItem(companySizes),
    col_firstName: firstName,
    col_lastName: lastName,
    col_title: randomItem(titles),
    col_email: '', // Leave empty for enrichment demo
    col_phone: '',
    col_linkedin: '',
    col_revenue: randomItem(revenues),
    col_funding: randomItem(fundings),
    col_notes: `Lead ${index + 1} - ${randomItem(['Hot lead', 'Follow up', 'Demo scheduled', 'Needs enrichment', 'High priority', 'Cold outreach'])}`,
  };
}

async function seedViaAPI() {
  console.log(`🌱 Seeding database with ${TOTAL_ROWS.toLocaleString()} rows via API...\n`);

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

  // We'll generate rows on the fly instead of storing them in memory

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

  // Create rows via API (in batches for better performance)
  console.log(`Creating ${TOTAL_ROWS.toLocaleString()} rows in batches of ${BATCH_SIZE}...\n`);
  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < TOTAL_ROWS; i++) {
    const cells = generateRandomRow(i);

    const rowResponse = await fetch(`${BACKEND_URL}/api/v1/grids/${gridId}/rows`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cells }),
    });

    if (rowResponse.ok) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Progress indicator every 100 rows
    if ((i + 1) % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = ((i + 1) / (Date.now() - startTime) * 1000).toFixed(0);
      const eta = ((TOTAL_ROWS - i - 1) / parseFloat(rate)).toFixed(0);
      console.log(`✓ ${(i + 1).toLocaleString()}/${TOTAL_ROWS.toLocaleString()} rows (${rate}/sec, ETA: ${eta}s, elapsed: ${elapsed}s)`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgRate = (successCount / (Date.now() - startTime) * 1000).toFixed(0);

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Seed completed!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log(`📊 Grid ID: ${gridId}`);
  console.log(`📝 Total Rows: ${successCount.toLocaleString()} created${failCount > 0 ? `, ${failCount} failed` : ''}`);
  console.log(`⏱️  Time: ${totalTime}s (avg ${avgRate} rows/sec)`);
  console.log('');
  console.log('💡 Update your frontend:');
  console.log(`   1. Open: src/App.tsx`);
  console.log(`   2. Line 20: const GRID_ID = '${gridId}';`);
  console.log(`   3. Refresh browser`);
  console.log('');
}

seedViaAPI().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});

