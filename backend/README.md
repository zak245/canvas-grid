# Canvas Backend

Demo backend for the Canvas data grid with GTM enrichment features.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Server

```bash
npm run dev
```

Server will start on `http://localhost:3001`

- Uses **in-memory MongoDB** (no setup required!)
- Data resets on server restart
- Perfect for development and demos

### 3. Seed Demo Data

In a new terminal:

```bash
npm run seed
```

This creates a sample grid with 10 sales prospects from companies like Stripe, Notion, Figma, etc.

Copy the Grid ID from the output - you'll need it to connect the frontend!

## 📡 API Endpoints

### Grid Data
- `GET /api/v1/grids/:gridId/data` - Fetch grid data

### Rows
- `POST /api/v1/grids/:gridId/rows` - Add row
- `PUT /api/v1/grids/:gridId/rows/:rowId` - Update row
- `DELETE /api/v1/grids/:gridId/rows/:rowId` - Delete row
- `POST /api/v1/grids/:gridId/rows/bulk-update` - Bulk update
- `POST /api/v1/grids/:gridId/rows/bulk-delete` - Bulk delete

### Columns
- `POST /api/v1/grids/:gridId/columns` - Add column
- `PUT /api/v1/grids/:gridId/columns/:columnId` - Update column
- `DELETE /api/v1/grids/:gridId/columns/:columnId` - Delete column
- `POST /api/v1/grids/:gridId/columns/reorder` - Reorder columns

### Cells
- `PUT /api/v1/grids/:gridId/cells` - Update cell
- `POST /api/v1/grids/:gridId/cells/bulk-update` - Bulk update cells

### Enrichment (GTM Operations)
- `POST /api/v1/enrich/find-email` - Find work emails
- `POST /api/v1/enrich/company-details` - Enrich company data
- `POST /api/v1/enrich/person-details` - Enrich person data
- `POST /api/v1/enrich/ai-research` - AI-powered research

### Jobs
- `GET /api/v1/jobs/:jobId` - Get enrichment job status

## 🗄️ Data Structure

### Grids Collection
Stores grid metadata and column definitions.

### Rows Collection
Stores actual data with flexible schema:

```javascript
{
  gridId: ObjectId,
  rowId: "row_abc123",
  position: 0,
  cells: {
    "col_1": "any value",
    "col_2": { nested: "object" },
    "col_3": ["array", "of", "values"],
    // Completely flexible!
  }
}
```

### Enrichment Jobs Collection
Tracks background enrichment operations.

## 🎯 Enrichment Features

All enrichment operations are **mocked** with realistic delays and plausible data:

- **Email Finder**: 800-1200ms delay
- **Company Enrichment**: 900-1500ms delay
- **Person Details**: 1000-1500ms delay
- **AI Research**: 1500-2500ms delay

## 🔧 Production Setup

For production, use a real MongoDB instance:

```bash
# Create .env file
MONGODB_URI=mongodb://localhost:27017/canvas-grid
# or MongoDB Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/canvas-grid
```

## 📝 Example Request

### Add a Row

```bash
curl -X POST http://localhost:3001/api/v1/grids/GRID_ID/rows \
  -H "Content-Type: application/json" \
  -d '{
    "cells": {
      "col_company": "Acme Corp",
      "col_domain": "acme.com"
    }
  }'
```

### Enrich Emails

```bash
curl -X POST http://localhost:3001/api/v1/enrich/find-email \
  -H "Content-Type: application/json" \
  -d '{
    "gridId": "GRID_ID",
    "rowIds": ["row_1", "row_2"],
    "firstName": "col_firstName",
    "lastName": "col_lastName",
    "domain": "col_domain",
    "targetColumn": "col_email"
  }'
```

Returns a job ID. Poll `/api/v1/jobs/:jobId` for status.

## 🛠️ Tech Stack

- **Node.js 20+** - Runtime
- **Express** - Web framework
- **MongoDB** - Database (in-memory for dev)
- **Mongoose** - ODM
- **TypeScript** - Type safety
- **tsx** - Run TS directly (no build step!)

## 📚 Next Steps

1. Run `npm run dev` to start server
2. Run `npm run seed` to create demo data
3. Copy the Grid ID from seed output
4. Update frontend to use `BackendAdapter` with this Grid ID
5. Test CRUD operations and enrichment features!

