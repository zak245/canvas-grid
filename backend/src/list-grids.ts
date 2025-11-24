/**
 * List all grids in the database
 * 
 * Use this to find the Grid ID after seeding
 */

import { connectDatabase, disconnectDatabase } from './db.js';
import { Grid } from './models.js';

async function listGrids() {
  console.log('🔍 Fetching all grids...\n');

  await connectDatabase();

  const grids = await Grid.find({});

  if (grids.length === 0) {
    console.log('❌ No grids found in database!');
    console.log('');
    console.log('💡 Run this command to create one:');
    console.log('   npm run seed');
  } else {
    console.log(`✅ Found ${grids.length} grid(s):\n`);
    
    grids.forEach((grid, index) => {
      console.log(`Grid ${index + 1}:`);
      console.log(`  📊 ID: ${grid._id}`);
      console.log(`  📝 Name: ${grid.name}`);
      console.log(`  📊 Rows: ${grid.totalRows}`);
      console.log(`  📊 Columns: ${grid.columns.length}`);
      console.log(`  📅 Created: ${grid.createdAt}`);
      console.log('');
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Copy the Grid ID above and update your frontend:');
    console.log('');
    console.log('   1. Open: src/App.tsx');
    console.log('   2. Update line 15: const GRID_ID = \'YOUR_GRID_ID\';');
    console.log('   3. Refresh browser');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  await disconnectDatabase();
}

listGrids().catch((error) => {
  console.error('Failed to list grids:', error);
  process.exit(1);
});

