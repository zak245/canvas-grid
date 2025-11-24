# Backend Setup & Quick Start

## ✅ Status: Running!

Your backend is now running with:
- 🚀 Server: `http://localhost:3001`
- 📊 Grid ID: `6923a449fefe5f075de40383`
- 📝 10 sample rows (Stripe, Notion, Figma, etc.)

## 🔌 Connect Frontend to Backend

### Option 1: Update App.tsx (Quick Test)

Replace the current `LocalAdapter` with `BackendAdapter`:

```typescript
import { BackendAdapter } from './adapters';

// Replace existing gridConfig.dataSource with:
const gridConfig: Partial<GridConfig> = {
    dataSource: {
        mode: 'backend',
        adapter: new BackendAdapter({
            baseUrl: 'http://localhost:3001',
            gridId: '6923a449fefe5f075de40383', // From seed output
            enableLogs: true,
        })
    },
    // ... rest of config stays the same
};
```

### Option 2: Create a New Demo File

Create `src/AppWithBackend.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { GridContainer } from './react/GridContainer';
import { AppShell } from './components/layout/AppShell';
import { BackendAdapter } from './adapters';
import type { GridConfig } from './config/GridConfig';

const adapter = new BackendAdapter({
    baseUrl: 'http://localhost:3001',
    gridId: '6923a449fefe5f075de40383',
    enableLogs: true,
});

const gridConfig: Partial<GridConfig> = {
    dataSource: {
        mode: 'backend',
        adapter: adapter,
    },
    features: {
        columns: {
            allowResize: true,
            allowReorder: true,
            allowDelete: true,
            allowHide: true,
            allowAdd: true,
            allowRename: true,
            minWidth: 50,
            maxWidth: 600,
        },
        rows: {
            allowAdd: true,
            allowDelete: true,
            allowBulkDelete: true,
            allowBulkUpdate: true,
            rowHeight: 32,
        },
        cells: {
            enabled: true,
            mode: 'doubleClick',
        },
        sorting: {
            mode: 'backend', // Server-side sorting
        },
        selection: { mode: 'multi', allowRanges: true },
    },
};

function AppWithBackend() {
    return (
        <AppShell>
            <GridContainer config={gridConfig} />
        </AppShell>
    );
}

export default AppWithBackend;
```

Then update `src/main.tsx`:

```typescript
import AppWithBackend from './AppWithBackend';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithBackend />
  </StrictMode>,
);
```

## 🧪 Test Features

### 1. Basic CRUD (Works Now!)
- ✅ View data from backend
- ✅ Add new rows
- ✅ Edit cells
- ✅ Delete rows
- ✅ Add/remove columns

### 2. Enrichment Features (Ready to Use!)

#### Find Emails
```typescript
// From your frontend code
const result = await adapter.enrichFindEmail({
    rowIds: ['row_xyz123'],
    firstName: 'col_firstName',
    lastName: 'col_lastName',
    domain: 'col_domain',
    targetColumn: 'col_email',
});

// Poll for completion
const job = await adapter.waitForJob(result.jobId, (status) => {
    console.log(`Progress: ${status.progress.percentage}%`);
});

// Refresh grid to see enriched data
```

#### Enrich Company Data
```typescript
await adapter.enrichCompanyDetails({
    rowIds: ['row_xyz123'],
    domain: 'col_domain',
    outputs: {
        industry: 'col_industry',
        size: 'col_size',
        revenue: 'col_revenue',
    },
});
```

#### AI Research
```typescript
await adapter.enrichAIResearch({
    rowIds: ['row_xyz123'],
    prompt: 'Find the latest news about this company',
    context: ['col_company', 'col_domain'],
    targetColumn: 'col_news',
});
```

## 📊 Sample Data

The seeded grid contains:

| Company | Domain | First Name | Last Name | Title | Notes |
|---------|--------|------------|-----------|-------|-------|
| Stripe | stripe.com | Patrick | Collison | CEO | High priority |
| Notion | notion.so | Ivan | Zhao | CEO | API integration |
| Figma | figma.com | Dylan | Field | CEO | Demo scheduled |
| Linear | linear.app | Karri | Saarinen | Co-founder | Hot lead |
| Vercel | vercel.com | Guillermo | Rauch | CEO | Enterprise pricing |
| ... and 5 more |

**Note:** Email, phone, and LinkedIn fields are **intentionally empty** - perfect for testing enrichment!

## 🔄 Restart Backend

If you need to restart (data will reset):

```bash
# In backend terminal (Ctrl+C to stop)
npm run dev

# Then re-seed
npm run seed
```

## 🐛 Troubleshooting

### CORS Errors
The backend has CORS enabled by default. If you see CORS errors, make sure:
- Backend is running on `http://localhost:3001`
- Frontend is running on `http://localhost:5173`

### Backend Not Running
```bash
cd backend
npm run dev
```

### No Data
```bash
cd backend
npm run seed
```

### Wrong Grid ID
Check the seed output for the Grid ID and update your frontend config.

## 🚀 Next Steps

1. **Connect Frontend** - Update App.tsx with BackendAdapter
2. **Test CRUD** - Add/edit/delete rows and columns
3. **Build Enrichment UI** - Add buttons to trigger enrichment
4. **Job Status UI** - Show progress bars for enrichment jobs
5. **Polish** - Error handling, loading states, etc.

## 📚 API Documentation

Full API docs available in `/backend/README.md`

Key endpoints:
- `GET /api/v1/grids/:gridId/data` - Fetch data
- `POST /api/v1/grids/:gridId/rows` - Add row
- `POST /api/v1/enrich/find-email` - Find emails
- `GET /api/v1/jobs/:jobId` - Check job status

---

**Backend is ready! Start building! 🎉**

